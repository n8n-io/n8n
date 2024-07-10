<script lang="ts" setup>
import type { CanvasConnection, CanvasElement, ConnectStartEvent } from '@/types';
import type { EdgeMouseEvent, NodeDragEvent, Connection, XYPosition } from '@vue-flow/core';
import { useVueFlow, VueFlow, PanelPosition } from '@vue-flow/core';
import { Background } from '@vue-flow/background';
import { Controls } from '@vue-flow/controls';
import { MiniMap } from '@vue-flow/minimap';
import CanvasNode from './elements/nodes/CanvasNode.vue';
import CanvasEdge from './elements/edges/CanvasEdge.vue';
import { onMounted, onUnmounted, ref, useCssModule } from 'vue';

const $style = useCssModule();

const emit = defineEmits<{
	'update:modelValue': [elements: CanvasElement[]];
	'update:node:position': [id: string, position: XYPosition];
	'update:node:active': [id: string];
	'update:node:enabled': [id: string];
	'update:node:selected': [id?: string];
	'run:node': [id: string];
	'delete:node': [id: string];
	'delete:connection': [connection: Connection];
	'create:connection:start': [handle: ConnectStartEvent];
	'create:connection': [connection: Connection];
	'create:connection:end': [connection: Connection];
	'create:connection:cancelled': [handle: ConnectStartEvent];
	'click:pane': [position: XYPosition];
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

const { getSelectedEdges, getSelectedNodes, viewportRef, project } = useVueFlow({
	id: props.id,
});

const hoveredEdges = ref<Record<string, boolean>>({});

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

function onSelectionDragStop(e: NodeDragEvent) {
	onNodeDragStop(e);
}

function onSetNodeActive(id: string) {
	emit('update:node:active', id);
}

function onSelectNode() {
	const selectedNodeId = getSelectedNodes.value[getSelectedNodes.value.length - 1]?.id;
	emit('update:node:selected', selectedNodeId);
}

function onToggleNodeEnabled(id: string) {
	emit('update:node:enabled', id);
}

function onDeleteNode(id: string) {
	emit('delete:node', id);
}

/**
 * Connections
 */

const connectionCreated = ref(false);
const connectionEventData = ref<ConnectStartEvent | Connection>();

const isConnection = (data: ConnectStartEvent | Connection | undefined): data is Connection =>
	!!data && connectionCreated.value;

const isConnectionCancelled = (
	data: ConnectStartEvent | Connection | undefined,
): data is ConnectStartEvent => !!data && !connectionCreated.value;

function onConnectStart(handle: ConnectStartEvent) {
	emit('create:connection:start', handle);

	connectionEventData.value = handle;
	connectionCreated.value = false;
}

function onConnect(connection: Connection) {
	emit('create:connection', connection);

	connectionEventData.value = connection;
	connectionCreated.value = true;
}

function onConnectEnd() {
	if (isConnection(connectionEventData.value)) {
		emit('create:connection:end', connectionEventData.value);
	} else if (isConnectionCancelled(connectionEventData.value)) {
		emit('create:connection:cancelled', connectionEventData.value);
	}
}

function onDeleteConnection(connection: Connection) {
	emit('delete:connection', connection);
}

function onRunNode(id: string) {
	emit('run:node', id);
}

function onKeyDown(e: KeyboardEvent) {
	if (e.key === 'Delete') {
		getSelectedEdges.value.forEach(onDeleteConnection);
		getSelectedNodes.value.forEach(({ id }) => onDeleteNode(id));
	}
}

function onMouseEnterEdge(event: EdgeMouseEvent) {
	hoveredEdges.value[event.edge.id] = true;
}

function onMouseLeaveEdge(event: EdgeMouseEvent) {
	hoveredEdges.value[event.edge.id] = false;
}

function onClickPane(event: MouseEvent) {
	const bounds = viewportRef.value?.getBoundingClientRect() ?? { left: 0, top: 0 };
	const position = project({
		x: event.offsetX - bounds.left,
		y: event.offsetY - bounds.top,
	});

	emit('click:pane', position);
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
		snap-to-grid
		:snap-grid="[16, 16]"
		:min-zoom="0.2"
		:max-zoom="2"
		data-test-id="canvas"
		@node-drag-stop="onNodeDragStop"
		@selection-drag-stop="onSelectionDragStop"
		@edge-mouse-enter="onMouseEnterEdge"
		@edge-mouse-leave="onMouseLeaveEdge"
		@connect-start="onConnectStart"
		@connect="onConnect"
		@connect-end="onConnectEnd"
		@pane-click="onClickPane"
	>
		<template #node-canvas-node="canvasNodeProps">
			<CanvasNode
				v-bind="canvasNodeProps"
				@delete="onDeleteNode"
				@run="onRunNode"
				@select="onSelectNode"
				@toggle="onToggleNodeEnabled"
				@activate="onSetNodeActive"
			/>
		</template>

		<template #edge-canvas-edge="canvasEdgeProps">
			<CanvasEdge
				v-bind="canvasEdgeProps"
				:hovered="hoveredEdges[canvasEdgeProps.id]"
				@delete="onDeleteConnection"
			/>
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
