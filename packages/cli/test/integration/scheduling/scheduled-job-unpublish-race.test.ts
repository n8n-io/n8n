import { createWorkflowWithHistory, mockInstance, testDb } from '@n8n/backend-test-utils';
import { SchedulerConfig, WorkflowsConfig } from '@n8n/config';
import type { User, WorkflowEntity } from '@n8n/db';
import { ScheduledJobRepository, WorkflowPublicationOutboxRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { ExternalSecretsProxy, InstanceSettings } from 'n8n-core';
import { ScheduleTrigger } from 'n8n-nodes-base/nodes/Schedule/ScheduleTrigger.node';
import type { INode, INodeType, INodeTypeData, INodeTypeDescription } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { ActiveExecutions } from '@/active-executions';
import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { ExecutionService } from '@/executions/execution.service';
import { ExternalHooks } from '@/external-hooks';
import { Push } from '@/push';
import { PollJobProvider } from '@/scheduling/poll-trigger-node/poll-job-provider';
import { Telemetry } from '@/telemetry';
import { WorkflowPublicationNotifier } from '@/workflows/publication/workflow-publication-notifier';
import { WorkflowPublicationOutboxConsumer } from '@/workflows/publication/workflow-publication-outbox-consumer';
import { WorkflowService } from '@/workflows/workflow.service';

import { createOwner } from '../shared/db/users';
import { createWorkflowHistoryItem } from '../shared/db/workflow-history';
import * as utils from '../shared/utils/';

/**
 * An unpublish followed by a publish before the leader drains the outbox, as
 * `import:workflow` and a source-control pull do from a process that is not the
 * leader. The notifier is mocked so the outbox drains only when a test says so.
 */
mockInstance(ActiveExecutions);
mockInstance(Push);
mockInstance(ExternalSecretsProxy);
mockInstance(ExecutionService);
mockInstance(ExternalHooks);
mockInstance(Telemetry);
mockInstance(WorkflowPublicationNotifier);

const POLL_NODE_TYPE = 'n8n-nodes-base.unpublishRacePollTrigger';

class PollFixture implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Poll Fixture',
		name: 'unpublishRacePollTrigger',
		group: ['trigger'],
		version: 1,
		description: 'Polls a source that never has new items',
		defaults: { name: 'Poll Fixture' },
		polling: true,
		inputs: [],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Poll Times',
				name: 'pollTimes',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				default: {},
				options: [
					{
						name: 'item',
						displayName: 'Item',
						values: [
							{
								displayName: 'Mode',
								name: 'mode',
								type: 'options',
								options: [{ name: 'Every Hour', value: 'everyHour' }],
								default: 'everyHour',
							},
							{ displayName: 'Minute', name: 'minute', type: 'number', default: 0 },
						],
					},
				],
			},
		],
	};

	async poll(): Promise<null> {
		return null;
	}
}

const scheduleNode = (notes: string): INode => ({
	id: 'schedule-node',
	name: 'Schedule',
	notes,
	type: 'n8n-nodes-base.scheduleTrigger',
	typeVersion: 1,
	position: [0, 0],
	parameters: { rule: { interval: [{ field: 'minutes', minutesInterval: 5 }] } },
});

const pollNode = (notes: string): INode => ({
	id: 'poll-node',
	name: 'Poll',
	notes,
	type: POLL_NODE_TYPE,
	typeVersion: 1,
	position: [0, 0],
	parameters: { pollTimes: { item: [{ mode: 'everyHour', minute: 0 }] } },
});

const abortSignal = new AbortController().signal;

let workflowService: WorkflowService;
let consumer: WorkflowPublicationOutboxConsumer;
let outboxRepository: WorkflowPublicationOutboxRepository;
let jobRepo: ScheduledJobRepository;
let owner: User;
let originalUseWorkflowPublicationService: boolean;
let originalSchedulerEnabled: boolean;
let originalEnabledForPollTriggers: boolean;

const drainNextRecord = async () => {
	const record = await outboxRepository.claimNextPendingRecord();
	expect(record).not.toBeNull();
	await consumer.processRecord(record!, abortSignal);
};

const jobIdsOf = async (workflowId: string) =>
	(
		await jobRepo.find({
			where: { ownerType: 'workflow', ownerId: workflowId },
			order: { id: 'ASC' },
		})
	).map((job) => job.id);

/** Publishes `workflow`'s first version and lets the leader apply it. */
const publishFirstVersion = async (workflow: WorkflowEntity) => {
	await workflowService.activateWorkflow(owner, workflow.id, { versionId: workflow.versionId });
	await drainNextRecord();
};

/** Unpublishes, then publishes a version carrying `nodes`, with no drain between the two. */
const unpublishThenPublish = async (workflow: WorkflowEntity, nodes: INode[]) => {
	await workflowService.deactivateWorkflow(owner, workflow.id);
	const versionId = uuid();
	await createWorkflowHistoryItem(workflow.id, { versionId, nodes, connections: {} });
	await workflowService.activateWorkflow(owner, workflow.id, { versionId });
};

beforeAll(async () => {
	const workflowsConfig = Container.get(WorkflowsConfig);
	const schedulerConfig = Container.get(SchedulerConfig);
	originalUseWorkflowPublicationService = workflowsConfig.useWorkflowPublicationService;
	originalSchedulerEnabled = schedulerConfig.enabled;
	originalEnabledForPollTriggers = schedulerConfig.enabledForPollTriggers;
	// All three must be on before the registrars are constructed: they cache
	// whether they intercept trigger nodes at construction time.
	workflowsConfig.useWorkflowPublicationService = true;
	schedulerConfig.enabled = true;
	schedulerConfig.enabledForPollTriggers = true;

	await testDb.init();

	const nodes: INodeTypeData = {
		'n8n-nodes-base.scheduleTrigger': { type: new ScheduleTrigger(), sourcePath: '' },
		[POLL_NODE_TYPE]: { type: new PollFixture(), sourcePath: '' },
	};
	await utils.initNodeTypes(nodes);

	Container.get(PollJobProvider).init();
	Container.get(InstanceSettings).markAsLeader();

	workflowService = Container.get(WorkflowService);
	consumer = Container.get(WorkflowPublicationOutboxConsumer);
	outboxRepository = Container.get(WorkflowPublicationOutboxRepository);
	jobRepo = Container.get(ScheduledJobRepository);
	owner = await createOwner();
});

afterEach(async () => {
	await Container.get(ActiveWorkflowManager).removeAll();
	await testDb.truncate([
		'PollerState',
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
	const schedulerConfig = Container.get(SchedulerConfig);
	schedulerConfig.enabled = originalSchedulerEnabled;
	schedulerConfig.enabledForPollTriggers = originalEnabledForPollTriggers;
	await testDb.terminate();
});

describe('durable trigger jobs across an unpublish the leader has not drained', () => {
	it('no schedule trigger rows remain once an unpublish settles', async () => {
		const workflow = await createWorkflowWithHistory({ nodes: [scheduleNode('v1')] }, owner);
		await publishFirstVersion(workflow);

		await workflowService.deactivateWorkflow(owner, workflow.id);
		await drainNextRecord();

		expect(await jobIdsOf(workflow.id)).toEqual([]);
	});

	it('a publish that overwrites a pending unpublish keeps the schedule trigger job', async () => {
		const workflow = await createWorkflowWithHistory({ nodes: [scheduleNode('v1')] }, owner);
		await publishFirstVersion(workflow);
		const jobIdsAfterFirstPublish = await jobIdsOf(workflow.id);
		expect(jobIdsAfterFirstPublish).toHaveLength(1);

		await unpublishThenPublish(workflow, [scheduleNode('v2')]);
		await drainNextRecord();

		expect(await jobIdsOf(workflow.id)).toEqual(jobIdsAfterFirstPublish);
	});

	it('a publish that overwrites a pending unpublish keeps the poll trigger job', async () => {
		const workflow = await createWorkflowWithHistory({ nodes: [pollNode('v1')] }, owner);
		await publishFirstVersion(workflow);
		const jobIdsAfterFirstPublish = await jobIdsOf(workflow.id);
		expect(jobIdsAfterFirstPublish).toHaveLength(1);

		await unpublishThenPublish(workflow, [pollNode('v2')]);
		await drainNextRecord();

		expect(await jobIdsOf(workflow.id)).toEqual(jobIdsAfterFirstPublish);
	});
});
