import type { Logger } from '@n8n/backend-common';
import type { ChatHubConfig, ExecutionsConfig, GlobalConfig } from '@n8n/config';
import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';

import { ChatStreamStateService } from '@/modules/chat-hub/chat-stream-state.service';
import type { RedisClientService } from '@/services/redis-client.service';

describe('ChatStreamStateService', () => {
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);

	const instanceSettings = mock<InstanceSettings>();
	const executionsConfig = mock<ExecutionsConfig>();
	const globalConfig = mock<GlobalConfig>();
	const chatHubConfig = mock<ChatHubConfig>();
	const redisClientService = mock<RedisClientService>();

	beforeEach(() => {
		jest.clearAllMocks();
		jest.useFakeTimers();

		Object.defineProperty(instanceSettings, 'isMultiMain', { value: false, configurable: true });
		executionsConfig.mode = 'regular';
		globalConfig.redis = { prefix: 'n8n' } as GlobalConfig['redis'];
		chatHubConfig.streamStateTtl = 300;
		chatHubConfig.maxBufferedChunks = 1000;
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	describe('in-memory mode (single-main)', () => {
		let service: ChatStreamStateService;

		beforeEach(() => {
			service = new ChatStreamStateService(
				logger,
				instanceSettings,
				executionsConfig,
				globalConfig,
				chatHubConfig,
				redisClientService,
			);
		});

		afterEach(() => {
			service.shutdown();
		});

		describe('startExecution', () => {
			it('should create initial stream state', async () => {
				await service.startExecution({ sessionId: 'session-1', userId: 'user-1' });

				const state = await service.getStreamState('session-1');
				expect(state).toEqual({
					sessionId: 'session-1',
					messageId: '',
					userId: 'user-1',
					sequenceNumber: 0,
					startedAt: expect.any(Number),
				});
			});

			it('should initialize empty chunk buffer', async () => {
				await service.startExecution({ sessionId: 'session-1', userId: 'user-1' });

				const chunks = await service.getChunksAfter('session-1', 0);
				expect(chunks).toEqual([]);
			});
		});

		describe('endExecution', () => {
			it('should remove stream state', async () => {
				await service.startExecution({ sessionId: 'session-1', userId: 'user-1' });
				await service.endExecution('session-1');

				const state = await service.getStreamState('session-1');
				expect(state).toBeNull();
			});

			it('should clear chunk buffer', async () => {
				await service.startExecution({ sessionId: 'session-1', userId: 'user-1' });
				await service.bufferChunk('session-1', { sequenceNumber: 1, content: 'test' });
				await service.endExecution('session-1');

				const chunks = await service.getChunksAfter('session-1', 0);
				expect(chunks).toEqual([]);
			});
		});

		describe('setCurrentMessage', () => {
			it('should update message ID in state', async () => {
				await service.startExecution({ sessionId: 'session-1', userId: 'user-1' });
				await service.setCurrentMessage('session-1', 'message-123');

				const state = await service.getStreamState('session-1');
				expect(state?.messageId).toBe('message-123');
			});

			it('should do nothing if session does not exist', async () => {
				await service.setCurrentMessage('nonexistent', 'message-123');

				const state = await service.getStreamState('nonexistent');
				expect(state).toBeNull();
			});
		});

		describe('startStream', () => {
			it('should create stream state with message ID', async () => {
				await service.startStream({
					sessionId: 'session-1',
					messageId: 'message-1',
					userId: 'user-1',
				});

				const state = await service.getStreamState('session-1');
				expect(state).toEqual({
					sessionId: 'session-1',
					messageId: 'message-1',
					userId: 'user-1',
					sequenceNumber: 0,
					startedAt: expect.any(Number),
				});
			});
		});

		describe('getStreamState', () => {
			it('should return null for nonexistent session', async () => {
				const state = await service.getStreamState('nonexistent');
				expect(state).toBeNull();
			});

			it('should return state for existing session', async () => {
				await service.startExecution({ sessionId: 'session-1', userId: 'user-1' });

				const state = await service.getStreamState('session-1');
				expect(state).not.toBeNull();
				expect(state?.sessionId).toBe('session-1');
			});
		});

		describe('incrementSequence', () => {
			it('should increment and return sequence number', async () => {
				await service.startExecution({ sessionId: 'session-1', userId: 'user-1' });

				const seq1 = await service.incrementSequence('session-1');
				const seq2 = await service.incrementSequence('session-1');
				const seq3 = await service.incrementSequence('session-1');

				expect(seq1).toBe(1);
				expect(seq2).toBe(2);
				expect(seq3).toBe(3);
			});

			it('should return 0 for nonexistent session', async () => {
				const seq = await service.incrementSequence('nonexistent');
				expect(seq).toBe(0);
			});

			it('should persist sequence number in state', async () => {
				await service.startExecution({ sessionId: 'session-1', userId: 'user-1' });
				await service.incrementSequence('session-1');
				await service.incrementSequence('session-1');

				const state = await service.getStreamState('session-1');
				expect(state?.sequenceNumber).toBe(2);
			});
		});

		describe('bufferChunk', () => {
			it('should buffer chunks', async () => {
				await service.startExecution({ sessionId: 'session-1', userId: 'user-1' });

				await service.bufferChunk('session-1', { sequenceNumber: 1, content: 'Hello ' });
				await service.bufferChunk('session-1', { sequenceNumber: 2, content: 'World' });

				const chunks = await service.getChunksAfter('session-1', 0);
				expect(chunks).toEqual([
					{ sequenceNumber: 1, content: 'Hello ' },
					{ sequenceNumber: 2, content: 'World' },
				]);
			});

			it('should create buffer if it does not exist', async () => {
				// Don't call startExecution, just buffer directly
				await service.bufferChunk('session-1', { sequenceNumber: 1, content: 'test' });

				const chunks = await service.getChunksAfter('session-1', 0);
				expect(chunks).toEqual([{ sequenceNumber: 1, content: 'test' }]);
			});

			it('should limit buffer size to MAX_BUFFERED_CHUNKS chunks', async () => {
				await service.startExecution({ sessionId: 'session-1', userId: 'user-1' });

				// Add 1005 chunks (MAX_BUFFERED_CHUNKS + 5)
				for (let i = 1; i <= 1005; i++) {
					await service.bufferChunk('session-1', { sequenceNumber: i, content: `chunk-${i}` });
				}

				const chunks = await service.getChunksAfter('session-1', 0);
				expect(chunks.length).toBe(1000);
				// Should have removed the first 5 chunks
				expect(chunks[0].sequenceNumber).toBe(6);
				expect(chunks[999].sequenceNumber).toBe(1005);
			});
		});

		describe('getChunksAfter', () => {
			it('should return chunks after specified sequence number', async () => {
				await service.startExecution({ sessionId: 'session-1', userId: 'user-1' });

				await service.bufferChunk('session-1', { sequenceNumber: 1, content: 'a' });
				await service.bufferChunk('session-1', { sequenceNumber: 2, content: 'b' });
				await service.bufferChunk('session-1', { sequenceNumber: 3, content: 'c' });
				await service.bufferChunk('session-1', { sequenceNumber: 4, content: 'd' });

				const chunks = await service.getChunksAfter('session-1', 2);
				expect(chunks).toEqual([
					{ sequenceNumber: 3, content: 'c' },
					{ sequenceNumber: 4, content: 'd' },
				]);
			});

			it('should return empty array for nonexistent session', async () => {
				const chunks = await service.getChunksAfter('nonexistent', 0);
				expect(chunks).toEqual([]);
			});

			it('should return empty array if all chunks are before sequence', async () => {
				await service.startExecution({ sessionId: 'session-1', userId: 'user-1' });
				await service.bufferChunk('session-1', { sequenceNumber: 1, content: 'a' });
				await service.bufferChunk('session-1', { sequenceNumber: 2, content: 'b' });

				const chunks = await service.getChunksAfter('session-1', 10);
				expect(chunks).toEqual([]);
			});
		});

		describe('endStream', () => {
			it('should remove stream state', async () => {
				await service.startStream({
					sessionId: 'session-1',
					messageId: 'message-1',
					userId: 'user-1',
				});
				await service.endStream('session-1');

				const state = await service.getStreamState('session-1');
				expect(state).toBeNull();
			});

			it('should clear chunk buffer', async () => {
				await service.startStream({
					sessionId: 'session-1',
					messageId: 'message-1',
					userId: 'user-1',
				});
				await service.bufferChunk('session-1', { sequenceNumber: 1, content: 'test' });
				await service.endStream('session-1');

				const chunks = await service.getChunksAfter('session-1', 0);
				expect(chunks).toEqual([]);
			});
		});

		describe('cleanup timer', () => {
			it('should auto-cleanup after TTL expires', async () => {
				await service.startExecution({ sessionId: 'session-1', userId: 'user-1' });

				// Fast-forward 5 minutes (STREAM_STATE_TTL)
				jest.advanceTimersByTime(5 * 60 * 1000);

				const state = await service.getStreamState('session-1');
				expect(state).toBeNull();
			});

			it('should cancel cleanup timer when stream ends', async () => {
				await service.startExecution({ sessionId: 'session-1', userId: 'user-1' });
				await service.endExecution('session-1');

				// Fast-forward - should not throw or cause issues
				jest.advanceTimersByTime(5 * 60 * 1000);

				const state = await service.getStreamState('session-1');
				expect(state).toBeNull();
			});

			it('should reschedule cleanup when starting new execution for same session', async () => {
				await service.startExecution({ sessionId: 'session-1', userId: 'user-1' });

				// Fast-forward 3 minutes
				jest.advanceTimersByTime(3 * 60 * 1000);

				// Start new execution - should reset timer
				await service.startExecution({ sessionId: 'session-1', userId: 'user-2' });

				// Fast-forward another 3 minutes (total 6 minutes from first start)
				jest.advanceTimersByTime(3 * 60 * 1000);

				// Should still exist because timer was reset
				const state = await service.getStreamState('session-1');
				expect(state).not.toBeNull();

				// Fast-forward another 2 minutes (5 minutes from second start)
				jest.advanceTimersByTime(2 * 60 * 1000);

				// Now should be cleaned up
				const stateAfter = await service.getStreamState('session-1');
				expect(stateAfter).toBeNull();
			});
		});

		describe('shutdown', () => {
			it('should clear all state', async () => {
				await service.startExecution({ sessionId: 'session-1', userId: 'user-1' });
				await service.startExecution({ sessionId: 'session-2', userId: 'user-2' });
				await service.bufferChunk('session-1', { sequenceNumber: 1, content: 'test' });

				service.shutdown();

				const state1 = await service.getStreamState('session-1');
				const state2 = await service.getStreamState('session-2');
				const chunks = await service.getChunksAfter('session-1', 0);

				expect(state1).toBeNull();
				expect(state2).toBeNull();
				expect(chunks).toEqual([]);
			});

			it('should clear cleanup timers', async () => {
				await service.startExecution({ sessionId: 'session-1', userId: 'user-1' });

				service.shutdown();

				// Fast-forward - cleanup should not run (timer was cleared)
				// This mainly tests that we don't get errors from orphaned timers
				jest.advanceTimersByTime(10 * 60 * 1000);
			});
		});
	});

	describe('Redis mode (multi-main)', () => {
		const mockRedisClient = {
			get: jest.fn(),
			set: jest.fn(),
			del: jest.fn(),
			disconnect: jest.fn(),
		};

		beforeEach(() => {
			Object.defineProperty(instanceSettings, 'isMultiMain', { value: true, configurable: true });
			redisClientService.createClient.mockReturnValue(mockRedisClient as any);
		});

		afterEach(() => {
			jest.clearAllMocks();
		});

		it('should create Redis client in multi-main mode', () => {
			const service = new ChatStreamStateService(
				logger,
				instanceSettings,
				executionsConfig,
				globalConfig,
				chatHubConfig,
				redisClientService,
			);

			expect(redisClientService.createClient).toHaveBeenCalledWith({ type: 'subscriber(n8n)' });

			service.shutdown();
		});

		it('should create Redis client in queue mode', () => {
			Object.defineProperty(instanceSettings, 'isMultiMain', { value: false, configurable: true });
			executionsConfig.mode = 'queue';

			const service = new ChatStreamStateService(
				logger,
				instanceSettings,
				executionsConfig,
				globalConfig,
				chatHubConfig,
				redisClientService,
			);

			expect(redisClientService.createClient).toHaveBeenCalled();

			service.shutdown();
		});

		describe('startExecution', () => {
			it('should store state in Redis', async () => {
				const service = new ChatStreamStateService(
					logger,
					instanceSettings,
					executionsConfig,
					globalConfig,
					chatHubConfig,
					redisClientService,
				);

				await service.startExecution({ sessionId: 'session-1', userId: 'user-1' });

				expect(mockRedisClient.set).toHaveBeenCalledWith(
					'n8n:chat-hub:stream:state:session-1',
					expect.stringContaining('"sessionId":"session-1"'),
					'EX',
					300,
				);

				expect(mockRedisClient.set).toHaveBeenCalledWith(
					'n8n:chat-hub:stream:chunks:session-1',
					'[]',
					'EX',
					300,
				);

				service.shutdown();
			});
		});

		describe('endExecution', () => {
			it('should delete state from Redis', async () => {
				const service = new ChatStreamStateService(
					logger,
					instanceSettings,
					executionsConfig,
					globalConfig,
					chatHubConfig,
					redisClientService,
				);

				await service.endExecution('session-1');

				expect(mockRedisClient.del).toHaveBeenCalledWith('n8n:chat-hub:stream:state:session-1');
				expect(mockRedisClient.del).toHaveBeenCalledWith('n8n:chat-hub:stream:chunks:session-1');

				service.shutdown();
			});
		});

		describe('getStreamState', () => {
			it('should retrieve state from Redis', async () => {
				const mockState = {
					sessionId: 'session-1',
					messageId: 'message-1',
					userId: 'user-1',
					sequenceNumber: 5,
					startedAt: Date.now(),
				};
				mockRedisClient.get.mockResolvedValue(JSON.stringify(mockState));

				const service = new ChatStreamStateService(
					logger,
					instanceSettings,
					executionsConfig,
					globalConfig,
					chatHubConfig,
					redisClientService,
				);

				const state = await service.getStreamState('session-1');

				expect(mockRedisClient.get).toHaveBeenCalledWith('n8n:chat-hub:stream:state:session-1');
				expect(state).toEqual(mockState);

				service.shutdown();
			});

			it('should return null if not found in Redis', async () => {
				mockRedisClient.get.mockResolvedValue(null);

				const service = new ChatStreamStateService(
					logger,
					instanceSettings,
					executionsConfig,
					globalConfig,
					chatHubConfig,
					redisClientService,
				);

				const state = await service.getStreamState('session-1');
				expect(state).toBeNull();

				service.shutdown();
			});

			it('should return null and log error on Redis failure', async () => {
				mockRedisClient.get.mockRejectedValue(new Error('Redis error'));

				const service = new ChatStreamStateService(
					logger,
					instanceSettings,
					executionsConfig,
					globalConfig,
					chatHubConfig,
					redisClientService,
				);

				const state = await service.getStreamState('session-1');

				expect(state).toBeNull();
				expect(logger.warn).toHaveBeenCalledWith(
					'Failed to get Redis state for session session-1',
					expect.any(Object),
				);

				service.shutdown();
			});
		});

		describe('incrementSequence', () => {
			it('should increment sequence in Redis', async () => {
				const mockState = {
					sessionId: 'session-1',
					messageId: 'message-1',
					userId: 'user-1',
					sequenceNumber: 5,
					startedAt: Date.now(),
				};
				mockRedisClient.get.mockResolvedValue(JSON.stringify(mockState));

				const service = new ChatStreamStateService(
					logger,
					instanceSettings,
					executionsConfig,
					globalConfig,
					chatHubConfig,
					redisClientService,
				);

				const seq = await service.incrementSequence('session-1');

				expect(seq).toBe(6);
				expect(mockRedisClient.set).toHaveBeenCalledWith(
					'n8n:chat-hub:stream:state:session-1',
					expect.stringContaining('"sequenceNumber":6'),
					'EX',
					300,
				);

				service.shutdown();
			});

			it('should return 0 if state not found', async () => {
				mockRedisClient.get.mockResolvedValue(null);

				const service = new ChatStreamStateService(
					logger,
					instanceSettings,
					executionsConfig,
					globalConfig,
					chatHubConfig,
					redisClientService,
				);

				const seq = await service.incrementSequence('session-1');
				expect(seq).toBe(0);

				service.shutdown();
			});
		});

		describe('bufferChunk', () => {
			it('should append chunk to Redis buffer', async () => {
				mockRedisClient.get.mockResolvedValue(
					JSON.stringify([{ sequenceNumber: 1, content: 'a' }]),
				);

				const service = new ChatStreamStateService(
					logger,
					instanceSettings,
					executionsConfig,
					globalConfig,
					chatHubConfig,
					redisClientService,
				);

				await service.bufferChunk('session-1', { sequenceNumber: 2, content: 'b' });

				expect(mockRedisClient.set).toHaveBeenCalledWith(
					'n8n:chat-hub:stream:chunks:session-1',
					JSON.stringify([
						{ sequenceNumber: 1, content: 'a' },
						{ sequenceNumber: 2, content: 'b' },
					]),
					'EX',
					300,
				);

				service.shutdown();
			});

			it('should limit buffer to 1000 chunks in Redis', async () => {
				const existingChunks = Array.from({ length: 1000 }, (_, i) => ({
					sequenceNumber: i + 1,
					content: `chunk-${i + 1}`,
				}));
				mockRedisClient.get.mockResolvedValue(JSON.stringify(existingChunks));

				const service = new ChatStreamStateService(
					logger,
					instanceSettings,
					executionsConfig,
					globalConfig,
					chatHubConfig,
					redisClientService,
				);

				await service.bufferChunk('session-1', { sequenceNumber: 1001, content: 'new' });

				const setCall = mockRedisClient.set.mock.calls.find(
					(call) => call[0] === 'n8n:chat-hub:stream:chunks:session-1',
				);
				const savedChunks = JSON.parse(setCall![1]);
				expect(savedChunks.length).toBe(1000);
				expect(savedChunks[0].sequenceNumber).toBe(2);
				expect(savedChunks[999].sequenceNumber).toBe(1001);

				service.shutdown();
			});
		});

		describe('getChunksAfter', () => {
			it('should filter chunks from Redis', async () => {
				mockRedisClient.get.mockResolvedValue(
					JSON.stringify([
						{ sequenceNumber: 1, content: 'a' },
						{ sequenceNumber: 2, content: 'b' },
						{ sequenceNumber: 3, content: 'c' },
					]),
				);

				const service = new ChatStreamStateService(
					logger,
					instanceSettings,
					executionsConfig,
					globalConfig,
					chatHubConfig,
					redisClientService,
				);

				const chunks = await service.getChunksAfter('session-1', 1);

				expect(chunks).toEqual([
					{ sequenceNumber: 2, content: 'b' },
					{ sequenceNumber: 3, content: 'c' },
				]);

				service.shutdown();
			});
		});

		describe('shutdown', () => {
			it('should disconnect Redis client', () => {
				const service = new ChatStreamStateService(
					logger,
					instanceSettings,
					executionsConfig,
					globalConfig,
					chatHubConfig,
					redisClientService,
				);

				service.shutdown();

				expect(mockRedisClient.disconnect).toHaveBeenCalled();
			});
		});
	});
});
