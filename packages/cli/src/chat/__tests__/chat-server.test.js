'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const http_1 = require('http');
const jest_mock_extended_1 = require('jest-mock-extended');
const chat_server_1 = require('../chat-server');
jest.mock('ws');
describe('ChatServer', () => {
	const mockChatService = (0, jest_mock_extended_1.mock)();
	const mockWsServer = (0, jest_mock_extended_1.mock)();
	const mockApp = (0, jest_mock_extended_1.mock)();
	mockApp.handle = jest.fn();
	const mockHttpServer = (0, jest_mock_extended_1.mock)();
	let chatServer;
	beforeEach(() => {
		(0, jest_mock_extended_1.mockReset)(mockChatService);
		(0, jest_mock_extended_1.mockReset)(mockWsServer);
		(0, jest_mock_extended_1.mockReset)(mockApp);
		(0, jest_mock_extended_1.mockReset)(mockHttpServer);
		chatServer = new chat_server_1.ChatServer(mockChatService);
		chatServer.wsServer = mockWsServer;
	});
	it('attaches upgrade listener to HTTP server', () => {
		chatServer.setup(mockHttpServer, mockApp);
		expect(mockHttpServer.on).toHaveBeenCalledWith('upgrade', expect.any(Function));
	});
	it('handles WebSocket upgrade for /chat path', () => {
		chatServer.setup(mockHttpServer, mockApp);
		const req = {
			url: 'http://localhost:5678/chat?sessionId=123&executionId=456',
			socket: { remoteAddress: '127.0.0.1' },
		};
		const socket = {};
		const head = {};
		const upgradeHandler = mockHttpServer.on.mock.calls[0][1];
		upgradeHandler(req, socket, head);
		expect(mockWsServer.handleUpgrade).toHaveBeenCalledWith(
			req,
			socket,
			head,
			expect.any(Function),
		);
	});
	it('calls attachToApp after WebSocket upgrade', () => {
		chatServer.setup(mockHttpServer, mockApp);
		const req = {
			url: 'http://localhost:5678/chat?sessionId=123&executionId=456',
			socket: { remoteAddress: '127.0.0.1' },
		};
		const socket = {};
		const head = {};
		const ws = {};
		const upgradeHandler = mockHttpServer.on.mock.calls[0][1];
		upgradeHandler(req, socket, head);
		const handleUpgradeCb = mockWsServer.handleUpgrade.mock.calls[0][3];
		handleUpgradeCb(ws, req);
		expect(req.ws).toBe(ws);
		expect(mockApp.handle).toHaveBeenCalledWith(
			expect.objectContaining({ ws }),
			expect.any(http_1.ServerResponse),
		);
	});
});
//# sourceMappingURL=chat-server.test.js.map
