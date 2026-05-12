import type { IConnection, IConnections } from 'n8n-workflow';
import { computed } from 'vue';
import cloneDeep from 'lodash/cloneDeep';

import { useI18n, type BaseTextKey } from '@n8n/i18n';
import {
	useSelectionValidation,
	type GroupValidationResult,
} from '@/app/composables/useSelectionValidation';
import { useToast } from '@/app/composables/useToast';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import {
	useCanvasNodeGroupsStore,
	type CanvasNodeGroup,
} from '@/features/workflows/canvas/stores/canvasNodeGroups.store';

type ConnectionChangeAction = 'add' | 'remove';
type InvalidGroupValidationResult = Extract<GroupValidationResult, { valid: false }>;
type ExtractableErrorCode = NonNullable<
	Extract<
		InvalidGroupValidationResult,
		{ reason: 'invalid-subgraph' }
	>['errors'][number]['errorCode']
>;

const BLOCKED_TITLE_KEY: Record<ConnectionChangeAction, BaseTextKey> = {
	add: 'canvas.nodeGroup.connectionAddBlocked.title',
	remove: 'canvas.nodeGroup.connectionRemoveBlocked.title',
};

const MESSAGE_KEY_BY_REASON: Partial<Record<InvalidGroupValidationResult['reason'], BaseTextKey>> =
	{
		'multiple-input-branches': 'canvas.nodeGroup.connectionChangeBlocked.multipleInputBranches',
		'multiple-output-branches': 'canvas.nodeGroup.connectionChangeBlocked.multipleOutputBranches',
	};

const MESSAGE_KEY_BY_ERROR_CODE: Record<ExtractableErrorCode, BaseTextKey> = {
	'Multiple Input Nodes': 'canvas.nodeGroup.connectionChangeBlocked.multipleInputNodes',
	'Input Edge To Non-Root Node': 'canvas.nodeGroup.connectionChangeBlocked.inputEdgeToNonRoot',
	'Multiple Output Nodes': 'canvas.nodeGroup.connectionChangeBlocked.multipleOutputNodes',
	'Output Edge From Non-Leaf Node':
		'canvas.nodeGroup.connectionChangeBlocked.outputEdgeFromNonLeaf',
	'No Continuous Path From Root To Leaf In Selection':
		'canvas.nodeGroup.connectionChangeBlocked.noContinuousPathFromRootToLeaf',
};

const FALLBACK_MESSAGE_KEY: BaseTextKey = 'canvas.nodeGroup.connectionChangeBlocked.message';

export function useCanvasNodeGroupOperations() {
	const workflowsStore = useWorkflowsStore();
	const canvasNodeGroupsStore = useCanvasNodeGroupsStore();
	const workflowDocumentStore = computed(() =>
		useWorkflowDocumentStore(createWorkflowDocumentId(workflowsStore.workflowId)),
	);

	const i18n = useI18n();
	const toast = useToast();
	const { isSelectionGroupable } = useSelectionValidation();

	function addConnectionToCandidate(
		connectionsBySourceNode: IConnections,
		connection: [IConnection, IConnection],
	): IConnections {
		const candidateConnections = cloneDeep(connectionsBySourceNode);
		const [sourceData, destinationData] = connection;

		candidateConnections[sourceData.node] = candidateConnections[sourceData.node] ?? {};
		const sourceNodeConnections = candidateConnections[sourceData.node];

		sourceNodeConnections[sourceData.type] = sourceNodeConnections[sourceData.type] ?? [];
		const outputConnections = sourceNodeConnections[sourceData.type];

		while (outputConnections.length <= sourceData.index) {
			outputConnections.push([]);
		}

		outputConnections[sourceData.index] = outputConnections[sourceData.index] ?? [];
		outputConnections[sourceData.index]?.push(destinationData);

		return candidateConnections;
	}

	function removeConnectionFromCandidate(
		connectionsBySourceNode: IConnections,
		connection: [IConnection, IConnection],
	): IConnections {
		const candidateConnections = cloneDeep(connectionsBySourceNode);
		const [sourceData, destinationData] = connection;
		const sourceNodeConnections = candidateConnections[sourceData.node];
		if (!sourceNodeConnections) return candidateConnections;

		const outputConnections = sourceNodeConnections[sourceData.type];
		if (!outputConnections) return candidateConnections;

		const targetConnections = outputConnections[sourceData.index];
		if (!targetConnections) return candidateConnections;

		outputConnections[sourceData.index] = targetConnections.filter(
			(connectionData) =>
				connectionData.node !== destinationData.node ||
				connectionData.type !== destinationData.type ||
				connectionData.index !== destinationData.index,
		);

		return candidateConnections;
	}

	function getAffectedNodeGroups(nodeIds: string[]): CanvasNodeGroup[] {
		const affectedGroups = new Map<string, CanvasNodeGroup>();
		for (const nodeId of nodeIds) {
			const group = canvasNodeGroupsStore.getGroupForNode(nodeId);
			if (group) {
				affectedGroups.set(group.id, group);
			}
		}

		return Array.from(affectedGroups.values());
	}

	function findInvalidGroup(
		affectedGroups: CanvasNodeGroup[],
		connectionsBySourceNode: IConnections,
	): { group: CanvasNodeGroup; result: InvalidGroupValidationResult } | undefined {
		for (const group of affectedGroups) {
			const result = isSelectionGroupable(group.nodeIds, connectionsBySourceNode);
			if (!result.valid) return { group, result };
		}
		return undefined;
	}

	function getConnectionChangeBlockedMessage(
		group: CanvasNodeGroup,
		result: InvalidGroupValidationResult,
	): string {
		const groupInterpolation = { group: group.title };

		if (result.reason === 'non-main-boundary') {
			return i18n.baseText('canvas.nodeGroup.connectionChangeBlocked.nonMainBoundary', {
				interpolate: {
					...groupInterpolation,
					source: result.connection.source,
					target: result.connection.target,
				},
			});
		}

		const errorCodeKey =
			result.reason === 'invalid-subgraph' && result.errors[0]
				? MESSAGE_KEY_BY_ERROR_CODE[result.errors[0].errorCode]
				: undefined;

		const key: BaseTextKey =
			errorCodeKey ?? MESSAGE_KEY_BY_REASON[result.reason] ?? FALLBACK_MESSAGE_KEY;
		return i18n.baseText(key, { interpolate: groupInterpolation });
	}

	function getAutoExtendCandidate({
		failingGroup,
		endpointIds,
		connectionsBySourceNode,
	}: {
		failingGroup: CanvasNodeGroup;
		endpointIds: string[];
		connectionsBySourceNode: IConnections;
	}): string | undefined {
		const memberSet = new Set(failingGroup.nodeIds);
		const offGroupEndpoints = endpointIds.filter((id) => !memberSet.has(id));
		if (offGroupEndpoints.length !== 1) return undefined;

		const [candidateId] = offGroupEndpoints;
		if (canvasNodeGroupsStore.getGroupForNode(candidateId)) return undefined;

		const result = isSelectionGroupable(
			[...failingGroup.nodeIds, candidateId],
			connectionsBySourceNode,
		);
		if (!result.valid) return undefined;

		return candidateId;
	}

	function isConnectionChangeAllowedForNodeGroups({
		nodeIds,
		connection,
		connectionsBySourceNode,
		action,
	}: {
		nodeIds: string[];
		connection: [IConnection, IConnection];
		connectionsBySourceNode: IConnections;
		action: ConnectionChangeAction;
	}): boolean {
		const affectedGroups = getAffectedNodeGroups(nodeIds);
		if (affectedGroups.length === 0) return true;

		const candidateConnections =
			action === 'add'
				? addConnectionToCandidate(connectionsBySourceNode, connection)
				: removeConnectionFromCandidate(connectionsBySourceNode, connection);

		const invalidAffectedGroup = findInvalidGroup(affectedGroups, candidateConnections);
		if (!invalidAffectedGroup) return true;

		if (action === 'add') {
			const candidateId = getAutoExtendCandidate({
				failingGroup: invalidAffectedGroup.group,
				endpointIds: nodeIds,
				connectionsBySourceNode: candidateConnections,
			});

			if (candidateId !== undefined) {
				canvasNodeGroupsStore.addNodesToGroup(invalidAffectedGroup.group.id, [candidateId]);

				const candidateName =
					workflowDocumentStore.value.getNodeById(candidateId)?.name ?? candidateId;

				toast.showToast({
					title: i18n.baseText('canvas.nodeGroup.autoExtended.title', {
						interpolate: { group: invalidAffectedGroup.group.title },
					}),
					message: i18n.baseText('canvas.nodeGroup.autoExtended.message', {
						interpolate: {
							node: candidateName,
							group: invalidAffectedGroup.group.title,
						},
					}),
					type: 'info',
					duration: 5000,
				});

				return true;
			}
		}

		toast.showToast({
			title: i18n.baseText(BLOCKED_TITLE_KEY[action]),
			message: getConnectionChangeBlockedMessage(
				invalidAffectedGroup.group,
				invalidAffectedGroup.result,
			),
			type: 'error',
			duration: 5000,
		});

		return false;
	}

	return {
		isConnectionChangeAllowedForNodeGroups,
	};
}
