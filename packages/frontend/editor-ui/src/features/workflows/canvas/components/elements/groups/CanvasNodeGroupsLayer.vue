<script setup lang="ts">
import { computed, onBeforeUnmount, watch } from 'vue';
import { useVueFlow, type GraphNode } from '@vue-flow/core';
import { useEventListener } from '@vueuse/core';
import type { IWorkflowGroup } from 'n8n-workflow';

import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useVueFlowTransformPaneTeleport } from '../../../composables/useVueFlowTransformPaneTeleport';
import { snapPositionToGrid } from '@/app/utils/nodeViewUtils';
import { getGroupFrameRects } from '../../../groups/groupFrame';
import {
	groupIdFromCollapsedNodeId,
	isCollapsedGroupNodeId,
} from '../../../groups/collapsedGroupView';
import {
	computeCollapseLayout,
	computeExpandLayout,
	type GroupExpandDeltas,
	type LayoutNode,
} from '../../../groups/layout';
import CanvasNodeGroupOverlay from './CanvasNodeGroupOverlay.vue';

const props = withDefaults(
	defineProps<{
		readOnly?: boolean;
		autofocusGroupId?: string | null;
	}>(),
	{
		readOnly: false,
		autofocusGroupId: null,
	},
);

const emit = defineEmits<{
	'title:focused': [id: string];
	'move-members': [moves: Array<{ id: string; position: { x: number; y: number } }>];
}>();

const workflowDocumentStore = injectWorkflowDocumentStore();
const { findNode, updateNode, viewport, getNodes, onNodeDragStart, onNodeDragStop } = useVueFlow();
const { teleportTarget } = useVueFlowTransformPaneTeleport();

function getMembers(group: IWorkflowGroup): GraphNode[] {
	const members: GraphNode[] = [];
	for (const id of group.nodeIds) {
		const node = findNode(id);
		if (node) members.push(node);
	}
	return members;
}

function onTitleFocused(id: string) {
	emit('title:focused', id);
}

const visibleGroups = computed(() =>
	workflowDocumentStore.value.allGroups.map((group) => ({ group, members: getMembers(group) })),
);

// Reversible push records, keyed by group id. Produced by an expand and
// consumed by the matching collapse so pushed nodes are pulled back. Session
// state only — never persisted. If lost (e.g. reload), a subsequent collapse
// simply won't pull nodes back, which is a safe degradation.
const expandDeltasByGroup = new Map<string, GroupExpandDeltas>();

// Snapshot of every visible canvas node for the layout algorithm. Hidden nodes
// (members of other collapsed groups) and synthetic collapsed-group nodes are
// excluded — they aren't free-standing obstacles to push.
function getLayoutNodes(): LayoutNode[] {
	const out: LayoutNode[] = [];
	for (const node of getNodes.value) {
		if (node.hidden || isCollapsedGroupNodeId(node.id)) continue;
		out.push({
			id: node.id,
			position: { x: node.position.x, y: node.position.y },
			size: { width: node.dimensions.width, height: node.dimensions.height },
		});
	}
	return out;
}

function applyMoves(moves: Array<{ id: string; position: { x: number; y: number } }>) {
	if (moves.length === 0) return;
	for (const move of moves) {
		updateNode(move.id, { position: move.position });
	}
	// Reuse the existing persistence path (update:nodes:position).
	emit('move-members', moves);
}

// Run the push (expand) / pull-back (collapse) layout for a group whose
// collapsed state just changed. Member hiding + edge rerouting is handled
// reactively by the canvas mapping; this only repositions surrounding nodes.
function runLayoutForToggle(groupId: string, collapsing: boolean) {
	const group = workflowDocumentStore.value.getGroupById(groupId);
	if (!group) return;
	const members = getMembers(group);
	if (members.length === 0) return;
	const rects = getGroupFrameRects(members);
	if (!rects) return;

	const expandedRect = {
		x: rects.x,
		y: rects.y,
		width: rects.expanded.width,
		height: rects.expanded.height,
	};
	const collapsedRect = {
		x: rects.x,
		y: rects.y,
		width: rects.collapsed.width,
		height: rects.collapsed.height,
	};

	if (collapsing) {
		const { moves } = computeCollapseLayout({
			nodes: getLayoutNodes(),
			memberIds: group.nodeIds,
			collapsedRect,
			expandedRect,
			expandDeltas: expandDeltasByGroup.get(groupId),
		});
		applyMoves(moves);
		expandDeltasByGroup.delete(groupId);
	} else {
		const { moves, expandDeltas } = computeExpandLayout({
			nodes: getLayoutNodes(),
			memberIds: group.nodeIds,
			collapsedRect,
			expandedRect,
		});
		applyMoves(moves);
		expandDeltasByGroup.set(groupId, expandDeltas);
	}
}

// The overlay's chevron only collapses (it only renders while expanded); the
// synthetic collapsed node's chevron expands by flipping the flag directly.
// Either way the layout below reacts to the state change.
function onToggleCollapsed(groupId: string) {
	if (props.readOnly) return;
	const store = workflowDocumentStore.value;
	const group = store.getGroupById(groupId);
	if (!group) return;
	store.setGroupCollapsed(groupId, !(group.collapsed ?? false));
}

// React to collapsed-state transitions (from any trigger) and run the layout.
// On first observation we only record state — existing nodes are never
// repositioned on load.
const lastCollapsedState = new Map<string, boolean>();
watch(
	() =>
		workflowDocumentStore.value.allGroups.map((group) => ({
			id: group.id,
			collapsed: group.collapsed ?? false,
		})),
	(groups) => {
		const seen = new Set<string>();
		for (const { id, collapsed } of groups) {
			seen.add(id);
			const previous = lastCollapsedState.get(id);
			lastCollapsedState.set(id, collapsed);
			if (previous === undefined || previous === collapsed) continue;
			runLayoutForToggle(id, collapsed);
		}
		for (const id of [...lastCollapsedState.keys()]) {
			if (!seen.has(id)) lastCollapsedState.delete(id);
		}
	},
	{ deep: true, immediate: true },
);

// Dragging the collapsed group box moves the whole group. Vue Flow drags the
// synthetic node; on drop we translate its (hidden) members by the same delta
// and persist, after which the box re-derives to the dragged position.
const collapsedDragStartById = new Map<string, { x: number; y: number }>();

onNodeDragStart(({ node }) => {
	if (!isCollapsedGroupNodeId(node.id)) return;
	collapsedDragStartById.set(node.id, { x: node.position.x, y: node.position.y });
});

onNodeDragStop(({ node }) => {
	const groupId = groupIdFromCollapsedNodeId(node.id);
	if (!groupId) return;
	const start = collapsedDragStartById.get(node.id);
	collapsedDragStartById.delete(node.id);
	if (!start || props.readOnly) return;

	const dx = node.position.x - start.x;
	const dy = node.position.y - start.y;
	if (dx === 0 && dy === 0) return;

	const group = workflowDocumentStore.value.getGroupById(groupId);
	if (!group) return;

	const moves: Array<{ id: string; position: { x: number; y: number } }> = [];
	for (const id of group.nodeIds) {
		const member = findNode(id);
		if (!member) continue;
		moves.push({ id, position: { x: member.position.x + dx, y: member.position.y + dy } });
	}
	applyMoves(moves);
});

type DragState = {
	initialMouseX: number;
	initialMouseY: number;
	initialPositions: Map<string, { x: number; y: number }>;
	started: boolean;
};

const DRAG_THRESHOLD_PX = 3;

let dragState: DragState | null = null;
let stopListeners: Array<() => void> = [];

function computeMoves(event: MouseEvent) {
	if (!dragState) return [];
	const zoom = viewport.value.zoom || 1;
	const [dx, dy] = snapPositionToGrid([
		(event.clientX - dragState.initialMouseX) / zoom,
		(event.clientY - dragState.initialMouseY) / zoom,
	]);
	return Array.from(dragState.initialPositions, ([id, p]) => ({
		id,
		position: { x: p.x + dx, y: p.y + dy },
	}));
}

function onWindowMouseMove(event: MouseEvent) {
	if (!dragState) return;
	if (!dragState.started) {
		const dx = Math.abs(event.clientX - dragState.initialMouseX);
		const dy = Math.abs(event.clientY - dragState.initialMouseY);
		if (Math.max(dx, dy) < DRAG_THRESHOLD_PX) return;
		dragState.started = true;
	}
	for (const { id, position } of computeMoves(event)) {
		updateNode(id, { position });
	}
}

function onWindowMouseUp(event: MouseEvent) {
	if (!dragState) return;
	const started = dragState.started;
	const moves = started ? computeMoves(event) : [];
	cleanup();
	if (moves.length > 0) emit('move-members', moves);
}

function cleanup() {
	dragState = null;
	for (const stop of stopListeners) stop();
	stopListeners = [];
}

onBeforeUnmount(cleanup);

function onHeaderDragStart(groupId: string, event: MouseEvent) {
	if (props.readOnly) return;
	const group = workflowDocumentStore.value.allGroups.find((g) => g.id === groupId);
	if (!group) return;
	const members = getMembers(group);
	if (members.length === 0) return;

	event.preventDefault();
	cleanup();

	dragState = {
		initialMouseX: event.clientX,
		initialMouseY: event.clientY,
		initialPositions: new Map(members.map((n) => [n.id, { x: n.position.x, y: n.position.y }])),
		started: false,
	};

	stopListeners.push(useEventListener(window, 'mousemove', onWindowMouseMove));
	stopListeners.push(useEventListener(window, 'mouseup', onWindowMouseUp));
}
</script>

<template>
	<Teleport :to="teleportTarget" :disabled="!teleportTarget">
		<CanvasNodeGroupOverlay
			v-for="{ group, members } in visibleGroups"
			:key="group.id"
			:group="group"
			:member-nodes="members"
			:read-only="readOnly"
			:autofocus-title="group.id === autofocusGroupId"
			@update:name="workflowDocumentStore.updateName"
			@title:focused="onTitleFocused"
			@ungroup="workflowDocumentStore.deleteGroup"
			@toggle-collapsed="onToggleCollapsed"
			@header:dragstart="onHeaderDragStart"
		/>
	</Teleport>
</template>
