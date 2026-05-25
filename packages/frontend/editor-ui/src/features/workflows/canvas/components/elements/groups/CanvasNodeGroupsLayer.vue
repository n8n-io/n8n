<script setup lang="ts">
import { onBeforeUnmount } from 'vue';
import { useVueFlow } from '@vue-flow/core';
import { useEventListener } from '@vueuse/core';

import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import type { CanvasNode } from '../../../canvas.types';
import type { CanvasNodeGroupLayout } from '../../../composables/useCanvasNodeGroupsLayout';
import { useVueFlowTransformPaneTeleport } from '../../../composables/useVueFlowTransformPaneTeleport';
import { snapPositionToGrid } from '@/app/utils/nodeViewUtils';
import CanvasNodeGroupOverlay from './CanvasNodeGroupOverlay.vue';

const props = withDefaults(
	defineProps<{
		groupLayouts: CanvasNodeGroupLayout[];
		allNodes: CanvasNode[];
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
const { findNode, updateNode, viewport } = useVueFlow();
const { teleportTarget } = useVueFlowTransformPaneTeleport();

type DragState = {
	initialMouseX: number;
	initialMouseY: number;
	initialPositions: Map<string, { x: number; y: number }>;
	started: boolean;
};

const DRAG_THRESHOLD_PX = 3;

let dragState: DragState | null = null;
let stopListeners: Array<() => void> = [];

function onTitleFocused(id: string) {
	emit('title:focused', id);
}

function computeMoves(event: MouseEvent) {
	if (!dragState) return [];
	const zoom = viewport.value.zoom || 1;
	const [dx, dy] = snapPositionToGrid([
		(event.clientX - dragState.initialMouseX) / zoom,
		(event.clientY - dragState.initialMouseY) / zoom,
	]);
	return Array.from(dragState.initialPositions, ([id, position]) => ({
		id,
		position: {
			x: position.x + dx,
			y: position.y + dy,
		},
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
		if (findNode(id)) {
			updateNode(id, { position });
		}
	}
}

function onWindowMouseUp(event: MouseEvent) {
	if (!dragState) return;
	const moves = dragState.started ? computeMoves(event) : [];
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
	const group = workflowDocumentStore.value.getGroupById(groupId);
	if (!group) return;

	const members = group.nodeIds
		.map((nodeId) => props.allNodes.find((node) => node.id === nodeId))
		.filter((node): node is CanvasNode => node !== undefined);
	if (members.length === 0) return;

	event.preventDefault();
	cleanup();

	dragState = {
		initialMouseX: event.clientX,
		initialMouseY: event.clientY,
		initialPositions: new Map(
			members.map((node) => [node.id, { x: node.position.x, y: node.position.y }]),
		),
		started: false,
	};

	stopListeners.push(useEventListener(window, 'mousemove', onWindowMouseMove));
	stopListeners.push(useEventListener(window, 'mouseup', onWindowMouseUp));
}
</script>

<template>
	<Teleport :to="teleportTarget" :disabled="!teleportTarget">
		<CanvasNodeGroupOverlay
			v-for="layout in groupLayouts"
			:key="layout.group.id"
			:group="layout.group"
			:layout="layout"
			:read-only="readOnly"
			:autofocus-title="layout.group.id === autofocusGroupId"
			@update:name="workflowDocumentStore.updateName"
			@title:focused="onTitleFocused"
			@ungroup="workflowDocumentStore.deleteGroup"
			@toggle:collapsed="workflowDocumentStore.toggleGroupCollapsed"
			@header:dragstart="onHeaderDragStart"
		/>
	</Teleport>
</template>
