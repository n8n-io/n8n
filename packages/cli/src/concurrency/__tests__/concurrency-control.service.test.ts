import { mockLogger } from '@n8n/backend-test-utils';
import type { GlobalConfig } from '@n8n/config';
import type { ExecutionRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type { WorkflowExecuteMode as ExecutionMode } from 'n8n-workflow';

import type { ConcurrencyQueueType } from '@/concurrency/concurrency-control.service';
import {
	CLOUD_TEMP_PRODUCTION_LIMIT,
	CLOUD_TEMP_REPORTABLE_THRESHOLDS,
	ConcurrencyControlService,
} from '@/concurrency/concurrency-control.service';
import config from '@/config';
import { InvalidConcurrencyLimitError } from '@/errors/invalid-concurrency-limit.error';
import type { EventService } from '@/events/event.service';
import type { Telemetry } from '@/telemetry';

import { ConcurrencyQueue } from '../concurrency-queue';

describe('ConcurrencyControlService', () => {
	const logger = mockLogger();
	const executionRepository = mock<ExecutionRepository>();
	const telemetry = mock<Telemetry>();
	const eventService = mock<EventService>();
	const globalConfig = mock<GlobalConfig>({
		executions: {
			concurrency: {
				productionLimit: -1,
				evaluationLimit: -1,
			},
		},
	});

	afterEach(() => {
		globalConfig.executions.concurrency.productionLimit = -1;
		globalConfig.executions.concurrency.evaluationLimit = -1;
		config.set('executions.mode', 'integrated');

		jest.clearAllMocks();
	});

	describe('constructor', () => {
		it.each(['production', 'evaluation'])(
			'should be enabled if %s cap is positive',
			(type: ConcurrencyQueueType) => {
				/**
				 * Arrange
				 */
				// @ts-expect-error Testing
				globalConfig.executions.concurrency[type + 'Limit'] = 1;

				/**
				 * Act
				 */
				const service = new ConcurrencyControlService(
					logger,
					executionRepository,
					telemetry,
					eventService,
					globalConfig,
				);

				/**
				 * Assert
				 */
				// @ts-expect-error Private property
				expect(service.isEnabled).toBe(true);
				// @ts-expect-error Private property
				expect(service.queues.get(type)).toBeDefined();
				// @ts-expect-error Private property
				expect(service.queues.size).toBe(1);
			},
		);

		it.each(['production', 'evaluation'])(
			'should throw if %s cap is 0',
			(type: ConcurrencyQueueType) => {
				/**
				 * Arrange
				 */
				// @ts-expect-error Testing
				globalConfig.executions.concurrency[type + 'Limit'] = 0;

				try {
					/**
					 * Act
					 */
					new ConcurrencyControlService(
						logger,
						executionRepository,
						telemetry,
						eventService,
						globalConfig,
					);
				} catch (error) {
					/**
					 * Assert
					 */
					expect(error).toBeInstanceOf(InvalidConcurrencyLimitError);
				}
			},
		);

		it('should be disabled if both production and evaluation caps are -1', () => {
			/**
			 * Arrange
			 */
			globalConfig.executions.concurrency.productionLimit = -1;
			globalConfig.executions.concurrency.evaluationLimit = -1;

			/**
			 * Act
			 */
			const service = new ConcurrencyControlService(
				logger,
				executionRepository,
				telemetry,
				eventService,
				globalConfig,
			);

			/**
			 * Assert
			 */
			// @ts-expect-error Private property
			expect(service.isEnabled).toBe(false);
		});

		it.each(['production', 'evaluation'])(
			'should be disabled if %s cap is lower than -1',
			(type: ConcurrencyQueueType) => {
				/**
				 * Arrange
				 */
				// @ts-expect-error Testing
				globalConfig.executions.concurrency[type + 'Limit'] = -2;

				/**
				 * Act
				 */
				const service = new ConcurrencyControlService(
					logger,
					executionRepository,
					telemetry,
					eventService,
					globalConfig,
				);

				/**
				 * Act
				 */
				// @ts-expect-error Private property
				expect(service.isEnabled).toBe(false);
			},
		);

		it('should be disabled on queue mode', () => {
			/**
			 * Arrange
			 */
			config.set('executions.mode', 'queue');
			globalConfig.executions.concurrency.productionLimit = 2;

			/**
			 * Act
			 */
			const service = new ConcurrencyControlService(
				logger,
				executionRepository,
				telemetry,
				eventService,
				globalConfig,
			);

			/**
			 * Assert
			 */
			// @ts-expect-error Private property
			expect(service.isEnabled).toBe(false);
		});
	});

	// ----------------------------------
	//             enabled
	// ----------------------------------

	describe('if enabled', () => {
		describe('throttle', () => {
			it.each(['cli', 'error', 'integrated', 'internal', 'manual', 'retry'])(
				'should do nothing on %s mode',
				async (mode: ExecutionMode) => {
					/**
					 * Arrange
					 */
					globalConfig.executions.concurrency.productionLimit = 1;

					const service = new ConcurrencyControlService(
						logger,
						executionRepository,
						telemetry,
						eventService,
						globalConfig,
					);
					const enqueueSpy = jest.spyOn(ConcurrencyQueue.prototype, 'enqueue');

					/**
					 * Act
					 */
					await service.throttle({ mode, executionId: '1' });

					/**
					 * Assert
					 */
					expect(enqueueSpy).not.toHaveBeenCalled();
				},
			);

			it.each(['webhook', 'trigger'])('should enqueue on %s mode', async (mode: ExecutionMode) => {
				/**
				 * Arrange
				 */
				globalConfig.executions.concurrency.productionLimit = 1;

				const service = new ConcurrencyControlService(
					logger,
					executionRepository,
					telemetry,
					eventService,
					globalConfig,
				);
				const enqueueSpy = jest.spyOn(ConcurrencyQueue.prototype, 'enqueue');

				/**
				 * Act
				 */
				await service.throttle({ mode, executionId: '1' });

				/**
				 * Assert
				 */
				expect(enqueueSpy).toHaveBeenCalled();
			});

			it('should enqueue on evaluation mode', async () => {
				/**
				 * Arrange
				 */
				globalConfig.executions.concurrency.evaluationLimit = 1;

				const service = new ConcurrencyControlService(
					logger,
					executionRepository,
					telemetry,
					eventService,
					globalConfig,
				);
				const enqueueSpy = jest.spyOn(ConcurrencyQueue.prototype, 'enqueue');

				/**
				 * Act
				 */
				await service.throttle({ mode: 'evaluation', executionId: '1' });

				/**
				 * Assert
				 */
				expect(enqueueSpy).toHaveBeenCalled();
			});
		});

		describe('release', () => {
			it.each(['cli', 'error', 'integrated', 'internal', 'manual', 'retry'])(
				'should do nothing on %s mode',
				async (mode: ExecutionMode) => {
					/**
					 * Arrange
					 */
					globalConfig.executions.concurrency.evaluationLimit = 1;

					const service = new ConcurrencyControlService(
						logger,
						executionRepository,
						telemetry,
						eventService,
						globalConfig,
					);
					const dequeueSpy = jest.spyOn(ConcurrencyQueue.prototype, 'dequeue');

					/**
					 * Act
					 */
					await service.throttle({ mode, executionId: '1' });

					/**
					 * Assert
					 */
					expect(dequeueSpy).not.toHaveBeenCalled();
				},
			);

			it.each(['webhook', 'trigger'])('should dequeue on %s mode', (mode: ExecutionMode) => {
				/**
				 * Arrange
				 */
				globalConfig.executions.concurrency.productionLimit = 1;

				const service = new ConcurrencyControlService(
					logger,
					executionRepository,
					telemetry,
					eventService,
					globalConfig,
				);
				const dequeueSpy = jest.spyOn(ConcurrencyQueue.prototype, 'dequeue');

				/**
				 * Act
				 */
				service.release({ mode });

				/**
				 * Assert
				 */
				expect(dequeueSpy).toHaveBeenCalled();
			});

			it('should dequeue on evaluation mode', () => {
				/**
				 * Arrange
				 */
				globalConfig.executions.concurrency.evaluationLimit = 1;

				const service = new ConcurrencyControlService(
					logger,
					executionRepository,
					telemetry,
					eventService,
					globalConfig,
				);
				const dequeueSpy = jest.spyOn(ConcurrencyQueue.prototype, 'dequeue');

				/**
				 * Act
				 */
				service.release({ mode: 'evaluation' });

				/**
				 * Assert
				 */
				expect(dequeueSpy).toHaveBeenCalled();
			});
		});

		describe('remove', () => {
			it.each(['cli', 'error', 'integrated', 'internal', 'manual', 'retry'])(
				'should do nothing on %s mode',
				async (mode: ExecutionMode) => {
					/**
					 * Arrange
					 */
					globalConfig.executions.concurrency.productionLimit = 1;

					const service = new ConcurrencyControlService(
						logger,
						executionRepository,
						telemetry,
						eventService,
						globalConfig,
					);
					const removeSpy = jest.spyOn(ConcurrencyQueue.prototype, 'remove');

					/**
					 * Act
					 */
					await service.throttle({ mode, executionId: '1' });

					/**
					 * Assert
					 */
					expect(removeSpy).not.toHaveBeenCalled();
				},
			);

			it.each(['webhook', 'trigger'])(
				'should remove an execution on %s mode',
				(mode: ExecutionMode) => {
					/**
					 * Arrange
					 */
					globalConfig.executions.concurrency.productionLimit = 1;

					const service = new ConcurrencyControlService(
						logger,
						executionRepository,
						telemetry,
						eventService,
						globalConfig,
					);
					const removeSpy = jest.spyOn(ConcurrencyQueue.prototype, 'remove');

					/**
					 * Act
					 */
					service.remove({ mode, executionId: '1' });

					/**
					 * Assert
					 */
					expect(removeSpy).toHaveBeenCalled();
				},
			);

			it('should remove an execution on evaluation mode', () => {
				/**
				 * Arrange
				 */
				globalConfig.executions.concurrency.evaluationLimit = 1;

				const service = new ConcurrencyControlService(
					logger,
					executionRepository,
					telemetry,
					eventService,
					globalConfig,
				);
				const removeSpy = jest.spyOn(ConcurrencyQueue.prototype, 'remove');

				/**
				 * Act
				 */
				service.remove({ mode: 'evaluation', executionId: '1' });

				/**
				 * Assert
				 */
				expect(removeSpy).toHaveBeenCalled();
			});
		});

		describe('removeAll', () => {
			it.each(['production', 'evaluation'])(
				'should remove all executions from the %s queue',
				async (type: ConcurrencyQueueType) => {
					/**
					 * Arrange
					 */
					// @ts-expect-error Testing
					globalConfig.executions.concurrency[type + 'Limit'] = 2;

					const service = new ConcurrencyControlService(
						logger,
						executionRepository,
						telemetry,
						eventService,
						globalConfig,
					);

					jest
						.spyOn(ConcurrencyQueue.prototype, 'getAll')
						.mockReturnValueOnce(new Set(['1', '2', '3']));

					const removeSpy = jest.spyOn(ConcurrencyQueue.prototype, 'remove');

					/**
					 * Act
					 */
					await service.removeAll(['1', '2', '3']);

					/**
					 * Assert
					 */
					expect(removeSpy).toHaveBeenNthCalledWith(1, '1');
					expect(removeSpy).toHaveBeenNthCalledWith(2, '2');
					expect(removeSpy).toHaveBeenNthCalledWith(3, '3');
				},
			);
		});

		describe('get queue', () => {
			it('should choose the production queue', async () => {
				/**
				 * Arrange
				 */
				globalConfig.executions.concurrency.productionLimit = 2;
				globalConfig.executions.concurrency.evaluationLimit = 2;

				/**
				 * Act
				 */
				const service = new ConcurrencyControlService(
					logger,
					executionRepository,
					telemetry,
					eventService,
					globalConfig,
				);
				// @ts-expect-error Private property
				const queue = service.getQueue('webhook');

				/**
				 * Assert
				 */
				// @ts-expect-error Private property
				expect(queue).toEqual(service.queues.get('production'));
			});

			it('should choose the evaluation queue', async () => {
				/**
				 * Arrange
				 */
				globalConfig.executions.concurrency.productionLimit = 2;
				globalConfig.executions.concurrency.evaluationLimit = 2;

				/**
				 * Act
				 */
				const service = new ConcurrencyControlService(
					logger,
					executionRepository,
					telemetry,
					eventService,
					globalConfig,
				);
				// @ts-expect-error Private property
				const queue = service.getQueue('evaluation');

				/**
				 * Assert
				 */
				// @ts-expect-error Private property
				expect(queue).toEqual(service.queues.get('evaluation'));
			});
		});
	});

	// ----------------------------------
	//            disabled
	// ----------------------------------

	describe('if disabled', () => {
		describe('throttle', () => {
			it('should do nothing', async () => {
				/**
				 * Arrange
				 */
				globalConfig.executions.concurrency.productionLimit = -1;

				const service = new ConcurrencyControlService(
					logger,
					executionRepository,
					telemetry,
					eventService,
					globalConfig,
				);
				const enqueueSpy = jest.spyOn(ConcurrencyQueue.prototype, 'enqueue');

				/**
				 * Act
				 */
				await service.throttle({ mode: 'trigger', executionId: '1' });
				await service.throttle({ mode: 'webhook', executionId: '2' });

				/**
				 * Assert
				 */
				expect(enqueueSpy).not.toHaveBeenCalled();
			});

			it('should do nothing for evaluation executions', async () => {
				/**
				 * Arrange
				 */
				globalConfig.executions.concurrency.evaluationLimit = -1;

				const service = new ConcurrencyControlService(
					logger,
					executionRepository,
					telemetry,
					eventService,
					globalConfig,
				);
				const enqueueSpy = jest.spyOn(ConcurrencyQueue.prototype, 'enqueue');

				/**
				 * Act
				 */
				await service.throttle({ mode: 'evaluation', executionId: '1' });
				await service.throttle({ mode: 'evaluation', executionId: '2' });

				/**
				 * Assert
				 */
				expect(enqueueSpy).not.toHaveBeenCalled();
			});
		});

		describe('release', () => {
			it('should do nothing', () => {
				/**
				 * Arrange
				 */
				globalConfig.executions.concurrency.evaluationLimit = -1;

				const service = new ConcurrencyControlService(
					logger,
					executionRepository,
					telemetry,
					eventService,
					globalConfig,
				);
				const dequeueSpy = jest.spyOn(ConcurrencyQueue.prototype, 'dequeue');

				/**
				 * Act
				 */
				service.release({ mode: 'webhook' });

				/**
				 * Assert
				 */
				expect(dequeueSpy).not.toHaveBeenCalled();
			});

			it('should do nothing for evaluation executions', () => {
				/**
				 * Arrange
				 */
				globalConfig.executions.concurrency.evaluationLimit = -1;

				const service = new ConcurrencyControlService(
					logger,
					executionRepository,
					telemetry,
					eventService,
					globalConfig,
				);
				const dequeueSpy = jest.spyOn(ConcurrencyQueue.prototype, 'dequeue');

				/**
				 * Act
				 */
				service.release({ mode: 'evaluation' });

				/**
				 * Assert
				 */
				expect(dequeueSpy).not.toHaveBeenCalled();
			});
		});

		describe('remove', () => {
			it('should do nothing', () => {
				/**
				 * Arrange
				 */
				globalConfig.executions.concurrency.productionLimit = -1;

				const service = new ConcurrencyControlService(
					logger,
					executionRepository,
					telemetry,
					eventService,
					globalConfig,
				);
				const removeSpy = jest.spyOn(ConcurrencyQueue.prototype, 'remove');

				/**
				 * Act
				 */
				service.remove({ mode: 'webhook', executionId: '1' });

				/**
				 * Assert
				 */
				expect(removeSpy).not.toHaveBeenCalled();
			});

			it('should do nothing for evaluation executions', () => {
				/**
				 * Arrange
				 */
				globalConfig.executions.concurrency.evaluationLimit = -1;

				const service = new ConcurrencyControlService(
					logger,
					executionRepository,
					telemetry,
					eventService,
					globalConfig,
				);
				const removeSpy = jest.spyOn(ConcurrencyQueue.prototype, 'remove');

				/**
				 * Act
				 */
				service.remove({ mode: 'evaluation', executionId: '1' });

				/**
				 * Assert
				 */
				expect(removeSpy).not.toHaveBeenCalled();
			});
		});
	});

	// ----------------------------------
	//            telemetry
	// ----------------------------------

	describe('telemetry', () => {
		describe('on cloud', () => {
			test.each(CLOUD_TEMP_REPORTABLE_THRESHOLDS)(
				'for capacity %d, should report temp cloud threshold if reached',
				(threshold) => {
					/**
					 * Arrange
					 */
					globalConfig.executions.concurrency.productionLimit = CLOUD_TEMP_PRODUCTION_LIMIT;
					globalConfig.deployment.type = 'cloud';
					const service = new ConcurrencyControlService(
						logger,
						executionRepository,
						telemetry,
						eventService,
						globalConfig,
					);

					/**
					 * Act
					 */
					// @ts-expect-error Private property
					service.queues.get('production').emit('concurrency-check', {
						capacity: CLOUD_TEMP_PRODUCTION_LIMIT - threshold,
					});

					/**
					 * Assert
					 */
					expect(telemetry.track).toHaveBeenCalledWith('User hit concurrency limit', {
						threshold,
						concurrencyQueue: 'production',
					});
				},
			);

			test.each(CLOUD_TEMP_REPORTABLE_THRESHOLDS.map((t) => t - 1))(
				'for capacity %d, should not report temp cloud threshold if not reached',
				(threshold) => {
					/**
					 * Arrange
					 */
					globalConfig.executions.concurrency.productionLimit = CLOUD_TEMP_PRODUCTION_LIMIT;
					globalConfig.deployment.type = 'cloud';
					const service = new ConcurrencyControlService(
						logger,
						executionRepository,
						telemetry,
						eventService,
						globalConfig,
					);

					/**
					 * Act
					 */
					// @ts-expect-error Private property
					service.queues.get('production').emit('concurrency-check', {
						capacity: CLOUD_TEMP_PRODUCTION_LIMIT - threshold,
					});

					/**
					 * Assert
					 */
					expect(telemetry.track).not.toHaveBeenCalledWith('User hit concurrency limit', {
						threshold,
					});
				},
			);

			test.each(CLOUD_TEMP_REPORTABLE_THRESHOLDS.map((t) => t + 1))(
				'for capacity %d, should not report temp cloud threshold if exceeded',
				(threshold) => {
					/**
					 * Arrange
					 */
					globalConfig.executions.concurrency.productionLimit = CLOUD_TEMP_PRODUCTION_LIMIT;
					globalConfig.deployment.type = 'cloud';
					const service = new ConcurrencyControlService(
						logger,
						executionRepository,
						telemetry,
						eventService,
						globalConfig,
					);

					/**
					 * Act
					 */
					// @ts-expect-error Private property
					service.queues.get('production').emit('concurrency-check', {
						capacity: CLOUD_TEMP_PRODUCTION_LIMIT - threshold,
					});

					/**
					 * Assert
					 */
					expect(telemetry.track).not.toHaveBeenCalledWith('User hit concurrency limit', {
						threshold,
					});
				},
			);
		});
	});
});
