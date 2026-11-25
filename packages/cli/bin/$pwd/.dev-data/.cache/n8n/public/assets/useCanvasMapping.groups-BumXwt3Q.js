import { Fh as applyOffset, Hb as STICKY_NODE_TYPE, Lg as CANVAS_NODE_GROUP_INPUT_HANDLE, Rg as CANVAS_NODE_GROUP_OUTPUT_HANDLE, Ug as createCanvasGroupNodeId, ng as DEFAULT_NODE_SIZE, vO as getEmptyGroupAnchor, zg as CANVAS_NODE_GROUP_TYPE, zh as createCanvasConnectionId } from "./app-D5flEmb-.js";
//#region src/features/workflows/canvas/stores/canvasNodeGroups.constants.ts
/** Matches node height */
var GROUP_HEADER_HEIGHT = DEFAULT_NODE_SIZE[1];
/** Below this zoom level all group descriptions and their affordances are hidden. */
var GROUP_DESCRIPTION_MIN_ZOOM = .66;
/**
* Canvas stacking contract (VueFlow resolves `node.zIndex ?? style.zIndex ?? 0`
* per node; `elevateNodesOnSelect` additionally adds +1000 to selected nodes):
*
*   free sticky notes (-10100 + i)
*     < expanded frame + title bar (-5000)
*     < sticky notes in a group (-100 + i)
*     < collapsed group chip (-1)
*     < edges / regular nodes (0) / collapsed empty-group chip (0)
*     < sticky in edit mode (1) / unconnected-node hover (2, see `_vueflow.scss`)
*
* `useWorkflowDocumentRenderData` gives every sticky `-100 + i` (overlap
* order). The canvas mapping moves stickies that are not in a group down by
* `FREE_STICKY_Z_INDEX_OFFSET`, so an expanded group paints over a free sticky
* placed on it. Sticky members stay above the frame so they render crisp
* inside the group (the frame fill would otherwise tint them). The collapsed
* chip stays above all stickies: members are hidden while collapsed (no tint
* concern) and the chip is the group's only handle.
*/
var FREE_STICKY_Z_INDEX_OFFSET = -1e4;
var GROUP_NODE_Z_INDEX_EXPANDED = -5e3;
//#endregion
//#region src/features/workflows/canvas/composables/useCanvasMapping.groups.ts
function readStickyDimensions(node) {
	if (node.type !== "n8n-nodes-base.stickyNote") return void 0;
	const { width, height } = node.parameters ?? {};
	if (typeof width !== "number" || typeof height !== "number") return void 0;
	return {
		width,
		height
	};
}
function resolveNodeDimensions(node, getNodeDisplaySize) {
	const supplied = getNodeDisplaySize?.(node.id);
	const sticky = readStickyDimensions(node);
	return {
		width: supplied?.width ?? sticky?.width ?? DEFAULT_NODE_SIZE[0],
		height: supplied?.height ?? sticky?.height ?? DEFAULT_NODE_SIZE[1]
	};
}
/**
* Collapsed (chip) and expanded frame rects for a group, in unsnapped store
* space. Expanded width is floored at the chip width so a tight cluster never
* shrinks the frame below it.
*/
function computeGroupFrameRects(nodesRect) {
	const x = nodesRect.x - 56;
	const y = nodesRect.y - 40 - GROUP_HEADER_HEIGHT;
	return {
		collapsed: {
			x,
			y,
			width: 400,
			height: GROUP_HEADER_HEIGHT
		},
		expanded: {
			x,
			y,
			width: Math.max(nodesRect.width + 112, 400),
			height: GROUP_HEADER_HEIGHT + nodesRect.height + 40 + 88
		}
	};
}
/**
* Title bar layout (position + width) for the VueFlow group node. Snaps the
* position to the canvas grid, otherwise VueFlow's `snap-to-grid`
* would shift the title bar on the first drag.
*/
function titleBarFromNodesRect(nodesRect, collapsed) {
	const snap = (v) => Math.round(v / 16) * 16;
	const { collapsed: collapsedRect, expanded: expandedRect } = computeGroupFrameRects(nodesRect);
	const rect = collapsed ? collapsedRect : expandedRect;
	return {
		position: {
			x: snap(rect.x),
			y: snap(rect.y)
		},
		width: rect.width
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
function computeNodesRectFromStore(nodeIds, getNodeById, getNodeDisplaySize, positionOverrides) {
	const nodes = nodeIds.map((id) => getNodeById(id)).filter((n) => n !== void 0);
	if (nodes.length === 0) return {
		x: 0,
		y: 0,
		width: 0,
		height: 0
	};
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
		height: maxY - minY
	};
}
var GROUP_STATUS_PRIORITY = [
	"waiting",
	"running",
	"error",
	"issues",
	"setup",
	"warning"
];
var IDLE_STATUSES = [
	"new",
	"unknown",
	"canceled"
];
/**
* Classify a single member for the group rollup by this priority:
* waiting > running > error > issues > setup > warning > success > idle.
* Validation issues are kept distinct from execution errors. Missing
* credentials are "setup", which matches the key icon on the member node.
* Other is an active-but-unhandled status that must block a misleading success.
* Idle statuses return undefined (they neither paint nor veto).
*/
function classifyNodeForGroup(snapshot) {
	const { status } = snapshot;
	if (snapshot.waiting || status === "waiting") return "waiting";
	if (snapshot.running || snapshot.waitingForNext) return "running";
	if (snapshot.hasExecutionError) return "error";
	if (snapshot.hasValidationError) return snapshot.needsCredentialSetup ? "setup" : "issues";
	if (snapshot.dirty) return "warning";
	if (status === "success") return "success";
	if (status === void 0 || IDLE_STATUSES.includes(status)) return void 0;
	return "other";
}
/** Reduce a group's per-node state into one dominant status. */
function aggregateGroupExecution(nodeIds, getNodeExecutionSnapshot) {
	const seen = /* @__PURE__ */ new Set();
	for (const id of nodeIds) seen.add(classifyNodeForGroup(getNodeExecutionSnapshot(id)));
	for (const status of GROUP_STATUS_PRIORITY) if (seen.has(status)) return status;
	return seen.has("success") && !seen.has("other") ? "success" : void 0;
}
/**
* Map each workflow group to a `canvas-node-group` VueFlow node (title bar + frame).
* Group nodes themselves are mapped separately by `mappedNodes`.
*/
function mapGroupsToVueFlowNodes({ allGroups, getNodeById, getNodeDisplaySize, getGroupVisualOffset, isGroupCollapsed, readOnly, getNodeExecutionSnapshot }) {
	const out = [];
	for (const group of allGroups) {
		if (!group.nodeIds.some((id) => getNodeById(id) !== void 0)) continue;
		const nodesRect = computeNodesRectFromStore(group.nodeIds, getNodeById, getNodeDisplaySize);
		const collapsed = isGroupCollapsed(group.id);
		const memberNodes = group.nodeIds.map(getNodeById).filter((node) => node !== void 0);
		const isEmptyGroup = getEmptyGroupAnchor(group, memberNodes) !== void 0;
		const connectableMembers = memberNodes.filter((node) => node.type !== STICKY_NODE_TYPE);
		const data = {
			group,
			nodesRect,
			isCollapsed: collapsed,
			isEmptyGroup,
			executionStatus: aggregateGroupExecution(group.nodeIds, getNodeExecutionSnapshot),
			allNodesDisabled: connectableMembers.length > 0 && connectableMembers.every((node) => node.disabled === true)
		};
		const id = createCanvasGroupNodeId(group.id);
		const titleBar = titleBarFromNodesRect(nodesRect, collapsed);
		const offset = getGroupVisualOffset?.(id) ?? {
			x: 0,
			y: 0
		};
		out.push({
			id,
			type: CANVAS_NODE_GROUP_TYPE,
			position: applyOffset(titleBar.position, offset),
			width: titleBar.width,
			height: GROUP_HEADER_HEIGHT,
			draggable: !readOnly,
			selectable: true,
			connectable: isEmptyGroup && collapsed && !readOnly,
			zIndex: collapsed ? isEmptyGroup ? 0 : -1 : GROUP_NODE_Z_INDEX_EXPANDED,
			data
		});
	}
	return out;
}
/**
* Free stickies drop below expanded groups; group members keep their overlap
* z-index from `useWorkflowDocumentRenderData`. See the stacking contract in
* canvasNodeGroups.constants.ts.
*/
function getStickyZIndex(overlapZIndex, isGroupMember) {
	return isGroupMember ? overlapZIndex : overlapZIndex + FREE_STICKY_Z_INDEX_OFFSET;
}
/**
* Reverse index: hidden node id → its collapsed group.
*/
function buildCollapsedGroupByNodeId(allGroups, isGroupCollapsed) {
	const result = /* @__PURE__ */ new Map();
	for (const group of allGroups) {
		if (!isGroupCollapsed(group.id)) continue;
		for (const nodeId of group.nodeIds) result.set(nodeId, group);
	}
	return result;
}
/**
* Visually remap collapsed-group connections to the group header input/output
* handles so VueFlow can draw them while the member nodes are hidden.
* Connections fully inside a collapsed group are dropped.
* External-only connections pass through unchanged.
*
* Edges that remap to the same endpoints (e.g. two grouped nodes feeding
* the same external port) are merged into one, since VueFlow's behavior on
* duplicate edge ids is undefined. The merged edge keeps every underlying
* connection's endpoints in `data.canonicals` so consumers can resolve or
* aggregate over all of them.
*/
function remapCollapsedGroupConnections(connections, collapsedGroupByNodeId) {
	if (collapsedGroupByNodeId.size === 0) return connections;
	const result = [];
	const emittedById = /* @__PURE__ */ new Map();
	for (const conn of connections) {
		const sourceGroup = collapsedGroupByNodeId.get(conn.source);
		const targetGroup = collapsedGroupByNodeId.get(conn.target);
		if (sourceGroup && targetGroup && sourceGroup.id === targetGroup.id) continue;
		if (!sourceGroup && !targetGroup) {
			result.push(conn);
			continue;
		}
		const remapped = {
			source: sourceGroup ? createCanvasGroupNodeId(sourceGroup.id) : conn.source,
			sourceHandle: sourceGroup ? CANVAS_NODE_GROUP_OUTPUT_HANDLE : conn.sourceHandle,
			target: targetGroup ? createCanvasGroupNodeId(targetGroup.id) : conn.target,
			targetHandle: targetGroup ? CANVAS_NODE_GROUP_INPUT_HANDLE : conn.targetHandle
		};
		const id = createCanvasConnectionId(remapped);
		const canonical = {
			source: conn.source,
			target: conn.target,
			sourceHandle: conn.sourceHandle,
			targetHandle: conn.targetHandle
		};
		const existing = emittedById.get(id);
		if (existing) {
			existing.data?.canonicals?.push(canonical);
			continue;
		}
		const emitted = {
			...conn,
			id,
			...remapped,
			data: conn.data ? {
				...conn.data,
				canonicals: [canonical]
			} : void 0
		};
		emittedById.set(id, emitted);
		result.push(emitted);
	}
	return result;
}
//#endregion
export { getStickyZIndex as a, titleBarFromNodesRect as c, computeNodesRectFromStore as i, GROUP_DESCRIPTION_MIN_ZOOM as l, buildCollapsedGroupByNodeId as n, mapGroupsToVueFlowNodes as o, computeGroupFrameRects as r, remapCollapsedGroupConnections as s, aggregateGroupExecution as t, GROUP_HEADER_HEIGHT as u };
