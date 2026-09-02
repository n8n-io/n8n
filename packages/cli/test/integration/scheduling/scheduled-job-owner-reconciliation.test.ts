import { createWorkflowWithHistory, testDb } from '@n8n/backend-test-utils';
import { SchedulerConfig } from '@n8n/config';
import { ScheduledJobMisfirePolicy } from '@n8n/constants';
import type { ScheduledJob, WorkflowEntity } from '@n8n/db';
import {
	ScheduledJobRepository,
	ScheduledTaskRepository,
	WorkflowPublishedVersionRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import type { ScheduledJobOwnerResolver } from '@n8n/scheduler';
import { reconcile, ScheduledJobOwnerRegistry } from '@n8n/scheduler';
import { v4 as uuid } from 'uuid';

import { DurableJobProvisioner } from '@/scheduling/durable-job-provisioner';
import { WorkflowScheduledJobOwner } from '@/scheduling/workflow-scheduled-job-owner';

import { createDueJobFactory, seedDueTask, workflowOwned } from './shared/job-factory';

/**
 * The reconciliation sweep against real rows: the safety net replacing the
 * `scheduled_job.workflowId` foreign key's `ON DELETE CASCADE`.
 *
 * Each case is one the synchronous deprovision path missed, plus the guardrails
 * that keep the sweep from destroying valid jobs on a wrong liveness answer.
 */
describe('scheduled job owner reconciliation', () => {
	const TASK_TYPE = 'integration-owner-reconciliation';

	let jobRepo: ScheduledJobRepository;
	let taskRepo: ScheduledTaskRepository;
	let publishedVersions: WorkflowPublishedVersionRepository;
	let registry: ScheduledJobOwnerRegistry;
	let config: SchedulerConfig;
	let createJob: ReturnType<typeof createDueJobFactory>;

	/** An owner type nothing else claims, so a test can hand it any resolver. */
	const TEST_OWNER_TYPE = 'reconciliation-test';

	/** Swapped per test rather than re-registered: an owner type is claimed once. */
	let testResolver: ScheduledJobOwnerResolver;

	/** The real one, unless a test needs to interleave work with the liveness read. */
	let workflowResolver: ScheduledJobOwnerResolver;

	const registerTestResolver = (resolver: ScheduledJobOwnerResolver) => {
		testResolver = resolver;
	};

	const testOwned = (ownerId: string) => ({
		ownerType: TEST_OWNER_TYPE,
		ownerId,
		ownerMemberId: null,
	});

	const reload = async (id: number): Promise<ScheduledJob | null> =>
		await jobRepo.findOneBy({ id });

	/** Publish a workflow, so it owns scheduled jobs. */
	const publishWorkflow = async (): Promise<WorkflowEntity> => {
		const workflow = await createWorkflowWithHistory({ active: true });
		await publishedVersions.setPublishedVersion(workflow.id, workflow.versionId);
		return workflow;
	};

	/** Backdate a job past the settle window so the sweep considers it. */
	const settle = async (jobId: number) => {
		await jobRepo.update(
			{ id: jobId },
			{ createdAt: new Date(Date.now() - (config.ownerSettleSeconds + 60) * 1000) },
		);
	};

	/** Backdate a quarantine stamp past its grace so the sweep may delete it. */
	const expireQuarantine = async (jobId: number) => {
		await jobRepo.update(
			{ id: jobId },
			{ orphanedAt: new Date(Date.now() - (config.ownerQuarantineGraceSeconds + 60) * 1000) },
		);
	};

	beforeAll(async () => {
		await testDb.init();
		jobRepo = Container.get(ScheduledJobRepository);
		taskRepo = Container.get(ScheduledTaskRepository);
		publishedVersions = Container.get(WorkflowPublishedVersionRepository);
		config = Container.get(SchedulerConfig);
		createJob = createDueJobFactory(jobRepo, TASK_TYPE, 'owner-reconciliation');

		// This suite's own registry, so swapping resolvers leaves the container's alone.
		registry = new ScheduledJobOwnerRegistry();
		registry.register('workflow', {
			findExisting: async (ownerIds) => await workflowResolver.findExisting(ownerIds),
		});
		registry.register(TEST_OWNER_TYPE, {
			findExisting: async (ownerIds) => await testResolver.findExisting(ownerIds),
		});
	});

	/** One pass, driven the way `createScheduler`'s loop drives it. */
	const runReconciliation = async () =>
		await reconcile(jobRepo, registry, async () => await taskRepo.readDbTime(), {
			settleSeconds: config.ownerSettleSeconds,
			quarantineGraceSeconds: config.ownerQuarantineGraceSeconds,
			batchSize: config.ownerReconciliationBatchSize,
			maxPagesPerPass: 1000,
			defaultTimezone: 'UTC',
		});

	beforeEach(async () => {
		workflowResolver = Container.get(WorkflowScheduledJobOwner);
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

	describe('a workflow that lost its published version', () => {
		it('leaves a published workflow’s jobs running', async () => {
			const workflow = await publishWorkflow();
			const job = await createJob(workflowOwned(workflow.id, uuid()));
			await settle(job.id);

			const summary = await runReconciliation();

			expect(summary).toMatchObject({ quarantined: 0, deleted: 0 });
			const still = await reload(job.id);
			expect(still).toMatchObject({ enabled: true, orphanedAt: null });
			expect(still?.nextRunAt).not.toBeNull();
		});

		it('quarantines an unpublished workflow’s jobs and withdraws their queued runs', async () => {
			const workflow = await publishWorkflow();
			const job = await createJob(workflowOwned(workflow.id, uuid()));
			const queued = await seedDueTask(taskRepo, TASK_TYPE, job.id);
			await settle(job.id);

			// The teardown the FK used to do, now leaving the jobs behind.
			await publishedVersions.removePublishedVersion(workflow.id);

			const summary = await runReconciliation();

			expect(summary).toMatchObject({ quarantined: 1, deleted: 0 });
			const quarantined = await reload(job.id);
			expect(quarantined).toMatchObject({ enabled: true, nextRunAt: null });
			expect(quarantined?.orphanedAt).not.toBeNull();
			// Nothing already materialized is left to fire.
			expect(await taskRepo.findOneBy({ id: queued.id })).toBeNull();
		});

		it('deletes the quarantined jobs once their grace has passed, and their runs cascade away', async () => {
			const workflow = await publishWorkflow();
			const job = await createJob(workflowOwned(workflow.id, uuid()));
			await seedDueTask(taskRepo, TASK_TYPE, job.id);
			await settle(job.id);
			await publishedVersions.removePublishedVersion(workflow.id);

			await runReconciliation();
			await expireQuarantine(job.id);
			const summary = await runReconciliation();

			expect(summary).toMatchObject({ deleted: 1 });
			expect(await reload(job.id)).toBeNull();
			expect(await taskRepo.countBy({ jobId: job.id })).toBe(0);
		});

		it('keeps a job quarantined but undeleted while it is inside its grace', async () => {
			const workflow = await publishWorkflow();
			const job = await createJob(workflowOwned(workflow.id, uuid()));
			await settle(job.id);
			await publishedVersions.removePublishedVersion(workflow.id);

			await runReconciliation();
			// A second pass, with the stamp still fresh.
			const summary = await runReconciliation();

			expect(summary).toMatchObject({ quarantined: 0, deleted: 0 });
			expect((await reload(job.id))?.orphanedAt).not.toBeNull();
		});

		it('leaves a disabled job disabled through its quarantine and revival', async () => {
			let alive = false;
			registerTestResolver({
				findExisting: async (ownerIds) =>
					await Promise.resolve(alive ? new Set(ownerIds) : new Set<string>()),
			});
			const job = await createJob({ ...testOwned('subject-0'), enabled: false, nextRunAt: null });
			await settle(job.id);

			await runReconciliation();
			expect(await reload(job.id)).toMatchObject({ enabled: false, nextRunAt: null });

			alive = true;
			const summary = await runReconciliation();

			expect(summary).toMatchObject({ revived: 1 });
			expect(await reload(job.id)).toMatchObject({
				enabled: false,
				nextRunAt: null,
				orphanedAt: null,
			});
		});
	});

	describe('a resolver that cannot be trusted', () => {
		it('revives the jobs of an owner a wrong answer had condemned, with a fresh clock', async () => {
			let alive = false;
			registerTestResolver({
				findExisting: async (ownerIds) =>
					await Promise.resolve(alive ? new Set(ownerIds) : new Set<string>()),
			});
			const job = await createJob({ ...testOwned('subject-1'), intervalSeconds: 3600 });
			await settle(job.id);

			await runReconciliation();
			expect(await reload(job.id)).toMatchObject({ nextRunAt: null });

			// The resolver bug is fixed inside the grace window.
			alive = true;
			const summary = await runReconciliation();

			expect(summary).toMatchObject({ revived: 1, deleted: 0 });
			const revived = await reload(job.id);
			expect(revived).toMatchObject({ enabled: true, orphanedAt: null });
			expect(revived?.nextRunAt?.getTime()).toBeGreaterThan(Date.now());
		});

		it('deletes nothing once the owner is alive again, even past the grace', async () => {
			let alive = false;
			registerTestResolver({
				findExisting: async (ownerIds) =>
					await Promise.resolve(alive ? new Set(ownerIds) : new Set<string>()),
			});
			const job = await createJob(testOwned('subject-2'));
			await settle(job.id);

			await runReconciliation();
			await expireQuarantine(job.id);
			alive = true;

			const summary = await runReconciliation();

			expect(summary).toMatchObject({ deleted: 0, revived: 1 });
			expect(await reload(job.id)).toMatchObject({ enabled: true, orphanedAt: null });
		});

		it('leaves every job alone when the resolver throws', async () => {
			registerTestResolver({
				findExisting: async () => await Promise.reject(new Error('lookup failed')),
			});
			const job = await createJob(testOwned('subject-3'));
			await settle(job.id);

			const summary = await runReconciliation();

			expect(summary.skippedOwnerTypes).toContain(TEST_OWNER_TYPE);
			expect(summary).toMatchObject({ quarantined: 0, deleted: 0 });
			expect(await reload(job.id)).toMatchObject({ enabled: true, orphanedAt: null });
		});

		it('leaves a quarantined job undeleted when the resolver starts throwing before its grace ends', async () => {
			let failing = false;
			registerTestResolver({
				findExisting: async () =>
					failing
						? await Promise.reject(new Error('lookup failed'))
						: await Promise.resolve(new Set<string>()),
			});
			const job = await createJob(testOwned('subject-4'));
			await settle(job.id);

			await runReconciliation();
			await expireQuarantine(job.id);
			failing = true;

			const summary = await runReconciliation();

			expect(summary).toMatchObject({ deleted: 0 });
			expect(await reload(job.id)).not.toBeNull();
		});

		it('leaves the jobs of an owner type nothing claimed alone', async () => {
			const job = await jobRepo.save(
				jobRepo.create({
					name: 'unclaimed-owner-type',
					ownerType: 'never-registered',
					ownerId: 'whatever',
					ownerMemberId: null,
					taskType: TASK_TYPE,
					payload: {},
					kind: 'interval',
					intervalSeconds: 3600,
					enabled: true,
					nextRunAt: new Date(Date.now() - 1000),
					maxAttempts: 3,
				}),
			);
			await settle(job.id);

			const summary = await runReconciliation();

			expect(summary.skippedOwnerTypes).toContain('never-registered');
			expect(await reload(job.id)).toMatchObject({ enabled: true, orphanedAt: null });
		});
	});

	describe('a pass racing a concurrent provision', () => {
		it('may re-quarantine jobs a provision revived on a stale answer, and the next pass lifts it', async () => {
			const workflow = await publishWorkflow();
			const provisioner = Container.get(DurableJobProvisioner);
			const nodeId = uuid();
			const provisionOnce = async () =>
				await provisioner.provision({
					owner: { ownerType: 'workflow', ownerId: workflow.id, ownerMemberId: nodeId },
					taskType: TASK_TYPE,
					payload: {},
					desired: [
						{
							name: `${workflow.id}:${nodeId}:0`,
							schedule: { kind: 'interval', intervalSeconds: 3600 },
							firstRunAt: new Date(Date.now() + 3600_000),
						},
					],
					misfirePolicy: ScheduledJobMisfirePolicy.Skip,
				});

			const { inserted } = await provisionOnce();
			const jobId = inserted[0].id;
			await settle(jobId);
			await publishedVersions.removePublishedVersion(workflow.id);
			await runReconciliation();
			expect((await reload(jobId))?.orphanedAt).not.toBeNull();

			// The pass reads its liveness answer, then stalls while the workflow
			// publishes again and provisioning lifts the quarantine.
			const real = Container.get(WorkflowScheduledJobOwner);
			workflowResolver = {
				findExisting: async (ownerIds) => {
					const answer = await real.findExisting(ownerIds);
					await publishedVersions.setPublishedVersion(workflow.id, workflow.versionId);
					await provisionOnce();
					expect(await reload(jobId)).toMatchObject({ enabled: true, orphanedAt: null });
					return answer;
				},
			};
			const stale = await runReconciliation();

			// The stale answer wins: the live jobs are quarantined again, but the fresh
			// stamp keeps them a whole grace away from deletion.
			expect(stale).toMatchObject({ quarantined: 1, deleted: 0 });
			expect((await reload(jobId))?.orphanedAt).not.toBeNull();

			// The next pass sees the owner alive and lifts it: the race is transient.
			workflowResolver = real;
			const next = await runReconciliation();

			expect(next).toMatchObject({ revived: 1, deleted: 0 });
			const revived = await reload(jobId);
			expect(revived).toMatchObject({ enabled: true, orphanedAt: null });
			expect(revived?.nextRunAt).not.toBeNull();
		});
	});

	describe('the settle window', () => {
		it('ignores a job younger than the settle period, so a just-provisioned job is safe', async () => {
			registerTestResolver({
				findExisting: async () => await Promise.resolve(new Set<string>()),
			});
			// Not settled: written moments ago, as if its owner is still being created.
			const job = await createJob(testOwned('subject-5'));

			const summary = await runReconciliation();

			expect(summary).toMatchObject({ ownersChecked: 0, quarantined: 0 });
			expect(await reload(job.id)).toMatchObject({ enabled: true, orphanedAt: null });
		});

		it('leaves the queued runs of a job younger than the settle period alone, while quarantining its settled sibling', async () => {
			registerTestResolver({
				findExisting: async () => await Promise.resolve(new Set<string>()),
			});
			const owned = testOwned('subject-6');
			const settled = await createJob(owned);
			await settle(settled.id);
			const settledRun = await seedDueTask(taskRepo, TASK_TYPE, settled.id);
			// Written moments ago and already materialized: the settle bound spares it,
			// so withdrawing its occurrence would drop a run nothing requeues.
			const fresh = await createJob(owned);
			const freshRun = await seedDueTask(taskRepo, TASK_TYPE, fresh.id);

			const summary = await runReconciliation();

			expect(summary).toMatchObject({ quarantined: 1 });
			expect(await taskRepo.findOneBy({ id: settledRun.id })).toBeNull();
			expect(await reload(fresh.id)).toMatchObject({ enabled: true, orphanedAt: null });
			expect(await taskRepo.findOneBy({ id: freshRun.id })).not.toBeNull();
		});
	});
});
