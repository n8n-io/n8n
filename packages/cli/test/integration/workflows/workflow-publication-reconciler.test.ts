import {
	createWorkflowHistory,
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
import { ManualTrigger } from 'n8n-nodes-base/nodes/ManualTrigger/ManualTrigger.node';
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

const manualTriggerNode = (suffix: string): INode => ({
	id: `node-${suffix}`,
	name: `Manual ${suffix}`,
	type: 'n8n-nodes-base.manualTrigger',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
});

beforeAll(async () => {
	await testDb.init();

	const nodes: INodeTypeData = {
		'n8n-nodes-base.scheduleTrigger': { type: new ScheduleTrigger(), sourcePath: '' },
		'n8n-nodes-base.manualTrigger': { type: new ManualTrigger(), sourcePath: '' },
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

	test('heals a published-version mapping rolled back to an older version', async () => {
		const owner = await createOwner();

		const trigger = scheduleNode('skew');
		const workflow = await createWorkflowWithHistory({ active: true, nodes: [trigger] }, owner);
		await setActiveVersion(workflow.id, workflow.versionId);

		await outboxRepository.enqueue(workflow.id, workflow.versionId);
		await consumer.processRecord((await outboxRepository.claimNextPendingRecord())!);

		// A parameter-only newer version is published: the trigger node set is
		// identical, so no node-id diff can distinguish the two versions.
		const newVersionId = 'version-2-param-only';
		await createWorkflowHistory(workflow, owner, undefined, {
			versionId: newVersionId,
			nodes: [{ ...trigger, parameters: { rule: { interval: [{ field: 'hours' }] } } }],
		});
		await setActiveVersion(workflow.id, newVersionId);
		await outboxRepository.enqueue(workflow.id, newVersionId);
		await consumer.processRecord((await outboxRepository.claimNextPendingRecord())!);
		expect(await publishedVersionRepository.getPublishedVersionId(workflow.id)).toBe(newVersionId);

		// A stalled processor (zombie writer) rolls the mapping back to the old
		// version after its record already resolved: no in-flight record remains,
		// and the running trigger's node id still matches the desired one.
		await publishedVersionRepository.setPublishedVersion(workflow.id, workflow.versionId);

		await reconciler.reconcile();

		// The skew check enqueued a third record and the drain converged the
		// mapping back to the active version.
		expect(await publishedVersionRepository.getPublishedVersionId(workflow.id)).toBe(newVersionId);
		expect(await outboxRepository.countBy({ workflowId: workflow.id })).toBe(3);
		expect(await outboxRepository.claimNextPendingRecord()).toBeNull();
	});

	test('removes a published-version mapping left behind by a missed unpublish', async () => {
		const owner = await createOwner();

		const trigger = scheduleNode('missed-unpublish');
		const workflow = await createWorkflowWithHistory({ active: true, nodes: [trigger] }, owner);
		await setActiveVersion(workflow.id, workflow.versionId);

		await outboxRepository.enqueue(workflow.id, workflow.versionId);
		await consumer.processRecord((await outboxRepository.claimNextPendingRecord())!);

		// An unpublish fully applied elsewhere (triggers down, status rows
		// cleared, record terminal), after which a zombie writer restored the
		// mapping row: no node-id detection has anything to see — only the
		// version comparison can find the stale mapping.
		await Container.get(WorkflowRepository).update(workflow.id, { activeVersionId: null });
		await activeWorkflowTriggers.remove(workflow.id);
		await triggerStatusRepository.delete({ workflowId: workflow.id });
		expect(await publishedVersionRepository.getPublishedVersionId(workflow.id)).toBe(
			workflow.versionId,
		);

		await reconciler.reconcile();

		expect(await publishedVersionRepository.getPublishedVersionId(workflow.id)).toBeNull();
		expect(await outboxRepository.claimNextPendingRecord()).toBeNull();
	});

	test('leaves a skewed workflow with an in-flight publication for that record to converge', async () => {
		const owner = await createOwner();

		const trigger = scheduleNode('skew-in-flight');
		const workflow = await createWorkflowWithHistory({ active: true, nodes: [trigger] }, owner);
		await setActiveVersion(workflow.id, workflow.versionId);

		await outboxRepository.enqueue(workflow.id, workflow.versionId);
		await consumer.processRecord((await outboxRepository.claimNextPendingRecord())!);

		// Mid-flight publish of a parameter-only new version: `activeVersionId`
		// commits together with the pending record, and the mapping still points
		// at the old version. Expected skew — that record owns convergence.
		const newVersionId = 'version-2-in-flight';
		await createWorkflowHistory(workflow, owner, undefined, {
			versionId: newVersionId,
			nodes: [{ ...trigger, parameters: { rule: { interval: [{ field: 'hours' }] } } }],
		});
		await setActiveVersion(workflow.id, newVersionId);
		await outboxRepository.enqueue(workflow.id, newVersionId);

		expect(await outboxRepository.findVersionSkewedWorkflowIds()).not.toContain(workflow.id);

		await reconciler.reconcile();

		// Untouched: the mapping still points at the old version and the pending
		// record is still pending — reconciliation neither enqueued nor drained.
		expect(await publishedVersionRepository.getPublishedVersionId(workflow.id)).toBe(
			workflow.versionId,
		);
		expect((await outboxRepository.findInFlightByWorkflowId(workflow.id))?.status).toBe('pending');

		// The exclusion also holds while the record is being processed (in_progress).
		await outboxRepository.claimNextPendingRecord();
		expect(await outboxRepository.findVersionSkewedWorkflowIds()).not.toContain(workflow.id);
	});

	test('re-writes trigger-status rows recorded for a version other than the active one', async () => {
		const owner = await createOwner();

		const trigger = scheduleNode('status-drift');
		const workflow = await createWorkflowWithHistory({ active: true, nodes: [trigger] }, owner);
		await setActiveVersion(workflow.id, workflow.versionId);

		await outboxRepository.enqueue(workflow.id, workflow.versionId);
		await consumer.processRecord((await outboxRepository.claimNextPendingRecord())!);

		const newVersionId = 'version-2-status-drift';
		await createWorkflowHistory(workflow, owner, undefined, {
			versionId: newVersionId,
			nodes: [{ ...trigger, parameters: { rule: { interval: [{ field: 'hours' }] } } }],
		});
		await setActiveVersion(workflow.id, newVersionId);
		await outboxRepository.enqueue(workflow.id, newVersionId);
		await consumer.processRecord((await outboxRepository.claimNextPendingRecord())!);

		// A zombie writer rewrites the status rows for the old version after its
		// record already resolved. The mapping still agrees with `activeVersionId`,
		// so the version-skew check cannot see this — only the rows lag.
		await triggerStatusRepository.update(
			{ workflowId: workflow.id },
			{ versionId: workflow.versionId },
		);
		expect(await outboxRepository.findVersionSkewedWorkflowIds()).not.toContain(workflow.id);

		await reconciler.reconcile();

		const rows = await triggerStatusRepository.findByWorkflowId(workflow.id);
		expect(rows).toHaveLength(1);
		expect(rows[0].versionId).toBe(newVersionId);
		expect(await outboxRepository.claimNextPendingRecord()).toBeNull();
	});

	test('publishes a workflow that was published while the publication service was off', async () => {
		const owner = await createOwner();

		const trigger = scheduleNode('pre-flag');
		const workflow = await createWorkflowWithHistory({ active: true, nodes: [trigger] }, owner);
		await setActiveVersion(workflow.id, workflow.versionId);
		// Legacy activation maintains the published-version mapping, but only the
		// publication reporter writes trigger-status rows — so a workflow published
		// while the flag was off has none, and no outbox record either.
		await publishedVersionRepository.setPublishedVersion(workflow.id, workflow.versionId);

		await reconciler.reconcile();

		expect(activeWorkflowTriggers.get(workflow.id)?.has(trigger.id)).toBe(true);
		const rows = await triggerStatusRepository.findByWorkflowId(workflow.id);
		expect(rows).toHaveLength(1);
		expect(rows[0]).toMatchObject({ nodeId: trigger.id, status: 'activated' });
		expect(await outboxRepository.claimNextPendingRecord()).toBeNull();
	});

	test('leaves a workflow whose most recent publication failed before reporting statuses alone', async () => {
		const owner = await createOwner();

		const trigger = scheduleNode('failed-terminal');
		const workflow = await createWorkflowWithHistory({ active: true, nodes: [trigger] }, owner);
		await setActiveVersion(workflow.id, workflow.versionId);
		// A publish that crashed after advancing the mapping but before the
		// reporter wrote any rows: mapping equals `activeVersionId`, the record is
		// terminal `failed`, zero rows. Re-enqueueing would fail before reporting
		// again and still leave zero rows — an every-pass loop — so the pass must
		// leave it for a user republish (a fresh pending record) to recover.
		await publishedVersionRepository.setPublishedVersion(workflow.id, workflow.versionId);
		await outboxRepository.enqueue(workflow.id, workflow.versionId);
		const record = await outboxRepository.claimNextPendingRecord();
		await outboxRepository.markFailed(record!.id, 'unexpected error before reporting');

		await reconciler.reconcile();

		expect(await outboxRepository.claimNextPendingRecord()).toBeNull();
		expect(await triggerStatusRepository.findByWorkflowId(workflow.id)).toHaveLength(0);
	});

	test('leaves a drifted workflow whose most recent publication failed before reporting alone', async () => {
		const owner = await createOwner();

		const trigger = scheduleNode('drift-failed-terminal');
		const workflow = await createWorkflowWithHistory({ active: true, nodes: [trigger] }, owner);
		await setActiveVersion(workflow.id, workflow.versionId);

		await outboxRepository.enqueue(workflow.id, workflow.versionId);
		await consumer.processRecord((await outboxRepository.claimNextPendingRecord())!);

		// A v2 publish that crashed after advancing the mapping but before the
		// reporter rewrote the rows: mapping equals `activeVersionId`, the record
		// is terminal `failed`, and the rows still carry v1. If the failure is
		// deterministic, re-enqueueing loops — the pass must leave it for a user
		// republish to recover, exactly like the zero-rows case.
		const newVersionId = 'version-2-drift-failed';
		await createWorkflowHistory(workflow, owner, undefined, {
			versionId: newVersionId,
			nodes: [{ ...trigger, parameters: { rule: { interval: [{ field: 'hours' }] } } }],
		});
		await setActiveVersion(workflow.id, newVersionId);
		await publishedVersionRepository.setPublishedVersion(workflow.id, newVersionId);
		await outboxRepository.enqueue(workflow.id, newVersionId);
		const record = await outboxRepository.claimNextPendingRecord();
		await outboxRepository.markFailed(record!.id, 'unexpected error before reporting');

		await reconciler.reconcile();

		expect(await outboxRepository.claimNextPendingRecord()).toBeNull();
		const rows = await triggerStatusRepository.findByWorkflowId(workflow.id);
		expect(rows[0].versionId).toBe(workflow.versionId);
	});

	test('leaves drifted and unreported workflows with an in-flight record for that record to converge', async () => {
		const owner = await createOwner();

		// Drifted rows, but a pending publish owns the convergence.
		const driftTrigger = scheduleNode('drift-in-flight');
		const drifted = await createWorkflowWithHistory({ active: true, nodes: [driftTrigger] }, owner);
		await setActiveVersion(drifted.id, drifted.versionId);
		await outboxRepository.enqueue(drifted.id, drifted.versionId);
		await consumer.processRecord((await outboxRepository.claimNextPendingRecord())!);
		const newVersionId = 'version-2-drift-in-flight';
		await createWorkflowHistory(drifted, owner, undefined, {
			versionId: newVersionId,
			nodes: [{ ...driftTrigger, parameters: { rule: { interval: [{ field: 'hours' }] } } }],
		});
		await setActiveVersion(drifted.id, newVersionId);
		await outboxRepository.enqueue(drifted.id, newVersionId);

		// No rows yet, but the first publish is still pending.
		const unreportedTrigger = scheduleNode('unreported-in-flight');
		const unreported = await createWorkflowWithHistory(
			{ active: true, nodes: [unreportedTrigger] },
			owner,
		);
		await setActiveVersion(unreported.id, unreported.versionId);
		await outboxRepository.enqueue(unreported.id, unreported.versionId);

		expect(await outboxRepository.findTriggerStatusDriftedWorkflowIds()).not.toContain(drifted.id);
		expect(await outboxRepository.findUnreportedPublishedWorkflowIds()).not.toContain(
			unreported.id,
		);

		await reconciler.reconcile();

		// Untouched: both records are still pending — reconciliation neither
		// enqueued nor drained.
		expect((await outboxRepository.findInFlightByWorkflowId(drifted.id))?.status).toBe('pending');
		expect((await outboxRepository.findInFlightByWorkflowId(unreported.id))?.status).toBe(
			'pending',
		);
	});

	test('records persisted rows for a pseudo-only workflow, keeping it out of leader handoff and reconciliation', async () => {
		const owner = await createOwner();

		const trigger = manualTriggerNode('pseudo');
		const workflow = await createWorkflowWithHistory({ active: true, nodes: [trigger] }, owner);
		await setActiveVersion(workflow.id, workflow.versionId);

		await outboxRepository.enqueue(workflow.id, workflow.versionId);
		await consumer.processRecord((await outboxRepository.claimNextPendingRecord())!);

		// Activation is untouched: a genuine publish still registers the no-op
		// trigger's registry slot, and the status row (whose presence drives the
		// publication status API) exists — but classified `persisted`, because the
		// node is fired by the execution engine, never through the registry.
		expect(activeWorkflowTriggers.get(workflow.id)?.has(trigger.id)).toBe(true);
		const rows = await triggerStatusRepository.findByWorkflowId(workflow.id);
		expect(rows).toHaveLength(1);
		expect(rows[0]).toMatchObject({
			nodeId: trigger.id,
			status: 'activated',
			triggerKind: 'persisted',
		});

		// Leader handoff on a fresh leader: nothing is registered locally, but a
		// pseudo-only workflow has no real trigger work to republish.
		await activeWorkflowTriggers.remove(workflow.id);
		await outboxRepository.enqueueForLeaderHandoff();
		expect(await outboxRepository.claimNextPendingRecord()).toBeNull();

		// The reconciler ignores persisted rows even though the node is not
		// registered — no re-enqueue loop.
		await reconciler.reconcile();
		expect(await outboxRepository.claimNextPendingRecord()).toBeNull();
		expect(activeWorkflowTriggers.get(workflow.id)).toBeUndefined();
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
