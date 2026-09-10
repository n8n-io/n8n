import {
	NodeConnectionTypes,
	type IWorkflowGroup,
	type IWorkflowGroupVisualLink,
	type IWorkflowGroupVisualLinkEndpoint,
} from 'n8n-workflow';
import type { Connection } from '@vue-flow/core';

import { RemoveNodeGroupCommand } from '@/app/models/history';
import type { useHistoryStore } from '@/app/stores/history.store';
import type { WorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import {
	CANVAS_EMPTY_GROUP_INPUT_HANDLE,
	CANVAS_EMPTY_GROUP_OUTPUT_HANDLE,
	CanvasConnectionMode,
	parseCanvasGroupNodeId,
} from './canvas.types';
import { parseCanvasConnectionHandleString } from './canvas.utils';

export function snapshotGroup(group: IWorkflowGroup): IWorkflowGroup {
	return { ...group, nodeIds: [...group.nodeIds] };
}

/**
 * Deletes a group and pushes an undo command that restores it.
 * Snapshots the group at call time, so callers pass the group whose current
 * state should be restored (e.g. a state captured before node replacements).
 */
export function deleteGroupWithHistory(
	group: IWorkflowGroup,
	workflowDocumentStore: WorkflowDocumentStore,
	historyStore: ReturnType<typeof useHistoryStore>,
) {
	const snapshot = snapshotGroup(group);
	workflowDocumentStore.deleteGroup(group.id);
	historyStore.pushCommandToUndo(new RemoveNodeGroupCommand(snapshot, Date.now()));
}

export type EmptyGroupVisualLinkMutation =
	| { handled: false }
	| { handled: true; nextNodeGroups?: IWorkflowGroup[] };

function endpointsEqual(
	left: IWorkflowGroupVisualLinkEndpoint,
	right: IWorkflowGroupVisualLinkEndpoint,
): boolean {
	return (
		left.kind === right.kind &&
		left.id === right.id &&
		left.port.type === right.port.type &&
		left.port.index === right.port.index
	);
}

function linksEqual(left: IWorkflowGroupVisualLink, right: IWorkflowGroupVisualLink): boolean {
	return endpointsEqual(left.source, right.source) && endpointsEqual(left.target, right.target);
}

function getVisualLink(
	connection: Connection,
	groupId: string,
	groupIsSource: boolean,
): IWorkflowGroupVisualLink | undefined {
	if (groupIsSource) {
		if (connection.sourceHandle !== CANVAS_EMPTY_GROUP_OUTPUT_HANDLE) return undefined;
		const target = parseCanvasConnectionHandleString(connection.targetHandle);
		if (target.mode !== CanvasConnectionMode.Input || target.type !== NodeConnectionTypes.Main) {
			return undefined;
		}
		return {
			source: {
				kind: 'group',
				id: groupId,
				port: { type: NodeConnectionTypes.Main, index: 0 },
			},
			target: {
				kind: 'node',
				id: connection.target,
				port: { type: NodeConnectionTypes.Main, index: target.index },
			},
		};
	}

	if (connection.targetHandle !== CANVAS_EMPTY_GROUP_INPUT_HANDLE) return undefined;
	const source = parseCanvasConnectionHandleString(connection.sourceHandle);
	if (source.mode !== CanvasConnectionMode.Output || source.type !== NodeConnectionTypes.Main) {
		return undefined;
	}
	return {
		source: {
			kind: 'node',
			id: connection.source,
			port: { type: NodeConnectionTypes.Main, index: source.index },
		},
		target: {
			kind: 'group',
			id: groupId,
			port: { type: NodeConnectionTypes.Main, index: 0 },
		},
	};
}

/**
 * Build the next persisted group state for a canvas connection that has one
 * true-empty group endpoint. Other connections stay on the existing node path.
 */
export function mutateEmptyGroupVisualLink(
	allGroups: IWorkflowGroup[],
	connection: Connection,
	action: 'add' | 'remove',
): EmptyGroupVisualLinkMutation {
	const sourceGroupId = parseCanvasGroupNodeId(connection.source);
	const targetGroupId = parseCanvasGroupNodeId(connection.target);

	if (sourceGroupId === undefined && targetGroupId === undefined) return { handled: false };
	if (sourceGroupId !== undefined && targetGroupId !== undefined) return { handled: true };

	const groupId = sourceGroupId ?? targetGroupId;
	if (!groupId) return { handled: true };
	const group = allGroups.find((candidate) => candidate.id === groupId);
	if (!group || group.nodeIds.length > 0) return { handled: false };

	const visualLink = getVisualLink(connection, groupId, sourceGroupId !== undefined);
	if (!visualLink) return { handled: true };

	const visualLinks =
		action === 'add'
			? [...(group.visualLinks ?? []), visualLink]
			: (group.visualLinks ?? []).filter((candidate) => !linksEqual(candidate, visualLink));

	return {
		handled: true,
		nextNodeGroups: allGroups.map((candidate) =>
			candidate.id === groupId ? { ...candidate, visualLinks } : candidate,
		),
	};
}
