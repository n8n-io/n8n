import type { User } from '@n8n/db';
import type { Application } from 'express';
import { captor, mock } from 'jest-mock-extended';
import type { Server, ServerResponse } from 'node:http';
import type { Socket } from 'node:net';
import { type WebSocket, Server as WSServer } from 'ws';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { Push } from '@/push';
import { SSEPush } from '@/push/sse.push';
import type { WebSocketPushRequest, SSEPushRequest, PushResponse } from '@/push/types';
import { WebSocketPush } from '@/push/websocket.push';
import { mockInstance } from '@test/mocking';

import type { PushConfig } from '../push.config';

jest.mock('ws', () => ({
	Server: jest.fn(),
}));
jest.unmock('@/push');
jest.mock('@n8n/backend-common', () => {
	return {
		...jest.requireActual('@n8n/backend-common'),
		inProduction: true,
	};
});

describe('Push', () => {
	const pushRef = 'valid-push-ref';
	const host = 'example.com';
	const user = mock<User>({ id: 'user-id' });
	const config = mock<PushConfig>();

	let push: Push;
	const sseBackend = mockInstance(SSEPush);
	const wsBackend = mockInstance(WebSocketPush);

	beforeEach(() => jest.resetAllMocks());

	describe('setupPushServer', () => {
		const restEndpoint = 'rest';
		const app = mock<Application>();
		const server = mock<Server>();
		// @ts-expect-error `jest.spyOn` typings don't allow `constructor`
		const wssSpy = jest.spyOn(WSServer.prototype, 'constructor') as jest.SpyInstance<WSServer>;

		describe('sse backend', () => {
			test('should not create a WebSocket server', () => {
				config.backend = 'sse';
				push = new Push(config, mock(), mock(), mock(), mock());

				push.setupPushServer(restEndpoint, server, app);

				expect(wssSpy).not.toHaveBeenCalled();
				expect(server.on).not.toHaveBeenCalled();
			});
		});

		describe('websocket backend', () => {
			let onUpgrade: (request: WebSocketPushRequest, socket: Socket, head: Buffer) => void;
			const wsServer = mock<WSServer>();
			const socket = mock<Socket>();
			const upgradeHead = mock<Buffer>();

			beforeEach(() => {
				config.backend = 'websocket';
				push = new Push(config, mock(), mock(), mock(), mock());
				wssSpy.mockReturnValue(wsServer);

				push.setupPushServer(restEndpoint, server, app);

				expect(wssSpy).toHaveBeenCalledWith({ noServer: true });
				const onUpgradeCaptor = captor<typeof onUpgrade>();
				expect(server.on).toHaveBeenCalledWith('upgrade', onUpgradeCaptor);
				onUpgrade = onUpgradeCaptor.value;
			});

			test('should not upgrade non-push urls', () => {
				const request = mock<WebSocketPushRequest>({ url: '/rest/testing' });

				onUpgrade(request, socket, upgradeHead);

				expect(wsServer.handleUpgrade).not.toHaveBeenCalled();
			});

			test('should upgrade push url, and route it to express', () => {
				const request = mock<WebSocketPushRequest>({ url: '/rest/push' });

				onUpgrade(request, socket, upgradeHead);

				const handleUpgradeCaptor = captor<(ws: WebSocket) => void>();
				expect(wsServer.handleUpgrade).toHaveBeenCalledWith(
					request,
					socket,
					upgradeHead,
					handleUpgradeCaptor,
				);

				const ws = mock<WebSocket>();
				handleUpgradeCaptor.value(ws);

				expect(request.ws).toBe(ws);

				const serverResponseCaptor = captor<ServerResponse>();
				// @ts-expect-error `handle` isn't documented
				expect(app.handle).toHaveBeenCalledWith(request, serverResponseCaptor);

				serverResponseCaptor.value.writeHead(200);
				expect(ws.close).not.toHaveBeenCalled();

				serverResponseCaptor.value.writeHead(404);
				expect(ws.close).toHaveBeenCalled();
			});
		});
	});

	describe('handleRequest', () => {
		const req = mock<SSEPushRequest | WebSocketPushRequest>({ user });
		const res = mock<PushResponse>();
		const ws = mock<WebSocket>();
		const backendNames = ['sse', 'websocket'] as const;

		beforeEach(() => {
			res.status.mockReturnThis();

			req.headers.host = host;
			req.headers.origin = `https://${host}`;
			req.query = { pushRef };
		});

		describe.each(backendNames)('%s backend', (backendName) => {
			const backend = backendName === 'sse' ? sseBackend : wsBackend;

			beforeEach(() => {
				config.backend = backendName;
				push = new Push(config, mock(), mock(), mock(), mock());
				req.ws = backendName === 'sse' ? undefined : ws;
			});

			describe('should throw on invalid origin', () => {
				test.each(['https://subdomain.example.com', 'https://123example.com', undefined])(
					'%s',
					(origin) => {
						req.headers.origin = origin;

						if (backendName === 'sse') {
							expect(() => push.handleRequest(req, res)).toThrow(
								new BadRequestError('Invalid origin!'),
							);
						} else {
							push.handleRequest(req, res);
							expect(ws.send).toHaveBeenCalledWith('Invalid origin!');
							expect(ws.close).toHaveBeenCalledWith(1008);
						}
						expect(backend.add).not.toHaveBeenCalled();
					},
				);
			});

			test('should throw if pushRef is invalid', () => {
				req.query = { pushRef: '' };

				if (backendName === 'sse') {
					expect(() => push.handleRequest(req, res)).toThrow(
						new BadRequestError('The query parameter "pushRef" is missing!'),
					);
				} else {
					push.handleRequest(req, mock());
					expect(ws.send).toHaveBeenCalled();
					expect(ws.close).toHaveBeenCalledWith(1008);
				}
				expect(backend.add).not.toHaveBeenCalled();
			});

			test('should add the connection if pushRef is valid', () => {
				const emitSpy = jest.spyOn(push, 'emit');

				push.handleRequest(req, res);

				const connection = backendName === 'sse' ? { req, res } : ws;
				expect(backend.add).toHaveBeenCalledWith(pushRef, user.id, connection);
				expect(emitSpy).toHaveBeenCalledWith('editorUiConnected', pushRef);
			});

			if (backendName === 'websocket') {
				test('should respond with 401 if request is not WebSocket', () => {
					req.ws = undefined;

					push.handleRequest(req, res);

					expect(res.status).toHaveBeenCalledWith(401);
					expect(res.send).toHaveBeenCalledWith('Unauthorized');
					expect(backend.add).not.toHaveBeenCalled();
				});
			}
		});
	});
});
