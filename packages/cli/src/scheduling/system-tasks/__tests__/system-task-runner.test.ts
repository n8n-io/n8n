import type { Logger } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { SystemTaskMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { ClaimedTask, ProvisionSummary } from '@n8n/scheduler';
import { createDispatchReporter } from '@n8n/scheduler';
import type { ErrorReporter, InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import type { DurableJobProvisioner } from '../../durable-job-provisioner';
import type { DurableScheduler } from '../../durable-scheduler';
import { SystemTaskHandler } from '../system-task-handler';
import { SystemTaskRunner } from '../system-task-runner';
import { SystemTaskScheduledJobOwner } from '../system-task-scheduled-job-owner';
import { DummySystemTask, OtherDummySystemTask } from './dummy.task';

const START = new Date('2026-01-01T00:00:00.000Z');
const ONE_INTERVAL_MS = 60 * Time.seconds.toMilliseconds;

const emptySummary: ProvisionSummary = {
	inserted: [],
	redefined: [],
	unchanged: [],
	removed: [],
};

describe('SystemTaskRunner', () => {
	let dummy: DummySystemTask;

	function setup({
		isLeader = true,
		schedulerActive = false,
		enabledForSystemTasks = false,
		instanceRole = 'leader' as InstanceSettings['instanceRole'],
	} = {}) {
		const logger = mock<Logger>();
		const metadata = new SystemTaskMetadata();
		const durableScheduler = mock<DurableScheduler>();
		durableScheduler.isActive.mockReturnValue(schedulerActive);
		const errorReporter = mock<ErrorReporter>();
		const durableJobProvisioner = mock<DurableJobProvisioner>();
		durableJobProvisioner.provision.mockResolvedValue(emptySummary);
		const runner = new SystemTaskRunner(
			mock<Logger>({ scoped: vi.fn().mockReturnValue(logger) }),
			metadata,
			durableScheduler,
			durableJobProvisioner,
			new SystemTaskScheduledJobOwner(),
			mock<GlobalConfig>({
				generic: { timezone: 'UTC' },
				scheduler: { enabledForSystemTasks },
			}),
			mock<InstanceSettings>({ isLeader, instanceRole }),
			errorReporter,
		);

		return { runner, metadata, durableScheduler, durableJobProvisioner, errorReporter, logger };
	}

	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(START);
		dummy = new DummySystemTask();
		Container.set(DummySystemTask, dummy);
	});

	afterEach(() => {
		vi.useRealTimers();
		Container.reset();
	});

	describe('in-memory timers', () => {
		it('fires a task registered before it took over the registry', async () => {
			const { runner, metadata } = setup({ isLeader: true });
			metadata.register(DummySystemTask);

			await runner.init();
			await vi.advanceTimersByTimeAsync(ONE_INTERVAL_MS);

			expect(dummy.runCount).toBe(1);
		});

		it('fires a task registered after it took over the registry', async () => {
			const { runner, metadata } = setup({ isLeader: true });
			await runner.init();

			metadata.register(DummySystemTask);
			await vi.advanceTimersByTimeAsync(ONE_INTERVAL_MS);

			expect(dummy.runCount).toBe(1);
		});

		it('does not fire on a follower', async () => {
			const { runner, metadata } = setup({ isLeader: false });
			metadata.register(DummySystemTask);

			await runner.init();
			await vi.advanceTimersByTimeAsync(10 * ONE_INTERVAL_MS);

			expect(dummy.runCount).toBe(0);
		});

		it('starts firing on leader takeover', async () => {
			const { runner, metadata } = setup({ isLeader: false });
			metadata.register(DummySystemTask);
			await runner.init();

			runner.startTimers();
			await vi.advanceTimersByTimeAsync(ONE_INTERVAL_MS);

			expect(dummy.runCount).toBe(1);
		});

		it('leaves a running timer alone when leadership is announced again', async () => {
			const { runner, metadata } = setup();
			metadata.register(DummySystemTask);
			await runner.init();

			await vi.advanceTimersByTimeAsync(ONE_INTERVAL_MS / 2);
			runner.startTimers();
			await vi.advanceTimersByTimeAsync(ONE_INTERVAL_MS / 2);

			expect(dummy.runCount).toBe(1);
		});

		it('runs a takeover task at once when the timers start', async () => {
			const { runner, metadata } = setup({ isLeader: true });
			dummy.runOnTakeover = true;
			metadata.register(DummySystemTask);

			await runner.init();
			expect(dummy.runCount).toBe(1);

			await vi.advanceTimersByTimeAsync(ONE_INTERVAL_MS);
			expect(dummy.runCount).toBe(2);
		});

		it('runs a takeover task registered after takeover at once', async () => {
			const { runner, metadata } = setup({ isLeader: true });
			dummy.runOnTakeover = true;
			await runner.init();

			metadata.register(DummySystemTask);

			expect(dummy.runCount).toBe(1);
		});

		it('does not run a takeover task on a follower', async () => {
			const { runner, metadata } = setup({ isLeader: false });
			dummy.runOnTakeover = true;
			metadata.register(DummySystemTask);

			await runner.init();
			await vi.advanceTimersByTimeAsync(10 * ONE_INTERVAL_MS);

			expect(dummy.runCount).toBe(0);
		});

		it('runs a takeover task again on a later takeover', async () => {
			const { runner, metadata } = setup({ isLeader: true });
			dummy.runOnTakeover = true;
			metadata.register(DummySystemTask);
			await runner.init();

			await runner.stopTimers();
			runner.startTimers();

			expect(dummy.runCount).toBe(2);
		});

		it('skips an occurrence while the previous run is still going', async () => {
			const { runner, metadata, logger } = setup();
			dummy.onRun = async () => await new Promise<void>(() => {});
			metadata.register(DummySystemTask);
			await runner.init();

			await vi.advanceTimersByTimeAsync(2 * ONE_INTERVAL_MS);

			expect(dummy.runCount).toBe(1);
			expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Skipped'), {
				name: 'dummy',
			});
		});

		it('warns once per stuck run, not once per skipped occurrence', async () => {
			const { runner, metadata, logger } = setup();
			dummy.onRun = async () => await new Promise<void>(() => {});
			metadata.register(DummySystemTask);
			await runner.init();

			await vi.advanceTimersByTimeAsync(10 * ONE_INTERVAL_MS);

			const skipWarnings = logger.warn.mock.calls.filter(([message]) =>
				message.includes('Skipped'),
			);
			expect(skipWarnings).toHaveLength(1);
		});

		it('warns again once a later run gets stuck', async () => {
			const { runner, metadata, logger } = setup();
			let releaseRun = () => {};
			dummy.onRun = async () =>
				await new Promise<void>((resolve) => {
					releaseRun = resolve;
				});
			metadata.register(DummySystemTask);
			await runner.init();

			await vi.advanceTimersByTimeAsync(2 * ONE_INTERVAL_MS);
			releaseRun();
			await vi.advanceTimersByTimeAsync(2 * ONE_INTERVAL_MS);

			const skipWarnings = logger.warn.mock.calls.filter(([message]) =>
				message.includes('Skipped'),
			);
			expect(skipWarnings).toHaveLength(2);
		});

		it('reports a failing run and keeps the cadence', async () => {
			const { runner, metadata, errorReporter } = setup();
			const error = new Error('failed');
			dummy.onRun = async () => {
				throw error;
			};
			metadata.register(DummySystemTask);
			await runner.init();

			await vi.advanceTimersByTimeAsync(2 * ONE_INTERVAL_MS);

			expect(dummy.runCount).toBe(2);
			expect(errorReporter.error).toHaveBeenCalledWith(error, {
				extra: { systemTask: 'dummy' },
				shouldBeLogged: false,
				shouldIsolate: true,
			});
		});

		it('retries a failed run sooner when the task asks for it', async () => {
			const { runner, metadata } = setup();
			dummy.retryDelaySeconds = 5;
			dummy.onRun = async () => {
				if (dummy.runCount === 1) {
					throw new Error('failed');
				}
			};
			metadata.register(DummySystemTask);
			await runner.init();

			await vi.advanceTimersByTimeAsync(ONE_INTERVAL_MS);
			expect(dummy.runCount).toBe(1);

			await vi.advanceTimersByTimeAsync(5 * Time.seconds.toMilliseconds);
			expect(dummy.runCount).toBe(2);

			await vi.advanceTimersByTimeAsync(ONE_INTERVAL_MS - 5 * Time.seconds.toMilliseconds);
			expect(dummy.runCount).toBe(3);
		});

		it('keeps retrying while the runs keep failing', async () => {
			const { runner, metadata } = setup();
			dummy.retryDelaySeconds = 5;
			dummy.onRun = async () => {
				throw new Error('failed');
			};
			metadata.register(DummySystemTask);
			await runner.init();

			await vi.advanceTimersByTimeAsync(ONE_INTERVAL_MS + 10 * Time.seconds.toMilliseconds);

			expect(dummy.runCount).toBe(3);
		});

		it('does not retry a successful run', async () => {
			const { runner, metadata } = setup();
			dummy.retryDelaySeconds = 5;
			metadata.register(DummySystemTask);
			await runner.init();

			await vi.advanceTimersByTimeAsync(ONE_INTERVAL_MS + 30 * Time.seconds.toMilliseconds);

			expect(dummy.runCount).toBe(1);
		});

		it('drops a pending retry once a newer occurrence runs', async () => {
			const { runner, metadata } = setup();
			dummy.retryDelaySeconds = 90;
			dummy.onRun = async () => {
				if (dummy.runCount === 1) {
					throw new Error('failed');
				}
			};
			metadata.register(DummySystemTask);
			await runner.init();

			await vi.advanceTimersByTimeAsync(ONE_INTERVAL_MS);
			expect(dummy.runCount).toBe(1);

			await vi.advanceTimersByTimeAsync(ONE_INTERVAL_MS);
			expect(dummy.runCount).toBe(2);

			await vi.advanceTimersByTimeAsync(45 * Time.seconds.toMilliseconds);
			expect(dummy.runCount).toBe(2);
		});

		it('does not retry non-idempotent work', async () => {
			const { runner, metadata } = setup();
			dummy.effects = 'non-idempotent';
			dummy.retryDelaySeconds = 5;
			dummy.onRun = async () => {
				throw new Error('failed');
			};
			metadata.register(DummySystemTask);
			await runner.init();

			await vi.advanceTimersByTimeAsync(ONE_INTERVAL_MS + 30 * Time.seconds.toMilliseconds);

			expect(dummy.runCount).toBe(1);
		});

		it('logs a failing run as well as reporting it', async () => {
			const { runner, metadata, logger } = setup();
			const error = new Error('failed');
			dummy.onRun = async () => {
				throw error;
			};
			metadata.register(DummySystemTask);
			await runner.init();

			await vi.advanceTimersByTimeAsync(ONE_INTERVAL_MS);

			expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('run failed'), {
				name: 'dummy',
				error,
			});
		});

		it('logs and reports a schedule it cannot plan', async () => {
			const { runner, metadata, logger, errorReporter } = setup();
			dummy.schedule = { kind: 'cron', cronExpression: 'not-a-cron', timezone: 'UTC' };
			metadata.register(DummySystemTask);

			await runner.init();

			expect(logger.error).toHaveBeenCalledWith(
				expect.stringContaining('will not run'),
				expect.objectContaining({ name: 'dummy' }),
			);
			expect(errorReporter.error).toHaveBeenCalledWith(
				expect.any(Error),
				expect.objectContaining({ extra: { systemTask: 'dummy' } }),
			);
		});
	});

	describe('leadership and shutdown', () => {
		it('refuses to init before the instance role is resolved', async () => {
			const { runner, metadata } = setup({ instanceRole: 'unset' });
			metadata.register(DummySystemTask);

			await expect(runner.init()).rejects.toThrow('Instance role is not set');
		});

		it('stops the timers on stepdown, awaiting the run in flight', async () => {
			const { runner, metadata } = setup();
			let releaseRun = () => {};
			dummy.onRun = async () =>
				await new Promise<void>((resolve) => {
					releaseRun = resolve;
				});
			metadata.register(DummySystemTask);
			await runner.init();
			await vi.advanceTimersByTimeAsync(ONE_INTERVAL_MS);

			const stopping = runner.stopTimers();
			let stopped = false;
			void stopping.then(() => {
				stopped = true;
			});
			await Promise.resolve();
			expect(stopped).toBe(false);

			releaseRun();
			await stopping;
			expect(stopped).toBe(true);

			await vi.advanceTimersByTimeAsync(10 * ONE_INTERVAL_MS);
			expect(dummy.runCount).toBe(1);
		});

		it('aborts the signal of the run in flight on stepdown', async () => {
			const { runner, metadata } = setup();
			let runSignal: AbortSignal | undefined;
			let releaseRun = () => {};
			dummy.onRun = async (signal) => {
				runSignal = signal;
				await new Promise<void>((resolve) => {
					releaseRun = resolve;
				});
			};
			metadata.register(DummySystemTask);
			await runner.init();
			await vi.advanceTimersByTimeAsync(ONE_INTERVAL_MS);
			expect(runSignal?.aborted).toBe(false);

			const stopping = runner.stopTimers();

			expect(runSignal?.aborted).toBe(true);
			releaseRun();
			await stopping;
		});

		it('does not report a run that rejects once stepdown aborted its signal', async () => {
			const { runner, metadata, errorReporter, logger } = setup();
			dummy.onRun = async (signal) =>
				await new Promise<void>((_, reject) => {
					signal.addEventListener('abort', () => reject(new Error('aborted')));
				});
			metadata.register(DummySystemTask);
			await runner.init();
			await vi.advanceTimersByTimeAsync(ONE_INTERVAL_MS);

			await runner.stopTimers();

			expect(errorReporter.error).not.toHaveBeenCalled();
			expect(logger.error).not.toHaveBeenCalled();
		});

		it('hands the runs of a later takeover a fresh signal', async () => {
			const { runner, metadata } = setup();
			const runSignals: AbortSignal[] = [];
			dummy.onRun = async (signal) => {
				runSignals.push(signal);
			};
			metadata.register(DummySystemTask);
			await runner.init();
			await vi.advanceTimersByTimeAsync(ONE_INTERVAL_MS);

			await runner.stopTimers();
			runner.startTimers();
			await vi.advanceTimersByTimeAsync(ONE_INTERVAL_MS);

			expect(runSignals).toHaveLength(2);
			expect(runSignals[0].aborted).toBe(true);
			expect(runSignals[1].aborted).toBe(false);
		});

		it('drops a pending retry on stepdown', async () => {
			const { runner, metadata } = setup();
			dummy.retryDelaySeconds = 5;
			dummy.onRun = async () => {
				throw new Error('failed');
			};
			metadata.register(DummySystemTask);
			await runner.init();
			await vi.advanceTimersByTimeAsync(ONE_INTERVAL_MS);

			await runner.stopTimers();
			await vi.advanceTimersByTimeAsync(10 * ONE_INTERVAL_MS);

			expect(dummy.runCount).toBe(1);
		});

		it('starts the timers again on a later takeover', async () => {
			const { runner, metadata } = setup();
			metadata.register(DummySystemTask);
			await runner.init();

			await runner.stopTimers();
			await vi.advanceTimersByTimeAsync(10 * ONE_INTERVAL_MS);
			expect(dummy.runCount).toBe(0);

			runner.startTimers();
			await vi.advanceTimersByTimeAsync(ONE_INTERVAL_MS);

			expect(dummy.runCount).toBe(1);
		});

		it('does not start the timers again after shutdown', async () => {
			const { runner, metadata } = setup();
			metadata.register(DummySystemTask);
			await runner.init();

			await runner.shutdown();
			runner.startTimers();
			await vi.advanceTimersByTimeAsync(10 * ONE_INTERVAL_MS);

			expect(dummy.runCount).toBe(0);
		});
	});

	describe('provisioning durable jobs', () => {
		const durably = { schedulerActive: true, enabledForSystemTasks: true };

		it('provisions one job per durable task, owned by the task', async () => {
			dummy.durable = true;
			const { runner, metadata, durableJobProvisioner } = setup(durably);
			metadata.register(DummySystemTask);

			await runner.init();

			expect(durableJobProvisioner.provision).toHaveBeenCalledTimes(1);
			expect(durableJobProvisioner.provision).toHaveBeenCalledWith({
				owner: { ownerType: 'system-task', ownerId: 'dummy', ownerMemberId: null },
				taskType: 'system:dummy',
				payload: {},
				desired: [
					{
						name: 'system:dummy',
						schedule: { kind: 'interval', intervalSeconds: 60 },
						firstRunAt: new Date(START.getTime() + ONE_INTERVAL_MS),
					},
				],
				misfirePolicy: 'coalesce',
				misfireGraceSeconds: 60,
				maxAttempts: 3,
			});
		});

		it('provisions each durable task separately', async () => {
			dummy.durable = true;
			const other = new OtherDummySystemTask();
			other.durable = true;
			Container.set(OtherDummySystemTask, other);
			const { runner, metadata, durableJobProvisioner } = setup(durably);
			metadata.register(DummySystemTask);
			metadata.register(OtherDummySystemTask);

			await runner.init();

			expect(durableJobProvisioner.provision).toHaveBeenCalledTimes(2);
			expect(durableJobProvisioner.provision.mock.calls.map(([request]) => request.owner)).toEqual([
				{ ownerType: 'system-task', ownerId: 'dummy', ownerMemberId: null },
				{ ownerType: 'system-task', ownerId: 'other-dummy', ownerMemberId: null },
			]);
		});

		it('leaves a task on an in-memory timer unprovisioned', async () => {
			const { runner, metadata, durableJobProvisioner } = setup(durably);
			metadata.register(DummySystemTask);

			await runner.init();

			expect(durableJobProvisioner.provision).not.toHaveBeenCalled();
		});

		it.each([
			{
				case: 'the durable scheduler is inactive',
				schedulerActive: false,
				enabledForSystemTasks: true,
			},
			{ case: 'the system-task flag is off', schedulerActive: true, enabledForSystemTasks: false },
		])(
			'leaves a durable task unprovisioned while $case',
			async ({ schedulerActive, enabledForSystemTasks }) => {
				dummy.durable = true;
				const { runner, metadata, durableJobProvisioner } = setup({
					schedulerActive,
					enabledForSystemTasks,
				});
				metadata.register(DummySystemTask);

				await runner.init();

				expect(durableJobProvisioner.provision).not.toHaveBeenCalled();
			},
		);

		it('reports a task it cannot provision and provisions the rest', async () => {
			dummy.durable = true;
			const other = new OtherDummySystemTask();
			other.durable = true;
			Container.set(OtherDummySystemTask, other);
			const error = new Error('insert failed');
			const { runner, metadata, durableJobProvisioner, errorReporter, logger } = setup(durably);
			durableJobProvisioner.provision.mockRejectedValueOnce(error);
			metadata.register(DummySystemTask);
			metadata.register(OtherDummySystemTask);

			await expect(runner.init()).resolves.toBeUndefined();

			expect(errorReporter.error).toHaveBeenCalledExactlyOnceWith(error, {
				extra: { systemTask: 'dummy' },
				shouldBeLogged: false,
				shouldIsolate: true,
			});
			expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('will not run'), {
				name: 'dummy',
				error,
			});
			expect(durableJobProvisioner.provision).toHaveBeenCalledTimes(2);
		});

		it('logs what the provisioning pass changed for each task', async () => {
			dummy.durable = true;
			const { runner, metadata, durableJobProvisioner, logger } = setup(durably);
			durableJobProvisioner.provision.mockResolvedValue({
				inserted: [{ id: 1, name: 'system:dummy' }],
				redefined: [],
				unchanged: [],
				removed: [],
			});
			metadata.register(DummySystemTask);

			await runner.init();

			expect(logger.debug).toHaveBeenCalledWith('Provisioned the durable job of a system task', {
				name: 'dummy',
				inserted: 1,
				redefined: 0,
				unchanged: 0,
				removed: 0,
			});
		});
	});

	describe('routing', () => {
		const durably = { schedulerActive: true, enabledForSystemTasks: true };

		it('hands a durable task to the durable scheduler', async () => {
			dummy.durable = true;
			const { runner, metadata, durableScheduler } = setup(durably);
			metadata.register(DummySystemTask);

			await runner.init();
			await vi.advanceTimersByTimeAsync(10 * ONE_INTERVAL_MS);

			expect(durableScheduler.registerTaskHandler).toHaveBeenCalledWith(
				'system:dummy',
				expect.any(SystemTaskHandler),
			);
			expect(dummy.runCount).toBe(0);
		});

		it('hands a durable task registered after it took over the registry to the scheduler', async () => {
			dummy.durable = true;
			const { runner, metadata, durableScheduler } = setup(durably);
			await runner.init();

			metadata.register(DummySystemTask);
			await vi.advanceTimersByTimeAsync(10 * ONE_INTERVAL_MS);

			expect(durableScheduler.registerTaskHandler).toHaveBeenCalledWith(
				'system:dummy',
				expect.any(SystemTaskHandler),
			);
			expect(dummy.runCount).toBe(0);
		});

		it('reports a failing durable run, which the executor would not', async () => {
			dummy.durable = true;
			const error = new Error('failed');
			dummy.onRun = async () => {
				throw error;
			};
			const { runner, metadata, durableScheduler, errorReporter } = setup(durably);
			metadata.register(DummySystemTask);
			await runner.init();

			const [, handler] = durableScheduler.registerTaskHandler.mock.calls[0];
			await expect(
				handler.execute(mock<ClaimedTask>(), createDispatchReporter(vi.fn())),
			).rejects.toThrow(error);

			expect(errorReporter.error).toHaveBeenCalledWith(error, {
				extra: { systemTask: 'dummy' },
				shouldBeLogged: false,
				shouldIsolate: true,
			});
		});

		it('aborts the signal of a durable run on shutdown', async () => {
			dummy.durable = true;
			const { runner, metadata, durableScheduler } = setup(durably);
			let runSignal: AbortSignal | undefined;
			let releaseRun = () => {};
			dummy.onRun = async (signal) => {
				runSignal = signal;
				await new Promise<void>((resolve) => {
					releaseRun = resolve;
				});
			};
			metadata.register(DummySystemTask);
			await runner.init();

			const [, handler] = durableScheduler.registerTaskHandler.mock.calls[0];
			const executing = handler.execute(mock<ClaimedTask>(), createDispatchReporter(vi.fn()));
			expect(runSignal?.aborted).toBe(false);

			await runner.shutdown();

			expect(runSignal?.aborted).toBe(true);
			releaseRun();
			await executing;
		});

		it.each([
			{
				case: 'the durable scheduler is inactive',
				schedulerActive: false,
				enabledForSystemTasks: true,
			},
			{ case: 'the system-task flag is off', schedulerActive: true, enabledForSystemTasks: false },
		])(
			'keeps a durable task on its timer while $case',
			async ({ schedulerActive, enabledForSystemTasks }) => {
				dummy.durable = true;
				const { runner, metadata, durableScheduler } = setup({
					schedulerActive,
					enabledForSystemTasks,
				});
				metadata.register(DummySystemTask);

				await runner.init();
				await vi.advanceTimersByTimeAsync(ONE_INTERVAL_MS);

				expect(durableScheduler.registerTaskHandler).not.toHaveBeenCalled();
				expect(dummy.runCount).toBe(1);
			},
		);

		it('keeps a task that has not migrated on its timer', async () => {
			const { runner, metadata, durableScheduler } = setup(durably);
			metadata.register(DummySystemTask);

			await runner.init();
			await vi.advanceTimersByTimeAsync(ONE_INTERVAL_MS);

			expect(durableScheduler.registerTaskHandler).not.toHaveBeenCalled();
			expect(dummy.runCount).toBe(1);
		});

		it.each([0, -5, 2.5, NaN, Infinity, 2_147_484])(
			'rejects a task declaring a retry delay of %s',
			async (retryDelaySeconds) => {
				dummy.retryDelaySeconds = retryDelaySeconds;
				const { runner, metadata } = setup();
				metadata.register(DummySystemTask);

				await expect(runner.init()).rejects.toThrow(
					expect.objectContaining({
						cause: expect.objectContaining({
							message: expect.stringContaining('out-of-range retry delay'),
						}),
					}),
				);
			},
		);

		it('accepts the longest retry delay a timeout honors', async () => {
			dummy.retryDelaySeconds = 2_147_483;
			const { runner, metadata } = setup();
			metadata.register(DummySystemTask);

			await expect(runner.init()).resolves.toBeUndefined();
		});

		it.each([
			{ field: 'maxAttempts', value: 0 },
			{ field: 'misfireGraceSeconds', value: 0 },
		])('rejects a task declaring $field as $value', async ({ field, value }) => {
			Object.assign(dummy, { [field]: value });
			const { runner, metadata } = setup();
			metadata.register(DummySystemTask);

			await expect(runner.init()).rejects.toThrow(
				expect.objectContaining({
					cause: expect.objectContaining({ message: expect.stringContaining(field) }),
				}),
			);
		});

		it('rejects two tasks registered under the same name', async () => {
			const other = new OtherDummySystemTask();
			other.name = dummy.name;
			Container.set(OtherDummySystemTask, other);
			const { runner, metadata } = setup();
			metadata.register(DummySystemTask);
			await runner.init();

			expect(() => metadata.register(OtherDummySystemTask)).toThrow(
				expect.objectContaining({
					cause: expect.objectContaining({
						message: expect.stringContaining('more than once'),
					}),
				}),
			);
		});
	});
});
