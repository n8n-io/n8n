import {
	createWorkflowWithHistory,
	mockInstance,
	setActiveVersion,
	testDb,
} from '@n8n/backend-test-utils';
import { WorkflowsConfig } from '@n8n/config';
import {
	WorkflowPublicationOutboxRepository,
	WorkflowPublicationTriggerStatusRepository,
	WorkflowPublishedVersionRepository,
	WorkflowRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { ActiveWorkflowTriggers, ExternalSecretsProxy, InstanceSettings } from 'n8n-core';
import { ScheduleTrigger } from 'n8n-nodes-base/nodes/Schedule/ScheduleTrigger.node';
import type { INode, INodeTypeData } from 'n8n-workflow';

import { ActiveExecutions } from '@/active-executions';
import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { ExecutionService } from '@/executions/execution.service';
import { ExternalHooks } from '@/external-hooks';
import { Push } from '@/push';
import { OwnershipService } from '@/services/ownership.service';
import { WorkflowPublicationOutboxConsumer } from '@/workflows/publication/workflow-publication-outbox-consumer';
import { WorkflowPublicationReconciler } from '@/workflows/publication/workflow-publication-reconciler.service';
import { WorkflowService } from '@/workflows/workflow.service';

import { createOwner } from '../shared/db/users';
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

let reconciler: WorkflowPublicationReconciler;
let consumer: WorkflowPublicationOutboxConsumer;
let activeWorkflowTriggers: ActiveWorkflowTriggers;
let outboxRepository: WorkflowPublicationOutboxRepository;
let publishedVersionRepository: WorkflowPublishedVersionRepository;
let triggerStatusRepository: WorkflowPublicationTriggerStatusRepository;
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

	reconciler = Container.get(WorkflowPublicationReconciler);
	consumer = Container.get(WorkflowPublicationOutboxConsumer);
	activeWorkflowTriggers = Container.get(ActiveWorkflowTriggers);
	outboxRepository = Container.get(WorkflowPublicationOutboxRepository);
	publishedVersionRepository = Container.get(WorkflowPublishedVersionRepository);
	triggerStatusRepository = Container.get(WorkflowPublicationTriggerStatusRepository);
});

afterEach(async () => {
	consumer.stopPolling();
	await Container.get(ActiveWorkflowManager).removeAll();
	// Delete WorkflowPublishedVersion first: it references WorkflowHistory with
	// onDelete RESTRICT, and deleting WorkflowEntity cascades into WorkflowHistory.
	await testDb.truncate([
		'WorkflowPublishedVersion',
		'WorkflowPublicationOutbox',
		'WorkflowPublicationTriggerStatus',
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

describe('WorkflowPublicationReconciler (integration)', () => {
	test('recovers a workflow whose in-memory triggers went missing after publication', async () => {
		const owner = await createOwner();

		const trigger = scheduleNode('lost');
		const workflow = await createWorkflowWithHistory({ active: true, nodes: [trigger] }, owner);
		await setActiveVersion(workflow.id, workflow.versionId);

		// Publish through the real pipeline so the trigger registers in memory and
		// the reporter persists the `activated` trigger-status rows with kinds.
		await outboxRepository.enqueue(workflow.id, workflow.versionId);
		const record = await outboxRepository.claimNextPendingRecord();
		await consumer.processRecord(record!);
		expect(activeWorkflowTriggers.get(workflow.id)?.has(trigger.id)).toBe(true);

		// The leader-transition race: a demoted main consumed the outbox record
		// (terminal, nothing pending) and then tore the triggers down, so nothing
		// is registered and no record is left to reprocess.
		await activeWorkflowTriggers.remove(workflow.id);
		expect(activeWorkflowTriggers.get(workflow.id)).toBeUndefined();
		expect(await outboxRepository.findInFlightByWorkflowId(workflow.id)).toBeNull();

		// One reconcile pass detects the deficit, re-enqueues, and drains: the
		// applier re-registers the missing trigger at the unchanged version.
		await reconciler.reconcile();

		expect(activeWorkflowTriggers.get(workflow.id)?.has(trigger.id)).toBe(true);
		const published = await publishedVersionRepository.getPublishedVersionWithRelations(
			workflow.id,
		);
		expect(published?.publishedVersionId).toBe(workflow.versionId);
		expect(await outboxRepository.claimNextPendingRecord()).toBeNull();
	});

	test('clears orphaned trigger-status rows of an unpublished workflow by re-running the unpublish', async () => {
		const owner = await createOwner();

		const trigger = scheduleNode('orphaned');
		const workflow = await createWorkflowWithHistory({ active: true, nodes: [trigger] }, owner);
		await setActiveVersion(workflow.id, workflow.versionId);

		// Publish through the real pipeline so the reporter persists the
		// `activated` trigger-status rows.
		await outboxRepository.enqueue(workflow.id, workflow.versionId);
		const record = await outboxRepository.claimNextPendingRecord();
		await consumer.processRecord(record!);

		// An unpublish interrupted after removing the published-version mapping
		// but before the reporter cleared the trigger-status rows, with its outbox
		// record already terminal: triggers down, mapping gone, workflow
		// unpublished — only the `activated` rows remain, claiming a trigger that
		// no longer exists.
		await Container.get(WorkflowRepository).update(workflow.id, { activeVersionId: null });
		await activeWorkflowTriggers.remove(workflow.id);
		await publishedVersionRepository.removePublishedVersion(workflow.id);
		expect(await triggerStatusRepository.findByWorkflowId(workflow.id)).toHaveLength(1);

		// One reconcile pass surfaces the orphaned rows as a deficit, enqueues the
		// workflow, and the drained unpublish clears the rows and completes.
		await reconciler.reconcile();

		expect(await triggerStatusRepository.findByWorkflowId(workflow.id)).toHaveLength(0);
		expect(activeWorkflowTriggers.get(workflow.id)).toBeUndefined();
		expect(await outboxRepository.claimNextPendingRecord()).toBeNull();
	});

	test('tears down ghost triggers left by an unpublish another main consumed', async () => {
		const owner = await createOwner();

		const trigger = scheduleNode('ghost');
		const workflow = await createWorkflowWithHistory({ active: true, nodes: [trigger] }, owner);
		await setActiveVersion(workflow.id, workflow.versionId);

		await outboxRepository.enqueue(workflow.id, workflow.versionId);
		const record = await outboxRepository.claimNextPendingRecord();
		await consumer.processRecord(record!);
		expect(activeWorkflowTriggers.get(workflow.id)?.has(trigger.id)).toBe(true);

		// A demoted main consumed the unpublish record: workflow deactivated,
		// mapping removed, trigger-status rows cleared, record completed — but it
		// tore down the triggers in *its* registry. This leader still has them
		// registered and firing, and no record is left to fix that.
		await Container.get(WorkflowRepository).update(workflow.id, { activeVersionId: null });
		await publishedVersionRepository.removePublishedVersion(workflow.id);
		await triggerStatusRepository.delete({ workflowId: workflow.id });

		await reconciler.reconcile();

		expect(activeWorkflowTriggers.get(workflow.id)).toBeUndefined();
		// Repair is local — no outbox round-trip was needed.
		expect(await outboxRepository.claimNextPendingRecord()).toBeNull();
	});

	test('heals ghost triggers and orphaned trigger-status rows together in one pass', async () => {
		const owner = await createOwner();

		const trigger = scheduleNode('ghost-orphan');
		const workflow = await createWorkflowWithHistory({ active: true, nodes: [trigger] }, owner);
		await setActiveVersion(workflow.id, workflow.versionId);

		await outboxRepository.enqueue(workflow.id, workflow.versionId);
		const record = await outboxRepository.claimNextPendingRecord();
		await consumer.processRecord(record!);

		// A re-leased unpublish torn between two mains: mapping removed and the
		// record completed elsewhere, but this leader's registry AND the
		// trigger-status rows were left behind.
		await Container.get(WorkflowRepository).update(workflow.id, { activeVersionId: null });
		await publishedVersionRepository.removePublishedVersion(workflow.id);

		// One pass converges: surplus teardown first, which lets the leftover rows
		// read as missing, enqueue, and clear through the unpublish path.
		await reconciler.reconcile();

		expect(activeWorkflowTriggers.get(workflow.id)).toBeUndefined();
		expect(await triggerStatusRepository.findByWorkflowId(workflow.id)).toHaveLength(0);
		expect(await outboxRepository.claimNextPendingRecord()).toBeNull();
	});

	test('leaves triggers of a workflow with an in-flight unpublish for that record to tear down', async () => {
		const owner = await createOwner();

		const trigger = scheduleNode('in-flight');
		const workflow = await createWorkflowWithHistory({ active: true, nodes: [trigger] }, owner);
		await setActiveVersion(workflow.id, workflow.versionId);

		await outboxRepository.enqueue(workflow.id, workflow.versionId);
		const record = await outboxRepository.claimNextPendingRecord();
		await consumer.processRecord(record!);

		// Mid-unpublish: activeVersionId already cleared, pending record owns the
		// teardown. Reconciliation must not race it.
		await Container.get(WorkflowRepository).update(workflow.id, { activeVersionId: null });
		await outboxRepository.enqueue(workflow.id, workflow.versionId);

		await reconciler.reconcile();

		expect(activeWorkflowTriggers.get(workflow.id)?.has(trigger.id)).toBe(true);
	});

	test('a pass with nothing missing enqueues no work', async () => {
		const owner = await createOwner();

		const trigger = scheduleNode('healthy');
		const workflow = await createWorkflowWithHistory({ active: true, nodes: [trigger] }, owner);
		await setActiveVersion(workflow.id, workflow.versionId);

		await outboxRepository.enqueue(workflow.id, workflow.versionId);
		const record = await outboxRepository.claimNextPendingRecord();
		await consumer.processRecord(record!);
		const registeredBefore = activeWorkflowTriggers.get(workflow.id)?.get(trigger.id);
		expect(registeredBefore).toBeDefined();

		await reconciler.reconcile();

		// Same response object: the trigger was left untouched, not re-registered.
		expect(activeWorkflowTriggers.get(workflow.id)?.get(trigger.id)).toBe(registeredBefore);
		expect(await outboxRepository.claimNextPendingRecord()).toBeNull();
	});
});
