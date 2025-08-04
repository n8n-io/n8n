'use strict';
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const jest_mock_extended_1 = require('jest-mock-extended');
const concurrency_control_service_1 = require('@/concurrency/concurrency-control.service');
const config_1 = __importDefault(require('@/config'));
const invalid_concurrency_limit_error_1 = require('@/errors/invalid-concurrency-limit.error');
const concurrency_queue_1 = require('../concurrency-queue');
describe('ConcurrencyControlService', () => {
	const logger = (0, backend_test_utils_1.mockLogger)();
	const executionRepository = (0, jest_mock_extended_1.mock)();
	const telemetry = (0, jest_mock_extended_1.mock)();
	const eventService = (0, jest_mock_extended_1.mock)();
	const globalConfig = (0, jest_mock_extended_1.mock)();
	afterEach(() => {
		config_1.default.set('executions.concurrency.productionLimit', -1);
		config_1.default.set('executions.concurrency.evaluationLimit', -1);
		config_1.default.set('executions.mode', 'integrated');
		jest.clearAllMocks();
	});
	describe('constructor', () => {
		it.each(['production', 'evaluation'])('should be enabled if %s cap is positive', (type) => {
			config_1.default.set(`executions.concurrency.${type}Limit`, 1);
			const service = new concurrency_control_service_1.ConcurrencyControlService(
				logger,
				executionRepository,
				telemetry,
				eventService,
				globalConfig,
			);
			expect(service.isEnabled).toBe(true);
			expect(service.queues.get(type)).toBeDefined();
			expect(service.queues.size).toBe(1);
		});
		it.each(['production', 'evaluation'])('should throw if %s cap is 0', (type) => {
			config_1.default.set(`executions.concurrency.${type}Limit`, 0);
			try {
				new concurrency_control_service_1.ConcurrencyControlService(
					logger,
					executionRepository,
					telemetry,
					eventService,
					globalConfig,
				);
			} catch (error) {
				expect(error).toBeInstanceOf(
					invalid_concurrency_limit_error_1.InvalidConcurrencyLimitError,
				);
			}
		});
		it('should be disabled if both production and evaluation caps are -1', () => {
			config_1.default.set('executions.concurrency.productionLimit', -1);
			config_1.default.set('executions.concurrency.evaluationLimit', -1);
			const service = new concurrency_control_service_1.ConcurrencyControlService(
				logger,
				executionRepository,
				telemetry,
				eventService,
				globalConfig,
			);
			expect(service.isEnabled).toBe(false);
		});
		it.each(['production', 'evaluation'])(
			'should be disabled if %s cap is lower than -1',
			(type) => {
				config_1.default.set(`executions.concurrency.${type}Limit`, -2);
				const service = new concurrency_control_service_1.ConcurrencyControlService(
					logger,
					executionRepository,
					telemetry,
					eventService,
					globalConfig,
				);
				expect(service.isEnabled).toBe(false);
			},
		);
		it('should be disabled on queue mode', () => {
			config_1.default.set('executions.mode', 'queue');
			config_1.default.set('executions.concurrency.productionLimit', 2);
			const service = new concurrency_control_service_1.ConcurrencyControlService(
				logger,
				executionRepository,
				telemetry,
				eventService,
				globalConfig,
			);
			expect(service.isEnabled).toBe(false);
		});
	});
	describe('if enabled', () => {
		describe('throttle', () => {
			it.each(['cli', 'error', 'integrated', 'internal', 'manual', 'retry'])(
				'should do nothing on %s mode',
				async (mode) => {
					config_1.default.set('executions.concurrency.productionLimit', 1);
					const service = new concurrency_control_service_1.ConcurrencyControlService(
						logger,
						executionRepository,
						telemetry,
						eventService,
						globalConfig,
					);
					const enqueueSpy = jest.spyOn(concurrency_queue_1.ConcurrencyQueue.prototype, 'enqueue');
					await service.throttle({ mode, executionId: '1' });
					expect(enqueueSpy).not.toHaveBeenCalled();
				},
			);
			it.each(['webhook', 'trigger'])('should enqueue on %s mode', async (mode) => {
				config_1.default.set('executions.concurrency.productionLimit', 1);
				const service = new concurrency_control_service_1.ConcurrencyControlService(
					logger,
					executionRepository,
					telemetry,
					eventService,
					globalConfig,
				);
				const enqueueSpy = jest.spyOn(concurrency_queue_1.ConcurrencyQueue.prototype, 'enqueue');
				await service.throttle({ mode, executionId: '1' });
				expect(enqueueSpy).toHaveBeenCalled();
			});
			it('should enqueue on evaluation mode', async () => {
				config_1.default.set('executions.concurrency.evaluationLimit', 1);
				const service = new concurrency_control_service_1.ConcurrencyControlService(
					logger,
					executionRepository,
					telemetry,
					eventService,
					globalConfig,
				);
				const enqueueSpy = jest.spyOn(concurrency_queue_1.ConcurrencyQueue.prototype, 'enqueue');
				await service.throttle({ mode: 'evaluation', executionId: '1' });
				expect(enqueueSpy).toHaveBeenCalled();
			});
		});
		describe('release', () => {
			it.each(['cli', 'error', 'integrated', 'internal', 'manual', 'retry'])(
				'should do nothing on %s mode',
				async (mode) => {
					config_1.default.set('executions.concurrency.productionLimit', 1);
					const service = new concurrency_control_service_1.ConcurrencyControlService(
						logger,
						executionRepository,
						telemetry,
						eventService,
						globalConfig,
					);
					const dequeueSpy = jest.spyOn(concurrency_queue_1.ConcurrencyQueue.prototype, 'dequeue');
					await service.throttle({ mode, executionId: '1' });
					expect(dequeueSpy).not.toHaveBeenCalled();
				},
			);
			it.each(['webhook', 'trigger'])('should dequeue on %s mode', (mode) => {
				config_1.default.set('executions.concurrency.productionLimit', 1);
				const service = new concurrency_control_service_1.ConcurrencyControlService(
					logger,
					executionRepository,
					telemetry,
					eventService,
					globalConfig,
				);
				const dequeueSpy = jest.spyOn(concurrency_queue_1.ConcurrencyQueue.prototype, 'dequeue');
				service.release({ mode });
				expect(dequeueSpy).toHaveBeenCalled();
			});
			it('should dequeue on evaluation mode', () => {
				config_1.default.set('executions.concurrency.evaluationLimit', 1);
				const service = new concurrency_control_service_1.ConcurrencyControlService(
					logger,
					executionRepository,
					telemetry,
					eventService,
					globalConfig,
				);
				const dequeueSpy = jest.spyOn(concurrency_queue_1.ConcurrencyQueue.prototype, 'dequeue');
				service.release({ mode: 'evaluation' });
				expect(dequeueSpy).toHaveBeenCalled();
			});
		});
		describe('remove', () => {
			it.each(['cli', 'error', 'integrated', 'internal', 'manual', 'retry'])(
				'should do nothing on %s mode',
				async (mode) => {
					config_1.default.set('executions.concurrency.productionLimit', 1);
					const service = new concurrency_control_service_1.ConcurrencyControlService(
						logger,
						executionRepository,
						telemetry,
						eventService,
						globalConfig,
					);
					const removeSpy = jest.spyOn(concurrency_queue_1.ConcurrencyQueue.prototype, 'remove');
					await service.throttle({ mode, executionId: '1' });
					expect(removeSpy).not.toHaveBeenCalled();
				},
			);
			it.each(['webhook', 'trigger'])('should remove an execution on %s mode', (mode) => {
				config_1.default.set('executions.concurrency.productionLimit', 1);
				const service = new concurrency_control_service_1.ConcurrencyControlService(
					logger,
					executionRepository,
					telemetry,
					eventService,
					globalConfig,
				);
				const removeSpy = jest.spyOn(concurrency_queue_1.ConcurrencyQueue.prototype, 'remove');
				service.remove({ mode, executionId: '1' });
				expect(removeSpy).toHaveBeenCalled();
			});
			it('should remove an execution on evaluation mode', () => {
				config_1.default.set('executions.concurrency.evaluationLimit', 1);
				const service = new concurrency_control_service_1.ConcurrencyControlService(
					logger,
					executionRepository,
					telemetry,
					eventService,
					globalConfig,
				);
				const removeSpy = jest.spyOn(concurrency_queue_1.ConcurrencyQueue.prototype, 'remove');
				service.remove({ mode: 'evaluation', executionId: '1' });
				expect(removeSpy).toHaveBeenCalled();
			});
		});
		describe('removeAll', () => {
			it.each(['production', 'evaluation'])(
				'should remove all executions from the %s queue',
				async (type) => {
					config_1.default.set(`executions.concurrency.${type}Limit`, 2);
					const service = new concurrency_control_service_1.ConcurrencyControlService(
						logger,
						executionRepository,
						telemetry,
						eventService,
						globalConfig,
					);
					jest
						.spyOn(concurrency_queue_1.ConcurrencyQueue.prototype, 'getAll')
						.mockReturnValueOnce(new Set(['1', '2', '3']));
					const removeSpy = jest.spyOn(concurrency_queue_1.ConcurrencyQueue.prototype, 'remove');
					await service.removeAll(['1', '2', '3']);
					expect(removeSpy).toHaveBeenNthCalledWith(1, '1');
					expect(removeSpy).toHaveBeenNthCalledWith(2, '2');
					expect(removeSpy).toHaveBeenNthCalledWith(3, '3');
				},
			);
		});
		describe('get queue', () => {
			it('should choose the production queue', async () => {
				config_1.default.set('executions.concurrency.productionLimit', 2);
				config_1.default.set('executions.concurrency.evaluationLimit', 2);
				const service = new concurrency_control_service_1.ConcurrencyControlService(
					logger,
					executionRepository,
					telemetry,
					eventService,
					globalConfig,
				);
				const queue = service.getQueue('webhook');
				expect(queue).toEqual(service.queues.get('production'));
			});
			it('should choose the evaluation queue', async () => {
				config_1.default.set('executions.concurrency.productionLimit', 2);
				config_1.default.set('executions.concurrency.evaluationLimit', 2);
				const service = new concurrency_control_service_1.ConcurrencyControlService(
					logger,
					executionRepository,
					telemetry,
					eventService,
					globalConfig,
				);
				const queue = service.getQueue('evaluation');
				expect(queue).toEqual(service.queues.get('evaluation'));
			});
		});
	});
	describe('if disabled', () => {
		describe('throttle', () => {
			it('should do nothing', async () => {
				config_1.default.set('executions.concurrency.productionLimit', -1);
				const service = new concurrency_control_service_1.ConcurrencyControlService(
					logger,
					executionRepository,
					telemetry,
					eventService,
					globalConfig,
				);
				const enqueueSpy = jest.spyOn(concurrency_queue_1.ConcurrencyQueue.prototype, 'enqueue');
				await service.throttle({ mode: 'trigger', executionId: '1' });
				await service.throttle({ mode: 'webhook', executionId: '2' });
				expect(enqueueSpy).not.toHaveBeenCalled();
			});
			it('should do nothing for evaluation executions', async () => {
				config_1.default.set('executions.concurrency.evaluationLimit', -1);
				const service = new concurrency_control_service_1.ConcurrencyControlService(
					logger,
					executionRepository,
					telemetry,
					eventService,
					globalConfig,
				);
				const enqueueSpy = jest.spyOn(concurrency_queue_1.ConcurrencyQueue.prototype, 'enqueue');
				await service.throttle({ mode: 'evaluation', executionId: '1' });
				await service.throttle({ mode: 'evaluation', executionId: '2' });
				expect(enqueueSpy).not.toHaveBeenCalled();
			});
		});
		describe('release', () => {
			it('should do nothing', () => {
				config_1.default.set('executions.concurrency.productionLimit', -1);
				const service = new concurrency_control_service_1.ConcurrencyControlService(
					logger,
					executionRepository,
					telemetry,
					eventService,
					globalConfig,
				);
				const dequeueSpy = jest.spyOn(concurrency_queue_1.ConcurrencyQueue.prototype, 'dequeue');
				service.release({ mode: 'webhook' });
				expect(dequeueSpy).not.toHaveBeenCalled();
			});
			it('should do nothing for evaluation executions', () => {
				config_1.default.set('executions.concurrency.evaluationLimit', -1);
				const service = new concurrency_control_service_1.ConcurrencyControlService(
					logger,
					executionRepository,
					telemetry,
					eventService,
					globalConfig,
				);
				const dequeueSpy = jest.spyOn(concurrency_queue_1.ConcurrencyQueue.prototype, 'dequeue');
				service.release({ mode: 'evaluation' });
				expect(dequeueSpy).not.toHaveBeenCalled();
			});
		});
		describe('remove', () => {
			it('should do nothing', () => {
				config_1.default.set('executions.concurrency.productionLimit', -1);
				const service = new concurrency_control_service_1.ConcurrencyControlService(
					logger,
					executionRepository,
					telemetry,
					eventService,
					globalConfig,
				);
				const removeSpy = jest.spyOn(concurrency_queue_1.ConcurrencyQueue.prototype, 'remove');
				service.remove({ mode: 'webhook', executionId: '1' });
				expect(removeSpy).not.toHaveBeenCalled();
			});
			it('should do nothing for evaluation executions', () => {
				config_1.default.set('executions.concurrency.evaluationLimit', -1);
				const service = new concurrency_control_service_1.ConcurrencyControlService(
					logger,
					executionRepository,
					telemetry,
					eventService,
					globalConfig,
				);
				const removeSpy = jest.spyOn(concurrency_queue_1.ConcurrencyQueue.prototype, 'remove');
				service.remove({ mode: 'evaluation', executionId: '1' });
				expect(removeSpy).not.toHaveBeenCalled();
			});
		});
	});
	describe('telemetry', () => {
		describe('on cloud', () => {
			test.each(concurrency_control_service_1.CLOUD_TEMP_REPORTABLE_THRESHOLDS)(
				'for capacity %d, should report temp cloud threshold if reached',
				(threshold) => {
					config_1.default.set(
						'executions.concurrency.productionLimit',
						concurrency_control_service_1.CLOUD_TEMP_PRODUCTION_LIMIT,
					);
					globalConfig.deployment.type = 'cloud';
					const service = new concurrency_control_service_1.ConcurrencyControlService(
						logger,
						executionRepository,
						telemetry,
						eventService,
						globalConfig,
					);
					service.queues.get('production').emit('concurrency-check', {
						capacity: concurrency_control_service_1.CLOUD_TEMP_PRODUCTION_LIMIT - threshold,
					});
					expect(telemetry.track).toHaveBeenCalledWith('User hit concurrency limit', {
						threshold,
						concurrencyQueue: 'production',
					});
				},
			);
			test.each(concurrency_control_service_1.CLOUD_TEMP_REPORTABLE_THRESHOLDS.map((t) => t - 1))(
				'for capacity %d, should not report temp cloud threshold if not reached',
				(threshold) => {
					config_1.default.set(
						'executions.concurrency.productionLimit',
						concurrency_control_service_1.CLOUD_TEMP_PRODUCTION_LIMIT,
					);
					globalConfig.deployment.type = 'cloud';
					const service = new concurrency_control_service_1.ConcurrencyControlService(
						logger,
						executionRepository,
						telemetry,
						eventService,
						globalConfig,
					);
					service.queues.get('production').emit('concurrency-check', {
						capacity: concurrency_control_service_1.CLOUD_TEMP_PRODUCTION_LIMIT - threshold,
					});
					expect(telemetry.track).not.toHaveBeenCalledWith('User hit concurrency limit', {
						threshold,
					});
				},
			);
			test.each(concurrency_control_service_1.CLOUD_TEMP_REPORTABLE_THRESHOLDS.map((t) => t + 1))(
				'for capacity %d, should not report temp cloud threshold if exceeded',
				(threshold) => {
					config_1.default.set(
						'executions.concurrency.productionLimit',
						concurrency_control_service_1.CLOUD_TEMP_PRODUCTION_LIMIT,
					);
					globalConfig.deployment.type = 'cloud';
					const service = new concurrency_control_service_1.ConcurrencyControlService(
						logger,
						executionRepository,
						telemetry,
						eventService,
						globalConfig,
					);
					service.queues.get('production').emit('concurrency-check', {
						capacity: concurrency_control_service_1.CLOUD_TEMP_PRODUCTION_LIMIT - threshold,
					});
					expect(telemetry.track).not.toHaveBeenCalledWith('User hit concurrency limit', {
						threshold,
					});
				},
			);
		});
	});
});
//# sourceMappingURL=concurrency-control.service.test.js.map
