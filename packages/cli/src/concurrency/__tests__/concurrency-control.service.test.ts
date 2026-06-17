import { mockInstance, mockLogger } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import type { ExecutionRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type { WorkflowExecuteMode as ExecutionMode } from 'n8n-workflow';

import type { ConcurrencyQueueType } from '@/concurrency/concurrency-control.service';
import {
	CLOUD_TEMP_PRODUCTION_LIMIT,
	CLOUD_TEMP_REPORTABLE_THRESHOLDS,
	ConcurrencyControlService,
} from '@/concurrency/concurrency-control.service';
import { InvalidConcurrencyLimitError } from '@/errors/invalid-concurrency-limit.error';
import type { EventService } from '@/events/event.service';
import type { License } from '@/license';
import type { Telemetry } from '@/telemetry';

import { ConcurrencyQueue } from '../concurrency-queue';

describe('ConcurrencyControlService', () => {
	const logger = mockLogger();
	const executionRepository = mock<ExecutionRepository>();
	const telemetry = mock<Telemetry>();
	const eventService = mock<EventService>();
	const globalConfig = mockInstance(GlobalConfig, {
		executions: {
			mode: 'regular',
			concurrency: {
				productionLimit: -1,
				evaluationLimit: -1,
			},
		},
	});

	// Default plan is `Community` so the tier-default resolver returns `1`
	// when the env var is unset. Tests that exercise the lazy eval path
	// override this (Enterprise/Business) and/or set the env var.
	// `getValue` returns `undefined` for the license-issued concurrency
	// quota by default; the license-quota test overrides this to return a
	// number so the resolver's middle branch fires.
	const licenseGetValue = jest.fn().mockReturnValue(undefined);
	const license = mock<License>({
		getPlanName: jest.fn().mockReturnValue('Community'),
		getValue: licenseGetValue as never,
	});

	// Most pre-existing tests configure `evaluationLimit` via globalConfig
	// directly — that path mirrors an operator-set env var, so make the env
	// look set throughout the suite. The new tier-default test toggles this
	// off in its own `beforeEach`.
	const originalEvalEnv = process.env.N8N_CONCURRENCY_EVALUATION_LIMIT;
	beforeAll(() => {
		process.env.N8N_CONCURRENCY_EVALUATION_LIMIT = '-1';
	});
	afterAll(() => {
		if (originalEvalEnv === undefined) delete process.env.N8N_CONCURRENCY_EVALUATION_LIMIT;
		else process.env.N8N_CONCURRENCY_EVALUATION_LIMIT = originalEvalEnv;
	});

	afterEach(() => {
		globalConfig.executions.concurrency.productionLimit = -1;
		globalConfig.executions.concurrency.evaluationLimit = -1;
		globalConfig.executions.mode = 'regular';
		license.getPlanName.mockReturnValue('Community');
		licenseGetValue.mockReturnValue(undefined);

		jest.clearAllMocks();
	});

	describe('constructor', () => {
		it.each<ConcurrencyQueueType>(['production', 'evaluation'])(
			'should be enabled if %s cap is positive',
			(type) => {
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
					license,
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

		it.each<ConcurrencyQueueType>(['production', 'evaluation'])(
			'should throw if %s cap is 0',
			(type) => {
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
						license,
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
				license,
			);

			/**
			 * Assert
			 */
			// @ts-expect-error Private property
			expect(service.isEnabled).toBe(false);
		});

		it.each<ConcurrencyQueueType>(['production', 'evaluation'])(
			'should be disabled if %s cap is lower than -1',
			(type) => {
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
					license,
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
			globalConfig.executions.mode = 'queue';
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
				license,
			);

			/**
			 * Assert
			 */
			// @ts-expect-error Private property
			expect(service.isEnabled).toBe(false);
		});
	});

	describe('evaluation queue tier defaults (lazy)', () => {
		// Env unset → resolver falls through to the license-tier default.
		// The eval queue is built lazily on first eval-mode throttle so the
		// license has time to activate after DI construction.
		beforeEach(() => {
			delete process.env.N8N_CONCURRENCY_EVALUATION_LIMIT;
		});
		afterEach(() => {
			// Restore the suite-level env so the surrounding tests still see
			// an explicit env-set value (the path their assertions assume).
			process.env.N8N_CONCURRENCY_EVALUATION_LIMIT = '-1';
		});

		it('builds the eval queue on first throttle using the Business tier default (3)', async () => {
			globalConfig.executions.concurrency.evaluationLimit = -1;
			license.getPlanName.mockReturnValue('Business');

			const service = new ConcurrencyControlService(
				logger,
				executionRepository,
				telemetry,
				eventService,
				globalConfig,
				license,
			);

			// No eager queue — pending lazy resolution.
			// @ts-expect-error Private property
			expect(service.queues.get('evaluation')).toBeUndefined();

			await service.throttle({ mode: 'evaluation', executionId: 'eval-1' });

			// @ts-expect-error Private property
			const evalQueue = service.queues.get('evaluation') as ConcurrencyQueue;
			expect(evalQueue).toBeInstanceOf(ConcurrencyQueue);
			// @ts-expect-error Private property
			expect(service.limits.get('evaluation')).toBe(3);
		});

		it('caps two simultaneous eval runs at the Enterprise tier default (5) when env is unset', async () => {
			globalConfig.executions.concurrency.evaluationLimit = -1;
			license.getPlanName.mockReturnValue('Enterprise');

			const service = new ConcurrencyControlService(
				logger,
				executionRepository,
				telemetry,
				eventService,
				globalConfig,
				license,
			);

			// Fill the queue up to the cap. These first five pass through
			// immediately; the queue accepts up to its `concurrency` count
			// without blocking.
			await service.throttle({ mode: 'evaluation', executionId: 'eval-1' });
			await service.throttle({ mode: 'evaluation', executionId: 'eval-2' });
			await service.throttle({ mode: 'evaluation', executionId: 'eval-3' });
			await service.throttle({ mode: 'evaluation', executionId: 'eval-4' });
			await service.throttle({ mode: 'evaluation', executionId: 'eval-5' });

			// @ts-expect-error Private property
			expect(service.limits.get('evaluation')).toBe(5);

			// 6th eval cannot proceed synchronously — the queue is at cap.
			// We don't await because the queue would block. Instead, schedule
			// the enqueue and check it hasn't resolved in a microtask flush.
			let sixthResolved = false;
			void service.throttle({ mode: 'evaluation', executionId: 'eval-6' }).then(() => {
				sixthResolved = true;
			});
			await new Promise((resolve) => setImmediate(resolve));
			expect(sixthResolved).toBe(false);

			// Release one slot and the sixth eval should pass through.
			service.release({ mode: 'evaluation' });
			await new Promise((resolve) => setImmediate(resolve));
			expect(sixthResolved).toBe(true);
		});

		it('env override wins on the lazy path too', async () => {
			process.env.N8N_CONCURRENCY_EVALUATION_LIMIT = '-1';
			globalConfig.executions.concurrency.evaluationLimit = -1;
			license.getPlanName.mockReturnValue('Enterprise');

			const service = new ConcurrencyControlService(
				logger,
				executionRepository,
				telemetry,
				eventService,
				globalConfig,
				license,
			);

			await service.throttle({ mode: 'evaluation', executionId: 'eval-1' });

			// Env explicitly -1 (unlimited) — no eval queue should be created
			// regardless of tier.
			// @ts-expect-error Private property
			expect(service.queues.get('evaluation')).toBeUndefined();
		});

		it('builds the eval queue at the license-issued quota when env unset and license carries it', async () => {
			// The license server can override tier defaults per customer via
			// `quota:evaluations:concurrencyLimit`. With env unset, the
			// resolver's middle branch fires and the queue is built to match.
			globalConfig.executions.concurrency.evaluationLimit = -1;
			license.getPlanName.mockReturnValue('Community');
			licenseGetValue.mockImplementation((feature: string) =>
				feature === 'quota:evaluations:concurrencyLimit' ? 4 : undefined,
			);

			const service = new ConcurrencyControlService(
				logger,
				executionRepository,
				telemetry,
				eventService,
				globalConfig,
				license,
			);

			await service.throttle({ mode: 'evaluation', executionId: 'eval-1' });

			// Community tier would normally cap at 1; the license-issued cap
			// of 4 lifts that. The queue is built at 4, not at the tier
			// default.
			// @ts-expect-error Private property
			expect(service.limits.get('evaluation')).toBe(4);
			// @ts-expect-error Private property
			const evalQueue = service.queues.get('evaluation') as ConcurrencyQueue;
			expect(evalQueue).toBeInstanceOf(ConcurrencyQueue);
		});
	});

	// ----------------------------------
	//             enabled
	// ----------------------------------

	describe('if enabled', () => {
		describe('throttle', () => {
			it.each<ExecutionMode>(['cli', 'error', 'integrated', 'internal', 'manual', 'retry'])(
				'should do nothing on %s mode',
				async (mode) => {
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
						license,
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

			it.each<ExecutionMode>(['webhook', 'trigger', 'chat'])(
				'should enqueue on %s mode',
				async (mode) => {
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
						license,
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
				},
			);

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
					license,
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
			it.each<ExecutionMode>(['cli', 'error', 'integrated', 'internal', 'manual', 'retry'])(
				'should do nothing on %s mode',
				async (mode) => {
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
						license,
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

			it.each<ExecutionMode>(['webhook', 'trigger', 'chat'])(
				'should dequeue on %s mode',
				(mode) => {
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
						license,
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
				},
			);

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
					license,
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
			it.each<ExecutionMode>(['cli', 'error', 'integrated', 'internal', 'manual', 'retry'])(
				'should do nothing on %s mode',
				async (mode) => {
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
						license,
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

			it.each<ExecutionMode>(['webhook', 'trigger', 'chat'])(
				'should remove an execution on %s mode',
				(mode) => {
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
						license,
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
					license,
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
			it.each<ConcurrencyQueueType>(['production', 'evaluation'])(
				'should remove all executions from the %s queue',
				async (type) => {
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
						license,
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
					license,
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
					license,
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
					license,
				);
				const enqueueSpy = jest.spyOn(ConcurrencyQueue.prototype, 'enqueue');

				/**
				 * Act
				 */
				await service.throttle({ mode: 'trigger', executionId: '1' });
				await service.throttle({ mode: 'webhook', executionId: '2' });
				await service.throttle({ mode: 'chat', executionId: '3' });

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
					license,
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
					license,
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
					license,
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
					license,
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
					license,
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
						license,
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
						license,
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
						license,
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
