import type { Logger } from '@n8n/backend-common';
import type { ChatHubConfig, ExecutionsConfig, GlobalConfig } from '@n8n/config';
import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';

import {
	ChatHubExecutionStore,
	type ChatHubExecutionContext,
} from '@/modules/chat-hub/chat-hub-execution-store.service';
import type { RedisClientService } from '@/services/redis-client.service';

const EXECUTION_ID = '12345678';
const SESSION_ID = 'bbbbbbbb-2222-4000-8000-000000000002';
const USER_ID = 'cccccccc-3333-4000-8000-000000000003';
const MESSAGE_ID = 'dddddddd-4444-4000-8000-000000000004';
const PREV_MESSAGE_ID = 'eeeeeeee-5555-4000-8000-000000000005';
const WORKFLOW_ID = '3qXqnkHzVukVR9Jq';

const createContext = (overrides?: Partial<ChatHubExecutionContext>): ChatHubExecutionContext => ({
	executionId: EXECUTION_ID,
	sessionId: SESSION_ID,
	userId: USER_ID,
	messageId: MESSAGE_ID,
	previousMessageId: PREV_MESSAGE_ID,
	model: { provider: 'n8n', workflowId: WORKFLOW_ID },
	responseMode: 'lastNode',
	awaitingResume: false,
	createMessageOnResume: false,
	...overrides,
});

describe('ChatHubExecutionStore', () => {
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
		chatHubConfig.executionContextTtl = 3600;
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	describe('in-memory mode (single-main)', () => {
		let store: ChatHubExecutionStore;

		beforeEach(() => {
			store = new ChatHubExecutionStore(
				logger,
				instanceSettings,
				executionsConfig,
				globalConfig,
				chatHubConfig,
				redisClientService,
			);
		});

		afterEach(() => {
			store.shutdown();
		});

		describe('register', () => {
			it('should store execution context', async () => {
				const context = createContext();

				await store.register(context);

				const retrieved = await store.get(EXECUTION_ID);
				expect(retrieved).toEqual(context);
			});

			it('should schedule cleanup timer', async () => {
				const context = createContext();

				await store.register(context);

				// Fast-forward 1 hour (N8N_CHAT_HUB_EXECUTION_CONTEXT_TTL)
				jest.advanceTimersByTime(60 * 60 * 1000);

				const retrieved = await store.get(EXECUTION_ID);
				expect(retrieved).toBeNull();
			});
		});

		describe('get', () => {
			it('should return null for non-existent execution', async () => {
				const result = await store.get('non-existent');
				expect(result).toBeNull();
			});

			it('should return stored context', async () => {
				const context = createContext();
				await store.register(context);

				const result = await store.get(EXECUTION_ID);
				expect(result).toEqual(context);
			});
		});

		describe('update', () => {
			it('should update existing context', async () => {
				const context = createContext();
				await store.register(context);

				await store.update(EXECUTION_ID, { awaitingResume: true, messageId: 'new-message-id' });

				const updated = await store.get(EXECUTION_ID);
				expect(updated?.awaitingResume).toBe(true);
				expect(updated?.messageId).toBe('new-message-id');
				// Original fields should be preserved
				expect(updated?.sessionId).toBe(SESSION_ID);
				expect(updated?.userId).toBe(USER_ID);
			});

			it('should log warning and do nothing for non-existent execution', async () => {
				await store.update('non-existent', { awaitingResume: true });

				expect(logger.warn).toHaveBeenCalledWith(
					'Attempted to update non-existent execution context: non-existent',
				);
			});

			it('should reset cleanup timer on update', async () => {
				const context = createContext();
				await store.register(context);

				// Fast-forward 30 minutes
				jest.advanceTimersByTime(30 * 60 * 1000);

				// Update should reset the timer
				await store.update(EXECUTION_ID, { awaitingResume: true });

				// Fast-forward another 30 minutes (total 60 minutes from start)
				jest.advanceTimersByTime(30 * 60 * 1000);

				// Should still exist because timer was reset
				const retrieved = await store.get(EXECUTION_ID);
				expect(retrieved).not.toBeNull();

				// Fast-forward another 30 minutes (60 minutes from update)
				jest.advanceTimersByTime(30 * 60 * 1000);

				// Now should be cleaned up
				const afterCleanup = await store.get(EXECUTION_ID);
				expect(afterCleanup).toBeNull();
			});
		});

		describe('remove', () => {
			it('should remove execution context', async () => {
				const context = createContext();
				await store.register(context);

				await store.remove(EXECUTION_ID);

				const result = await store.get(EXECUTION_ID);
				expect(result).toBeNull();
			});

			it('should cancel cleanup timer', async () => {
				const context = createContext();
				await store.register(context);

				await store.remove(EXECUTION_ID);

				// Fast-forward past TTL - should not cause issues
				jest.advanceTimersByTime(2 * 60 * 60 * 1000);

				// Should still be null (not error from orphaned timer)
				const result = await store.get(EXECUTION_ID);
				expect(result).toBeNull();
			});

			it('should handle removing non-existent execution gracefully', async () => {
				// Should not throw
				await expect(store.remove('non-existent')).resolves.toBeUndefined();
			});
		});

		describe('cleanup timer', () => {
			it('should auto-cleanup after TTL expires', async () => {
				const context = createContext();
				await store.register(context);

				// Verify it exists
				expect(await store.get(EXECUTION_ID)).not.toBeNull();

				// Fast-forward 1 hour (N8N_CHAT_HUB_EXECUTION_CONTEXT_TTL)
				jest.advanceTimersByTime(60 * 60 * 1000);

				// Should be cleaned up
				const result = await store.get(EXECUTION_ID);
				expect(result).toBeNull();
			});

			it('should reschedule cleanup when registering same execution again', async () => {
				const context1 = createContext();
				await store.register(context1);

				// Fast-forward 30 minutes
				jest.advanceTimersByTime(30 * 60 * 1000);

				// Register again - should reset timer
				const context2 = createContext({ messageId: 'updated-message' });
				await store.register(context2);

				// Fast-forward another 30 minutes (total 60 minutes from first registration)
				jest.advanceTimersByTime(30 * 60 * 1000);

				// Should still exist because timer was reset
				const retrieved = await store.get(EXECUTION_ID);
				expect(retrieved).not.toBeNull();
				expect(retrieved?.messageId).toBe('updated-message');

				// Fast-forward another 30 minutes (60 minutes from second registration)
				jest.advanceTimersByTime(30 * 60 * 1000);

				// Now should be cleaned up
				const afterCleanup = await store.get(EXECUTION_ID);
				expect(afterCleanup).toBeNull();
			});
		});

		describe('shutdown', () => {
			it('should clear all stored contexts', async () => {
				await store.register(createContext({ executionId: '111' }));
				await store.register(createContext({ executionId: '222' }));
				await store.register(createContext({ executionId: '333' }));

				store.shutdown();

				expect(await store.get('111')).toBeNull();
				expect(await store.get('222')).toBeNull();
				expect(await store.get('333')).toBeNull();
			});

			it('should clear all cleanup timers', async () => {
				await store.register(createContext({ executionId: '111' }));
				await store.register(createContext({ executionId: '222' }));

				store.shutdown();

				// Fast-forward - should not cause issues with orphaned timers
				jest.advanceTimersByTime(2 * 60 * 60 * 1000);
			});
		});

		describe('multiple executions', () => {
			it('should handle multiple independent executions', async () => {
				const context1 = createContext({ executionId: '111', messageId: 'msg-1' });
				const context2 = createContext({ executionId: '222', messageId: 'msg-2' });
				const context3 = createContext({ executionId: '333', messageId: 'msg-3' });

				await store.register(context1);
				await store.register(context2);
				await store.register(context3);

				expect((await store.get('111'))?.messageId).toBe('msg-1');
				expect((await store.get('222'))?.messageId).toBe('msg-2');
				expect((await store.get('333'))?.messageId).toBe('msg-3');

				// Update one
				await store.update('222', { awaitingResume: true });

				expect((await store.get('111'))?.awaitingResume).toBe(false);
				expect((await store.get('222'))?.awaitingResume).toBe(true);
				expect((await store.get('333'))?.awaitingResume).toBe(false);

				// Remove one
				await store.remove('111');

				expect(await store.get('111')).toBeNull();
				expect(await store.get('222')).not.toBeNull();
				expect(await store.get('333')).not.toBeNull();
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
			redisClientService.createClient.mockReturnValue(mockRedisClient as never);
		});

		afterEach(() => {
			jest.clearAllMocks();
		});

		it('should create Redis client in multi-main mode', () => {
			const store = new ChatHubExecutionStore(
				logger,
				instanceSettings,
				executionsConfig,
				globalConfig,
				chatHubConfig,
				redisClientService,
			);

			expect(redisClientService.createClient).toHaveBeenCalledWith({ type: 'subscriber(n8n)' });

			store.shutdown();
		});

		it('should create Redis client in queue mode', () => {
			Object.defineProperty(instanceSettings, 'isMultiMain', { value: false, configurable: true });
			executionsConfig.mode = 'queue';

			const store = new ChatHubExecutionStore(
				logger,
				instanceSettings,
				executionsConfig,
				globalConfig,
				chatHubConfig,
				redisClientService,
			);

			expect(redisClientService.createClient).toHaveBeenCalled();

			store.shutdown();
		});

		describe('register', () => {
			it('should store context in Redis with TTL', async () => {
				const store = new ChatHubExecutionStore(
					logger,
					instanceSettings,
					executionsConfig,
					globalConfig,
					chatHubConfig,
					redisClientService,
				);

				const context = createContext();
				await store.register(context);

				expect(mockRedisClient.set).toHaveBeenCalledWith(
					`n8n:chat-hub:exec:${EXECUTION_ID}`,
					expect.stringContaining(`"executionId":"${EXECUTION_ID}"`),
					'EX',
					3600, // 1 hour TTL
				);

				store.shutdown();
			});
		});

		describe('get', () => {
			it('should retrieve context from Redis', async () => {
				const context = createContext();
				mockRedisClient.get.mockResolvedValue(JSON.stringify(context));

				const store = new ChatHubExecutionStore(
					logger,
					instanceSettings,
					executionsConfig,
					globalConfig,
					chatHubConfig,
					redisClientService,
				);

				const result = await store.get(EXECUTION_ID);

				expect(mockRedisClient.get).toHaveBeenCalledWith(`n8n:chat-hub:exec:${EXECUTION_ID}`);
				expect(result).toEqual(context);

				store.shutdown();
			});

			it('should return null if not found in Redis', async () => {
				mockRedisClient.get.mockResolvedValue(null);

				const store = new ChatHubExecutionStore(
					logger,
					instanceSettings,
					executionsConfig,
					globalConfig,
					chatHubConfig,
					redisClientService,
				);

				const result = await store.get(EXECUTION_ID);
				expect(result).toBeNull();

				store.shutdown();
			});

			it('should return null and log error on Redis failure', async () => {
				mockRedisClient.get.mockRejectedValue(new Error('Redis connection failed'));

				const store = new ChatHubExecutionStore(
					logger,
					instanceSettings,
					executionsConfig,
					globalConfig,
					chatHubConfig,
					redisClientService,
				);

				const result = await store.get(EXECUTION_ID);

				expect(result).toBeNull();
				expect(logger.error).toHaveBeenCalledWith(
					`Failed to get Redis context for execution ${EXECUTION_ID}`,
					expect.any(Object),
				);

				store.shutdown();
			});
		});

		describe('update', () => {
			it('should update context in Redis', async () => {
				const context = createContext();
				mockRedisClient.get.mockResolvedValue(JSON.stringify(context));

				const store = new ChatHubExecutionStore(
					logger,
					instanceSettings,
					executionsConfig,
					globalConfig,
					chatHubConfig,
					redisClientService,
				);

				await store.update(EXECUTION_ID, { awaitingResume: true });

				expect(mockRedisClient.set).toHaveBeenCalledWith(
					`n8n:chat-hub:exec:${EXECUTION_ID}`,
					expect.stringContaining('"awaitingResume":true'),
					'EX',
					3600,
				);

				store.shutdown();
			});

			it('should log warning if context not found', async () => {
				mockRedisClient.get.mockResolvedValue(null);

				const store = new ChatHubExecutionStore(
					logger,
					instanceSettings,
					executionsConfig,
					globalConfig,
					chatHubConfig,
					redisClientService,
				);

				await store.update(EXECUTION_ID, { awaitingResume: true });

				expect(logger.warn).toHaveBeenCalledWith(
					`Attempted to update non-existent execution context: ${EXECUTION_ID}`,
				);
				expect(mockRedisClient.set).not.toHaveBeenCalled();

				store.shutdown();
			});
		});

		describe('remove', () => {
			it('should delete context from Redis', async () => {
				const store = new ChatHubExecutionStore(
					logger,
					instanceSettings,
					executionsConfig,
					globalConfig,
					chatHubConfig,
					redisClientService,
				);

				await store.remove(EXECUTION_ID);

				expect(mockRedisClient.del).toHaveBeenCalledWith(`n8n:chat-hub:exec:${EXECUTION_ID}`);

				store.shutdown();
			});

			it('should log error on Redis failure', async () => {
				mockRedisClient.del.mockRejectedValue(new Error('Redis error'));

				const store = new ChatHubExecutionStore(
					logger,
					instanceSettings,
					executionsConfig,
					globalConfig,
					chatHubConfig,
					redisClientService,
				);

				await store.remove(EXECUTION_ID);

				expect(logger.error).toHaveBeenCalledWith(
					`Failed to delete Redis context for execution ${EXECUTION_ID}`,
					expect.any(Object),
				);

				store.shutdown();
			});
		});

		describe('shutdown', () => {
			it('should disconnect Redis client', () => {
				const store = new ChatHubExecutionStore(
					logger,
					instanceSettings,
					executionsConfig,
					globalConfig,
					chatHubConfig,
					redisClientService,
				);

				store.shutdown();

				expect(mockRedisClient.disconnect).toHaveBeenCalled();
			});
		});

		describe('error handling', () => {
			it('should handle set errors gracefully', async () => {
				mockRedisClient.set.mockRejectedValue(new Error('Redis write failed'));

				const store = new ChatHubExecutionStore(
					logger,
					instanceSettings,
					executionsConfig,
					globalConfig,
					chatHubConfig,
					redisClientService,
				);

				const context = createContext();
				await store.register(context);

				expect(logger.error).toHaveBeenCalledWith(
					`Failed to set Redis context for execution ${EXECUTION_ID}`,
					expect.any(Object),
				);

				store.shutdown();
			});
		});
	});

	describe('mode detection', () => {
		it('should use memory store when not multi-main and not queue mode', () => {
			Object.defineProperty(instanceSettings, 'isMultiMain', { value: false, configurable: true });
			executionsConfig.mode = 'regular';

			const store = new ChatHubExecutionStore(
				logger,
				instanceSettings,
				executionsConfig,
				globalConfig,
				chatHubConfig,
				redisClientService,
			);

			expect(redisClientService.createClient).not.toHaveBeenCalled();

			store.shutdown();
		});

		it('should use Redis when isMultiMain is true', () => {
			Object.defineProperty(instanceSettings, 'isMultiMain', { value: true, configurable: true });
			executionsConfig.mode = 'regular';

			redisClientService.createClient.mockReturnValue({
				disconnect: jest.fn(),
			} as never);

			const store = new ChatHubExecutionStore(
				logger,
				instanceSettings,
				executionsConfig,
				globalConfig,
				chatHubConfig,
				redisClientService,
			);

			expect(redisClientService.createClient).toHaveBeenCalled();

			store.shutdown();
		});

		it('should use Redis when mode is queue', () => {
			Object.defineProperty(instanceSettings, 'isMultiMain', { value: false, configurable: true });
			executionsConfig.mode = 'queue';

			redisClientService.createClient.mockReturnValue({
				disconnect: jest.fn(),
			} as never);

			const store = new ChatHubExecutionStore(
				logger,
				instanceSettings,
				executionsConfig,
				globalConfig,
				chatHubConfig,
				redisClientService,
			);

			expect(redisClientService.createClient).toHaveBeenCalled();

			store.shutdown();
		});
	});
});
