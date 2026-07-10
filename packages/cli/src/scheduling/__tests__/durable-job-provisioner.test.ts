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
		jobs.insertMany.mockResolvedValue([]);
		provisioner = new DurableJobProvisioner(dataSource, jobs, tasks, tracing);
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
					...columns,
				},
			]);
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
});
