import {
	createWorkflowWithHistory,
	mockInstance,
	setActiveVersion,
	testDb,
} from '@n8n/backend-test-utils';
import { WorkflowsConfig } from '@n8n/config';
import { WorkflowPublicationOutboxRepository, WorkflowPublishedVersionRepository } from '@n8n/db';
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
import { PublishedWorkflowEnqueuer } from '@/workflows/publication/published-workflow-enqueuer';
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
mockInstance(WorkflowService);
mockInstance(OwnershipService);
mockInstance(ExternalHooks);

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

		await outboxRepository.enqueue(workflow.id, newVersionId);
		const record = await outboxRepository.claimNextPendingRecord();
		expect(record).not.toBeNull();

		await consumer.processRecord(record!);

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

		await outboxRepository.enqueue(workflow.id, workflow.versionId);
		const record = await outboxRepository.claimNextPendingRecord();

		await consumer.processRecord(record!);

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

		await outboxRepository.enqueue(workflow.id, workflow.versionId);
		const record = await outboxRepository.claimNextPendingRecord();

		await consumer.processRecord(record!);

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

	test('startup enqueue + drain registers triggers for active workflows via reconciliation', async () => {
		const owner = await createOwner();

		const trigger = scheduleNode('startup');
		const workflow = await createWorkflowWithHistory({ active: true, nodes: [trigger] }, owner);
		await setActiveVersion(workflow.id, workflow.versionId);
		await publishedVersionRepository.setPublishedVersion(workflow.id, workflow.versionId);

		// Fresh leader startup: the workflow is active and published, but nothing is
		// registered in memory yet.
		expect(activeWorkflowTriggers.get(workflow.id)).toBeUndefined();

		await Container.get(PublishedWorkflowEnqueuer).enqueueActiveWorkflows();
		consumer.startPolling();
		await consumer.drainPending();
		consumer.stopPolling();

		// The reconciliation path registered the missing trigger and completed the record.
		expect(activeWorkflowTriggers.get(workflow.id)?.has(trigger.id)).toBe(true);
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

		await outboxRepository.enqueue(workflow.id, newVersionId);
		const record = await outboxRepository.claimNextPendingRecord();

		await consumer.processRecord(record!);

		expect(activeWorkflowTriggers.get(workflow.id)?.has(trigger.id)).toBe(true);
		const published = await publishedVersionRepository.getPublishedVersionWithRelations(
			workflow.id,
		);
		expect(published?.publishedVersionId).toBe(newVersionId);
		expect(await outboxRepository.claimNextPendingRecord()).toBeNull();
	});
});

describe('leader stepdown (integration)', () => {
	let lifecycleLock: WorkflowPublicationLifecycleLock;
	let deactivator: PublishedWorkflowTriggerDeactivator;

	beforeAll(() => {
		lifecycleLock = Container.get(WorkflowPublicationLifecycleLock);
		deactivator = Container.get(PublishedWorkflowTriggerDeactivator);
	});

	test('teardown waits for an in-flight record before deactivating triggers', async () => {
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

		const teardown = deactivator.deactivateAllNonWebhookTriggers();
		await new Promise((resolve) => setImmediate(resolve));

		// Teardown is blocked on the lock, so the trigger is still running.
		expect(activeWorkflowTriggers.isActive(workflow.id)).toBe(true);

		releaseHolder();
		await holder;
		await teardown;

		// Once the in-flight record released the lock, teardown deactivated it.
		expect(activeWorkflowTriggers.isActive(workflow.id)).toBe(false);
	});
});
