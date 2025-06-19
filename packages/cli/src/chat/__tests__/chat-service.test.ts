import type { Logger } from '@n8n/backend-common';
import { mock } from 'jest-mock-extended';
import { WebSocket } from 'ws';

import type { ChatExecutionManager } from '../chat-execution-manager';
import { ChatService } from '../chat-service';
import type { ChatRequest } from '../chat-service.types';

jest.useFakeTimers();

describe('ChatService', () => {
	let mockExecutionManager: ReturnType<typeof mock<ChatExecutionManager>>;
	let mockLogger: ReturnType<typeof mock<Logger>>;
	let chatService: ChatService;
	let mockWs: ReturnType<typeof mock<WebSocket>>;

	beforeEach(() => {
		mockExecutionManager = mock<ChatExecutionManager>();
		mockLogger = mock<Logger>();
		chatService = new ChatService(mockExecutionManager, mockLogger);
		mockWs = mock<WebSocket>();
	});

	it('should handle missing execution gracefully', async () => {
		const req = {
			ws: mockWs,
			query: {
				sessionId: '123',
				executionId: '42',
				isPublic: false,
			},
		} as unknown as ChatRequest;

		mockExecutionManager.findExecution.mockResolvedValue(undefined);

		try {
			await chatService.startSession(req);
		} catch (error) {
			expect(error).toBeDefined();
			expect(mockWs.send).toHaveBeenCalledWith('Execution with id "42" does not exist');
		}
	});

	it('should handle missing WebSocket connection gracefully', async () => {
		const req = {
			ws: null,
			query: {
				sessionId: 'abc',
				executionId: '123',
				isPublic: false,
			},
		} as unknown as ChatRequest;

		await expect(chatService.startSession(req)).rejects.toThrow('WebSocket connection is missing');
	});

	describe('startSession', () => {
		it('should reject if sessionId or executionId is missing', () => {
			const req = {
				ws: mockWs,
				query: {
					sessionId: '',
					executionId: '',
					isPublic: false,
				},
			} as unknown as ChatRequest;

			void chatService.startSession(req);

			expect(mockWs.send).toHaveBeenCalledWith('The query parameter "sessionId" is missing');
			expect(mockWs.close).toHaveBeenCalledWith(1008);
		});

		it('should start a session and store it in sessions map', async () => {
			const mockWs = mock<WebSocket>();
			// @ts-ignore override private readonly
			mockWs.readyState = WebSocket.OPEN;

			const req = {
				ws: mockWs,
				query: {
					sessionId: 'abc',
					executionId: '123',
					isPublic: true,
				},
			} as unknown as ChatRequest;

			mockExecutionManager.findExecution.mockResolvedValue({ id: '123' } as any);

			await chatService.startSession(req);

			const sessionKey = 'abc|123|public';
			const session = (chatService as any).sessions.get(sessionKey);

			expect(session).toBeDefined();
			expect(session?.sessionId).toBe('abc');
			expect(session?.executionId).toBe('123');
			expect(session?.isPublic).toBe(true);
			expect(typeof session?.intervalId).toBe('object');
		});

		it('should terminate existing session if the same key is used and clear interval', async () => {
			const clearIntervalSpy = jest.spyOn(global, 'clearInterval').mockImplementation();
			const req = {
				ws: mockWs,
				query: {
					sessionId: 'abc',
					executionId: '123',
					isPublic: false,
				},
			} as unknown as ChatRequest;

			const previousConnection = mock<WebSocket>();
			// @ts-ignore
			previousConnection.readyState = WebSocket.OPEN;
			const dummyInterval = setInterval(() => {}, 9999);
			const sessionKey = 'abc|123|integrated';

			// @ts-ignore
			(chatService as any).sessions.set(sessionKey, {
				connection: previousConnection,
				executionId: '123',
				sessionId: 'abc',
				intervalId: dummyInterval,
				waitingForResponse: false,
				isPublic: false,
			});

			mockExecutionManager.findExecution.mockResolvedValue({ id: '123' } as any);

			await chatService.startSession(req);

			expect(previousConnection.terminate).toHaveBeenCalled();
			expect(clearIntervalSpy).toHaveBeenCalledWith(dummyInterval);
			expect((chatService as any).sessions.get(sessionKey).connection).toBe(mockWs);
			clearIntervalSpy.mockRestore();
		});
	});

	describe('incomingMessageHandler', () => {
		it('should return if session does not exist', async () => {
			const sessionKey = 'nonexistent';
			const data = 'test data';
			const incomingMessageHandler = (chatService as any).incomingMessageHandler(sessionKey);
			await incomingMessageHandler(data);

			expect(mockExecutionManager.runWorkflow).not.toHaveBeenCalled();
		});

		it('should handle heartbeat acknowledgement', async () => {
			const sessionKey = 'abc|123|public';
			const session = {
				executionId: '123',
				lastHeartbeat: 0,
			};
			(chatService as any).sessions.set(sessionKey, session);

			const data = 'n8n|heartbeat-ack';
			const incomingMessageHandler = (chatService as any).incomingMessageHandler(sessionKey);
			await incomingMessageHandler(data);

			expect(session.lastHeartbeat).not.toBe(0);
			expect(mockExecutionManager.runWorkflow).not.toHaveBeenCalled();
		});

		it('should resume execution with processed message', async () => {
			const sessionKey = 'abc|123|public';
			const session = {
				executionId: '123',
				waitingNodeName: 'test',
			};
			(chatService as any).sessions.set(sessionKey, session);

			const data = JSON.stringify({ action: 'user', chatInput: 'hello', sessionId: 'abc' });
			mockExecutionManager.findExecution.mockResolvedValue({
				id: '123',
				data: { resultData: {} },
			} as any);

			const incomingMessageHandler = (chatService as any).incomingMessageHandler(sessionKey);
			await incomingMessageHandler(data);

			expect(mockExecutionManager.runWorkflow).toHaveBeenCalled();
			expect(session.waitingNodeName).toBeUndefined();
		});

		it('should handle errors during message processing', async () => {
			const sessionKey = 'abc|123|public';
			const session = {
				executionId: '123',
			};
			(chatService as any).sessions.set(sessionKey, session);

			const data = 'invalid json';
			const incomingMessageHandler = (chatService as any).incomingMessageHandler(sessionKey);
			await incomingMessageHandler(data);

			expect(mockLogger.error).toHaveBeenCalled();
		});
	});
});
