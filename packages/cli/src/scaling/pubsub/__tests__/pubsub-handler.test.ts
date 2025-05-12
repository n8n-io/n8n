import type { InstanceRole, InstanceType } from '@n8n/constants';
import { OnPubSubEvent, PubSubMetadata } from '@n8n/decorators';
import type { PubSubEventName } from '@n8n/decorators';
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
			async reloadProviders() {}

			@OnPubSubEvent('restart-event-bus', { instanceType: 'worker' })
			async restartEventBus() {}

			@OnPubSubEvent('reload-external-secrets-providers', { instanceRole: 'leader' })
			async leaderOnly() {}

			@OnPubSubEvent('restart-event-bus', { instanceRole: 'follower' })
			async followerOnly() {}

			@OnPubSubEvent('community-package-install')
			async unsetRoleOnly() {}

			@OnPubSubEvent('clear-test-webhooks')
			async noRoleFilter() {}

			@OnPubSubEvent('reload-external-secrets-providers', {
				instanceType: 'main',
				instanceRole: 'leader',
			})
			async mainLeaderOnly() {}

			@OnPubSubEvent('reload-external-secrets-providers', { instanceRole: 'unset' })
			async unsetRoleHandler() {}
		}

		return TestService;
	};

	const createInstanceSettings = (
		instanceType: InstanceType,
		instanceRole: InstanceRole = 'unset',
	) => mock<InstanceSettings>({ instanceType, instanceRole });

	const createPubSubHandler = (instanceSettings: InstanceSettings) =>
		new PubSubHandler(logger, instanceSettings, metadata, pubsubEventBus);

	const emitAndVerify = (
		eventName: PubSubEventName,
		handlerMethod: jest.SpyInstance,
		expectedCallCount: number,
	) => {
		pubsubEventBus.emit(eventName);
		expect(handlerMethod).toHaveBeenCalledTimes(expectedCallCount);
	};

	// Helper function to clean up between tests
	const cleanup = () => {
		jest.clearAllMocks();
		pubsubEventBus.removeAllListeners();
	};

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
		const reloadProvidersSpy = jest.spyOn(testService, 'reloadProviders');

		const pubSubHandler = createPubSubHandler(createInstanceSettings('main'));
		pubSubHandler.init();

		emitAndVerify('reload-external-secrets-providers', reloadProvidersSpy, 1);
	});

	it('should respect instance type filtering when handling events', async () => {
		const TestService = createTestServiceClass();
		const testService = Container.get(TestService);
		const reloadProvidersSpy = jest.spyOn(testService, 'reloadProviders');
		const restartEventBusSpy = jest.spyOn(testService, 'restartEventBus');

		// Test with main instance
		const mainPubSubHandler = createPubSubHandler(createInstanceSettings('main'));
		mainPubSubHandler.init();

		emitAndVerify('reload-external-secrets-providers', reloadProvidersSpy, 1);
		emitAndVerify('restart-event-bus', restartEventBusSpy, 0);

		cleanup();

		// Test with worker instance
		const workerPubSub = createPubSubHandler(createInstanceSettings('worker'));
		workerPubSub.init();

		emitAndVerify('reload-external-secrets-providers', reloadProvidersSpy, 0);
		emitAndVerify('restart-event-bus', restartEventBusSpy, 1);
	});

	it('should respect instance role filtering when handling events', async () => {
		const TestService = createTestServiceClass();
		const testService = Container.get(TestService);
		const leaderOnlySpy = jest.spyOn(testService, 'leaderOnly');
		const followerOnlySpy = jest.spyOn(testService, 'followerOnly');
		const unsetRoleOnlySpy = jest.spyOn(testService, 'unsetRoleOnly');
		const noRoleFilterSpy = jest.spyOn(testService, 'noRoleFilter');

		// Test with leader instance
		const pubSubHandler = createPubSubHandler(createInstanceSettings('main', 'leader'));
		pubSubHandler.init();

		const events: Array<[PubSubEventName, jest.SpyInstance, number]> = [
			['reload-external-secrets-providers', leaderOnlySpy, 1],
			['restart-event-bus', followerOnlySpy, 0],
			['community-package-install', unsetRoleOnlySpy, 1],
			['clear-test-webhooks', noRoleFilterSpy, 1],
		];

		for (const [event, spy, count] of events) {
			emitAndVerify(event, spy, count);
		}

		cleanup();

		// Test with follower instance
		const followerPubSubHandler = createPubSubHandler(createInstanceSettings('main', 'follower'));
		followerPubSubHandler.init();

		const followerEvents: Array<[PubSubEventName, jest.SpyInstance, number]> = [
			['reload-external-secrets-providers', leaderOnlySpy, 0],
			['restart-event-bus', followerOnlySpy, 1],
			['community-package-install', unsetRoleOnlySpy, 1],
			['clear-test-webhooks', noRoleFilterSpy, 1],
		];

		for (const [event, spy, count] of followerEvents) {
			emitAndVerify(event, spy, count);
		}
	});

	it('should handle both instance type and role filtering together', async () => {
		const TestService = createTestServiceClass();
		const testService = Container.get(TestService);
		const mainLeaderOnlySpy = jest.spyOn(testService, 'mainLeaderOnly');

		// Test with main+leader instance
		const pubSubHandler = createPubSubHandler(createInstanceSettings('main', 'leader'));
		pubSubHandler.init();

		emitAndVerify('reload-external-secrets-providers', mainLeaderOnlySpy, 1);

		cleanup();

		// Test with worker+leader instance
		const workerPubSubHandler = createPubSubHandler(createInstanceSettings('worker', 'leader'));
		workerPubSubHandler.init();

		emitAndVerify('reload-external-secrets-providers', mainLeaderOnlySpy, 0);
	});

	it('should handle dynamic role changes at runtime', async () => {
		const TestService = createTestServiceClass();
		const testService = Container.get(TestService);
		const leaderOnlySpy = jest.spyOn(testService, 'leaderOnly');

		// Create a mutable instance settings object to simulate role changes
		const instanceSettings = createInstanceSettings('main', 'follower');

		const pubSubHandler = createPubSubHandler(instanceSettings);
		pubSubHandler.init();

		// Initially as follower, event should be ignored
		emitAndVerify('reload-external-secrets-providers', leaderOnlySpy, 0);

		// Change role to leader
		instanceSettings.instanceRole = 'leader';
		emitAndVerify('reload-external-secrets-providers', leaderOnlySpy, 1);

		// Change back to follower
		instanceSettings.instanceRole = 'follower';
		emitAndVerify('reload-external-secrets-providers', leaderOnlySpy, 1); // Still only called once
	});

	it('should handle the unset role correctly', async () => {
		const TestService = createTestServiceClass();
		const testService = Container.get(TestService);
		const unsetRoleHandlerSpy = jest.spyOn(testService, 'unsetRoleHandler');

		// Test with unset role instance
		const pubSubHandler = createPubSubHandler(createInstanceSettings('main', 'unset'));
		pubSubHandler.init();

		emitAndVerify('reload-external-secrets-providers', unsetRoleHandlerSpy, 1);

		cleanup();

		// Test with leader role instance - should not trigger unset-only handlers
		const leaderPubSubHandler = createPubSubHandler(createInstanceSettings('main', 'leader'));
		leaderPubSubHandler.init();

		emitAndVerify('reload-external-secrets-providers', unsetRoleHandlerSpy, 0);
	});
});
