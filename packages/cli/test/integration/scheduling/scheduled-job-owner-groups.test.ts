import { createWorkflowWithHistory, testDb } from '@n8n/backend-test-utils';
import { ScheduledJobMisfirePolicy } from '@n8n/constants';
import type { ScheduledJob as ScheduledJobEntity } from '@n8n/db';
import {
	DbConnectionOptions,
	ScheduledJob,
	ScheduledJobRepository,
	WorkflowPublishedVersionRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { v4 as uuid } from 'uuid';

// SKIP LOCKED and two write transactions open at once only apply on Postgres; the sqlite
// driver serializes every writer through a single lock.
const isPostgres = process.env.DB_TYPE === 'postgresdb';

describe('ScheduledJobRepository.claimDueCompletingOwnerGroups', () => {
	let dataSource: DataSource;
	let secondaryDataSource: DataSource | undefined;
	let jobRepository: ScheduledJobRepository;
	let workflowId: string;
	let otherWorkflowId: string;

	const secondsFromNow = (seconds: number) => new Date(Date.now() + seconds * 1000);

	const publishWorkflow = async () => {
		const workflow = await createWorkflowWithHistory({ active: true });
		await Container.get(WorkflowPublishedVersionRepository).setPublishedVersion(
			workflow.id,
			workflow.versionId,
		);
		return workflow.id;
	};

	const createJob = async (
		overrides: Partial<ScheduledJobEntity> = {},
	): Promise<ScheduledJobEntity> =>
		await jobRepository.save(
			jobRepository.create({
				name: `job-${uuid()}`,
				workflowId: null,
				nodeId: null,
				taskType: 'scheduleTrigger',
				payload: {},
				kind: 'interval',
				intervalSeconds: 60,
				enabled: true,
				nextRunAt: secondsFromNow(-60),
				maxAttempts: 1,
				misfirePolicy: ScheduledJobMisfirePolicy.CoalesceOwner,
				...overrides,
			}),
		);

	const claim = async (limit: number) =>
		await dataSource.transaction(
			async (trx) => await jobRepository.claimDueCompletingOwnerGroups(trx, limit),
		);

	beforeAll(async () => {
		await testDb.init();
		dataSource = Container.get(DataSource);
		jobRepository = Container.get(ScheduledJobRepository);
		workflowId = await publishWorkflow();
		otherWorkflowId = await publishWorkflow();

		if (isPostgres) {
			secondaryDataSource = new DataSource(Container.get(DbConnectionOptions).getOptions());
			await secondaryDataSource.initialize();
		}
	});

	beforeEach(async () => {
		await testDb.truncate(['ScheduledTask', 'ScheduledJob']);
	});

	afterAll(async () => {
		if (secondaryDataSource?.isInitialized) {
			await secondaryDataSource.destroy();
		}
		await testDb.terminate();
	});

	it('returns the completed batch ordered by nextRunAt', async () => {
		const nodeId = uuid();
		const ruleA = await createJob({ workflowId, nodeId, nextRunAt: secondsFromNow(-300) });
		const ruleC = await createJob({ workflowId, nodeId, nextRunAt: secondsFromNow(-100) });
		const separator = await createJob({ nextRunAt: secondsFromNow(-200) });

		const claimed = await claim(1);

		expect(claimed?.jobs.map((job) => job.id)).toEqual([ruleA.id, ruleC.id]);
		expect(claimed?.jobs.map((job) => job.id)).not.toContain(separator.id);
	});

	it('completes only the group of the node that was claimed', async () => {
		const nodeId = uuid();
		const otherNodeId = uuid();
		const ruleA = await createJob({ workflowId, nodeId, nextRunAt: secondsFromNow(-300) });
		const ruleB = await createJob({ workflowId, nodeId, nextRunAt: secondsFromNow(-50) });
		const sameNodeIdOtherWorkflow = await createJob({
			workflowId: otherWorkflowId,
			nodeId,
			nextRunAt: secondsFromNow(-40),
		});
		const otherNode = await createJob({
			workflowId,
			nodeId: otherNodeId,
			nextRunAt: secondsFromNow(-30),
		});

		const claimed = await claim(1);

		expect(claimed?.jobs.map((job) => job.id)).toEqual([ruleA.id, ruleB.id]);
		expect(claimed?.jobs.map((job) => job.id)).not.toContain(sameNodeIdOtherWorkflow.id);
		expect(claimed?.jobs.map((job) => job.id)).not.toContain(otherNode.id);
	});

	it('does not pull in siblings that are disabled, not yet due, or clockless', async () => {
		const nodeId = uuid();
		const due = await createJob({ workflowId, nodeId, nextRunAt: secondsFromNow(-300) });
		await createJob({ workflowId, nodeId, enabled: false, nextRunAt: secondsFromNow(-200) });
		await createJob({ workflowId, nodeId, nextRunAt: secondsFromNow(3600) });
		await createJob({ workflowId, nodeId, nextRunAt: null });

		const claimed = await claim(100);

		expect(claimed?.jobs.map((job) => job.id)).toEqual([due.id]);
	});

	it('leaves the batch untouched when no claimed job has an owning node', async () => {
		const older = await createJob({ nextRunAt: secondsFromNow(-120) });
		await createJob({ nextRunAt: secondsFromNow(-60) });

		const claimed = await claim(1);

		expect(claimed?.jobs.map((job) => job.id)).toEqual([older.id]);
	});

	it('claims a backdated group of rules in one pass', async () => {
		const nodeId = uuid();
		await createJob({ workflowId, nodeId, nextRunAt: secondsFromNow(3600) });
		await createJob({ workflowId, nodeId, nextRunAt: secondsFromNow(7200) });
		await createJob({ workflowId, nodeId, nextRunAt: secondsFromNow(10_800) });
		await createJob({ nextRunAt: secondsFromNow(-30) });

		await jobRepository.backdateNextRunAt(workflowId, nodeId, 90);

		const claimed = await claim(2);

		expect((claimed?.jobs ?? []).filter((job) => job.nodeId === nodeId)).toHaveLength(3);
	});

	it('does not complete a group for a claimed job that has a workflow but no node', async () => {
		const nodeId = uuid();
		const withoutNode = await createJob({
			workflowId,
			nodeId: null,
			nextRunAt: secondsFromNow(-300),
		});
		await createJob({ workflowId, nodeId, nextRunAt: secondsFromNow(-100) });

		const claimed = await claim(1);

		expect(claimed?.jobs.map((job) => job.id)).toEqual([withoutNode.id]);
	});

	it('does not complete a group for a claimed job that has a node but no workflow', async () => {
		const nodeId = uuid();
		const withoutWorkflow = await createJob({
			workflowId: null,
			nodeId,
			nextRunAt: secondsFromNow(-300),
		});
		await createJob({ workflowId, nodeId, nextRunAt: secondsFromNow(-100) });

		const claimed = await claim(1);

		expect(claimed?.jobs.map((job) => job.id)).toEqual([withoutWorkflow.id]);
	});

	it('exceeds the limit to complete a group, by at most a further limit', async () => {
		const nodeId = uuid();
		for (const secondsBehind of [-400, -300, -200, -100, -50, -40]) {
			await createJob({ workflowId, nodeId, nextRunAt: secondsFromNow(secondsBehind) });
		}

		const claimed = await claim(2);

		expect(claimed?.jobs).toHaveLength(4);
	});

	it('leaves the rest of an oversized group for the next pass', async () => {
		const nodeId = uuid();
		const runTimes = [-400, -300, -200, -100, -50, -40];
		for (const secondsBehind of runTimes) {
			await createJob({ workflowId, nodeId, nextRunAt: secondsFromNow(secondsBehind) });
		}

		const first = await claim(1);
		const firstIds = first?.jobs.map((job) => job.id) ?? [];
		await dataSource.transaction(async (trx) => {
			await jobRepository.advanceMany(
				trx,
				firstIds.map((id) => ({ id, nextRunAt: secondsFromNow(3600), lastFiredAt: new Date() })),
			);
		});
		const second = await claim(1);

		expect(firstIds).toHaveLength(2);
		expect(second?.jobs).toHaveLength(2);
		expect(second?.jobs.some((job) => firstIds.includes(job.id))).toBe(false);
	});

	it('does not pull in siblings whose misfire policy cannot group', async () => {
		const nodeId = uuid();
		const owner = await createJob({ workflowId, nodeId, nextRunAt: secondsFromNow(-300) });
		await createJob({
			workflowId,
			nodeId,
			nextRunAt: secondsFromNow(-200),
			misfirePolicy: ScheduledJobMisfirePolicy.Coalesce,
		});
		await createJob({
			workflowId,
			nodeId,
			nextRunAt: secondsFromNow(-100),
			misfirePolicy: ScheduledJobMisfirePolicy.Skip,
		});

		const claimed = await claim(1);

		expect(claimed?.jobs.map((job) => job.id)).toEqual([owner.id]);
	});

	it('does not complete a group for a claimed job whose misfire policy cannot group', async () => {
		const nodeId = uuid();
		const coalescing = await createJob({
			workflowId,
			nodeId,
			nextRunAt: secondsFromNow(-300),
			misfirePolicy: ScheduledJobMisfirePolicy.Coalesce,
		});
		await createJob({ workflowId, nodeId, nextRunAt: secondsFromNow(-100) });

		const claimed = await claim(1);

		expect(claimed?.jobs.map((job) => job.id)).toEqual([coalescing.id]);
	});

	it('adds nothing when the claim already holds every rule of the node', async () => {
		const nodeId = uuid();
		for (const secondsBehind of [-300, -200, -100]) {
			await createJob({ workflowId, nodeId, nextRunAt: secondsFromNow(secondsBehind) });
		}

		const claimed = await claim(10);

		expect(claimed?.jobs).toHaveLength(3);
		expect(new Set(claimed?.jobs.map((job) => job.id)).size).toBe(3);
	});

	it('returns the merged batch of claimed and completed rows in ascending order', async () => {
		const nodeId = uuid();
		await createJob({ workflowId, nodeId, nextRunAt: secondsFromNow(-400) });
		await createJob({ nextRunAt: secondsFromNow(-350) });
		await createJob({ workflowId, nodeId, nextRunAt: secondsFromNow(-300) });
		await createJob({ workflowId, nodeId, nextRunAt: secondsFromNow(-50) });

		const claimed = await claim(2);

		expect(claimed?.jobs).toHaveLength(4);
		const runTimes = (claimed?.jobs ?? []).map((job) => job.nextRunAt!.getTime());
		expect(runTimes).toEqual([...runTimes].sort((a, b) => a - b));
	});

	it.skipIf(!isPostgres)(
		'claims the group incomplete when another transaction already holds a sibling',
		async () => {
			const nodeId = uuid();
			const ruleA = await createJob({ workflowId, nodeId, nextRunAt: secondsFromNow(-300) });
			const ruleB = await createJob({ workflowId, nodeId, nextRunAt: secondsFromNow(-200) });

			const runnerA = dataSource.createQueryRunner();
			const runnerB = secondaryDataSource!.createQueryRunner();
			let claimedIds: number[] = [];
			try {
				await runnerB.connect();
				await runnerB.startTransaction();
				await runnerB.manager
					.getRepository(ScheduledJob)
					.createQueryBuilder('job')
					.setLock('pessimistic_write')
					.whereInIds([ruleB.id])
					.getMany();

				await runnerA.connect();
				await runnerA.startTransaction();
				const claimed = await jobRepository.claimDueCompletingOwnerGroups(runnerA.manager, 1);
				claimedIds = claimed?.jobs.map((job) => job.id) ?? [];

				await runnerA.commitTransaction();
				await runnerB.rollbackTransaction();
			} finally {
				await runnerA.release();
				await runnerB.release();
			}

			expect(claimedIds).toEqual([ruleA.id]);

			const afterRelease = await claim(1);
			expect(afterRelease?.jobs.map((job) => job.id)).toEqual([ruleA.id, ruleB.id]);
		},
	);

	it('returns undefined when nothing is due', async () => {
		await createJob({ workflowId, nodeId: uuid(), nextRunAt: secondsFromNow(3600) });

		expect(await claim(100)).toBeUndefined();
	});
});
