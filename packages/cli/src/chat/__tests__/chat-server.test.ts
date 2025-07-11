import type { Application } from 'express';
import { ServerResponse } from 'http';
import type { Server as HttpServer } from 'http';
import type { IncomingMessage } from 'http';
import { mock, mockReset } from 'jest-mock-extended';
import type { WebSocket } from 'ws';
import type { WebSocketServer } from 'ws';

import { ChatServer } from '../chat-server';
import type { ChatService } from '../chat-service';
import type { ChatRequest } from '../chat-service.types';

jest.mock('ws');

describe('ChatServer', () => {
	const mockChatService = mock<ChatService>();
	const mockWsServer = mock<WebSocketServer>();
	const mockApp = mock<Application>() as unknown as Application & {
		handle: (req: IncomingMessage, res: ServerResponse) => void;
	};
	mockApp.handle = jest.fn();
	const mockHttpServer = mock<HttpServer>();

	let chatServer: ChatServer;

	beforeEach(() => {
		mockReset(mockChatService);
		mockReset(mockWsServer);
		mockReset(mockApp);
		mockReset(mockHttpServer);

		chatServer = new ChatServer(mockChatService);

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
});
