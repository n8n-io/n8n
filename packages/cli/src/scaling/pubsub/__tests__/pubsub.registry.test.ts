import { mockLogger } from '@n8n/backend-test-utils';
import { OnPubSubEvent, PubSubMetadata } from '@n8n/decorators';
import { Container, Service } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';

import { PubSubEventBus } from '../pubsub.eventbus';
import { PubSubRegistry } from '../pubsub.registry';

describe('PubSubRegistry', () => {
	let metadata: PubSubMetadata;
	let pubsubEventBus: PubSubEventBus;
	let logger: ReturnType<typeof mockLogger>;
	const workflowId = 'test-workflow-id';

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

	it('should call decorated methods when events are emitted', () => {
		const TestService = createTestServiceClass();
		const testService = Container.get(TestService);
		const onMainInstanceSpy = jest.spyOn(testService, 'onMainInstance');

		const pubSubRegistry = new PubSubRegistry(
			logger,
			leaderInstanceSettings,
			metadata,
			pubsubEventBus,
		);
		pubSubRegistry.init();

		pubsubEventBus.emit('reload-external-secrets-providers');
		expect(onMainInstanceSpy).toHaveBeenCalledTimes(1);
	});

	it('should respect instance type filtering when handling events', () => {
		const TestService = createTestServiceClass();
		const testService = Container.get(TestService);
		const onMainInstanceSpy = jest.spyOn(testService, 'onMainInstance');
		const onWorkerInstanceSpy = jest.spyOn(testService, 'onWorkerInstance');

		// Test with main leader instance
		const mainPubSubRegistry = new PubSubRegistry(
			logger,
			leaderInstanceSettings,
			metadata,
			pubsubEventBus,
		);
		mainPubSubRegistry.init();

		pubsubEventBus.emit('reload-external-secrets-providers');
		expect(onMainInstanceSpy).toHaveBeenCalledTimes(1);
		pubsubEventBus.emit('restart-event-bus');
		expect(onWorkerInstanceSpy).not.toHaveBeenCalled();

		// Test with worker instance
		jest.clearAllMocks();
		pubsubEventBus.removeAllListeners();

		const workerPubSub = new PubSubRegistry(
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

	it('should respect instance role filtering when handling events', () => {
		const TestService = createTestServiceClass();
		const testService = Container.get(TestService);
		const onLeaderInstanceSpy = jest.spyOn(testService, 'onLeaderInstance');
		const onFollowerInstanceSpy = jest.spyOn(testService, 'onFollowerInstance');
		const onAllInstancesSpy = jest.spyOn(testService, 'onAllInstances');

		// Test with leader instance
		const pubSubRegistry = new PubSubRegistry(
			logger,
			leaderInstanceSettings,
			metadata,
			pubsubEventBus,
		);
		pubSubRegistry.init();

		pubsubEventBus.emit('add-webhooks-triggers-and-pollers', { workflowId });
		expect(onLeaderInstanceSpy).toHaveBeenCalledTimes(1);
		expect(onLeaderInstanceSpy).toHaveBeenCalledWith({ workflowId });

		pubsubEventBus.emit('restart-event-bus');
		expect(onFollowerInstanceSpy).not.toHaveBeenCalled();

		pubsubEventBus.emit('clear-test-webhooks');
		expect(onAllInstancesSpy).toHaveBeenCalledTimes(1);

		// Test with follower instance
		jest.clearAllMocks();
		pubsubEventBus.removeAllListeners();

		const followerPubSubRegistry = new PubSubRegistry(
			logger,
			followerInstanceSettings,
			metadata,
			pubsubEventBus,
		);
		followerPubSubRegistry.init();

		pubsubEventBus.emit('add-webhooks-triggers-and-pollers', { workflowId });
		expect(onLeaderInstanceSpy).not.toHaveBeenCalled();

		pubsubEventBus.emit('restart-event-bus');
		expect(onFollowerInstanceSpy).toHaveBeenCalledTimes(1);

		pubsubEventBus.emit('clear-test-webhooks');
		expect(onAllInstancesSpy).toHaveBeenCalledTimes(1);
	});

	it('should handle both instance type and role filtering together', () => {
		const TestService = createTestServiceClass();
		const testService = Container.get(TestService);
		const onLeaderInstanceSpy = jest.spyOn(testService, 'onLeaderInstance');

		// Test with main leader instance
		const pubSubRegistry = new PubSubRegistry(
			logger,
			leaderInstanceSettings,
			metadata,
			pubsubEventBus,
		);
		pubSubRegistry.init();

		pubsubEventBus.emit('add-webhooks-triggers-and-pollers', { workflowId });
		expect(onLeaderInstanceSpy).toHaveBeenCalledTimes(1);
		expect(onLeaderInstanceSpy).toHaveBeenCalledWith({ workflowId });
	});

	it('should handle dynamic role changes at runtime', () => {
		const TestService = createTestServiceClass();
		const testService = Container.get(TestService);
		const onLeaderInstanceSpy = jest.spyOn(testService, 'onLeaderInstance');

		// Create a mutable instance settings object to simulate role changes
		const instanceSettings = mock<InstanceSettings>({
			instanceType: 'main',
			instanceRole: 'follower',
		});

		const pubSubRegistry = new PubSubRegistry(logger, instanceSettings, metadata, pubsubEventBus);
		pubSubRegistry.init();

		// Initially as follower, event should be ignored
		pubsubEventBus.emit('add-webhooks-triggers-and-pollers', { workflowId });
		expect(onLeaderInstanceSpy).not.toHaveBeenCalled();

		// Change role to leader
		instanceSettings.instanceRole = 'leader';
		pubsubEventBus.emit('add-webhooks-triggers-and-pollers', { workflowId });
		expect(onLeaderInstanceSpy).toHaveBeenCalledTimes(1);
		expect(onLeaderInstanceSpy).toHaveBeenCalledWith({ workflowId });

		// Change back to follower
		onLeaderInstanceSpy.mockClear();
		instanceSettings.instanceRole = 'follower';
		pubsubEventBus.emit('add-webhooks-triggers-and-pollers', { workflowId });
		expect(onLeaderInstanceSpy).not.toHaveBeenCalled();
	});

	it('should clean up event handlers when reinitializing', () => {
		const TestService = createTestServiceClass();
		const testService = Container.get(TestService);
		const onMainInstanceSpy = jest.spyOn(testService, 'onMainInstance');

		const pubSubRegistry = new PubSubRegistry(
			logger,
			leaderInstanceSettings,
			metadata,
			pubsubEventBus,
		);

		// First initialization
		pubSubRegistry.init();

		// Emit event to verify handler is registered
		pubsubEventBus.emit('reload-external-secrets-providers');
		expect(onMainInstanceSpy).toHaveBeenCalledTimes(1);

		// Reinitialize - should clean up previous handlers
		onMainInstanceSpy.mockClear();
		pubSubRegistry.init();

		// Emit event again - should only be called once (not twice due to duplicate handlers)
		pubsubEventBus.emit('reload-external-secrets-providers');
		expect(onMainInstanceSpy).toHaveBeenCalledTimes(1);
	});

	it('should handle multiple reinitializations without memory leaks', () => {
		const TestService = createTestServiceClass();
		const testService = Container.get(TestService);
		const onAllInstancesSpy = jest.spyOn(testService, 'onAllInstances');

		const pubSubRegistry = new PubSubRegistry(
			logger,
			leaderInstanceSettings,
			metadata,
			pubsubEventBus,
		);

		// Multiple initializations
		for (let i = 0; i < 5; i++) {
			pubSubRegistry.init();
		}

		// Event should only trigger once per emission, not 5 times
		pubsubEventBus.emit('clear-test-webhooks');
		expect(onAllInstancesSpy).toHaveBeenCalledTimes(1);
	});
});
