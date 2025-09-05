import type { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
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

	describe('normalizeHost', () => {
		beforeEach(() => {
			config.backend = 'sse';
			push = new Push(config, mock(), logger, mock(), mock());
		});

		test('should return original host if empty', () => {
			// @ts-expect-error accessing private method for testing
			expect(push.normalizeHost('', 'https')).toBe('');
			// @ts-expect-error accessing private method for testing
			expect(push.normalizeHost('', 'http')).toBe('');
		});

		test('should normalize HTTPS hosts by removing default port 443', () => {
			// @ts-expect-error accessing private method for testing
			expect(push.normalizeHost('example.com:443', 'https')).toBe('example.com');
			// @ts-expect-error accessing private method for testing
			expect(push.normalizeHost('example.com', 'https')).toBe('example.com');
		});

		test('should normalize HTTP hosts by removing default port 80', () => {
			// @ts-expect-error accessing private method for testing
			expect(push.normalizeHost('example.com:80', 'http')).toBe('example.com');
			// @ts-expect-error accessing private method for testing
			expect(push.normalizeHost('example.com', 'http')).toBe('example.com');
		});

		test('should preserve non-default ports', () => {
			// @ts-expect-error accessing private method for testing
			expect(push.normalizeHost('example.com:8080', 'https')).toBe('example.com:8080');
			// @ts-expect-error accessing private method for testing
			expect(push.normalizeHost('example.com:3000', 'http')).toBe('example.com:3000');
		});

		test('should handle IPv6 hosts correctly', () => {
			// IPv6 hosts are returned with brackets by the URL constructor when port is removed
			// @ts-expect-error accessing private method for testing
			expect(push.normalizeHost('[::1]:443', 'https')).toBe('[::1]');
			// @ts-expect-error accessing private method for testing
			expect(push.normalizeHost('[::1]:80', 'http')).toBe('[::1]');
			// Non-default ports preserve the full format
			// @ts-expect-error accessing private method for testing
			expect(push.normalizeHost('[::1]:8080', 'https')).toBe('[::1]:8080');
		});

		test('should handle complex domain names', () => {
			// @ts-expect-error accessing private method for testing
			expect(push.normalizeHost('sub.domain.example-site.com:443', 'https')).toBe(
				'sub.domain.example-site.com',
			);
			// @ts-expect-error accessing private method for testing
			expect(push.normalizeHost('test-server.local:3000', 'http')).toBe('test-server.local:3000');
		});

		test('should fallback to original host on invalid URL', () => {
			// Invalid host formats that would cause URL constructor to throw
			// @ts-expect-error accessing private method for testing
			expect(push.normalizeHost('invalid[host', 'https')).toBe('invalid[host');
			// @ts-expect-error accessing private method for testing
			expect(push.normalizeHost('://malformed', 'http')).toBe('://malformed');
			// @ts-expect-error accessing private method for testing
			expect(push.normalizeHost('space host.com', 'https')).toBe('space host.com');
		});
	});

	describe('parseOrigin', () => {
		beforeEach(() => {
			config.backend = 'sse';
			push = new Push(config, mock(), logger, mock(), mock());
		});

		test('should return null for invalid origins', () => {
			// @ts-expect-error accessing private method for testing
			expect(push.parseOrigin('')).toBeNull();
			// @ts-expect-error accessing private method for testing
			expect(push.parseOrigin(null as any)).toBeNull();
			// @ts-expect-error accessing private method for testing
			expect(push.parseOrigin(undefined as any)).toBeNull();
			// @ts-expect-error accessing private method for testing
			expect(push.parseOrigin(123 as any)).toBeNull();
		});

		test('should return null for non-HTTP/HTTPS protocols', () => {
			// @ts-expect-error accessing private method for testing
			expect(push.parseOrigin('ftp://example.com')).toBeNull();
			// @ts-expect-error accessing private method for testing
			expect(push.parseOrigin('ws://example.com')).toBeNull();
			// @ts-expect-error accessing private method for testing
			expect(push.parseOrigin('file://example.com')).toBeNull();
			// @ts-expect-error accessing private method for testing
			expect(push.parseOrigin('chrome-extension://example.com')).toBeNull();
		});

		test('should return null for malformed URLs', () => {
			// @ts-expect-error accessing private method for testing
			expect(push.parseOrigin('not-a-url')).toBeNull();
			// @ts-expect-error accessing private method for testing
			expect(push.parseOrigin('://malformed')).toBeNull();
			// @ts-expect-error accessing private method for testing
			expect(push.parseOrigin('https://')).toBeNull();
			// @ts-expect-error accessing private method for testing
			expect(push.parseOrigin('https://[invalid')).toBeNull();
		});

		test('should parse valid HTTP origins', () => {
			// @ts-expect-error accessing private method for testing
			const result = push.parseOrigin('http://example.com');
			expect(result).toEqual({
				protocol: 'http',
				host: 'example.com',
			});
		});

		test('should parse valid HTTPS origins', () => {
			// @ts-expect-error accessing private method for testing
			const result = push.parseOrigin('https://example.com');
			expect(result).toEqual({
				protocol: 'https',
				host: 'example.com',
			});
		});

		test('should normalize ports in origins', () => {
			// Default ports should be removed
			// @ts-expect-error accessing private method for testing
			expect(push.parseOrigin('https://example.com:443')).toEqual({
				protocol: 'https',
				host: 'example.com',
			});

			// @ts-expect-error accessing private method for testing
			expect(push.parseOrigin('http://example.com:80')).toEqual({
				protocol: 'http',
				host: 'example.com',
			});

			// Non-default ports should be preserved
			// @ts-expect-error accessing private method for testing
			expect(push.parseOrigin('https://example.com:8080')).toEqual({
				protocol: 'https',
				host: 'example.com:8080',
			});

			// @ts-expect-error accessing private method for testing
			expect(push.parseOrigin('http://example.com:3000')).toEqual({
				protocol: 'http',
				host: 'example.com:3000',
			});
		});

		test('should handle IPv6 origins', () => {
			// IPv6 with default port: hostname should remove brackets but host keeps them
			// @ts-expect-error accessing private method for testing
			expect(push.parseOrigin('https://[::1]:443')).toEqual({
				protocol: 'https',
				host: '[::1]',
			});

			// IPv6 with non-default port: should preserve format
			// @ts-expect-error accessing private method for testing
			expect(push.parseOrigin('http://[2001:db8::1]:8080')).toEqual({
				protocol: 'http',
				host: '[2001:db8::1]:8080',
			});
		});

		test('should handle mixed case protocols', () => {
			// @ts-expect-error accessing private method for testing
			expect(push.parseOrigin('HTTPS://example.com')).toEqual({
				protocol: 'https',
				host: 'example.com',
			});

			// @ts-expect-error accessing private method for testing
			expect(push.parseOrigin('Http://example.com')).toEqual({
				protocol: 'http',
				host: 'example.com',
			});
		});
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

				// Reset headers for each test to prevent pollution
				req.headers.host = host;
				req.headers.origin = `https://${host}`;
				delete req.headers['x-forwarded-host'];
			});

			describe('should throw on invalid origin', () => {
				test.each([
					{
						name: 'origin is undefined',
						origin: undefined,
						xForwardedHost: undefined,
					},
					{
						name: 'origin does not match host',
						origin: 'https://123example.com',
						xForwardedHost: undefined,
					},
					{
						name: 'origin does not match host (subdomain)',
						origin: `https://subdomain.${host}`,
						xForwardedHost: undefined,
					},
					{
						name: 'origin does not match x-forwarded-host',
						origin: `https://${host}`, // this is correct
						xForwardedHost: 'https://123example.com', // this is not
					},
					{
						name: 'origin does not match x-forwarded-host (subdomain)',
						origin: `https://${host}`, // this is correct
						xForwardedHost: `https://subdomain.${host}`, // this is not
					},
				])('$name', ({ origin, xForwardedHost }) => {
					req.headers.origin = origin;
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
				});
			});

			describe('should not throw on invalid origin if `X-Forwarded-Host` is set correctly', () => {
				test.each([
					{
						name: 'origin matches forward headers (https)',
						origin: `https://${host}`,
						xForwardedHost: host,
					},
					{
						name: 'origin matches forward headers (http)',
						origin: `http://${host}`,
						xForwardedHost: host,
					},
					{
						name: 'origin matches host (https)',
						origin: `https://${host}`,
						xForwardedHost: undefined,
					},
					{
						name: 'origin matches host (http)',
						origin: `http://${host}`,
						xForwardedHost: undefined,
					},
				])('$name', ({ origin, xForwardedHost }) => {
					// ARRANGE
					req.headers.origin = origin;
					req.headers['x-forwarded-host'] = xForwardedHost;

					const emitSpy = jest.spyOn(push, 'emit');
					const connection = backendName === 'sse' ? { req, res } : ws;

					// ACT
					push.handleRequest(req, res);

					// ASSERT
					expect(backend.add).toHaveBeenCalledWith(pushRef, user.id, connection);
					expect(emitSpy).toHaveBeenCalledWith('editorUiConnected', pushRef);
				});
			});

			describe('port normalization bug reproduction', () => {
				test.each([
					{
						name: 'HTTPS origin without port should match x-forwarded-host with default HTTPS port (443)',
						origin: `https://${host}`,
						xForwardedHost: `${host}:443`,
						shouldPass: true,
					},
					{
						name: 'HTTP origin without port should match x-forwarded-host with default HTTP port (80)',
						origin: `http://${host}`,
						xForwardedHost: `${host}:80`,
						shouldPass: true,
					},
					{
						name: 'origin with explicit port should match x-forwarded-host with same port',
						origin: `https://${host}:8080`,
						xForwardedHost: `${host}:8080`,
						shouldPass: true,
					},
					{
						name: 'origin without port should NOT match x-forwarded-host with non-default port',
						origin: `https://${host}`,
						xForwardedHost: `${host}:8080`,
						shouldPass: false,
					},
				])('$name', ({ origin, xForwardedHost, shouldPass }) => {
					// ARRANGE
					req.headers.origin = origin;
					req.headers['x-forwarded-host'] = xForwardedHost;

					if (shouldPass) {
						// Expected behavior: connection should be established
						const emitSpy = jest.spyOn(push, 'emit');
						const connection = backendName === 'sse' ? { req, res } : ws;

						// ACT
						push.handleRequest(req, res);

						// ASSERT
						expect(backend.add).toHaveBeenCalledWith(pushRef, user.id, connection);
						expect(emitSpy).toHaveBeenCalledWith('editorUiConnected', pushRef);
					} else {
						// Expected behavior: connection should be rejected
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
					}
				});
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

		describe('additional edge cases', () => {
			describe.each(backendNames)('%s backend - additional cases', (backendName) => {
				const backend = backendName === 'sse' ? sseBackend : wsBackend;

				beforeEach(() => {
					config.backend = backendName;
					push = new Push(config, mock(), logger, mock(), mock());
					req.ws = backendName === 'sse' ? undefined : ws;

					// Reset headers
					req.headers.host = host;
					req.headers.origin = `https://${host}`;
					req.query = { pushRef };
					delete req.headers['x-forwarded-host'];
				});

				test('should handle malformed origin URLs that throw during parsing', () => {
					// Set an origin that parseOrigin will return null for
					req.headers.origin = 'invalid-protocol://example.com';

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
				});

				test('should allow origins with query parameters and fragments when host matches', () => {
					// Test with an origin that has additional components but correct host
					const queryOrigin = `https://${host}?query=param#fragment`;
					req.headers.origin = queryOrigin;

					// This should pass because the host extraction ignores query/fragment
					const emitSpy = jest.spyOn(push, 'emit');
					const connection = backendName === 'sse' ? { req, res } : ws;

					push.handleRequest(req, res);

					expect(backend.add).toHaveBeenCalledWith(pushRef, user.id, connection);
					expect(emitSpy).toHaveBeenCalledWith('editorUiConnected', pushRef);
				});

				test('should allow origin with path component when host matches', () => {
					// Origins with path components should be parsed correctly
					const pathOrigin = `https://${host}/path`;
					req.headers.origin = pathOrigin;

					// This should pass because the host extraction ignores the path
					const emitSpy = jest.spyOn(push, 'emit');
					const connection = backendName === 'sse' ? { req, res } : ws;

					push.handleRequest(req, res);

					expect(backend.add).toHaveBeenCalledWith(pushRef, user.id, connection);
					expect(emitSpy).toHaveBeenCalledWith('editorUiConnected', pushRef);
				});

				test('should handle numeric IP addresses correctly', () => {
					const ipHost = '192.168.1.100';
					req.headers.host = `${ipHost}:3000`;
					req.headers.origin = `https://${ipHost}:3000`;

					const emitSpy = jest.spyOn(push, 'emit');
					const connection = backendName === 'sse' ? { req, res } : ws;

					push.handleRequest(req, res);

					expect(backend.add).toHaveBeenCalledWith(pushRef, user.id, connection);
					expect(emitSpy).toHaveBeenCalledWith('editorUiConnected', pushRef);
				});

				test('should handle localhost correctly', () => {
					const localhostHost = 'localhost:8080';
					req.headers.host = localhostHost;
					req.headers.origin = `http://${localhostHost}`;

					const emitSpy = jest.spyOn(push, 'emit');
					const connection = backendName === 'sse' ? { req, res } : ws;

					push.handleRequest(req, res);

					expect(backend.add).toHaveBeenCalledWith(pushRef, user.id, connection);
					expect(emitSpy).toHaveBeenCalledWith('editorUiConnected', pushRef);
				});
			});
		});

		describe('edge cases in handleRequest', () => {
			describe.each(backendNames)('%s backend - edge cases', (backendName) => {
				const backend = backendName === 'sse' ? sseBackend : wsBackend;

				beforeEach(() => {
					config.backend = backendName;
					push = new Push(config, mock(), logger, mock(), mock());
					req.ws = backendName === 'sse' ? undefined : ws;

					// Reset headers
					req.headers.host = host;
					req.headers.origin = `https://${host}`;
					req.query = { pushRef };
					delete req.headers['x-forwarded-host'];
				});

				test('should handle missing pushRef query parameter', () => {
					req.query = { pushRef: '' };

					if (backendName === 'sse') {
						expect(() => push.handleRequest(req, res)).toThrow(
							new BadRequestError('The query parameter "pushRef" is missing!'),
						);
					} else {
						push.handleRequest(req, res);
						expect(ws.send).toHaveBeenCalledWith('The query parameter "pushRef" is missing!');
						expect(ws.close).toHaveBeenCalledWith(1008);
					}
					expect(backend.add).not.toHaveBeenCalled();
				});

				test('should handle null pushRef', () => {
					req.query = { pushRef: null as any };

					if (backendName === 'sse') {
						expect(() => push.handleRequest(req, res)).toThrow(
							new BadRequestError('The query parameter "pushRef" is missing!'),
						);
					} else {
						push.handleRequest(req, res);
						expect(ws.send).toHaveBeenCalledWith('The query parameter "pushRef" is missing!');
						expect(ws.close).toHaveBeenCalledWith(1008);
					}
					expect(backend.add).not.toHaveBeenCalled();
				});

				test('should handle missing origin header completely', () => {
					delete req.headers.origin;

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
				});

				test('should handle empty string origin header', () => {
					req.headers.origin = '';

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
				});

				test('should handle missing host header when no x-forwarded-host', () => {
					// Explicitly remove host header after beforeEach setup
					delete req.headers.host;
					req.headers.origin = `https://${host}`;
					// Make sure no proxy headers exist
					delete req.headers['x-forwarded-host'];
					delete req.headers.forwarded;

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
				});

				test('should handle array x-forwarded-host header (use first)', () => {
					req.headers['x-forwarded-host'] = [host, 'other-host.com'] as any;
					req.headers.origin = `https://${host}`;

					const emitSpy = jest.spyOn(push, 'emit');
					const connection = backendName === 'sse' ? { req, res } : ws;

					push.handleRequest(req, res);

					expect(backend.add).toHaveBeenCalledWith(pushRef, user.id, connection);
					expect(emitSpy).toHaveBeenCalledWith('editorUiConnected', pushRef);
				});

				describe('Forwarded header support', () => {
					beforeEach(() => {
						// Clean proxy headers for each test
						delete req.headers.forwarded;
						delete req.headers['x-forwarded-host'];
						delete req.headers['x-forwarded-proto'];
						// Explicitly set headers for forwarded tests
						req.headers.host = host;
						req.headers.origin = `https://${host}`;
					});

					test('should parse RFC 7239 Forwarded header with host and proto', () => {
						req.headers.forwarded = `for=192.0.2.60;proto=https;host=${host}`;
						req.headers.origin = `https://${host}`;

						const emitSpy = jest.spyOn(push, 'emit');
						const connection = backendName === 'sse' ? { req, res } : ws;

						push.handleRequest(req, res);

						expect(backend.add).toHaveBeenCalledWith(pushRef, user.id, connection);
						expect(emitSpy).toHaveBeenCalledWith('editorUiConnected', pushRef);
					});

					test('should handle Forwarded header with quoted values', () => {
						req.headers.forwarded = `for="192.0.2.60";proto="https";host="${host}"`;
						req.headers.origin = `https://${host}`;

						const emitSpy = jest.spyOn(push, 'emit');
						const connection = backendName === 'sse' ? { req, res } : ws;

						push.handleRequest(req, res);

						expect(backend.add).toHaveBeenCalledWith(pushRef, user.id, connection);
						expect(emitSpy).toHaveBeenCalledWith('editorUiConnected', pushRef);
					});

					test('should prioritize Forwarded header over X-Forwarded-* headers', () => {
						req.headers.forwarded = `proto=https;host=${host}`;
						req.headers['x-forwarded-host'] = 'wrong-host.com';
						req.headers['x-forwarded-proto'] = 'http';
						req.headers.origin = `https://${host}`;

						const emitSpy = jest.spyOn(push, 'emit');
						const connection = backendName === 'sse' ? { req, res } : ws;

						push.handleRequest(req, res);

						expect(backend.add).toHaveBeenCalledWith(pushRef, user.id, connection);
						expect(emitSpy).toHaveBeenCalledWith('editorUiConnected', pushRef);
					});

					test('should fallback to X-Forwarded-* when Forwarded header incomplete', () => {
						req.headers.forwarded = 'for=192.0.2.60'; // Missing host and proto
						req.headers['x-forwarded-host'] = host;
						req.headers['x-forwarded-proto'] = 'https';
						req.headers.origin = `https://${host}`;

						const emitSpy = jest.spyOn(push, 'emit');
						const connection = backendName === 'sse' ? { req, res } : ws;

						push.handleRequest(req, res);

						expect(backend.add).toHaveBeenCalledWith(pushRef, user.id, connection);
						expect(emitSpy).toHaveBeenCalledWith('editorUiConnected', pushRef);
					});

					test('should handle multiple Forwarded entries (use first)', () => {
						req.headers.forwarded = `proto=https;host=${host}, proto=http;host=other.com`;
						req.headers.origin = `https://${host}`;

						const emitSpy = jest.spyOn(push, 'emit');
						const connection = backendName === 'sse' ? { req, res } : ws;

						push.handleRequest(req, res);

						expect(backend.add).toHaveBeenCalledWith(pushRef, user.id, connection);
						expect(emitSpy).toHaveBeenCalledWith('editorUiConnected', pushRef);
					});

					test('should handle comma-separated X-Forwarded-Proto (use first)', () => {
						req.headers['x-forwarded-host'] = host;
						req.headers['x-forwarded-proto'] = 'https, http';
						req.headers.origin = `https://${host}`;

						const emitSpy = jest.spyOn(push, 'emit');
						const connection = backendName === 'sse' ? { req, res } : ws;

						push.handleRequest(req, res);

						expect(backend.add).toHaveBeenCalledWith(pushRef, user.id, connection);
						expect(emitSpy).toHaveBeenCalledWith('editorUiConnected', pushRef);
					});

					test('should normalize default ports in Forwarded header', () => {
						req.headers.forwarded = `proto=https;host=${host}:443`;
						req.headers.origin = `https://${host}`;

						const emitSpy = jest.spyOn(push, 'emit');
						const connection = backendName === 'sse' ? { req, res } : ws;

						push.handleRequest(req, res);

						expect(backend.add).toHaveBeenCalledWith(pushRef, user.id, connection);
						expect(emitSpy).toHaveBeenCalledWith('editorUiConnected', pushRef);
					});

					test('should reject mismatched host in Forwarded header', () => {
						req.headers.forwarded = 'proto=https;host=wrong-host.com';
						req.headers.origin = `https://${host}`;

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
					});

					test('should allow invalid protocol in Forwarded header if host matches', () => {
						req.headers.forwarded = `proto=ftp;host=${host}`;
						req.headers.origin = `https://${host}`;

						const emitSpy = jest.spyOn(push, 'emit');
						const connection = backendName === 'sse' ? { req, res } : ws;

						push.handleRequest(req, res);

						expect(backend.add).toHaveBeenCalledWith(pushRef, user.id, connection);
						expect(emitSpy).toHaveBeenCalledWith('editorUiConnected', pushRef);
					});
				});
			});

			describe('parseForwardedHeader method', () => {
				test('should parse simple forwarded header', () => {
					// @ts-expect-error accessing private method for testing
					const result = push.parseForwardedHeader('proto=https;host=example.com');
					expect(result).toEqual({ proto: 'https', host: 'example.com' });
				});

				test('should parse forwarded header with quoted values', () => {
					// @ts-expect-error accessing private method for testing
					const result = push.parseForwardedHeader('proto="https";host="example.com"');
					expect(result).toEqual({ proto: 'https', host: 'example.com' });
				});

				test('should parse forwarded header with single quotes', () => {
					// @ts-expect-error accessing private method for testing
					const result = push.parseForwardedHeader("proto='https';host='example.com'");
					expect(result).toEqual({ proto: 'https', host: 'example.com' });
				});

				test('should handle multiple entries (use first)', () => {
					// @ts-expect-error accessing private method for testing
					const result = push.parseForwardedHeader(
						'proto=https;host=example.com, proto=http;host=other.com',
					);
					expect(result).toEqual({ proto: 'https', host: 'example.com' });
				});

				test('should handle spaces around values', () => {
					// @ts-expect-error accessing private method for testing
					const result = push.parseForwardedHeader('  proto = https ; host = example.com  ');
					expect(result).toEqual({ proto: 'https', host: 'example.com' });
				});

				test('should ignore unknown parameters', () => {
					// @ts-expect-error accessing private method for testing
					const result = push.parseForwardedHeader(
						'for=192.0.2.60;proto=https;host=example.com;by=proxy.com',
					);
					expect(result).toEqual({ proto: 'https', host: 'example.com' });
				});

				test('should return null for invalid header', () => {
					// @ts-expect-error accessing private method for testing
					expect(push.parseForwardedHeader('')).toBeNull();
					// @ts-expect-error accessing private method for testing
					expect(push.parseForwardedHeader('invalid')).toEqual({});
				});

				test('should return null for non-string input', () => {
					// @ts-expect-error accessing private method for testing
					expect(push.parseForwardedHeader(null as any)).toBeNull();
					// @ts-expect-error accessing private method for testing
					expect(push.parseForwardedHeader(undefined as any)).toBeNull();
				});

				test('should handle partial parameters', () => {
					// @ts-expect-error accessing private method for testing
					expect(push.parseForwardedHeader('proto=https')).toEqual({ proto: 'https' });
					// @ts-expect-error accessing private method for testing
					expect(push.parseForwardedHeader('host=example.com')).toEqual({ host: 'example.com' });
				});
			});
		});
	});
});
