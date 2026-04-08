import type { Logger } from '@n8n/backend-common';
import type { ExecutionsConfig } from '@n8n/config';
import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';

import type { ChatStreamStateService } from '@/modules/chat-hub/chat-stream-state.service';
import { ChatStreamService } from '@/modules/chat-hub/chat-stream.service';
import type { Push } from '@/push';
import type { Publisher } from '@/scaling/pubsub/publisher.service';

describe('ChatStreamService', () => {
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);

	const push = mock<Push>();
	const publisher = mock<Publisher>();
	const instanceSettings = mock<InstanceSettings>();
	const executionsConfig = mock<ExecutionsConfig>();
	const streamStore = mock<ChatStreamStateService>();

	let chatStreamService: ChatStreamService;

	beforeEach(() => {
		jest.clearAllMocks();

		Object.defineProperty(instanceSettings, 'isMultiMain', { value: false, configurable: true });
		executionsConfig.mode = 'regular';

		chatStreamService = new ChatStreamService(
			logger,
			push,
			publisher,
			instanceSettings,
			executionsConfig,
			streamStore,
		);
	});

	describe('startExecution', () => {
		it('should start execution in stream store and send push message', async () => {
			await chatStreamService.startExecution('user-123', 'session-456');

			expect(streamStore.startExecution).toHaveBeenCalledWith({
				sessionId: 'session-456',
				userId: 'user-123',
			});

			expect(push.sendToUsers).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'chatHubExecutionBegin',
					data: expect.objectContaining({
						sessionId: 'session-456',
						timestamp: expect.any(Number),
					}),
				}),
				['user-123'],
			);
		});

		it('should relay via pub/sub in multi-main mode', async () => {
			Object.defineProperty(instanceSettings, 'isMultiMain', { value: true, configurable: true });

			await chatStreamService.startExecution('user-123', 'session-456');

			expect(publisher.publishCommand).toHaveBeenCalledWith({
				command: 'relay-chat-stream-event',
				payload: expect.objectContaining({
					eventType: 'execution-begin',
					userId: 'user-123',
					sessionId: 'session-456',
				}),
			});
		});

		it('should relay via pub/sub in queue mode', async () => {
			executionsConfig.mode = 'queue';

			await chatStreamService.startExecution('user-123', 'session-456');

			expect(publisher.publishCommand).toHaveBeenCalled();
		});
	});

	describe('endExecution', () => {
		it('should end execution and send push message with status', async () => {
			await chatStreamService.endExecution('user-123', 'session-456', 'success');

			expect(push.sendToUsers).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'chatHubExecutionEnd',
					data: expect.objectContaining({
						sessionId: 'session-456',
						status: 'success',
						timestamp: expect.any(Number),
					}),
				}),
				['user-123'],
			);

			expect(streamStore.endExecution).toHaveBeenCalledWith('session-456');
		});

		it('should handle error status', async () => {
			await chatStreamService.endExecution('user-123', 'session-456', 'error');

			expect(push.sendToUsers).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'chatHubExecutionEnd',
					data: expect.objectContaining({
						status: 'error',
					}),
				}),
				['user-123'],
			);
		});

		it('should handle cancelled status', async () => {
			await chatStreamService.endExecution('user-123', 'session-456', 'cancelled');

			expect(push.sendToUsers).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'chatHubExecutionEnd',
					data: expect.objectContaining({
						status: 'cancelled',
					}),
				}),
				['user-123'],
			);
		});

		it('should relay via pub/sub in multi-main mode', async () => {
			Object.defineProperty(instanceSettings, 'isMultiMain', { value: true, configurable: true });

			await chatStreamService.endExecution('user-123', 'session-456', 'success');

			expect(publisher.publishCommand).toHaveBeenCalledWith({
				command: 'relay-chat-stream-event',
				payload: expect.objectContaining({
					eventType: 'execution-end',
					payload: { status: 'success' },
				}),
			});
		});
	});

	describe('startStream', () => {
		beforeEach(() => {
			streamStore.incrementSequence.mockResolvedValue(1);
		});

		it('should set current message and send stream begin', async () => {
			await chatStreamService.startStream({
				userId: 'user-123',
				sessionId: 'session-456',
				messageId: 'message-789',
				previousMessageId: 'prev-message',
				retryOfMessageId: null,
				executionId: 42,
			});

			expect(streamStore.setCurrentMessage).toHaveBeenCalledWith('session-456', 'message-789');

			expect(push.sendToUsers).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'chatHubStreamBegin',
					data: expect.objectContaining({
						sessionId: 'session-456',
						messageId: 'message-789',
						sequenceNumber: 1,
						previousMessageId: 'prev-message',
						retryOfMessageId: null,
						executionId: 42,
					}),
				}),
				['user-123'],
			);
		});

		it('should handle retry message', async () => {
			await chatStreamService.startStream({
				userId: 'user-123',
				sessionId: 'session-456',
				messageId: 'message-789',
				previousMessageId: 'prev-message',
				retryOfMessageId: 'retry-of-123',
				executionId: null,
			});

			expect(push.sendToUsers).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'chatHubStreamBegin',
					data: expect.objectContaining({
						retryOfMessageId: 'retry-of-123',
					}),
				}),
				['user-123'],
			);
		});
	});

	describe('sendChunk', () => {
		it('should buffer chunk and send push message', async () => {
			streamStore.getStreamState.mockResolvedValue({
				sessionId: 'session-456',
				messageId: 'message-789',
				userId: 'user-123',
				sequenceNumber: 5,
				startedAt: Date.now(),
			});
			streamStore.incrementSequence.mockResolvedValue(6);

			await chatStreamService.sendChunk('session-456', 'message-789', 'Hello ');

			expect(streamStore.bufferChunk).toHaveBeenCalledWith('session-456', {
				sequenceNumber: 6,
				content: 'Hello ',
			});

			expect(push.sendToUsers).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'chatHubStreamChunk',
					data: expect.objectContaining({
						sessionId: 'session-456',
						messageId: 'message-789',
						sequenceNumber: 6,
						content: 'Hello ',
					}),
				}),
				['user-123'],
			);
		});

		it('should do nothing if no active execution', async () => {
			streamStore.getStreamState.mockResolvedValue(null);

			await chatStreamService.sendChunk('session-456', 'message-789', 'Hello');

			expect(streamStore.bufferChunk).not.toHaveBeenCalled();
			expect(push.sendToUsers).not.toHaveBeenCalled();
		});
	});

	describe('endStream', () => {
		it('should send stream end with status', async () => {
			streamStore.getStreamState.mockResolvedValue({
				sessionId: 'session-456',
				messageId: 'message-789',
				userId: 'user-123',
				sequenceNumber: 10,
				startedAt: Date.now(),
			});
			streamStore.incrementSequence.mockResolvedValue(11);

			await chatStreamService.endStream('session-456', 'message-789', 'success');

			expect(push.sendToUsers).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'chatHubStreamEnd',
					data: expect.objectContaining({
						sessionId: 'session-456',
						messageId: 'message-789',
						status: 'success',
						sequenceNumber: 11,
					}),
				}),
				['user-123'],
			);
		});

		it('should do nothing if no active execution', async () => {
			streamStore.getStreamState.mockResolvedValue(null);

			await chatStreamService.endStream('session-456', 'message-789', 'success');

			expect(push.sendToUsers).not.toHaveBeenCalled();
		});
	});

	describe('sendError', () => {
		it('should send error message', async () => {
			streamStore.getStreamState.mockResolvedValue({
				sessionId: 'session-456',
				messageId: 'message-789',
				userId: 'user-123',
				sequenceNumber: 5,
				startedAt: Date.now(),
			});
			streamStore.incrementSequence.mockResolvedValue(6);

			await chatStreamService.sendError('session-456', 'message-789', 'Something went wrong');

			expect(push.sendToUsers).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'chatHubStreamError',
					data: expect.objectContaining({
						sessionId: 'session-456',
						messageId: 'message-789',
						error: 'Something went wrong',
					}),
				}),
				['user-123'],
			);
		});

		it('should do nothing if no active execution', async () => {
			streamStore.getStreamState.mockResolvedValue(null);

			await chatStreamService.sendError('session-456', 'message-789', 'Error');

			expect(push.sendToUsers).not.toHaveBeenCalled();
		});
	});

	describe('sendErrorDirect', () => {
		it('should send error without requiring stream state', async () => {
			await chatStreamService.sendErrorDirect(
				'user-123',
				'session-456',
				'message-789',
				'Pre-stream error',
			);

			expect(push.sendToUsers).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'chatHubStreamError',
					data: expect.objectContaining({
						sessionId: 'session-456',
						messageId: 'message-789',
						sequenceNumber: 0,
						error: 'Pre-stream error',
					}),
				}),
				['user-123'],
			);
		});

		it('should relay via pub/sub in multi-main mode', async () => {
			Object.defineProperty(instanceSettings, 'isMultiMain', { value: true, configurable: true });

			await chatStreamService.sendErrorDirect(
				'user-123',
				'session-456',
				'message-789',
				'Error message',
			);

			expect(publisher.publishCommand).toHaveBeenCalledWith({
				command: 'relay-chat-stream-event',
				payload: expect.objectContaining({
					eventType: 'error',
					payload: { error: 'Error message' },
				}),
			});
		});
	});

	describe('getPendingChunks', () => {
		it('should return chunks from stream store', async () => {
			const mockChunks = [
				{ sequenceNumber: 6, content: 'chunk1' },
				{ sequenceNumber: 7, content: 'chunk2' },
			];
			streamStore.getChunksAfter.mockResolvedValue(mockChunks);

			const result = await chatStreamService.getPendingChunks('session-456', 5);

			expect(streamStore.getChunksAfter).toHaveBeenCalledWith('session-456', 5);
			expect(result).toEqual(mockChunks);
		});
	});

	describe('hasActiveStream', () => {
		it('should return true when stream state exists', async () => {
			streamStore.getStreamState.mockResolvedValue({
				sessionId: 'session-456',
				messageId: 'message-789',
				userId: 'user-123',
				sequenceNumber: 0,
				startedAt: Date.now(),
			});

			const result = await chatStreamService.hasActiveStream('session-456');

			expect(result).toBe(true);
		});

		it('should return false when no stream state', async () => {
			streamStore.getStreamState.mockResolvedValue(null);

			const result = await chatStreamService.hasActiveStream('session-456');

			expect(result).toBe(false);
		});
	});

	describe('getCurrentMessageId', () => {
		it('should return message ID from stream state', async () => {
			streamStore.getStreamState.mockResolvedValue({
				sessionId: 'session-456',
				messageId: 'message-789',
				userId: 'user-123',
				sequenceNumber: 0,
				startedAt: Date.now(),
			});

			const result = await chatStreamService.getCurrentMessageId('session-456');

			expect(result).toBe('message-789');
		});

		it('should return null when no stream state', async () => {
			streamStore.getStreamState.mockResolvedValue(null);

			const result = await chatStreamService.getCurrentMessageId('session-456');

			expect(result).toBeNull();
		});
	});

	describe('sendHumanMessage', () => {
		it('should send human message created event', async () => {
			await chatStreamService.sendHumanMessage({
				userId: 'user-123',
				sessionId: 'session-456',
				messageId: 'human-msg-1',
				previousMessageId: null,
				content: 'Hello AI',
				attachments: [{ id: 'att-1', fileName: 'file.txt', mimeType: 'text/plain' }],
			});

			expect(push.sendToUsers).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'chatHubHumanMessageCreated',
					data: expect.objectContaining({
						sessionId: 'session-456',
						messageId: 'human-msg-1',
						previousMessageId: null,
						content: 'Hello AI',
						attachments: [{ id: 'att-1', fileName: 'file.txt', mimeType: 'text/plain' }],
						timestamp: expect.any(Number),
					}),
				}),
				['user-123'],
			);
		});

		it('should relay via pub/sub in multi-main mode', async () => {
			Object.defineProperty(instanceSettings, 'isMultiMain', { value: true, configurable: true });

			await chatStreamService.sendHumanMessage({
				userId: 'user-123',
				sessionId: 'session-456',
				messageId: 'human-msg-1',
				previousMessageId: 'prev-1',
				content: 'Hello AI',
				attachments: [],
			});

			expect(publisher.publishCommand).toHaveBeenCalledWith({
				command: 'relay-chat-human-message',
				payload: expect.objectContaining({
					userId: 'user-123',
					sessionId: 'session-456',
					messageId: 'human-msg-1',
					previousMessageId: 'prev-1',
					content: 'Hello AI',
				}),
			});
		});
	});

	describe('sendMessageEdit', () => {
		it('should send message edited event', async () => {
			await chatStreamService.sendMessageEdit({
				userId: 'user-123',
				sessionId: 'session-456',
				revisionOfMessageId: 'original-msg',
				messageId: 'edited-msg-1',
				content: 'Edited content',
				attachments: [],
			});

			expect(push.sendToUsers).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'chatHubMessageEdited',
					data: expect.objectContaining({
						sessionId: 'session-456',
						revisionOfMessageId: 'original-msg',
						messageId: 'edited-msg-1',
						content: 'Edited content',
						attachments: [],
						timestamp: expect.any(Number),
					}),
				}),
				['user-123'],
			);
		});

		it('should relay via pub/sub in multi-main mode', async () => {
			Object.defineProperty(instanceSettings, 'isMultiMain', { value: true, configurable: true });

			await chatStreamService.sendMessageEdit({
				userId: 'user-123',
				sessionId: 'session-456',
				revisionOfMessageId: 'original-msg',
				messageId: 'edited-msg-1',
				content: 'Edited',
				attachments: [],
			});

			expect(publisher.publishCommand).toHaveBeenCalledWith({
				command: 'relay-chat-message-edit',
				payload: expect.objectContaining({
					revisionOfMessageId: 'original-msg',
					messageId: 'edited-msg-1',
				}),
			});
		});
	});

	describe('handleRelayChatStreamEvent', () => {
		it('should handle execution-begin relay', () => {
			chatStreamService.handleRelayChatStreamEvent({
				eventType: 'execution-begin',
				userId: 'user-123',
				sessionId: 'session-456',
				messageId: '',
				sequenceNumber: 0,
				payload: {},
			});

			expect(push.sendToUsers).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'chatHubExecutionBegin',
					data: expect.objectContaining({
						sessionId: 'session-456',
					}),
				}),
				['user-123'],
			);
		});

		it('should handle execution-end relay', () => {
			chatStreamService.handleRelayChatStreamEvent({
				eventType: 'execution-end',
				userId: 'user-123',
				sessionId: 'session-456',
				messageId: '',
				sequenceNumber: 0,
				payload: { status: 'error' },
			});

			expect(push.sendToUsers).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'chatHubExecutionEnd',
					data: expect.objectContaining({
						status: 'error',
					}),
				}),
				['user-123'],
			);
		});

		it('should handle begin relay', () => {
			chatStreamService.handleRelayChatStreamEvent({
				eventType: 'begin',
				userId: 'user-123',
				sessionId: 'session-456',
				messageId: 'message-789',
				sequenceNumber: 1,
				payload: {
					previousMessageId: 'prev-1',
					retryOfMessageId: null,
					executionId: 42,
				},
			});

			expect(push.sendToUsers).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'chatHubStreamBegin',
					data: expect.objectContaining({
						messageId: 'message-789',
						previousMessageId: 'prev-1',
						executionId: 42,
					}),
				}),
				['user-123'],
			);
		});

		it('should handle chunk relay', () => {
			chatStreamService.handleRelayChatStreamEvent({
				eventType: 'chunk',
				userId: 'user-123',
				sessionId: 'session-456',
				messageId: 'message-789',
				sequenceNumber: 5,
				payload: { content: 'Hello world' },
			});

			expect(push.sendToUsers).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'chatHubStreamChunk',
					data: expect.objectContaining({
						content: 'Hello world',
						sequenceNumber: 5,
					}),
				}),
				['user-123'],
			);
		});

		it('should handle end relay', () => {
			chatStreamService.handleRelayChatStreamEvent({
				eventType: 'end',
				userId: 'user-123',
				sessionId: 'session-456',
				messageId: 'message-789',
				sequenceNumber: 10,
				payload: { status: 'success' },
			});

			expect(push.sendToUsers).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'chatHubStreamEnd',
					data: expect.objectContaining({
						status: 'success',
					}),
				}),
				['user-123'],
			);
		});

		it('should handle error relay', () => {
			chatStreamService.handleRelayChatStreamEvent({
				eventType: 'error',
				userId: 'user-123',
				sessionId: 'session-456',
				messageId: 'message-789',
				sequenceNumber: 5,
				payload: { error: 'Something went wrong' },
			});

			expect(push.sendToUsers).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'chatHubStreamError',
					data: expect.objectContaining({
						error: 'Something went wrong',
					}),
				}),
				['user-123'],
			);
		});
	});

	describe('handleRelayChatHumanMessage', () => {
		it('should forward human message to push', () => {
			chatStreamService.handleRelayChatHumanMessage({
				userId: 'user-123',
				sessionId: 'session-456',
				messageId: 'human-1',
				previousMessageId: null,
				content: 'Hello',
				attachments: [],
			});

			expect(push.sendToUsers).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'chatHubHumanMessageCreated',
					data: expect.objectContaining({
						messageId: 'human-1',
						content: 'Hello',
					}),
				}),
				['user-123'],
			);
		});
	});

	describe('handleRelayChatMessageEdit', () => {
		it('should forward message edit to push', () => {
			chatStreamService.handleRelayChatMessageEdit({
				userId: 'user-123',
				sessionId: 'session-456',
				revisionOfMessageId: 'original-1',
				messageId: 'edited-1',
				content: 'Edited content',
				attachments: [],
			});

			expect(push.sendToUsers).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'chatHubMessageEdited',
					data: expect.objectContaining({
						revisionOfMessageId: 'original-1',
						messageId: 'edited-1',
						content: 'Edited content',
					}),
				}),
				['user-123'],
			);
		});
	});
});
