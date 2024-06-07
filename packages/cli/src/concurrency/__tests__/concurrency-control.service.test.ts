import { mock } from 'jest-mock-extended';
import config from '@/config';
import { ConcurrencyControlService } from '@/concurrency/concurrency-control.service';
import type { Logger } from '@/Logger';
import { InvalidConcurrencyCapError } from '@/errors/invalid-concurrency-cap.error';
import { ConcurrencyQueue } from '../concurrency-queue';
import type { WorkflowExecuteMode as ExecutionMode } from 'n8n-workflow';
import type { ExecutionRepository } from '@/databases/repositories/execution.repository';
import type { License } from '@/License';
import type { IExecutingWorkflowData } from '@/Interfaces';

describe('ConcurrencyControlService', () => {
	const logger = mock<Logger>();
	const executionRepository = mock<ExecutionRepository>();
	const license = mock<License>();

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
			const service = new ConcurrencyControlService(logger, executionRepository, license);

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
				new ConcurrencyControlService(logger, executionRepository, license);
			} catch (error) {
				/**
				 * Assert
				 */
				expect(error).toBeInstanceOf(InvalidConcurrencyCapError);
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
			const service = new ConcurrencyControlService(logger, executionRepository, license);

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
			const service = new ConcurrencyControlService(logger, executionRepository, license);

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
			const service = new ConcurrencyControlService(logger, executionRepository, license);

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

					const service = new ConcurrencyControlService(logger, executionRepository, license);
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

				const service = new ConcurrencyControlService(logger, executionRepository, license);
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

					const service = new ConcurrencyControlService(logger, executionRepository, license);
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

				const service = new ConcurrencyControlService(logger, executionRepository, license);
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

					const service = new ConcurrencyControlService(logger, executionRepository, license);
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

					const service = new ConcurrencyControlService(logger, executionRepository, license);
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

				const service = new ConcurrencyControlService(logger, executionRepository, license);

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

				const service = new ConcurrencyControlService(logger, executionRepository, license);
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

				const service = new ConcurrencyControlService(logger, executionRepository, license);
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

				const service = new ConcurrencyControlService(logger, executionRepository, license);
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
});
