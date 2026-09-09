import { Logger } from '@n8n/backend-common';
import { testDb } from '@n8n/backend-test-utils';
import { ExecutionsConfig, GlobalConfig } from '@n8n/config';
import { SettingsRepository, type User } from '@n8n/db';
import { PubSubMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { Redis as SingleNodeClient } from 'ioredis';
import type { InstanceSettings } from 'n8n-core';
import { jsonParse } from 'n8n-workflow';
import { vi } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { OtelLifecycleHandler } from '@/modules/otel/otel-lifecycle-handler';
import { OTEL_SETTINGS_KEY, OtelSettingsService } from '@/modules/otel/otel-settings.service';
import { OtelService } from '@/modules/otel/otel.service';
import { COMMAND_PUBSUB_CHANNEL } from '@/scaling/constants';
import { Publisher } from '@/scaling/pubsub/publisher.service';
import { PubSubEventBus } from '@/scaling/pubsub/pubsub.eventbus';
import { PubSubRegistry } from '@/scaling/pubsub/pubsub.registry';
import { Subscriber } from '@/scaling/pubsub/subscriber.service';
import type { RedisClientService } from '@/services/redis-client.service';
import { createOwner } from '@test-integration/db/users';
import { setupTestServer } from '@test-integration/utils';

/**
 * An in-memory stand-in for the Redis pubsub transport. Every message crosses it
 * as the JSON string the real client would carry, so the publish payload and the
 * subscriber's own parsing, sender filter and debounce all run for real.
 */
const bus = {
	clients: [] as Array<{
		channels: Set<string>;
		listeners: Array<(channel: string, message: string) => void>;
	}>,
	published: [] as Array<{ channel: string; message: string }>,
};

function createFakeRedisClient() {
	const state = {
		channels: new Set<string>(),
		listeners: [] as Array<(channel: string, message: string) => void>,
	};
	bus.clients.push(state);

	return mock<SingleNodeClient>({
		publish: ((channel: string, message: string) => {
			bus.published.push({ channel, message });
			for (const client of [...bus.clients]) {
				if (!client.channels.has(channel)) continue;
				for (const listener of client.listeners) listener(channel, message);
			}
			return 1;
		}) as never,
		subscribe: (async (channel: string, onSubscribed?: (error: unknown) => void) => {
			await Promise.resolve();
			state.channels.add(channel);
			onSubscribed?.(null);
			return 1;
		}) as never,
		on: ((event: string, listener: (channel: string, message: string) => void) => {
			if (event === 'message') state.listeners.push(listener);
			return undefined as never;
		}) as never,
		// A disconnected client receives nothing more, so it leaves the bus.
		disconnect: (() => {
			const index = bus.clients.indexOf(state);
			if (index !== -1) bus.clients.splice(index, 1);
		}) as never,
	});
}

const redisClientService = mock<RedisClientService>({
	createClient: () => createFakeRedisClient(),
});

const REDIS_PREFIX = 'n8n';
const MAIN_HOST_ID = 'main-testhost';
const WORKER_HOST_ID = 'worker-testhost';
const commandChannel = `${REDIS_PREFIX}:${COMMAND_PUBSUB_CHANNEL}`;

/** The subscriber debounces every command that `IMMEDIATE_COMMANDS` does not name. */
const DEBOUNCE_MS = 300;

const workerInstanceSettings = mock<InstanceSettings>({
	hostId: WORKER_HOST_ID,
	instanceType: 'worker',
	instanceRole: 'unset',
});

const validSettings = {
	enabled: false,
	exporterProtocol: 'http/protobuf',
	exporterEndpoint: 'http://collector.example.com:4318',
	exporterTracingPath: '/v1/traces',
	exporterServiceName: 'n8n-prod',
	exporterHeaders: 'authorization=Bearer my-token',
	tracesSampleRate: 0.5,
	startupConnectivityTimeoutMs: 3_000,
	includeNodeSpans: false,
	injectOutbound: false,
	productionExecutionsOnly: false,
};

describe('reload-otel-config propagation in queue mode', () => {
	let owner: User;
	let workerEventBus: PubSubEventBus;
	let workerSubscriber: Subscriber;
	/** Deliveries of `reload-otel-config` to the worker's event bus. */
	let workerDeliveries = 0;

	// Declared before `setupTestServer` on purpose: this hook must run before the
	// test server constructs the otel controller, so that on any revision the
	// controller sees this queue-mode `Publisher` — whether it captures the
	// publisher at construction or resolves it per call.
	beforeAll(() => {
		const queueConfig = Container.get(ExecutionsConfig);
		queueConfig.mode = 'queue';
		Container.get(GlobalConfig).redis.prefix = REDIS_PREFIX;

		// The main instance's publisher: the real class, on the fake transport.
		Container.set(
			Publisher,
			new Publisher(
				Container.get(Logger),
				redisClientService,
				mock<InstanceSettings>({ hostId: MAIN_HOST_ID, instanceType: 'main' }),
				queueConfig,
				Container.get(GlobalConfig),
			),
		);
	});

	const testServer = setupTestServer({ endpointGroups: ['otel'] });

	beforeAll(async () => {
		await testDb.init();

		// The registration the worker's registry reads. Asserted separately so that
		// a missing decorator names itself, instead of showing up as no delivery.
		const handlers = Container.get(PubSubMetadata)
			.getHandlers()
			.filter((handler) => handler.eventName === 'reload-otel-config');

		expect(handlers).toHaveLength(1);
		expect(handlers[0].eventHandlerClass).toBe(OtelLifecycleHandler);
		// No instance-type filter, so a worker's registry registers it too.
		expect(handlers[0].filter?.instanceType).toBeUndefined();
	});

	beforeEach(async () => {
		await testDb.truncate(['User']);
		await Container.get(SettingsRepository).delete({ key: OTEL_SETTINGS_KEY });
		await Container.get(OtelSettingsService).loadSettings();
		owner = await createOwner();
		bus.published.length = 0;
		workerDeliveries = 0;

		// A worker instance, rebuilt for each test. `shutdown()` in `afterEach`
		// cancels the trailing debounce, so a timer armed by one test can never
		// deliver into the next one.
		workerEventBus = new PubSubEventBus();
		workerSubscriber = new Subscriber(
			Container.get(Logger),
			workerInstanceSettings,
			workerEventBus,
			redisClientService,
			Container.get(ExecutionsConfig),
			Container.get(GlobalConfig),
		);
		await workerSubscriber.subscribe(commandChannel);

		// The real registry wires the real `@OnPubSubEvent` handler onto this bus.
		// On a worker this is the only path that reaches otel.
		const workerRegistry = new PubSubRegistry(
			Container.get(Logger),
			workerInstanceSettings,
			Container.get(PubSubMetadata),
			workerEventBus,
		);
		workerRegistry.init();

		// Observes what the transport delivered. The registry stays under test.
		workerEventBus.on('reload-otel-config', () => {
			workerDeliveries++;
		});
	});

	afterEach(() => {
		workerSubscriber.shutdown();
		vi.restoreAllMocks();
	});

	it('publishes reload-otel-config on the command channel with the expected payload', async () => {
		const response = await testServer.authAgentFor(owner).put('/otel/settings').send(validSettings);

		expect(response.status).toBe(200);

		await vi.waitFor(() => expect(bus.published).toHaveLength(1));

		expect(bus.published[0].channel).toBe(commandChannel);
		expect(jsonParse(bus.published[0].message)).toEqual({
			command: 'reload-otel-config',
			senderId: MAIN_HOST_ID,
			selfSend: false,
			debounce: true,
		});
	});

	it('reaches a worker, which reloads its otel configuration', async () => {
		const restart = vi.spyOn(Container.get(OtelService), 'restart').mockResolvedValue();

		const response = await testServer.authAgentFor(owner).put('/otel/settings').send(validSettings);

		expect(response.status).toBe(200);

		// 300 ms subscriber debounce, so poll rather than assert once.
		await vi.waitFor(() => expect(workerDeliveries).toBe(1), { timeout: 5_000 });

		// Once for the main's own local reload, once through the worker's registry.
		await vi.waitFor(() => expect(restart).toHaveBeenCalledTimes(2), { timeout: 5_000 });
	});

	it('does not publish when the write is rejected', async () => {
		const response = await testServer
			.authAgentFor(owner)
			.put('/otel/settings')
			.send({ ...validSettings, exporterEndpoint: 'not-a-url' });

		expect(response.status).toBe(400);
		expect(bus.published).toHaveLength(0);
	});

	it('delivers nothing to a worker that shut down with a debounce armed', async () => {
		const response = await testServer.authAgentFor(owner).put('/otel/settings').send(validSettings);

		expect(response.status).toBe(200);
		await vi.waitFor(() => expect(bus.published).toHaveLength(1));
		// The trailing timer is armed, and it has not fired yet.
		expect(workerDeliveries).toBe(0);

		workerSubscriber.shutdown();

		// A negative claim over time needs a bounded wait: no event marks the
		// moment a cancelled timer does not fire.
		await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_MS * 2));

		expect(workerDeliveries).toBe(0);
	});
});
