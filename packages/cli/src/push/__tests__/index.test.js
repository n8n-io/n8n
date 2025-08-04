'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const jest_mock_extended_1 = require('jest-mock-extended');
const ws_1 = require('ws');
const bad_request_error_1 = require('@/errors/response-errors/bad-request.error');
const push_1 = require('@/push');
const sse_push_1 = require('@/push/sse.push');
const websocket_push_1 = require('@/push/websocket.push');
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
	const user = (0, jest_mock_extended_1.mock)({ id: 'user-id' });
	const config = (0, jest_mock_extended_1.mock)();
	const logger = (0, jest_mock_extended_1.mock)();
	let push;
	const sseBackend = (0, backend_test_utils_1.mockInstance)(sse_push_1.SSEPush);
	const wsBackend = (0, backend_test_utils_1.mockInstance)(websocket_push_1.WebSocketPush);
	beforeEach(() => {
		jest.resetAllMocks();
		logger.scoped.mockReturnValue(logger);
	});
	describe('setupPushServer', () => {
		const restEndpoint = 'rest';
		const app = (0, jest_mock_extended_1.mock)();
		const server = (0, jest_mock_extended_1.mock)();
		const wssSpy = jest.spyOn(ws_1.Server.prototype, 'constructor');
		describe('sse backend', () => {
			test('should not create a WebSocket server', () => {
				config.backend = 'sse';
				push = new push_1.Push(
					config,
					(0, jest_mock_extended_1.mock)(),
					logger,
					(0, jest_mock_extended_1.mock)(),
					(0, jest_mock_extended_1.mock)(),
				);
				push.setupPushServer(restEndpoint, server, app);
				expect(wssSpy).not.toHaveBeenCalled();
				expect(server.on).not.toHaveBeenCalled();
			});
		});
		describe('websocket backend', () => {
			let onUpgrade;
			const wsServer = (0, jest_mock_extended_1.mock)();
			const socket = (0, jest_mock_extended_1.mock)();
			const upgradeHead = (0, jest_mock_extended_1.mock)();
			beforeEach(() => {
				config.backend = 'websocket';
				push = new push_1.Push(
					config,
					(0, jest_mock_extended_1.mock)(),
					logger,
					(0, jest_mock_extended_1.mock)(),
					(0, jest_mock_extended_1.mock)(),
				);
				wssSpy.mockReturnValue(wsServer);
				push.setupPushServer(restEndpoint, server, app);
				expect(wssSpy).toHaveBeenCalledWith({ noServer: true });
				const onUpgradeCaptor = (0, jest_mock_extended_1.captor)();
				expect(server.on).toHaveBeenCalledWith('upgrade', onUpgradeCaptor);
				onUpgrade = onUpgradeCaptor.value;
			});
			test('should not upgrade non-push urls', () => {
				const request = (0, jest_mock_extended_1.mock)({ url: '/rest/testing' });
				onUpgrade(request, socket, upgradeHead);
				expect(wsServer.handleUpgrade).not.toHaveBeenCalled();
			});
			test('should upgrade push url, and route it to express', () => {
				const request = (0, jest_mock_extended_1.mock)({ url: '/rest/push' });
				onUpgrade(request, socket, upgradeHead);
				const handleUpgradeCaptor = (0, jest_mock_extended_1.captor)();
				expect(wsServer.handleUpgrade).toHaveBeenCalledWith(
					request,
					socket,
					upgradeHead,
					handleUpgradeCaptor,
				);
				const ws = (0, jest_mock_extended_1.mock)();
				handleUpgradeCaptor.value(ws);
				expect(request.ws).toBe(ws);
				const serverResponseCaptor = (0, jest_mock_extended_1.captor)();
				expect(app.handle).toHaveBeenCalledWith(request, serverResponseCaptor);
				serverResponseCaptor.value.writeHead(200);
				expect(ws.close).not.toHaveBeenCalled();
				serverResponseCaptor.value.writeHead(404);
				expect(ws.close).toHaveBeenCalled();
			});
		});
	});
	describe('handleRequest', () => {
		const req = (0, jest_mock_extended_1.mock)({ user });
		const res = (0, jest_mock_extended_1.mock)();
		const ws = (0, jest_mock_extended_1.mock)();
		const backendNames = ['sse', 'websocket'];
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
				push = new push_1.Push(
					config,
					(0, jest_mock_extended_1.mock)(),
					logger,
					(0, jest_mock_extended_1.mock)(),
					(0, jest_mock_extended_1.mock)(),
				);
				req.ws = backendName === 'sse' ? undefined : ws;
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
						origin: `https://${host}`,
						xForwardedHost: 'https://123example.com',
					},
					{
						name: 'origin does not match x-forwarded-host (subdomain)',
						origin: `https://${host}`,
						xForwardedHost: `https://subdomain.${host}`,
					},
				])('$name', ({ origin, xForwardedHost }) => {
					req.headers.origin = origin;
					req.headers['x-forwarded-host'] = xForwardedHost;
					if (backendName === 'sse') {
						expect(() => push.handleRequest(req, res)).toThrow(
							new bad_request_error_1.BadRequestError('Invalid origin!'),
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
					req.headers.origin = origin;
					req.headers['x-forwarded-host'] = xForwardedHost;
					const emitSpy = jest.spyOn(push, 'emit');
					const connection = backendName === 'sse' ? { req, res } : ws;
					push.handleRequest(req, res);
					expect(backend.add).toHaveBeenCalledWith(pushRef, user.id, connection);
					expect(emitSpy).toHaveBeenCalledWith('editorUiConnected', pushRef);
				});
			});
			test('should throw if pushRef is invalid', () => {
				req.query = { pushRef: '' };
				if (backendName === 'sse') {
					expect(() => push.handleRequest(req, res)).toThrow(
						new bad_request_error_1.BadRequestError('The query parameter "pushRef" is missing!'),
					);
				} else {
					push.handleRequest(req, (0, jest_mock_extended_1.mock)());
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
//# sourceMappingURL=index.test.js.map
