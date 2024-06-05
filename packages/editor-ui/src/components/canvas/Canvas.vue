<script lang="ts" setup>
import type { CanvasConnection, CanvasElement } from '@/types';
import type { NodeDragEvent, Connection } from '@vue-flow/core';
import { useVueFlow, VueFlow, PanelPosition } from '@vue-flow/core';
import { Background } from '@vue-flow/background';
import { Controls } from '@vue-flow/controls';
import { MiniMap } from '@vue-flow/minimap';
import CanvasNode from './elements/nodes/CanvasNode.vue';
import CanvasEdge from './elements/edges/CanvasEdge.vue';
import { onMounted, onUnmounted, useCssModule } from 'vue';

const $style = useCssModule();

const emit = defineEmits<{
	'update:modelValue': [elements: CanvasElement[]];
	'update:node:position': [id: string, position: { x: number; y: number }];
	'delete:node': [id: string];
	'delete:connection': [connection: Connection];
	'create:connection': [connection: Connection];
}>();

const props = withDefaults(
	defineProps<{
		id?: string;
		elements: CanvasElement[];
		connections: CanvasConnection[];
		controlsPosition?: PanelPosition;
	}>(),
	{
		id: 'canvas',
		elements: () => [],
		connections: () => [],
		controlsPosition: PanelPosition.BottomLeft,
	},
);

const { getSelectedEdges, getSelectedNodes } = useVueFlow({ id: props.id });

onMounted(() => {
	document.addEventListener('keydown', onKeyDown);
});

onUnmounted(() => {
	document.removeEventListener('keydown', onKeyDown);
});

function onNodeDragStop(e: NodeDragEvent) {
	e.nodes.forEach((node) => {
		emit('update:node:position', node.id, node.position);
	});
}

function onDeleteNode(id: string) {
	emit('delete:node', id);
}

function onDeleteConnection(connection: Connection) {
	emit('delete:connection', connection);
}

function onConnect(...args: unknown[]) {
	emit('create:connection', args[0] as Connection);
}

function onKeyDown(e: KeyboardEvent) {
	if (e.key === 'Delete') {
		getSelectedEdges.value.forEach(onDeleteConnection);
		getSelectedNodes.value.forEach(({ id }) => onDeleteNode(id));
	}
}
</script>

<template>
	<VueFlow
		:id="id"
		:nodes="elements"
		:edges="connections"
		:apply-changes="false"
		fit-view-on-init
		pan-on-scroll
		:min-zoom="0.2"
		:max-zoom="2"
		data-test-id="canvas"
		@node-drag-stop="onNodeDragStop"
		@connect="onConnect"
	>
		<template #node-canvas-node="canvasNodeProps">
			<CanvasNode v-bind="canvasNodeProps" @delete="onDeleteNode" />
		</template>

		<template #edge-canvas-edge="canvasEdgeProps">
			<CanvasEdge v-bind="canvasEdgeProps" @delete="onDeleteConnection" />
		</template>

		<Background data-test-id="canvas-background" pattern-color="#aaa" :gap="16" />

		<MiniMap data-test-id="canvas-minimap" pannable />

		<Controls
			data-test-id="canvas-controls"
			:class="$style.canvasControls"
			:position="controlsPosition"
		></Controls>
	</VueFlow>
</template>

<style lang="scss" module></style>

<style lang="scss">
.vue-flow__controls {
	display: flex;
	gap: var(--spacing-2xs);
	box-shadow: none;
}

.vue-flow__controls-button {
	width: 42px;
	height: 42px;
	border: var(--border-base);
	border-radius: var(--border-radius-base);
	padding: 0;
	transition-property: transform, background, border, color;
	transition-duration: 300ms;
	transition-timing-function: ease;

	&:hover {
		border-color: var(--color-button-secondary-hover-active-border);
		background-color: var(--color-button-secondary-active-background);
		transform: scale(1.1);

		svg {
			fill: var(--color-primary);
		}
	}

	svg {
		max-height: 16px;
		max-width: 16px;
		transition-property: fill;
		transition-duration: 300ms;
		transition-timing-function: ease;
	}
}
</style>
