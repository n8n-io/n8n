import { createWorkflowWithHistory, testDb } from '@n8n/backend-test-utils';
import type { ScheduledJob as ScheduledJobEntity } from '@n8n/db';
import { ScheduledJobRepository, WorkflowPublishedVersionRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { v4 as uuid } from 'uuid';

describe('ScheduledJobRepository.claimDueCompletingOwnerGroups', () => {
	let dataSource: DataSource;
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
	});

	beforeEach(async () => {
		await testDb.truncate(['ScheduledTask', 'ScheduledJob']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	it('claims all rules of a node whose nextRunAt values are separated by other jobs', async () => {
		const nodeId = uuid();
		const ruleA = await createJob({ workflowId, nodeId, nextRunAt: secondsFromNow(-300) });
		const ruleB = await createJob({ workflowId, nodeId, nextRunAt: secondsFromNow(-200) });
		const ruleC = await createJob({ workflowId, nodeId, nextRunAt: secondsFromNow(-100) });
		const separatorA = await createJob({ nextRunAt: secondsFromNow(-250) });
		const separatorB = await createJob({ nextRunAt: secondsFromNow(-150) });

		const claimed = await claim(2);

		const ids = claimed?.jobs.map((job) => job.id) ?? [];
		expect(ids).toEqual(expect.arrayContaining([ruleA.id, ruleB.id, ruleC.id, separatorA.id]));
		expect(ids).not.toContain(separatorB.id);
		expect(new Set(ids).size).toBe(ids.length);
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

		const claimed = await claim(1);

		expect((claimed?.jobs ?? []).filter((job) => job.nodeId === nodeId)).toHaveLength(3);
	});

	it('returns undefined when nothing is due', async () => {
		await createJob({ workflowId, nodeId: uuid(), nextRunAt: secondsFromNow(3600) });

		expect(await claim(100)).toBeUndefined();
	});
});
