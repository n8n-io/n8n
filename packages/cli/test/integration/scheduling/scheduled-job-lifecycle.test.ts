import {
	createWorkflowWithHistory,
	mockInstance,
	setActiveVersion,
	testDb,
} from '@n8n/backend-test-utils';
import { SchedulerConfig, WorkflowsConfig } from '@n8n/config';
import type { WorkflowEntity } from '@n8n/db';
import {
	ScheduledJobRepository,
	WorkflowPublicationOutboxRepository,
	WorkflowPublishedVersionRepository,
	WorkflowRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { ActiveWorkflowTriggers, ExternalSecretsProxy, InstanceSettings } from 'n8n-core';
import { ScheduleTrigger } from 'n8n-nodes-base/nodes/Schedule/ScheduleTrigger.node';
import type { INode, INodeTypeData } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { ActiveExecutions } from '@/active-executions';
import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { ExecutionService } from '@/executions/execution.service';
import { ExternalHooks } from '@/external-hooks';
import { Push } from '@/push';
import { WorkflowScheduledJobOwner } from '@/scheduling/workflow-scheduled-job-owner';
import { OwnershipService } from '@/services/ownership.service';
import { Telemetry } from '@/telemetry';
import { WorkflowPublicationOutboxConsumer } from '@/workflows/publication/workflow-publication-outbox-consumer';
import { WorkflowService } from '@/workflows/workflow.service';

import { createOwner } from '../shared/db/users';
import { createWorkflowHistoryItem } from '../shared/db/workflow-history';
import * as utils from '../shared/utils/';

import { workflowOwned } from './shared/job-factory';

/**
 * What a workflow's `scheduled_job` rows do across its whole publication
 * lifecycle, now that no foreign key ties them to `workflow_published_version`.
 *
 * Driven through the real publication consumer rather than the provisioner, so
 * each step exercises the ordering the applier owns (deactivate, advance the
 * published version, activate) instead of a hand-rolled stand-in for it.
 */
mockInstance(ActiveExecutions);
mockInstance(Push);
mockInstance(ExternalSecretsProxy);
mockInstance(ExecutionService);
mockInstance(WorkflowService);
mockInstance(OwnershipService);
mockInstance(ExternalHooks);
mockInstance(Telemetry);

const abortSignal = new AbortController().signal;

let consumer: WorkflowPublicationOutboxConsumer;
let activeWorkflowManager: ActiveWorkflowManager;
let activeWorkflowTriggers: ActiveWorkflowTriggers;
let outboxRepository: WorkflowPublicationOutboxRepository;
let publishedVersions: WorkflowPublishedVersionRepository;
let workflowRepository: WorkflowRepository;
let jobRepo: ScheduledJobRepository;
let owner: WorkflowScheduledJobOwner;
let originalUseWorkflowPublicationService: boolean;
let originalSchedulerEnabled: boolean;

/** A Schedule Trigger firing on a fixed cadence, so it maps to one interval job. */
const scheduleNode = (suffix: string, id = `node-${suffix}`): INode => ({
	id,
	name: `Schedule ${suffix}`,
	type: 'n8n-nodes-base.scheduleTrigger',
	typeVersion: 1,
	position: [0, 0],
	parameters: { rule: { interval: [{ field: 'minutes', minutesInterval: 5 }] } },
});

/** Run the one pending publication record, as the leader's consumer would. */
const applyNextRecord = async () => {
	const record = await outboxRepository.claimNextPendingRecord();
	expect(record).not.toBeNull();
	await consumer.processRecord(record!, abortSignal);
};

/** Publish `workflow`'s current version for the first time. */
const publish = async (workflow: WorkflowEntity) => {
	await setActiveVersion(workflow.id, workflow.versionId);
	await outboxRepository.enqueue(workflow.id, workflow.versionId, 'publish');
	await applyNextRecord();
};

/** Publish a new version carrying `nodes`, and return its version id. */
const republish = async (workflow: WorkflowEntity, nodes: INode[]) => {
	const versionId = uuid();
	await createWorkflowHistoryItem(workflow.id, { versionId, nodes, connections: {} });
	await setActiveVersion(workflow.id, versionId);
	await outboxRepository.enqueue(workflow.id, versionId, 'publish');
	await applyNextRecord();
	return versionId;
};

/** Unpublish: the workflow keeps no active version, which is what the applier reads. */
const unpublish = async (workflow: WorkflowEntity, publishedVersionId: string) => {
	await workflowRepository.update(workflow.id, { active: false, activeVersionId: null });
	await outboxRepository.enqueue(workflow.id, publishedVersionId, 'publish');
	await applyNextRecord();
};

const jobsOf = async (workflowId: string) =>
	await jobRepo.find({
		where: { ownerType: 'workflow', ownerId: workflowId },
		order: { id: 'ASC' },
	});

beforeAll(async () => {
	const workflowsConfig = Container.get(WorkflowsConfig);
	const schedulerConfig = Container.get(SchedulerConfig);
	originalUseWorkflowPublicationService = workflowsConfig.useWorkflowPublicationService;
	originalSchedulerEnabled = schedulerConfig.enabled;
	// Both must be on before the registrar is constructed: it caches whether it
	// intercepts schedule triggers at construction time.
	workflowsConfig.useWorkflowPublicationService = true;
	schedulerConfig.enabled = true;

	await testDb.init();

	const nodes: INodeTypeData = {
		'n8n-nodes-base.scheduleTrigger': { type: new ScheduleTrigger(), sourcePath: '' },
	};
	await utils.initNodeTypes(nodes);

	Container.get(InstanceSettings).markAsLeader();

	consumer = Container.get(WorkflowPublicationOutboxConsumer);
	activeWorkflowManager = Container.get(ActiveWorkflowManager);
	activeWorkflowTriggers = Container.get(ActiveWorkflowTriggers);
	outboxRepository = Container.get(WorkflowPublicationOutboxRepository);
	publishedVersions = Container.get(WorkflowPublishedVersionRepository);
	workflowRepository = Container.get(WorkflowRepository);
	jobRepo = Container.get(ScheduledJobRepository);
	owner = Container.get(WorkflowScheduledJobOwner);
});

afterEach(async () => {
	await activeWorkflowManager.removeAll();
	await testDb.truncate([
		'ScheduledTask',
		'ScheduledJob',
		'WorkflowPublishedVersion',
		'WorkflowPublicationOutbox',
		'WorkflowPublishHistory',
		'WorkflowEntity',
		'WorkflowHistory',
	]);
});

afterAll(async () => {
	Container.get(WorkflowsConfig).useWorkflowPublicationService =
		originalUseWorkflowPublicationService;
	Container.get(SchedulerConfig).enabled = originalSchedulerEnabled;
	await testDb.terminate();
});

describe('scheduled job lifecycle across publish, unpublish and republish', () => {
	let projectOwner: Awaited<ReturnType<typeof createOwner>>;

	beforeAll(async () => {
		projectOwner = await createOwner();
	});

	const createWorkflow = async (nodes: INode[]) =>
		await createWorkflowWithHistory({ nodes }, projectOwner);

	it('publishing provisions one live row per rule, owned by the workflow and its node', async () => {
		const trigger = scheduleNode('a');
		const workflow = await createWorkflow([trigger]);

		await publish(workflow);

		const jobs = await jobsOf(workflow.id);
		expect(jobs).toHaveLength(1);
		expect(jobs[0]).toMatchObject({
			ownerType: 'workflow',
			ownerId: workflow.id,
			ownerMemberId: trigger.id,
			enabled: true,
			orphanedAt: null,
		});
		expect(jobs[0].nextRunAt).not.toBeNull();
		expect(jobs[0].name.startsWith(`${workflow.id}:${trigger.id}:`)).toBe(true);
	});

	it('unpublishing deletes every row the workflow owned, with no cascade behind it', async () => {
		const workflow = await createWorkflow([scheduleNode('a')]);
		await publish(workflow);
		expect(await jobsOf(workflow.id)).toHaveLength(1);

		await unpublish(workflow, workflow.versionId);

		expect(await jobsOf(workflow.id)).toEqual([]);
		expect(await publishedVersions.findOneBy({ workflowId: workflow.id })).toBeNull();
	});

	it('republishing after an unpublish provisions the rules again under a fresh row', async () => {
		const trigger = scheduleNode('a');
		const workflow = await createWorkflow([trigger]);
		await publish(workflow);
		const [first] = await jobsOf(workflow.id);
		await unpublish(workflow, workflow.versionId);

		await republish(workflow, [trigger]);

		// One row, under the same name: an unchanged rule converges on one identity
		// however many times the workflow goes round the cycle.
		const jobs = await jobsOf(workflow.id);
		expect(jobs).toHaveLength(1);
		expect(jobs[0].name).toBe(first.name);
		expect(jobs[0]).toMatchObject({ enabled: true, orphanedAt: null });
		expect(jobs[0].nextRunAt).not.toBeNull();
	});

	it('republishing an unchanged trigger keeps its row, and therefore its queued runs', async () => {
		const trigger = scheduleNode('a');
		const workflow = await createWorkflow([trigger]);
		await publish(workflow);
		const [first] = await jobsOf(workflow.id);

		await republish(workflow, [trigger, scheduleNode('b')]);

		const jobs = await jobsOf(workflow.id);
		expect(jobs).toHaveLength(2);
		expect(jobs.find((job) => job.ownerMemberId === trigger.id)?.id).toBe(first.id);
	});

	it('republishing without a trigger node deletes that node’s rows', async () => {
		const kept = scheduleNode('kept');
		const dropped = scheduleNode('dropped');
		const workflow = await createWorkflow([kept, dropped]);
		await publish(workflow);
		expect(await jobsOf(workflow.id)).toHaveLength(2);

		await republish(workflow, [kept]);

		const jobs = await jobsOf(workflow.id);
		expect(jobs).toHaveLength(1);
		expect(jobs[0].ownerMemberId).toBe(kept.id);
		expect(activeWorkflowTriggers.get(workflow.id)?.has(dropped.id)).toBe(false);
	});

	it('changing a trigger node’s id retires the old rows and provisions new ones', async () => {
		const before = scheduleNode('a', uuid());
		const workflow = await createWorkflow([before]);
		await publish(workflow);
		const [original] = await jobsOf(workflow.id);

		const after = { ...before, id: uuid() };
		await republish(workflow, [after]);

		// The name carries the node id, so the rule cannot be matched to the old
		// row: it is a fresh job, and its clock and dedup identity restart with it.
		const jobs = await jobsOf(workflow.id);
		expect(jobs).toHaveLength(1);
		expect(jobs[0].ownerMemberId).toBe(after.id);
		expect(jobs[0].name).not.toBe(original.name);
	});

	it('leaves behind the rows of a member the workflow no longer provisions', async () => {
		// The documented gap: the sweep reconciles owners, not their members. A row
		// no teardown path reached stays put while the workflow is published, since
		// its owner is alive by the only question the resolver answers.
		const trigger = scheduleNode('a');
		const workflow = await createWorkflow([trigger]);
		await publish(workflow);
		const ghost = await jobRepo.save(
			jobRepo.create({
				name: `${workflow.id}:ghost:0`,
				...workflowOwned(workflow.id, 'ghost-node'),
				taskType: 'workflow:schedule-trigger',
				payload: { workflowId: workflow.id, nodeId: 'ghost-node' },
				kind: 'interval',
				intervalSeconds: 3600,
				enabled: true,
				nextRunAt: new Date(),
				maxAttempts: 3,
			}),
		);

		await republish(workflow, [trigger]);

		expect(await jobRepo.findOneBy({ id: ghost.id })).not.toBeNull();
		expect(await owner.findExisting([workflow.id])).toEqual(new Set([workflow.id]));
	});
});
