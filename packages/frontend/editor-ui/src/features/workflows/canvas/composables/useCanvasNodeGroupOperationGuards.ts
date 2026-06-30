import type { IConnection, IConnections, IWorkflowGroup } from 'n8n-workflow';
import { computed, h } from 'vue';
import type { NotificationHandle } from 'element-plus';
import cloneDeep from 'lodash/cloneDeep';
import uniq from 'lodash/uniq';

import { CANVAS_NODES_GROUPING_EXPERIMENT } from '@/app/constants';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import {
	useSelectionValidation,
	type GroupValidationResult,
} from '@/app/composables/useSelectionValidation';
import { usePostHog } from '@/app/stores/posthog.store';
import { useToast } from '@/app/composables/useToast';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useHistoryStore } from '@/app/stores/history.store';
import { RemoveNodeGroupCommand } from '@/app/models/history';
import { useCanvasNodeGroupTelemetry } from './useCanvasNodeGroupTelemetry';

type ConnectionChangeAction = 'add' | 'remove';
type InvalidGroupValidationResult = Extract<GroupValidationResult, { valid: false }>;
type InvalidAffectedGroup = { group: IWorkflowGroup; result: InvalidGroupValidationResult };

export type NodeGroupAutoExtend = { group: IWorkflowGroup; candidateId: string };

export type NodeGroupConnectionGuardResult =
	| { outcome: 'proceed' }
	| { outcome: 'auto-extend'; autoExtend: NodeGroupAutoExtend }
	| { outcome: 'abort' };

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
	const posthogStore = usePostHog();
	const workflowDocumentStore = computed(() =>
		useWorkflowDocumentStore(createWorkflowDocumentId(workflowsStore.workflowId)),
	);
	const isCanvasNodeGroupingEnabled = computed(() =>
		posthogStore.isFeatureEnabled(CANVAS_NODES_GROUPING_EXPERIMENT.name),
	);

	const historyStore = useHistoryStore();
	const i18n = useI18n();
	const toast = useToast();
	const groupTelemetry = useCanvasNodeGroupTelemetry();
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

	function getAffectedNodeGroups(nodeIds: string[]): IWorkflowGroup[] {
		const affectedGroups = new Map<string, IWorkflowGroup>();
		for (const nodeId of nodeIds) {
			const group = workflowDocumentStore.value.getGroupForNode(nodeId);
			if (group) {
				affectedGroups.set(group.id, group);
			}
		}

		return Array.from(affectedGroups.values());
	}

	function findInvalidGroup(
		affectedGroups: IWorkflowGroup[],
		connectionsBySourceNode: IConnections,
		getNodeIdsForGroup: (group: IWorkflowGroup) => string[] = (group) => group.nodeIds,
	): { group: IWorkflowGroup; result: InvalidGroupValidationResult } | undefined {
		for (const group of affectedGroups) {
			const result = isSelectionGroupable(getNodeIdsForGroup(group), connectionsBySourceNode, {
				ignoredNodeGroupIds: [group.id],
			});
			if (!result.valid) return { group, result };
		}
		return undefined;
	}

	function getConnectionChangeBlockedMessage(
		group: IWorkflowGroup,
		result: InvalidGroupValidationResult,
	): string {
		const groupInterpolation = { group: group.name };

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

		const key: BaseTextKey = errorCodeKey ?? FALLBACK_MESSAGE_KEY;
		return i18n.baseText(key, { interpolate: groupInterpolation });
	}

	function getConnectionChangeBlockedMessageWithAction(
		group: IWorkflowGroup,
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
					const snapshot = { ...group, nodeIds: [...group.nodeIds] };
					workflowDocumentStore.value.deleteGroup(group.id);
					historyStore.pushCommandToUndo(new RemoveNodeGroupCommand(snapshot, Date.now()));
					groupTelemetry.trackUngrouped(group, 'update-blocked-toast');
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
		failingGroup: IWorkflowGroup;
		endpointIds: string[];
		connectionsBySourceNode: IConnections;
	}): string | undefined {
		const memberSet = new Set(failingGroup.nodeIds);
		const offGroupEndpoints = endpointIds.filter((id) => !memberSet.has(id));
		if (offGroupEndpoints.length !== 1) return undefined;

		const [candidateId] = offGroupEndpoints;
		if (workflowDocumentStore.value.getGroupForNode(candidateId)) return undefined;

		const result = isSelectionGroupable(
			[...failingGroup.nodeIds, candidateId],
			connectionsBySourceNode,
			{ ignoredNodeGroupIds: [failingGroup.id] },
		);
		if (!result.valid) return undefined;

		return candidateId;
	}

	function showAutoExtendedToast(group: IWorkflowGroup, candidateId: string) {
		const candidateName = workflowDocumentStore.value.getNodeById(candidateId)?.name ?? candidateId;

		toast.showToast({
			title: i18n.baseText('canvas.nodeGroup.autoExtended.title', {
				interpolate: { group: group.name },
			}),
			message: i18n.baseText('canvas.nodeGroup.autoExtended.message', {
				interpolate: {
					node: candidateName,
					group: group.name,
				},
			}),
			type: 'info',
			duration: 5000,
		});
	}

	// Adds the node to the group and notifies the user
	function applyNodeGroupAutoExtend({ group, candidateId }: NodeGroupAutoExtend) {
		workflowDocumentStore.value.addNodesToGroup(group.id, [candidateId]);
		showAutoExtendedToast(group, candidateId);
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
	}): NodeGroupConnectionGuardResult {
		if (!isCanvasNodeGroupingEnabled.value) return { outcome: 'proceed' };

		const affectedGroups = getAffectedNodeGroups(nodeIds);
		if (affectedGroups.length === 0) return { outcome: 'proceed' };

		const candidateConnections = applyConnectionChangesToCandidate({
			connectionsBySourceNode,
			connectionsToRemove,
			connectionsToAdd,
		});

		const invalidAffectedGroup = findInvalidGroup(affectedGroups, candidateConnections);
		if (!invalidAffectedGroup) return { outcome: 'proceed' };

		if (allowAutoExtend) {
			const candidateId = getAutoExtendCandidate({
				failingGroup: invalidAffectedGroup.group,
				endpointIds: nodeIds,
				connectionsBySourceNode: candidateConnections,
			});
			if (candidateId !== undefined) {
				return {
					outcome: 'auto-extend',
					autoExtend: { group: invalidAffectedGroup.group, candidateId },
				};
			}
		}

		showConnectionChangeBlockedToast(blockedTitleKey, invalidAffectedGroup);

		return { outcome: 'abort' };
	}

	function isConnectionRemovalAllowedForNodeGroups({
		nodeIds,
		connection,
		connectionsBySourceNode,
	}: {
		nodeIds: string[];
		connection: [IConnection, IConnection];
		connectionsBySourceNode: IConnections;
	}): boolean {
		return (
			isConnectionReplacementAllowedForNodeGroups({
				nodeIds,
				connectionsToRemove: [connection],
				connectionsToAdd: [],
				connectionsBySourceNode,
				allowAutoExtend: false,
				blockedTitleKey: BLOCKED_TITLE_KEY.remove,
			}).outcome === 'proceed'
		);
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
		if (!isCanvasNodeGroupingEnabled.value) return true;

		const previousGroup = workflowDocumentStore.value.getGroupForNode(previousNodeId);
		if (!previousGroup) return true;

		const newNodeGroup = workflowDocumentStore.value.getGroupForNode(newNodeId);
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
		const getNodeIdsForGroup = (group: IWorkflowGroup) =>
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
		isConnectionRemovalAllowedForNodeGroups,
		isConnectionReplacementAllowedForNodeGroups,
		isNodeReplacementAllowedForNodeGroups,
		applyNodeGroupAutoExtend,
	};
}
