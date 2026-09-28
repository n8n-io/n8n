import type { Logger } from '@n8n/backend-common';
import { mockInstance, mockLogger } from '@n8n/backend-test-utils';
import { ExecutionsConfig, GlobalConfig } from '@n8n/config';
import type { Redis as SingleNodeClient } from 'ioredis';
import { mock } from 'vitest-mock-extended';

import type { RedisClientService } from '@/services/redis-client.service';

import type { PubSubEventBus } from '../pubsub.eventbus';
import type { McpRelayMessage } from '../subscriber.service';
import { Subscriber } from '../subscriber.service';

describe('Subscriber', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	const client = mock<SingleNodeClient>();
	const redisClientService = mock<RedisClientService>({ createClient: () => client });
	const executionsConfig = mockInstance(ExecutionsConfig, { mode: 'queue' });
	const globalConfig = mockInstance(GlobalConfig, { redis: { prefix: 'n8n' } });

	function getHandler(event: string) {
		const call = client.on.mock.calls.find(([e]) => e === event);
		expect(call).toBeDefined();
		return call![1] as () => void;
	}

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

	describe('reconnect', () => {
		beforeEach(() => {
			client.on.mockClear();
			client.subscribe.mockClear();
		});

		it('should resubscribe to all channels when the client recovers from a lost connection', async () => {
			const subscriber = new Subscriber(
				mockLogger(),
				mock(),
				mock(),
				redisClientService,
				executionsConfig,
				globalConfig,
			);
			await subscriber.subscribe(subscriber.getCommandChannel());
			await subscriber.subscribe(subscriber.getWorkerResponseChannel());
			client.subscribe.mockClear();

			getHandler('close')();
			getHandler('ready')();
			await vi.waitFor(() => expect(client.subscribe).toHaveBeenCalledTimes(2));

			expect(client.subscribe).toHaveBeenCalledWith('n8n:n8n.commands', expect.any(Function));
			expect(client.subscribe).toHaveBeenCalledWith(
				'n8n:n8n.worker-response',
				expect.any(Function),
			);
		});

		it('should retry on the next ready when resubscribing fails', async () => {
			const scopedLogger = mock<Logger>();
			const logger = mock<Logger>({ scoped: vi.fn().mockReturnValue(scopedLogger) });
			const subscriber = new Subscriber(
				logger,
				mock(),
				mock(),
				redisClientService,
				executionsConfig,
				globalConfig,
			);
			await subscriber.subscribe(subscriber.getCommandChannel());
			client.subscribe.mockClear();
			client.subscribe.mockRejectedValueOnce(new Error('write ECONNRESET'));

			getHandler('close')();
			getHandler('ready')();
			await vi.waitFor(() =>
				expect(scopedLogger.error).toHaveBeenCalledWith(
					'Failed to resubscribe to pubsub channels after Redis reconnect',
					expect.any(Object),
				),
			);

			getHandler('ready')();
			await vi.waitFor(() => expect(client.subscribe).toHaveBeenCalledTimes(2));
		});

		it('should not resubscribe on the initial ready', async () => {
			const subscriber = new Subscriber(
				mockLogger(),
				mock(),
				mock(),
				redisClientService,
				executionsConfig,
				globalConfig,
			);
			await subscriber.subscribe(subscriber.getCommandChannel());
			client.subscribe.mockClear();

			getHandler('ready')();
			await Promise.resolve();

			expect(client.subscribe).not.toHaveBeenCalled();
		});
	});

	describe('liveness', () => {
		beforeEach(() => {
			vi.useFakeTimers();
			client.subscribe.mockReset();
			client.disconnect.mockClear();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		async function subscribedSubscriber() {
			const subscriber = new Subscriber(
				mockLogger(),
				mock(),
				mock(),
				redisClientService,
				executionsConfig,
				globalConfig,
			);
			await subscriber.subscribe(subscriber.getCommandChannel());
			await subscriber.subscribe(subscriber.getWorkerResponseChannel());
			client.subscribe.mockReset();
			return subscriber;
		}

		it('should re-issue SUBSCRIBE for all channels periodically', async () => {
			const subscriber = await subscribedSubscriber();
			client.subscribe.mockResolvedValue(2);

			await vi.advanceTimersByTimeAsync(30_000 + 10_000);

			expect(client.subscribe).toHaveBeenCalledTimes(1);
			expect(client.subscribe).toHaveBeenCalledWith('n8n:n8n.commands', 'n8n:n8n.worker-response');
			expect(client.disconnect).not.toHaveBeenCalled();
			subscriber.shutdown();
		});

		it('should drop the connection when SUBSCRIBE gets no reply in time', async () => {
			const subscriber = await subscribedSubscriber();
			client.subscribe.mockReturnValue(new Promise(() => {}));

			await vi.advanceTimersByTimeAsync(30_000 + 10_000);

			expect(client.subscribe).toHaveBeenCalledTimes(1);
			expect(client.disconnect).toHaveBeenCalledWith(true);
			subscriber.shutdown();
		});

		it('should not check before any channel was requested', async () => {
			const subscriber = new Subscriber(
				mockLogger(),
				mock(),
				mock(),
				redisClientService,
				executionsConfig,
				globalConfig,
			);

			await vi.advanceTimersByTimeAsync(60_000);

			expect(client.subscribe).not.toHaveBeenCalled();
			subscriber.shutdown();
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

	describe('debounce', () => {
		beforeEach(() => {
			vi.useFakeTimers();
			client.on.mockClear();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		function getMessageHandler() {
			const call = client.on.mock.calls.find(([event]) => event === 'message');
			expect(call).toBeDefined();
			return call![1] as (channel: string, msg: string) => void;
		}

		function makeCommandMsg(command: string, debounce: boolean, payload?: unknown) {
			return JSON.stringify({ command, senderId: 'other-host', debounce, payload });
		}

		it('should not drop different debounced commands arriving within 300ms', () => {
			const pubsubEventBus = mock<PubSubEventBus>();
			new Subscriber(
				mockLogger(),
				mock(),
				pubsubEventBus,
				redisClientService,
				executionsConfig,
				globalConfig,
			);

			const messageHandler = getMessageHandler();

			messageHandler('n8n:n8n.commands', makeCommandMsg('reload-license', true));
			messageHandler('n8n:n8n.commands', makeCommandMsg('reload-external-secrets-providers', true));

			vi.advanceTimersByTime(300);

			expect(pubsubEventBus.emit).toHaveBeenCalledWith('reload-license', undefined);
			expect(pubsubEventBus.emit).toHaveBeenCalledWith(
				'reload-external-secrets-providers',
				undefined,
			);
			expect(pubsubEventBus.emit).toHaveBeenCalledTimes(2);
		});

		it('should debounce repeated identical commands within 300ms', () => {
			const pubsubEventBus = mock<PubSubEventBus>();
			new Subscriber(
				mockLogger(),
				mock(),
				pubsubEventBus,
				redisClientService,
				executionsConfig,
				globalConfig,
			);

			const messageHandler = getMessageHandler();

			messageHandler('n8n:n8n.commands', makeCommandMsg('reload-license', true));
			messageHandler('n8n:n8n.commands', makeCommandMsg('reload-license', true));
			messageHandler('n8n:n8n.commands', makeCommandMsg('reload-license', true));

			vi.advanceTimersByTime(300);

			expect(pubsubEventBus.emit).toHaveBeenCalledWith('reload-license', undefined);
			expect(pubsubEventBus.emit).toHaveBeenCalledTimes(1);
		});

		it('should evict the debounce entry once its trailing call fires', () => {
			const pubsubEventBus = mock<PubSubEventBus>();
			const subscriber = new Subscriber(
				mockLogger(),
				mock(),
				pubsubEventBus,
				redisClientService,
				executionsConfig,
				globalConfig,
			);

			const messageHandler = getMessageHandler();

			messageHandler('n8n:n8n.commands', makeCommandMsg('reload-license', true));

			expect((subscriber as any).debouncedHandlers.size).toBe(1);

			vi.advanceTimersByTime(300);

			expect(pubsubEventBus.emit).toHaveBeenCalledWith('reload-license', undefined);
			expect((subscriber as any).debouncedHandlers.size).toBe(0);
		});

		it('should not drop community-package-install events for different packages within 300ms', () => {
			const pubsubEventBus = mock<PubSubEventBus>();
			new Subscriber(
				mockLogger(),
				mock(),
				pubsubEventBus,
				redisClientService,
				executionsConfig,
				globalConfig,
			);

			const messageHandler = getMessageHandler();

			const payloadA = { packageName: 'pkg-a', packageVersion: '1.0.0' };
			const payloadB = { packageName: 'pkg-b', packageVersion: '1.0.0' };
			messageHandler(
				'n8n:n8n.commands',
				makeCommandMsg('community-package-install', true, payloadA),
			);
			messageHandler(
				'n8n:n8n.commands',
				makeCommandMsg('community-package-install', true, payloadB),
			);

			vi.advanceTimersByTime(300);

			expect(pubsubEventBus.emit).toHaveBeenCalledWith('community-package-install', payloadA);
			expect(pubsubEventBus.emit).toHaveBeenCalledWith('community-package-install', payloadB);
			expect(pubsubEventBus.emit).toHaveBeenCalledTimes(2);
		});

		it('should still coalesce repeated community-package-install events for the same package within 300ms', () => {
			const pubsubEventBus = mock<PubSubEventBus>();
			new Subscriber(
				mockLogger(),
				mock(),
				pubsubEventBus,
				redisClientService,
				executionsConfig,
				globalConfig,
			);

			const messageHandler = getMessageHandler();

			const payload = { packageName: 'pkg-a', packageVersion: '1.0.0' };
			messageHandler(
				'n8n:n8n.commands',
				makeCommandMsg('community-package-install', true, payload),
			);
			messageHandler(
				'n8n:n8n.commands',
				makeCommandMsg('community-package-install', true, payload),
			);

			vi.advanceTimersByTime(300);

			expect(pubsubEventBus.emit).toHaveBeenCalledWith('community-package-install', payload);
			expect(pubsubEventBus.emit).toHaveBeenCalledTimes(1);
		});

		it('should not debounce immediate commands', () => {
			const pubsubEventBus = mock<PubSubEventBus>();
			new Subscriber(
				mockLogger(),
				mock(),
				pubsubEventBus,
				redisClientService,
				executionsConfig,
				globalConfig,
			);

			const messageHandler = getMessageHandler();

			const payload = { workflowId: 'wf-1', activeVersionId: 'v-1', activationMode: 'init' };
			messageHandler(
				'n8n:n8n.commands',
				makeCommandMsg('add-webhooks-triggers-and-pollers', false, payload),
			);

			expect(pubsubEventBus.emit).toHaveBeenCalledWith(
				'add-webhooks-triggers-and-pollers',
				payload,
			);
			expect(pubsubEventBus.emit).toHaveBeenCalledTimes(1);
		});

		it('should deliver each display-workflow-activation immediately without coalescing', () => {
			const pubsubEventBus = mock<PubSubEventBus>();
			new Subscriber(
				mockLogger(),
				mock(),
				pubsubEventBus,
				redisClientService,
				executionsConfig,
				globalConfig,
			);

			const messageHandler = getMessageHandler();

			const payload1 = { workflowId: 'wf-1', activeVersionId: 'v-1' };
			const payload2 = { workflowId: 'wf-2', activeVersionId: 'v-2' };
			messageHandler(
				'n8n:n8n.commands',
				makeCommandMsg('display-workflow-activation', false, payload1),
			);
			messageHandler(
				'n8n:n8n.commands',
				makeCommandMsg('display-workflow-activation', false, payload2),
			);

			expect(pubsubEventBus.emit).toHaveBeenCalledWith('display-workflow-activation', payload1);
			expect(pubsubEventBus.emit).toHaveBeenCalledWith('display-workflow-activation', payload2);
			expect(pubsubEventBus.emit).toHaveBeenCalledTimes(2);
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

			const mockHandler = vi.fn();
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
				scoped: vi.fn().mockReturnValue(scopedLogger),
			});
			const subscriber = new Subscriber(
				logger,
				mock(),
				mock(),
				redisClientService,
				executionsConfig,
				globalConfig,
			);

			const mockHandler = vi.fn();
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
