<script lang="ts" setup>
import type {
	CanvasConnection,
	CanvasNode,
	CanvasNodeMoveEvent,
	CanvasEventBusEvents,
	ConnectStartEvent,
} from '@/types';
import type {
	Connection,
	XYPosition,
	ViewportTransform,
	NodeChange,
	NodePositionChange,
} from '@vue-flow/core';
import { useVueFlow, VueFlow, PanelPosition, MarkerType } from '@vue-flow/core';
import { Background } from '@vue-flow/background';
import { MiniMap } from '@vue-flow/minimap';
import Node from './elements/nodes/CanvasNode.vue';
import Edge from './elements/edges/CanvasEdge.vue';
import { computed, onMounted, onUnmounted, provide, ref, toRef, useCssModule, watch } from 'vue';
import type { EventBus } from 'n8n-design-system';
import { createEventBus } from 'n8n-design-system';
import { useContextMenu, type ContextMenuAction } from '@/composables/useContextMenu';
import { useKeybindings } from '@/composables/useKeybindings';
import ContextMenu from '@/components/ContextMenu/ContextMenu.vue';
import type { NodeCreatorOpenSource } from '@/Interface';
import type { PinDataSource } from '@/composables/usePinnedData';
import { isPresent } from '@/utils/typesUtils';
import { GRID_SIZE } from '@/utils/nodeViewUtils';
import { CanvasKey } from '@/constants';
import { onKeyDown, onKeyUp } from '@vueuse/core';
import CanvasArrowHeadMarker from './elements/edges/CanvasArrowHeadMarker.vue';

const $style = useCssModule();

const emit = defineEmits<{
	'update:modelValue': [elements: CanvasNode[]];
	'update:node:position': [id: string, position: XYPosition];
	'update:nodes:position': [events: CanvasNodeMoveEvent[]];
	'update:node:active': [id: string];
	'update:node:enabled': [id: string];
	'update:node:selected': [id: string];
	'update:node:name': [id: string];
	'update:node:parameters': [id: string, parameters: Record<string, unknown>];
	'click:node:add': [id: string, handle: string];
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
	'create:connection:end': [connection: Connection, event?: MouseEvent];
	'create:connection:cancelled': [
		handle: ConnectStartEvent,
		position: XYPosition,
		event?: MouseEvent,
	];
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
		eventBus?: EventBus<CanvasEventBusEvents>;
		readOnly?: boolean;
		executing?: boolean;
		keyBindings?: boolean;
	}>(),
	{
		id: 'canvas',
		nodes: () => [],
		connections: () => [],
		controlsPosition: PanelPosition.BottomLeft,
		eventBus: () => createEventBus(),
		readOnly: false,
		executing: false,
		keyBindings: true,
	},
);

const {
	getSelectedNodes: selectedNodes,
	addSelectedNodes,
	removeSelectedNodes,
	viewportRef,
	fitView,
	zoomIn,
	zoomOut,
	zoomTo,
	setInteractive,
	elementsSelectable,
	project,
	nodes: graphNodes,
	onPaneReady,
	findNode,
} = useVueFlow({ id: props.id, deleteKeyCode: null });

const isPaneReady = ref(false);

const classes = computed(() => ({
	[$style.canvas]: true,
	[$style.ready]: isPaneReady.value,
	[$style.draggable]: isPanningEnabled.value,
}));

/**
 * Key bindings
 */

const disableKeyBindings = computed(() => !props.keyBindings);

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_key_values#whitespace_keys
 */
const panningKeyCode = ' ';
const isPanningEnabled = ref(false);

onKeyDown(panningKeyCode, () => {
	isPanningEnabled.value = true;
});

onKeyUp(panningKeyCode, () => {
	isPanningEnabled.value = false;
});

useKeybindings(
	{
		ctrl_c: emitWithSelectedNodes((ids) => emit('copy:nodes', ids)),
		ctrl_x: emitWithSelectedNodes((ids) => emit('cut:nodes', ids)),
		'delete|backspace': emitWithSelectedNodes((ids) => emit('delete:nodes', ids)),
		ctrl_d: emitWithSelectedNodes((ids) => emit('duplicate:nodes', ids)),
		d: emitWithSelectedNodes((ids) => emit('update:nodes:enabled', ids)),
		p: emitWithSelectedNodes((ids) => emit('update:nodes:pin', ids, 'keyboard-shortcut')),
		enter: emitWithLastSelectedNode((id) => onSetNodeActive(id)),
		f2: emitWithLastSelectedNode((id) => emit('update:node:name', id)),
		tab: () => emit('create:node', 'tab'),
		shift_s: () => emit('create:sticky'),
		ctrl_alt_n: () => emit('create:workflow'),
		ctrl_enter: () => emit('run:workflow'),
		ctrl_s: () => emit('save:workflow'),
		ctrl_a: () => addSelectedNodes(graphNodes.value),
		'+|=': async () => await onZoomIn(),
		'-|_': async () => await onZoomOut(),
		0: async () => await onResetZoom(),
		1: async () => await onFitView(),
		// @TODO implement arrow key shortcuts to modify selection
	},
	{ disabled: disableKeyBindings },
);

/**
 * Nodes
 */

const selectionKeyCode = computed(() => (isPanningEnabled.value ? null : true));
const lastSelectedNode = computed(() => selectedNodes.value[selectedNodes.value.length - 1]);
const hasSelection = computed(() => selectedNodes.value.length > 0);
const selectedNodeIds = computed(() => selectedNodes.value.map((node) => node.id));

function onClickNodeAdd(id: string, handle: string) {
	emit('click:node:add', id, handle);
}

function onUpdateNodesPosition(events: NodePositionChange[]) {
	emit('update:nodes:position', events);
}

function onUpdateNodePosition(id: string, position: XYPosition) {
	emit('update:node:position', id, position);
}

function onNodesChange(events: NodeChange[]) {
	const isPositionChangeEvent = (event: NodeChange): event is NodePositionChange =>
		event.type === 'position' && 'position' in event;

	const positionChangeEndEvents = events.filter(isPositionChangeEvent);
	if (positionChangeEndEvents.length > 0) {
		onUpdateNodesPosition(positionChangeEndEvents);
	}
}

function onSetNodeActive(id: string) {
	props.eventBus.emit('nodes:action', { ids: [id], action: 'update:node:active' });
	emit('update:node:active', id);
}

function clearSelectedNodes() {
	removeSelectedNodes(selectedNodes.value);
}

function onSelectNode() {
	if (!lastSelectedNode.value) return;
	emit('update:node:selected', lastSelectedNode.value.id);
}

function onSelectNodes({ ids }: CanvasEventBusEvents['nodes:select']) {
	clearSelectedNodes();
	addSelectedNodes(ids.map(findNode).filter(isPresent));
}

function onToggleNodeEnabled(id: string) {
	emit('update:node:enabled', id);
}

function onDeleteNode(id: string) {
	emit('delete:node', id);
}

function onUpdateNodeParameters(id: string, parameters: Record<string, unknown>) {
	emit('update:node:parameters', id, parameters);
}

/**
 * Connections
 */

const connectionCreated = ref(false);
const connectingHandle = ref<ConnectStartEvent>();
const connectedHandle = ref<Connection>();

function onConnectStart(handle: ConnectStartEvent) {
	emit('create:connection:start', handle);

	connectingHandle.value = handle;
	connectionCreated.value = false;
}

function onConnect(connection: Connection) {
	emit('create:connection', connection);

	connectedHandle.value = connection;
	connectionCreated.value = true;
}

function onConnectEnd(event?: MouseEvent) {
	if (connectedHandle.value) {
		emit('create:connection:end', connectedHandle.value, event);
	} else if (connectingHandle.value) {
		emit('create:connection:cancelled', connectingHandle.value, getProjectedPosition(event), event);
	}

	connectedHandle.value = undefined;
	connectingHandle.value = undefined;
}

function onDeleteConnection(connection: Connection) {
	emit('delete:connection', connection);
}

function onClickConnectionAdd(connection: Connection) {
	emit('click:connection:add', connection);
}

const arrowHeadMarkerId = ref('custom-arrow-head');

/**
 * Executions
 */

function onRunNode(id: string) {
	emit('run:node', id);
}

/**
 * Emit helpers
 */

function emitWithSelectedNodes(emitFn: (ids: string[]) => void) {
	return () => {
		if (hasSelection.value) {
			emitFn(selectedNodeIds.value);
		}
	};
}

function emitWithLastSelectedNode(emitFn: (id: string) => void) {
	return () => {
		if (lastSelectedNode.value) {
			emitFn(lastSelectedNode.value.id);
		}
	};
}

/**
 * View
 */

const defaultZoom = 1;
const zoom = ref(defaultZoom);
const isPaneMoving = ref(false);

function getProjectedPosition(event?: MouseEvent) {
	const bounds = viewportRef.value?.getBoundingClientRect() ?? { left: 0, top: 0 };
	const offsetX = event?.clientX ?? 0;
	const offsetY = event?.clientY ?? 0;

	return project({
		x: offsetX - bounds.left,
		y: offsetY - bounds.top,
	});
}

function onClickPane(event: MouseEvent) {
	emit('click:pane', getProjectedPosition(event));
}

async function onFitView() {
	await fitView({ maxZoom: defaultZoom, padding: 0.2 });
}

async function onZoomTo(zoomLevel: number) {
	await zoomTo(zoomLevel);
}

async function onZoomIn() {
	await zoomIn();
}

async function onZoomOut() {
	await zoomOut();
}

async function onResetZoom() {
	await onZoomTo(defaultZoom);
}

function onViewportChange(viewport: ViewportTransform) {
	zoom.value = viewport.zoom;
}

function setReadonly(value: boolean) {
	setInteractive(!value);
	elementsSelectable.value = true;
}

function onPaneMoveStart() {
	isPaneMoving.value = true;
}

function onPaneMoveEnd() {
	isPaneMoving.value = false;
}

/**
 * Context menu
 */

const contextMenu = useContextMenu();

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
	if (selectedNodeIds.value.includes(id)) {
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
			return clearSelectedNodes();
		case 'duplicate':
			return emit('duplicate:nodes', nodeIds);
		case 'toggle_pin':
			return emit('update:nodes:pin', nodeIds, 'context-menu');
		case 'execute':
			return emit('run:node', nodeIds[0]);
		case 'toggle_activation':
			return emit('update:nodes:enabled', nodeIds);
		case 'open':
			return onSetNodeActive(nodeIds[0]);
		case 'rename':
			return emit('update:node:name', nodeIds[0]);
		case 'change_color':
			return props.eventBus.emit('nodes:action', { ids: nodeIds, action: 'update:sticky:color' });
	}
}

/**
 * Minimap
 */

const minimapVisibilityDelay = 1000;
const minimapHideTimeout = ref<NodeJS.Timeout | null>(null);
const isMinimapVisible = ref(false);

function minimapNodeClassnameFn(node: CanvasNode) {
	return `minimap-node-${node.data?.render.type.replace(/\./g, '-') ?? 'default'}`;
}

watch(isPaneMoving, (value) => {
	if (value) {
		showMinimap();
	} else {
		hideMinimap();
	}
});

function showMinimap() {
	if (minimapHideTimeout.value) {
		clearTimeout(minimapHideTimeout.value);
		minimapHideTimeout.value = null;
	}

	isMinimapVisible.value = true;
}

function hideMinimap() {
	minimapHideTimeout.value = setTimeout(() => {
		isMinimapVisible.value = false;
	}, minimapVisibilityDelay);
}

function onMinimapMouseEnter() {
	showMinimap();
}

function onMinimapMouseLeave() {
	hideMinimap();
}

/**
 * Lifecycle
 */

onMounted(() => {
	props.eventBus.on('fitView', onFitView);
	props.eventBus.on('nodes:select', onSelectNodes);
});

onUnmounted(() => {
	props.eventBus.off('fitView', onFitView);
	props.eventBus.off('nodes:select', onSelectNodes);
});

onPaneReady(async () => {
	await onFitView();
	isPaneReady.value = true;
});

watch(() => props.readOnly, setReadonly, {
	immediate: true,
});

/**
 * Provide
 */

const isExecuting = toRef(props, 'executing');

provide(CanvasKey, {
	connectingHandle,
	isExecuting,
});
</script>

<template>
	<VueFlow
		:id="id"
		:nodes="nodes"
		:edges="connections"
		:apply-changes="false"
		:connection-line-options="{ markerEnd: MarkerType.ArrowClosed }"
		:connection-radius="60"
		pan-on-scroll
		snap-to-grid
		:snap-grid="[GRID_SIZE, GRID_SIZE]"
		:min-zoom="0"
		:max-zoom="4"
		:class="classes"
		:selection-key-code="selectionKeyCode"
		:pan-activation-key-code="panningKeyCode"
		data-test-id="canvas"
		@connect-start="onConnectStart"
		@connect="onConnect"
		@connect-end="onConnectEnd"
		@pane-click="onClickPane"
		@contextmenu="onOpenContextMenu"
		@viewport-change="onViewportChange"
		@nodes-change="onNodesChange"
		@move-start="onPaneMoveStart"
		@move-end="onPaneMoveEnd"
	>
		<template #node-canvas-node="canvasNodeProps">
			<Node
				v-bind="canvasNodeProps"
				:read-only="readOnly"
				:event-bus="eventBus"
				@delete="onDeleteNode"
				@run="onRunNode"
				@select="onSelectNode"
				@toggle="onToggleNodeEnabled"
				@activate="onSetNodeActive"
				@open:contextmenu="onOpenNodeContextMenu"
				@update="onUpdateNodeParameters"
				@move="onUpdateNodePosition"
				@add="onClickNodeAdd"
			/>
		</template>

		<template #edge-canvas-edge="canvasEdgeProps">
			<Edge
				v-bind="canvasEdgeProps"
				:marker-end="`url(#${arrowHeadMarkerId})`"
				:read-only="readOnly"
				@add="onClickConnectionAdd"
				@delete="onDeleteConnection"
			/>
		</template>

		<template #connection-line="connectionLineProps">
			<CanvasConnectionLine v-bind="connectionLineProps" />
		</template>

		<CanvasArrowHeadMarker :id="arrowHeadMarkerId" />

		<Background data-test-id="canvas-background" pattern-color="#aaa" :gap="GRID_SIZE" />

		<Transition name="minimap">
			<MiniMap
				v-show="isMinimapVisible"
				data-test-id="canvas-minimap"
				aria-label="n8n Minimap"
				:height="120"
				:width="200"
				:position="PanelPosition.BottomLeft"
				pannable
				zoomable
				:node-class-name="minimapNodeClassnameFn"
				:node-border-radius="16"
				@mouseenter="onMinimapMouseEnter"
				@mouseleave="onMinimapMouseLeave"
			/>
		</Transition>

		<CanvasControlButtons
			data-test-id="canvas-controls"
			:class="$style.canvasControls"
			:position="controlsPosition"
			:show-interactive="false"
			:zoom="zoom"
			@zoom-to-fit="onFitView"
			@zoom-in="onZoomIn"
			@zoom-out="onZoomOut"
			@reset-zoom="onResetZoom"
		/>

		<Suspense>
			<ContextMenu @action="onContextMenuAction" />
		</Suspense>
	</VueFlow>
</template>

<style lang="scss" module>
.canvas {
	opacity: 0;

	&.ready {
		opacity: 1;
	}

	&.draggable :global(.vue-flow__pane) {
		cursor: grab;
	}

	:global(.vue-flow__pane.dragging) {
		cursor: grabbing;
	}
}
</style>

<style lang="scss" scoped>
.minimap-enter-active,
.minimap-leave-active {
	transition: opacity 0.3s ease;
}

.minimap-enter-from,
.minimap-leave-to {
	opacity: 0;
}
</style>
