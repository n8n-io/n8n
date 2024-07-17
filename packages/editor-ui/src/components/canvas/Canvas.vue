<script lang="ts" setup>
import type { CanvasConnection, CanvasNode, ConnectStartEvent } from '@/types';
import type { EdgeMouseEvent, NodeDragEvent, Connection, XYPosition } from '@vue-flow/core';
import { useVueFlow, VueFlow, PanelPosition } from '@vue-flow/core';
import { Background } from '@vue-flow/background';
import { Controls } from '@vue-flow/controls';
import { MiniMap } from '@vue-flow/minimap';
import Node from './elements/nodes/CanvasNode.vue';
import Edge from './elements/edges/CanvasEdge.vue';
import { computed, onMounted, onUnmounted, ref, useCssModule } from 'vue';
import type { EventBus } from 'n8n-design-system';
import { createEventBus } from 'n8n-design-system';
import { useContextMenu, type ContextMenuAction } from '@/composables/useContextMenu';
import { useKeybindings } from '@/composables/useKeybindings';
import ContextMenu from '@/components/ContextMenu/ContextMenu.vue';
import type { NodeCreatorOpenSource } from '@/Interface';
import type { PinDataSource } from '@/composables/usePinnedData';

const $style = useCssModule();

const emit = defineEmits<{
	'update:modelValue': [elements: CanvasNode[]];
	'update:node:position': [id: string, position: XYPosition];
	'update:node:active': [id: string];
	'update:node:enabled': [id: string];
	'update:node:selected': [id: string];
	'update:node:name': [id: string];
	'run:node': [id: string];
	'delete:node': [id: string];
	'create:node': [source: NodeCreatorOpenSource];
	'create:sticky': [];
	'delete:nodes': [ids: string[]];
	'update:nodes:enabled': [ids: string[]];
	'copy:nodes': [ids: string[]];
	'duplicate:nodes': [ids: string[]];
	'update:nodes:pin': [ids: string[], source: PinDataSource];
	'cut:nodes': [ids: string[]];
	'delete:connection': [connection: Connection];
	'create:connection:start': [handle: ConnectStartEvent];
	'create:connection': [connection: Connection];
	'create:connection:end': [connection: Connection];
	'create:connection:cancelled': [handle: ConnectStartEvent];
	'click:connection:add': [connection: Connection];
	'click:pane': [position: XYPosition];
	'run:workflow': [];
	'save:workflow': [];
	'create:workflow': [];
}>();

const props = withDefaults(
	defineProps<{
		id?: string;
		nodes: CanvasNode[];
		connections: CanvasConnection[];
		controlsPosition?: PanelPosition;
		eventBus?: EventBus;
	}>(),
	{
		id: 'canvas',
		nodes: () => [],
		connections: () => [],
		controlsPosition: PanelPosition.BottomLeft,
		eventBus: () => createEventBus(),
	},
);

const {
	getSelectedNodes,
	addSelectedNodes,
	removeSelectedNodes,
	viewportRef,
	fitView,
	project,
	nodes: graphNodes,
} = useVueFlow({ id: props.id, deleteKeyCode: null });

useKeybindings({
	ctrl_c: () => {
		if (hasSelection.value) {
			emit('copy:nodes', selectedNodeIds.value);
		}
	},
	ctrl_x: () => {
		if (hasSelection.value) {
			emit('cut:nodes', selectedNodeIds.value);
		}
	},
	'delete|backspace': () => {
		if (hasSelection.value) {
			emit('delete:nodes', selectedNodeIds.value);
		}
	},
	ctrl_d: () => {
		if (hasSelection.value) {
			emit('duplicate:nodes', selectedNodeIds.value);
		}
	},
	d: () => {
		if (hasSelection.value) {
			emit('update:nodes:enabled', selectedNodeIds.value);
		}
	},
	p: () => {
		if (hasSelection.value) {
			emit('update:nodes:pin', selectedNodeIds.value, 'keyboard-shortcut');
		}
	},
	enter: () => {
		if (!lastSelectedNode.value) return;
		emit('update:node:active', lastSelectedNode.value.id);
	},
	f2: () => {
		if (!lastSelectedNode.value) return;
		emit('update:node:name', lastSelectedNode.value.id);
	},
	tab: () => emit('create:node', 'tab'),
	shift_s: () => emit('create:sticky'),
	ctrl_alt_n: () => emit('create:workflow'),
	ctrl_enter: () => emit('run:workflow'),
	ctrl_s: () => emit('save:workflow'),
	ctrl_a: () => addSelectedNodes(graphNodes.value),
	// @TODO implement arrow key shortcuts to modify selection
});

const contextMenu = useContextMenu();

const lastSelectedNode = computed(() => getSelectedNodes.value[getSelectedNodes.value.length - 1]);

const hasSelection = computed(() => getSelectedNodes.value.length > 0);

const selectedNodeIds = computed(() => getSelectedNodes.value.map((node) => node.id));

/**
 * Nodes
 */

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
	if (!lastSelectedNode.value) return;
	emit('update:node:selected', lastSelectedNode.value.id);
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

function onClickConnectionAdd(connection: Connection) {
	emit('click:connection:add', connection);
}

/**
 * Connection hover
 */

const hoveredEdges = ref<Record<string, boolean>>({});

function onMouseEnterEdge(event: EdgeMouseEvent) {
	hoveredEdges.value[event.edge.id] = true;
}

function onMouseLeaveEdge(event: EdgeMouseEvent) {
	hoveredEdges.value[event.edge.id] = false;
}

/**
 * Executions
 */

function onRunNode(id: string) {
	emit('run:node', id);
}

/**
 * View
 */

function onClickPane(event: MouseEvent) {
	const bounds = viewportRef.value?.getBoundingClientRect() ?? { left: 0, top: 0 };
	const position = project({
		x: event.offsetX - bounds.left,
		y: event.offsetY - bounds.top,
	});

	emit('click:pane', position);
}

async function onFitView() {
	await fitView();
}

function onOpenContextMenu(event: MouseEvent) {
	contextMenu.open(event, {
		source: 'canvas',
		nodeIds: selectedNodeIds.value,
	});
}

function onOpenNodeContextMenu(
	id: string,
	event: MouseEvent,
	source: 'node-button' | 'node-right-click',
) {
	if (getSelectedNodes.value.some((node) => node.id === id)) {
		onOpenContextMenu(event);
	}

	contextMenu.open(event, { source, nodeId: id });
}

function onContextMenuAction(action: ContextMenuAction, nodeIds: string[]) {
	switch (action) {
		case 'add_node':
			return emit('create:node', 'context_menu');
		case 'add_sticky':
			return emit('create:sticky');
		case 'copy':
			return emit('copy:nodes', nodeIds);
		case 'delete':
			return emit('delete:nodes', nodeIds);
		case 'select_all':
			return addSelectedNodes(graphNodes.value);
		case 'deselect_all':
			return removeSelectedNodes(getSelectedNodes.value);
		case 'duplicate':
			return emit('duplicate:nodes', nodeIds);
		case 'toggle_pin':
			return emit('update:nodes:pin', nodeIds, 'context-menu');
		case 'execute':
			return emit('run:node', nodeIds[0]);
		case 'toggle_activation':
			return emit('update:nodes:enabled', nodeIds);
		case 'open':
			return emit('update:node:active', nodeIds[0]);
		case 'rename':
			return emit('update:node:name', nodeIds[0]);
	}
}

/**
 * Lifecycle
 */

onMounted(() => {
	props.eventBus.on('fitView', onFitView);
});

onUnmounted(() => {
	props.eventBus.off('fitView', onFitView);
});
</script>

<template>
	<VueFlow
		:id="id"
		:nodes="nodes"
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
		@contextmenu="onOpenContextMenu"
	>
		<template #node-canvas-node="canvasNodeProps">
			<Node
				v-bind="canvasNodeProps"
				@delete="onDeleteNode"
				@run="onRunNode"
				@select="onSelectNode"
				@toggle="onToggleNodeEnabled"
				@activate="onSetNodeActive"
				@open:context-menu="onOpenNodeContextMenu"
			/>
		</template>

		<template #edge-canvas-edge="canvasEdgeProps">
			<Edge
				v-bind="canvasEdgeProps"
				:hovered="hoveredEdges[canvasEdgeProps.id]"
				@add="onClickConnectionAdd"
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

		<Suspense>
			<ContextMenu @action="onContextMenuAction" />
		</Suspense>
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
