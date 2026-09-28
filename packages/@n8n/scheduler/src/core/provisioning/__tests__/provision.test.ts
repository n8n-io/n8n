import { ScheduledJobMisfirePolicy } from '@n8n/constants';
import { mock } from 'vitest-mock-extended';

import { provision, deprovision } from '../provision';
import type {
	ProvisionTransaction,
	DeprovisionTransaction,
	RunInProvisionTransaction,
	RunInDeprovisionTransaction,
} from '../transaction';
import type { DesiredJob, ExistingJob, ScheduleDefinition, StoredJobs } from '../types';

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
		tx.readJobs.mockResolvedValue({ now: new Date(), jobs: [] });
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

describe('provision seeding first occurrences', () => {
	const NOW = new Date('2026-01-05T08:00:00.000Z');

	const storedJob = (id: number, overrides: Partial<StoredJobs['jobs'][number]> = {}) => ({
		id,
		taskType: 'test',
		payload: {},
		kind: 'interval' as const,
		cronExpression: null,
		timezone: null,
		intervalSeconds: 10,
		fireAt: null,
		recurrenceUnit: null,
		recurrenceSize: null,
		nextRunAt: new Date(NOW.getTime() + 10_000),
		lastFiredAt: null,
		maxAttempts: 1,
		concurrencyLimit: null,
		misfirePolicy: ScheduledJobMisfirePolicy.Skip,
		misfireGraceSeconds: 60,
		ownerKey: 'owner-a',
		enabled: true,
		...overrides,
	});

	const seedingTx = (
		existing: ExistingJob[],
		insertedIds: number[],
		stored: StoredJobs['jobs'],
	) => {
		const tx = mock<ProvisionTransaction>();
		tx.findExisting.mockResolvedValue(existing);
		tx.insert.mockResolvedValue(insertedIds);
		tx.readJobs.mockResolvedValue({ now: NOW, jobs: stored });
		tx.recordOccurrences.mockImplementation(async (rows) => ({
			recorded: rows.length,
			created: [],
		}));
		tx.retireSuperseded.mockResolvedValue(0);
		return tx;
	};

	it('records the first window of inserted and redefined jobs and advances their clock', async () => {
		const tx = seedingTx(
			[existingJob(10, 'wf:node:0', '0 0 9 * * *')],
			[100],
			[storedJob(100), storedJob(10)],
		);

		await provision(runnerWith(tx), [
			desiredJob('wf:node:0', '0 0 18 * * *'),
			desiredJob('wf:node:1', '0 0 9 * * *'),
		]);

		expect(tx.readJobs).toHaveBeenCalledWith([100, 10]);
		const recordedJobIds = tx.recordOccurrences.mock.calls[0][0].map((row) => row.jobId);
		expect(new Set(recordedJobIds)).toEqual(new Set([100, 10]));
		const advanced = tx.advanceJobs.mock.calls[0][0];
		expect(advanced.map(({ job }) => job.id)).toEqual([100, 10]);
		for (const { plan } of advanced) {
			expect(plan.nextRunAt!.getTime()).toBeGreaterThan(NOW.getTime());
		}
	});

	it('skips a disabled job and a job with no clock', async () => {
		const tx = seedingTx(
			[],
			[100, 101],
			[storedJob(100, { enabled: false }), storedJob(101, { nextRunAt: null })],
		);

		await provision(runnerWith(tx), [
			desiredJob('wf:node:0', '0 0 9 * * *'),
			desiredJob('wf:node:1', '0 0 9 * * *'),
		]);

		expect(tx.readJobs).toHaveBeenCalledWith([100, 101]);
		expect(tx.recordOccurrences).not.toHaveBeenCalled();
		expect(tx.advanceJobs).not.toHaveBeenCalled();
	});

	it("withdraws a redefined job's stale tasks before it seeds new ones", async () => {
		const tx = seedingTx([existingJob(10, 'wf:node:0', '0 0 9 * * *')], [], [storedJob(10)]);

		await provision(runnerWith(tx), [desiredJob('wf:node:0', '0 0 18 * * *')]);

		expect(tx.withdrawPendingTasks.mock.invocationCallOrder[0]).toBeLessThan(
			tx.recordOccurrences.mock.invocationCallOrder[0],
		);
	});

	it('reads no jobs back when nothing was inserted or redefined', async () => {
		const tx = seedingTx([existingJob(10, 'wf:node:0', '0 0 9 * * *')], [], []);

		await provision(runnerWith(tx), [desiredJob('wf:node:0', '0 0 9 * * *')]);

		expect(tx.readJobs).not.toHaveBeenCalled();
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
