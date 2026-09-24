import type { Logger } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import type { ScheduledJobRepository } from '@n8n/db';
import { SystemTaskMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { ClaimedTask } from '@n8n/scheduler';
import { createDispatchReporter } from '@n8n/scheduler';
import { Tracing, type ErrorReporter, type InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import type { EventService } from '@/events/event.service';

import type { DurableScheduler } from '../../durable-scheduler';
import { SystemTaskHandler } from '../system-task-handler';
import type { SystemTaskJobRegistrar } from '../system-task-job-registrar';
import { SystemTaskRunner } from '../system-task-runner';
import { SystemTaskScheduledJobOwner } from '../system-task-scheduled-job-owner';
import { DummySystemTask, OtherDummySystemTask, PerInstanceDummySystemTask } from './dummy.task';

const START = new Date('2026-01-01T00:00:00.000Z');
const ONE_INTERVAL_MS = 60 * Time.seconds.toMilliseconds;

async function initRunner(runner: SystemTaskRunner): Promise<void> {
	await runner.init();
}

describe('SystemTaskRunner', () => {
	let dummy: DummySystemTask;
	let perInstance: PerInstanceDummySystemTask;

	function setup({
		isLeader = true,
		schedulerActive = false,
		enabledForSystemTasks = false,
		instanceRole = 'leader' as InstanceSettings['instanceRole'],
		instanceType = 'main' as InstanceSettings['instanceType'],
	} = {}) {
		const logger = mock<Logger>();
		const metadata = new SystemTaskMetadata();
		const durableScheduler = mock<DurableScheduler>();
		durableScheduler.isActive.mockReturnValue(schedulerActive);
		const errorReporter = mock<ErrorReporter>();
		const jobRegistrar = mock<SystemTaskJobRegistrar>();
		jobRegistrar.isProvisioned.mockResolvedValue(false);
		const jobs = mock<ScheduledJobRepository>();
		jobs.findPayloadsByOwnerIds.mockResolvedValue([]);
		const systemTaskOwner = new SystemTaskScheduledJobOwner(jobs);
		const eventService = mock<EventService>();
		const instanceSettings = mock<InstanceSettings>({ isLeader, instanceRole, instanceType });
		const runner = new SystemTaskRunner(
			mock<Logger>({ scoped: vi.fn().mockReturnValue(logger) }),
			metadata,
			durableScheduler,
			jobRegistrar,
			systemTaskOwner,
			mock<GlobalConfig>({
				generic: { timezone: 'UTC' },
				scheduler: { enabledForSystemTasks },
			}),
			instanceSettings,
			errorReporter,
			eventService,
			new Tracing(),
		);

		return {
			runner,
			metadata,
			durableScheduler,
			jobRegistrar,
			jobs,
			systemTaskOwner,
			errorReporter,
			logger,
			eventService,
			instanceSettings,
		};
	}

	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(START);
		dummy = new DummySystemTask();
		Container.set(DummySystemTask, dummy);
		perInstance = new PerInstanceDummySystemTask();
		Container.set(PerInstanceDummySystemTask, perInstance);
	});

	afterEach(() => {
		vi.useRealTimers();
		Container.reset();
	});

	describe('in-memory timers', () => {
		it('fires a task registered before it took over the registry', async () => {
			const { runner, metadata } = setup({ isLeader: true });
			metadata.register(DummySystemTask);

			await initRunner(runner);
			await vi.advanceTimersByTimeAsync(ONE_INTERVAL_MS);

			expect(dummy.runCount).toBe(1);
		});

		it('fires a task whose interval is not a whole number of seconds on the rounded cadence', async () => {
			const { runner, metadata, logger } = setup({ isLeader: true });
			dummy.schedule = { kind: 'interval', intervalSeconds: 59.99999999999999 };
			metadata.register(DummySystemTask);

			await initRunner(runner);
			await vi.advanceTimersByTimeAsync(ONE_INTERVAL_MS);

			expect(logger.error).not.toHaveBeenCalled();
			expect(dummy.runCount).toBe(1);
			expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('in-memory timer'), {
				name: 'dummy',
				schedule: { kind: 'interval', intervalSeconds: 60 },
			});
		});

		it('fires a cluster-scoped task with a sub-second interval every whole second', async () => {
			const { runner, metadata } = setup({ isLeader: true });
			dummy.schedule = { kind: 'interval', intervalSeconds: 0.5 };
			metadata.register(DummySystemTask);

			await initRunner(runner);
			await vi.advanceTimersByTimeAsync(2 * Time.seconds.toMilliseconds);

			expect(dummy.runCount).toBe(2);
		});

		it('warns when a cluster-scoped task declares a sub-second interval', async () => {
			const { runner, metadata, logger } = setup({ isLeader: true });
			dummy.schedule = { kind: 'interval', intervalSeconds: 0.5 };
			metadata.register(DummySystemTask);

			await initRunner(runner);

			expect(logger.warn).toHaveBeenCalledWith(
				expect.stringContaining('rounded to the whole second'),
				{ name: 'dummy', declaredSeconds: 0.5, intervalSeconds: 1 },
			);
		});

		it.each([
			[
				'a cluster-scoped task with float noise in its interval',
				DummySystemTask,
				59.99999999999999,
			],
			['an instance-scoped task with a sub-second interval', PerInstanceDummySystemTask, 0.5],
		])('does not warn about %s', async (_label, taskClass, intervalSeconds) => {
			const { runner, metadata, logger } = setup({ isLeader: true });
			Container.get(taskClass).schedule = { kind: 'interval', intervalSeconds };
			metadata.register(taskClass);

			await initRunner(runner);

			expect(logger.warn).not.toHaveBeenCalledWith(
				expect.stringContaining('rounded to the whole second'),
				expect.anything(),
			);
		});

		it('fires a task registered after it took over the registry', async () => {
			const { runner, metadata } = setup({ isLeader: true });
			await initRunner(runner);

			metadata.register(DummySystemTask);
			await vi.advanceTimersByTimeAsync(ONE_INTERVAL_MS);

			expect(dummy.runCount).toBe(1);
		});

		it('does not fire on a follower', async () => {
			const { runner, metadata } = setup({ isLeader: false });
			metadata.register(DummySystemTask);

			await initRunner(runner);
			await vi.advanceTimersByTimeAsync(10 * ONE_INTERVAL_MS);

			expect(dummy.runCount).toBe(0);
		});

		it('starts firing on leader takeover', async () => {
			const { runner, metadata } = setup({ isLeader: false });
			metadata.register(DummySystemTask);
			await initRunner(runner);

			runner.startLeaderTimers();
			await vi.advanceTimersByTimeAsync(ONE_INTERVAL_MS);

			expect(dummy.runCount).toBe(1);
		});

		it('leaves a running timer alone when leadership is announced again', async () => {
			const { runner, metadata } = setup();
			metadata.register(DummySystemTask);
			await initRunner(runner);

			await vi.advanceTimersByTimeAsync(ONE_INTERVAL_MS / 2);
			runner.startLeaderTimers();
			await vi.advanceTimersByTimeAsync(ONE_INTERVAL_MS / 2);

			expect(dummy.runCount).toBe(1);
		});

		it('runs a takeover task at once when the timers start', async () => {
			const { runner, metadata } = setup({ isLeader: true });
			dummy.placement = { scope: 'cluster', durable: false, runOnTakeover: true };
			metadata.register(DummySystemTask);

			await initRunner(runner);
			expect(dummy.runCount).toBe(1);

			await vi.advanceTimersByTimeAsync(ONE_INTERVAL_MS);
			expect(dummy.runCount).toBe(2);
		});

		it('runs a takeover task registered after takeover at once', async () => {
			const { runner, metadata } = setup({ isLeader: true });
			dummy.placement = { scope: 'cluster', durable: false, runOnTakeover: true };
			await initRunner(runner);

			metadata.register(DummySystemTask);

			expect(dummy.runCount).toBe(1);
		});

		it('does not run a takeover task on a follower', async () => {
			const { runner, metadata } = setup({ isLeader: false });
			dummy.placement = { scope: 'cluster', durable: false, runOnTakeover: true };
			metadata.register(DummySystemTask);

			await initRunner(runner);
			await vi.advanceTimersByTimeAsync(10 * ONE_INTERVAL_MS);

			expect(dummy.runCount).toBe(0);
		});

		it('runs a takeover task again on a later takeover', async () => {
			const { runner, metadata } = setup({ isLeader: true });
			dummy.placement = { scope: 'cluster', durable: false, runOnTakeover: true };
			metadata.register(DummySystemTask);
			await initRunner(runner);

			await runner.stopLeaderTimers();
			runner.startLeaderTimers();

			expect(dummy.runCount).toBe(2);
		});

		it('skips an occurrence while the previous run is still going', async () => {
			const { runner, metadata, logger } = setup();
			dummy.onRun = async () => await new Promise<void>(() => {});
			metadata.register(DummySystemTask);
			await initRunner(runner);

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
			await initRunner(runner);

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
			await initRunner(runner);

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
			await initRunner(runner);

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
			await initRunner(runner);

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
			await initRunner(runner);

			await vi.advanceTimersByTimeAsync(ONE_INTERVAL_MS + 10 * Time.seconds.toMilliseconds);

			expect(dummy.runCount).toBe(3);
		});

		it('does not retry a successful run', async () => {
			const { runner, metadata } = setup();
			dummy.retryDelaySeconds = 5;
			metadata.register(DummySystemTask);
			await initRunner(runner);

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
			await initRunner(runner);

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
			await initRunner(runner);

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
			await initRunner(runner);

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

			await initRunner(runner);

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

	describe('in-memory runs of a task provisioned elsewhere', () => {
		it('skips the run when a durable job is stored for the task', async () => {
			const { runner, metadata, jobRegistrar, logger } = setup();
			dummy.placement = { scope: 'cluster', durable: true };
			dummy.retryDelaySeconds = 1;
			jobRegistrar.isProvisioned.mockResolvedValue(true);
			metadata.register(DummySystemTask);
			await initRunner(runner);

			await vi.advanceTimersByTimeAsync(2 * ONE_INTERVAL_MS);

			expect(dummy.runCount).toBe(0);
			expect(jobRegistrar.isProvisioned).toHaveBeenCalledTimes(2);
			expect(jobRegistrar.isProvisioned).toHaveBeenCalledWith('dummy');
			expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('Skipped'), {
				name: 'dummy',
			});
		});

		it('skips a takeover run when a durable job is stored for the task', async () => {
			const { runner, metadata, jobRegistrar } = setup();
			dummy.placement = { scope: 'cluster', durable: true, runOnTakeover: true };
			jobRegistrar.isProvisioned.mockResolvedValue(true);
			metadata.register(DummySystemTask);

			await initRunner(runner);

			expect(dummy.runCount).toBe(0);
		});

		it('runs when no durable job is stored for the task', async () => {
			const { runner, metadata, jobRegistrar } = setup();
			dummy.placement = { scope: 'cluster', durable: true };
			jobRegistrar.isProvisioned.mockResolvedValue(false);
			metadata.register(DummySystemTask);
			await initRunner(runner);

			await vi.advanceTimersByTimeAsync(ONE_INTERVAL_MS);

			expect(dummy.runCount).toBe(1);
		});

		it('does not run a task whose store check settles after stepdown', async () => {
			const { runner, metadata, jobRegistrar } = setup();
			dummy.placement = { scope: 'cluster', durable: true };
			let settleCheck!: (exists: boolean) => void;
			jobRegistrar.isProvisioned.mockReturnValue(
				new Promise<boolean>((resolve) => {
					settleCheck = resolve;
				}),
			);
			metadata.register(DummySystemTask);
			await initRunner(runner);
			await vi.advanceTimersByTimeAsync(ONE_INTERVAL_MS);

			const stepdown = runner.stopLeaderTimers();
			settleCheck(false);
			await stepdown;

			expect(dummy.runCount).toBe(0);
		});

		it('does not run a task whose store check settles after stepdown and takeover', async () => {
			const { runner, metadata, jobRegistrar, eventService } = setup();
			dummy.placement = { scope: 'cluster', durable: true };
			let settleCheck!: (exists: boolean) => void;
			jobRegistrar.isProvisioned.mockReturnValueOnce(
				new Promise<boolean>((resolve) => {
					settleCheck = resolve;
				}),
			);
			jobRegistrar.isProvisioned.mockResolvedValue(false);
			metadata.register(DummySystemTask);
			await initRunner(runner);
			await vi.advanceTimersByTimeAsync(ONE_INTERVAL_MS);

			const stepdown = runner.stopLeaderTimers();
			runner.startLeaderTimers();
			settleCheck(false);
			await stepdown;

			expect(dummy.runCount).toBe(0);
			expect(eventService.emit).toHaveBeenCalledWith('system-task-run-skipped', {
				name: 'dummy',
				reason: 'aborted',
			});

			await vi.advanceTimersByTimeAsync(ONE_INTERVAL_MS);

			expect(dummy.runCount).toBe(1);
		});

		it('does not ask for a task that never runs durably', async () => {
			const { runner, metadata, jobRegistrar } = setup();
			jobRegistrar.isProvisioned.mockResolvedValue(true);
			metadata.register(DummySystemTask);
			await initRunner(runner);

			await vi.advanceTimersByTimeAsync(ONE_INTERVAL_MS);

			expect(dummy.runCount).toBe(1);
			expect(jobRegistrar.isProvisioned).not.toHaveBeenCalled();
		});
	});

	describe('leadership and shutdown', () => {
		it('refuses to init before the instance role is resolved', async () => {
			const { runner, metadata } = setup({ instanceRole: 'unset' });
			metadata.register(DummySystemTask);

			await expect(runner.init()).rejects.toThrow('Instance role is not set');
		});

		it('does not touch the durable jobs on a worker', async () => {
			dummy.placement = { scope: 'cluster', durable: true };
			const { runner, metadata, jobRegistrar } = setup({
				isLeader: false,
				instanceRole: 'unset',
				instanceType: 'worker',
				schedulerActive: true,
				enabledForSystemTasks: true,
			});
			metadata.register(DummySystemTask);

			await runner.init();

			expect(jobRegistrar.provision).not.toHaveBeenCalled();
			expect(jobRegistrar.removeStale).not.toHaveBeenCalled();
		});

		it('stops the timers on stepdown, awaiting the run in flight', async () => {
			const { runner, metadata } = setup();
			let releaseRun = () => {};
			dummy.onRun = async () =>
				await new Promise<void>((resolve) => {
					releaseRun = resolve;
				});
			metadata.register(DummySystemTask);
			await initRunner(runner);
			await vi.advanceTimersByTimeAsync(ONE_INTERVAL_MS);

			const stopping = runner.stopLeaderTimers();
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
			await initRunner(runner);
			await vi.advanceTimersByTimeAsync(ONE_INTERVAL_MS);
			expect(runSignal?.aborted).toBe(false);

			const stopping = runner.stopLeaderTimers();

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
			await initRunner(runner);
			await vi.advanceTimersByTimeAsync(ONE_INTERVAL_MS);

			await runner.stopLeaderTimers();

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
			await initRunner(runner);
			await vi.advanceTimersByTimeAsync(ONE_INTERVAL_MS);

			await runner.stopLeaderTimers();
			runner.startLeaderTimers();
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
			await initRunner(runner);
			await vi.advanceTimersByTimeAsync(ONE_INTERVAL_MS);

			await runner.stopLeaderTimers();
			await vi.advanceTimersByTimeAsync(10 * ONE_INTERVAL_MS);

			expect(dummy.runCount).toBe(1);
		});

		it('starts the timers again on a later takeover', async () => {
			const { runner, metadata } = setup();
			metadata.register(DummySystemTask);
			await initRunner(runner);

			await runner.stopLeaderTimers();
			await vi.advanceTimersByTimeAsync(10 * ONE_INTERVAL_MS);
			expect(dummy.runCount).toBe(0);

			runner.startLeaderTimers();
			await vi.advanceTimersByTimeAsync(ONE_INTERVAL_MS);

			expect(dummy.runCount).toBe(1);
		});

		it('does not start the timers again after shutdown', async () => {
			const { runner, metadata } = setup();
			metadata.register(DummySystemTask);
			await initRunner(runner);

			await runner.shutdown();
			runner.startLeaderTimers();
			await vi.advanceTimersByTimeAsync(10 * ONE_INTERVAL_MS);

			expect(dummy.runCount).toBe(0);
		});
	});

	describe('provisioning durable jobs', () => {
		const durably = { schedulerActive: true, enabledForSystemTasks: true };

		it('hands each durable task to the job registrar', async () => {
			dummy.placement = { scope: 'cluster', durable: true };
			const other = new OtherDummySystemTask();
			other.placement = { scope: 'cluster', durable: true };
			Container.set(OtherDummySystemTask, other);
			const { runner, metadata, jobRegistrar } = setup(durably);
			metadata.register(DummySystemTask);
			metadata.register(OtherDummySystemTask);

			await initRunner(runner);

			expect(jobRegistrar.provision.mock.calls).toEqual([[dummy], [other]]);
		});

		it('leaves a task on an in-memory timer unprovisioned', async () => {
			const { runner, metadata, jobRegistrar } = setup(durably);
			metadata.register(DummySystemTask);

			await initRunner(runner);

			expect(jobRegistrar.provision).not.toHaveBeenCalled();
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
				dummy.placement = { scope: 'cluster', durable: true };
				const { runner, metadata, jobRegistrar } = setup({
					schedulerActive,
					enabledForSystemTasks,
				});
				metadata.register(DummySystemTask);

				await initRunner(runner);

				expect(jobRegistrar.provision).not.toHaveBeenCalled();
			},
		);
	});

	describe('removing stale durable jobs', () => {
		const durably = { schedulerActive: true, enabledForSystemTasks: true };

		it('removes stale jobs once, after provisioning the wanted ones', async () => {
			dummy.placement = { scope: 'cluster', durable: true };
			const { runner, metadata, jobRegistrar } = setup(durably);
			metadata.register(DummySystemTask);

			await initRunner(runner);

			expect(jobRegistrar.removeStale).toHaveBeenCalledOnce();
			const [provisioned] = jobRegistrar.provision.mock.invocationCallOrder;
			const [removed] = jobRegistrar.removeStale.mock.invocationCallOrder;
			expect(provisioned).toBeLessThan(removed);
		});

		it.each([
			{
				case: 'the durable scheduler is inactive',
				schedulerActive: false,
				enabledForSystemTasks: true,
			},
			{ case: 'the system-task flag is off', schedulerActive: true, enabledForSystemTasks: false },
		])('removes stale jobs while $case', async ({ schedulerActive, enabledForSystemTasks }) => {
			const { runner, jobRegistrar } = setup({ schedulerActive, enabledForSystemTasks });

			await initRunner(runner);

			expect(jobRegistrar.removeStale).toHaveBeenCalledOnce();
		});
	});

	describe('routing', () => {
		const durably = { schedulerActive: true, enabledForSystemTasks: true };

		it('hands a durable task to the durable scheduler', async () => {
			dummy.placement = { scope: 'cluster', durable: true };
			const { runner, metadata, durableScheduler } = setup(durably);
			metadata.register(DummySystemTask);

			await initRunner(runner);
			await vi.advanceTimersByTimeAsync(10 * ONE_INTERVAL_MS);

			expect(durableScheduler.registerTaskHandler).toHaveBeenCalledWith(
				'system:dummy',
				expect.any(SystemTaskHandler),
			);
			expect(dummy.runCount).toBe(0);
		});

		it('hands a durable task registered after it took over the registry to the scheduler', async () => {
			dummy.placement = { scope: 'cluster', durable: true };
			const { runner, metadata, durableScheduler } = setup(durably);
			await initRunner(runner);

			metadata.register(DummySystemTask);
			await vi.advanceTimersByTimeAsync(10 * ONE_INTERVAL_MS);

			expect(durableScheduler.registerTaskHandler).toHaveBeenCalledWith(
				'system:dummy',
				expect.any(SystemTaskHandler),
			);
			expect(dummy.runCount).toBe(0);
		});

		it('reports a failing durable run, which the executor would not', async () => {
			dummy.placement = { scope: 'cluster', durable: true };
			const error = new Error('failed');
			dummy.onRun = async () => {
				throw error;
			};
			const { runner, metadata, durableScheduler, errorReporter } = setup(durably);
			metadata.register(DummySystemTask);
			await initRunner(runner);

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
			dummy.placement = { scope: 'cluster', durable: true };
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
			await initRunner(runner);

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
				dummy.placement = { scope: 'cluster', durable: true };
				const { runner, metadata, durableScheduler } = setup({
					schedulerActive,
					enabledForSystemTasks,
				});
				metadata.register(DummySystemTask);

				await initRunner(runner);
				await vi.advanceTimersByTimeAsync(ONE_INTERVAL_MS);

				expect(durableScheduler.registerTaskHandler).not.toHaveBeenCalled();
				expect(dummy.runCount).toBe(1);
			},
		);

		it('keeps a task that has not migrated on its timer', async () => {
			const { runner, metadata, durableScheduler } = setup(durably);
			metadata.register(DummySystemTask);

			await initRunner(runner);
			await vi.advanceTimersByTimeAsync(ONE_INTERVAL_MS);

			expect(durableScheduler.registerTaskHandler).not.toHaveBeenCalled();
			expect(dummy.runCount).toBe(1);
		});

		it('declares a task it hands to the durable scheduler to the job owner', async () => {
			dummy.placement = { scope: 'cluster', durable: true };
			const { runner, metadata, systemTaskOwner } = setup(durably);
			metadata.register(DummySystemTask);

			await initRunner(runner);

			await expect(systemTaskOwner.findExisting(['dummy'])).resolves.toEqual(new Set(['dummy']));
		});

		it('does not declare a task it keeps on a timer to the job owner', async () => {
			dummy.placement = { scope: 'cluster', durable: true };
			const { runner, metadata, systemTaskOwner } = setup({ enabledForSystemTasks: false });
			metadata.register(DummySystemTask);

			await initRunner(runner);

			await expect(systemTaskOwner.findExisting(['dummy'])).resolves.toEqual(new Set());
		});

		it.each([0, -5, 2.5, NaN, Infinity, 2_147_484])(
			'rejects a task declaring a retry delay of %s',
			async (retryDelaySeconds) => {
				dummy.retryDelaySeconds = retryDelaySeconds;
				const { runner, metadata } = setup();
				metadata.register(DummySystemTask);

				await expect(initRunner(runner)).rejects.toThrow(
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

			await expect(initRunner(runner)).resolves.toBeUndefined();
		});

		it.each([
			{ field: 'maxAttempts', value: 0 },
			{ field: 'misfireGraceSeconds', value: 0 },
		])('rejects a task declaring $field as $value', async ({ field, value }) => {
			Object.assign(dummy, { [field]: value });
			const { runner, metadata } = setup();
			metadata.register(DummySystemTask);

			await expect(initRunner(runner)).rejects.toThrow(
				expect.objectContaining({
					cause: expect.objectContaining({
						message: 'A system task declares an out-of-range option',
						extra: expect.objectContaining({ field }),
					}),
				}),
			);
		});

		it('rejects a task declaring a bad option on an instance kind that does not run it', async () => {
			dummy.retryDelaySeconds = 0;
			const { runner, metadata } = setup({
				isLeader: false,
				instanceRole: 'unset',
				instanceType: 'worker',
			});
			metadata.register(DummySystemTask);

			await expect(runner.init()).rejects.toThrow(
				expect.objectContaining({
					cause: expect.objectContaining({
						message: expect.stringContaining('out-of-range retry delay'),
					}),
				}),
			);
		});

		it('rejects two tasks registered under the same name', async () => {
			const other = new OtherDummySystemTask();
			other.name = dummy.name;
			Container.set(OtherDummySystemTask, other);
			const { runner, metadata } = setup();
			metadata.register(DummySystemTask);
			await initRunner(runner);

			expect(() => metadata.register(OtherDummySystemTask)).toThrow(
				expect.objectContaining({
					cause: expect.objectContaining({
						message: expect.stringContaining('more than once'),
					}),
				}),
			);
		});

		it('rejects two tasks registered under the same name when only one runs here', async () => {
			perInstance.name = dummy.name;
			const { runner, metadata } = setup({
				isLeader: false,
				instanceRole: 'unset',
				instanceType: 'worker',
			});
			metadata.register(DummySystemTask);
			metadata.register(PerInstanceDummySystemTask);

			await expect(runner.init()).rejects.toThrow(
				expect.objectContaining({
					cause: expect.objectContaining({
						message: expect.stringContaining('more than once'),
					}),
				}),
			);
		});
	});

	describe('metrics events', () => {
		const durably = { schedulerActive: true, enabledForSystemTasks: true };

		type Emitted = [string, Record<string, unknown>];
		const emittedCalls = (eventService: EventService) =>
			(eventService.emit as unknown as { mock: { calls: Emitted[] } }).mock.calls;
		const emitted = (eventService: EventService, event: string) =>
			emittedCalls(eventService).filter(([name]) => name === event);
		const emittedIndex = (eventService: EventService, event: string) =>
			emittedCalls(eventService).findIndex(([name]) => name === event);

		it('emits an in-memory task as routed, with its interval', async () => {
			const { runner, metadata, eventService } = setup();
			metadata.register(DummySystemTask);

			await initRunner(runner);

			expect(eventService.emit).toHaveBeenCalledWith('system-task-routed', {
				name: 'dummy',
				mode: 'leader_timer',
				intervalSeconds: 60,
			});
		});

		it('emits a cron task as routed without an interval', async () => {
			const { runner, metadata, eventService } = setup();
			dummy.schedule = { kind: 'cron', cronExpression: '0 0 * * * *', timezone: 'UTC' };
			metadata.register(DummySystemTask);

			await initRunner(runner);

			expect(eventService.emit).toHaveBeenCalledWith('system-task-routed', {
				name: 'dummy',
				mode: 'leader_timer',
				intervalSeconds: undefined,
			});
		});

		it('emits a durable task as routed', async () => {
			dummy.placement = { scope: 'cluster', durable: true };
			const { runner, metadata, eventService } = setup(durably);
			metadata.register(DummySystemTask);

			await initRunner(runner);

			expect(eventService.emit).toHaveBeenCalledWith('system-task-routed', {
				name: 'dummy',
				mode: 'durable',
				intervalSeconds: 60,
			});
		});

		it('emits each fire with its lag, then the run as started and settled', async () => {
			const { runner, metadata, eventService } = setup();
			dummy.onRun = async () => {
				await vi.advanceTimersByTimeAsync(250);
			};
			metadata.register(DummySystemTask);
			await initRunner(runner);

			await vi.advanceTimersByTimeAsync(ONE_INTERVAL_MS);

			expect(eventService.emit).toHaveBeenCalledWith('system-task-fired', {
				name: 'dummy',
				lagMs: 0,
			});
			expect(eventService.emit).toHaveBeenCalledWith('system-task-run-started', {
				name: 'dummy',
				mode: 'leader_timer',
			});
			expect(eventService.emit).toHaveBeenCalledWith('system-task-run-settled', {
				name: 'dummy',
				mode: 'leader_timer',
				result: 'success',
				durationMs: 250,
			});
		});

		it('emits the occurrences a coalesced fire stands in for as skipped', async () => {
			const { runner, metadata, eventService } = setup();
			metadata.register(DummySystemTask);
			await initRunner(runner);

			vi.setSystemTime(START.getTime() + Time.hours.toMilliseconds);
			await vi.advanceTimersByTimeAsync(ONE_INTERVAL_MS);

			expect(eventService.emit).toHaveBeenCalledWith('system-task-fired', {
				name: 'dummy',
				lagMs: Time.hours.toMilliseconds,
			});
			expect(eventService.emit).toHaveBeenCalledWith('system-task-run-skipped', {
				name: 'dummy',
				reason: 'coalesced',
				count: 60,
			});
		});

		it('emits the occurrence each timer arms for', async () => {
			const { runner, metadata, eventService } = setup();
			metadata.register(DummySystemTask);
			await initRunner(runner);

			expect(eventService.emit).toHaveBeenCalledWith('system-task-next-run-planned', {
				name: 'dummy',
				nextRunAtMs: START.getTime() + ONE_INTERVAL_MS,
			});

			await vi.advanceTimersByTimeAsync(ONE_INTERVAL_MS);

			expect(eventService.emit).toHaveBeenCalledWith('system-task-next-run-planned', {
				name: 'dummy',
				nextRunAtMs: START.getTime() + 2 * ONE_INTERVAL_MS,
			});
		});

		it('emits the timers as started on takeover and as stopped on stepdown', async () => {
			const { runner, metadata, eventService } = setup({ isLeader: false });
			metadata.register(DummySystemTask);
			await initRunner(runner);
			expect(emitted(eventService, 'system-task-timers-started')).toHaveLength(0);

			runner.startLeaderTimers();
			expect(eventService.emit).toHaveBeenCalledWith('system-task-timers-started', {});

			await runner.stopLeaderTimers();
			expect(eventService.emit).toHaveBeenCalledWith('system-task-timers-stopped', {});
		});

		it('emits the one start on init when a takeover arrived before it', async () => {
			const { runner, metadata, eventService } = setup();
			metadata.register(DummySystemTask);

			// A leader check can win leadership before the runner owns the registry,
			// while the metrics collector is not listening yet.
			runner.startLeaderTimers();
			expect(emitted(eventService, 'system-task-timers-started')).toHaveLength(0);

			await initRunner(runner);

			expect(emitted(eventService, 'system-task-timers-started')).toHaveLength(1);
			await vi.advanceTimersByTimeAsync(ONE_INTERVAL_MS);
			expect(dummy.runCount).toBe(1);
		});

		it('stays stopped when an early takeover is followed by stepdown before init', async () => {
			const { runner, metadata, eventService, instanceSettings } = setup();
			dummy.placement = { scope: 'cluster', durable: false, runOnTakeover: true };
			metadata.register(DummySystemTask);

			runner.startLeaderTimers();
			Object.assign(instanceSettings, { isLeader: false, instanceRole: 'follower' });
			await runner.stopLeaderTimers();
			await initRunner(runner);
			await vi.advanceTimersByTimeAsync(ONE_INTERVAL_MS);

			expect(emitted(eventService, 'system-task-timers-started')).toHaveLength(0);
			expect(dummy.runCount).toBe(0);

			Object.assign(instanceSettings, { isLeader: true, instanceRole: 'leader' });
			runner.startLeaderTimers();

			expect(emitted(eventService, 'system-task-timers-started')).toHaveLength(1);
			expect(dummy.runCount).toBe(1);
			await vi.advanceTimersByTimeAsync(ONE_INTERVAL_MS);
			expect(dummy.runCount).toBe(2);
		});

		it('emits no stop for a stepdown that a takeover outran', async () => {
			const { runner, metadata, eventService } = setup();
			let release!: () => void;
			dummy.onRun = async () =>
				await new Promise<void>((resolve) => {
					release = resolve;
				});
			metadata.register(DummySystemTask);
			await initRunner(runner);
			await vi.advanceTimersByTimeAsync(ONE_INTERVAL_MS);
			expect(dummy.runCount).toBe(1);

			const stopping = runner.stopLeaderTimers();
			runner.startLeaderTimers();
			release();
			await stopping;

			expect(emitted(eventService, 'system-task-timers-started')).toHaveLength(2);
			expect(emitted(eventService, 'system-task-timers-stopped')).toHaveLength(0);
		});

		it('runs the occurrence although a metrics listener throws', async () => {
			const { runner, metadata, eventService, errorReporter } = setup();
			eventService.emit.mockImplementation(() => {
				throw new Error('sink');
			});
			metadata.register(DummySystemTask);
			await initRunner(runner);

			await vi.advanceTimersByTimeAsync(ONE_INTERVAL_MS);

			expect(dummy.runCount).toBe(1);
			expect(errorReporter.error).not.toHaveBeenCalled();
		});

		it('settles a failing run as a failure and emits the retry it schedules', async () => {
			const { runner, metadata, eventService } = setup();
			dummy.retryDelaySeconds = 5;
			dummy.onRun = async () => {
				throw new Error('failed');
			};
			metadata.register(DummySystemTask);
			await initRunner(runner);

			await vi.advanceTimersByTimeAsync(ONE_INTERVAL_MS);

			expect(eventService.emit).toHaveBeenCalledWith(
				'system-task-run-settled',
				expect.objectContaining({ name: 'dummy', mode: 'leader_timer', result: 'failure' }),
			);
			expect(eventService.emit).toHaveBeenCalledWith('system-task-retry-scheduled', {
				name: 'dummy',
			});
		});

		it('does not emit a retry it does not schedule', async () => {
			const { runner, metadata, eventService } = setup();
			dummy.onRun = async () => {
				throw new Error('failed');
			};
			metadata.register(DummySystemTask);
			await initRunner(runner);

			await vi.advanceTimersByTimeAsync(ONE_INTERVAL_MS);

			expect(emitted(eventService, 'system-task-retry-scheduled')).toHaveLength(0);
		});

		it('settles a run that rejects once stepdown aborted its signal as aborted', async () => {
			const { runner, metadata, eventService } = setup();
			dummy.onRun = async (signal) =>
				await new Promise<void>((_, reject) => {
					signal.addEventListener('abort', () => reject(new Error('aborted')));
				});
			metadata.register(DummySystemTask);
			await initRunner(runner);
			await vi.advanceTimersByTimeAsync(ONE_INTERVAL_MS);

			await runner.stopLeaderTimers();

			expect(eventService.emit).toHaveBeenCalledWith(
				'system-task-run-settled',
				expect.objectContaining({ result: 'aborted' }),
			);
		});

		it('emits every skipped occurrence of a stuck run, not only the warned one', async () => {
			const { runner, metadata, eventService } = setup();
			dummy.onRun = async () => await new Promise<void>(() => {});
			metadata.register(DummySystemTask);
			await initRunner(runner);

			await vi.advanceTimersByTimeAsync(3 * ONE_INTERVAL_MS);

			expect(emitted(eventService, 'system-task-run-skipped')).toEqual([
				['system-task-run-skipped', { name: 'dummy', reason: 'overlap' }],
				['system-task-run-skipped', { name: 'dummy', reason: 'overlap' }],
			]);
			expect(emitted(eventService, 'system-task-run-started')).toHaveLength(1);
		});

		it('emits a run skipped for a durable job provisioned elsewhere, without starting it', async () => {
			const { runner, metadata, jobRegistrar, eventService } = setup();
			dummy.placement = { scope: 'cluster', durable: true };
			jobRegistrar.isProvisioned.mockResolvedValue(true);
			metadata.register(DummySystemTask);
			await initRunner(runner);

			await vi.advanceTimersByTimeAsync(ONE_INTERVAL_MS);

			expect(eventService.emit).toHaveBeenCalledWith('system-task-run-skipped', {
				name: 'dummy',
				reason: 'provisioned_elsewhere',
			});
			expect(emitted(eventService, 'system-task-run-started')).toHaveLength(0);
		});

		it('emits a run skipped when its store check settles after stepdown', async () => {
			const { runner, metadata, jobRegistrar, eventService } = setup();
			dummy.placement = { scope: 'cluster', durable: true };
			let settleCheck!: (exists: boolean) => void;
			jobRegistrar.isProvisioned.mockReturnValue(
				new Promise<boolean>((resolve) => {
					settleCheck = resolve;
				}),
			);
			metadata.register(DummySystemTask);
			await initRunner(runner);
			await vi.advanceTimersByTimeAsync(ONE_INTERVAL_MS);

			const stepdown = runner.stopLeaderTimers();
			settleCheck(false);
			await stepdown;

			expect(eventService.emit).toHaveBeenCalledWith('system-task-run-skipped', {
				name: 'dummy',
				reason: 'aborted',
			});
		});

		it('emits a scheduling failure for a schedule it cannot plan', async () => {
			const { runner, metadata, eventService } = setup();
			dummy.schedule = { kind: 'cron', cronExpression: 'not-a-cron', timezone: 'UTC' };
			metadata.register(DummySystemTask);

			await initRunner(runner);

			expect(eventService.emit).toHaveBeenCalledWith('system-task-scheduling-failed', {
				name: 'dummy',
				mode: 'leader_timer',
			});
		});

		it('emits the timers as started before it starts them, so a scheduling failure stands', async () => {
			const { runner, metadata, eventService } = setup();
			dummy.schedule = { kind: 'cron', cronExpression: 'not-a-cron', timezone: 'UTC' };
			metadata.register(DummySystemTask);

			await initRunner(runner);

			const started = emittedIndex(eventService, 'system-task-timers-started');
			expect(started).toBeGreaterThanOrEqual(0);
			expect(started).toBeLessThan(emittedIndex(eventService, 'system-task-scheduling-failed'));
		});

		it('emits the runs of a durable task as durable', async () => {
			dummy.placement = { scope: 'cluster', durable: true };
			const { runner, metadata, durableScheduler, eventService } = setup(durably);
			metadata.register(DummySystemTask);
			await initRunner(runner);

			const [, handler] = durableScheduler.registerTaskHandler.mock.calls[0];
			await handler.execute(mock<ClaimedTask>(), createDispatchReporter(vi.fn()));

			expect(eventService.emit).toHaveBeenCalledWith('system-task-run-started', {
				name: 'dummy',
				mode: 'durable',
			});
			expect(eventService.emit).toHaveBeenCalledWith(
				'system-task-run-settled',
				expect.objectContaining({ name: 'dummy', mode: 'durable', result: 'success' }),
			);
		});
	});
	describe('per-instance timers', () => {
		it('fires an instance-scoped task on a follower main, which fires no cluster-scoped one', async () => {
			const { runner, metadata } = setup({
				isLeader: false,
				instanceRole: 'follower',
			});
			metadata.register(DummySystemTask);
			metadata.register(PerInstanceDummySystemTask);

			await runner.init();
			await vi.advanceTimersByTimeAsync(ONE_INTERVAL_MS);

			expect(perInstance.runCount).toBe(1);
			expect(dummy.runCount).toBe(0);
		});

		it('fires an instance-scoped task with a sub-second interval on its sub-second cadence', async () => {
			const { runner, metadata, errorReporter } = setup();
			perInstance.schedule = { kind: 'interval', intervalSeconds: 0.5 };
			metadata.register(PerInstanceDummySystemTask);

			await runner.init();
			await vi.advanceTimersByTimeAsync(2 * Time.seconds.toMilliseconds);

			expect(errorReporter.error).not.toHaveBeenCalled();
			expect(perInstance.runCount).toBe(4);
		});

		it('fires an instance-scoped task on a worker, which has no role at all', async () => {
			const { runner, metadata } = setup({
				isLeader: false,
				instanceRole: 'unset',
				instanceType: 'worker',
			});
			metadata.register(PerInstanceDummySystemTask);

			await runner.init();
			await vi.advanceTimersByTimeAsync(ONE_INTERVAL_MS);

			expect(perInstance.runCount).toBe(1);
		});

		it('fires an instance-scoped task registered after it took over the registry', async () => {
			const { runner, metadata } = setup();
			await runner.init();

			metadata.register(PerInstanceDummySystemTask);
			await vi.advanceTimersByTimeAsync(ONE_INTERVAL_MS);

			expect(perInstance.runCount).toBe(1);
		});

		it('keeps an instance-scoped task running through a stepdown', async () => {
			const { runner, metadata } = setup();
			metadata.register(DummySystemTask);
			metadata.register(PerInstanceDummySystemTask);
			await initRunner(runner);

			await runner.stopLeaderTimers();
			await vi.advanceTimersByTimeAsync(ONE_INTERVAL_MS);

			expect(dummy.runCount).toBe(0);
			expect(perInstance.runCount).toBe(1);
		});

		it('does not abort or await an instance-scoped run in flight on a stepdown', async () => {
			const { runner, metadata } = setup();
			let runSignal: AbortSignal | undefined;
			let releaseRun = () => {};
			perInstance.onRun = async (signal) => {
				runSignal = signal;
				await new Promise<void>((resolve) => {
					releaseRun = resolve;
				});
			};
			metadata.register(PerInstanceDummySystemTask);
			await initRunner(runner);
			await vi.advanceTimersByTimeAsync(ONE_INTERVAL_MS);
			expect(runSignal?.aborted).toBe(false);

			await runner.stopLeaderTimers();

			expect(runSignal?.aborted).toBe(false);
			expect(perInstance.runCount).toBe(1);

			releaseRun();
			await vi.advanceTimersByTimeAsync(ONE_INTERVAL_MS);

			expect(perInstance.runCount).toBe(2);
		});

		it('stops an instance-scoped task on shutdown', async () => {
			const { runner, metadata, eventService } = setup();
			metadata.register(PerInstanceDummySystemTask);
			await initRunner(runner);
			await vi.advanceTimersByTimeAsync(ONE_INTERVAL_MS);
			expect(perInstance.runCount).toBe(1);

			await runner.shutdown();
			eventService.emit.mockClear();
			await vi.advanceTimersByTimeAsync(ONE_INTERVAL_MS * 2);

			// A run count alone would pass with a timer still armed, because a fire
			// after shutdown is skipped as aborted before it reaches the task.
			expect(perInstance.runCount).toBe(1);
			expect(eventService.emit).not.toHaveBeenCalledWith(
				'system-task-fired',
				expect.objectContaining({ name: 'per-instance-dummy' }),
			);
		});

		it('reports a failing instance-scoped run and retries it on the instance timer', async () => {
			const { runner, metadata, eventService, errorReporter } = setup({
				isLeader: false,
				instanceRole: 'unset',
				instanceType: 'worker',
			});
			const error = new Error('failed');
			perInstance.retryDelaySeconds = 5;
			perInstance.onRun = async () => {
				throw error;
			};
			metadata.register(PerInstanceDummySystemTask);
			await runner.init();

			await vi.advanceTimersByTimeAsync(ONE_INTERVAL_MS);

			expect(perInstance.runCount).toBe(1);
			expect(errorReporter.error).toHaveBeenCalledWith(error, {
				extra: { systemTask: 'per-instance-dummy' },
				shouldBeLogged: false,
				shouldIsolate: true,
			});
			expect(eventService.emit).toHaveBeenCalledWith('system-task-retry-scheduled', {
				name: 'per-instance-dummy',
			});

			await vi.advanceTimersByTimeAsync(5 * Time.seconds.toMilliseconds);

			expect(perInstance.runCount).toBe(2);
		});

		it('aborts the signal of an instance-scoped run in flight on shutdown, and awaits it', async () => {
			const { runner, metadata } = setup({
				isLeader: false,
				instanceRole: 'unset',
				instanceType: 'worker',
			});
			let runSignal: AbortSignal | undefined;
			let releaseRun = () => {};
			perInstance.onRun = async (signal) => {
				runSignal = signal;
				await new Promise<void>((resolve) => {
					releaseRun = resolve;
				});
			};
			metadata.register(PerInstanceDummySystemTask);
			await runner.init();
			await vi.advanceTimersByTimeAsync(ONE_INTERVAL_MS);
			expect(runSignal?.aborted).toBe(false);

			const shuttingDown = runner.shutdown();
			let shutDown = false;
			void shuttingDown.then(() => {
				shutDown = true;
			});
			await Promise.resolve();

			expect(runSignal?.aborted).toBe(true);
			expect(shutDown).toBe(false);

			releaseRun();
			await shuttingDown;

			expect(shutDown).toBe(true);
		});

		it('emits the runs of an instance-scoped task as instance_timer', async () => {
			const { runner, metadata, eventService } = setup();
			metadata.register(PerInstanceDummySystemTask);
			await initRunner(runner);
			await vi.advanceTimersByTimeAsync(ONE_INTERVAL_MS);

			expect(eventService.emit).toHaveBeenCalledWith('system-task-routed', {
				name: 'per-instance-dummy',
				mode: 'instance_timer',
				intervalSeconds: 60,
			});
			expect(eventService.emit).toHaveBeenCalledWith('system-task-run-started', {
				name: 'per-instance-dummy',
				mode: 'instance_timer',
			});
		});

		it('drops a cluster-scoped task on a worker', async () => {
			const { runner, metadata, eventService, logger } = setup({
				isLeader: false,
				instanceRole: 'unset',
				instanceType: 'worker',
			});
			metadata.register(DummySystemTask);

			await runner.init();
			await vi.advanceTimersByTimeAsync(ONE_INTERVAL_MS);

			expect(dummy.runCount).toBe(0);
			expect(eventService.emit).not.toHaveBeenCalledWith(
				'system-task-routed',
				expect.objectContaining({ name: 'dummy' }),
			);
			expect(logger.debug).toHaveBeenCalledWith(
				expect.stringContaining('does not run on this kind of instance'),
				{ name: 'dummy', placement: { scope: 'cluster', durable: false } },
			);
		});
	});
});
