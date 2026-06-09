import {
	createWorkflowWithHistory,
	mockInstance,
	setActiveVersion,
	testDb,
} from '@n8n/backend-test-utils';
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
import { WorkflowPublicationOutboxConsumer } from '@/workflows/workflow-publication-outbox-consumer';
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
	await testDb.terminate();
});

describe('WorkflowPublicationOutboxConsumer (integration)', () => {
	test('applies only the trigger diff, leaving the unchanged trigger registered', async () => {
		const owner = await createOwner();

		const unchanged = scheduleNode('unchanged');
		const removed = scheduleNode('removed');
		const added = scheduleNode('added');

		// Currently published version runs `unchanged` + `removed`.
		const workflow = await createWorkflowWithHistory(
			{ active: true, nodes: [unchanged, removed] },
			owner,
		);
		const oldVersionId = workflow.versionId;
		await setActiveVersion(workflow.id, oldVersionId);
		await publishedVersionRepository.setPublishedVersion(workflow.id, oldVersionId);
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
		await setActiveVersion(workflow.id, newVersionId);

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

	test('does no trigger work when only non-trigger content changed', async () => {
		const owner = await createOwner();

		const trigger = scheduleNode('only');
		const workflow = await createWorkflowWithHistory({ active: true, nodes: [trigger] }, owner);
		const oldVersionId = workflow.versionId;
		await setActiveVersion(workflow.id, oldVersionId);
		await publishedVersionRepository.setPublishedVersion(workflow.id, oldVersionId);
		await activeWorkflowManager.add(workflow.id, 'activate');

		// New version keeps the same trigger (a non-trigger node could have changed).
		const newVersionId = uuid();
		await createWorkflowHistoryItem(workflow.id, {
			versionId: newVersionId,
			nodes: [trigger],
			connections: {},
		});
		await setActiveVersion(workflow.id, newVersionId);

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
