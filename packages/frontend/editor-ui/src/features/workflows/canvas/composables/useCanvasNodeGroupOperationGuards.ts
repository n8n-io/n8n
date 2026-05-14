import type { IConnection, IConnections } from 'n8n-workflow';
import { computed, h } from 'vue';
import type { NotificationHandle } from 'element-plus';
import cloneDeep from 'lodash/cloneDeep';
import uniq from 'lodash/uniq';

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
type InvalidAffectedGroup = { group: CanvasNodeGroup; result: InvalidGroupValidationResult };
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

export function useCanvasNodeGroupOperationGuards() {
	const workflowsStore = useWorkflowsStore();
	const canvasNodeGroupsStore = useCanvasNodeGroupsStore();
	const workflowDocumentStore = computed(() =>
		useWorkflowDocumentStore(createWorkflowDocumentId(workflowsStore.workflowId)),
	);

	const i18n = useI18n();
	const toast = useToast();
	const { isSelectionGroupable } = useSelectionValidation();

	function applyAddConnection(
		candidateConnections: IConnections,
		connection: [IConnection, IConnection],
	): void {
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
	}

	function applyRemoveConnection(
		candidateConnections: IConnections,
		connection: [IConnection, IConnection],
	): void {
		const [sourceData, destinationData] = connection;
		const outputConnections = candidateConnections[sourceData.node]?.[sourceData.type];
		const targetConnections = outputConnections?.[sourceData.index];
		if (!outputConnections || !targetConnections) return;

		outputConnections[sourceData.index] = targetConnections.filter(
			(connectionData) =>
				connectionData.node !== destinationData.node ||
				connectionData.type !== destinationData.type ||
				connectionData.index !== destinationData.index,
		);
	}

	function applyConnectionChangesToCandidate({
		connectionsBySourceNode,
		connectionsToRemove = [],
		connectionsToAdd = [],
	}: {
		connectionsBySourceNode: IConnections;
		connectionsToRemove?: Array<[IConnection, IConnection]>;
		connectionsToAdd?: Array<[IConnection, IConnection]>;
	}): IConnections {
		const candidateConnections = cloneDeep(connectionsBySourceNode);

		for (const connection of connectionsToRemove) {
			applyRemoveConnection(candidateConnections, connection);
		}

		for (const connection of connectionsToAdd) {
			applyAddConnection(candidateConnections, connection);
		}

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
		getNodeIdsForGroup: (group: CanvasNodeGroup) => string[] = (group) => group.nodeIds,
	): { group: CanvasNodeGroup; result: InvalidGroupValidationResult } | undefined {
		for (const group of affectedGroups) {
			const result = isSelectionGroupable(getNodeIdsForGroup(group), connectionsBySourceNode);
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

	function getConnectionChangeBlockedMessageWithAction(
		group: CanvasNodeGroup,
		result: InvalidGroupValidationResult,
	) {
		let notification: NotificationHandle | undefined;
		const message = getConnectionChangeBlockedMessage(group, result);
		const ungroupAction = h(
			'a',
			{
				href: '#',
				class: 'primary-color',
				onClick: (event: MouseEvent) => {
					event.preventDefault();
					event.stopPropagation();
					canvasNodeGroupsStore.deleteGroup(group.id);
					notification?.close();
				},
			},
			i18n.baseText('canvas.selection.toolbar.ungroup'),
		);

		return {
			message: h('span', [message, ' ', ungroupAction]),
			setNotification: (value: NotificationHandle) => {
				notification = value;
			},
		};
	}

	function showConnectionChangeBlockedToast(
		titleKey: BaseTextKey,
		invalidAffectedGroup: InvalidAffectedGroup,
	) {
		const { message, setNotification } = getConnectionChangeBlockedMessageWithAction(
			invalidAffectedGroup.group,
			invalidAffectedGroup.result,
		);

		const notification = toast.showToast({
			title: i18n.baseText(titleKey),
			message,
			type: 'error',
			duration: 5000,
		});
		setNotification(notification);
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

	function showAutoExtendedToast(group: CanvasNodeGroup, candidateId: string) {
		const candidateName = workflowDocumentStore.value.getNodeById(candidateId)?.name ?? candidateId;

		toast.showToast({
			title: i18n.baseText('canvas.nodeGroup.autoExtended.title', {
				interpolate: { group: group.title },
			}),
			message: i18n.baseText('canvas.nodeGroup.autoExtended.message', {
				interpolate: {
					node: candidateName,
					group: group.title,
				},
			}),
			type: 'info',
			duration: 5000,
		});
	}

	function tryAutoExtendInvalidGroup({
		invalidAffectedGroup,
		endpointIds,
		connectionsBySourceNode,
	}: {
		invalidAffectedGroup: InvalidAffectedGroup;
		endpointIds: string[];
		connectionsBySourceNode: IConnections;
	}): boolean {
		const candidateId = getAutoExtendCandidate({
			failingGroup: invalidAffectedGroup.group,
			endpointIds,
			connectionsBySourceNode,
		});

		if (candidateId === undefined) return false;

		canvasNodeGroupsStore.addNodesToGroup(invalidAffectedGroup.group.id, [candidateId]);
		showAutoExtendedToast(invalidAffectedGroup.group, candidateId);

		return true;
	}

	function isConnectionReplacementAllowedForNodeGroups({
		nodeIds,
		connectionsToRemove,
		connectionsToAdd,
		connectionsBySourceNode,
		allowAutoExtend = true,
		blockedTitleKey = BLOCKED_TITLE_KEY.add,
	}: {
		nodeIds: string[];
		connectionsToRemove: Array<[IConnection, IConnection]>;
		connectionsToAdd: Array<[IConnection, IConnection]>;
		connectionsBySourceNode: IConnections;
		allowAutoExtend?: boolean;
		blockedTitleKey?: BaseTextKey;
	}): boolean {
		const affectedGroups = getAffectedNodeGroups(nodeIds);
		if (affectedGroups.length === 0) return true;

		const candidateConnections = applyConnectionChangesToCandidate({
			connectionsBySourceNode,
			connectionsToRemove,
			connectionsToAdd,
		});

		const invalidAffectedGroup = findInvalidGroup(affectedGroups, candidateConnections);
		if (!invalidAffectedGroup) return true;

		if (
			allowAutoExtend &&
			tryAutoExtendInvalidGroup({
				invalidAffectedGroup,
				endpointIds: nodeIds,
				connectionsBySourceNode: candidateConnections,
			})
		) {
			return true;
		}

		showConnectionChangeBlockedToast(blockedTitleKey, invalidAffectedGroup);

		return false;
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
		return isConnectionReplacementAllowedForNodeGroups({
			nodeIds,
			connectionsToRemove: action === 'remove' ? [connection] : [],
			connectionsToAdd: action === 'add' ? [connection] : [],
			connectionsBySourceNode,
			allowAutoExtend: action === 'add',
			blockedTitleKey: BLOCKED_TITLE_KEY[action],
		});
	}

	function isNodeReplacementAllowedForNodeGroups({
		previousNodeId,
		newNodeId,
		nodeIds,
		connectionsToRemove,
		connectionsToAdd,
		connectionsBySourceNode,
	}: {
		previousNodeId: string;
		newNodeId: string;
		nodeIds: string[];
		connectionsToRemove: Array<[IConnection, IConnection]>;
		connectionsToAdd: Array<[IConnection, IConnection]>;
		connectionsBySourceNode: IConnections;
	}): boolean {
		const previousGroup = canvasNodeGroupsStore.getGroupForNode(previousNodeId);
		if (!previousGroup) return true;

		const newNodeGroup = canvasNodeGroupsStore.getGroupForNode(newNodeId);
		if (newNodeGroup && newNodeGroup.id !== previousGroup.id) {
			showConnectionChangeBlockedToast(BLOCKED_TITLE_KEY.add, {
				group: previousGroup,
				result: {
					valid: false,
					reason: 'invalid-subgraph',
					errors: [],
				},
			});
			return false;
		}

		const affectedGroups = getAffectedNodeGroups([...nodeIds, previousNodeId, newNodeId]);
		if (affectedGroups.length === 0) return true;

		const candidateConnections = applyConnectionChangesToCandidate({
			connectionsBySourceNode,
			connectionsToRemove,
			connectionsToAdd,
		});
		const swappedPreviousGroupNodeIds = uniq(
			previousGroup.nodeIds.map((nodeId) => (nodeId === previousNodeId ? newNodeId : nodeId)),
		);
		const getNodeIdsForGroup = (group: CanvasNodeGroup) =>
			group.id === previousGroup.id ? swappedPreviousGroupNodeIds : group.nodeIds;

		const invalidAffectedGroup = findInvalidGroup(
			affectedGroups,
			candidateConnections,
			getNodeIdsForGroup,
		);
		if (!invalidAffectedGroup) return true;

		showConnectionChangeBlockedToast(BLOCKED_TITLE_KEY.add, invalidAffectedGroup);

		return false;
	}

	return {
		isConnectionChangeAllowedForNodeGroups,
		isConnectionReplacementAllowedForNodeGroups,
		isNodeReplacementAllowedForNodeGroups,
	};
}
