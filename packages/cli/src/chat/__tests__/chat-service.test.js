'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const jest_mock_extended_1 = require('jest-mock-extended');
const ws_1 = require('ws');
const chat_service_1 = require('../chat-service');
describe('ChatService', () => {
	let mockExecutionManager;
	let mockLogger;
	let mockErrorReporter;
	let chatService;
	let mockWs;
	beforeAll(() => {
		jest.useFakeTimers();
	});
	afterAll(() => {
		jest.useRealTimers();
	});
	beforeEach(() => {
		mockExecutionManager = (0, jest_mock_extended_1.mock)();
		mockLogger = (0, jest_mock_extended_1.mock)();
		mockErrorReporter = (0, jest_mock_extended_1.mock)();
		chatService = new chat_service_1.ChatService(
			mockExecutionManager,
			mockLogger,
			mockErrorReporter,
		);
		mockWs = (0, jest_mock_extended_1.mock)();
	});
	it('should handle missing execution gracefully', async () => {
		const req = {
			ws: mockWs,
			query: {
				sessionId: '123',
				executionId: '42',
				isPublic: false,
			},
		};
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
		};
		await expect(chatService.startSession(req)).rejects.toThrow('WebSocket connection is missing');
	});
	describe('startSession', () => {
		it('should start a session and store it in sessions map', async () => {
			const mockWs = (0, jest_mock_extended_1.mock)();
			mockWs.readyState = ws_1.WebSocket.OPEN;
			const req = {
				ws: mockWs,
				query: {
					sessionId: 'abc',
					executionId: '123',
					isPublic: true,
				},
			};
			mockExecutionManager.checkIfExecutionExists.mockResolvedValue({ id: '123' });
			await chatService.startSession(req);
			const sessionKey = 'abc|123|public';
			const session = chatService.sessions.get(sessionKey);
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
			};
			const previousConnection = (0, jest_mock_extended_1.mock)();
			previousConnection.readyState = ws_1.WebSocket.OPEN;
			const dummyInterval = setInterval(() => {}, 9999);
			const sessionKey = 'abc|123|integrated';
			chatService.sessions.set(sessionKey, {
				connection: previousConnection,
				executionId: '123',
				sessionId: 'abc',
				intervalId: dummyInterval,
				waitingForResponse: false,
				isPublic: false,
			});
			mockExecutionManager.checkIfExecutionExists.mockResolvedValue({ id: '123' });
			await chatService.startSession(req);
			expect(previousConnection.terminate).toHaveBeenCalled();
			expect(clearIntervalSpy).toHaveBeenCalledWith(dummyInterval);
			expect(chatService.sessions.get(sessionKey).connection).toBe(mockWs);
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
				chatService.sessions.set(sessionKey, session);
				mockExecutionManager.cancelExecution.mockResolvedValue(undefined);
				mockWs.terminate.mockImplementation(() => {});
				jest.spyOn(global, 'clearInterval').mockImplementation(() => {});
				await chatService.checkHeartbeats();
				expect(mockExecutionManager.cancelExecution).toHaveBeenCalledWith('123');
				expect(mockWs.terminate).toHaveBeenCalled();
				expect(clearInterval).toHaveBeenCalledWith(123);
				expect(chatService.sessions.get(sessionKey)).toBeUndefined();
			});
			it('should remove sessions whose connection throws an error when sending a heartbeat', async () => {
				const sessionKey = 'abc|123|public';
				const session = {
					executionId: '123',
					connection: mockWs,
					lastHeartbeat: Date.now(),
					intervalId: 123,
				};
				chatService.sessions.set(sessionKey, session);
				mockWs.send.mockImplementation(() => {
					throw new Error('Connection error');
				});
				jest.spyOn(global, 'clearInterval').mockImplementation(() => {});
				await chatService.checkHeartbeats();
				expect(mockWs.send).toHaveBeenCalledWith('n8n|heartbeat');
				expect(clearInterval).toHaveBeenCalledWith(123);
				expect(chatService.sessions.get(sessionKey)).toBeUndefined();
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
				chatService.sessions.set(sessionKey, session);
				await chatService.checkHeartbeats();
				expect(mockWs.send).toHaveBeenCalledWith('n8n|heartbeat');
				expect(chatService.sessions.get(sessionKey)).toBeDefined();
			});
		});
	});
	describe('incomingMessageHandler', () => {
		it('should return if session does not exist', async () => {
			const sessionKey = 'nonexistent';
			const data = 'test data';
			const incomingMessageHandler = chatService.incomingMessageHandler(sessionKey);
			await incomingMessageHandler(data);
			expect(mockExecutionManager.runWorkflow).not.toHaveBeenCalled();
		});
		it('should handle heartbeat acknowledgement', async () => {
			const sessionKey = 'abc|123|public';
			const session = {
				executionId: '123',
				lastHeartbeat: 0,
			};
			chatService.sessions.set(sessionKey, session);
			const data = 'n8n|heartbeat-ack';
			const incomingMessageHandler = chatService.incomingMessageHandler(sessionKey);
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
			chatService.sessions.set(sessionKey, session);
			const data = JSON.stringify({ action: 'sendMessage', chatInput: 'hello', sessionId: 'abc' });
			mockExecutionManager.findExecution.mockResolvedValue({
				id: '123',
				status: 'waiting',
				data: { resultData: {} },
			});
			const incomingMessageHandler = chatService.incomingMessageHandler(sessionKey);
			await incomingMessageHandler(data);
			expect(mockExecutionManager.runWorkflow).toHaveBeenCalled();
			expect(session.nodeWaitingForChatResponse).toBeUndefined();
		});
		it('should handle errors during message processing', async () => {
			const sessionKey = 'abc|123|public';
			const session = {
				executionId: '123',
			};
			chatService.sessions.set(sessionKey, session);
			const data = 'invalid json';
			const incomingMessageHandler = chatService.incomingMessageHandler(sessionKey);
			await incomingMessageHandler(data);
			expect(mockLogger.error).toHaveBeenCalled();
		});
	});
	describe('pollAndProcessChatResponses', () => {
		it('should return if session does not exist', async () => {
			const sessionKey = 'nonexistent';
			const pollAndProcessChatResponses = chatService.pollAndProcessChatResponses(sessionKey);
			await pollAndProcessChatResponses();
			expect(mockExecutionManager.findExecution).not.toHaveBeenCalled();
		});
		it('should return if session is processing', async () => {
			const sessionKey = 'abc|123|public';
			chatService.sessions.set(sessionKey, { isProcessing: true });
			const pollAndProcessChatResponses = chatService.pollAndProcessChatResponses(sessionKey);
			await pollAndProcessChatResponses();
			expect(mockExecutionManager.findExecution).not.toHaveBeenCalled();
		});
		it('should return if execution does not exist', async () => {
			const sessionKey = 'abc|123|public';
			chatService.sessions.set(sessionKey, {
				isProcessing: false,
				executionId: '123',
				nodeWaitingForChatResponse: undefined,
			});
			mockExecutionManager.findExecution.mockResolvedValue(undefined);
			const pollAndProcessChatResponses = chatService.pollAndProcessChatResponses(sessionKey);
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
			chatService.sessions.set(sessionKey, session);
			mockExecutionManager.findExecution.mockResolvedValue({
				status: 'waiting',
				data: { resultData: { lastNodeExecuted: 'node2' } },
				workflowData: { nodes: [{ name: 'node1' }] },
			});
			const pollAndProcessChatResponses = chatService.pollAndProcessChatResponses(sessionKey);
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
			chatService.sessions.set(sessionKey, session);
			mockExecutionManager.findExecution.mockResolvedValue({
				status: 'waiting',
				data: {
					resultData: {
						lastNodeExecuted: 'node1',
						runData: { node1: [{ data: { main: [[{ sendMessage: 'test message' }]] } }] },
					},
				},
				workflowData: { nodes: [{ name: 'node1' }] },
			});
			chatService.shouldResumeImmediately = jest.fn().mockReturnValue(false);
			chatService.resumeExecution = jest.fn();
			const pollAndProcessChatResponses = chatService.pollAndProcessChatResponses(sessionKey);
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
			chatService.sessions.set(sessionKey, session);
			mockExecutionManager.findExecution.mockResolvedValue({
				status: 'success',
				data: { resultData: { lastNodeExecuted: 'node1' } },
				workflowData: { nodes: [{ type: 'n8n-core.respondToWebhook', name: 'node1' }] },
				mode: 'manual',
			});
			const pollAndProcessChatResponses = chatService.pollAndProcessChatResponses(sessionKey);
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
			chatService.sessions.set(sessionKey, session);
			mockExecutionManager.findExecution.mockRejectedValue(new Error('test error'));
			const pollAndProcessChatResponses = chatService.pollAndProcessChatResponses(sessionKey);
			await pollAndProcessChatResponses();
			expect(mockLogger.error).toHaveBeenCalled();
		});
	});
});
//# sourceMappingURL=chat-service.test.js.map
