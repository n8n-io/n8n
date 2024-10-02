import { mock } from 'jest-mock-extended';
import type { WorkflowExecuteMode as ExecutionMode } from 'n8n-workflow';

import {
	CLOUD_TEMP_PRODUCTION_LIMIT,
	CLOUD_TEMP_REPORTABLE_THRESHOLDS,
	ConcurrencyControlService,
} from '@/concurrency/concurrency-control.service';
import config from '@/config';
import type { ExecutionRepository } from '@/databases/repositories/execution.repository';
import { InvalidConcurrencyLimitError } from '@/errors/invalid-concurrency-limit.error';
import type { EventService } from '@/events/event.service';
import type { IExecutingWorkflowData } from '@/interfaces';
import type { Logger } from '@/logging/logger.service';
import type { Telemetry } from '@/telemetry';

import { ConcurrencyQueue } from '../concurrency-queue';

describe('ConcurrencyControlService', () => {
	const logger = mock<Logger>();
	const executionRepository = mock<ExecutionRepository>();
	const telemetry = mock<Telemetry>();
	const eventService = mock<EventService>();

	afterEach(() => {
		config.set('executions.concurrency.productionLimit', -1);
		config.set('executions.mode', 'integrated');

		jest.clearAllMocks();
	});

	describe('constructor', () => {
		it('should be enabled if production cap is positive', () => {
			/**
			 * Arrange
			 */
			config.set('executions.concurrency.productionLimit', 1);

			/**
			 * Act
			 */
			const service = new ConcurrencyControlService(
				logger,
				executionRepository,
				telemetry,
				eventService,
			);

			/**
			 * Assert
			 */
			// @ts-expect-error Private property
			expect(service.isEnabled).toBe(true);
			// @ts-expect-error Private property
			expect(service.productionQueue).toBeDefined();
		});

		it('should throw if production cap is 0', () => {
			/**
			 * Arrange
			 */
			config.set('executions.concurrency.productionLimit', 0);

			try {
				/**
				 * Act
				 */
				new ConcurrencyControlService(logger, executionRepository, telemetry, eventService);
			} catch (error) {
				/**
				 * Assert
				 */
				expect(error).toBeInstanceOf(InvalidConcurrencyLimitError);
			}
		});

		it('should be disabled if production cap is -1', () => {
			/**
			 * Arrange
			 */
			config.set('executions.concurrency.productionLimit', -1);

			/**
			 * Act
			 */
			const service = new ConcurrencyControlService(
				logger,
				executionRepository,
				telemetry,
				eventService,
			);

			/**
			 * Assert
			 */
			// @ts-expect-error Private property
			expect(service.isEnabled).toBe(false);
		});

		it('should be disabled if production cap is lower than -1', () => {
			/**
			 * Arrange
			 */
			config.set('executions.concurrency.productionLimit', -2);

			/**
			 * Act
			 */
			const service = new ConcurrencyControlService(
				logger,
				executionRepository,
				telemetry,
				eventService,
			);

			/**
			 * Act
			 */
			// @ts-expect-error Private property
			expect(service.isEnabled).toBe(false);
		});

		it('should be disabled on queue mode', () => {
			/**
			 * Arrange
			 */
			config.set('executions.mode', 'queue');
			config.set('executions.concurrency.productionLimit', 2);

			/**
			 * Act
			 */
			const service = new ConcurrencyControlService(
				logger,
				executionRepository,
				telemetry,
				eventService,
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
					config.set('executions.concurrency.productionLimit', 1);

					const service = new ConcurrencyControlService(
						logger,
						executionRepository,
						telemetry,
						eventService,
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
				config.set('executions.concurrency.productionLimit', 1);

				const service = new ConcurrencyControlService(
					logger,
					executionRepository,
					telemetry,
					eventService,
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
		});

		describe('release', () => {
			it.each(['cli', 'error', 'integrated', 'internal', 'manual', 'retry'])(
				'should do nothing on %s mode',
				async (mode: ExecutionMode) => {
					/**
					 * Arrange
					 */
					config.set('executions.concurrency.productionLimit', 1);

					const service = new ConcurrencyControlService(
						logger,
						executionRepository,
						telemetry,
						eventService,
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
				config.set('executions.concurrency.productionLimit', 1);

				const service = new ConcurrencyControlService(
					logger,
					executionRepository,
					telemetry,
					eventService,
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
		});

		describe('remove', () => {
			it.each(['cli', 'error', 'integrated', 'internal', 'manual', 'retry'])(
				'should do nothing on %s mode',
				async (mode: ExecutionMode) => {
					/**
					 * Arrange
					 */
					config.set('executions.concurrency.productionLimit', 1);

					const service = new ConcurrencyControlService(
						logger,
						executionRepository,
						telemetry,
						eventService,
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
					config.set('executions.concurrency.productionLimit', 1);

					const service = new ConcurrencyControlService(
						logger,
						executionRepository,
						telemetry,
						eventService,
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
		});

		describe('removeAll', () => {
			it('should remove all executions from the production queue', async () => {
				/**
				 * Arrange
				 */
				config.set('executions.concurrency.productionLimit', 2);

				const service = new ConcurrencyControlService(
					logger,
					executionRepository,
					telemetry,
					eventService,
				);

				jest
					.spyOn(ConcurrencyQueue.prototype, 'getAll')
					.mockReturnValueOnce(new Set(['1', '2', '3']));

				const removeSpy = jest.spyOn(ConcurrencyQueue.prototype, 'remove');

				/**
				 * Act
				 */
				await service.removeAll({
					'1': mock<IExecutingWorkflowData>(),
					'2': mock<IExecutingWorkflowData>(),
					'3': mock<IExecutingWorkflowData>(),
				});

				/**
				 * Assert
				 */
				expect(removeSpy).toHaveBeenNthCalledWith(1, '1');
				expect(removeSpy).toHaveBeenNthCalledWith(2, '2');
				expect(removeSpy).toHaveBeenNthCalledWith(3, '3');
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
				config.set('executions.concurrency.productionLimit', -1);

				const service = new ConcurrencyControlService(
					logger,
					executionRepository,
					telemetry,
					eventService,
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
		});

		describe('release', () => {
			it('should do nothing', () => {
				/**
				 * Arrange
				 */
				config.set('executions.concurrency.productionLimit', -1);

				const service = new ConcurrencyControlService(
					logger,
					executionRepository,
					telemetry,
					eventService,
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
		});

		describe('remove', () => {
			it('should do nothing', () => {
				/**
				 * Arrange
				 */
				config.set('executions.concurrency.productionLimit', -1);

				const service = new ConcurrencyControlService(
					logger,
					executionRepository,
					telemetry,
					eventService,
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
					config.set('executions.concurrency.productionLimit', CLOUD_TEMP_PRODUCTION_LIMIT);
					config.set('deployment.type', 'cloud');
					const service = new ConcurrencyControlService(
						logger,
						executionRepository,
						telemetry,
						eventService,
					);

					/**
					 * Act
					 */
					// @ts-expect-error Private property
					service.productionQueue.emit('concurrency-check', {
						capacity: CLOUD_TEMP_PRODUCTION_LIMIT - threshold,
					});

					/**
					 * Assert
					 */
					expect(telemetry.track).toHaveBeenCalledWith('User hit concurrency limit', { threshold });
				},
			);

			test.each(CLOUD_TEMP_REPORTABLE_THRESHOLDS.map((t) => t - 1))(
				'for capacity %d, should not report temp cloud threshold if not reached',
				(threshold) => {
					/**
					 * Arrange
					 */
					config.set('executions.concurrency.productionLimit', CLOUD_TEMP_PRODUCTION_LIMIT);
					config.set('deployment.type', 'cloud');
					const service = new ConcurrencyControlService(
						logger,
						executionRepository,
						telemetry,
						eventService,
					);

					/**
					 * Act
					 */
					// @ts-expect-error Private property
					service.productionQueue.emit('concurrency-check', {
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
					config.set('executions.concurrency.productionLimit', CLOUD_TEMP_PRODUCTION_LIMIT);
					config.set('deployment.type', 'cloud');
					const service = new ConcurrencyControlService(
						logger,
						executionRepository,
						telemetry,
						eventService,
					);

					/**
					 * Act
					 */
					// @ts-expect-error Private property
					service.productionQueue.emit('concurrency-check', {
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
