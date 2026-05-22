<script setup lang="ts">
import { computed, onBeforeUnmount } from 'vue';
import { useVueFlow, type GraphNode } from '@vue-flow/core';
import { useEventListener } from '@vueuse/core';
import { deepCopy, type IWorkflowGroup } from 'n8n-workflow';

import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useVueFlowTransformPaneTeleport } from '../../../composables/useVueFlowTransformPaneTeleport';
import { snapPositionToGrid } from '@/app/utils/nodeViewUtils';
import { useHistoryStore } from '@/app/stores/history.store';
import { UpdateGroupCommand } from '@/app/models/history';
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
const historyStore = useHistoryStore();
const { findNode, updateNode, viewport } = useVueFlow();
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

function onUngroup(groupId: string) {
	const group = workflowDocumentStore.value.getGroupById(groupId);
	if (!group) return;
	const snapshot = deepCopy(group);
	workflowDocumentStore.value.deleteGroup(groupId);
	historyStore.pushCommandToUndo(new UpdateGroupCommand(groupId, snapshot, null, Date.now()));
}

function onUpdateName(groupId: string, newName: string) {
	const group = workflowDocumentStore.value.getGroupById(groupId);
	if (!group || group.name === newName) return;

	const oldSnapshot = deepCopy(group);
	workflowDocumentStore.value.updateName(groupId, newName);
	const updated = workflowDocumentStore.value.getGroupById(groupId);

	if (updated) {
		historyStore.pushCommandToUndo(
			new UpdateGroupCommand(groupId, oldSnapshot, deepCopy(updated), Date.now()),
		);
	}
}

const visibleGroups = computed(() =>
	workflowDocumentStore.value.allGroups.map((group) => ({ group, members: getMembers(group) })),
);

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
			@update:name="onUpdateName"
			@title:focused="onTitleFocused"
			@ungroup="onUngroup"
			@header:dragstart="onHeaderDragStart"
		/>
	</Teleport>
</template>
