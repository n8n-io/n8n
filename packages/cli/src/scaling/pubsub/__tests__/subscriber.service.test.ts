import type { Logger } from '@n8n/backend-common';
import { mockInstance, mockLogger } from '@n8n/backend-test-utils';
import { ExecutionsConfig, GlobalConfig } from '@n8n/config';
import type { Redis as SingleNodeClient } from 'ioredis';
import { mock } from 'jest-mock-extended';

import type { RedisClientService } from '@/services/redis-client.service';

import type { McpRelayMessage } from '../subscriber.service';
import { Subscriber } from '../subscriber.service';

describe('Subscriber', () => {
	beforeEach(() => {
		jest.restoreAllMocks();
	});

	const client = mock<SingleNodeClient>();
	const redisClientService = mock<RedisClientService>({ createClient: () => client });
	const executionsConfig = mockInstance(ExecutionsConfig, { mode: 'queue' });
	const globalConfig = mockInstance(GlobalConfig, { redis: { prefix: 'n8n' } });

	describe('constructor', () => {
		it('should init Redis client in scaling mode', () => {
			const subscriber = new Subscriber(
				mock(),
				mock(),
				mock(),
				redisClientService,
				executionsConfig,
				globalConfig,
			);

			expect(subscriber.getClient()).toEqual(client);
		});

		it('should not init Redis client in regular mode', () => {
			const regularModeConfig = mockInstance(ExecutionsConfig, { mode: 'regular' });
			const subscriber = new Subscriber(
				mock(),
				mock(),
				mock(),
				redisClientService,
				regularModeConfig,
				globalConfig,
			);

			expect(subscriber.getClient()).toBeUndefined();
		});
	});

	describe('shutdown', () => {
		it('should disconnect Redis client', () => {
			const subscriber = new Subscriber(
				mock(),
				mock(),
				mock(),
				redisClientService,
				executionsConfig,
				globalConfig,
			);
			subscriber.shutdown();
			expect(client.disconnect).toHaveBeenCalled();
		});
	});

	describe('subscribe', () => {
		it('should subscribe to pubsub channel with prefix', async () => {
			const subscriber = new Subscriber(
				mock(),
				mock(),
				mock(),
				redisClientService,
				executionsConfig,
				globalConfig,
			);

			const commandChannel = subscriber.getCommandChannel();
			await subscriber.subscribe(commandChannel);

			expect(client.subscribe).toHaveBeenCalledWith('n8n:n8n.commands', expect.any(Function));
		});
	});

	describe('prefix isolation', () => {
		it('should apply configured prefix when subscribing to channels', async () => {
			const customConfig = mockInstance(GlobalConfig, { redis: { prefix: 'n8n-instance-1' } });
			const subscriber = new Subscriber(
				mock(),
				mock(),
				mock(),
				redisClientService,
				executionsConfig,
				customConfig,
			);

			await subscriber.subscribe(subscriber.getCommandChannel());
			await subscriber.subscribe(subscriber.getWorkerResponseChannel());

			expect(client.subscribe).toHaveBeenCalledWith(
				'n8n-instance-1:n8n.commands',
				expect.any(Function),
			);
			expect(client.subscribe).toHaveBeenCalledWith(
				'n8n-instance-1:n8n.worker-response',
				expect.any(Function),
			);
		});
	});

	describe('MCP relay handling', () => {
		beforeEach(() => {
			// Clear mock calls to ensure each test gets fresh state
			client.on.mockClear();
		});

		it('should invoke handler for valid MCP relay messages', () => {
			const logger = mockLogger();
			const subscriber = new Subscriber(
				logger,
				mock(),
				mock(),
				redisClientService,
				executionsConfig,
				globalConfig,
			);

			const mockHandler = jest.fn();
			subscriber.setMcpRelayHandler(mockHandler);

			// Get the message handler registered on the client (the one from this test)
			const messageHandlerCall = client.on.mock.calls.find(([event]) => event === 'message');
			expect(messageHandlerCall).toBeDefined();
			const messageHandler = messageHandlerCall![1] as (channel: string, msg: string) => void;

			const relayMsg: McpRelayMessage = {
				sessionId: 'session-123',
				messageId: 'msg-456',
				response: { test: true },
			};

			messageHandler('n8n:n8n.mcp-relay', JSON.stringify(relayMsg));

			expect(mockHandler).toHaveBeenCalledWith(relayMsg);
		});

		it('should log error and not invoke handler for malformed messages', () => {
			// Create a scoped logger mock that will be returned by logger.scoped()
			const scopedLogger = mock<Logger>();
			const logger = mock<Logger>({
				scoped: jest.fn().mockReturnValue(scopedLogger),
			});
			const subscriber = new Subscriber(
				logger,
				mock(),
				mock(),
				redisClientService,
				executionsConfig,
				globalConfig,
			);

			const mockHandler = jest.fn();
			subscriber.setMcpRelayHandler(mockHandler);

			const messageHandlerCall = client.on.mock.calls.find(([event]) => event === 'message');
			expect(messageHandlerCall).toBeDefined();
			const messageHandler = messageHandlerCall![1] as (channel: string, msg: string) => void;

			// Send malformed message (missing required fields)
			messageHandler('n8n:n8n.mcp-relay', JSON.stringify({ invalid: true }));

			expect(mockHandler).not.toHaveBeenCalled();
			// The scoped logger is what's actually used internally
			expect(scopedLogger.error).toHaveBeenCalledWith(
				'Received malformed MCP relay message',
				expect.any(Object),
			);
		});

		it('should handle missing handler gracefully', () => {
			const logger = mockLogger();
			// Create subscriber but don't set a handler - constructor registers message listener
			new Subscriber(logger, mock(), mock(), redisClientService, executionsConfig, globalConfig);

			const messageHandlerCall = client.on.mock.calls.find(([event]) => event === 'message');
			expect(messageHandlerCall).toBeDefined();
			const messageHandler = messageHandlerCall![1] as (channel: string, msg: string) => void;

			const relayMsg: McpRelayMessage = {
				sessionId: 'session-123',
				messageId: 'msg-456',
				response: { test: true },
			};

			// Should not throw when handler is not set
			expect(() => messageHandler('n8n:n8n.mcp-relay', JSON.stringify(relayMsg))).not.toThrow();
		});
	});
});
