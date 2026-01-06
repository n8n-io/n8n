import type { Logger } from '@n8n/backend-common';
import { mock } from 'jest-mock-extended';
import { WebSocket } from 'ws';

import type { ChatExecutionManager } from '../chat-execution-manager';
import { ChatService } from '../chat-service';
import type { ChatRequest } from '../chat-service.types';
import type { ErrorReporter } from 'n8n-core';

describe('ChatService', () => {
	let mockExecutionManager: ReturnType<typeof mock<ChatExecutionManager>>;
	let mockLogger: ReturnType<typeof mock<Logger>>;
	let mockErrorReporter: ReturnType<typeof mock<ErrorReporter>>;
	let chatService: ChatService;
	let mockWs: ReturnType<typeof mock<WebSocket>>;

	beforeAll(() => {
		jest.useFakeTimers();
	});

	afterAll(() => {
		jest.useRealTimers();
	});

	beforeEach(() => {
		mockExecutionManager = mock<ChatExecutionManager>();
		mockLogger = mock<Logger>();
		mockErrorReporter = mock<ErrorReporter>();
		chatService = new ChatService(mockExecutionManager, mockLogger, mockErrorReporter);
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
		it('should start a session and store it in sessions map', async () => {
			const mockWs = mock<WebSocket>();

			(mockWs as any).readyState = WebSocket.OPEN;

			const req = {
				ws: mockWs,
				query: {
					sessionId: 'abc',
					executionId: '123',
					isPublic: true,
				},
			} as unknown as ChatRequest;

			mockExecutionManager.checkIfExecutionExists.mockResolvedValue({ id: '123' } as any);

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

			(previousConnection as any).readyState = WebSocket.OPEN;
			const dummyInterval = setInterval(() => {}, 9999);
			const sessionKey = 'abc|123|integrated';

			(chatService as any).sessions.set(sessionKey, {
				connection: previousConnection,
				executionId: '123',
				sessionId: 'abc',
				intervalId: dummyInterval,
				waitingForResponse: false,
				isPublic: false,
			});

			mockExecutionManager.checkIfExecutionExists.mockResolvedValue({ id: '123' } as any);

			await chatService.startSession(req);

			expect(previousConnection.terminate).toHaveBeenCalled();
			expect(clearIntervalSpy).toHaveBeenCalledWith(dummyInterval);
			expect((chatService as any).sessions.get(sessionKey).connection).toBe(mockWs);
			clearIntervalSpy.mockRestore();
		});

		describe('checkHeartbeats', () => {
			it('should terminate sessions that have not sent a heartbeat recently', async () => {
				const sessionKey = 'abc|123|public';
				const session = {
					executionId: '123',
					connection: mockWs,
					lastHeartbeat: Date.now() - 61 * 1000,
					intervalId: 123,
				};
				(chatService as any).sessions.set(sessionKey, session);

				mockExecutionManager.cancelExecution.mockResolvedValue(undefined);
				mockWs.terminate.mockImplementation(() => {});
				jest.spyOn(global, 'clearInterval').mockImplementation(() => {});

				await (chatService as any).checkHeartbeats();

				expect(mockExecutionManager.cancelExecution).toHaveBeenCalledWith('123');
				expect(mockWs.terminate).toHaveBeenCalled();
				expect(clearInterval).toHaveBeenCalledWith(123);
				expect((chatService as any).sessions.get(sessionKey)).toBeUndefined();
			});

			it('should remove sessions whose connection throws an error when sending a heartbeat', async () => {
				const sessionKey = 'abc|123|public';
				const session = {
					executionId: '123',
					connection: mockWs,
					lastHeartbeat: Date.now(),
					intervalId: 123,
				};
				(chatService as any).sessions.set(sessionKey, session);

				mockWs.send.mockImplementation(() => {
					throw new Error('Connection error');
				});
				jest.spyOn(global, 'clearInterval').mockImplementation(() => {});

				await (chatService as any).checkHeartbeats();

				expect(mockWs.send).toHaveBeenCalledWith('n8n|heartbeat');
				expect(clearInterval).toHaveBeenCalledWith(123);
				expect((chatService as any).sessions.get(sessionKey)).toBeUndefined();
			});

			it('should check heartbeats and maintain sessions', async () => {
				const sessionKey = 'abc|123|public';
				mockWs.send.mockImplementation(() => {});
				const session = {
					executionId: '123',
					connection: mockWs,
					lastHeartbeat: Date.now(),
					intervalId: 123,
				};
				(chatService as any).sessions.set(sessionKey, session);

				await (chatService as any).checkHeartbeats();

				expect(mockWs.send).toHaveBeenCalledWith('n8n|heartbeat');
				expect((chatService as any).sessions.get(sessionKey)).toBeDefined();
			});
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
				nodeWaitingForChatResponse: 'test',
			};
			(chatService as any).sessions.set(sessionKey, session);

			const data = JSON.stringify({ action: 'sendMessage', chatInput: 'hello', sessionId: 'abc' });
			mockExecutionManager.findExecution.mockResolvedValue({
				id: '123',
				status: 'waiting',
				data: { resultData: {} },
			} as any);

			const incomingMessageHandler = (chatService as any).incomingMessageHandler(sessionKey);
			await incomingMessageHandler(data);

			expect(mockExecutionManager.runWorkflow).toHaveBeenCalled();
			expect(session.nodeWaitingForChatResponse).toBeUndefined();
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

	describe('pollAndProcessChatResponses', () => {
		it('should return if session does not exist', async () => {
			const sessionKey = 'nonexistent';
			const pollAndProcessChatResponses = (chatService as any).pollAndProcessChatResponses(
				sessionKey,
			);
			await pollAndProcessChatResponses();

			expect(mockExecutionManager.findExecution).not.toHaveBeenCalled();
		});

		it('should return if session is processing', async () => {
			const sessionKey = 'abc|123|public';
			(chatService as any).sessions.set(sessionKey, { isProcessing: true });

			const pollAndProcessChatResponses = (chatService as any).pollAndProcessChatResponses(
				sessionKey,
			);
			await pollAndProcessChatResponses();

			expect(mockExecutionManager.findExecution).not.toHaveBeenCalled();
		});

		it('should return if execution does not exist', async () => {
			const sessionKey = 'abc|123|public';
			(chatService as any).sessions.set(sessionKey, {
				isProcessing: false,
				executionId: '123',
				nodeWaitingForChatResponse: undefined,
			});
			mockExecutionManager.findExecution.mockResolvedValue(undefined);

			const pollAndProcessChatResponses = (chatService as any).pollAndProcessChatResponses(
				sessionKey,
			);
			await pollAndProcessChatResponses();

			expect(mockWs.send).not.toHaveBeenCalled();
		});

		it('should send continue if execution status is waiting and last node name is different from nodeWaitingForChatResponse', async () => {
			const sessionKey = 'abc|123|public';
			const session = {
				isProcessing: false,
				executionId: '123',
				connection: { send: jest.fn() },
				nodeWaitingForChatResponse: 'node1',
			};
			(chatService as any).sessions.set(sessionKey, session);
			mockExecutionManager.findExecution.mockResolvedValue({
				status: 'waiting',
				data: { resultData: { lastNodeExecuted: 'node2' } },
				workflowData: { nodes: [{ name: 'node1' }] },
			} as any);

			const pollAndProcessChatResponses = (chatService as any).pollAndProcessChatResponses(
				sessionKey,
			);
			await pollAndProcessChatResponses();

			expect(session.connection.send).toHaveBeenCalledWith('n8n|continue');
			expect(session.nodeWaitingForChatResponse).toBeUndefined();
		});

		it('should send message if execution status is waiting and a message exists', async () => {
			const sessionKey = 'abc|123|public';
			const session = {
				isProcessing: false,
				executionId: '123',
				connection: { send: jest.fn() },
				sessionId: 'abc',
				nodeWaitingForChatResponse: undefined,
			};
			(chatService as any).sessions.set(sessionKey, session);
			mockExecutionManager.findExecution.mockResolvedValue({
				status: 'waiting',
				data: {
					resultData: {
						lastNodeExecuted: 'node1',
						runData: { node1: [{ data: { main: [[{ sendMessage: 'test message' }]] } }] },
					},
				},
				workflowData: { nodes: [{ name: 'node1' }] },
			} as any);
			(chatService as any).shouldResumeImmediately = jest.fn().mockReturnValue(false);

			(chatService as any).resumeExecution = jest.fn();

			const pollAndProcessChatResponses = (chatService as any).pollAndProcessChatResponses(
				sessionKey,
			);
			await pollAndProcessChatResponses();

			expect(session.connection.send).toHaveBeenCalledWith('test message');
			expect(session.nodeWaitingForChatResponse).toEqual('node1');
		});

		it('should close connection if execution status is success and shouldNotReturnLastNodeResponse is false', async () => {
			const sessionKey = 'abc|123|public';
			const session = {
				isProcessing: false,
				executionId: '123',
				connection: { close: jest.fn(), readyState: 1, once: jest.fn() },
				isPublic: false,
			};
			(chatService as any).sessions.set(sessionKey, session);
			mockExecutionManager.findExecution.mockResolvedValue({
				status: 'success',
				data: { resultData: { lastNodeExecuted: 'node1' } },
				workflowData: { nodes: [{ type: 'n8n-core.respondToWebhook', name: 'node1' }] },
				mode: 'manual',
			} as any);

			const pollAndProcessChatResponses = (chatService as any).pollAndProcessChatResponses(
				sessionKey,
			);
			await pollAndProcessChatResponses();

			expect(session.connection.once).toHaveBeenCalled();
			expect(session.connection.once).toHaveBeenCalledWith('drain', expect.any(Function));
		});

		it('should handle errors during message processing', async () => {
			const sessionKey = 'abc|123|public';
			const session = {
				isProcessing: false,
				executionId: '123',
				connection: mockWs,
				nodeWaitingForChatResponse: undefined,
			};
			(chatService as any).sessions.set(sessionKey, session);
			mockExecutionManager.findExecution.mockRejectedValue(new Error('test error'));

			const pollAndProcessChatResponses = (chatService as any).pollAndProcessChatResponses(
				sessionKey,
			);
			await pollAndProcessChatResponses();

			expect(mockLogger.error).toHaveBeenCalled();
		});
	});
});
