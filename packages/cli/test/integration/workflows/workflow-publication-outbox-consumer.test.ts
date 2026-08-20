import {
	createWorkflowWithHistory,
	mockInstance,
	setActiveVersion,
	testDb,
} from '@n8n/backend-test-utils';
import { WorkflowsConfig } from '@n8n/config';
import {
	WorkflowHistoryRepository,
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
import { OwnershipService } from '@/services/ownership.service';
import { Telemetry } from '@/telemetry';
import { PublishedWorkflowTriggerDeactivator } from '@/workflows/publication/published-workflow-trigger-deactivator';
import { WorkflowPublicationLifecycleLock } from '@/workflows/publication/workflow-publication-lifecycle-lock';
import { WorkflowPublicationOutboxConsumer } from '@/workflows/publication/workflow-publication-outbox-consumer';
import { WorkflowService } from '@/workflows/workflow.service';

import { createOwner } from '../shared/db/users';
import { createWorkflowHistoryItem } from '../shared/db/workflow-history';
import * as utils from '../shared/utils/';

// Peripheral services with side effects we don't exercise here; the webhook
// service is left real so non-webhook (schedule) triggers enumerate to zero
// webhooks correctly.
mockInstance(ActiveExecutions);
mockInstance(Push);
mockInstance(ExternalSecretsProxy);
mockInstance(ExecutionService);
const workflowService = mockInstance(WorkflowService);
mockInstance(OwnershipService);
mockInstance(ExternalHooks);
mockInstance(Telemetry);

const abortSignal = new AbortController().signal;

let consumer: WorkflowPublicationOutboxConsumer;
let activeWorkflowManager: ActiveWorkflowManager;
let activeWorkflowTriggers: ActiveWorkflowTriggers;
let outboxRepository: WorkflowPublicationOutboxRepository;
let publishedVersionRepository: WorkflowPublishedVersionRepository;
let originalUseWorkflowPublicationService: boolean;

const scheduleNode = (suffix: string): INode => ({
	id: `node-${suffix}`,
	name: `Schedule ${suffix}`,
	type: 'n8n-nodes-base.scheduleTrigger',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
});

beforeAll(async () => {
	await testDb.init();

	const nodes: INodeTypeData = {
		'n8n-nodes-base.scheduleTrigger': { type: new ScheduleTrigger(), sourcePath: '' },
	};
	await utils.initNodeTypes(nodes);

	Container.get(InstanceSettings).markAsLeader();
	const workflowsConfig = Container.get(WorkflowsConfig);
	originalUseWorkflowPublicationService = workflowsConfig.useWorkflowPublicationService;
	workflowsConfig.useWorkflowPublicationService = true;

	consumer = Container.get(WorkflowPublicationOutboxConsumer);
	activeWorkflowManager = Container.get(ActiveWorkflowManager);
	activeWorkflowTriggers = Container.get(ActiveWorkflowTriggers);
	outboxRepository = Container.get(WorkflowPublicationOutboxRepository);
	publishedVersionRepository = Container.get(WorkflowPublishedVersionRepository);
});

afterEach(async () => {
	await activeWorkflowManager.removeAll();
	// Delete WorkflowPublishedVersion first: it references WorkflowHistory with
	// onDelete RESTRICT, and deleting WorkflowEntity cascades into WorkflowHistory.
	await testDb.truncate([
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
	await testDb.terminate();
});

describe('WorkflowPublicationOutboxConsumer (integration)', () => {
	test('applies only the trigger diff, leaving the unchanged trigger registered', async () => {
		const owner = await createOwner();

		const unchanged = scheduleNode('unchanged');
		const removed = scheduleNode('removed');
		const added = scheduleNode('added');

		// Currently active version runs `unchanged` + `removed`.
		const workflow = await createWorkflowWithHistory(
			{ active: true, nodes: [unchanged, removed] },
			owner,
		);
		await setActiveVersion(workflow.id, workflow.versionId);
		await publishedVersionRepository.setPublishedVersion(workflow.id, workflow.versionId);
		await activeWorkflowManager.add(workflow.id, 'activate');

		expect(activeWorkflowTriggers.get(workflow.id)?.has(unchanged.id)).toBe(true);
		expect(activeWorkflowTriggers.get(workflow.id)?.has(removed.id)).toBe(true);

		// New version drops `removed`, keeps `unchanged`, adds `added`.
		const newVersionId = uuid();
		await createWorkflowHistoryItem(workflow.id, {
			versionId: newVersionId,
			nodes: [unchanged, added],
			connections: {},
		});

		await outboxRepository.enqueue(workflow.id, newVersionId, 'publish');
		const record = await outboxRepository.claimNextPendingRecord();
		expect(record).not.toBeNull();

		await consumer.processRecord(record!, abortSignal);

		// Surgical in-memory result: unchanged kept, removed gone, added registered.
		const state = activeWorkflowTriggers.get(workflow.id);
		expect(state?.has(unchanged.id)).toBe(true);
		expect(state?.has(removed.id)).toBe(false);
		expect(state?.has(added.id)).toBe(true);

		// Canonical published version advanced and the record completed.
		const published = await publishedVersionRepository.getPublishedVersionWithRelations(
			workflow.id,
		);
		expect(published?.publishedVersionId).toBe(newVersionId);
		expect(await outboxRepository.claimNextPendingRecord()).toBeNull();
	});

	test('re-registers only the non-webhook triggers missing from memory after a crash mid-add', async () => {
		const owner = await createOwner();

		const present = scheduleNode('present');
		const missing = scheduleNode('missing');

		const workflow = await createWorkflowWithHistory(
			{ active: true, nodes: [present, missing] },
			owner,
		);
		await setActiveVersion(workflow.id, workflow.versionId);
		await publishedVersionRepository.setPublishedVersion(workflow.id, workflow.versionId);
		await activeWorkflowManager.add(workflow.id, 'activate');

		// Simulate a crash mid-add that left `missing` unregistered while `present`
		// stayed live, then re-enqueue the SAME version (startup/retry/recovery).
		await activeWorkflowTriggers.removeTriggers(workflow.id, new Set([missing.id]));
		const presentResponse = activeWorkflowTriggers.get(workflow.id)?.get(present.id);
		expect(presentResponse).toBeDefined();
		expect(activeWorkflowTriggers.get(workflow.id)?.has(missing.id)).toBe(false);

		await outboxRepository.enqueue(workflow.id, workflow.versionId, 'publish');
		const record = await outboxRepository.claimNextPendingRecord();

		await consumer.processRecord(record!, abortSignal);

		// `missing` got re-registered; `present` was left untouched (same response object).
		const state = activeWorkflowTriggers.get(workflow.id);
		expect(state?.has(missing.id)).toBe(true);
		expect(state?.get(present.id)).toBe(presentResponse);

		const row = await outboxRepository.findOneBy({ id: record!.id });
		expect(row?.status).toBe('completed');
		expect(await outboxRepository.claimNextPendingRecord()).toBeNull();
	});

	test('re-enqueueing an already fully-published version is a no-op marked completed', async () => {
		const owner = await createOwner();

		const trigger = scheduleNode('only');
		const workflow = await createWorkflowWithHistory({ active: true, nodes: [trigger] }, owner);
		await setActiveVersion(workflow.id, workflow.versionId);
		await publishedVersionRepository.setPublishedVersion(workflow.id, workflow.versionId);
		await activeWorkflowManager.add(workflow.id, 'activate');

		const responseBefore = activeWorkflowTriggers.get(workflow.id)?.get(trigger.id);
		expect(responseBefore).toBeDefined();

		await outboxRepository.enqueue(workflow.id, workflow.versionId, 'publish');
		const record = await outboxRepository.claimNextPendingRecord();

		await consumer.processRecord(record!, abortSignal);

		// Nothing re-registered (same response object) and the version is unchanged.
		expect(activeWorkflowTriggers.get(workflow.id)?.get(trigger.id)).toBe(responseBefore);
		const published = await publishedVersionRepository.getPublishedVersionWithRelations(
			workflow.id,
		);
		expect(published?.publishedVersionId).toBe(workflow.versionId);

		const row = await outboxRepository.findOneBy({ id: record!.id });
		expect(row?.status).toBe('completed');
		expect(await outboxRepository.claimNextPendingRecord()).toBeNull();
	});

	test('does no trigger work when only non-trigger content changed', async () => {
		const owner = await createOwner();

		const trigger = scheduleNode('only');
		const workflow = await createWorkflowWithHistory({ active: true, nodes: [trigger] }, owner);
		await setActiveVersion(workflow.id, workflow.versionId);
		await publishedVersionRepository.setPublishedVersion(workflow.id, workflow.versionId);
		await activeWorkflowManager.add(workflow.id, 'activate');

		// New version keeps the same trigger (a non-trigger node could have changed).
		const newVersionId = uuid();
		await createWorkflowHistoryItem(workflow.id, {
			versionId: newVersionId,
			nodes: [trigger],
			connections: {},
		});

		await outboxRepository.enqueue(workflow.id, newVersionId, 'publish');
		const record = await outboxRepository.claimNextPendingRecord();

		await consumer.processRecord(record!, abortSignal);

		expect(activeWorkflowTriggers.get(workflow.id)?.has(trigger.id)).toBe(true);
		const published = await publishedVersionRepository.getPublishedVersionWithRelations(
			workflow.id,
		);
		expect(published?.publishedVersionId).toBe(newVersionId);
		expect(await outboxRepository.claimNextPendingRecord()).toBeNull();
	});

	test('publishes a healed version for duplicate trigger node ids, then activates it', async () => {
		const owner = await createOwner();

		const nodeA = { ...scheduleNode('a'), id: 'shared' };
		const nodeB = { ...scheduleNode('b'), id: 'shared' };
		const workflow = await createWorkflowWithHistory(
			{ active: true, nodes: [nodeA, nodeB] },
			owner,
		);
		await setActiveVersion(workflow.id, workflow.versionId);

		// The real publishAsSystem is covered by its own integration suite; this
		// stand-in performs its minimal effect (system-authored version row,
		// advanced active version, enqueued record) against the real repositories,
		// so the consumer loop under test runs end to end.
		workflowService.publishAsSystem.mockReset().mockImplementation(async (id, versionData) => {
			const versionId = uuid();
			await Container.get(WorkflowHistoryRepository).insert({
				versionId,
				workflowId: id,
				nodes: versionData.nodes,
				connections: versionData.connections,
				nodeGroups: versionData.nodeGroups ?? [],
				authors: 'n8n',
				autosaved: false,
			});
			await Container.get(WorkflowRepository).update({ id }, { activeVersionId: versionId });
			await outboxRepository.enqueue(id, versionId, 'publish');
			return { published: true, versionId };
		});

		await outboxRepository.enqueue(workflow.id, workflow.versionId, 'publish');
		const brokenRecord = await outboxRepository.claimNextPendingRecord();
		await consumer.processRecord(brokenRecord!, abortSignal);

		// The broken version was never applied: nothing registered, published
		// version not advanced, but a healed record is waiting.
		expect(activeWorkflowTriggers.get(workflow.id)?.has('shared') ?? false).toBe(false);
		expect(
			await publishedVersionRepository.getPublishedVersionWithRelations(workflow.id),
		).toBeNull();

		const healedRecord = await outboxRepository.claimNextPendingRecord();
		expect(healedRecord).not.toBeNull();
		await consumer.processRecord(healedRecord!, abortSignal);

		// The healed version is published and its triggers run under unique ids,
		// with the contested id surviving on one of them.
		const published = await publishedVersionRepository.getPublishedVersionWithRelations(
			workflow.id,
		);
		const healedIds = published!.publishedVersion.nodes.map((node) => node.id);
		expect(new Set(healedIds).size).toBe(2);
		expect(healedIds).toContain('shared');
		const state = activeWorkflowTriggers.get(workflow.id);
		for (const id of healedIds) {
			expect(state?.has(id)).toBe(true);
		}

		// Healing converged: one system publish, both records completed, nothing pending.
		expect(workflowService.publishAsSystem).toHaveBeenCalledTimes(1);
		expect(await outboxRepository.claimNextPendingRecord()).toBeNull();
		const records = await outboxRepository.findBy({ workflowId: workflow.id });
		expect(records.map(({ status }) => status).sort()).toEqual(['completed', 'completed']);
	});
});

describe('leader stepdown (integration)', () => {
	let lifecycleLock: WorkflowPublicationLifecycleLock;
	let deactivator: PublishedWorkflowTriggerDeactivator;

	beforeAll(() => {
		lifecycleLock = Container.get(WorkflowPublicationLifecycleLock);
		deactivator = Container.get(PublishedWorkflowTriggerDeactivator);
	});

	test('teardown skips a workflow with an in-flight record; the sweep converges after release', async () => {
		const owner = await createOwner();
		const trigger = scheduleNode('running');
		const workflow = await createWorkflowWithHistory({ active: true, nodes: [trigger] }, owner);
		await setActiveVersion(workflow.id, workflow.versionId);
		await publishedVersionRepository.setPublishedVersion(workflow.id, workflow.versionId);
		await activeWorkflowManager.add(workflow.id, 'activate');
		expect(activeWorkflowTriggers.isActive(workflow.id)).toBe(true);

		// Hold the workflow's lock to stand in for an in-flight record being processed.
		let releaseHolder!: () => void;
		const holder = lifecycleLock.runExclusive(
			workflow.id,
			async () =>
				await new Promise<void>((resolve) => {
					releaseHolder = resolve;
				}),
		);

		// The instance was demoted; the stepdown teardown must neither wait on the
		// held lock nor tear the workflow down without it — it skips.
		Container.get(InstanceSettings).markAsFollower();
		await deactivator.deactivateAllNonWebhookTriggers();

		expect(activeWorkflowTriggers.isActive(workflow.id)).toBe(true);

		releaseHolder();
		await holder;

		// The follower sweep converges once the lock is released.
		const removed = await deactivator.sweepGhostTriggers();

		expect(removed).toBe(1);
		expect(activeWorkflowTriggers.isActive(workflow.id)).toBe(false);
	});
});
