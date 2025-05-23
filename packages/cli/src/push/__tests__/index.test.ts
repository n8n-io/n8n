import type { User } from '@n8n/db';
import type { Application } from 'express';
import { captor, mock } from 'jest-mock-extended';
import type { Logger } from 'n8n-core';
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
	const logger = mock<Logger>();

	let push: Push;
	const sseBackend = mockInstance(SSEPush);
	const wsBackend = mockInstance(WebSocketPush);

	beforeEach(() => {
		jest.resetAllMocks();
		logger.scoped.mockReturnValue(logger);
	});

	describe('setupPushServer', () => {
		const restEndpoint = 'rest';
		const app = mock<Application>();
		const server = mock<Server>();
		// @ts-expect-error `jest.spyOn` typings don't allow `constructor`
		const wssSpy = jest.spyOn(WSServer.prototype, 'constructor') as jest.SpyInstance<WSServer>;

		describe('sse backend', () => {
			test('should not create a WebSocket server', () => {
				config.backend = 'sse';
				push = new Push(config, mock(), logger, mock(), mock());

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
				push = new Push(config, mock(), logger, mock(), mock());
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
				push = new Push(config, mock(), logger, mock(), mock());
				req.ws = backendName === 'sse' ? undefined : ws;
			});

			describe('should throw on invalid origin', () => {
				test.each([
					{
						name: 'origin does not match host',
						origin: 'https://subdomain.example.com',
						xForwardedProto: undefined,
						xForwardedHost: undefined,
					},
					{
						name: 'origin does not match host (subdomain)',
						origin: 'https://123example.com',
						xForwardedProto: undefined,
						xForwardedHost: undefined,
					},
					{
						name: 'origin is not defined',
						origin: undefined,
						xForwardedProto: undefined,
						xForwardedHost: undefined,
					},
					{
						name: 'only one of the forward headers is defined',
						origin: 'https://123example.com',
						xForwardedProto: 'https',
						xForwardedHost: undefined,
					},
					{
						name: 'only one of the forward headers is defined',
						origin: 'https://123example.com',
						xForwardedProto: undefined,
						xForwardedHost: '123example.com',
					},
					{
						name: 'protocol mismatch',
						// correct origin, but forward headers take precedence
						origin: 'https://example.com',
						xForwardedProto: 'http',
						xForwardedHost: host,
					},
					{
						name: 'origin is undefined',
						origin: undefined,
						xForwardedProto: undefined,
						xForwardedHost: undefined,
					},
				])(
					'$name (origin: $origin, x-forwarded-proto: $xForwardedProto, x-forwarded-host: $xForwardedHost)',
					({ origin, xForwardedProto, xForwardedHost }) => {
						req.headers.origin = origin;
						req.headers['x-forwarded-proto'] = xForwardedProto;
						req.headers['x-forwarded-host'] = xForwardedHost;

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

			describe('should not throw on invalid origin if `X-Forwarded-Host` and `X-Forwarded-Proto` are set correctly', () => {
				test.each([
					{
						name: 'origin matches forward headers',
						origin: 'https://example.com',
						xForwardedProto: 'https',
						xForwardedHost: 'example.com',
					},
					{
						name: 'origin matches forward headers but has different case',
						origin: 'https://example.com',
						xForwardedProto: 'https',
						xForwardedHost: 'EXAMPLE.com',
					},
					{
						name: 'origin matches forward headers but protocol has different case',
						origin: 'HTTPS://example.com',
						xForwardedProto: undefined,
						xForwardedHost: undefined,
					},
					{
						name: 'origin matches host (https)',
						origin: 'https://example.com',
						xForwardedProto: undefined,
						xForwardedHost: undefined,
					},
					{
						name: 'origin matches host (http)',
						origin: 'http://example.com',
						xForwardedProto: undefined,
						xForwardedHost: undefined,
					},
				])(
					'$name (origin: $origin, x-forwarded-proto: $xForwardedProto, x-forwarded-host: $xForwardedHost)',
					({ origin, xForwardedProto, xForwardedHost }) => {
						// ARRANGE
						req.headers.origin = origin;
						req.headers['x-forwarded-proto'] = xForwardedProto;
						req.headers['x-forwarded-host'] = xForwardedHost;

						const emitSpy = jest.spyOn(push, 'emit');
						const connection = backendName === 'sse' ? { req, res } : ws;

						// ACT
						push.handleRequest(req, res);

						// ASSERT
						expect(backend.add).toHaveBeenCalledWith(pushRef, user.id, connection);
						expect(emitSpy).toHaveBeenCalledWith('editorUiConnected', pushRef);
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
