import type { ExecutionStatus, IWorkflowGroup } from 'n8n-workflow';
import type { INodeUi } from '@/Interface';
import type { CanvasConnection, CanvasGroupNode, CanvasGroupNodeData } from '../canvas.types';
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
import { DEFAULT_NODE_SIZE, GRID_SIZE } from '@/app/utils/nodeViewUtils';
import { STICKY_NODE_TYPE } from '@/app/constants/nodeTypes';

export interface NodesRect {
	x: number;
	y: number;
	width: number;
	height: number;
}

/**
 * Size lookup for nodes that aren't the default size
 * (configurable inputs, config nodes, sticky notes).
 */
export type GetNodeDisplaySize = (id: string) => { width: number; height: number } | undefined;

// Sticky is the only node type whose dimensions live in parameters today.
// typeof-narrow keeps the read type-safe
function readStickyDimensions(node: INodeUi): { width: number; height: number } | undefined {
	if (node.type !== STICKY_NODE_TYPE) return undefined;
	const { width, height } = node.parameters ?? {};
	if (typeof width !== 'number' || typeof height !== 'number') return undefined;
	return { width, height };
}

// Precedence: caller-supplied → sticky parameters → DEFAULT_NODE_SIZE.
function resolveNodeDimensions(
	node: INodeUi,
	getNodeDisplaySize?: GetNodeDisplaySize,
): { width: number; height: number } {
	const supplied = getNodeDisplaySize?.(node.id);
	const sticky = readStickyDimensions(node);
	return {
		width: supplied?.width ?? sticky?.width ?? DEFAULT_NODE_SIZE[0],
		height: supplied?.height ?? sticky?.height ?? DEFAULT_NODE_SIZE[1],
	};
}

/**
 * Title bar layout (position + width) derived from the group's nodes-bounding
 * rect. Snaps the position to the canvas grid; if it didn't, VueFlow's
 * `snap-to-grid` would shift the title bar on the first drag.
 *
 * A collapsed title bar is a fixed-size chip ({@link GROUP_HEADER_WIDTH_COLLAPSED}).
 * An expanded one spans the member cluster (rect width + horizontal padding),
 * floored at the collapsed width so a tight cluster never shrinks the header
 * below the chip size.
 */
export function titleBarFromNodesRect(
	nodesRect: NodesRect,
	collapsed: boolean,
): {
	position: { x: number; y: number };
	width: number;
} {
	const snap = (v: number) => Math.round(v / GRID_SIZE) * GRID_SIZE;
	const contentWidth = nodesRect.width + 2 * GROUP_PADDING_X;
	return {
		position: {
			x: snap(nodesRect.x - GROUP_PADDING_X),
			y: snap(nodesRect.y - GROUP_PADDING_Y_TOP - GROUP_HEADER_HEIGHT),
		},
		width: collapsed
			? GROUP_HEADER_WIDTH_COLLAPSED
			: Math.max(contentWidth, GROUP_HEADER_WIDTH_COLLAPSED),
	};
}

/**
 * Bounding rect of a group's nodes — used to size and position the title
 * bar and frame. Reads from workflow store positions (canonical) rather than
 * VueFlow runtime, which can lag, be uninitialized, or be hidden when the
 * owning group is collapsed.
 *
 * `positionOverrides` lets the drag-time sync substitute live positions for
 * dragged nodes (whose store position lags until drag-stop).
 */
export function computeNodesRectFromStore(
	nodeIds: string[],
	getNodeById: (id: string) => INodeUi | undefined,
	getNodeDisplaySize?: GetNodeDisplaySize,
	positionOverrides?: Map<string, { x: number; y: number }>,
): NodesRect {
	const nodes = nodeIds.map((id) => getNodeById(id)).filter((n): n is INodeUi => n !== undefined);

	if (nodes.length === 0) {
		return { x: 0, y: 0, width: 0, height: 0 };
	}

	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;

	for (const node of nodes) {
		const override = positionOverrides?.get(node.id);
		const x = override?.x ?? node.position[0];
		const y = override?.y ?? node.position[1];
		const { width, height } = resolveNodeDimensions(node, getNodeDisplaySize);
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
	nodeExecutionWaitingById: Record<string, string | undefined>;
	nodeHasIssuesById: Record<string, boolean>;
	nodeExecutionStatusById: Record<string, ExecutionStatus>;
	nodeIterationsById: Record<string, number>;
}

/**
 * Aggregate per-node execution state into a single group-level status,
 * narrowed from `ExecutionStatus`.
 *
 * Priority mirrors the single-node CSS rule order (later rules win), so the
 * group surfaces the same dominant state a user would see on one of its nodes:
 *   waiting > running > crashed > error > success > idle
 *
 * - `waiting`   any node is paused waiting for input (form, webhook, etc.).
 * - `running`   any node is running or queued to start next.
 * - `crashed`   any node has executionStatus 'crashed'. Surfaced
 *               distinctly so the data layer doesn't lose info; the title
 *               bar still maps it to the error visual, matching how the
 *               single-node visual treats crashed via `hasExecutionErrors`.
 * - `error`     any node has issues or executionStatus 'error'.
 *               NB: a node that errored with `onError=continue` still
 *               contributes here — that matches the single-node visual,
 *               which also flags the offending node despite the workflow
 *               succeeding overall.
 * - `success`   at least one node is 'success' and every other node is
 *               'success' or 'unknown' (didn't run — e.g. an untaken
 *               conditional branch).
 * - `undefined` (idle) otherwise. 'canceled' / 'new' / 'unknown' fall
 *               through here because the single-node visual gives them no
 *               dedicated class either.
 */
export function aggregateGroupStatus(
	nodeIds: string[],
	{
		nodeExecutionRunningById,
		nodeExecutionWaitingForNextById,
		nodeExecutionWaitingById,
		nodeHasIssuesById,
		nodeExecutionStatusById,
	}: GroupAggregateInputs,
): ExecutionStatus | undefined {
	let anyWaiting = false;
	let anyRunning = false;
	let anyCrashed = false;
	let anyError = false;
	let anySuccess = false;
	let anyOther = false;

	for (const id of nodeIds) {
		const status = nodeExecutionStatusById[id];

		if (nodeExecutionWaitingById[id] || status === 'waiting') {
			anyWaiting = true;
			continue;
		}
		if (nodeExecutionRunningById[id] || nodeExecutionWaitingForNextById[id]) {
			anyRunning = true;
			continue;
		}
		if (status === 'crashed') {
			anyCrashed = true;
			continue;
		}
		if (nodeHasIssuesById[id] || status === 'error') {
			anyError = true;
			continue;
		}
		if (status === 'success') {
			anySuccess = true;
		} else if (
			status !== undefined &&
			status !== 'unknown' &&
			status !== 'new' &&
			status !== 'canceled'
		) {
			anyOther = true;
		}
	}

	if (anyWaiting) return 'waiting';
	if (anyRunning) return 'running';
	if (anyCrashed) return 'crashed';
	if (anyError) return 'error';
	if (anySuccess && !anyOther) return 'success';
	return undefined;
}

/**
 * Largest per-node iteration count across the group. Used for the small
 * count badge next to the success ✓ — the badge shows the most-iterated
 * node so loop/foreach groups surface their iteration depth.
 */
export function aggregateMaxNodeIterations(
	nodeIds: string[],
	nodeIterationsById: Record<string, number>,
): number {
	let max = 0;
	for (const id of nodeIds) {
		const iter = nodeIterationsById[id] ?? 0;
		if (iter > max) max = iter;
	}
	return max;
}

export interface MapGroupsToVueFlowNodesInputs {
	allGroups: IWorkflowGroup[];
	getNodeById: (id: string) => INodeUi | undefined;
	getNodeDisplaySize?: GetNodeDisplaySize;
	isGroupCollapsed: (id: string) => boolean;
	readOnly: boolean;
	aggregates: GroupAggregateInputs;
}

/**
 * Map each workflow group to a `canvas-node-group` VueFlow node (title bar + frame).
 * Group nodes themselves are mapped separately by `mappedNodes`.
 */
export function mapGroupsToVueFlowNodes({
	allGroups,
	getNodeById,
	getNodeDisplaySize,
	isGroupCollapsed,
	readOnly,
	aggregates,
}: MapGroupsToVueFlowNodesInputs): CanvasGroupNode[] {
	const out: CanvasGroupNode[] = [];
	for (const group of allGroups) {
		// Skip until at least one node resolves — otherwise the rect collapses to
		// (0, 0) and lands the title bar at canvas origin. Re-emits when nodes arrive.
		const hasNode = group.nodeIds.some((id) => getNodeById(id) !== undefined);
		if (!hasNode) continue;

		const nodesRect = computeNodesRectFromStore(group.nodeIds, getNodeById, getNodeDisplaySize);
		const collapsed = isGroupCollapsed(group.id);
		const data: CanvasGroupNodeData = {
			group,
			nodesRect,
			isCollapsed: collapsed,
			executionStatus: aggregateGroupStatus(group.nodeIds, aggregates),
			maxNodeIterations: aggregateMaxNodeIterations(group.nodeIds, aggregates.nodeIterationsById),
		};

		const titleBar = titleBarFromNodesRect(nodesRect, collapsed);
		out.push({
			id: `${CANVAS_NODE_GROUP_ID_PREFIX}${group.id}`,
			type: CANVAS_NODE_GROUP_TYPE,
			position: titleBar.position,
			width: titleBar.width,
			height: GROUP_HEADER_HEIGHT,
			draggable: !readOnly,
			// Selectable only when the title bar represents
			// the whole group as a single visual surface
			selectable: collapsed,
			connectable: false,
			// Behind the group's nodes so the expanded frame doesn't overlap them.
			zIndex: -1,
			data,
		});
	}
	return out;
}

/**
 * Reverse index: hidden node id → its collapsed group.
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
 * Visually remap collapsed-group connections to the group header handles
 * (left / right) so VueFlow can draw them while the member nodes are hidden.
 * Connections fully inside a collapsed group are dropped.
 * External-only connections pass through unchanged.
 *
 * Edges that remap to the same endpoints (e.g. two grouped nodes feeding
 * the same external port) are merged into one, since VueFlow's behavior on
 * duplicate edge ids is undefined. The merged edge keeps every underlying
 * connection's endpoints in `data.canonicals` so consumers can resolve or
 * aggregate over all of them.
 */
export function remapCollapsedGroupConnections(
	connections: CanvasConnection[],
	collapsedGroupByNodeId: Map<string, IWorkflowGroup>,
): CanvasConnection[] {
	if (collapsedGroupByNodeId.size === 0) return connections;

	const result: CanvasConnection[] = [];
	const emittedById = new Map<string, CanvasConnection>();

	for (const conn of connections) {
		const sourceGroup = collapsedGroupByNodeId.get(conn.source);
		const targetGroup = collapsedGroupByNodeId.get(conn.target);

		// Both endpoints inside the same collapsed group → drop entirely.
		if (sourceGroup && targetGroup && sourceGroup.id === targetGroup.id) {
			continue;
		}

		if (!sourceGroup && !targetGroup) {
			// External-only connection — keep as-is.
			result.push(conn);
			continue;
		}

		const remapped = {
			source: sourceGroup ? `${CANVAS_NODE_GROUP_ID_PREFIX}${sourceGroup.id}` : conn.source,
			sourceHandle: sourceGroup ? CANVAS_NODE_GROUP_HANDLE_RIGHT : conn.sourceHandle,
			target: targetGroup ? `${CANVAS_NODE_GROUP_ID_PREFIX}${targetGroup.id}` : conn.target,
			targetHandle: targetGroup ? CANVAS_NODE_GROUP_HANDLE_LEFT : conn.targetHandle,
		};

		const id = createCanvasConnectionId(remapped);

		// Stash the canonical endpoints so connection mutations can resolve back to real workflow nodes
		const canonical = {
			source: conn.source,
			target: conn.target,
			sourceHandle: conn.sourceHandle,
			targetHandle: conn.targetHandle,
		};

		const existing = emittedById.get(id);
		if (existing) {
			existing.data?.canonicals?.push(canonical);
			continue;
		}

		const emitted: CanvasConnection = {
			...conn,
			id,
			...remapped,
			data: conn.data ? { ...conn.data, canonicals: [canonical] } : undefined,
		};
		emittedById.set(id, emitted);
		result.push(emitted);
	}

	return result;
}
