import type { IWorkflowGroup } from 'n8n-workflow';
import type { INodeUi } from '@/Interface';
import type {
	CanvasConnection,
	CanvasConnectionData,
	CanvasNodeGroupData,
	CanvasNodeGroupNode,
	GroupExecutionStatus,
} from '../canvas.types';
import {
	CANVAS_NODE_GROUP_HANDLE_LEFT,
	CANVAS_NODE_GROUP_HANDLE_RIGHT,
	CANVAS_NODE_GROUP_ID_PREFIX,
	CANVAS_NODE_GROUP_TYPE,
} from '../canvas.types';
import {
	GROUP_HEADER_HEIGHT,
	GROUP_HEADER_WIDTH_COLLAPSED,
	GROUP_PADDING_X,
	GROUP_PADDING_Y_TOP,
} from '../stores/canvasNodeGroups.constants';
import { createCanvasConnectionId } from '../canvas.utils';
import { DEFAULT_NODE_SIZE } from '@/app/utils/nodeViewUtils';

export interface MemberRect {
	x: number;
	y: number;
	width: number;
	height: number;
}

/**
 * Per-node dimensions used to size the group member bounding rect.
 * Callers supply this so the rect tracks the actual rendered footprint
 * for node types whose width or height varies (configurable inputs,
 * configuration nodes, sticky notes). Returning `undefined` falls back
 * to `DEFAULT_NODE_SIZE`.
 */
export type GetNodeDimensions = (id: string) => { width: number; height: number } | undefined;

/**
 * Compute the bounding rect of a set of member nodes from canonical store
 * positions. Stable when members are hidden (collapsed groups).
 */
export function computeMemberRectFromStore(
	memberIds: string[],
	getNodeById: (id: string) => INodeUi | undefined,
	getNodeDimensions?: GetNodeDimensions,
): MemberRect {
	const members = memberIds
		.map((id) => getNodeById(id))
		.filter((n): n is INodeUi => n !== undefined);

	if (members.length === 0) {
		return { x: 0, y: 0, width: DEFAULT_NODE_SIZE[0], height: DEFAULT_NODE_SIZE[1] };
	}

	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;
	// Dimension precedence: caller-supplied, then per-node parameters
	// (sticky notes carry their own), then the design-system default.
	for (const node of members) {
		const x = node.position[0];
		const y = node.position[1];
		const supplied = getNodeDimensions?.(node.id);
		const width =
			supplied?.width ?? (node.parameters?.width as number | undefined) ?? DEFAULT_NODE_SIZE[0];
		const height =
			supplied?.height ?? (node.parameters?.height as number | undefined) ?? DEFAULT_NODE_SIZE[1];
		if (x < minX) minX = x;
		if (y < minY) minY = y;
		if (x + width > maxX) maxX = x + width;
		if (y + height > maxY) maxY = y + height;
	}

	return {
		x: minX,
		y: minY,
		width: maxX - minX,
		height: maxY - minY,
	};
}

export interface GroupAggregateInputs {
	nodeExecutionRunningById: Record<string, boolean>;
	nodeExecutionWaitingForNextById: Record<string, boolean>;
	nodeHasIssuesById: Record<string, boolean>;
	nodeExecutionStatusById: Record<string, string | undefined>;
	nodeExecutionRunDataIterationsById: Record<string, number>;
}

/**
 * Aggregate per-member execution state into a single group-level status.
 *
 * Priority:
 * - `running`   if any member is running or waiting-for-next.
 * - `error`     if any member has issues or executionStatus 'error' / 'crashed'.
 * - `success`   only if at least one member is 'success' and every other
 *               member is 'success' or 'unknown' (didn't run — e.g. an
 *               untaken conditional branch).
 * - `undefined` (idle) otherwise, including the all-`unknown` case.
 */
export function aggregateGroupStatus(
	memberIds: string[],
	{
		nodeExecutionRunningById,
		nodeExecutionWaitingForNextById,
		nodeHasIssuesById,
		nodeExecutionStatusById,
	}: GroupAggregateInputs,
): GroupExecutionStatus {
	let anySuccess = false;
	let anyError = false;
	let anyOther = false;

	for (const id of memberIds) {
		if (nodeExecutionRunningById[id] || nodeExecutionWaitingForNextById[id]) {
			return 'running';
		}
		const status = nodeExecutionStatusById[id];
		if (nodeHasIssuesById[id] || status === 'error' || status === 'crashed') {
			anyError = true;
			continue;
		}
		if (status === 'success') {
			anySuccess = true;
		} else if (status !== undefined && status !== 'unknown') {
			anyOther = true;
		}
	}

	if (anyError) return 'error';
	if (anySuccess && !anyOther) return 'success';
	return undefined;
}

/**
 * Sum runData iteration counts across a group's members. Used for the small
 * iteration-count badge next to the success ✓.
 */
export function aggregateRunDataIterations(
	memberIds: string[],
	nodeExecutionRunDataIterationsById: Record<string, number>,
): number {
	let max = 0;
	for (const id of memberIds) {
		const iter = nodeExecutionRunDataIterationsById[id] ?? 0;
		if (iter > max) max = iter;
	}
	return max;
}

export interface MapGroupsToVueFlowNodesInputs {
	allGroups: IWorkflowGroup[];
	getNodeById: (id: string) => INodeUi | undefined;
	getNodeDimensions?: GetNodeDimensions;
	isGroupCollapsed: (id: string) => boolean;
	autofocusGroupId: string | null;
	readOnly: boolean;
	aggregates: GroupAggregateInputs;
	nodeExecutionRunDataIterationsById: Record<string, number>;
}

/**
 * Map every workflow group into a single `canvas-node-group` VueFlow node
 * (the title bar + frame). Members are NOT included here; they are emitted
 * separately by `mappedNodes`.
 */
export function mapGroupsToVueFlowNodes({
	allGroups,
	getNodeById,
	getNodeDimensions,
	isGroupCollapsed,
	autofocusGroupId,
	readOnly,
	aggregates,
	nodeExecutionRunDataIterationsById,
}: MapGroupsToVueFlowNodesInputs): CanvasNodeGroupNode[] {
	const out: CanvasNodeGroupNode[] = [];
	for (const group of allGroups) {
		// Skip groups whose members are all unresolved — the rect would
		// otherwise fall back to (0, 0) and place the title bar at the
		// canvas origin. The group itself stays in the document and will
		// re-emit once a member resolves.
		const hasMember = group.nodeIds.some((id) => getNodeById(id) !== undefined);
		if (!hasMember) continue;
		const memberRect = computeMemberRectFromStore(group.nodeIds, getNodeById, getNodeDimensions);
		const collapsed = isGroupCollapsed(group.id);
		const width = collapsed ? GROUP_HEADER_WIDTH_COLLAPSED : memberRect.width + 2 * GROUP_PADDING_X;
		const data: CanvasNodeGroupData = {
			group,
			memberRect,
			isCollapsed: collapsed,
			autofocusTitle: autofocusGroupId === group.id,
			groupStatus: aggregateGroupStatus(group.nodeIds, aggregates),
			runDataIterations: aggregateRunDataIterations(
				group.nodeIds,
				nodeExecutionRunDataIterationsById,
			),
		};
		out.push({
			id: `${CANVAS_NODE_GROUP_ID_PREFIX}${group.id}`,
			type: CANVAS_NODE_GROUP_TYPE,
			position: {
				x: memberRect.x - GROUP_PADDING_X,
				y: memberRect.y - GROUP_PADDING_Y_TOP - GROUP_HEADER_HEIGHT,
			},
			width,
			height: GROUP_HEADER_HEIGHT,
			draggable: !readOnly,
			// Selectable only when the title bar represents
			// the whole group as a single visual surface
			selectable: !readOnly && collapsed,
			connectable: false,
			// Behind member nodes so the expanded frame doesn't overlap them.
			zIndex: -1,
			data,
		});
	}
	return out;
}

/**
 * Build a Map<nodeId, IWorkflowGroup> for nodes inside a collapsed group.
 * Used to look up "is this endpoint of an edge currently hidden inside a
 * collapsed group, and if so, which group does it belong to?".
 */
export function buildCollapsedGroupByNodeId(
	allGroups: IWorkflowGroup[],
	isGroupCollapsed: (id: string) => boolean,
): Map<string, IWorkflowGroup> {
	const result = new Map<string, IWorkflowGroup>();
	for (const group of allGroups) {
		if (!isGroupCollapsed(group.id)) continue;
		for (const nodeId of group.nodeIds) {
			result.set(nodeId, group);
		}
	}
	return result;
}

/**
 * Re-anchor connections crossing a collapsed group's boundary onto the
 * group's title bar (left / right handles). Edges fully inside a collapsed
 * group are dropped. Edges that converge on the same external endpoint
 * (same node + same handle) collapse into a single rendered line; status
 * is promoted on merge (running > error > pinned > success > undefined) so
 * a merged line never looks idle when something behind it isn't.
 */
const STATUS_PRIORITY: Record<NonNullable<CanvasConnectionData['status']> | 'undefined', number> = {
	running: 4,
	error: 3,
	pinned: 2,
	success: 1,
	undefined: 0,
};

function pickHigherPriorityStatus(
	a: CanvasConnectionData['status'],
	b: CanvasConnectionData['status'],
): CanvasConnectionData['status'] {
	const aKey = (a ?? 'undefined') as keyof typeof STATUS_PRIORITY;
	const bKey = (b ?? 'undefined') as keyof typeof STATUS_PRIORITY;
	return STATUS_PRIORITY[aKey] >= STATUS_PRIORITY[bKey] ? a : b;
}

export interface CanvasConnectionWithMergeFlag extends CanvasConnection {
	data?: CanvasConnectionData & { merged?: boolean };
}

export function reanchorCollapsedConnections(
	connections: CanvasConnection[],
	collapsedGroupByNodeId: Map<string, IWorkflowGroup>,
): CanvasConnectionWithMergeFlag[] {
	if (collapsedGroupByNodeId.size === 0) return connections as CanvasConnectionWithMergeFlag[];

	const byKey = new Map<string, CanvasConnectionWithMergeFlag>();
	const result: CanvasConnectionWithMergeFlag[] = [];

	for (const conn of connections) {
		const sourceGroup = collapsedGroupByNodeId.get(conn.source);
		const targetGroup = collapsedGroupByNodeId.get(conn.target);

		// Both endpoints inside the same collapsed group → drop entirely.
		if (sourceGroup && targetGroup && sourceGroup.id === targetGroup.id) {
			continue;
		}

		if (!sourceGroup && !targetGroup) {
			// External-only edge — keep as-is.
			result.push(conn);
			continue;
		}

		const sourceId = sourceGroup ? `${CANVAS_NODE_GROUP_ID_PREFIX}${sourceGroup.id}` : conn.source;
		const targetId = targetGroup ? `${CANVAS_NODE_GROUP_ID_PREFIX}${targetGroup.id}` : conn.target;
		const sourceHandle = sourceGroup ? CANVAS_NODE_GROUP_HANDLE_RIGHT : conn.sourceHandle;
		const targetHandle = targetGroup ? CANVAS_NODE_GROUP_HANDLE_LEFT : conn.targetHandle;

		const dedupeKey = `${sourceId}|${sourceHandle}|${targetId}|${targetHandle}`;
		const existing = byKey.get(dedupeKey);

		if (existing) {
			// Promote status, mark merged so the label drops out.
			existing.data = {
				...(existing.data as CanvasConnectionData),
				status: pickHigherPriorityStatus(existing.data?.status, conn.data?.status),
				merged: true,
			};
			continue;
		}

		const rewritten: CanvasConnectionWithMergeFlag = {
			...conn,
			id: createCanvasConnectionId({
				source: sourceId,
				sourceHandle,
				target: targetId,
				targetHandle,
			}),
			source: sourceId,
			target: targetId,
			sourceHandle,
			targetHandle,
		};

		byKey.set(dedupeKey, rewritten);
		result.push(rewritten);
	}

	return result;
}
