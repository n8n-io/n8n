import type { Logger } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import { ScheduledJobMisfirePolicy } from '@n8n/constants';
import type {
	DataSource,
	ScheduledJob,
	ScheduledJobRepository,
	ScheduledTaskRepository,
} from '@n8n/db';
import type { DesiredJob, ProvisionSummary, ScheduleDefinition } from '@n8n/scheduler';
import type { EntityManager } from '@n8n/typeorm';
import type { Tracing } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import { DurableJobProvisioner } from '../durable-job-provisioner';

const CLOCK = new Date('2026-01-05T09:00:00.000Z');
const FIRE_AT = new Date('2026-02-01T00:00:00.000Z');

const cronSchedule: ScheduleDefinition = {
	kind: 'cron',
	cronExpression: '0 0 9 * * *',
	timezone: 'UTC',
};

const desiredJob = (
	name: string,
	schedule: ScheduleDefinition = cronSchedule,
	firstRunAt: Date | null = CLOCK,
): DesiredJob => ({ name, schedule, firstRunAt });

/** A stored cron job row; override the fields a test cares about. */
const jobRow = (over: Partial<ScheduledJob> = {}): ScheduledJob =>
	mock<ScheduledJob>({
		id: 10,
		name: 'wf:node:0',
		kind: 'cron',
		cronExpression: '0 0 9 * * *',
		timezone: 'UTC',
		recurrenceUnit: null,
		recurrenceSize: null,
		intervalSeconds: null,
		fireAt: null,
		nextRunAt: CLOCK,
		misfirePolicy: ScheduledJobMisfirePolicy.Coalesce,
		misfireGraceSeconds: 90,
		...over,
	});

describe('DurableJobProvisioner', () => {
	const manager = mock<EntityManager>();
	const dataSource = mock<DataSource>();
	const jobs = mock<ScheduledJobRepository>();
	const tasks = mock<ScheduledTaskRepository>();
	const tracing = mock<Tracing>();

	let provisioner: DurableJobProvisioner;
	let logger: Logger;

	// `logger` is left holding the scoped logger the provisioner writes to, not the one
	// handed to the constructor, so warn assertions target the instance it uses.
	const makeProvisioner = (scheduler: Partial<GlobalConfig['scheduler']> = {}) => {
		logger = mock<Logger>();
		const globalConfig = mock<GlobalConfig>({
			scheduler: {
				materializationWindowSeconds: 60,
				executorIntervalSeconds: 5,
				maxAttempts: 5,
				misfireGraceSeconds: 90,
				...scheduler,
			},
			generic: { timezone: 'UTC' },
		});
		return new DurableJobProvisioner(
			mock<Logger>({ scoped: vi.fn().mockReturnValue(logger) }),
			dataSource,
			jobs,
			tasks,
			globalConfig,
			tracing,
		);
	};

	/**
	 * Provision one job with a node-supplied grace, through a widened signature: the
	 * public parameter is `number | undefined`, while the resolver also defends against
	 * the strings and `null`s a stored node parameter can still reach it with.
	 */
	const provisionWithGrace = async (
		misfireGraceSeconds: unknown,
		desired: DesiredJob[] = [desiredJob('wf:node:0')],
	): Promise<ProvisionSummary> =>
		await (
			provisioner.provision as unknown as (
				workflowId: string,
				nodeId: string,
				taskType: string,
				payload: Record<string, unknown>,
				desired: DesiredJob[],
				misfirePolicy: ScheduledJobMisfirePolicy,
				misfireGraceSeconds?: unknown,
			) => Promise<ProvisionSummary>
		).call(
			provisioner,
			'wf',
			'node',
			'schedule-trigger',
			{},
			desired,
			ScheduledJobMisfirePolicy.Coalesce,
			misfireGraceSeconds,
		);

	beforeEach(() => {
		vi.resetAllMocks();
		// Run the callback with our manager, standing in for a real transaction.
		dataSource.transaction.mockImplementation(
			(async (runInTransaction: (em: EntityManager) => Promise<unknown>) =>
				await runInTransaction(manager)) as typeof dataSource.transaction,
		);
		// Run the span body, standing in for a real tracer.
		tracing.startSpan.mockImplementation(
			(async (_options: unknown, run: (span: unknown) => Promise<unknown>) =>
				await run({ setAttribute() {}, setStatus() {} })) as typeof tracing.startSpan,
		);
		jobs.findManyByWorkflowNode.mockResolvedValue([]);
		jobs.findManyByIds.mockResolvedValue([]);
		jobs.insertMany.mockResolvedValue([]);
		tasks.insertIgnoringDuplicates.mockImplementation(async (_manager, occurrences) => ({
			recorded: occurrences.length,
			created: [],
		}));
		provisioner = makeProvisioner();
	});

	describe('provision', () => {
		it('inserts a new job, mapping the schedule and scope onto the row', async () => {
			jobs.insertMany.mockResolvedValue([100]);

			const summary = await provisioner.provision(
				'wf',
				'node',
				'schedule-trigger',
				{ foo: 'bar' },
				[desiredJob('wf:node:0')],
				ScheduledJobMisfirePolicy.Coalesce,
			);

			expect(jobs.insertMany).toHaveBeenCalledWith(manager, [
				{
					name: 'wf:node:0',
					workflowId: 'wf',
					nodeId: 'node',
					taskType: 'schedule-trigger',
					payload: { foo: 'bar' },
					kind: 'cron',
					cronExpression: '0 0 9 * * *',
					timezone: 'UTC',
					recurrenceUnit: null,
					recurrenceSize: null,
					intervalSeconds: null,
					fireAt: null,
					nextRunAt: CLOCK,
					maxAttempts: 5,
					misfirePolicy: ScheduledJobMisfirePolicy.Coalesce,
					misfireGraceSeconds: 90,
				},
			]);
			expect(summary.inserted).toEqual([{ id: 100, name: 'wf:node:0' }]);
		});

		it('leaves an unchanged job untouched, keeping its id', async () => {
			jobs.findManyByWorkflowNode.mockResolvedValue([jobRow()]);

			const summary = await provisioner.provision(
				'wf',
				'node',
				'schedule-trigger',
				{},
				[desiredJob('wf:node:0')],
				ScheduledJobMisfirePolicy.Coalesce,
			);

			expect(jobs.insertMany).toHaveBeenCalledWith(manager, []);
			expect(jobs.updateDefinition).not.toHaveBeenCalled();
			expect(tasks.deletePendingByJobIds).toHaveBeenCalledWith(manager, []);
			expect(jobs.updateMisfirePolicy).toHaveBeenCalledWith(manager, [], expect.anything());
			expect(summary.unchanged).toEqual([{ id: 10, name: 'wf:node:0' }]);
		});

		it('reconciles the policy of a job whose schedule is unchanged', async () => {
			jobs.findManyByWorkflowNode.mockResolvedValue([jobRow()]);

			const summary = await provisioner.provision(
				'wf',
				'node',
				'poll-trigger',
				{},
				[desiredJob('wf:node:0')],
				ScheduledJobMisfirePolicy.Skip,
			);

			expect(jobs.updateMisfirePolicy).toHaveBeenCalledWith(manager, [10], {
				misfirePolicy: ScheduledJobMisfirePolicy.Skip,
				misfireGraceSeconds: 90,
			});
			// The schedule is untouched, so the job keeps its queued tasks.
			expect(jobs.updateDefinition).not.toHaveBeenCalled();
			expect(tasks.deletePendingByJobIds).toHaveBeenCalledWith(manager, []);
			expect(summary.unchanged).toEqual([{ id: 10, name: 'wf:node:0' }]);
		});

		it("leaves the deadline of a policy-only change's queued tasks untouched", async () => {
			jobs.findManyByWorkflowNode.mockResolvedValue([jobRow()]);

			await provisioner.provision(
				'wf',
				'node',
				'poll-trigger',
				{},
				[desiredJob('wf:node:0')],
				ScheduledJobMisfirePolicy.Skip,
			);

			expect(jobs.updateMisfirePolicy).toHaveBeenCalledWith(manager, [10], expect.anything());
			expect(tasks.updateMissedAfterForJobs).toHaveBeenCalledWith(manager, [], 90);
		});

		it('reconciles the grace of a job whose schedule is unchanged', async () => {
			jobs.findManyByWorkflowNode.mockResolvedValue([jobRow({ misfireGraceSeconds: 30 })]);

			await provisioner.provision(
				'wf',
				'node',
				'schedule-trigger',
				{},
				[desiredJob('wf:node:0')],
				ScheduledJobMisfirePolicy.Coalesce,
			);

			expect(jobs.updateMisfirePolicy).toHaveBeenCalledWith(manager, [10], {
				misfirePolicy: ScheduledJobMisfirePolicy.Coalesce,
				misfireGraceSeconds: 90,
			});
		});

		it("recomputes the deadline of a reconciled job's already-queued tasks", async () => {
			// The row's grace is now current; tasks queued under the old grace
			// would keep honouring it until claimed or reaped.
			jobs.findManyByWorkflowNode.mockResolvedValue([jobRow({ misfireGraceSeconds: 30 })]);

			await provisioner.provision(
				'wf',
				'node',
				'schedule-trigger',
				{},
				[desiredJob('wf:node:0')],
				ScheduledJobMisfirePolicy.Coalesce,
			);

			expect(tasks.updateMissedAfterForJobs).toHaveBeenCalledWith(manager, [10], 90);
		});

		it("does not touch other jobs' queued tasks when nothing is outdated", async () => {
			jobs.findManyByWorkflowNode.mockResolvedValue([jobRow()]);

			await provisioner.provision(
				'wf',
				'node',
				'schedule-trigger',
				{},
				[desiredJob('wf:node:0')],
				ScheduledJobMisfirePolicy.Coalesce,
			);

			expect(tasks.updateMissedAfterForJobs).toHaveBeenCalledWith(manager, [], 90);
		});

		it('rewrites a changed job in place and withdraws its pending tasks', async () => {
			jobs.findManyByWorkflowNode.mockResolvedValue([jobRow()]);

			const summary = await provisioner.provision(
				'wf',
				'node',
				'schedule-trigger',
				{},
				[
					desiredJob('wf:node:0', {
						kind: 'cron',
						cronExpression: '0 0 18 * * *',
						timezone: 'UTC',
					}),
				],
				ScheduledJobMisfirePolicy.Coalesce,
			);

			expect(jobs.updateDefinition).toHaveBeenCalledWith(manager, 10, {
				kind: 'cron',
				cronExpression: '0 0 18 * * *',
				timezone: 'UTC',
				recurrenceUnit: null,
				recurrenceSize: null,
				intervalSeconds: null,
				fireAt: null,
				nextRunAt: CLOCK,
				misfirePolicy: ScheduledJobMisfirePolicy.Coalesce,
				misfireGraceSeconds: 90,
			});
			expect(tasks.deletePendingByJobIds).toHaveBeenCalledWith(manager, [10]);
			expect(summary.redefined).toEqual([{ id: 10, name: 'wf:node:0' }]);
		});

		it('treats a job whose stored clock died as changed', async () => {
			jobs.findManyByWorkflowNode.mockResolvedValue([jobRow({ nextRunAt: null })]);

			const summary = await provisioner.provision(
				'wf',
				'node',
				'schedule-trigger',
				{},
				[desiredJob('wf:node:0')],
				ScheduledJobMisfirePolicy.Coalesce,
			);

			expect(jobs.updateDefinition).toHaveBeenCalledWith(
				manager,
				10,
				expect.objectContaining({ nextRunAt: CLOCK }),
			);
			expect(summary.redefined).toEqual([{ id: 10, name: 'wf:node:0' }]);
		});

		it('deletes a job no longer desired', async () => {
			jobs.findManyByWorkflowNode.mockResolvedValue([jobRow({ id: 11, name: 'wf:node:1' })]);

			const summary = await provisioner.provision(
				'wf',
				'node',
				'schedule-trigger',
				{},
				[],
				ScheduledJobMisfirePolicy.Coalesce,
			);

			expect(jobs.deleteManyByIds).toHaveBeenCalledWith(manager, [11]);
			expect(summary.removed).toEqual([{ id: 11, name: 'wf:node:1' }]);
		});

		it('stamps the given policy and the configured grace onto inserted rows', async () => {
			jobs.insertMany.mockResolvedValue([100]);

			await provisioner.provision(
				'wf',
				'node',
				'poll-trigger',
				{},
				[desiredJob('wf:node:0')],
				ScheduledJobMisfirePolicy.Skip,
			);

			// Non-default values, so a hardcoded coalesce/60 would fail here.
			expect(jobs.insertMany).toHaveBeenCalledWith(manager, [
				expect.objectContaining({
					misfirePolicy: ScheduledJobMisfirePolicy.Skip,
					misfireGraceSeconds: 90,
				}),
			]);
		});

		it('runs all writes inside a single transaction', async () => {
			await provisioner.provision(
				'wf',
				'node',
				'schedule-trigger',
				{},
				[desiredJob('wf:node:0')],
				ScheduledJobMisfirePolicy.Coalesce,
			);

			expect(dataSource.transaction).toHaveBeenCalledTimes(1);
		});
	});

	describe('misfire grace resolution', () => {
		const THIRTY_DAYS_IN_SECONDS = 30 * 24 * 60 * 60;

		it('stamps a node-supplied grace onto the inserted row, in place of the configured grace', async () => {
			await provisionWithGrace(300);

			expect(jobs.insertMany).toHaveBeenCalledWith(manager, [
				expect.objectContaining({ misfireGraceSeconds: 300 }),
			]);
		});

		it("writes a node-supplied grace onto a redefined job's row", async () => {
			jobs.findManyByWorkflowNode.mockResolvedValue([jobRow()]);

			await provisionWithGrace(300, [
				desiredJob('wf:node:0', {
					kind: 'cron',
					cronExpression: '0 0 18 * * *',
					timezone: 'UTC',
				}),
			]);

			expect(jobs.updateDefinition).toHaveBeenCalledWith(
				manager,
				10,
				expect.objectContaining({ misfireGraceSeconds: 300 }),
			);
		});

		it('raises a node-supplied grace equal to the executor interval to one second above the interval', async () => {
			provisioner = makeProvisioner({
				executorIntervalSeconds: 120,
				materializationWindowSeconds: 60,
			});

			await provisionWithGrace(120);

			expect(jobs.insertMany).toHaveBeenCalledWith(manager, [
				expect.objectContaining({ misfireGraceSeconds: 121 }),
			]);
		});

		// A grace the node did not really supply falls back to the instance value, not
		// to a floor: below-one values (including `null`, which coerces to zero) and
		// values that are not a finite number at all.
		it.each([
			{ name: 'zero', grace: 0 },
			{ name: 'null', grace: null },
			{ name: 'a negative value', grace: -5 },
			{ name: 'a fraction below one', grace: 0.5 },
			{ name: 'NaN', grace: Number.NaN },
			{ name: 'undefined', grace: undefined },
			{ name: 'Infinity', grace: Number.POSITIVE_INFINITY },
			{ name: 'a non-numeric string', grace: 'not-a-number' },
		])(
			'resolves $name to the instance-configured grace rather than to a floor',
			async ({ grace }) => {
				await provisionWithGrace(grace);

				expect(jobs.insertMany).toHaveBeenCalledWith(manager, [
					expect.objectContaining({ misfireGraceSeconds: 90 }),
				]);
			},
		);

		it('truncates a fractional node-supplied grace to whole seconds before writing it', async () => {
			await provisionWithGrace(300.5);

			expect(jobs.insertMany).toHaveBeenCalledWith(manager, [
				expect.objectContaining({ misfireGraceSeconds: 300 }),
			]);
		});

		it('leaves an instance-configured grace below the floors unclamped', async () => {
			provisioner = makeProvisioner({ misfireGraceSeconds: 10 });

			await provisioner.provision(
				'wf',
				'node',
				'schedule-trigger',
				{},
				[desiredJob('wf:node:0')],
				ScheduledJobMisfirePolicy.Coalesce,
			);

			expect(jobs.insertMany).toHaveBeenCalledWith(manager, [
				expect.objectContaining({ misfireGraceSeconds: 10 }),
			]);
		});

		it('resolves a node-supplied grace given as a numeric string to that number', async () => {
			await provisionWithGrace('300');

			expect(jobs.insertMany).toHaveBeenCalledWith(manager, [
				expect.objectContaining({ misfireGraceSeconds: 300 }),
			]);
		});

		it('accepts a node-supplied grace of one second, raising it to the floor', async () => {
			await provisionWithGrace(1);

			expect(jobs.insertMany).toHaveBeenCalledWith(manager, [
				expect.objectContaining({ misfireGraceSeconds: 60 }),
			]);
		});

		it('leaves a node-supplied grace sitting exactly on the floor unclamped, and does not warn', async () => {
			await provisionWithGrace(60);

			expect(jobs.insertMany).toHaveBeenCalledWith(manager, [
				expect.objectContaining({ misfireGraceSeconds: 60 }),
			]);
			expect(logger.warn).not.toHaveBeenCalled();
		});

		it('leaves a node-supplied grace sitting exactly on the thirty-day cap unclamped, and does not warn', async () => {
			await provisionWithGrace(THIRTY_DAYS_IN_SECONDS);

			expect(jobs.insertMany).toHaveBeenCalledWith(manager, [
				expect.objectContaining({ misfireGraceSeconds: THIRTY_DAYS_IN_SECONDS }),
			]);
			expect(logger.warn).not.toHaveBeenCalled();
		});

		it('warns that it raised the grace, reporting the raw request, the value written and the owning node', async () => {
			await provisionWithGrace(30.7);

			expect(logger.warn).toHaveBeenCalledWith(
				"Raised a node's misfire grace to the scheduler's minimum",
				{
					workflowId: 'wf',
					nodeId: 'node',
					requestedMisfireGraceSeconds: 30.7,
					misfireGraceSeconds: 60,
				},
			);
		});

		it('lowers a node-supplied grace above the thirty-day cap to the cap, warning that it lowered it', async () => {
			await provisionWithGrace(THIRTY_DAYS_IN_SECONDS + 500);

			expect(jobs.insertMany).toHaveBeenCalledWith(manager, [
				expect.objectContaining({ misfireGraceSeconds: THIRTY_DAYS_IN_SECONDS }),
			]);
			expect(logger.warn).toHaveBeenCalledWith(
				"Lowered a node's misfire grace to the scheduler's maximum",
				{
					workflowId: 'wf',
					nodeId: 'node',
					requestedMisfireGraceSeconds: THIRTY_DAYS_IN_SECONDS + 500,
					misfireGraceSeconds: THIRTY_DAYS_IN_SECONDS,
				},
			);
		});

		it('warns about a fractional grace just above the thirty-day cap, whose truncation alone lands it on the cap', async () => {
			await provisionWithGrace(THIRTY_DAYS_IN_SECONDS + 0.5);

			expect(jobs.insertMany).toHaveBeenCalledWith(manager, [
				expect.objectContaining({ misfireGraceSeconds: THIRTY_DAYS_IN_SECONDS }),
			]);
			expect(logger.warn).toHaveBeenCalledWith(
				"Lowered a node's misfire grace to the scheduler's maximum",
				{
					workflowId: 'wf',
					nodeId: 'node',
					requestedMisfireGraceSeconds: THIRTY_DAYS_IN_SECONDS + 0.5,
					misfireGraceSeconds: THIRTY_DAYS_IN_SECONDS,
				},
			);
		});

		it('raises a node-supplied grace to the thirty-day cap when the configured floors exceed the cap, and warns that it raised it', async () => {
			provisioner = makeProvisioner({
				materializationWindowSeconds: THIRTY_DAYS_IN_SECONDS + 1000,
			});

			await provisionWithGrace(300);

			expect(jobs.insertMany).toHaveBeenCalledWith(manager, [
				expect.objectContaining({ misfireGraceSeconds: THIRTY_DAYS_IN_SECONDS }),
			]);
			expect(logger.warn).toHaveBeenCalledWith(
				"Raised a node's misfire grace to the scheduler's minimum",
				{
					workflowId: 'wf',
					nodeId: 'node',
					requestedMisfireGraceSeconds: 300,
					misfireGraceSeconds: THIRTY_DAYS_IN_SECONDS,
				},
			);
		});

		it.each([
			{
				name: 'the materialisation window',
				config: { materializationWindowSeconds: undefined as unknown as number },
			},
			{
				name: 'the executor interval',
				config: { executorIntervalSeconds: undefined as unknown as number },
			},
		])(
			'falls back to the instance-configured grace when $name is not configured',
			async ({ config }) => {
				provisioner = makeProvisioner(config);

				await provisionWithGrace(300);

				expect(jobs.insertMany).toHaveBeenCalledWith(manager, [
					expect.objectContaining({ misfireGraceSeconds: 90 }),
				]);
			},
		);

		it('treats a row already stored at the clamped grace as unchanged, leaving its queued tasks alone', async () => {
			jobs.findManyByWorkflowNode.mockResolvedValue([jobRow({ misfireGraceSeconds: 60 })]);

			await provisionWithGrace(30);

			expect(tasks.updateMissedAfterForJobs).toHaveBeenCalledWith(manager, [], 60);
		});

		it('reconciles a row stored at the raw node-supplied grace up to the clamped grace', async () => {
			jobs.findManyByWorkflowNode.mockResolvedValue([jobRow({ misfireGraceSeconds: 30 })]);

			await provisionWithGrace(30);

			expect(jobs.updateMisfirePolicy).toHaveBeenCalledWith(manager, [10], {
				misfirePolicy: ScheduledJobMisfirePolicy.Coalesce,
				misfireGraceSeconds: 60,
			});
			expect(tasks.updateMissedAfterForJobs).toHaveBeenCalledWith(manager, [10], 60);
		});

		it('lists a job whose grace and policy both changed once in the policy reconciliation', async () => {
			jobs.findManyByWorkflowNode.mockResolvedValue([
				jobRow({ misfirePolicy: ScheduledJobMisfirePolicy.Skip, misfireGraceSeconds: 90 }),
			]);

			await provisionWithGrace(300);

			expect(jobs.updateMisfirePolicy).toHaveBeenCalledWith(manager, [10], {
				misfirePolicy: ScheduledJobMisfirePolicy.Coalesce,
				misfireGraceSeconds: 300,
			});
			expect(tasks.updateMissedAfterForJobs).toHaveBeenCalledWith(manager, [10], 300);
		});
	});

	describe('seeding a freshly provisioned job', () => {
		const SEED_NOW = new Date('2026-01-05T00:00:00.000Z');
		const at = (seconds: number) => new Date(SEED_NOW.getTime() + seconds * 1000);

		// A plain object, not `mock<ScheduledJob>`: the seed plans the row, and a mock
		// would proxy its Date fields, which then leak into the recorded occurrences.
		const intervalRow = (id: number, nextRunAt: Date): ScheduledJob =>
			({
				id,
				name: 'wf:node:0',
				workflowId: 'wf',
				nodeId: 'node',
				kind: 'interval',
				cronExpression: null,
				timezone: null,
				recurrenceUnit: null,
				recurrenceSize: null,
				intervalSeconds: 30,
				fireAt: null,
				enabled: true,
				nextRunAt,
				lastFiredAt: null,
				taskType: 'schedule-trigger',
				payload: {},
				maxAttempts: 1,
				misfirePolicy: ScheduledJobMisfirePolicy.Coalesce,
				misfireGraceSeconds: 60,
			}) as unknown as ScheduledJob;

		// The first fire (30s out) plus every fire up to the 60s window, each a task
		// due at its own instant.
		const firstWindowOf = (jobId: number) => [
			{
				jobId,
				taskType: 'schedule-trigger',
				payload: {},
				scheduledFor: at(30),
				runAt: at(30),
				maxAttempts: 1,
				// Its own instant plus the job's 60s grace.
				missedAfter: at(90),
			},
			{
				jobId,
				taskType: 'schedule-trigger',
				payload: {},
				scheduledFor: at(60),
				runAt: at(60),
				maxAttempts: 1,
				missedAfter: at(120),
			},
		];

		beforeEach(() => {
			// The seed sizes its window from DB time, not the instance clock.
			tasks.readDbTime.mockResolvedValue(SEED_NOW);
		});

		it('queues the first window of a fresh job ahead of its due time instead of leaving it for a later poll', async () => {
			const firstRunAt = at(30);
			// The seed reads the row it just inserted back by id, now carrying its clock.
			jobs.findManyByIds.mockResolvedValue([intervalRow(100, firstRunAt)]);
			jobs.insertMany.mockResolvedValue([100]);

			await provisioner.provision(
				'wf',
				'node',
				'schedule-trigger',
				{},
				[desiredJob('wf:node:0', { kind: 'interval', intervalSeconds: 30 }, firstRunAt)],
				ScheduledJobMisfirePolicy.Coalesce,
			);

			// The whole first window is recorded now, at provision time. All fires lie
			// in the future, so the executor fires them on time rather than discovering
			// the first one only after it has already passed.
			expect(jobs.findManyByIds).toHaveBeenCalledWith(manager, [100]);
			// On the transaction's manager: a second pooled connection would deadlock here.
			expect(tasks.readDbTime).toHaveBeenCalledWith(manager);
			expect(tasks.insertIgnoringDuplicates.mock.calls[0]?.[1]).toEqual(firstWindowOf(100));
			// The first recorded fire is still in the future when it is queued.
			expect(at(30).getTime()).toBeGreaterThan(SEED_NOW.getTime());
			// The clock advances past the window, as a materializer pass would leave it.
			expect(jobs.advanceMany.mock.calls[0]?.[1]).toEqual([
				{ id: 100, nextRunAt: at(90), lastFiredAt: at(60) },
			]);
		});

		it('re-seeds a redefined job, recording its new window only after the stale tasks are withdrawn', async () => {
			const firstRunAt = at(30);
			// An existing job with a different definition, so the desired rule redefines it.
			jobs.findManyByWorkflowNode.mockResolvedValue([
				mock<ScheduledJob>({
					id: 10,
					name: 'wf:node:0',
					kind: 'cron',
					cronExpression: '0 0 9 * * *',
					timezone: 'UTC',
					recurrenceUnit: null,
					recurrenceSize: null,
					intervalSeconds: null,
					fireAt: null,
					nextRunAt: at(0),
				}),
			]);
			jobs.findManyByIds.mockResolvedValue([intervalRow(10, firstRunAt)]);

			await provisioner.provision(
				'wf',
				'node',
				'schedule-trigger',
				{},
				[desiredJob('wf:node:0', { kind: 'interval', intervalSeconds: 30 }, firstRunAt)],
				ScheduledJobMisfirePolicy.Coalesce,
			);

			// The redefine's stale tasks are withdrawn before the fresh window is seeded,
			// so the new occurrences are the last word.
			expect(tasks.deletePendingByJobIds).toHaveBeenCalledWith(manager, [10]);
			expect(tasks.deletePendingByJobIds.mock.invocationCallOrder[0]).toBeLessThan(
				tasks.insertIgnoringDuplicates.mock.invocationCallOrder[0],
			);
			expect(tasks.insertIgnoringDuplicates.mock.calls[0]?.[1]).toEqual(firstWindowOf(10));
			expect(jobs.advanceMany.mock.calls[0]?.[1]).toEqual([
				{ id: 10, nextRunAt: at(90), lastFiredAt: at(60) },
			]);
		});

		it('does not seed a clock-dead job (a rule that never fires)', async () => {
			const deadRow = mock<ScheduledJob>({
				id: 101,
				name: 'wf:node:0',
				enabled: true,
				nextRunAt: null,
			});
			jobs.findManyByIds.mockResolvedValue([deadRow]);
			jobs.insertMany.mockResolvedValue([101]);

			await provisioner.provision(
				'wf',
				'node',
				'schedule-trigger',
				{},
				[desiredJob('wf:node:0', cronSchedule, null)],
				ScheduledJobMisfirePolicy.Coalesce,
			);

			expect(tasks.insertIgnoringDuplicates).not.toHaveBeenCalled();
			expect(jobs.advanceMany).not.toHaveBeenCalled();
		});
	});

	describe('schedule column mapping', () => {
		it.each<{ name: string; schedule: ScheduleDefinition; columns: Partial<ScheduledJob> }>([
			{
				name: 'cron',
				schedule: { kind: 'cron', cronExpression: '0 0 9 * * *', timezone: 'UTC' },
				columns: { cronExpression: '0 0 9 * * *', timezone: 'UTC' },
			},
			{
				name: 'recurring_cron',
				schedule: {
					kind: 'recurring_cron',
					cronExpression: '0 0 9 * * *',
					timezone: 'UTC',
					recurrenceUnit: 'weeks',
					recurrenceSize: 2,
				},
				columns: {
					cronExpression: '0 0 9 * * *',
					timezone: 'UTC',
					recurrenceUnit: 'weeks',
					recurrenceSize: 2,
				},
			},
			{
				name: 'interval',
				schedule: { kind: 'interval', intervalSeconds: 300 },
				columns: { intervalSeconds: 300 },
			},
			{
				name: 'one_off',
				schedule: { kind: 'one_off', fireAt: FIRE_AT },
				columns: { fireAt: FIRE_AT },
			},
		])('flattens a $name schedule onto the inserted row', async ({ name, schedule, columns }) => {
			await provisioner.provision(
				'wf',
				'node',
				'schedule-trigger',
				{},
				[desiredJob('wf:node:0', schedule)],
				ScheduledJobMisfirePolicy.Coalesce,
			);

			expect(jobs.insertMany).toHaveBeenCalledWith(manager, [
				{
					name: 'wf:node:0',
					workflowId: 'wf',
					nodeId: 'node',
					taskType: 'schedule-trigger',
					payload: {},
					kind: name,
					cronExpression: null,
					timezone: null,
					recurrenceUnit: null,
					recurrenceSize: null,
					intervalSeconds: null,
					fireAt: null,
					nextRunAt: CLOCK,
					maxAttempts: 5,
					misfirePolicy: ScheduledJobMisfirePolicy.Coalesce,
					misfireGraceSeconds: 90,
					...columns,
				},
			]);
		});
	});

	describe('reading a stored schedule back to diff it', () => {
		// Rows of each kind, matching the desired schedule the test provisions against.
		// `jobRow` defaults to cron, so each override clears the cron columns it doesn't use.
		const cronRow = () => jobRow();
		const recurringCronRow = () =>
			jobRow({
				kind: 'recurring_cron',
				cronExpression: '0 0 9 * * *',
				timezone: 'UTC',
				recurrenceUnit: 'weeks',
				recurrenceSize: 2,
			});
		const intervalRow = () =>
			jobRow({
				kind: 'interval',
				cronExpression: null,
				timezone: null,
				intervalSeconds: 300,
			});
		const oneOffRow = () =>
			jobRow({
				kind: 'one_off',
				cronExpression: null,
				timezone: null,
				fireAt: FIRE_AT,
			});

		const cases: Array<{
			name: string;
			row: () => ScheduledJob;
			same: ScheduleDefinition;
			changed: ScheduleDefinition;
		}> = [
			{
				name: 'cron',
				row: cronRow,
				same: { kind: 'cron', cronExpression: '0 0 9 * * *', timezone: 'UTC' },
				changed: { kind: 'cron', cronExpression: '0 0 18 * * *', timezone: 'UTC' },
			},
			{
				name: 'recurring_cron',
				row: recurringCronRow,
				same: {
					kind: 'recurring_cron',
					cronExpression: '0 0 9 * * *',
					timezone: 'UTC',
					recurrenceUnit: 'weeks',
					recurrenceSize: 2,
				},
				changed: {
					kind: 'recurring_cron',
					cronExpression: '0 0 9 * * *',
					timezone: 'UTC',
					recurrenceUnit: 'weeks',
					recurrenceSize: 3,
				},
			},
			{
				name: 'interval',
				row: intervalRow,
				same: { kind: 'interval', intervalSeconds: 300 },
				changed: { kind: 'interval', intervalSeconds: 600 },
			},
			{
				name: 'one_off',
				row: oneOffRow,
				same: { kind: 'one_off', fireAt: FIRE_AT },
				changed: { kind: 'one_off', fireAt: new Date('2026-03-01T00:00:00.000Z') },
			},
		];

		it.each(cases)('leaves an unchanged $name job untouched', async ({ row, same }) => {
			jobs.findManyByWorkflowNode.mockResolvedValue([row()]);

			const summary = await provisioner.provision(
				'wf',
				'node',
				'schedule-trigger',
				{},
				[desiredJob('wf:node:0', same)],
				ScheduledJobMisfirePolicy.Coalesce,
			);

			expect(jobs.updateDefinition).not.toHaveBeenCalled();
			expect(summary.unchanged).toEqual([{ id: 10, name: 'wf:node:0' }]);
		});

		it.each(cases)('rewrites a changed $name job in place', async ({ row, changed }) => {
			jobs.findManyByWorkflowNode.mockResolvedValue([row()]);

			const summary = await provisioner.provision(
				'wf',
				'node',
				'schedule-trigger',
				{},
				[desiredJob('wf:node:0', changed)],
				ScheduledJobMisfirePolicy.Coalesce,
			);

			expect(jobs.updateDefinition).toHaveBeenCalledWith(
				manager,
				10,
				expect.objectContaining({ kind: changed.kind }),
			);
			expect(summary.redefined).toEqual([{ id: 10, name: 'wf:node:0' }]);
		});

		it('throws on a stored row whose kind it does not recognise', async () => {
			jobs.findManyByWorkflowNode.mockResolvedValue([
				jobRow({ kind: 'made_up' as ScheduledJob['kind'] }),
			]);

			await expect(
				provisioner.provision(
					'wf',
					'node',
					'schedule-trigger',
					{},
					[desiredJob('wf:node:0')],
					ScheduledJobMisfirePolicy.Coalesce,
				),
			).rejects.toThrow('Unexpected scheduled job kind');
		});
	});

	describe('deprovision', () => {
		it('deletes the whole node scope inside a transaction and reports the count', async () => {
			jobs.deleteByWorkflowNode.mockResolvedValue(3);

			const result = await provisioner.deprovision('wf', 'node');

			expect(jobs.deleteByWorkflowNode).toHaveBeenCalledWith(manager, 'wf', 'node');
			expect(dataSource.transaction).toHaveBeenCalledTimes(1);
			expect(result).toEqual({ removed: 3 });
		});
	});

	describe('deprovisionWorkflow', () => {
		it('deletes the whole workflow scope inside a transaction and reports the count', async () => {
			jobs.deleteByWorkflowTaskType.mockResolvedValue(5);

			const result = await provisioner.deprovisionWorkflow('wf', 'schedule-trigger');

			expect(jobs.deleteByWorkflowTaskType).toHaveBeenCalledWith(manager, 'wf', 'schedule-trigger');
			expect(dataSource.transaction).toHaveBeenCalledTimes(1);
			expect(result).toEqual({ removed: 5 });
		});
	});

	describe('deprovisionWorkflowInTransaction', () => {
		it("deletes the whole workflow scope through the caller's manager, without opening a transaction of its own", async () => {
			const callerManager = mock<EntityManager>();

			await provisioner.deprovisionWorkflowInTransaction(callerManager, 'wf', 'schedule-trigger');

			expect(jobs.deleteByWorkflowTaskType).toHaveBeenCalledWith(
				callerManager,
				'wf',
				'schedule-trigger',
			);
			expect(dataSource.transaction).not.toHaveBeenCalled();
		});
	});
});
