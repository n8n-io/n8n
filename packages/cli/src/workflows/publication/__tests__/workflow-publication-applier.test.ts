import type {
	WorkflowEntity,
	WorkflowHistory,
	WorkflowPublicationOutbox,
	WorkflowPublishedVersion as WorkflowPublishedVersionEntity,
	WorkflowPublishedVersionRepository,
	WorkflowHistoryRepository,
	WorkflowRepository,
} from '@n8n/db';
import type { Logger } from '@n8n/backend-common';
import { mock } from 'vitest-mock-extended';
import type { INode, INodeType } from 'n8n-workflow';
import { WebhookPathTakenError } from 'n8n-workflow';

import { TELEMETRY_EVENT } from '@n8n/telemetry';

import type { NodeTypes } from '@/node-types';
import type { PolicyEnforcementService } from '@/policy/policy-enforcement.service';
import { PolicyViolationError } from '@/policy/policy-violation.error';
import type { OwnershipService } from '@/services/ownership.service';
import type { Telemetry } from '@/telemetry';
import { WorkflowPublicationApplier } from '@/workflows/publication/workflow-publication-applier';
import type { WorkflowTriggerActivator } from '@/workflows/triggers/workflow-trigger-activator';
import type { WorkflowPublishedDataService } from '@/workflows/workflow-published-data.service';
import type { WorkflowService } from '@/workflows/workflow.service';

describe('WorkflowPublicationApplier', () => {
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);
	const workflowRepository = mock<WorkflowRepository>();
	const workflowHistoryRepository = mock<WorkflowHistoryRepository>();
	const workflowPublishedVersionRepository = mock<WorkflowPublishedVersionRepository>();
	const workflowTriggerActivator = mock<WorkflowTriggerActivator>();
	const workflowPublishedDataService = mock<WorkflowPublishedDataService>();
	const nodeTypes = mock<NodeTypes>();
	const workflowService = mock<WorkflowService>();
	const telemetry = mock<Telemetry>();
	// Clears by default, which is what the real service does with no policy backend.
	const policyEnforcementService = mock<PolicyEnforcementService>();
	const ownershipService = mock<OwnershipService>();

	const applier = new WorkflowPublicationApplier(
		logger,
		workflowRepository,
		workflowHistoryRepository,
		workflowPublishedVersionRepository,
		workflowTriggerActivator,
		workflowPublishedDataService,
		nodeTypes,
		workflowService,
		telemetry,
		policyEnforcementService,
		ownershipService,
	);

	function makeRecord(
		overrides: Partial<WorkflowPublicationOutbox> = {},
	): WorkflowPublicationOutbox {
		return {
			id: 1,
			workflowId: 'wf-1',
			publishedVersionId: 'v-2',
			status: 'in_progress',
			errorMessage: null,
			createdAt: new Date(),
			updatedAt: new Date(),
			...overrides,
		} as WorkflowPublicationOutbox;
	}

	function makeWorkflow(overrides: Partial<WorkflowEntity> = {}): WorkflowEntity {
		return {
			id: 'wf-1',
			active: true,
			activeVersionId: 'v-2',
			...overrides,
		} as WorkflowEntity;
	}

	function makeVersion(versionId: string): WorkflowHistory {
		return {
			versionId,
			workflowId: 'wf-1',
			nodes: [],
			connections: {},
		} as unknown as WorkflowHistory;
	}

	function triggerNode(id: string, overrides: Partial<INode> = {}): INode {
		return {
			id,
			name: id,
			type: 'n8n-nodes-base.scheduleTrigger',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
			...overrides,
		};
	}

	/** The `workflow_published_version` mapping read by `resolveVersions`. */
	function makePublishedVersion(
		publishedVersion: WorkflowHistory | null,
	): WorkflowPublishedVersionEntity {
		return {
			workflowId: 'wf-1',
			publishedVersionId: publishedVersion?.versionId ?? 'v-1',
			publishedVersion,
		} as unknown as WorkflowPublishedVersionEntity;
	}

	const newVersion = makeVersion('v-2');
	const oldVersion = makeVersion('v-1');

	const abort = { signal: new AbortController().signal, onDetached: vi.fn() };

	/** Drives the trigger diff: first call returns old triggers, second returns new. */
	function setTriggerSets(oldTriggers: INode[], newTriggers: INode[]) {
		workflowTriggerActivator.getEnabledTriggerNodes
			.mockReturnValueOnce(oldTriggers)
			.mockReturnValueOnce(newTriggers);
	}

	beforeEach(() => {
		vi.clearAllMocks();
		workflowRepository.findOneBy.mockResolvedValue(makeWorkflow({ activeVersionId: 'v-1' }));
		workflowPublishedVersionRepository.findOne.mockResolvedValue(makePublishedVersion(oldVersion));
		workflowPublishedVersionRepository.setPublishedVersion.mockResolvedValue(undefined);
		workflowHistoryRepository.findOneBy.mockResolvedValue(newVersion);
		workflowTriggerActivator.getEnabledTriggerNodes.mockReturnValue([]);
		workflowTriggerActivator.getUnregisteredNonWebhookTriggerNodeIds.mockReturnValue(new Set());
		workflowTriggerActivator.getNodesWithUnregisteredWebhooks.mockResolvedValue(new Set());
		workflowTriggerActivator.activate.mockResolvedValue({ activated: [], failures: [] });
		workflowTriggerActivator.deactivate.mockResolvedValue({ externalTeardownFailures: [] });
		workflowTriggerActivator.updateTriggerCount.mockResolvedValue(undefined);
		// The test nodes are scheduleTrigger nodes, so default every node to 'in-memory'.
		workflowTriggerActivator.getTriggerKinds.mockImplementation(
			(nodes) => new Map(nodes.map((node) => [node.id, 'in-memory'])),
		);
		ownershipService.getWorkflowProjectCached.mockResolvedValue(mock({ id: 'project-1' }));
		// `clearAllMocks` keeps implementations, so restore the clearing default.
		policyEnforcementService.hasChecksFor.mockReturnValue(true);
		policyEnforcementService.enforceWorkflowPublish.mockResolvedValue(mock());
	});

	test('skips with workflow-not-found when the workflow is gone', async () => {
		workflowRepository.findOneBy.mockResolvedValue(null);

		const result = await applier.apply(makeRecord(), abort);

		expect(result).toEqual({ type: 'skipped', reason: 'workflow-not-found' });
		expect(workflowTriggerActivator.getEnabledTriggerNodes).not.toHaveBeenCalled();
		expect(workflowPublishedVersionRepository.setPublishedVersion).not.toHaveBeenCalled();
	});

	describe('unpublish (activeVersionId is null)', () => {
		// `activeVersionId` is the source of truth, not the deprecated `active` flag.
		beforeEach(() => {
			workflowRepository.findOneBy.mockResolvedValue(
				makeWorkflow({ active: true, activeVersionId: null }),
			);
		});

		test('tears down the published triggers and removes the mapping', async () => {
			workflowPublishedVersionRepository.findOne.mockResolvedValue(
				makePublishedVersion(oldVersion),
			);
			workflowTriggerActivator.getEnabledTriggerNodes.mockReturnValue([
				triggerNode('a'),
				triggerNode('b'),
			]);

			const result = await applier.apply(makeRecord(), abort);

			expect(result).toEqual({ type: 'unpublished' });
			expect(workflowTriggerActivator.getEnabledTriggerNodes).toHaveBeenCalledWith(oldVersion);
			expect(workflowTriggerActivator.deactivate).toHaveBeenCalledWith(
				expect.objectContaining({ id: 'wf-1' }),
				oldVersion,
				new Set(['a', 'b']),
				abort,
			);
			expect(workflowPublishedVersionRepository.removePublishedVersion).toHaveBeenCalledWith(
				'wf-1',
			);
			expect(workflowPublishedDataService.invalidateCache).toHaveBeenCalledWith('wf-1');
			expect(workflowTriggerActivator.activate).not.toHaveBeenCalled();
			expect(workflowPublishedVersionRepository.setPublishedVersion).not.toHaveBeenCalled();
		});

		test('removes the mapping without deactivating when there are no triggers', async () => {
			workflowPublishedVersionRepository.findOne.mockResolvedValue(
				makePublishedVersion(oldVersion),
			);
			workflowTriggerActivator.getEnabledTriggerNodes.mockReturnValue([]);

			const result = await applier.apply(makeRecord(), abort);

			expect(result).toEqual({ type: 'unpublished' });
			expect(workflowTriggerActivator.deactivate).not.toHaveBeenCalled();
			expect(workflowPublishedVersionRepository.removePublishedVersion).toHaveBeenCalledWith(
				'wf-1',
			);
		});

		test('completes as unpublished when there is no published-version mapping, so stale trigger-status rows are cleared', async () => {
			// A retried/reconciled unpublish whose mapping is already gone must still
			// end in `unpublished` (not a skip): the reporter clears the workflow's
			// trigger-status rows only on that result, and an interrupted unpublish
			// can leave rows behind after the mapping was removed.
			workflowPublishedVersionRepository.findOne.mockResolvedValue(makePublishedVersion(null));

			const result = await applier.apply(makeRecord(), abort);

			expect(result).toEqual({ type: 'unpublished' });
			expect(workflowTriggerActivator.deactivate).not.toHaveBeenCalled();
			expect(workflowPublishedVersionRepository.removePublishedVersion).toHaveBeenCalledWith(
				'wf-1',
			);
			expect(workflowPublishedVersionRepository.setPublishedVersion).not.toHaveBeenCalled();
		});

		test('completes as unpublished carrying external teardown failures, still removing the mapping', async () => {
			// Local routing already stopped inside `deactivate` (rows deleted before
			// any external call), so an abandoned external deregistration must not
			// keep the mapping alive — that would make the reconciler re-enqueue the
			// unpublish forever and block deleting the workflow.
			workflowPublishedVersionRepository.findOne.mockResolvedValue(
				makePublishedVersion(oldVersion),
			);
			workflowTriggerActivator.getEnabledTriggerNodes.mockReturnValue([triggerNode('a')]);
			const failure = { nodeName: 'a', error: new Error('remote unreachable') };
			workflowTriggerActivator.deactivate.mockResolvedValue({
				externalTeardownFailures: [failure],
			});

			const result = await applier.apply(makeRecord(), abort);

			expect(result).toEqual({ type: 'unpublished', teardownFailures: [failure] });
			expect(workflowPublishedVersionRepository.removePublishedVersion).toHaveBeenCalledWith(
				'wf-1',
			);
		});

		test('propagates a teardown failure and leaves the mapping in place', async () => {
			workflowPublishedVersionRepository.findOne.mockResolvedValue(
				makePublishedVersion(oldVersion),
			);
			workflowTriggerActivator.getEnabledTriggerNodes.mockReturnValue([triggerNode('a')]);
			workflowTriggerActivator.deactivate.mockRejectedValue(new Error('teardown boom'));

			await expect(applier.apply(makeRecord(), abort)).rejects.toThrow('teardown boom');
			expect(workflowPublishedVersionRepository.removePublishedVersion).not.toHaveBeenCalled();
		});
	});

	describe('policy enforcement', () => {
		const violation = () =>
			new PolicyViolationError([
				{ kind: 'node-type-unavailable', checkId: 'check-1', message: 'Blocked by policy' },
			]);

		test('enforces with the version being published and the owning project', async () => {
			workflowRepository.findOneBy.mockResolvedValue(
				makeWorkflow({ activeVersionId: 'v-1', name: 'My workflow' }),
			);
			const versionWithNodes = {
				...makeVersion('v-2'),
				nodes: [triggerNode('a')],
			} as WorkflowHistory;
			workflowHistoryRepository.findOneBy.mockResolvedValue(versionWithNodes);

			await applier.apply(makeRecord(), abort);

			expect(policyEnforcementService.enforceWorkflowPublish).toHaveBeenCalledExactlyOnceWith({
				workflow: {
					id: 'wf-1',
					name: 'My workflow',
					nodes: versionWithNodes.nodes,
				},
				projectId: 'project-1',
			});
		});

		// The no-change branch still advances the published version, which running
		// triggers re-read on their next fire.
		test('enforces even when the trigger diff is empty', async () => {
			const trigger = triggerNode('a');
			setTriggerSets([trigger], [{ ...trigger }]);

			const result = await applier.apply(makeRecord(), abort);

			expect(result.type).toBe('completed');
			expect(policyEnforcementService.enforceWorkflowPublish).toHaveBeenCalledTimes(1);
		});

		test('fails the record without advancing or touching triggers when policy blocks', async () => {
			policyEnforcementService.enforceWorkflowPublish.mockRejectedValue(violation());

			const result = await applier.apply(makeRecord(), abort);

			expect(result).toMatchObject({ type: 'failed' });
			expect((result as { error: Error }).error).toBeInstanceOf(PolicyViolationError);
			expect(workflowPublishedVersionRepository.setPublishedVersion).not.toHaveBeenCalled();
			expect(workflowTriggerActivator.activate).not.toHaveBeenCalled();
			expect(workflowTriggerActivator.deactivate).not.toHaveBeenCalled();
		});

		// Left as `activated`, these rows read as drift and get re-enqueued forever.
		test('reports every desired trigger as failed so no activated rows survive', async () => {
			workflowTriggerActivator.getEnabledTriggerNodes.mockReturnValue([
				triggerNode('a'),
				triggerNode('b'),
			]);
			policyEnforcementService.enforceWorkflowPublish.mockRejectedValue(violation());

			const result = await applier.apply(makeRecord(), abort);

			expect(result).toMatchObject({
				type: 'failed',
				triggerStatuses: [
					{
						nodeId: 'a',
						nodeName: 'a',
						status: 'failed',
						triggerKind: 'in-memory',
						errorMessage: 'Blocked by policy',
					},
					{
						nodeId: 'b',
						nodeName: 'b',
						status: 'failed',
						triggerKind: 'in-memory',
						errorMessage: 'Blocked by policy',
					},
				],
			});
		});

		// An unevaluated project rule is not a passed one, so the lookup is unguarded.
		test('propagates a failed ownership lookup instead of policing a null scope', async () => {
			ownershipService.getWorkflowProjectCached.mockRejectedValue(new Error('no owner row'));

			await expect(applier.apply(makeRecord(), abort)).rejects.toThrow('no owner row');

			expect(policyEnforcementService.enforceWorkflowPublish).not.toHaveBeenCalled();
		});

		// A feature that is merely absent must not cost a lookup on every publication.
		test('does not resolve ownership when no check is registered', async () => {
			policyEnforcementService.hasChecksFor.mockReturnValue(false);

			const result = await applier.apply(makeRecord(), abort);

			expect(result.type).toBe('completed');
			expect(ownershipService.getWorkflowProjectCached).not.toHaveBeenCalled();
			expect(policyEnforcementService.enforceWorkflowPublish).not.toHaveBeenCalled();
		});

		test('does not enforce while unpublishing', async () => {
			workflowRepository.findOneBy.mockResolvedValue(
				makeWorkflow({ active: true, activeVersionId: null }),
			);

			await applier.apply(makeRecord(), abort);

			expect(policyEnforcementService.enforceWorkflowPublish).not.toHaveBeenCalled();
		});

		// Only a violation is a verdict; a broken check must not read as "blocked".
		test('propagates a non-violation error instead of failing the record', async () => {
			policyEnforcementService.enforceWorkflowPublish.mockRejectedValue(new Error('boom'));

			await expect(applier.apply(makeRecord(), abort)).rejects.toThrow('boom');
		});
	});

	test('returns version-missing when the published version history row is gone', async () => {
		workflowHistoryRepository.findOneBy.mockResolvedValue(null);

		const result = await applier.apply(makeRecord(), abort);

		expect(result).toEqual({ type: 'version-missing' });
		expect(workflowTriggerActivator.getEnabledTriggerNodes).not.toHaveBeenCalled();
		expect(workflowPublishedVersionRepository.setPublishedVersion).not.toHaveBeenCalled();
	});

	test('advances the published version and completes when no triggers changed', async () => {
		const trigger = triggerNode('a');
		setTriggerSets([trigger], [{ ...trigger }]);

		const result = await applier.apply(makeRecord(), abort);

		expect(result).toEqual({
			type: 'completed',
			triggerStatuses: [
				{ nodeId: 'a', nodeName: 'a', status: 'activated', triggerKind: 'in-memory' },
			],
		});
		expect(workflowPublishedVersionRepository.setPublishedVersion).toHaveBeenCalledWith(
			'wf-1',
			'v-2',
		);
		// The unchanged-triggers path still advances the version, so the cache is
		// invalidated and repopulated for the new version to be served on next fire.
		expect(workflowPublishedDataService.invalidateCache).toHaveBeenCalledWith('wf-1');
		expect(workflowPublishedDataService.refreshCache).toHaveBeenCalledWith('wf-1');
		expect(workflowTriggerActivator.deactivate).not.toHaveBeenCalled();
		expect(workflowTriggerActivator.activate).not.toHaveBeenCalled();
	});

	test('stamps each trigger status with its execution kind', async () => {
		const hook = triggerNode('hook', { type: 'n8n-nodes-base.webhook' });
		const poll = triggerNode('poll', { type: 'n8n-nodes-base.rssFeedReadTrigger' });
		setTriggerSets([], [hook, poll]);
		workflowTriggerActivator.getTriggerKinds.mockReturnValue(
			new Map([
				['hook', 'persisted'],
				['poll', 'in-memory'],
			]),
		);
		workflowTriggerActivator.activate.mockResolvedValue({
			activated: ['hook', 'poll'],
			failures: [],
		});

		const result = await applier.apply(makeRecord(), abort);

		expect(result).toEqual({
			type: 'completed',
			triggerStatuses: [
				{ nodeId: 'hook', nodeName: 'hook', status: 'activated', triggerKind: 'persisted' },
				{ nodeId: 'poll', nodeName: 'poll', status: 'activated', triggerKind: 'in-memory' },
			],
		});
	});

	test('registers only added triggers', async () => {
		setTriggerSets([triggerNode('a')], [triggerNode('a'), triggerNode('b')]);

		const result = await applier.apply(makeRecord(), abort);

		expect(result).toEqual({
			type: 'completed',
			triggerStatuses: [
				{ nodeId: 'a', nodeName: 'a', status: 'activated', triggerKind: 'in-memory' },
				{ nodeId: 'b', nodeName: 'b', status: 'activated', triggerKind: 'in-memory' },
			],
		});
		expect(workflowTriggerActivator.deactivate).not.toHaveBeenCalled();
		expect(workflowTriggerActivator.activate).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'wf-1' }),
			newVersion,
			new Set(['b']),
			'update',
			abort,
		);
		expect(workflowPublishedVersionRepository.setPublishedVersion).toHaveBeenCalledWith(
			'wf-1',
			'v-2',
		);
	});

	describe('activation mode from the record reason', () => {
		test.each([
			['publish', 'update'],
			['startup', 'init'],
			['leadership-takeover', 'leadershipChange'],
			['reconcile', 'update'],
		] as const)('reason %s activates with mode %s', async (reason, expectedMode) => {
			setTriggerSets([], [triggerNode('a')]);

			await applier.apply(makeRecord({ reason }), abort);

			expect(workflowTriggerActivator.activate).toHaveBeenCalledWith(
				expect.objectContaining({ id: 'wf-1' }),
				newVersion,
				new Set(['a']),
				expectedMode,
				abort,
			);
		});

		test('a record without a reason (pre-migration row) activates with update', async () => {
			setTriggerSets([], [triggerNode('a')]);

			await applier.apply(makeRecord({ reason: undefined }), abort);

			expect(workflowTriggerActivator.activate).toHaveBeenCalledWith(
				expect.objectContaining({ id: 'wf-1' }),
				newVersion,
				new Set(['a']),
				'update',
				abort,
			);
		});

		describe('first publication (no published-version mapping)', () => {
			beforeEach(() => {
				workflowPublishedVersionRepository.findOne.mockResolvedValue(null);
			});

			test('reason publish activates with mode activate', async () => {
				setTriggerSets([], [triggerNode('a')]);

				await applier.apply(makeRecord({ reason: 'publish' }), abort);

				expect(workflowTriggerActivator.activate).toHaveBeenCalledWith(
					expect.objectContaining({ id: 'wf-1' }),
					newVersion,
					new Set(['a']),
					'activate',
					abort,
				);
			});

			test('a record without a reason (pre-migration row) activates with mode activate', async () => {
				setTriggerSets([], [triggerNode('a')]);

				await applier.apply(makeRecord({ reason: undefined }), abort);

				expect(workflowTriggerActivator.activate).toHaveBeenCalledWith(
					expect.objectContaining({ id: 'wf-1' }),
					newVersion,
					new Set(['a']),
					'activate',
					abort,
				);
			});

			test.each([
				['startup', 'init'],
				['leadership-takeover', 'leadershipChange'],
				['reconcile', 'update'],
			] as const)('reason %s still activates with mode %s', async (reason, expectedMode) => {
				setTriggerSets([], [triggerNode('a')]);

				await applier.apply(makeRecord({ reason }), abort);

				expect(workflowTriggerActivator.activate).toHaveBeenCalledWith(
					expect.objectContaining({ id: 'wf-1' }),
					newVersion,
					new Set(['a']),
					expectedMode,
					abort,
				);
			});
		});
	});

	test('reconciles by registering desired non-webhook triggers missing from memory', async () => {
		// Same version on both sides: a pure version diff is empty, but a live
		// trigger is not actually registered, so it must be re-added.
		const trigger = triggerNode('a');
		setTriggerSets([trigger], [{ ...trigger }]);
		workflowTriggerActivator.getUnregisteredNonWebhookTriggerNodeIds.mockReturnValue(
			new Set(['a']),
		);

		const result = await applier.apply(makeRecord(), abort);

		expect(result).toEqual({
			type: 'completed',
			triggerStatuses: [
				{ nodeId: 'a', nodeName: 'a', status: 'activated', triggerKind: 'in-memory' },
			],
		});
		expect(workflowTriggerActivator.getUnregisteredNonWebhookTriggerNodeIds).toHaveBeenCalledWith(
			'wf-1',
			[trigger],
		);
		expect(workflowTriggerActivator.deactivate).not.toHaveBeenCalled();
		expect(workflowTriggerActivator.activate).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'wf-1' }),
			newVersion,
			new Set(['a']),
			'update',
			abort,
		);
	});

	test('is a no-op when the version is unchanged and all non-webhook triggers are registered', async () => {
		const trigger = triggerNode('a');
		setTriggerSets([trigger], [{ ...trigger }]);
		workflowTriggerActivator.getUnregisteredNonWebhookTriggerNodeIds.mockReturnValue(new Set());

		const result = await applier.apply(makeRecord(), abort);

		expect(result).toEqual({
			type: 'completed',
			triggerStatuses: [
				{ nodeId: 'a', nodeName: 'a', status: 'activated', triggerKind: 'in-memory' },
			],
		});
		expect(workflowTriggerActivator.activate).not.toHaveBeenCalled();
		expect(workflowTriggerActivator.deactivate).not.toHaveBeenCalled();
		expect(workflowPublishedVersionRepository.setPublishedVersion).toHaveBeenCalledWith(
			'wf-1',
			'v-2',
		);
	});

	test('reconciles by registering desired webhook nodes missing from storage', async () => {
		// Same version on both sides: the version diff is empty, but a desired
		// webhook is not registered locally (e.g. a crash after the version
		// advanced), so it must be re-added.
		const trigger = triggerNode('a');
		setTriggerSets([trigger], [{ ...trigger }]);
		workflowTriggerActivator.getNodesWithUnregisteredWebhooks.mockResolvedValue(new Set(['a']));

		const result = await applier.apply(makeRecord(), abort);

		expect(result).toEqual({
			type: 'completed',
			triggerStatuses: [
				{ nodeId: 'a', nodeName: 'a', status: 'activated', triggerKind: 'in-memory' },
			],
		});
		expect(workflowTriggerActivator.getNodesWithUnregisteredWebhooks).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'wf-1' }),
			newVersion,
		);
		expect(workflowTriggerActivator.deactivate).not.toHaveBeenCalled();
		expect(workflowTriggerActivator.activate).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'wf-1' }),
			newVersion,
			new Set(['a']),
			'update',
			abort,
		);
	});

	test('merges webhook reconciliation with the version diff', async () => {
		// The diff adds 'b'; reconciliation surfaces an unregistered webhook 'c'.
		setTriggerSets([triggerNode('a')], [triggerNode('a'), triggerNode('b')]);
		workflowTriggerActivator.getNodesWithUnregisteredWebhooks.mockResolvedValue(new Set(['c']));

		const result = await applier.apply(makeRecord(), abort);

		expect(result).toEqual({
			type: 'completed',
			triggerStatuses: [
				{ nodeId: 'a', nodeName: 'a', status: 'activated', triggerKind: 'in-memory' },
				{ nodeId: 'b', nodeName: 'b', status: 'activated', triggerKind: 'in-memory' },
			],
		});
		expect(workflowTriggerActivator.activate).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'wf-1' }),
			newVersion,
			new Set(['b', 'c']),
			'update',
			abort,
		);
	});

	test('deregisters only removed triggers and refreshes the trigger count', async () => {
		setTriggerSets([triggerNode('a'), triggerNode('b')], [triggerNode('a')]);

		const result = await applier.apply(makeRecord(), abort);

		expect(result).toEqual({
			type: 'completed',
			triggerStatuses: [
				{ nodeId: 'a', nodeName: 'a', status: 'activated', triggerKind: 'in-memory' },
			],
		});
		expect(workflowTriggerActivator.deactivate).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'wf-1' }),
			oldVersion,
			new Set(['b']),
			abort,
		);
		expect(workflowTriggerActivator.activate).not.toHaveBeenCalled();
		expect(workflowTriggerActivator.updateTriggerCount).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'wf-1' }),
			newVersion,
		);
	});

	test('reapplies modified triggers as remove-then-add, advancing in between', async () => {
		setTriggerSets(
			[triggerNode('a', { parameters: { interval: 1 } })],
			[triggerNode('a', { parameters: { interval: 5 } })],
		);

		const callOrder: string[] = [];
		workflowTriggerActivator.deactivate.mockImplementation(async () => {
			callOrder.push('remove');
			return { externalTeardownFailures: [] };
		});
		workflowPublishedVersionRepository.setPublishedVersion.mockImplementation(async () => {
			callOrder.push('advance');
		});
		workflowPublishedDataService.invalidateCache.mockImplementation(async () => {
			callOrder.push('invalidate');
		});
		workflowPublishedDataService.refreshCache.mockImplementation(async () => {
			callOrder.push('refresh');
		});
		workflowTriggerActivator.activate.mockImplementation(async () => {
			callOrder.push('add');
			return { activated: ['a'], failures: [] };
		});

		const result = await applier.apply(makeRecord(), abort);

		expect(result).toEqual({
			type: 'completed',
			triggerStatuses: [
				{ nodeId: 'a', nodeName: 'a', status: 'activated', triggerKind: 'in-memory' },
			],
		});
		expect(workflowTriggerActivator.deactivate).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'wf-1' }),
			oldVersion,
			new Set(['a']),
			abort,
		);
		expect(workflowTriggerActivator.activate).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'wf-1' }),
			newVersion,
			new Set(['a']),
			'update',
			abort,
		);
		// The cache is invalidated before the version is advanced and repopulated
		// straight after, so the empty window never serves a stale version, all
		// before the new triggers are added.
		expect(callOrder).toEqual(['remove', 'invalidate', 'advance', 'refresh', 'add']);
	});

	test('completes carrying external teardown failures from removed triggers, still advancing', async () => {
		setTriggerSets([triggerNode('a'), triggerNode('b')], [triggerNode('a')]);
		const failure = { nodeName: 'b', error: new Error('remote unreachable') };
		workflowTriggerActivator.deactivate.mockResolvedValue({
			externalTeardownFailures: [failure],
		});

		const result = await applier.apply(makeRecord(), abort);

		// The new version must not be blocked by a third party refusing to release
		// an old trigger: the publication completes and the failures ride along.
		expect(result).toEqual({
			type: 'completed',
			triggerStatuses: [
				{ nodeId: 'a', nodeName: 'a', status: 'activated', triggerKind: 'in-memory' },
			],
			teardownFailures: [failure],
		});
		expect(workflowPublishedVersionRepository.setPublishedVersion).toHaveBeenCalledWith(
			'wf-1',
			'v-2',
		);
	});

	test('propagates without advancing when removing triggers throws', async () => {
		setTriggerSets([triggerNode('a'), triggerNode('b')], [triggerNode('a')]);
		workflowTriggerActivator.deactivate.mockRejectedValue(new Error('teardown failed'));

		// A teardown failure happens before the version advances, so it bubbles up
		// to the consumer (which turns it into a failed result) rather than leaving
		// a half-applied publication marked completed.
		await expect(applier.apply(makeRecord(), abort)).rejects.toThrow('teardown failed');

		expect(workflowPublishedVersionRepository.setPublishedVersion).not.toHaveBeenCalled();
		expect(workflowTriggerActivator.activate).not.toHaveBeenCalled();
	});

	test('returns failed (after advancing) when adding triggers throws unexpectedly', async () => {
		setTriggerSets([triggerNode('a')], [triggerNode('a'), triggerNode('b')]);
		workflowTriggerActivator.activate.mockRejectedValue(new Error('registration failed'));

		const result = await applier.apply(makeRecord(), abort);

		expect(result).toEqual({
			type: 'failed',
			error: expect.objectContaining({ message: 'registration failed' }),
		});
		expect(workflowPublishedVersionRepository.setPublishedVersion).toHaveBeenCalledWith(
			'wf-1',
			'v-2',
		);
	});

	test('returns partial when some added triggers fail, advancing and keeping survivors', async () => {
		setTriggerSets([triggerNode('a')], [triggerNode('a'), triggerNode('b')]);
		const error = new Error('third-party unavailable');
		workflowTriggerActivator.activate.mockResolvedValue({
			activated: ['a'],
			failures: [{ nodeId: 'b', nodeName: 'b', error }],
		});

		const result = await applier.apply(makeRecord(), abort);

		expect(result).toEqual({
			type: 'partial',
			triggerStatuses: [
				{ nodeId: 'a', nodeName: 'a', status: 'activated', triggerKind: 'in-memory' },
				{
					nodeId: 'b',
					nodeName: 'b',
					status: 'failed',
					triggerKind: 'in-memory',
					errorMessage: 'third-party unavailable',
				},
			],
		});
		// The new version is published despite the partial activation; no deactivation.
		expect(workflowPublishedVersionRepository.setPublishedVersion).toHaveBeenCalledWith(
			'wf-1',
			'v-2',
		);
		expect(workflowTriggerActivator.deactivate).not.toHaveBeenCalled();
	});

	test('carries external teardown failures on a partial activation outcome', async () => {
		// The teardown ran (and the version advanced) before activation classified
		// the result: the abandoned deregistration must survive the classification
		// so the reporter can still surface it.
		setTriggerSets(
			[triggerNode('a'), triggerNode('removed')],
			[triggerNode('a'), triggerNode('b')],
		);
		const teardownFailure = { nodeName: 'removed', error: new Error('remote unreachable') };
		workflowTriggerActivator.deactivate.mockResolvedValue({
			externalTeardownFailures: [teardownFailure],
		});
		workflowTriggerActivator.activate.mockResolvedValue({
			activated: ['a'],
			failures: [{ nodeId: 'b', nodeName: 'b', error: new Error('third-party unavailable') }],
		});

		const result = await applier.apply(makeRecord(), abort);

		expect(result).toMatchObject({ type: 'partial', teardownFailures: [teardownFailure] });
	});

	test('carries external teardown failures when adding triggers throws', async () => {
		setTriggerSets(
			[triggerNode('a'), triggerNode('removed')],
			[triggerNode('a'), triggerNode('b')],
		);
		const teardownFailure = { nodeName: 'removed', error: new Error('remote unreachable') };
		workflowTriggerActivator.deactivate.mockResolvedValue({
			externalTeardownFailures: [teardownFailure],
		});
		workflowTriggerActivator.activate.mockRejectedValue(new Error('registration failed'));

		const result = await applier.apply(makeRecord(), abort);

		expect(result).toMatchObject({ type: 'failed', teardownFailures: [teardownFailure] });
	});

	test('carries external teardown failures when advancing the version throws', async () => {
		// The teardown (and its abandoned deregistrations) already happened;
		// an advance failure must not throw past them and lose the report.
		setTriggerSets([triggerNode('a'), triggerNode('removed')], [triggerNode('a')]);
		const teardownFailure = { nodeName: 'removed', error: new Error('remote unreachable') };
		workflowTriggerActivator.deactivate.mockResolvedValue({
			externalTeardownFailures: [teardownFailure],
		});
		workflowPublishedVersionRepository.setPublishedVersion.mockRejectedValue(new Error('db down'));

		const result = await applier.apply(makeRecord(), abort);

		expect(result).toMatchObject({
			type: 'failed',
			error: expect.objectContaining({ message: 'db down' }),
			teardownFailures: [teardownFailure],
		});
	});

	test('returns partial when a deterministic failure coexists with an activated trigger', async () => {
		setTriggerSets([triggerNode('a')], [triggerNode('a'), triggerNode('b')]);
		const error = new WebhookPathTakenError('b');
		workflowTriggerActivator.activate.mockResolvedValue({
			activated: ['a'],
			failures: [{ nodeId: 'b', nodeName: 'b', error }],
		});

		const result = await applier.apply(makeRecord(), abort);

		expect(result).toEqual({
			type: 'partial',
			triggerStatuses: [
				{ nodeId: 'a', nodeName: 'a', status: 'activated', triggerKind: 'in-memory' },
				{
					nodeId: 'b',
					nodeName: 'b',
					status: 'failed',
					triggerKind: 'in-memory',
					errorMessage: error.message,
				},
			],
		});
		expect(workflowPublishedVersionRepository.setPublishedVersion).toHaveBeenCalledWith(
			'wf-1',
			'v-2',
		);
	});

	test('returns failed when every failure is deterministic and nothing activated', async () => {
		setTriggerSets([], [triggerNode('b')]);
		const error = new WebhookPathTakenError('b');
		workflowTriggerActivator.activate.mockResolvedValue({
			activated: [],
			failures: [{ nodeId: 'b', nodeName: 'b', error }],
		});

		const result = await applier.apply(makeRecord(), abort);

		// A single failure passes its error through, preserving the type.
		expect(result).toEqual({
			type: 'failed',
			error,
			triggerStatuses: [
				{
					nodeId: 'b',
					nodeName: 'b',
					status: 'failed',
					triggerKind: 'in-memory',
					errorMessage: error.message,
				},
			],
		});
		expect(workflowPublishedVersionRepository.setPublishedVersion).toHaveBeenCalledWith(
			'wf-1',
			'v-2',
		);
	});

	test('returns failed when nothing activated even if a failure is transient', async () => {
		setTriggerSets([], [triggerNode('b'), triggerNode('c')]);
		const deterministic = new WebhookPathTakenError('b');
		const transient = new Error('third-party unavailable');
		const failures = [
			{ nodeId: 'b', nodeName: 'b', error: deterministic },
			{ nodeId: 'c', nodeName: 'c', error: transient },
		];
		workflowTriggerActivator.activate.mockResolvedValue({ activated: [], failures });

		const result = await applier.apply(makeRecord(), abort);

		// Nothing is running, so the publication failed; the combined error names both nodes.
		expect(result).toEqual({
			type: 'failed',
			error: expect.objectContaining({
				message: `Triggers failed to activate: "b": ${deterministic.message}; "c": third-party unavailable`,
			}),
			triggerStatuses: [
				{
					nodeId: 'b',
					nodeName: 'b',
					status: 'failed',
					triggerKind: 'in-memory',
					errorMessage: deterministic.message,
				},
				{
					nodeId: 'c',
					nodeName: 'c',
					status: 'failed',
					triggerKind: 'in-memory',
					errorMessage: 'third-party unavailable',
				},
			],
		});
	});

	test('returns partial when a newly-added trigger fails but an unchanged trigger keeps running', async () => {
		// `a` is unchanged (old ∩ desired) and stays running; only `b` is added and fails.
		setTriggerSets([triggerNode('a')], [triggerNode('a'), triggerNode('b')]);
		const error = new WebhookPathTakenError('b');
		workflowTriggerActivator.activate.mockResolvedValue({
			// `a` is unchanged, so it never appears in the activation outcome.
			activated: [],
			failures: [{ nodeId: 'b', nodeName: 'b', error }],
		});

		const result = await applier.apply(makeRecord(), abort);

		expect(result).toEqual({
			type: 'partial',
			triggerStatuses: [
				{ nodeId: 'a', nodeName: 'a', status: 'activated', triggerKind: 'in-memory' },
				{
					nodeId: 'b',
					nodeName: 'b',
					status: 'failed',
					triggerKind: 'in-memory',
					errorMessage: error.message,
				},
			],
		});
		expect(workflowPublishedVersionRepository.setPublishedVersion).toHaveBeenCalledWith(
			'wf-1',
			'v-2',
		);
	});

	test('treats a first publication (no published-version mapping yet) as all-added', async () => {
		workflowPublishedVersionRepository.findOne.mockResolvedValue(null);
		setTriggerSets([], [triggerNode('a')]);

		const result = await applier.apply(makeRecord(), abort);

		expect(result).toEqual({
			type: 'completed',
			triggerStatuses: [
				{ nodeId: 'a', nodeName: 'a', status: 'activated', triggerKind: 'in-memory' },
			],
		});
		expect(workflowTriggerActivator.deactivate).not.toHaveBeenCalled();
		expect(workflowTriggerActivator.activate).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'wf-1' }),
			newVersion,
			new Set(['a']),
			'activate',
			abort,
		);
	});

	describe('abort', () => {
		function abortedContext() {
			const controller = new AbortController();
			controller.abort(new Error('deadline'));
			return { signal: controller.signal, onDetached: vi.fn() };
		}

		test('a publish aborted before teardown neither deactivates nor advances the version', async () => {
			setTriggerSets([triggerNode('a')], []);

			await expect(applier.apply(makeRecord(), abortedContext())).rejects.toThrow('deadline');

			expect(workflowTriggerActivator.deactivate).not.toHaveBeenCalled();
			expect(workflowPublishedVersionRepository.setPublishedVersion).not.toHaveBeenCalled();
		});

		test('a publish aborted after teardown advances the version but fails before activation', async () => {
			setTriggerSets([triggerNode('a')], [triggerNode('b')]);
			const controller = new AbortController();
			workflowTriggerActivator.deactivate.mockImplementation(async () => {
				controller.abort(new Error('deadline'));
				return { externalTeardownFailures: [] };
			});

			const result = await applier.apply(makeRecord(), {
				signal: controller.signal,
				onDetached: vi.fn(),
			});

			expect(result).toEqual({
				type: 'failed',
				error: expect.objectContaining({ message: 'deadline' }),
			});
			expect(workflowPublishedVersionRepository.setPublishedVersion).toHaveBeenCalled();
			expect(workflowTriggerActivator.activate).not.toHaveBeenCalled();
		});

		test('an unpublish aborted before teardown leaves the published-version mapping in place', async () => {
			workflowRepository.findOneBy.mockResolvedValue(makeWorkflow({ activeVersionId: null }));
			workflowTriggerActivator.getEnabledTriggerNodes.mockReturnValue([triggerNode('a')]);

			await expect(applier.apply(makeRecord(), abortedContext())).rejects.toThrow('deadline');

			expect(workflowTriggerActivator.deactivate).not.toHaveBeenCalled();
			expect(workflowPublishedVersionRepository.removePublishedVersion).not.toHaveBeenCalled();
		});
	});
	describe('node id healing', () => {
		const dupTriggerVersion = (): WorkflowHistory =>
			({
				versionId: 'v-2',
				workflowId: 'wf-1',
				nodes: [
					triggerNode('shared', { name: 'Trigger A' }),
					triggerNode('shared', { name: 'Trigger B' }),
				],
				connections: {},
				nodeGroups: [{ id: 'g1', name: 'Group', nodeIds: ['shared'] }],
			}) as unknown as WorkflowHistory;

		beforeEach(() => {
			nodeTypes.getByNameAndVersion.mockImplementation((type: string) =>
				type.toLowerCase().includes('trigger')
					? ({ trigger: async () => ({}) } as unknown as INodeType)
					: ({} as INodeType),
			);
			workflowService.publishAsSystem.mockResolvedValue({
				published: true,
				versionId: 'v-healed',
			});
		});

		it('publishes a healed system version instead of applying one with duplicate node ids', async () => {
			const version = dupTriggerVersion();
			workflowHistoryRepository.findOneBy.mockResolvedValue(version);

			const result = await applier.apply(makeRecord(), abort);

			expect(result).toEqual({ type: 'skipped', reason: 'node-ids-healed' });
			expect(workflowService.publishAsSystem).toHaveBeenCalledTimes(1);
			const [workflowId, versionData, expectedActiveVersionId] =
				workflowService.publishAsSystem.mock.calls[0];
			expect(workflowId).toBe('wf-1');
			// Baseline = the version the healed copy was derived from, so a newer
			// publish in flight resolves as superseded instead of being overwritten.
			expect(expectedActiveVersionId).toBe('v-2');
			expect(versionData.connections).toBe(version.connections);
			expect(versionData.nodeGroups).toBe(version.nodeGroups);
			const ids = versionData.nodes.map((node: INode) => node.id);
			expect(new Set(ids).size).toBe(2);
			// The contested id survives on one node, so state keyed on it stays valid.
			expect(ids).toContain('shared');
			// The broken version itself is never applied.
			expect(workflowTriggerActivator.activate).not.toHaveBeenCalled();
			expect(workflowTriggerActivator.deactivate).not.toHaveBeenCalled();
			expect(workflowPublishedVersionRepository.setPublishedVersion).not.toHaveBeenCalled();
			expect(telemetry.track).toHaveBeenCalledWith(TELEMETRY_EVENT.WORKFLOW.NODE_IDS_HEALED, {
				workflow_id: 'wf-1',
				filled_count: 0,
				reassigned_count: 1,
				dropped_count: 0,
				superseded: false,
			});
		});

		it('keeps the contested id on the trigger-like sharer, not the first sharer', async () => {
			// Keeper preference needs real node-type resolution: poller_state rows and
			// processed_data contexts follow the surviving id, so it must stay on the
			// node that owns that state.
			workflowHistoryRepository.findOneBy.mockResolvedValue({
				versionId: 'v-2',
				workflowId: 'wf-1',
				nodes: [
					triggerNode('shared', { name: 'Set', type: 'n8n-nodes-base.set' }),
					triggerNode('shared', { name: 'Trigger' }),
				],
				connections: {},
			} as unknown as WorkflowHistory);

			const result = await applier.apply(makeRecord(), abort);

			expect(result).toEqual({ type: 'skipped', reason: 'node-ids-healed' });
			const [, versionData] = workflowService.publishAsSystem.mock.calls[0];
			const byName = new Map(versionData.nodes.map((node: INode) => [node.name, node.id]));
			expect(byName.get('Trigger')).toBe('shared');
			expect(byName.get('Set')).not.toBe('shared');
		});

		it('skips as superseded when the system publish loses its race', async () => {
			workflowHistoryRepository.findOneBy.mockResolvedValue(dupTriggerVersion());
			workflowService.publishAsSystem.mockResolvedValue({
				published: false,
				reason: 'superseded',
			});

			const result = await applier.apply(makeRecord(), abort);

			expect(result).toEqual({ type: 'skipped', reason: 'superseded' });
			expect(workflowTriggerActivator.activate).not.toHaveBeenCalled();
			expect(workflowPublishedVersionRepository.setPublishedVersion).not.toHaveBeenCalled();
			expect(telemetry.track).toHaveBeenCalledWith(
				TELEMETRY_EVENT.WORKFLOW.NODE_IDS_HEALED,
				expect.objectContaining({ superseded: true }),
			);
		});

		it('does not publish anything for a healthy version', async () => {
			const result = await applier.apply(makeRecord(), abort);

			expect(workflowService.publishAsSystem).not.toHaveBeenCalled();
			expect(telemetry.track).not.toHaveBeenCalled();
			expect(result.type).toBe('completed');
		});

		it('heals even when a node type cannot be resolved', async () => {
			nodeTypes.getByNameAndVersion.mockImplementation(() => {
				throw new Error('Unknown node type');
			});
			workflowHistoryRepository.findOneBy.mockResolvedValue(dupTriggerVersion());

			const result = await applier.apply(makeRecord(), abort);

			expect(result).toEqual({ type: 'skipped', reason: 'node-ids-healed' });
		});
	});
});
