import { mock } from 'vitest-mock-extended';

import { provision, deprovision } from '../provision';
import type {
	ProvisionTransaction,
	DeprovisionTransaction,
	RunInProvisionTransaction,
	RunInDeprovisionTransaction,
} from '../transaction';
import type { DesiredJob, ExistingJob, ScheduleDefinition } from '../types';

const cronSchedule = (cronExpression: string): ScheduleDefinition => ({
	kind: 'cron',
	cronExpression,
	timezone: null,
});

const CLOCK = new Date('2026-01-05T09:00:00.000Z');

const desiredJob = (
	name: string,
	cronExpression: string,
	firstRunAt: Date | null = CLOCK,
): DesiredJob => ({ name, schedule: cronSchedule(cronExpression), firstRunAt });

const existingJob = (
	id: number,
	name: string,
	cronExpression: string,
	hasClock = true,
): ExistingJob => ({ id, name, schedule: cronSchedule(cronExpression), hasClock });

/** A transaction runner that hands `work` the given operations, without a real transaction. */
const runnerWith =
	(tx: ProvisionTransaction): RunInProvisionTransaction =>
	async (work) =>
		await work(tx);

describe('provision', () => {
	const withExisting = (existing: ExistingJob[]) => {
		const tx = mock<ProvisionTransaction>();
		tx.findExisting.mockResolvedValue(existing);
		tx.insert.mockResolvedValue([]);
		return tx;
	};

	it('inserts a desired job with no existing match and returns its new id', async () => {
		const tx = withExisting([]);
		tx.insert.mockResolvedValue([100]);
		const desired = [desiredJob('wf:node:0', '0 0 9 * * *')];

		const summary = await provision(runnerWith(tx), desired);

		expect(tx.insert).toHaveBeenCalledWith(desired);
		expect(tx.redefine).not.toHaveBeenCalled();
		expect(tx.deleteJobs).toHaveBeenCalledWith([]);
		expect(summary).toEqual({
			inserted: [{ id: 100, name: 'wf:node:0' }],
			redefined: [],
			unchanged: [],
			removed: [],
		});
	});

	it('leaves an unchanged job untouched, reporting its preserved id', async () => {
		const tx = withExisting([existingJob(10, 'wf:node:0', '0 0 9 * * *')]);

		const summary = await provision(runnerWith(tx), [desiredJob('wf:node:0', '0 0 9 * * *')]);

		expect(tx.insert).toHaveBeenCalledWith([]);
		expect(tx.redefine).not.toHaveBeenCalled();
		expect(tx.deleteJobs).toHaveBeenCalledWith([]);
		expect(tx.withdrawPendingTasks).toHaveBeenCalledWith([]);
		expect(summary).toEqual({
			inserted: [],
			redefined: [],
			unchanged: [{ id: 10, name: 'wf:node:0' }],
			removed: [],
		});
	});

	it('rewrites a changed job in place and withdraws its pending tasks', async () => {
		const tx = withExisting([existingJob(10, 'wf:node:0', '0 0 9 * * *')]);

		const summary = await provision(runnerWith(tx), [desiredJob('wf:node:0', '0 0 18 * * *')]);

		expect(tx.redefine).toHaveBeenCalledWith(10, cronSchedule('0 0 18 * * *'), CLOCK);
		expect(tx.withdrawPendingTasks).toHaveBeenCalledWith([10]);
		expect(tx.insert).toHaveBeenCalledWith([]);
		expect(tx.deleteJobs).toHaveBeenCalledWith([]);
		expect(summary).toEqual({
			inserted: [],
			redefined: [{ id: 10, name: 'wf:node:0' }],
			unchanged: [],
			removed: [],
		});
	});

	it('treats a job whose clock died as changed, so it is rewritten', async () => {
		const tx = withExisting([existingJob(10, 'wf:node:0', '0 0 9 * * *', /* hasClock */ false)]);

		await provision(runnerWith(tx), [desiredJob('wf:node:0', '0 0 9 * * *')]);

		expect(tx.redefine).toHaveBeenCalledWith(10, cronSchedule('0 0 9 * * *'), CLOCK);
	});

	it('deletes existing jobs no longer desired', async () => {
		const tx = withExisting([
			existingJob(10, 'wf:node:0', '0 0 9 * * *'),
			existingJob(11, 'wf:node:1', '0 0 18 * * *'),
		]);

		const summary = await provision(runnerWith(tx), [desiredJob('wf:node:0', '0 0 9 * * *')]);

		expect(tx.deleteJobs).toHaveBeenCalledWith([11]);
		expect(summary).toEqual({
			inserted: [],
			redefined: [],
			unchanged: [{ id: 10, name: 'wf:node:0' }],
			removed: [{ id: 11, name: 'wf:node:1' }],
		});
	});

	it('clears the whole scope when nothing is desired', async () => {
		const tx = withExisting([existingJob(10, 'wf:node:0', '0 0 9 * * *')]);

		const summary = await provision(runnerWith(tx), []);

		expect(tx.deleteJobs).toHaveBeenCalledWith([10]);
		expect(tx.insert).toHaveBeenCalledWith([]);
		expect(summary).toEqual({
			inserted: [],
			redefined: [],
			unchanged: [],
			removed: [{ id: 10, name: 'wf:node:0' }],
		});
	});
});

describe('deprovision', () => {
	it('deletes the whole scope and reports the count', async () => {
		const tx = mock<DeprovisionTransaction>();
		tx.deleteAll.mockResolvedValue(3);
		const run: RunInDeprovisionTransaction = async (work) => await work(tx);

		expect(await deprovision(run)).toEqual({ removed: 3 });
	});
});
