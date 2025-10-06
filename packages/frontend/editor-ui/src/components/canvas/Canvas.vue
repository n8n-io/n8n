<script lang="ts" setup>
import ContextMenu from '@/components/ContextMenu/ContextMenu.vue';
import type { CanvasLayoutEvent } from '@/composables/useCanvasLayout';
import { useCanvasLayout } from '@/composables/useCanvasLayout';
import { useCanvasNodeHover } from '@/composables/useCanvasNodeHover';
import { useCanvasTraversal } from '@/composables/useCanvasTraversal';
import type { ContextMenuTarget } from '@/composables/useContextMenu';
import { useContextMenu } from '@/composables/useContextMenu';
import { type KeyMap, useKeybindings } from '@/composables/useKeybindings';
import type { PinDataSource } from '@/composables/usePinnedData';
import { CanvasKey } from '@/constants';
import type { NodeCreatorOpenSource } from '@/Interface';
import type {
	CanvasConnection,
	CanvasEventBusEvents,
	CanvasNode,
	CanvasNodeData,
	CanvasNodeMoveEvent,
	ConnectStartEvent,
} from '@/types';
import { CanvasNodeRenderType } from '@/types';
import { isOutsideSelected } from '@/utils/htmlUtils';
import { getMousePosition, GRID_SIZE, updateViewportToContainNodes } from '@/utils/nodeViewUtils';
import { isPresent } from '@/utils/typesUtils';
import { useDeviceSupport } from '@n8n/composables/useDeviceSupport';
import { useShortKeyPress } from '@n8n/composables/useShortKeyPress';
import type { EventBus } from '@n8n/utils/event-bus';
import { createEventBus } from '@n8n/utils/event-bus';
import type {
	Connection,
	Dimensions,
	GraphNode,
	NodeDragEvent,
	NodeMouseEvent,
	ViewportTransform,
	XYPosition,
} from '@vue-flow/core';
import { getRectOfNodes, MarkerType, PanelPosition, useVueFlow, VueFlow } from '@vue-flow/core';
import { MiniMap } from '@vue-flow/minimap';
import { onKeyDown, onKeyUp, useThrottleFn } from '@vueuse/core';
import { NodeConnectionTypes } from 'n8n-workflow';
import {
	computed,
	nextTick,
	onMounted,
	onUnmounted,
	provide,
	ref,
	toRef,
	useCssModule,
	watch,
} from 'vue';
import { useViewportAutoAdjust } from './composables/useViewportAutoAdjust';
import CanvasBackground from './elements/background/CanvasBackground.vue';
import CanvasArrowHeadMarker from './elements/edges/CanvasArrowHeadMarker.vue';
import CanvasConnectionLine from './elements/edges/CanvasConnectionLine.vue';
import CanvasControlButtons from './elements/buttons/CanvasControlButtons.vue';
import Edge from './elements/edges/CanvasEdge.vue';
import Node from './elements/nodes/CanvasNode.vue';
import { useExperimentalNdvStore } from './experimental/experimentalNdv.store';
import { type ContextMenuAction } from '@/composables/useContextMenuItems';

const $style = useCssModule();

const emit = defineEmits<{
	'update:modelValue': [elements: CanvasNode[]];
	'update:node:position': [id: string, position: XYPosition];
	'update:nodes:position': [events: CanvasNodeMoveEvent[]];
	'update:node:activated': [id: string, event?: MouseEvent];
	'update:node:deactivated': [id: string];
	'update:node:enabled': [id: string];
	'update:node:selected': [id?: string];
	'update:node:name': [id: string];
	'update:node:parameters': [id: string, parameters: Record<string, unknown>];
	'update:node:inputs': [id: string];
	'update:node:outputs': [id: string];
	'update:logs-open': [open?: boolean];
	'update:logs:input-open': [open?: boolean];
	'update:logs:output-open': [open?: boolean];
	'update:has-range-selection': [isActive: boolean];
	'click:node': [id: string, position: XYPosition];
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
	'drag-and-drop': [position: XYPosition, event: DragEvent];
	'tidy-up': [CanvasLayoutEvent, { trackEvents?: boolean }];
	'toggle:focus-panel': [];
	'viewport:change': [viewport: ViewportTransform, dimensions: Dimensions];
	'selection:end': [position: XYPosition];
	'open:sub-workflow': [nodeId: string];
	'start-chat': [];
	'extract-workflow': [ids: string[]];
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
		loading?: boolean;
		suppressInteraction?: boolean;
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
		loading: false,
		suppressInteraction: false,
	},
);

const { isMobileDevice, controlKeyCode } = useDeviceSupport();
const experimentalNdvStore = useExperimentalNdvStore();

const isExperimentalNdvActive = computed(() => experimentalNdvStore.isActive(viewport.value.zoom));

const vueFlow = useVueFlow(props.id);
const {
	getSelectedNodes: selectedNodes,
	addSelectedNodes,
	removeSelectedNodes,
	viewportRef,
	fitView,
	fitBounds,
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
	dimensions,
	nodesSelectionActive,
	userSelectionRect,
	setViewport,
	setCenter,
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
const { layout } = useCanvasLayout(props.id, isExperimentalNdvActive);

const isPaneReady = ref(false);

const classes = computed(() => ({
	[$style.canvas]: true,
	[$style.ready]: !props.loading && isPaneReady.value,
	[$style.isExperimentalNdvActive]: isExperimentalNdvActive.value,
}));

/**
 * Panning and Selection key bindings
 */

// @see https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_key_values#whitespace_keys
const panningKeyCode = ref<string[] | true>(isMobileDevice ? true : [' ', controlKeyCode]);
const panningMouseButton = ref<number[] | true>(isMobileDevice ? true : [1]);
const selectionKeyCode = ref<string | true | null>(isMobileDevice ? 'Shift' : true);
const isInPanningMode = ref(false);

function switchToPanningMode() {
	selectionKeyCode.value = null;
	panningMouseButton.value = [0, 1];
	isInPanningMode.value = true;
}

function switchToSelectionMode() {
	selectionKeyCode.value = true;
	panningMouseButton.value = [1];
	isInPanningMode.value = false;
}

onKeyDown(panningKeyCode.value, switchToPanningMode, {
	dedupe: true,
});

onKeyUp(panningKeyCode.value, switchToSelectionMode);

/**
 * Rename node key bindings
 * We differentiate between short and long press because the space key is also used for activating panning
 */

const renameKeyCode = ' ';

useShortKeyPress(
	renameKeyCode,
	() => {
		if (lastSelectedNode.value && lastSelectedNode.value.id !== CanvasNodeRenderType.AIPrompt) {
			emit('update:node:name', lastSelectedNode.value.id);
		}
	},
	{
		disabled: toRef(props, 'readOnly'),
	},
);

/**
 * Key bindings
 */

const disableKeyBindings = computed(() => !props.keyBindings);

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

function onToggleZoomMode() {
	experimentalNdvStore.toggleZoomMode({
		canvasViewport: viewport.value,
		canvasDimensions: dimensions.value,
		selectedNodes: selectedNodes.value,
		setViewport,
		fitView,
		zoomTo,
		setCenter,
	});
}

const keyMap = computed(() => {
	const readOnlyKeymap: KeyMap = {
		ctrl_shift_o: emitWithLastSelectedNode((id) => emit('open:sub-workflow', id)),
		ctrl_c: {
			disabled: () => isOutsideSelected(viewportRef.value),
			run: emitWithSelectedNodes((ids) => emit('copy:nodes', ids)),
		},
		enter: emitWithLastSelectedNode((id) => onSetNodeActivated(id)),
		ctrl_a: () => addSelectedNodes(graphNodes.value),
		// Support both key and code for zooming in and out
		'shift_+|+|=|shift_Equal|Equal': async () => await onZoomIn(),
		'shift+_|-|_|shift_Minus|Minus': async () => await onZoomOut(),
		0: async () => await onResetZoom(),
		1: async () => await onFitView(),
		ArrowUp: emitWithLastSelectedNode(selectUpperSiblingNode),
		ArrowDown: emitWithLastSelectedNode(selectLowerSiblingNode),
		ArrowLeft: emitWithLastSelectedNode(selectLeftNode),
		ArrowRight: emitWithLastSelectedNode(selectRightNode),
		shift_ArrowLeft: emitWithLastSelectedNode(selectUpstreamNodes),
		shift_ArrowRight: emitWithLastSelectedNode(selectDownstreamNodes),
		l: () => emit('update:logs-open'),
		i: () => emit('update:logs:input-open'),
		o: () => emit('update:logs:output-open'),
		z: onToggleZoomMode,
	};

	if (props.readOnly) return readOnlyKeymap;

	const fullKeymap: KeyMap = {
		...readOnlyKeymap,
		ctrl_x: emitWithSelectedNodes((ids) => emit('cut:nodes', ids)),
		'delete|backspace': emitWithSelectedNodes((ids) => emit('delete:nodes', ids)),
		ctrl_d: emitWithSelectedNodes((ids) => emit('duplicate:nodes', ids)),
		d: emitWithSelectedNodes((ids) => emit('update:nodes:enabled', ids)),
		p: emitWithSelectedNodes((ids) => emit('update:nodes:pin', ids, 'keyboard-shortcut')),
		f2: emitWithLastSelectedNode((id) => emit('update:node:name', id)),
		tab: () => emit('create:node', 'tab'),
		shift_s: () => emit('create:sticky'),
		shift_f: () => emit('toggle:focus-panel'),
		ctrl_alt_n: () => emit('create:workflow'),
		ctrl_enter: () => emit('run:workflow'),
		ctrl_s: () => emit('save:workflow'),
		shift_alt_t: async () => await onTidyUp({ source: 'keyboard-shortcut' }),
		alt_x: emitWithSelectedNodes((ids) => emit('extract-workflow', ids)),
		c: () => emit('start-chat'),
	};
	return fullKeymap;
});

useKeybindings(keyMap, { disabled: disableKeyBindings });

/**
 * Nodes
 */

const hasSelection = computed(() => selectedNodes.value.length > 0);
const selectedNodeIds = computed(() => selectedNodes.value.map((node) => node.id));

const lastSelectedNode = ref<GraphNode>();
const triggerNodes = computed(() =>
	props.nodes.filter(
		(node) =>
			node.data?.render.type === CanvasNodeRenderType.Default && node.data.render.options.trigger,
	),
);

const hoveredTriggerNode = useCanvasNodeHover(triggerNodes, vueFlow, (nodeRect) => ({
	x: nodeRect.x - nodeRect.width * 2, // should cover the width of trigger button
	y: nodeRect.y - nodeRect.height,
	width: nodeRect.width * 4,
	height: nodeRect.height * 3,
}));

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

function onNodeClick({ event, node }: NodeMouseEvent) {
	emit('click:node', node.id, getProjectedPosition(event));

	if (event.ctrlKey || event.metaKey || selectedNodes.value.length < 2) {
		return;
	}

	onSelectNodes({ ids: [node.id] });
}

function onSelectionDragStop(event: NodeDragEvent) {
	onUpdateNodesPosition(event.nodes.map(({ id, position }) => ({ id, position })));
}

function onSelectionEnd(event: MouseEvent) {
	if (selectedNodes.value.length === 1) {
		nodesSelectionActive.value = false;
	}

	emit('selection:end', getProjectedPosition(event));
}

function onSetNodeActivated(id: string, event?: MouseEvent) {
	props.eventBus.emit('nodes:action', { ids: [id], action: 'update:node:activated' });
	emit('update:node:activated', id, event);
}

function onSetNodeDeactivated(id: string) {
	emit('update:node:deactivated', id);
}

function clearSelectedNodes() {
	removeSelectedNodes(selectedNodes.value);
}

function onSelectNode() {
	emit('update:node:selected', lastSelectedNode.value?.id);
}

function onSelectNodes({ ids, panIntoView }: CanvasEventBusEvents['nodes:select']) {
	clearSelectedNodes();
	addSelectedNodes(ids.map(findNode).filter(isPresent));

	if (panIntoView) {
		const nodes = ids.map(findNode).filter(isPresent);

		if (nodes.length === 0) {
			return;
		}

		const newViewport = updateViewportToContainNodes(viewport.value, dimensions.value, nodes, 100);

		void setViewport(newViewport, { duration: 200, interpolate: 'linear' });
	}
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

function onUpdateNodeInputs(id: string) {
	emit('update:node:inputs', id);

	// Let VueFlow update connection paths to match the new handle position
	void nextTick(() => vueFlow.updateNodeInternals([id]));
}

function onUpdateNodeOutputs(id: string) {
	emit('update:node:outputs', id);

	// Let VueFlow update connection paths to match the new handle position
	void nextTick(() => vueFlow.updateNodeInternals([id]));
}

function onFocusNode(id: string) {
	const node = vueFlow.nodeLookup.value.get(id);

	if (node) {
		addSelectedNodes([node]);
		experimentalNdvStore.focusNode(node, {
			canvasViewport: viewport.value,
			canvasDimensions: dimensions.value,
			setCenter,
		});
	}
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
		if (type !== NodeConnectionTypes.AiTool) {
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

useViewportAutoAdjust(viewportRef, viewport, setViewport);

function getProjectedPosition(event?: MouseEvent | TouchEvent) {
	const bounds = viewportRef.value?.getBoundingClientRect() ?? { left: 0, top: 0 };
	const [offsetX, offsetY] = event ? getMousePosition(event) : [0, 0];

	return project({
		x: offsetX - bounds.left,
		y: offsetY - bounds.top,
	});
}

function onClickPane(event: MouseEvent) {
	emit('click:pane', getProjectedPosition(event));
}

async function onFitBounds(nodes: GraphNode[]) {
	await fitBounds(getRectOfNodes(nodes), { padding: 2 });
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

function onPaneMove({ event }: { event: unknown }) {
	// The event object is either D3ZoomEvent or WheelEvent.
	// Here I'm ignoring D3ZoomEvent because it's not necessarily followed by a moveEnd event.
	// This can be simplified once https://github.com/bcakmakoglu/vue-flow/issues/1908 is resolved
	if (isInPanningMode.value || event instanceof WheelEvent) {
		isPaneMoving.value = true;
	}
}

function onPaneMoveEnd() {
	isPaneMoving.value = false;
}

function onViewportChange() {
	emit('viewport:change', viewport.value, dimensions.value);
}

// #AI-716: Due to a bug in vue-flow reactivity, the node data is not updated when the node is added
// resulting in outdated data. We use this computed property as a workaround to get the latest node data.
const nodeDataById = computed(() => {
	return props.nodes.reduce<Record<string, CanvasNodeData>>((acc, node) => {
		acc[node.id] = node.data as CanvasNodeData;
		return acc;
	}, {});
});

/**
 * Context menu
 */

const contextMenu = useContextMenu();

function onOpenContextMenu(event: MouseEvent, target?: Pick<ContextMenuTarget, 'nodeId'>) {
	contextMenu.open(event, {
		source: 'canvas',
		nodeIds: selectedNodeIds.value,
		...target,
	});
}

function onOpenSelectionContextMenu({ event }: { event: MouseEvent }) {
	onOpenContextMenu(event);
}

function onOpenNodeContextMenu(
	id: string,
	event: MouseEvent,
	source: 'node-button' | 'node-right-click',
) {
	if (source === 'node-button') {
		contextMenu.open(event, { source, nodeId: id });
	} else if (selectedNodeIds.value.length > 1 && selectedNodeIds.value.includes(id)) {
		onOpenContextMenu(event, { nodeId: id });
	} else {
		onSelectNodes({ ids: [id] });
		contextMenu.open(event, { source, nodeId: id });
	}
}

async function onContextMenuAction(action: ContextMenuAction, nodeIds: string[]) {
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
			return onSetNodeActivated(nodeIds[0]);
		case 'rename':
			return emit('update:node:name', nodeIds[0]);
		case 'change_color':
			return props.eventBus.emit('nodes:action', { ids: nodeIds, action: 'update:sticky:color' });
		case 'tidy_up':
			return await onTidyUp({ source: 'context-menu' });
		case 'extract_sub_workflow':
			return emit('extract-workflow', nodeIds);
		case 'open_sub_workflow': {
			return emit('open:sub-workflow', nodeIds[0]);
		}
	}
}

async function onTidyUp(payload: CanvasEventBusEvents['tidyUp']) {
	if (payload.nodeIdsFilter && payload.nodeIdsFilter.length > 0) {
		clearSelectedNodes();
		addSelectedNodes(payload.nodeIdsFilter.map(findNode).filter(isPresent));
	}
	const applyOnSelection = selectedNodes.value.length > 1;
	const target = applyOnSelection ? 'selection' : 'all';
	const result = layout(target);

	emit('tidy-up', { result, target, source: payload.source }, { trackEvents: payload.trackEvents });

	await nextTick();
	if (applyOnSelection) {
		await onFitBounds(selectedNodes.value);
	} else {
		await onFitView();
	}
}

/**
 * Drag and drop
 */

function onDragOver(event: DragEvent) {
	event.preventDefault();
}

function onDrop(event: DragEvent) {
	const position = getProjectedPosition(event);

	emit('drag-and-drop', position, event);
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
 * Window Events
 */

function onWindowBlur() {
	switchToSelectionMode();
}

/**
 * Lifecycle
 */

const initialized = ref(false);

onMounted(() => {
	props.eventBus.on('fitView', onFitView);
	props.eventBus.on('nodes:select', onSelectNodes);
	props.eventBus.on('nodes:selectAll', () => addSelectedNodes(graphNodes.value));
	props.eventBus.on('tidyUp', onTidyUp);
	window.addEventListener('blur', onWindowBlur);
});

onUnmounted(() => {
	props.eventBus.off('fitView', onFitView);
	props.eventBus.off('nodes:select', onSelectNodes);
	props.eventBus.off('tidyUp', onTidyUp);
	window.removeEventListener('blur', onWindowBlur);
});

onPaneReady(async () => {
	await onFitView();
	isPaneReady.value = true;
});

onNodesInitialized(() => {
	initialized.value = true;
});

watch(
	[() => props.readOnly, () => props.suppressInteraction],
	([readOnly, suppressInteraction]) => {
		setInteractive(!readOnly && !suppressInteraction);
		elementsSelectable.value = !suppressInteraction;
	},
	{
		immediate: true,
	},
);

watch([nodesSelectionActive, userSelectionRect], ([isActive, rect]) =>
	emit('update:has-range-selection', isActive || (rect?.width ?? 0) > 0 || (rect?.height ?? 0) > 0),
);

watch([vueFlow.nodes, () => experimentalNdvStore.nodeNameToBeFocused], ([nodes, toFocusName]) => {
	const toFocusNode =
		toFocusName &&
		(nodes as Array<GraphNode<CanvasNodeData>>).find((n) => n.data.name === toFocusName);

	if (!toFocusNode) {
		return;
	}

	// setTimeout() so that this happens after layout recalculation with the node to be focused
	setTimeout(() => {
		experimentalNdvStore.focusNode(toFocusNode, {
			canvasViewport: viewport.value,
			canvasDimensions: dimensions.value,
			setCenter,
		});
	});
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
	isExperimentalNdvActive,
	isPaneMoving,
});

defineExpose({
	executeContextMenuAction: onContextMenuAction,
});
</script>

<template>
	<VueFlow
		:id="id"
		:nodes="nodes"
		:edges="connections"
		:class="classes"
		:apply-changes="false"
		:connection-line-options="{ markerEnd: MarkerType.ArrowClosed }"
		:connection-radius="60"
		:pan-on-drag="panningMouseButton"
		pan-on-scroll
		snap-to-grid
		:snap-grid="[GRID_SIZE, GRID_SIZE]"
		:min-zoom="0"
		:max-zoom="experimentalNdvStore.isZoomedViewEnabled ? experimentalNdvStore.maxCanvasZoom : 4"
		:selection-key-code="selectionKeyCode"
		:zoom-activation-key-code="panningKeyCode"
		:pan-activation-key-code="panningKeyCode"
		:disable-keyboard-a11y="true"
		:delete-key-code="null"
		data-test-id="canvas"
		@connect-start="onConnectStart"
		@connect="onConnect"
		@connect-end="onConnectEnd"
		@pane-click="onClickPane"
		@pane-context-menu="onOpenContextMenu"
		@move="onPaneMove"
		@move-end="onPaneMoveEnd"
		@node-drag-stop="onNodeDragStop"
		@node-click="onNodeClick"
		@selection-drag-stop="onSelectionDragStop"
		@selection-end="onSelectionEnd"
		@selection-context-menu="onOpenSelectionContextMenu"
		@dragover="onDragOver"
		@drop="onDrop"
		@viewport-change="onViewportChange"
	>
		<template #node-canvas-node="nodeProps">
			<slot name="node" v-bind="{ nodeProps }">
				<Node
					v-bind="nodeProps"
					:data="nodeDataById[nodeProps.id]"
					:read-only="readOnly"
					:event-bus="eventBus"
					:hovered="nodesHoveredById[nodeProps.id]"
					:nearby-hovered="nodeProps.id === hoveredTriggerNode.id.value"
					@delete="onDeleteNode"
					@run="onRunNode"
					@select="onSelectNode"
					@toggle="onToggleNodeEnabled"
					@activate="onSetNodeActivated"
					@deactivate="onSetNodeDeactivated"
					@open:contextmenu="onOpenNodeContextMenu"
					@update="onUpdateNodeParameters"
					@update:inputs="onUpdateNodeInputs"
					@update:outputs="onUpdateNodeOutputs"
					@move="onUpdateNodePosition"
					@add="onClickNodeAdd"
					@focus="onFocusNode"
				>
					<template v-if="$slots.nodeToolbar" #toolbar="toolbarProps">
						<slot name="nodeToolbar" v-bind="toolbarProps" />
					</template>
				</Node>
			</slot>
		</template>

		<template #edge-canvas-edge="edgeProps">
			<slot name="edge" v-bind="{ edgeProps, arrowHeadMarkerId }">
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
			</slot>
		</template>

		<template #connection-line="connectionLineProps">
			<CanvasConnectionLine v-bind="connectionLineProps" />
		</template>

		<CanvasArrowHeadMarker :id="arrowHeadMarkerId" />

		<slot name="canvas-background" v-bind="{ viewport }">
			<CanvasBackground :viewport="viewport" :striped="readOnly" />
		</slot>

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
			:zoom="viewport.zoom"
			:read-only="readOnly"
			:is-experimental-ndv-active="isExperimentalNdvActive"
			@zoom-to-fit="onFitView"
			@zoom-in="onZoomIn"
			@zoom-out="onZoomOut"
			@reset-zoom="onResetZoom"
			@tidy-up="onTidyUp({ source: 'canvas-button' })"
			@toggle-zoom-mode="onToggleZoomMode"
		/>

		<Suspense>
			<ContextMenu @action="onContextMenuAction" />
		</Suspense>
	</VueFlow>
</template>

<style lang="scss" module>
.canvas {
	width: 100%;
	height: 100%;
	opacity: 0;
	transition: opacity 300ms ease;

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

	&.isExperimentalNdvActive {
		--canvas-zoom-compensation-factor: 0.5;
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
