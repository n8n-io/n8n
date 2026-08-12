import type { Logger } from '@n8n/backend-common';
import { mockInstance, mockLogger } from '@n8n/backend-test-utils';
import { ExecutionsConfig, GlobalConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';

import type { MessageTransportService } from '../../transport/message-transport.service';
import type { PubSubEventBus } from '../pubsub.eventbus';
import type { McpRelayMessage } from '../subscriber.service';
import { Subscriber } from '../subscriber.service';

describe('Subscriber', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	const messageTransport = mock<MessageTransportService>();
	const executionsConfig = mockInstance(ExecutionsConfig, { mode: 'queue' });
	const globalConfig = mockInstance(GlobalConfig, { redis: { prefix: 'n8n' } });

	function createSubscriber(
		logger = mockLogger(),
		pubsubEventBus: PubSubEventBus = mock(),
		config: ExecutionsConfig = executionsConfig,
		global: GlobalConfig = globalConfig,
	) {
		return new Subscriber(logger, mock(), pubsubEventBus, messageTransport, config, global);
	}

	/** Subscribes and returns the handler `Subscriber` registered with the transport for `channel`. */
	async function subscribeAndGetHandler(subscriber: Subscriber, channel: string) {
		await subscriber.subscribe(channel);
		const call = messageTransport.subscribe.mock.calls.find(([ch]) => ch === channel);
		expect(call).toBeDefined();
		return call![1] as (message: string) => void;
	}

	describe('constructor', () => {
		it('should build prefixed channel names in scaling mode', () => {
			const subscriber = createSubscriber();

			expect(subscriber.getCommandChannel()).toEqual('n8n:n8n.commands');
		});

		it('should not build channel names in regular mode', () => {
			const regularModeConfig = mockInstance(ExecutionsConfig, { mode: 'regular' });
			const subscriber = createSubscriber(mockLogger(), mock(), regularModeConfig);

			expect(subscriber.getCommandChannel()).toBeUndefined();
		});
	});

	describe('shutdown', () => {
		it('should shut down the message transport', () => {
			const subscriber = createSubscriber();
			subscriber.shutdown();
			expect(messageTransport.shutdown).toHaveBeenCalled();
		});
	});

	describe('subscribe', () => {
		it('should subscribe to pubsub channel with prefix', async () => {
			const subscriber = createSubscriber();

			const commandChannel = subscriber.getCommandChannel();
			await subscriber.subscribe(commandChannel);

			expect(messageTransport.subscribe).toHaveBeenCalledWith(
				'n8n:n8n.commands',
				expect.any(Function),
			);
		});
	});

	describe('prefix isolation', () => {
		it('should apply configured prefix when subscribing to channels', async () => {
			const customConfig = mockInstance(GlobalConfig, { redis: { prefix: 'n8n-instance-1' } });
			const subscriber = createSubscriber(mockLogger(), mock(), executionsConfig, customConfig);

			await subscriber.subscribe(subscriber.getCommandChannel());
			await subscriber.subscribe(subscriber.getWorkerResponseChannel());

			expect(messageTransport.subscribe).toHaveBeenCalledWith(
				'n8n-instance-1:n8n.commands',
				expect.any(Function),
			);
			expect(messageTransport.subscribe).toHaveBeenCalledWith(
				'n8n-instance-1:n8n.worker-response',
				expect.any(Function),
			);
		});
	});

	describe('debounce', () => {
		beforeEach(() => {
			vi.useFakeTimers();
			messageTransport.subscribe.mockClear();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		function makeCommandMsg(command: string, debounce: boolean, payload?: unknown) {
			return JSON.stringify({ command, senderId: 'other-host', debounce, payload });
		}

		it('should not drop different debounced commands arriving within 300ms', async () => {
			const pubsubEventBus = mock<PubSubEventBus>();
			const subscriber = createSubscriber(mockLogger(), pubsubEventBus);
			const messageHandler = await subscribeAndGetHandler(
				subscriber,
				subscriber.getCommandChannel(),
			);

			messageHandler(makeCommandMsg('reload-license', true));
			messageHandler(makeCommandMsg('reload-external-secrets-providers', true));

			vi.advanceTimersByTime(300);

			expect(pubsubEventBus.emit).toHaveBeenCalledWith('reload-license', undefined);
			expect(pubsubEventBus.emit).toHaveBeenCalledWith(
				'reload-external-secrets-providers',
				undefined,
			);
			expect(pubsubEventBus.emit).toHaveBeenCalledTimes(2);
		});

		it('should debounce repeated identical commands within 300ms', async () => {
			const pubsubEventBus = mock<PubSubEventBus>();
			const subscriber = createSubscriber(mockLogger(), pubsubEventBus);
			const messageHandler = await subscribeAndGetHandler(
				subscriber,
				subscriber.getCommandChannel(),
			);

			messageHandler(makeCommandMsg('reload-license', true));
			messageHandler(makeCommandMsg('reload-license', true));
			messageHandler(makeCommandMsg('reload-license', true));

			vi.advanceTimersByTime(300);

			expect(pubsubEventBus.emit).toHaveBeenCalledWith('reload-license', undefined);
			expect(pubsubEventBus.emit).toHaveBeenCalledTimes(1);
		});

		it('should not debounce immediate commands', async () => {
			const pubsubEventBus = mock<PubSubEventBus>();
			const subscriber = createSubscriber(mockLogger(), pubsubEventBus);
			const messageHandler = await subscribeAndGetHandler(
				subscriber,
				subscriber.getCommandChannel(),
			);

			const payload = { workflowId: 'wf-1', activeVersionId: 'v-1', activationMode: 'init' };
			messageHandler(makeCommandMsg('add-webhooks-triggers-and-pollers', false, payload));

			expect(pubsubEventBus.emit).toHaveBeenCalledWith(
				'add-webhooks-triggers-and-pollers',
				payload,
			);
			expect(pubsubEventBus.emit).toHaveBeenCalledTimes(1);
		});

		it('should deliver each display-workflow-activation immediately without coalescing', async () => {
			const pubsubEventBus = mock<PubSubEventBus>();
			const subscriber = createSubscriber(mockLogger(), pubsubEventBus);
			const messageHandler = await subscribeAndGetHandler(
				subscriber,
				subscriber.getCommandChannel(),
			);

			const payload1 = { workflowId: 'wf-1', activeVersionId: 'v-1' };
			const payload2 = { workflowId: 'wf-2', activeVersionId: 'v-2' };
			messageHandler(makeCommandMsg('display-workflow-activation', false, payload1));
			messageHandler(makeCommandMsg('display-workflow-activation', false, payload2));

			expect(pubsubEventBus.emit).toHaveBeenCalledWith('display-workflow-activation', payload1);
			expect(pubsubEventBus.emit).toHaveBeenCalledWith('display-workflow-activation', payload2);
			expect(pubsubEventBus.emit).toHaveBeenCalledTimes(2);
		});
	});

	describe('MCP relay handling', () => {
		beforeEach(() => {
			messageTransport.subscribe.mockClear();
		});

		it('should invoke handler for valid MCP relay messages', async () => {
			const logger = mockLogger();
			const subscriber = createSubscriber(logger);

			const mockHandler = vi.fn();
			subscriber.setMcpRelayHandler(mockHandler);

			const messageHandler = await subscribeAndGetHandler(
				subscriber,
				subscriber.getMcpRelayChannel(),
			);

			const relayMsg: McpRelayMessage = {
				sessionId: 'session-123',
				messageId: 'msg-456',
				response: { test: true },
			};

			messageHandler(JSON.stringify(relayMsg));

			expect(mockHandler).toHaveBeenCalledWith(relayMsg);
		});

		it('should log error and not invoke handler for malformed messages', async () => {
			const scopedLogger = mock<Logger>();
			const logger = mock<Logger>({
				scoped: vi.fn().mockReturnValue(scopedLogger),
			});
			const subscriber = createSubscriber(logger);

			const mockHandler = vi.fn();
			subscriber.setMcpRelayHandler(mockHandler);

			const messageHandler = await subscribeAndGetHandler(
				subscriber,
				subscriber.getMcpRelayChannel(),
			);

			// Send malformed message (missing required fields)
			messageHandler(JSON.stringify({ invalid: true }));

			expect(mockHandler).not.toHaveBeenCalled();
			// The scoped logger is what's actually used internally
			expect(scopedLogger.error).toHaveBeenCalledWith(
				'Received malformed MCP relay message',
				expect.any(Object),
			);
		});

		it('should handle missing handler gracefully', async () => {
			const logger = mockLogger();
			// Create subscriber but don't set a handler
			const subscriber = createSubscriber(logger);
			const messageHandler = await subscribeAndGetHandler(
				subscriber,
				subscriber.getMcpRelayChannel(),
			);

			const relayMsg: McpRelayMessage = {
				sessionId: 'session-123',
				messageId: 'msg-456',
				response: { test: true },
			};

			// Should not throw when handler is not set
			expect(() => messageHandler(JSON.stringify(relayMsg))).not.toThrow();
		});
	});
});
