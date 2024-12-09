<script lang="ts" setup>
import type {
	CanvasConnection,
	CanvasNode,
	CanvasNodeMoveEvent,
	CanvasEventBusEvents,
	ConnectStartEvent,
} from '@/types';
import type { Connection, XYPosition, NodeDragEvent, GraphNode } from '@vue-flow/core';
import { useVueFlow, VueFlow, PanelPosition, MarkerType } from '@vue-flow/core';
import { Background } from '@vue-flow/background';
import { MiniMap } from '@vue-flow/minimap';
import Node from './elements/nodes/CanvasNode.vue';
import Edge from './elements/edges/CanvasEdge.vue';
import { computed, onMounted, onUnmounted, provide, ref, toRef, useCssModule, watch } from 'vue';
import type { EventBus } from 'n8n-design-system';
import { createEventBus, useDeviceSupport } from 'n8n-design-system';
import { useContextMenu, type ContextMenuAction } from '@/composables/useContextMenu';
import { useKeybindings } from '@/composables/useKeybindings';
import ContextMenu from '@/components/ContextMenu/ContextMenu.vue';
import type { NodeCreatorOpenSource } from '@/Interface';
import type { PinDataSource } from '@/composables/usePinnedData';
import { isPresent } from '@/utils/typesUtils';
import { GRID_SIZE } from '@/utils/nodeViewUtils';
import { CanvasKey } from '@/constants';
import { onKeyDown, onKeyUp, useThrottleFn } from '@vueuse/core';
import CanvasArrowHeadMarker from './elements/edges/CanvasArrowHeadMarker.vue';
import CanvasBackgroundStripedPattern from './elements/CanvasBackgroundStripedPattern.vue';
import { useCanvasTraversal } from '@/composables/useCanvasTraversal';
import { NodeConnectionType } from 'n8n-workflow';

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
		showBugReportingButton?: boolean;
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

const { controlKeyCode } = useDeviceSupport();

const vueFlow = useVueFlow({ id: props.id, deleteKeyCode: null });
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
	onNodesInitialized,
	findNode,
	viewport,
	onEdgeMouseLeave,
	onEdgeMouseEnter,
	onEdgeMouseMove,
	onNodeMouseEnter,
	onNodeMouseLeave,
} = vueFlow;
const {
	getIncomingNodes,
	getOutgoingNodes,
	getSiblingNodes,
	getDownstreamNodes,
	getUpstreamNodes,
} = useCanvasTraversal(vueFlow);

const isPaneReady = ref(false);

const classes = computed(() => ({
	[$style.canvas]: true,
	[$style.ready]: isPaneReady.value,
}));

/**
 * Key bindings
 */

const disableKeyBindings = computed(() => !props.keyBindings);

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_key_values#whitespace_keys
 */
const panningKeyCode = ref<string[]>([' ', controlKeyCode]);
const panningMouseButton = ref<number[]>([1]);
const selectionKeyCode = ref<true | null>(true);

onKeyDown(panningKeyCode.value, () => {
	selectionKeyCode.value = null;
	panningMouseButton.value = [0, 1];
});

onKeyUp(panningKeyCode.value, () => {
	selectionKeyCode.value = true;
	panningMouseButton.value = [1];
});

function selectLeftNode(id: string) {
	const incomingNodes = getIncomingNodes(id);
	const previousNode = incomingNodes[0];
	if (previousNode) {
		onSelectNodes({ ids: [previousNode.id] });
	}
}

function selectRightNode(id: string) {
	const outgoingNodes = getOutgoingNodes(id);
	const nextNode = outgoingNodes[0];
	if (nextNode) {
		onSelectNodes({ ids: [nextNode.id] });
	}
}

function selectLowerSiblingNode(id: string) {
	const siblingNodes = getSiblingNodes(id);
	const index = siblingNodes.findIndex((n) => n.id === id);
	const nextNode = siblingNodes[index + 1] ?? siblingNodes[0];
	if (nextNode) {
		onSelectNodes({
			ids: [nextNode.id],
		});
	}
}

function selectUpperSiblingNode(id: string) {
	const siblingNodes = getSiblingNodes(id);
	const index = siblingNodes.findIndex((n) => n.id === id);
	const previousNode = siblingNodes[index - 1] ?? siblingNodes[siblingNodes.length - 1];
	if (previousNode) {
		onSelectNodes({
			ids: [previousNode.id],
		});
	}
}

function selectDownstreamNodes(id: string) {
	const downstreamNodes = getDownstreamNodes(id);
	onSelectNodes({ ids: [...downstreamNodes.map((node) => node.id), id] });
}

function selectUpstreamNodes(id: string) {
	const upstreamNodes = getUpstreamNodes(id);
	onSelectNodes({ ids: [...upstreamNodes.map((node) => node.id), id] });
}

const keyMap = computed(() => ({
	ctrl_c: emitWithSelectedNodes((ids) => emit('copy:nodes', ids)),
	enter: emitWithLastSelectedNode((id) => onSetNodeActive(id)),
	ctrl_a: () => addSelectedNodes(graphNodes.value),
	'shift_+|+|=': async () => await onZoomIn(),
	'shift+_|-|_': async () => await onZoomOut(),
	0: async () => await onResetZoom(),
	1: async () => await onFitView(),
	ArrowUp: emitWithLastSelectedNode(selectUpperSiblingNode),
	ArrowDown: emitWithLastSelectedNode(selectLowerSiblingNode),
	ArrowLeft: emitWithLastSelectedNode(selectLeftNode),
	ArrowRight: emitWithLastSelectedNode(selectRightNode),
	shift_ArrowLeft: emitWithLastSelectedNode(selectUpstreamNodes),
	shift_ArrowRight: emitWithLastSelectedNode(selectDownstreamNodes),

	...(props.readOnly
		? {}
		: {
				ctrl_x: emitWithSelectedNodes((ids) => emit('cut:nodes', ids)),
				'delete|backspace': emitWithSelectedNodes((ids) => emit('delete:nodes', ids)),
				ctrl_d: emitWithSelectedNodes((ids) => emit('duplicate:nodes', ids)),
				d: emitWithSelectedNodes((ids) => emit('update:nodes:enabled', ids)),
				p: emitWithSelectedNodes((ids) => emit('update:nodes:pin', ids, 'keyboard-shortcut')),
				f2: emitWithLastSelectedNode((id) => emit('update:node:name', id)),
				tab: () => emit('create:node', 'tab'),
				shift_s: () => emit('create:sticky'),
				ctrl_alt_n: () => emit('create:workflow'),
				ctrl_enter: () => emit('run:workflow'),
				ctrl_s: () => emit('save:workflow'),
			}),
}));

useKeybindings(keyMap, { disabled: disableKeyBindings });

/**
 * Nodes
 */

const hasSelection = computed(() => selectedNodes.value.length > 0);
const selectedNodeIds = computed(() => selectedNodes.value.map((node) => node.id));

const lastSelectedNode = ref<GraphNode>();
watch(selectedNodes, (nodes) => {
	if (!lastSelectedNode.value || !nodes.find((node) => node.id === lastSelectedNode.value?.id)) {
		lastSelectedNode.value = nodes[nodes.length - 1];
	}
});

function onClickNodeAdd(id: string, handle: string) {
	emit('click:node:add', id, handle);
}

function onUpdateNodesPosition(events: CanvasNodeMoveEvent[]) {
	emit('update:nodes:position', events);
}

function onUpdateNodePosition(id: string, position: XYPosition) {
	emit('update:node:position', id, position);
}

function onNodeDragStop(event: NodeDragEvent) {
	onUpdateNodesPosition(event.nodes.map(({ id, position }) => ({ id, position })));
}

function onSelectionDragStop(event: NodeDragEvent) {
	onUpdateNodesPosition(event.nodes.map(({ id, position }) => ({ id, position })));
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
 * Connections / Edges
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
 * Edge and Nodes Hovering
 */

const edgesHoveredById = ref<Record<string, boolean>>({});
const edgesBringToFrontById = ref<Record<string, boolean>>({});

onEdgeMouseEnter(({ edge }) => {
	edgesBringToFrontById.value = { [edge.id]: true };
	edgesHoveredById.value = { [edge.id]: true };
});

onEdgeMouseMove(
	useThrottleFn(({ edge, event }) => {
		const type = edge.data.source.type;
		if (type !== NodeConnectionType.AiTool) {
			return;
		}

		if (!edge.data.maxConnections || edge.data.maxConnections > 1) {
			const projectedPosition = getProjectedPosition(event);
			const yDiff = projectedPosition.y - edge.targetY;
			if (yDiff < 4 * GRID_SIZE) {
				edgesBringToFrontById.value = { [edge.id]: false };
			} else {
				edgesBringToFrontById.value = { [edge.id]: true };
			}
		}
	}, 100),
);

onEdgeMouseLeave(({ edge }) => {
	edgesBringToFrontById.value = { [edge.id]: false };
	edgesHoveredById.value = { [edge.id]: false };
});

function onUpdateEdgeLabelHovered(id: string, hovered: boolean) {
	edgesBringToFrontById.value = { [id]: true };
	edgesHoveredById.value[id] = hovered;
}

const nodesHoveredById = ref<Record<string, boolean>>({});

onNodeMouseEnter(({ node }) => {
	nodesHoveredById.value = { [node.id]: true };
});

onNodeMouseLeave(({ node }) => {
	nodesHoveredById.value = { [node.id]: false };
});

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
const isPaneMoving = ref(false);

function getProjectedPosition(event?: Pick<MouseEvent, 'clientX' | 'clientY'>) {
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

const initialized = ref(false);

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

onNodesInitialized(() => {
	initialized.value = true;
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
	initialized,
	viewport,
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
		:pan-on-drag="panningMouseButton"
		pan-on-scroll
		snap-to-grid
		:snap-grid="[GRID_SIZE, GRID_SIZE]"
		:min-zoom="0"
		:max-zoom="4"
		:class="classes"
		:selection-key-code="selectionKeyCode"
		:pan-activation-key-code="panningKeyCode"
		:disable-keyboard-a11y="true"
		data-test-id="canvas"
		@connect-start="onConnectStart"
		@connect="onConnect"
		@connect-end="onConnectEnd"
		@pane-click="onClickPane"
		@pane-context-menu="onOpenContextMenu"
		@move-start="onPaneMoveStart"
		@move-end="onPaneMoveEnd"
		@node-drag-stop="onNodeDragStop"
		@selection-drag-stop="onSelectionDragStop"
	>
		<template #node-canvas-node="nodeProps">
			<Node
				v-bind="nodeProps"
				:read-only="readOnly"
				:event-bus="eventBus"
				:hovered="nodesHoveredById[nodeProps.id]"
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

		<template #edge-canvas-edge="edgeProps">
			<Edge
				v-bind="edgeProps"
				:marker-end="`url(#${arrowHeadMarkerId})`"
				:read-only="readOnly"
				:hovered="edgesHoveredById[edgeProps.id]"
				:bring-to-front="edgesBringToFrontById[edgeProps.id]"
				@add="onClickConnectionAdd"
				@delete="onDeleteConnection"
				@update:label:hovered="onUpdateEdgeLabelHovered(edgeProps.id, $event)"
			/>
		</template>

		<template #connection-line="connectionLineProps">
			<CanvasConnectionLine v-bind="connectionLineProps" />
		</template>

		<CanvasArrowHeadMarker :id="arrowHeadMarkerId" />

		<Background data-test-id="canvas-background" pattern-color="#aaa" :gap="GRID_SIZE">
			<template v-if="readOnly" #pattern-container="patternProps">
				<CanvasBackgroundStripedPattern
					:id="patternProps.id"
					:x="viewport.x"
					:y="viewport.y"
					:zoom="viewport.zoom"
				/>
			</template>
		</Background>

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
			:show-bug-reporting-button="showBugReportingButton"
			:zoom="viewport.zoom"
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

	:global(.vue-flow__pane) {
		cursor: grab;

		&:global(.selection) {
			cursor: default;
		}

		&:global(.dragging) {
			cursor: grabbing;
		}
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
