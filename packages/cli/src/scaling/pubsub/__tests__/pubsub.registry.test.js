'use strict';
var __decorate =
	(this && this.__decorate) ||
	function (decorators, target, key, desc) {
		var c = arguments.length,
			r =
				c < 3
					? target
					: desc === null
						? (desc = Object.getOwnPropertyDescriptor(target, key))
						: desc,
			d;
		if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
			r = Reflect.decorate(decorators, target, key, desc);
		else
			for (var i = decorators.length - 1; i >= 0; i--)
				if ((d = decorators[i]))
					r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
		return c > 3 && r && Object.defineProperty(target, key, r), r;
	};
var __metadata =
	(this && this.__metadata) ||
	function (k, v) {
		if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
			return Reflect.metadata(k, v);
	};
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const decorators_1 = require('@n8n/decorators');
const di_1 = require('@n8n/di');
const jest_mock_extended_1 = require('jest-mock-extended');
const pubsub_eventbus_1 = require('../pubsub.eventbus');
const pubsub_registry_1 = require('../pubsub.registry');
describe('PubSubRegistry', () => {
	let metadata;
	let pubsubEventBus;
	let logger;
	const workflowId = 'test-workflow-id';
	const createTestServiceClass = () => {
		let TestService = class TestService {
			onMainInstance() {}
			onWorkerInstance() {}
			onLeaderInstance() {}
			onFollowerInstance() {}
			onAllInstances() {}
		};
		__decorate(
			[
				(0, decorators_1.OnPubSubEvent)('reload-external-secrets-providers', {
					instanceType: 'main',
				}),
				__metadata('design:type', Function),
				__metadata('design:paramtypes', []),
				__metadata('design:returntype', void 0),
			],
			TestService.prototype,
			'onMainInstance',
			null,
		);
		__decorate(
			[
				(0, decorators_1.OnPubSubEvent)('restart-event-bus', { instanceType: 'worker' }),
				__metadata('design:type', Function),
				__metadata('design:paramtypes', []),
				__metadata('design:returntype', void 0),
			],
			TestService.prototype,
			'onWorkerInstance',
			null,
		);
		__decorate(
			[
				(0, decorators_1.OnPubSubEvent)('add-webhooks-triggers-and-pollers', {
					instanceType: 'main',
					instanceRole: 'leader',
				}),
				__metadata('design:type', Function),
				__metadata('design:paramtypes', []),
				__metadata('design:returntype', void 0),
			],
			TestService.prototype,
			'onLeaderInstance',
			null,
		);
		__decorate(
			[
				(0, decorators_1.OnPubSubEvent)('restart-event-bus', {
					instanceType: 'main',
					instanceRole: 'follower',
				}),
				__metadata('design:type', Function),
				__metadata('design:paramtypes', []),
				__metadata('design:returntype', void 0),
			],
			TestService.prototype,
			'onFollowerInstance',
			null,
		);
		__decorate(
			[
				(0, decorators_1.OnPubSubEvent)('clear-test-webhooks'),
				__metadata('design:type', Function),
				__metadata('design:paramtypes', []),
				__metadata('design:returntype', void 0),
			],
			TestService.prototype,
			'onAllInstances',
			null,
		);
		TestService = __decorate([(0, di_1.Service)()], TestService);
		return TestService;
	};
	const workerInstanceSettings = (0, jest_mock_extended_1.mock)({ instanceType: 'worker' });
	const leaderInstanceSettings = (0, jest_mock_extended_1.mock)({
		instanceType: 'main',
		instanceRole: 'leader',
	});
	const followerInstanceSettings = (0, jest_mock_extended_1.mock)({
		instanceType: 'main',
		instanceRole: 'follower',
	});
	beforeEach(() => {
		jest.resetAllMocks();
		di_1.Container.reset();
		metadata = di_1.Container.get(decorators_1.PubSubMetadata);
		pubsubEventBus = di_1.Container.get(pubsub_eventbus_1.PubSubEventBus);
		logger = (0, backend_test_utils_1.mockLogger)();
	});
	it('should call decorated methods when events are emitted', () => {
		const TestService = createTestServiceClass();
		const testService = di_1.Container.get(TestService);
		const onMainInstanceSpy = jest.spyOn(testService, 'onMainInstance');
		const pubSubRegistry = new pubsub_registry_1.PubSubRegistry(
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
		const testService = di_1.Container.get(TestService);
		const onMainInstanceSpy = jest.spyOn(testService, 'onMainInstance');
		const onWorkerInstanceSpy = jest.spyOn(testService, 'onWorkerInstance');
		const mainPubSubRegistry = new pubsub_registry_1.PubSubRegistry(
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
		jest.clearAllMocks();
		pubsubEventBus.removeAllListeners();
		const workerPubSub = new pubsub_registry_1.PubSubRegistry(
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
		const testService = di_1.Container.get(TestService);
		const onLeaderInstanceSpy = jest.spyOn(testService, 'onLeaderInstance');
		const onFollowerInstanceSpy = jest.spyOn(testService, 'onFollowerInstance');
		const onAllInstancesSpy = jest.spyOn(testService, 'onAllInstances');
		const pubSubRegistry = new pubsub_registry_1.PubSubRegistry(
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
		jest.clearAllMocks();
		pubsubEventBus.removeAllListeners();
		const followerPubSubRegistry = new pubsub_registry_1.PubSubRegistry(
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
		const testService = di_1.Container.get(TestService);
		const onLeaderInstanceSpy = jest.spyOn(testService, 'onLeaderInstance');
		const pubSubRegistry = new pubsub_registry_1.PubSubRegistry(
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
		const testService = di_1.Container.get(TestService);
		const onLeaderInstanceSpy = jest.spyOn(testService, 'onLeaderInstance');
		const instanceSettings = (0, jest_mock_extended_1.mock)({
			instanceType: 'main',
			instanceRole: 'follower',
		});
		const pubSubRegistry = new pubsub_registry_1.PubSubRegistry(
			logger,
			instanceSettings,
			metadata,
			pubsubEventBus,
		);
		pubSubRegistry.init();
		pubsubEventBus.emit('add-webhooks-triggers-and-pollers', { workflowId });
		expect(onLeaderInstanceSpy).not.toHaveBeenCalled();
		instanceSettings.instanceRole = 'leader';
		pubsubEventBus.emit('add-webhooks-triggers-and-pollers', { workflowId });
		expect(onLeaderInstanceSpy).toHaveBeenCalledTimes(1);
		expect(onLeaderInstanceSpy).toHaveBeenCalledWith({ workflowId });
		onLeaderInstanceSpy.mockClear();
		instanceSettings.instanceRole = 'follower';
		pubsubEventBus.emit('add-webhooks-triggers-and-pollers', { workflowId });
		expect(onLeaderInstanceSpy).not.toHaveBeenCalled();
	});
});
//# sourceMappingURL=pubsub.registry.test.js.map
