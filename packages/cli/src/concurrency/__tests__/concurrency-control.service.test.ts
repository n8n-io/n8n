import { mock } from 'jest-mock-extended';
import { v4 as uuid } from 'uuid';
import config from '@/config';
import { ConcurrencyControlService } from '@/concurrency/concurrency-control.service';
import type { Logger } from '@/Logger';
import { ConcurrencyCapZeroError } from '@/errors/concurrency-cap-zero.error';
import { ConcurrencyQueue } from '../concurrency-queue';
import type { WorkflowExecuteMode as ExecutionMode } from 'n8n-workflow';
import type { ExecutionRepository } from '@/databases/repositories/execution.repository';
import type { Push } from '@/push';

describe('ConcurrencyControlService', () => {
	const logger = mock<Logger>();
	const push = mock<Push>();
	const executionRepository = mock<ExecutionRepository>();

	afterEach(() => {
		config.load(config.default);
		jest.clearAllMocks();
	});

	describe('constructor', () => {
		it('should throw if production cap is 0', () => {
			/**
			 * Arrange
			 */
			config.set('executions.concurrency.productionCap', 0);

			try {
				/**
				 * Act
				 */
				new ConcurrencyControlService(logger, push, executionRepository);
			} catch (error) {
				/**
				 * Assert
				 */
				expect(error).toBeInstanceOf(ConcurrencyCapZeroError);
			}
		});

		it('should throw if manual cap is 0', () => {
			/**
			 * Arrange
			 */
			config.set('executions.concurrency.manualCap', 0);

			try {
				/**
				 * Act
				 */
				new ConcurrencyControlService(logger, push, executionRepository);
			} catch (error) {
				/**
				 * Assert
				 */
				expect(error).toBeInstanceOf(ConcurrencyCapZeroError);
			}
		});

		it('should be enabled if both caps are positive', () => {
			/**
			 * Arrange
			 */
			config.set('executions.concurrency.manualCap', 1);
			config.set('executions.concurrency.productionCap', 1);

			/**
			 * Act
			 */
			const service = new ConcurrencyControlService(logger, push, executionRepository);

			/**
			 * Assert
			 */
			expect(service.isEnabled).toBe(true);
			expect(service.manualQueue).toBeDefined();
			expect(service.productionQueue).toBeDefined();
		});

		it('should be disabled if both caps are negative', () => {
			/**
			 * Arrange
			 */
			config.set('executions.concurrency.manualCap', -1);
			config.set('executions.concurrency.productionCap', -1);

			/**
			 * Act
			 */
			const service = new ConcurrencyControlService(logger, push, executionRepository);

			/**
			 * Assert
			 */
			expect(service.isEnabled).toBe(false);
		});
	});

	// ----------------------------------
	//             enabled
	// ----------------------------------

	describe('if enabled', () => {
		describe('check', () => {
			it.each(['cli', 'error', 'integrated', 'internal'])(
				'should do nothing on %s mode',
				async (mode: ExecutionMode) => {
					/**
					 * Arrange
					 */
					config.set('executions.concurrency.manualCap', 1);
					config.set('executions.concurrency.productionCap', 1);

					const service = new ConcurrencyControlService(logger, push, executionRepository);
					const enqueueSpy = jest.spyOn(ConcurrencyQueue.prototype, 'enqueue');

					/**
					 * Act
					 */
					await service.check({ mode, executionId: '1', workflowId: uuid(), pushRef: uuid() });

					/**
					 * Assert
					 */
					expect(enqueueSpy).not.toHaveBeenCalled();
				},
			);

			it.each(['manual', 'retry', 'webhook', 'trigger'])(
				'should enqueue on %s mode',
				async (mode: ExecutionMode) => {
					/**
					 * Arrange
					 */
					config.set('executions.concurrency.manualCap', 1);
					config.set('executions.concurrency.productionCap', 1);

					const service = new ConcurrencyControlService(logger, push, executionRepository);
					const enqueueSpy = jest.spyOn(ConcurrencyQueue.prototype, 'enqueue');

					/**
					 * Act
					 */
					await service.check({ mode, executionId: '1', workflowId: uuid(), pushRef: uuid() });

					/**
					 * Assert
					 */
					expect(enqueueSpy).toHaveBeenCalled();
				},
			);
		});

		describe('release', () => {
			it('should dequeue an execution', async () => {
				/**
				 * Arrange
				 */
				config.set('executions.concurrency.manualCap', 1);
				config.set('executions.concurrency.productionCap', 1);

				const service = new ConcurrencyControlService(logger, push, executionRepository);
				const dequeueSpy = jest.spyOn(ConcurrencyQueue.prototype, 'dequeue');

				/**
				 * Act
				 */
				service.release({ mode: 'manual' });

				/**
				 * Assert
				 */
				expect(dequeueSpy).toHaveBeenCalled();
			});
		});

		describe('remove', () => {
			it('should remove an execution', async () => {
				/**
				 * Arrange
				 */
				config.set('executions.concurrency.manualCap', 1);
				config.set('executions.concurrency.productionCap', 1);

				const service = new ConcurrencyControlService(logger, push, executionRepository);
				const removeSpy = jest.spyOn(ConcurrencyQueue.prototype, 'remove');

				/**
				 * Act
				 */
				service.remove({ mode: 'manual', executionId: '1' });

				/**
				 * Assert
				 */
				expect(removeSpy).toHaveBeenCalled();
			});
		});

		describe('removeMany', () => {
			it('should remove multiple executions', async () => {
				/**
				 * Arrange
				 */
				config.set('executions.concurrency.manualCap', 2);
				config.set('executions.concurrency.productionCap', -1);

				const service = new ConcurrencyControlService(logger, push, executionRepository);

				jest
					.spyOn(ConcurrencyQueue.prototype, 'getAll')
					.mockReturnValueOnce(new Set(['1', '2', '3']));

				const removeSpy = jest.spyOn(ConcurrencyQueue.prototype, 'remove');

				/**
				 * Act
				 */
				service.removeMany(['2', '3']);

				/**
				 * Assert
				 */
				expect(removeSpy).toHaveBeenNthCalledWith(1, '2');
				expect(removeSpy).toHaveBeenNthCalledWith(2, '3');
			});
		});

		describe('removeAll', () => {
			it('should remove all executions', async () => {
				/**
				 * Arrange
				 */
				config.set('executions.concurrency.manualCap', 2);
				config.set('executions.concurrency.productionCap', -1);

				const service = new ConcurrencyControlService(logger, push, executionRepository);

				jest
					.spyOn(ConcurrencyQueue.prototype, 'getAll')
					.mockReturnValueOnce(new Set(['1', '2', '3']));

				const removeSpy = jest.spyOn(ConcurrencyQueue.prototype, 'remove');

				/**
				 * Act
				 */
				service.removeAll();

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
		describe('check', () => {
			it('should do nothing', async () => {
				/**
				 * Arrange
				 */
				config.set('executions.concurrency.manualCap', -1);
				config.set('executions.concurrency.productionCap', -1);

				const service = new ConcurrencyControlService(logger, push, executionRepository);
				const enqueueSpy = jest.spyOn(ConcurrencyQueue.prototype, 'enqueue');

				/**
				 * Act
				 */
				await service.check({
					mode: 'manual',
					executionId: '1',
					workflowId: uuid(),
					pushRef: uuid(),
				});
				await service.check({
					mode: 'webhook',
					executionId: '2',
					workflowId: uuid(),
					pushRef: uuid(),
				});

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
				config.set('executions.concurrency.manualCap', -1);
				config.set('executions.concurrency.productionCap', -1);

				const service = new ConcurrencyControlService(logger, push, executionRepository);
				const dequeueSpy = jest.spyOn(ConcurrencyQueue.prototype, 'dequeue');

				/**
				 * Act
				 */
				service.release({ mode: 'manual' });

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
				config.set('executions.concurrency.manualCap', -1);
				config.set('executions.concurrency.productionCap', -1);

				const service = new ConcurrencyControlService(logger, push, executionRepository);
				const removeSpy = jest.spyOn(ConcurrencyQueue.prototype, 'remove');

				/**
				 * Act
				 */
				service.remove({ mode: 'manual', executionId: '1' });

				/**
				 * Assert
				 */
				expect(removeSpy).not.toHaveBeenCalled();
			});
		});

		describe('removeMany', () => {
			it('should do nothing', () => {
				/**
				 * Arrange
				 */
				config.set('executions.concurrency.manualCap', -1);
				config.set('executions.concurrency.productionCap', -1);

				const service = new ConcurrencyControlService(logger, push, executionRepository);
				const removeSpy = jest.spyOn(ConcurrencyQueue.prototype, 'remove');

				/**
				 * Act
				 */
				service.removeMany(['1', '2', '3']);

				/**
				 * Assert
				 */
				expect(removeSpy).not.toHaveBeenCalled();
			});
		});

		describe('removeAll', () => {
			it('should do nothing', () => {
				/**
				 * Arrange
				 */
				config.set('executions.concurrency.manualCap', -1);
				config.set('executions.concurrency.productionCap', -1);

				const service = new ConcurrencyControlService(logger, push, executionRepository);
				const removeSpy = jest.spyOn(ConcurrencyQueue.prototype, 'remove');

				/**
				 * Act
				 */
				service.removeMany(['1', '2', '3']);

				/**
				 * Assert
				 */
				expect(removeSpy).not.toHaveBeenCalled();
			});
		});
	});
});
