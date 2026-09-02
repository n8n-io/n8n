import { createWorkflowWithHistory, testDb } from '@n8n/backend-test-utils';
import type { WorkflowEntity } from '@n8n/db';
import {
	DataSource,
	ScheduledJobRepository,
	ScheduledTaskRepository,
	WorkflowPublishedVersionRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { ScheduledJobMisfirePolicy } from '@n8n/constants';
import { v4 as uuid } from 'uuid';

import { DurableJobProvisioner } from '@/scheduling/durable-job-provisioner';
import { POLL_TRIGGER_TASK_TYPE } from '@/scheduling/poll-trigger-node/poll-trigger-task';
import { SCHEDULE_TRIGGER_TASK_TYPE } from '@/scheduling/schedule-trigger-node/schedule-trigger-task';
import { WorkflowScheduledJobOwner } from '@/scheduling/workflow-scheduled-job-owner';

import { createDueJobFactory, seedDueTask, workflowOwned } from './shared/job-factory';

/**
 * Owner teardown against real rows.
 *
 * `scheduled_job.workflowId` used to carry a foreign key to
 * `workflow_published_version` with `ON DELETE CASCADE`, so unpublishing a workflow
 * removed its jobs in the database. That key is gone and teardown is now an
 * explicit call every owner module owes. This suite pins both halves: that the
 * cascade is gone, and that the explicit call covers what it used to.
 */
describe('scheduled job owner teardown', () => {
	const TASK_TYPE = 'integration-owner-teardown';

	let jobRepo: ScheduledJobRepository;
	let taskRepo: ScheduledTaskRepository;
	let publishedVersions: WorkflowPublishedVersionRepository;
	let owner: WorkflowScheduledJobOwner;
	let provisioner: DurableJobProvisioner;
	let dataSource: DataSource;
	let createJob: ReturnType<typeof createDueJobFactory>;

	const publishWorkflow = async (): Promise<WorkflowEntity> => {
		const workflow = await createWorkflowWithHistory({ active: true });
		await publishedVersions.setPublishedVersion(workflow.id, workflow.versionId);
		return workflow;
	};

	beforeAll(async () => {
		await testDb.init();
		jobRepo = Container.get(ScheduledJobRepository);
		taskRepo = Container.get(ScheduledTaskRepository);
		publishedVersions = Container.get(WorkflowPublishedVersionRepository);
		owner = Container.get(WorkflowScheduledJobOwner);
		provisioner = Container.get(DurableJobProvisioner);
		dataSource = Container.get(DataSource);
		createJob = createDueJobFactory(jobRepo, TASK_TYPE, 'owner-teardown');
	});

	beforeEach(async () => {
		await testDb.truncate([
			'ScheduledTask',
			'ScheduledJob',
			'WorkflowPublishedVersion',
			'WorkflowEntity',
			'WorkflowHistory',
		]);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	it('no longer removes a workflow’s jobs when its published version goes away', async () => {
		// The pin on the dropped cascade, and why every teardown path has to
		// deprovision for itself.
		const workflow = await publishWorkflow();
		const job = await createJob(workflowOwned(workflow.id, uuid()));

		await publishedVersions.removePublishedVersion(workflow.id);

		expect(await jobRepo.findOneBy({ id: job.id })).not.toBeNull();
	});

	it('deletes every job the workflow owns, across nodes and task types, with their queued runs', async () => {
		const workflow = await publishWorkflow();
		const other = await publishWorkflow();
		const nodeA = uuid();
		const nodeB = uuid();
		const scheduleJob = await createJob({
			...workflowOwned(workflow.id, nodeA),
			taskType: SCHEDULE_TRIGGER_TASK_TYPE,
		});
		const pollJob = await createJob({
			...workflowOwned(workflow.id, nodeB),
			taskType: POLL_TRIGGER_TASK_TYPE,
		});
		const foreignJob = await createJob(workflowOwned(other.id, nodeA));
		await seedDueTask(taskRepo, TASK_TYPE, scheduleJob.id);
		await seedDueTask(taskRepo, TASK_TYPE, pollJob.id);
		await seedDueTask(taskRepo, TASK_TYPE, foreignJob.id);

		const { removed } = await provisioner.deprovisionOwner(owner.ref(workflow.id));

		expect(removed).toBe(2);
		expect(await jobRepo.findOneBy({ id: scheduleJob.id })).toBeNull();
		expect(await jobRepo.findOneBy({ id: pollJob.id })).toBeNull();
		expect(await taskRepo.countBy({ jobId: scheduleJob.id })).toBe(0);
		expect(await taskRepo.countBy({ jobId: pollJob.id })).toBe(0);
		// Another workflow's jobs are untouched.
		expect(await jobRepo.findOneBy({ id: foreignJob.id })).not.toBeNull();
		expect(await taskRepo.countBy({ jobId: foreignJob.id })).toBe(1);
	});

	it('is a no-op for a workflow that owns nothing, so a retried teardown is safe', async () => {
		const workflow = await publishWorkflow();

		const deprovision = async () => await provisioner.deprovisionOwner(owner.ref(workflow.id));

		await expect(deprovision()).resolves.toEqual({ removed: 0 });
		await expect(deprovision()).resolves.toEqual({ removed: 0 });
	});

	it('commits the teardown with the caller’s transaction, and rolls back with it', async () => {
		const workflow = await publishWorkflow();
		const job = await createJob(workflowOwned(workflow.id, uuid()));

		await expect(
			dataSource.transaction(async (manager) => {
				await provisioner.deprovisionOwnerInTransaction(manager, owner.ref(workflow.id));
				throw new Error('caller failed after deprovisioning');
			}),
		).rejects.toThrow('caller failed after deprovisioning');

		// The rollback took the delete with it, so the job's removal is not independent
		// of the write that made the workflow stop owning it.
		expect(await jobRepo.findOneBy({ id: job.id })).not.toBeNull();

		await dataSource.transaction(async (manager) => {
			await provisioner.deprovisionOwnerInTransaction(manager, owner.ref(workflow.id));
		});

		expect(await jobRepo.findOneBy({ id: job.id })).toBeNull();
	});

	it('refuses to provision an owner type with no liveness resolver, writing nothing', async () => {
		await expect(
			provisioner.provision({
				owner: { ownerType: 'unregistered-kind', ownerId: 'subject-1', ownerMemberId: null },
				taskType: TASK_TYPE,
				payload: {},
				desired: [
					{
						name: 'unregistered-kind:0',
						schedule: { kind: 'interval', intervalSeconds: 60 },
						firstRunAt: new Date(),
					},
				],
				misfirePolicy: ScheduledJobMisfirePolicy.Skip,
			}),
		).rejects.toThrow('no registered liveness resolver');

		expect(await jobRepo.countBy({ ownerType: 'unregistered-kind' })).toBe(0);
	});

	it('lifts a quarantine the sweep left behind when the owner provisions again', async () => {
		// The recovery path for a teardown that never ran. The sweep disabled the jobs
		// of a workflow it believed gone, then the workflow publishes again. Without
		// this the trigger stays silently dead until the next sweep.
		const workflow = await publishWorkflow();
		const nodeId = uuid();
		const desired = [
			{
				name: `${workflow.id}:${nodeId}:0`,
				schedule: { kind: 'interval', intervalSeconds: 3600 } as const,
				firstRunAt: new Date(Date.now() + 3600_000),
			},
		];
		const provisionOnce = async () =>
			await provisioner.provision({
				owner: owner.member(workflow.id, nodeId),
				taskType: SCHEDULE_TRIGGER_TASK_TYPE,
				payload: { workflowId: workflow.id, nodeId },
				desired,
				misfirePolicy: ScheduledJobMisfirePolicy.Skip,
			});

		const { inserted } = await provisionOnce();
		const jobId = inserted[0].id;
		await jobRepo.quarantineByOwnerIds(
			'workflow',
			[workflow.id],
			new Date(),
			new Date(Date.now() + 60_000),
		);
		const quarantined = await jobRepo.findOneByOrFail({ id: jobId });
		expect(quarantined).toMatchObject({ enabled: true, nextRunAt: null });
		expect(quarantined.orphanedAt).not.toBeNull();

		// Same schedule as before. Only the quarantine changed, so an unchanged plan
		// has to be enough to bring it back.
		await provisionOnce();

		const revived = await jobRepo.findOneByOrFail({ id: jobId });
		expect(revived).toMatchObject({ enabled: true, orphanedAt: null });
		expect(revived.nextRunAt).not.toBeNull();
	});

	it('provisions a workflow owner, whose type the workflow owner module claims', async () => {
		const workflow = await publishWorkflow();
		const nodeId = uuid();

		const summary = await provisioner.provision({
			owner: owner.member(workflow.id, nodeId),
			taskType: SCHEDULE_TRIGGER_TASK_TYPE,
			payload: { workflowId: workflow.id, nodeId },
			desired: [
				{
					name: `${workflow.id}:${nodeId}:0`,
					schedule: { kind: 'interval', intervalSeconds: 3600 },
					firstRunAt: new Date(Date.now() + 3600_000),
				},
			],
			misfirePolicy: ScheduledJobMisfirePolicy.Skip,
		});

		expect(summary.inserted).toHaveLength(1);
		const stored = await jobRepo.findOneByOrFail({ id: summary.inserted[0].id });
		expect(stored).toMatchObject({
			ownerType: 'workflow',
			ownerId: workflow.id,
			ownerMemberId: nodeId,
			orphanedAt: null,
		});
	});
});
