import { mockLogger } from '@n8n/backend-test-utils';
import type { GlobalConfig } from '@n8n/config';
import type {
	DataSource,
	ScheduledJob,
	ScheduledJobRepository,
	ScheduledTaskRepository,
} from '@n8n/db';
import type { DesiredJob, ScheduleDefinition } from '@n8n/scheduler';
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
		...over,
	});

describe('DurableJobProvisioner', () => {
	const manager = mock<EntityManager>();
	const dataSource = mock<DataSource>();
	const jobs = mock<ScheduledJobRepository>();
	const tasks = mock<ScheduledTaskRepository>();
	const tracing = mock<Tracing>();

	let provisioner: DurableJobProvisioner;

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
		const globalConfig = mock<GlobalConfig>({
			scheduler: { materializationWindowSeconds: 60, maxAttempts: 5 },
			generic: { timezone: 'UTC' },
		});
		provisioner = new DurableJobProvisioner(
			mockLogger(),
			dataSource,
			jobs,
			tasks,
			globalConfig,
			tracing,
		);
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
				},
			]);
			expect(summary.inserted).toEqual([{ id: 100, name: 'wf:node:0' }]);
		});

		it('leaves an unchanged job untouched, keeping its id', async () => {
			jobs.findManyByWorkflowNode.mockResolvedValue([jobRow()]);

			const summary = await provisioner.provision('wf', 'node', 'schedule-trigger', {}, [
				desiredJob('wf:node:0'),
			]);

			expect(jobs.insertMany).toHaveBeenCalledWith(manager, []);
			expect(jobs.updateDefinition).not.toHaveBeenCalled();
			expect(tasks.deletePendingByJobIds).toHaveBeenCalledWith(manager, []);
			expect(summary.unchanged).toEqual([{ id: 10, name: 'wf:node:0' }]);
		});

		it('rewrites a changed job in place and withdraws its pending tasks', async () => {
			jobs.findManyByWorkflowNode.mockResolvedValue([jobRow()]);

			const summary = await provisioner.provision('wf', 'node', 'schedule-trigger', {}, [
				desiredJob('wf:node:0', {
					kind: 'cron',
					cronExpression: '0 0 18 * * *',
					timezone: 'UTC',
				}),
			]);

			expect(jobs.updateDefinition).toHaveBeenCalledWith(manager, 10, {
				kind: 'cron',
				cronExpression: '0 0 18 * * *',
				timezone: 'UTC',
				recurrenceUnit: null,
				recurrenceSize: null,
				intervalSeconds: null,
				fireAt: null,
				nextRunAt: CLOCK,
			});
			expect(tasks.deletePendingByJobIds).toHaveBeenCalledWith(manager, [10]);
			expect(summary.redefined).toEqual([{ id: 10, name: 'wf:node:0' }]);
		});

		it('treats a job whose stored clock died as changed', async () => {
			jobs.findManyByWorkflowNode.mockResolvedValue([jobRow({ nextRunAt: null })]);

			const summary = await provisioner.provision('wf', 'node', 'schedule-trigger', {}, [
				desiredJob('wf:node:0'),
			]);

			expect(jobs.updateDefinition).toHaveBeenCalledWith(
				manager,
				10,
				expect.objectContaining({ nextRunAt: CLOCK }),
			);
			expect(summary.redefined).toEqual([{ id: 10, name: 'wf:node:0' }]);
		});

		it('deletes a job no longer desired', async () => {
			jobs.findManyByWorkflowNode.mockResolvedValue([jobRow({ id: 11, name: 'wf:node:1' })]);

			const summary = await provisioner.provision('wf', 'node', 'schedule-trigger', {}, []);

			expect(jobs.deleteManyByIds).toHaveBeenCalledWith(manager, [11]);
			expect(summary.removed).toEqual([{ id: 11, name: 'wf:node:1' }]);
		});

		it('runs all writes inside a single transaction', async () => {
			await provisioner.provision('wf', 'node', 'schedule-trigger', {}, [desiredJob('wf:node:0')]);

			expect(dataSource.transaction).toHaveBeenCalledTimes(1);
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
			},
			{
				jobId,
				taskType: 'schedule-trigger',
				payload: {},
				scheduledFor: at(60),
				runAt: at(60),
				maxAttempts: 1,
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

			await provisioner.provision('wf', 'node', 'schedule-trigger', {}, [
				desiredJob('wf:node:0', { kind: 'interval', intervalSeconds: 30 }, firstRunAt),
			]);

			// The whole first window is recorded now, at provision time. All fires lie
			// in the future, so the executor fires them on time rather than discovering
			// the first one only after it has already passed.
			expect(jobs.findManyByIds).toHaveBeenCalledWith(manager, [100]);
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

			await provisioner.provision('wf', 'node', 'schedule-trigger', {}, [
				desiredJob('wf:node:0', { kind: 'interval', intervalSeconds: 30 }, firstRunAt),
			]);

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

			await provisioner.provision('wf', 'node', 'schedule-trigger', {}, [
				desiredJob('wf:node:0', cronSchedule, null),
			]);

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
			await provisioner.provision('wf', 'node', 'schedule-trigger', {}, [
				desiredJob('wf:node:0', schedule),
			]);

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

			const summary = await provisioner.provision('wf', 'node', 'schedule-trigger', {}, [
				desiredJob('wf:node:0', same),
			]);

			expect(jobs.updateDefinition).not.toHaveBeenCalled();
			expect(summary.unchanged).toEqual([{ id: 10, name: 'wf:node:0' }]);
		});

		it.each(cases)('rewrites a changed $name job in place', async ({ row, changed }) => {
			jobs.findManyByWorkflowNode.mockResolvedValue([row()]);

			const summary = await provisioner.provision('wf', 'node', 'schedule-trigger', {}, [
				desiredJob('wf:node:0', changed),
			]);

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
				provisioner.provision('wf', 'node', 'schedule-trigger', {}, [desiredJob('wf:node:0')]),
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
