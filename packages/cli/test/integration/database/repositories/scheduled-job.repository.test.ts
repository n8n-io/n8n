import { testDb } from '@n8n/backend-test-utils';
import { ScheduledJobOwnerType } from '@n8n/constants';
import type { ScheduledJob } from '@n8n/db';
import { ScheduledJobRepository } from '@n8n/db';
import { Container } from '@n8n/di';

describe('ScheduledJobRepository', () => {
	let jobRepo: ScheduledJobRepository;

	beforeAll(async () => {
		await testDb.init();
		jobRepo = Container.get(ScheduledJobRepository);
	});

	beforeEach(async () => {
		await testDb.truncate(['ScheduledTask', 'ScheduledJob']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	const createJob = async (name: string, overrides: Partial<ScheduledJob> = {}) =>
		await jobRepo.save(
			jobRepo.create({
				name,
				ownerType: ScheduledJobOwnerType.SystemTask,
				ownerId: name,
				ownerMemberId: null,
				taskType: 'system:test',
				payload: {},
				kind: 'interval',
				intervalSeconds: 600,
				enabled: true,
				nextRunAt: new Date('2026-01-01T00:10:00.000Z'),
				maxAttempts: 1,
				...overrides,
			}),
		);

	describe('findScheduleStatesByOwnerType', () => {
		it('reports a disabled or quarantined job as not runnable', async () => {
			await createJob('enabled');
			await createJob('disabled', { enabled: false });
			await createJob('quarantined', { orphanedAt: new Date('2026-01-01T00:00:00.000Z') });
			await createJob('workflow-job', { ownerType: ScheduledJobOwnerType.Workflow });

			const states = await jobRepo.findScheduleStatesByOwnerType(ScheduledJobOwnerType.SystemTask);

			const runnableByOwner = Object.fromEntries(
				states.map(({ ownerId, runnable }) => [ownerId, runnable]),
			);
			expect(runnableByOwner).toEqual({ enabled: true, disabled: false, quarantined: false });
		});

		it('returns the last dispatch stored on each job', async () => {
			const LAST_DISPATCH = new Date('2026-01-01T00:00:00.000Z');
			await createJob('dispatched-once', { lastDispatchedAt: LAST_DISPATCH });
			await createJob('never-dispatched');

			const states = await jobRepo.findScheduleStatesByOwnerType(ScheduledJobOwnerType.SystemTask);

			const lastDispatchedByOwner = Object.fromEntries(
				states.map(({ ownerId, lastDispatchedAt }) => [ownerId, lastDispatchedAt]),
			);
			expect(lastDispatchedByOwner).toEqual({
				'dispatched-once': LAST_DISPATCH,
				'never-dispatched': null,
			});
		});
	});
});
