import { OnPubSubEvent, PubSubMetadata } from '@n8n/decorators';
import { Container, Service } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';

import { mockLogger } from '@test/mocking';

import { PubSubHandler } from '../pubsub-handler';
import { PubSubEventBus } from '../pubsub.eventbus';

describe('PubSubHandler', () => {
	let metadata: PubSubMetadata;
	let pubsubEventBus: PubSubEventBus;
	let logger: ReturnType<typeof mockLogger>;

	const createTestServiceClass = () => {
		@Service()
		class TestService {
			@OnPubSubEvent('reload-external-secrets-providers', { instanceType: 'main' })
			onMainInstance() {}

			@OnPubSubEvent('restart-event-bus', { instanceType: 'worker' })
			onWorkerInstance() {}

			@OnPubSubEvent('add-webhooks-triggers-and-pollers', {
				instanceType: 'main',
				instanceRole: 'leader',
			})
			onLeaderInstance() {}

			@OnPubSubEvent('restart-event-bus', {
				instanceType: 'main',
				instanceRole: 'follower',
			})
			onFollowerInstance() {}

			@OnPubSubEvent('clear-test-webhooks')
			onAllInstances() {}
		}

		return TestService;
	};

	const workerInstanceSettings = mock<InstanceSettings>({ instanceType: 'worker' });
	const leaderInstanceSettings = mock<InstanceSettings>({
		instanceType: 'main',
		instanceRole: 'leader',
	});
	const followerInstanceSettings = mock<InstanceSettings>({
		instanceType: 'main',
		instanceRole: 'follower',
	});

	beforeEach(() => {
		jest.resetAllMocks();
		Container.reset();
		metadata = Container.get(PubSubMetadata);
		pubsubEventBus = Container.get(PubSubEventBus);
		logger = mockLogger();
	});

	it('should call decorated methods when events are emitted', async () => {
		const TestService = createTestServiceClass();
		const testService = Container.get(TestService);
		const onMainInstanceSpy = jest.spyOn(testService, 'onMainInstance');

		const pubSubHandler = new PubSubHandler(
			logger,
			leaderInstanceSettings,
			metadata,
			pubsubEventBus,
		);
		pubSubHandler.init();

		pubsubEventBus.emit('reload-external-secrets-providers');
		expect(onMainInstanceSpy).toHaveBeenCalledTimes(1);
	});

	it('should respect instance type filtering when handling events', async () => {
		const TestService = createTestServiceClass();
		const testService = Container.get(TestService);
		const onMainInstanceSpy = jest.spyOn(testService, 'onMainInstance');
		const onWorkerInstanceSpy = jest.spyOn(testService, 'onWorkerInstance');

		// Test with main leader instance
		const mainPubSubHandler = new PubSubHandler(
			logger,
			leaderInstanceSettings,
			metadata,
			pubsubEventBus,
		);
		mainPubSubHandler.init();

		pubsubEventBus.emit('reload-external-secrets-providers');
		expect(onMainInstanceSpy).toHaveBeenCalledTimes(1);
		pubsubEventBus.emit('restart-event-bus');
		expect(onWorkerInstanceSpy).not.toHaveBeenCalled();

		// Test with worker instance
		jest.clearAllMocks();
		pubsubEventBus.removeAllListeners();

		const workerPubSub = new PubSubHandler(
			logger,
			workerInstanceSettings,
			metadata,
			pubsubEventBus,
		);
		workerPubSub.init();

		pubsubEventBus.emit('reload-external-secrets-providers');
		expect(onMainInstanceSpy).not.toHaveBeenCalled();
		pubsubEventBus.emit('restart-event-bus');
		expect(onWorkerInstanceSpy).toHaveBeenCalledTimes(1);
	});

	it('should respect instance role filtering when handling events', async () => {
		const TestService = createTestServiceClass();
		const testService = Container.get(TestService);
		const onLeaderInstanceSpy = jest.spyOn(testService, 'onLeaderInstance');
		const onFollowerInstanceSpy = jest.spyOn(testService, 'onFollowerInstance');
		const onAllInstancesSpy = jest.spyOn(testService, 'onAllInstances');

		// Test with leader instance
		const pubSubHandler = new PubSubHandler(
			logger,
			leaderInstanceSettings,
			metadata,
			pubsubEventBus,
		);
		pubSubHandler.init();

		pubsubEventBus.emit('add-webhooks-triggers-and-pollers');
		expect(onLeaderInstanceSpy).toHaveBeenCalledTimes(1);

		pubsubEventBus.emit('restart-event-bus');
		expect(onFollowerInstanceSpy).not.toHaveBeenCalled();

		pubsubEventBus.emit('clear-test-webhooks');
		expect(onAllInstancesSpy).toHaveBeenCalledTimes(1);

		// Test with follower instance
		jest.clearAllMocks();
		pubsubEventBus.removeAllListeners();

		const followerPubSubHandler = new PubSubHandler(
			logger,
			followerInstanceSettings,
			metadata,
			pubsubEventBus,
		);
		followerPubSubHandler.init();

		pubsubEventBus.emit('add-webhooks-triggers-and-pollers');
		expect(onLeaderInstanceSpy).not.toHaveBeenCalled();

		pubsubEventBus.emit('restart-event-bus');
		expect(onFollowerInstanceSpy).toHaveBeenCalledTimes(1);

		pubsubEventBus.emit('clear-test-webhooks');
		expect(onAllInstancesSpy).toHaveBeenCalledTimes(1);
	});

	it('should handle both instance type and role filtering together', async () => {
		const TestService = createTestServiceClass();
		const testService = Container.get(TestService);
		const onLeaderInstanceSpy = jest.spyOn(testService, 'onLeaderInstance');

		// Test with main leader instance
		const pubSubHandler = new PubSubHandler(
			logger,
			leaderInstanceSettings,
			metadata,
			pubsubEventBus,
		);
		pubSubHandler.init();

		pubsubEventBus.emit('add-webhooks-triggers-and-pollers');
		expect(onLeaderInstanceSpy).toHaveBeenCalledTimes(1);
	});

	it('should handle dynamic role changes at runtime', async () => {
		const TestService = createTestServiceClass();
		const testService = Container.get(TestService);
		const onLeaderInstanceSpy = jest.spyOn(testService, 'onLeaderInstance');

		// Create a mutable instance settings object to simulate role changes
		const instanceSettings = mock<InstanceSettings>({
			instanceType: 'main',
			instanceRole: 'follower',
		});

		const pubSubHandler = new PubSubHandler(logger, instanceSettings, metadata, pubsubEventBus);
		pubSubHandler.init();

		// Initially as follower, event should be ignored
		pubsubEventBus.emit('add-webhooks-triggers-and-pollers');
		expect(onLeaderInstanceSpy).not.toHaveBeenCalled();

		// Change role to leader
		instanceSettings.instanceRole = 'leader';
		pubsubEventBus.emit('add-webhooks-triggers-and-pollers');
		expect(onLeaderInstanceSpy).toHaveBeenCalledTimes(1);

		// Change back to follower
		instanceSettings.instanceRole = 'follower';
		pubsubEventBus.emit('add-webhooks-triggers-and-pollers');
		expect(onLeaderInstanceSpy).toHaveBeenCalledTimes(1); // Still only called once
	});
});
