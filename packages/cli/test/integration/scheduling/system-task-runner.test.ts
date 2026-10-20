import { Logger } from '@n8n/backend-common';
import { EventService } from '@n8n/backend-services';
import { testDb } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import type { ScheduledTask } from '@n8n/db';
import { DataSource, ScheduledJobRepository, ScheduledTaskRepository } from '@n8n/db';
import {
	clusterTarget,
	intervalFromSeconds,
	SystemTask,
	SystemTaskMetadata,
} from '@n8n/decorators';
import type { SystemTaskSchedule } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { ErrorReporter, InstanceSettings } from 'n8n-core';
import { Tracing } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import { PrometheusSchedulerMetricsService } from '@/metrics/prometheus/scheduler-metrics.service';
import { AgentScheduledJobOwner } from '@/scheduling/agent-scheduled-job-owner';
import { DurableJobProvisioner } from '@/scheduling/durable-job-provisioner';
import { DurableScheduler } from '@/scheduling/durable-scheduler';
import { PollTriggerTaskHandler } from '@/scheduling/poll-trigger-node/poll-trigger-task-handler';
import { ScheduleTriggerTaskHandler } from '@/scheduling/schedule-trigger-node/schedule-trigger-task-handler';
import { SystemTaskJobRegistrar } from '@/scheduling/system-tasks/system-task-job-registrar';
import { SystemTaskRunner } from '@/scheduling/system-tasks/system-task-runner';
import { SystemTaskScheduledJobOwner } from '@/scheduling/system-tasks/system-task-scheduled-job-owner';
import { WorkflowScheduledJobOwner } from '@/scheduling/workflow-scheduled-job-owner';

import { retryUntil } from '../shared/retry-until';
import { selfOwned } from './shared/job-factory';

const TASK_NAME = 'integration-runner';
const TASK_TYPE = `system:${TASK_NAME}`;
const OWNER = selfOwned(TASK_NAME);

const DURABLE_RUN = 'durable';
const TIMER_RUN = 'leader_timer';
type Run = typeof DURABLE_RUN | typeof TIMER_RUN;

const runs: Run[] = [];
let releaseFirstRun = (): void => {};
let firstRunGate: Promise<void> = Promise.resolve();

/** Interval of one hour: only the takeover run and the seeded first occurrence ever fire. */
@SystemTask()
class IntegrationRunnerTask implements SystemTask {
	readonly name = TASK_NAME;

	readonly schedule: SystemTaskSchedule = intervalFromSeconds(3600);

	readonly target = clusterTarget({
		scheduler: { retryOnFailure: true },
		leaderTimer: { runOnTakeover: true },
	});

	/** The `system-task-run-started` listener already counted this run. */
	async run(): Promise<void> {
		if (runs.length === 1) {
			await firstRunGate;
		}
	}
}

type Main = { runner: SystemTaskRunner; scheduler: DurableScheduler };

type MainOptions = {
	hostId: string;
	/** `N8N_SCHEDULER_SYSTEM_TASKS_ENABLED` on this main. */
	durable: boolean;
	leader?: boolean;
};

const LOOPS = { intervalMs: 100, timeoutMs: 20_000 };

/**
 * The runner and the scheduler of one main over the shared database, the way
 * `start.ts` wires them: `init()` routes and provisions, `start()` runs the loops.
 */
describe('system task runner across mains over one database', () => {
	let jobRepo: ScheduledJobRepository;
	let taskRepo: ScheduledTaskRepository;
	let eventService: EventService;
	const mains: Main[] = [];

	// Every loop runs each second. The lease is long so a held run is not renewed
	// while a test backdates its expiry.
	const buildMain = ({ hostId, durable, leader = true }: MainOptions): Main => {
		const base = Container.get(GlobalConfig);
		const globalConfig = {
			...base,
			scheduler: {
				...base.scheduler,
				enabled: true,
				enabledForSystemTasks: durable,
				materializationIntervalSeconds: 1,
				executorIntervalSeconds: 1,
				reaperIntervalSeconds: 1,
				retentionIntervalSeconds: 1,
				ownerReconciliationIntervalSeconds: 1,
				ownerSettleSeconds: 1,
				leaseDurationSeconds: 600,
				jitterRatio: 0,
			},
		} as GlobalConfig;
		const instanceSettings = mock<InstanceSettings>({
			instanceType: 'main',
			hostId,
			instanceRole: leader ? 'leader' : 'follower',
			isLeader: leader,
		});
		const logger = Container.get(Logger);
		const tracing = Container.get(Tracing);
		const errorReporter = mock<ErrorReporter>();
		const workflowOwner = Container.get(WorkflowScheduledJobOwner);
		const agentOwner = Container.get(AgentScheduledJobOwner);
		const owner = new SystemTaskScheduledJobOwner(jobRepo);

		const scheduler = new DurableScheduler(
			logger,
			Container.get(DataSource),
			jobRepo,
			taskRepo,
			instanceSettings,
			globalConfig,
			tracing,
			Container.get(ScheduleTriggerTaskHandler),
			Container.get(PollTriggerTaskHandler),
			Container.get(PrometheusSchedulerMetricsService),
			workflowOwner,
			agentOwner,
			owner,
			eventService,
		);
		const provisioner = new DurableJobProvisioner(
			logger,
			Container.get(DataSource),
			jobRepo,
			taskRepo,
			globalConfig,
			workflowOwner,
			agentOwner,
			owner,
			tracing,
		);
		const registrar = new SystemTaskJobRegistrar(
			logger,
			jobRepo,
			provisioner,
			owner,
			globalConfig,
			errorReporter,
			eventService,
		);
		const metadata = new SystemTaskMetadata();
		metadata.register(IntegrationRunnerTask);
		const runner = new SystemTaskRunner(
			logger,
			metadata,
			scheduler,
			registrar,
			owner,
			globalConfig,
			instanceSettings,
			errorReporter,
			eventService,
			tracing,
		);
		const main = { runner, scheduler };
		mains.push(main);
		return main;
	};

	const boot = async (options: MainOptions): Promise<Main> => {
		const main = buildMain(options);
		await main.runner.init();
		return main;
	};

	/** Stepdown then takeover: runs the takeover run once more on a settled timer. */
	const takeOverAgain = async (main: Main): Promise<void> => {
		await main.runner.stopLeaderTimers();
		main.runner.startLeaderTimers();
	};

	const occurrence = async (): Promise<ScheduledTask> =>
		await taskRepo.findOneByOrFail({ taskType: TASK_TYPE });

	const storedJobs = async (): Promise<number> => await jobRepo.countByOwner(OWNER);

	const storedOccurrences = async (): Promise<number> =>
		await taskRepo.countBy({ taskType: TASK_TYPE });

	beforeAll(async () => {
		await testDb.init();
		jobRepo = Container.get(ScheduledJobRepository);
		taskRepo = Container.get(ScheduledTaskRepository);
		eventService = Container.get(EventService);
		eventService.on('system-task-run-started', ({ name, mode }) => {
			if (name === TASK_NAME) {
				runs.push(mode === 'durable' ? DURABLE_RUN : TIMER_RUN);
			}
		});
	});

	beforeEach(async () => {
		await testDb.truncate(['ScheduledTask', 'ScheduledJob']);
		runs.length = 0;
		firstRunGate = Promise.resolve();
	});

	afterEach(async () => {
		releaseFirstRun();
		vi.restoreAllMocks();
		for (const main of mains.splice(0)) {
			await main.runner.shutdown();
			await main.scheduler.stop();
		}
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	it('runs a durable task once on the durable scheduler after boot', async () => {
		const main = await boot({ hostId: 'main-a', durable: true });
		main.scheduler.start();

		await retryUntil(
			async () =>
				expect(await occurrence()).toMatchObject({ status: 'succeeded', claimedBy: 'main-a' }),
			LOOPS,
		);
		expect(runs).toEqual([DURABLE_RUN]);
	}, 30_000);

	it('runs a task on the leader timer only while no main stores its durable job', async () => {
		const legacy = await boot({ hostId: 'main-legacy', durable: false });
		await retryUntil(() => expect(runs).toEqual([TIMER_RUN]));

		await boot({ hostId: 'main-durable', durable: true, leader: false });
		const emit = vi.spyOn(eventService, 'emit');
		await takeOverAgain(legacy);

		await retryUntil(() =>
			expect(emit).toHaveBeenCalledWith('system-task-run-skipped', {
				name: TASK_NAME,
				reason: 'provisioned_elsewhere',
			}),
		);
		expect(runs).toEqual([TIMER_RUN]);
	});

	it('removes the stored job on a flag-off boot and runs the task on the timer once it is gone', async () => {
		await boot({ hostId: 'main-durable', durable: true, leader: false });
		expect(await storedJobs()).toBe(1);
		expect(await storedOccurrences()).toBe(1);

		const legacy = await boot({ hostId: 'main-legacy', durable: false });

		expect(await storedJobs()).toBe(0);
		expect(await storedOccurrences()).toBe(0);

		// The takeover run at boot is skipped while the stored job still exists.
		await takeOverAgain(legacy);
		await retryUntil(() => expect(runs).toEqual([TIMER_RUN]));
	});

	it("hands a run that outlives its lease to the other main and ignores the stalled main's late finish", async () => {
		firstRunGate = new Promise((resolve) => {
			releaseFirstRun = resolve;
		});
		const a = await boot({ hostId: 'main-a', durable: true });
		const b = await boot({ hostId: 'main-b', durable: true, leader: false });
		a.scheduler.start();
		await retryUntil(
			async () =>
				expect(await occurrence()).toMatchObject({ status: 'running', claimedBy: 'main-a' }),
			LOOPS,
		);
		await retryUntil(() => expect(runs).toEqual([DURABLE_RUN]));
		const { id } = await occurrence();

		// Main A stops claiming but its run stays open, like a main that stalled.
		const stoppingA = a.scheduler.stop();
		await taskRepo.update({ id }, { leaseExpiresAt: new Date(Date.now() - 1000) });
		b.scheduler.start();

		await retryUntil(
			async () => expect(await occurrence()).toMatchObject({ status: 'pending', claimedBy: null }),
			LOOPS,
		);
		// The reclaim pushed `runAt` out by the retry backoff; make it due now.
		await taskRepo.update({ id }, { runAt: new Date(Date.now() - 1000) });
		await retryUntil(
			async () =>
				expect(await occurrence()).toMatchObject({ status: 'succeeded', claimedBy: 'main-b' }),
			LOOPS,
		);
		expect(runs).toEqual([DURABLE_RUN, DURABLE_RUN]);

		const leaseLost = vi.spyOn(Container.get(PrometheusSchedulerMetricsService), 'recordLeaseLost');
		releaseFirstRun();
		await stoppingA;

		await retryUntil(() => expect(leaseLost).toHaveBeenCalledExactlyOnceWith(TASK_TYPE));
		expect(await occurrence()).toMatchObject({
			status: 'succeeded',
			claimedBy: 'main-b',
			attempts: 1,
		});
	}, 30_000);

	it('resumes the leader timer once the reconciliation sweep quarantines a job no main runs', async () => {
		const legacy = await boot({ hostId: 'main-legacy', durable: false });
		await retryUntil(() => expect(runs).toEqual([TIMER_RUN]));

		// The only flag-on main leaves. Its job stays, so the timer skips until the sweep acts.
		const durable = await boot({ hostId: 'main-durable', durable: true, leader: false });
		await durable.runner.shutdown();
		await durable.scheduler.stop();

		legacy.scheduler.start();
		await retryUntil(
			async () =>
				expect(await jobRepo.findManyByOwner(jobRepo.manager, OWNER)).toMatchObject([
					{ orphanedAt: expect.anything() },
				]),
			LOOPS,
		);

		await takeOverAgain(legacy);

		await retryUntil(() => expect(runs).toEqual([TIMER_RUN, TIMER_RUN]));
	}, 30_000);
});
