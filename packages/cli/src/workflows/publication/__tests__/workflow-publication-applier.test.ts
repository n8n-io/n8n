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
import { mock } from 'jest-mock-extended';
import type { INode } from 'n8n-workflow';
import { WebhookPathTakenError } from 'n8n-workflow';

import { WorkflowPublicationApplier } from '@/workflows/publication/workflow-publication-applier';
import type { WorkflowTriggerActivator } from '@/workflows/triggers/workflow-trigger-activator';

describe('WorkflowPublicationApplier', () => {
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);
	const workflowRepository = mock<WorkflowRepository>();
	const workflowHistoryRepository = mock<WorkflowHistoryRepository>();
	const workflowPublishedVersionRepository = mock<WorkflowPublishedVersionRepository>();
	const workflowTriggerActivator = mock<WorkflowTriggerActivator>();

	const applier = new WorkflowPublicationApplier(
		logger,
		workflowRepository,
		workflowHistoryRepository,
		workflowPublishedVersionRepository,
		workflowTriggerActivator,
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

	/** Drives the trigger diff: first call returns old triggers, second returns new. */
	function setTriggerSets(oldTriggers: INode[], newTriggers: INode[]) {
		workflowTriggerActivator.getEnabledTriggerNodes
			.mockReturnValueOnce(oldTriggers)
			.mockReturnValueOnce(newTriggers);
	}

	beforeEach(() => {
		jest.clearAllMocks();
		workflowRepository.findOneBy.mockResolvedValue(makeWorkflow({ activeVersionId: 'v-1' }));
		workflowPublishedVersionRepository.findOne.mockResolvedValue(makePublishedVersion(oldVersion));
		workflowPublishedVersionRepository.setPublishedVersion.mockResolvedValue(undefined);
		workflowHistoryRepository.findOneBy.mockResolvedValue(newVersion);
		workflowTriggerActivator.getEnabledTriggerNodes.mockReturnValue([]);
		workflowTriggerActivator.getUnregisteredNonWebhookTriggerNodeIds.mockReturnValue(new Set());
		workflowTriggerActivator.activate.mockResolvedValue({ activated: [], failures: [] });
		workflowTriggerActivator.deactivate.mockResolvedValue(undefined);
		workflowTriggerActivator.updateTriggerCount.mockResolvedValue(undefined);
	});

	test('skips with workflow-not-found when the workflow is gone', async () => {
		workflowRepository.findOneBy.mockResolvedValue(null);

		const result = await applier.apply(makeRecord());

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

			const result = await applier.apply(makeRecord());

			expect(result).toEqual({ type: 'unpublished' });
			expect(workflowTriggerActivator.getEnabledTriggerNodes).toHaveBeenCalledWith(oldVersion);
			expect(workflowTriggerActivator.deactivate).toHaveBeenCalledWith(
				expect.objectContaining({ id: 'wf-1' }),
				oldVersion,
				new Set(['a', 'b']),
			);
			expect(workflowPublishedVersionRepository.removePublishedVersion).toHaveBeenCalledWith(
				'wf-1',
			);
			expect(workflowTriggerActivator.activate).not.toHaveBeenCalled();
			expect(workflowPublishedVersionRepository.setPublishedVersion).not.toHaveBeenCalled();
		});

		test('removes the mapping without deactivating when there are no triggers', async () => {
			workflowPublishedVersionRepository.findOne.mockResolvedValue(
				makePublishedVersion(oldVersion),
			);
			workflowTriggerActivator.getEnabledTriggerNodes.mockReturnValue([]);

			const result = await applier.apply(makeRecord());

			expect(result).toEqual({ type: 'unpublished' });
			expect(workflowTriggerActivator.deactivate).not.toHaveBeenCalled();
			expect(workflowPublishedVersionRepository.removePublishedVersion).toHaveBeenCalledWith(
				'wf-1',
			);
		});

		test('skips with workflow-inactive when there is no published-version mapping', async () => {
			workflowPublishedVersionRepository.findOne.mockResolvedValue(makePublishedVersion(null));

			const result = await applier.apply(makeRecord());

			expect(result).toEqual({ type: 'skipped', reason: 'workflow-inactive' });
			expect(workflowTriggerActivator.deactivate).not.toHaveBeenCalled();
			expect(workflowPublishedVersionRepository.removePublishedVersion).not.toHaveBeenCalled();
			expect(workflowPublishedVersionRepository.setPublishedVersion).not.toHaveBeenCalled();
		});

		test('propagates a teardown failure and leaves the mapping in place', async () => {
			workflowPublishedVersionRepository.findOne.mockResolvedValue(
				makePublishedVersion(oldVersion),
			);
			workflowTriggerActivator.getEnabledTriggerNodes.mockReturnValue([triggerNode('a')]);
			workflowTriggerActivator.deactivate.mockRejectedValue(new Error('teardown boom'));

			await expect(applier.apply(makeRecord())).rejects.toThrow('teardown boom');
			expect(workflowPublishedVersionRepository.removePublishedVersion).not.toHaveBeenCalled();
		});
	});

	test('returns version-missing when the published version history row is gone', async () => {
		workflowHistoryRepository.findOneBy.mockResolvedValue(null);

		const result = await applier.apply(makeRecord());

		expect(result).toEqual({ type: 'version-missing' });
		expect(workflowTriggerActivator.getEnabledTriggerNodes).not.toHaveBeenCalled();
		expect(workflowPublishedVersionRepository.setPublishedVersion).not.toHaveBeenCalled();
	});

	test('advances the published version and completes when no triggers changed', async () => {
		const trigger = triggerNode('a');
		setTriggerSets([trigger], [{ ...trigger }]);

		const result = await applier.apply(makeRecord());

		expect(result).toEqual({ type: 'completed' });
		expect(workflowPublishedVersionRepository.setPublishedVersion).toHaveBeenCalledWith(
			'wf-1',
			'v-2',
		);
		expect(workflowTriggerActivator.deactivate).not.toHaveBeenCalled();
		expect(workflowTriggerActivator.activate).not.toHaveBeenCalled();
	});

	test('registers only added triggers', async () => {
		setTriggerSets([triggerNode('a')], [triggerNode('a'), triggerNode('b')]);

		const result = await applier.apply(makeRecord());

		expect(result).toEqual({ type: 'completed' });
		expect(workflowTriggerActivator.deactivate).not.toHaveBeenCalled();
		expect(workflowTriggerActivator.activate).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'wf-1' }),
			newVersion,
			new Set(['b']),
		);
		expect(workflowPublishedVersionRepository.setPublishedVersion).toHaveBeenCalledWith(
			'wf-1',
			'v-2',
		);
	});

	test('reconciles by registering desired non-webhook triggers missing from memory', async () => {
		// Same version on both sides: a pure version diff is empty, but a live
		// trigger is not actually registered, so it must be re-added.
		const trigger = triggerNode('a');
		setTriggerSets([trigger], [{ ...trigger }]);
		workflowTriggerActivator.getUnregisteredNonWebhookTriggerNodeIds.mockReturnValue(
			new Set(['a']),
		);

		const result = await applier.apply(makeRecord());

		expect(result).toEqual({ type: 'completed' });
		expect(workflowTriggerActivator.getUnregisteredNonWebhookTriggerNodeIds).toHaveBeenCalledWith(
			'wf-1',
			[trigger],
		);
		expect(workflowTriggerActivator.deactivate).not.toHaveBeenCalled();
		expect(workflowTriggerActivator.activate).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'wf-1' }),
			newVersion,
			new Set(['a']),
		);
	});

	test('is a no-op when the version is unchanged and all non-webhook triggers are registered', async () => {
		const trigger = triggerNode('a');
		setTriggerSets([trigger], [{ ...trigger }]);
		workflowTriggerActivator.getUnregisteredNonWebhookTriggerNodeIds.mockReturnValue(new Set());

		const result = await applier.apply(makeRecord());

		expect(result).toEqual({ type: 'completed' });
		expect(workflowTriggerActivator.activate).not.toHaveBeenCalled();
		expect(workflowTriggerActivator.deactivate).not.toHaveBeenCalled();
		expect(workflowPublishedVersionRepository.setPublishedVersion).toHaveBeenCalledWith(
			'wf-1',
			'v-2',
		);
	});

	test('deregisters only removed triggers and refreshes the trigger count', async () => {
		setTriggerSets([triggerNode('a'), triggerNode('b')], [triggerNode('a')]);

		const result = await applier.apply(makeRecord());

		expect(result).toEqual({ type: 'completed' });
		expect(workflowTriggerActivator.deactivate).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'wf-1' }),
			oldVersion,
			new Set(['b']),
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
		});
		workflowPublishedVersionRepository.setPublishedVersion.mockImplementation(async () => {
			callOrder.push('advance');
		});
		workflowTriggerActivator.activate.mockImplementation(async () => {
			callOrder.push('add');
			return { activated: ['a'], failures: [] };
		});

		const result = await applier.apply(makeRecord());

		expect(result).toEqual({ type: 'completed' });
		expect(workflowTriggerActivator.deactivate).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'wf-1' }),
			oldVersion,
			new Set(['a']),
		);
		expect(workflowTriggerActivator.activate).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'wf-1' }),
			newVersion,
			new Set(['a']),
		);
		expect(callOrder).toEqual(['remove', 'advance', 'add']);
	});

	test('propagates without advancing when removing triggers throws', async () => {
		setTriggerSets([triggerNode('a'), triggerNode('b')], [triggerNode('a')]);
		workflowTriggerActivator.deactivate.mockRejectedValue(new Error('teardown failed'));

		// A teardown failure happens before the version advances, so it bubbles up
		// to the consumer (which turns it into a failed result) rather than leaving
		// a half-applied publication marked completed.
		await expect(applier.apply(makeRecord())).rejects.toThrow('teardown failed');

		expect(workflowPublishedVersionRepository.setPublishedVersion).not.toHaveBeenCalled();
		expect(workflowTriggerActivator.activate).not.toHaveBeenCalled();
	});

	test('returns failed (after advancing) when adding triggers throws unexpectedly', async () => {
		setTriggerSets([triggerNode('a')], [triggerNode('a'), triggerNode('b')]);
		workflowTriggerActivator.activate.mockRejectedValue(new Error('registration failed'));

		const result = await applier.apply(makeRecord());

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

		const result = await applier.apply(makeRecord());

		expect(result).toEqual({
			type: 'partial',
			activatedNodeIds: ['a'],
			failures: [{ nodeId: 'b', nodeName: 'b', error }],
		});
		// The new version is published despite the partial activation; no deactivation.
		expect(workflowPublishedVersionRepository.setPublishedVersion).toHaveBeenCalledWith(
			'wf-1',
			'v-2',
		);
		expect(workflowTriggerActivator.deactivate).not.toHaveBeenCalled();
	});

	test('returns partial when a deterministic failure coexists with an activated trigger', async () => {
		setTriggerSets([triggerNode('a')], [triggerNode('a'), triggerNode('b')]);
		const error = new WebhookPathTakenError('b');
		workflowTriggerActivator.activate.mockResolvedValue({
			activated: ['a'],
			failures: [{ nodeId: 'b', nodeName: 'b', error }],
		});

		const result = await applier.apply(makeRecord());

		expect(result).toEqual({
			type: 'partial',
			activatedNodeIds: ['a'],
			failures: [{ nodeId: 'b', nodeName: 'b', error }],
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

		const result = await applier.apply(makeRecord());

		// A single failure passes its error through, preserving the type.
		expect(result).toEqual({ type: 'failed', error });
		expect(workflowPublishedVersionRepository.setPublishedVersion).toHaveBeenCalledWith(
			'wf-1',
			'v-2',
		);
	});

	test('returns partial when no trigger activated but the failures are not all deterministic', async () => {
		setTriggerSets([], [triggerNode('b'), triggerNode('c')]);
		const deterministic = new WebhookPathTakenError('b');
		const transient = new Error('third-party unavailable');
		const failures = [
			{ nodeId: 'b', nodeName: 'b', error: deterministic },
			{ nodeId: 'c', nodeName: 'c', error: transient },
		];
		workflowTriggerActivator.activate.mockResolvedValue({ activated: [], failures });

		const result = await applier.apply(makeRecord());

		expect(result).toEqual({ type: 'partial', activatedNodeIds: [], failures });
	});

	test('treats a first publication (no published-version mapping yet) as all-added', async () => {
		workflowPublishedVersionRepository.findOne.mockResolvedValue(null);
		setTriggerSets([], [triggerNode('a')]);

		const result = await applier.apply(makeRecord());

		expect(result).toEqual({ type: 'completed' });
		expect(workflowTriggerActivator.deactivate).not.toHaveBeenCalled();
		expect(workflowTriggerActivator.activate).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'wf-1' }),
			newVersion,
			new Set(['a']),
		);
	});
});
