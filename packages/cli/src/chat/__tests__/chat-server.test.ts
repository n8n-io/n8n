import type { PathResolvingService } from '@n8n/backend-services';
import type { Application } from 'express';
import { ServerResponse } from 'http';
import type { Server as HttpServer, IncomingMessage } from 'http';
import { mock, mockReset } from 'vitest-mock-extended';
import type { WebSocket, WebSocketServer } from 'ws';

import { ChatServer } from '../chat-server';
import type { ChatService } from '../chat-service';
import type { ChatRequest } from '../chat-service.types';

vi.mock('ws', () => ({
	Server: vi.fn(function () {}),
	WebSocketServer: vi.fn(function () {}),
}));

describe('ChatServer', () => {
	const mockChatService = mock<ChatService>();
	const mockWsServer = mock<WebSocketServer>();
	const mockApp = mock<Application>() as unknown as Application & {
		handle: (req: IncomingMessage, res: ServerResponse) => void;
	};
	mockApp.handle = vi.fn();
	const mockHttpServer = mock<HttpServer>();
	const pathResolvingService = mock<PathResolvingService>();

	let chatServer: ChatServer;

	beforeEach(() => {
		mockReset(mockChatService);
		mockReset(mockWsServer);
		mockReset(mockApp);
		mockReset(mockHttpServer);
		mockReset(pathResolvingService);
		pathResolvingService.resolveEndpoint.mockReturnValue('/chat');

		chatServer = new ChatServer(mockChatService, pathResolvingService);

		(chatServer as any).wsServer = mockWsServer;
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
		} as ChatRequest;
		const socket = {} as any;
		const head = {} as any;

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
		} as ChatRequest;
		const socket = {} as any;
		const head = {} as any;
		const ws = {} as WebSocket;

		const upgradeHandler = mockHttpServer.on.mock.calls[0][1];
		upgradeHandler(req, socket, head);

		const handleUpgradeCb = mockWsServer.handleUpgrade.mock.calls[0][3];
		handleUpgradeCb(ws, req);

		expect(req.ws).toBe(ws);
		expect(mockApp.handle).toHaveBeenCalledWith(
			expect.objectContaining({ ws }),
			expect.any(ServerResponse),
		);
	});

	it('handles WebSocket upgrade and HTTP requests under the base path', () => {
		pathResolvingService.resolveEndpoint.mockReturnValue('/n8n/chat');
		chatServer.setup(mockHttpServer, mockApp);

		expect(pathResolvingService.resolveEndpoint).toHaveBeenCalledWith('chat');
		expect(mockApp.use).toHaveBeenCalledWith('/n8n/chat', expect.any(Function));

		const upgradeHandler = mockHttpServer.on.mock.calls[0][1];
		const socket = {} as any;
		const head = {} as any;

		upgradeHandler(
			{ url: '/chat?sessionId=123&executionId=456', socket: {} } as ChatRequest,
			socket,
			head,
		);
		expect(mockWsServer.handleUpgrade).not.toHaveBeenCalled();

		const req = { url: '/n8n/chat?sessionId=123&executionId=456', socket: {} } as ChatRequest;
		upgradeHandler(req, socket, head);
		expect(mockWsServer.handleUpgrade).toHaveBeenCalledWith(
			req,
			socket,
			head,
			expect.any(Function),
		);
	});
});
