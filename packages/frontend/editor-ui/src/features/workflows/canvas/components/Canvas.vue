<script lang="ts" setup>
import ContextMenu from '@/features/shared/contextMenu/components/ContextMenu.vue';
import type { ContextMenuTarget } from '@/features/shared/contextMenu/composables/useContextMenu';
import { useContextMenu } from '@/features/shared/contextMenu/composables/useContextMenu';
import type { CanvasLayoutEvent } from '../composables/useCanvasLayout';
import { useCanvasLayout } from '../composables/useCanvasLayout';
import { useCanvasNodeHover } from '../composables/useCanvasNodeHover';
import { useCanvasTraversal } from '../composables/useCanvasTraversal';
import { type KeyMap, useKeybindings } from '@/app/composables/useKeybindings';
import type { PinDataSource } from '@/app/composables/usePinnedData';
import {
	CANVAS_GROUP_HEADER_TOGGLE_SUPPRESS_DURATION,
	CanvasKey,
	MODAL_CONFIRM,
} from '@/app/constants';
import { useMessage } from '@/app/composables/useMessage';
import { useSelectionValidation } from '@/app/composables/useSelectionValidation';
import { useToast } from '@/app/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { useUsersStore } from '@/features/settings/users/users.store';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { NODE_CREATOR_SHORTCUT_COACHMARK_KEY } from '@/features/shared/nodeCreator/composables/useNodeCreatorShortcutCoachmark';
import type { NodeCreatorOpenSource } from '@/Interface';
import type {
	CanvasConnection,
	CanvasEventBusEvents,
	CanvasGroupNodeData,
	CanvasNode,
	CanvasNodeData,
	CanvasNodeMoveEvent,
	CanvasNodeOrGroup,
	ConnectStartEvent,
} from '../canvas.types';
import {
	CanvasNodeRenderType,
	createCanvasGroupNodeId,
	isCanvasGroupNode,
	parseCanvasGroupNodeId,
} from '../canvas.types';
import { isOutsideSelected } from '@/app/utils/htmlUtils';
import {
	getMousePosition,
	GRID_SIZE,
	updateViewportToContainNodes,
} from '@/app/utils/nodeViewUtils';
import { isPresent } from '@/app/utils/typesUtils';
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
import { NodeConnectionTypes, type IConnections, type IWorkflowGroup } from 'n8n-workflow';
import { shouldIgnoreCanvasShortcut, type CanvasRenderData } from '../canvas.utils';
import { CanvasRenderDataKey } from '@/app/constants/injectionKeys';
import {
	computed,
	inject,
	nextTick,
	onMounted,
	onUnmounted,
	provide,
	ref,
	toRef,
	useCssModule,
	watch,
} from 'vue';
import { useViewportAutoAdjust } from '../composables/useViewportAutoAdjust';
import CanvasBackground from './elements/background/CanvasBackground.vue';
import CanvasArrowHeadMarker from './elements/edges/CanvasArrowHeadMarker.vue';
import CanvasConnectionLine from './elements/edges/CanvasConnectionLine.vue';
import CanvasControlButtons from './elements/buttons/CanvasControlButtons.vue';
import Edge from './elements/edges/CanvasEdge.vue';
import Node from './elements/nodes/CanvasNode.vue';
import CanvasNodeGroupTitleBar from './elements/groups/CanvasNodeGroupTitleBar.vue';
import CanvasSelectionToolbar from './elements/selection/CanvasSelectionToolbar.vue';
import { useCanvasNodeGroupActions } from '../composables/useCanvasNodeGroupActions';
import { useCanvasNodeGroupDrag } from '../composables/useCanvasNodeGroupDrag';
import { useCanvasNodeGroupSelection } from '../composables/useCanvasNodeGroupSelection';
import {
	useCanvasNodeGroupTelemetry,
	type CanvasNodeGroupEventSource,
} from '../composables/useCanvasNodeGroupTelemetry';
import { NodeGroupViewKey } from '../composables/useCanvasNodeGroupView';
import { NodeGroupDescriptionVisibilityKey } from '../composables/useCanvasNodeGroupDescriptionVisibility';
import { useExperimentalNdvStore } from '../experimental/experimentalNdv.store';
import { type ContextMenuAction } from '@/features/shared/contextMenu/composables/useContextMenuItems';
import { useFocusedNodesStore } from '@/features/ai/assistant/focusedNodes.store';
import { useChatPanelStore } from '@/features/ai/assistant/chatPanel.store';
import { useSetupPanelStore } from '@/features/setupPanel/setupPanel.store';
import { useCanvasAgentNodeGeometry } from '../composables/useCanvasAgentNodeGeometry';

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
	'update:selected-group': [id: string | null];
	'click:node': [id: string, position: XYPosition];
	'click:node:add': [id: string, handle: string];
	'run:node': [id: string];
	'copy:production:url': [id: string];
	'copy:test:url': [id: string];
	'delete:node': [id: string];
	'replace:node': [id: string];
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
	'create:workflow': [];
	'drag-and-drop': [position: XYPosition, event: DragEvent];
	'tidy-up': [
		CanvasLayoutEvent,
		{
			trackEvents?: boolean;
			trackHistory?: boolean;
			trackBulk?: boolean;
		},
	];
	'toggle:focus-panel': [];
	'viewport:change': [viewport: ViewportTransform, dimensions: Dimensions];
	'selection:end': [position: XYPosition];
	'open:sub-workflow': [nodeId: string];
	'start-chat': [];
	'extract-workflow': [ids: string[]];
	'save:workflow': [];
}>();

const props = withDefaults(
	defineProps<{
		id?: string;
		nodes: CanvasNodeOrGroup[];
		connections: CanvasConnection[];
		controlsPosition?: PanelPosition;
		eventBus?: EventBus<CanvasEventBusEvents>;
		renderData: CanvasRenderData;
		nodeDisplaySizeById?: Record<string, { width: number; height: number }>;
		readOnly?: boolean;
		canExecute?: boolean;
		executing?: boolean;
		keyBindings?: boolean;
		loading?: boolean;
		suppressInteraction?: boolean;
		hideControls?: boolean;
		stripedBackground?: boolean;
		showNodeGroups?: boolean;
		initialViewport?: ViewportTransform | null;
	}>(),
	{
		id: 'canvas',
		nodes: () => [],
		connections: () => [],
		controlsPosition: PanelPosition.BottomLeft,
		eventBus: () => createEventBus(),
		nodeDisplaySizeById: () => ({}),
		readOnly: false,
		canExecute: false,
		executing: false,
		keyBindings: true,
		loading: false,
		suppressInteraction: false,
		hideControls: false,
		stripedBackground: true,
		showNodeGroups: true,
	},
);

const { isMobileDevice, controlKeyCode } = useDeviceSupport();
const usersStore = useUsersStore();
const workflowDocumentStore = injectWorkflowDocumentStore();
const message = useMessage();
const toast = useToast();
const i18n = useI18n();

const renderData = toRef(props, 'renderData');
provide(CanvasRenderDataKey, renderData);
const experimentalNdvStore = useExperimentalNdvStore();
const focusedNodesStore = useFocusedNodesStore();
const chatPanelStore = useChatPanelStore();
const setupPanelStore = useSetupPanelStore();

const isExperimentalNdvActive = computed(() => experimentalNdvStore.isActive(viewport.value.zoom));

const vueFlowNodes = computed(() =>
	props.showNodeGroups ? props.nodes : props.nodes.filter((node) => !isCanvasGroupNode(node)),
);

const vueFlow = useVueFlow(props.id);
const {
	getSelectedNodes: selectedNodesAndGroups,
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
	onNodesChange,
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

const agentNodeGeometry = useCanvasAgentNodeGeometry({
	canvasId: props.id,
	getNodeById: (id) => workflowDocumentStore.value.getNodeById(id),
	setNodePosition: (id, position) =>
		workflowDocumentStore.value.setNodePositionById(id, [position.x, position.y]),
	onNodesChange,
});
const {
	getIncomingNodes,
	getOutgoingNodes,
	getSiblingNodes,
	getDownstreamNodes,
	getUpstreamNodes,
} = useCanvasTraversal(vueFlow);
const { layout } = useCanvasLayout(props.id, isExperimentalNdvActive, toRef(props, 'renderData'));

const selectedNodes = computed(() =>
	selectedNodesAndGroups.value.filter((node) => !isCanvasGroupNode(node)),
);
const selectableNodesAndGroups = computed(() =>
	graphNodes.value.filter((node) => !isCanvasGroupNode(node) || node.selectable),
);

const isPaneReady = ref(false);
const autofocusGroupTitleId = ref<string | null>(null);
const injectedNodeGroupView = inject(NodeGroupViewKey, null);
const injectedNodeGroupDescriptionVisibility = inject(NodeGroupDescriptionVisibilityKey, null);

const classes = computed(() => ({
	[$style.canvas]: true,
	[$style.ready]: !props.loading && isPaneReady.value,
	[$style.isExperimentalNdvActive]: isExperimentalNdvActive.value,
	spotlightActive: setupPanelStore.isHighlightActive,
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
		// A selection that unambiguously targets a group renames the group;
		// anything else falls through to node rename.
		if (renameSelectedGroup()) return;
		if (lastSelectedNode.value) {
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

function onNodeGroupCreated(groupId: string) {
	const group = workflowDocumentStore.value.getGroupById(groupId);
	if (group) {
		handleGroupCreated(group, 'group-toolbar');
	}
}

function onNodeGroupTitleFocused(groupId: string) {
	if (autofocusGroupTitleId.value === groupId) {
		autofocusGroupTitleId.value = null;
	}
}

const {
	canGroup: canGroupSelection,
	canUngroup: canUngroupSelection,
	groupNodes,
	groupSelection,
	renameGroup,
	updateGroupDescription,
	ungroup,
	selectedGroupIds,
} = useCanvasNodeGroupActions(selectedNodesAndGroups, {
	readOnly: () => props.readOnly || props.suppressInteraction,
});

const { isSelectionExtractable } = useSelectionValidation();

// Groups that can be extracted to sub-workflows
const extractableGroupIds = computed(() => {
	const ids = new Set<string>();
	for (const group of workflowDocumentStore.value.allGroups) {
		if (isSelectionExtractable(group.nodeIds).valid) {
			ids.add(group.id);
		}
	}
	return ids;
});

const soleSelectedGroupId = computed<string | null>(() => {
	const selectedGroups = selectedNodesAndGroups.value.filter(isCanvasGroupNode);
	if (selectedGroups.length !== 1) return null;

	const groupId = parseCanvasGroupNodeId(selectedGroups[0].id);
	if (!groupId) return null;
	const group = workflowDocumentStore.value.getGroupById(groupId);
	if (!group) return null;

	const memberIds = new Set(group.nodeIds);
	return selectedNodes.value.every((node) => memberIds.has(node.id)) ? groupId : null;
});

const groupTelemetry = useCanvasNodeGroupTelemetry();

function handleGroupCreated(group: IWorkflowGroup, source: CanvasNodeGroupEventSource) {
	autofocusGroupTitleId.value = group.id;
	groupTelemetry.trackGrouped(group, source);
}

function onKeyboardGroup() {
	const group = groupSelection();
	if (group) {
		handleGroupCreated(group, 'keyboard-shortcut');
	}
}

const keyMap = computed(() => {
	const readOnlyKeymap: KeyMap = {
		ctrl_shift_o: emitWithLastSelectedNode((id) => emit('open:sub-workflow', id)),
		ctrl_c: {
			disabled: () => isOutsideSelected(viewportRef.value),
			run: emitWithSelectedNodes((ids) => emit('copy:nodes', ids)),
		},
		enter: emitWithLastSelectedNode((id) => onSetNodeActivated(id)),
		ctrl_a: onSelectAllNodes,
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

	// Group collapse state is a view preference, so expanding/collapsing
	// groups works in read-only canvases too.
	const hasNoGroups = () => workflowDocumentStore.value.allGroups.length === 0;
	readOnlyKeymap.alt_g = {
		disabled: hasNoGroups,
		run: () => onKeyboardSetGroupsExpanded(true),
	};
	readOnlyKeymap.shift_alt_g = {
		disabled: hasNoGroups,
		run: () => onKeyboardSetGroupsExpanded(false),
	};

	if (props.readOnly && props.canExecute) {
		return { ...readOnlyKeymap, ctrl_enter: () => emit('run:workflow') };
	}
	if (props.readOnly) return readOnlyKeymap;

	const fullKeymap: KeyMap = {
		...readOnlyKeymap,
		ctrl_x: emitWithSelectedNodes((ids) => emit('cut:nodes', ids)),
		'delete|backspace': onDeleteSelection,
		ctrl_d: emitWithSelectedNodes((ids) => emit('duplicate:nodes', ids)),
		d: emitWithSelectedNodes((ids) => emit('update:nodes:enabled', ids)),
		p: emitWithSelectedNodes((ids) => emit('update:nodes:pin', ids, 'keyboard-shortcut')),
		f2: emitWithLastSelectedNode((id) => emit('update:node:name', id)),
		n: () => emit('create:node', 'node_shortcut'),
		tab: {
			disabled: () => usersStore.isCalloutDismissed(NODE_CREATOR_SHORTCUT_COACHMARK_KEY),
			run: () => {
				props.eventBus.emit('deprecated:tab-shortcut');
			},
		},
		shift_s: () => emit('create:sticky'),
		shift_f: () => emit('toggle:focus-panel'),
		ctrl_alt_n: () => emit('create:workflow'),
		ctrl_enter: () => emit('run:workflow'),
		// override the default cmd+s which saves the page html as file
		// also triggers manual save when autosave is disabled
		ctrl_s: () => emit('save:workflow'),
		shift_alt_t: async () => await onTidyUp({ source: 'keyboard-shortcut' }),
		alt_x: emitWithSelectedNodes((ids) => emit('extract-workflow', ids)),
		c: () => emit('start-chat'),
		r: emitWithLastSelectedNode((id) => emit('replace:node', id)),
		shift_alt_u: emitWithLastSelectedNode((id) => emit('copy:test:url', id)),
		alt_u: emitWithLastSelectedNode((id) => emit('copy:production:url', id)),
		alt_i: emitWithSelectedNodes((ids) => onAddSelectedNodesToAi(ids)),
	};

	fullKeymap.ctrl_g = {
		disabled: () => !canGroupSelection.value,
		run: onKeyboardGroup,
	};
	fullKeymap.ctrl_shift_g = {
		disabled: () => !canUngroupSelection.value,
		run: () => {
			// Through the same path as the title-bar button so push effects
			// are committed before each group is removed.
			for (const groupId of selectedGroupIds.value) {
				onCanvasGroupUngroup(groupId, 'keyboard-shortcut');
			}
		},
	};

	return fullKeymap;
});

useKeybindings(keyMap, { disabled: disableKeyBindings });

/**
 * Nodes
 */

const selectedNodeIds = computed(() => selectedNodes.value.map((node) => node.id));

// Selected node ids, with each selected group expanded to its members so bulk
// operations (copy, duplicate, …) reach the nodes its title bar stands for.
// Expanded groups already have their members selected; this mainly covers
// collapsed groups, whose members are hidden.
const selectedNodeIdsWithGroupMembers = computed(() => {
	const ids = new Set(selectedNodeIds.value);
	for (const node of selectedNodesAndGroups.value) {
		if (!isCanvasGroupNode(node)) continue;
		for (const memberId of (node.data as CanvasGroupNodeData).group.nodeIds) {
			ids.add(memberId);
		}
	}
	return [...ids];
});

const lastSelectedNode = ref<GraphNode>();
const triggerNodes = computed<CanvasNode[]>(() =>
	props.nodes.filter((node): node is CanvasNode => {
		if (isCanvasGroupNode(node)) return false;
		return (
			node.data?.render.type === CanvasNodeRenderType.Default &&
			node.data.render.options.trigger === true
		);
	}),
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

watch(selectedNodeIds, (newIds) => {
	if (chatPanelStore.isOpen && focusedNodesStore.isFeatureEnabled) {
		focusedNodesStore.setUnconfirmedFromCanvasSelection(newIds);
	}
});

// Surface a selected group so surfaces outside the canvas (logs panel) can sync to it
const selectedCanvasGroupId = computed(() => {
	const groupNode = selectedNodesAndGroups.value.find((node) => isCanvasGroupNode(node));
	return (groupNode && parseCanvasGroupNodeId(groupNode.id)) ?? null;
});
watch(selectedCanvasGroupId, (id) => emit('update:selected-group', id), { immediate: true });

watch(
	() => chatPanelStore.isOpen,
	(isOpen) => {
		if (isOpen && selectedNodeIds.value.length > 0 && focusedNodesStore.isFeatureEnabled) {
			focusedNodesStore.setUnconfirmedFromCanvasSelection(selectedNodeIds.value);
		}
	},
);

function onClickNodeAdd(id: string, handle: string) {
	emit('click:node:add', id, handle);
}

function getStoredNodePositionById(nodeId: string) {
	return workflowDocumentStore.value.getNodeById(nodeId)?.position;
}

function onUpdateNodePosition(id: string, position: XYPosition) {
	commitManualNodePositions([{ id, position }]);
}

function commitManualNodePositions(events: CanvasNodeMoveEvent[]) {
	emit(
		'update:nodes:position',
		injectedNodeGroupView?.settleManualNodePositions(events, getStoredNodePositionById) ?? events,
	);
}

// Bake the positions of nodes that `sourceGroupIds` were visually pushing into
// the document, so those targets stay put instead of snapping back when the
// source stops pushing — whether it was moved or removed via ungroup.
function commitPushedPositionsForSourceGroups(sourceGroupIds: string[]) {
	if (!injectedNodeGroupView || sourceGroupIds.length === 0) return;

	const pushedNodeMoves = injectedNodeGroupView.commitMovedPushSourceEffects(
		sourceGroupIds,
		(nodeId) => workflowDocumentStore.value.getNodeById(nodeId)?.position,
	);

	if (pushedNodeMoves.length > 0) {
		emit('update:nodes:position', pushedNodeMoves);
	}
}

const groupDrag = useCanvasNodeGroupDrag({
	canvasId: props.id,
	getNodeById: (id) => workflowDocumentStore.value.getNodeById(id),
	getGroupById: (id) => workflowDocumentStore.value.getGroupById(id),
	getGroupForNode: (id) => workflowDocumentStore.value.getGroupForNode(id),
	isNodeInGroup: (id) => workflowDocumentStore.value.nodeIdToGroupId.has(id),
	getNodeVisualOffset: (id) => injectedNodeGroupView?.getVisualOffsetForNode(id) ?? { x: 0, y: 0 },
	getNodeDisplaySize: (id) => props.nodeDisplaySizeById?.[id],
	onMovedExpandedGroups: commitPushedPositionsForSourceGroups,
});

// Groups select as one unit: title bar and member selection stay in sync,
// and a fully selected group surfaces the selection instead of its members.
const { fullySelectedGroupMemberIds, selectedElementCount, selectionBoxBounds } =
	useCanvasNodeGroupSelection({
		canvasId: props.id,
		isEnabled: () => props.showNodeGroups,
		getGroupById: (id) => workflowDocumentStore.value.getGroupById(id),
		getGroupForNode: (id) => workflowDocumentStore.value.getGroupForNode(id),
		isGroupCollapsed: (id) => injectedNodeGroupView?.isGroupCollapsed(id) ?? false,
	});

// VueFlow sizes its selection box to the selected VueFlow nodes, but a group
// node is only the title bar — its expanded frame overflows the box. Feed the
// corrected bounds (full group frames included) to the box via CSS variables.
const selectionBoxStyle = computed(() => {
	const bounds = selectionBoxBounds.value;
	if (!bounds) return undefined;
	return {
		'--canvas-selection-box--left': `${bounds.x}px`,
		'--canvas-selection-box--top': `${bounds.y}px`,
		'--canvas-selection-box--width': `${bounds.width}px`,
		'--canvas-selection-box--height': `${bounds.height}px`,
	};
});

function onNodeDragStart(event: NodeDragEvent) {
	groupDrag.onNodeDragStart(event);
}

function onNodeDrag(event: NodeDragEvent) {
	groupDrag.onNodeDrag(event);
}

function onNodeDragStop(event: NodeDragEvent) {
	const moves = agentNodeGeometry.snapDraggedNodeMoves(
		event.node,
		groupDrag.processNodeDragStop(event),
		event.nodes,
	);
	if (moves.length > 0) commitManualNodePositions(moves);
}

function onSelectionDragStart(event: NodeDragEvent) {
	groupDrag.onSelectionDragStart(event);
}

function onSelectionDrag(event: NodeDragEvent) {
	groupDrag.onSelectionDrag(event);
}

function onCanvasGroupToggle(
	groupId: string,
	source: CanvasNodeGroupEventSource = 'group-toolbar',
) {
	injectedNodeGroupView?.toggleCollapsed(groupId);

	if (!injectedNodeGroupView) return;

	const isCollapsed = injectedNodeGroupView.isGroupCollapsed(groupId);
	const group = workflowDocumentStore.value.getGroupById(groupId);
	if (group) {
		if (isCollapsed) {
			groupTelemetry.trackCollapsed(group, source);
		} else {
			groupTelemetry.trackExpanded(group, source);
		}
	}

	const memberNodeIds = workflowDocumentStore.value.getGroupById(groupId)?.nodeIds ?? [];
	if (isCollapsed) {
		// Collapsing hides the members, so drop them from the selection to clear
		// the lingering box. A selected title bar stays selected and keeps
		// representing the group.
		const selectedMembers = memberNodeIds
			.map((nodeId) => findNode(nodeId))
			.filter((node): node is NonNullable<typeof node> => node?.selected ?? false);
		if (selectedMembers.length > 0) {
			removeSelectedNodes(selectedMembers);
		}
	} else {
		// Expanding keeps the whole group selected: extend a selected title bar's
		// selection to its now-visible members.
		const groupNode = findNode(createCanvasGroupNodeId(groupId));
		if (groupNode?.selected) {
			const memberNodes = memberNodeIds.map(findNode).filter(isPresent);
			addSelectedNodes([...selectedNodesAndGroups.value, ...memberNodes]);
		}
	}
}

function isGroupNameTaken(groupId: string, name: string): boolean {
	return workflowDocumentStore.value.allGroups.some(
		(other) => other.id !== groupId && other.name === name,
	);
}

function onCanvasGroupNameUpdate(groupId: string, name: string) {
	if (isGroupNameTaken(groupId, name)) {
		toast.showToast({
			title: i18n.baseText('canvas.nodeGroup.renameBlocked.title'),
			message: i18n.baseText('canvas.nodeGroup.duplicateName'),
			type: 'error',
			duration: 5000,
		});
		autofocusGroupTitleId.value = groupId;
		return;
	}
	renameGroup(groupId, name);
}

// Collapsed groups have no inline title editor, so they rename through a
// prompt (mirroring node rename); expanded groups focus the inline editor.
function openGroupRename(groupId: string) {
	if (injectedNodeGroupView?.isGroupCollapsed(groupId)) {
		void onOpenGroupRenameModal(groupId);
	} else {
		autofocusGroupTitleId.value = groupId;
	}
}

// Space renames a selected group the same way it renames a selected node.
// Only an unambiguous target acts (see soleSelectedGroupId). Loose nodes or
// multiple groups fall through to node rename. Returns whether the rename
// was handled.
function renameSelectedGroup(): boolean {
	if (disableKeyBindings.value) return false;

	const activeElement = document.activeElement;
	if (activeElement && shouldIgnoreCanvasShortcut(activeElement)) return false;

	const groupId = soleSelectedGroupId.value;
	if (!groupId) return false;

	openGroupRename(groupId);
	return true;
}

async function onOpenGroupRenameModal(groupId: string) {
	if (props.readOnly || props.suppressInteraction) return;

	const group = workflowDocumentStore.value.getGroupById(groupId);
	if (!group) return;

	if (disableKeyBindings.value || document.querySelector('.rename-prompt')) return;

	try {
		const promptResponsePromise = message.prompt(
			i18n.baseText('nodeView.prompt.newName') + ':',
			i18n.baseText('canvas.nodeGroup.prompt.renameGroup') + `: ${group.name}`,
			{
				customClass: 'rename-prompt',
				confirmButtonText: i18n.baseText('nodeView.prompt.rename'),
				cancelButtonText: i18n.baseText('nodeView.prompt.cancel'),
				inputErrorMessage: i18n.baseText('nodeView.prompt.invalidName'),
				inputValue: group.name,
				inputValidator: (value: string) => {
					const trimmed = value.trim();
					if (!trimmed) {
						return i18n.baseText('nodeView.prompt.invalidName');
					}
					if (isGroupNameTaken(groupId, trimmed)) {
						return i18n.baseText('canvas.nodeGroup.duplicateName');
					}
					return true;
				},
			},
		);

		// Wait till input is displayed
		await nextTick();

		// Focus and select input content
		const nameInput = document.querySelector<HTMLInputElement>('.rename-prompt .el-input__inner');
		nameInput?.focus();
		nameInput?.select();

		// Stop propagation for space key to prevent VueFlow from intercepting it
		// when modifier keys (like Shift) are pressed.
		// See: https://github.com/bcakmakoglu/vue-flow/issues/1999
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === ' ') {
				e.stopPropagation();
			}
		};
		nameInput?.addEventListener('keydown', handleKeyDown);

		const promptResponse = await promptResponsePromise;

		nameInput?.removeEventListener('keydown', handleKeyDown);

		if (promptResponse.action === MODAL_CONFIRM) {
			renameGroup(groupId, promptResponse.value.trim());
		}
	} catch (e) {}
}

function onCanvasGroupDescriptionUpdate(groupId: string, description: string) {
	updateGroupDescription(groupId, description);
}

function onCanvasGroupUngroup(
	groupId: string,
	source: CanvasNodeGroupEventSource = 'group-toolbar',
) {
	// Capture before deletion — the group is gone by the time we track.
	const group = workflowDocumentStore.value.getGroupById(groupId);
	// Ungrouping a collapsed group makes its hidden members reappear, so expand
	// it first: the expansion pushes overlapping nodes aside, and the commit
	// below persists that displacement (the group is gone after, so the push
	// can't stay live).
	if (injectedNodeGroupView?.isGroupCollapsed(groupId)) {
		injectedNodeGroupView.toggleCollapsed(groupId);
	}
	// Removing the group also removes its push, so commit anything it was
	// pushing first — same principle as a newly created group not pushing.
	commitPushedPositionsForSourceGroups([groupId]);
	ungroup(groupId);

	if (group) {
		groupTelemetry.trackUngrouped(group, source);
	}
}

// Same downstream path as extracting the members through Alt+X or the
// context menu, so collapsed and expanded groups behave identically.
function onCanvasGroupExtract(groupId: string) {
	const group = workflowDocumentStore.value.getGroupById(groupId);
	if (!group) return;
	emit('extract-workflow', [...group.nodeIds]);
}

// Expand or collapse groups through the same path as the single toggle so
// selection sync, push layout and telemetry stay consistent. Groups already
// in the target state are left alone.
function setGroupsExpanded(
	groupIds: string[],
	expanded: boolean,
	source: CanvasNodeGroupEventSource,
) {
	if (!injectedNodeGroupView) return;
	for (const groupId of groupIds) {
		// Collapsed groups need a toggle to expand; expanded ones to collapse.
		const needsToggle = injectedNodeGroupView.isGroupCollapsed(groupId) === expanded;
		if (needsToggle) {
			onCanvasGroupToggle(groupId, source);
		}
	}
}

function onSetAllGroupsExpanded(expanded: boolean, source: CanvasNodeGroupEventSource) {
	setGroupsExpanded(
		workflowDocumentStore.value.allGroups.map((group) => group.id),
		expanded,
		source,
	);
}

// Pin or unpin the descriptions of every group that has one — the workflow-wide
// counterpart to the per-group pin toggle in the title bar.
function onSetAllDescriptionsVisible(visible: boolean) {
	if (!injectedNodeGroupDescriptionVisibility) return;
	const groupIds = workflowDocumentStore.value.allGroups
		.filter((group) => !!group.description?.trim())
		.map((group) => group.id);
	injectedNodeGroupDescriptionVisibility.setVisibleForGroups(groupIds, visible);
}

// Pin or unpin a single group's description, from its own context menu.
function onSetGroupDescriptionVisible(groupId: string | undefined, visible: boolean) {
	if (!injectedNodeGroupDescriptionVisibility || !groupId) return;
	injectedNodeGroupDescriptionVisibility.setVisible(groupId, visible);
}

// Distinct groups behind a context menu target: the carried group when a
// title bar was targeted, otherwise the groups of the targeted nodes —
// ungrouped nodes resolve to none and are ignored.
function resolveTargetGroupIds(nodeIds: string[], groupId?: string): string[] {
	if (groupId) return [groupId];
	const groupIds = new Set<string>();
	for (const nodeId of nodeIds) {
		const group = workflowDocumentStore.value.getGroupForNode(nodeId);
		if (group) groupIds.add(group.id);
	}
	return [...groupIds];
}

// Strict variant for groups-only targets: a single loose node yields
// undefined. Keeps Alt+G aligned with the menu's expand/collapse visibility.
function resolveGroupsOnlyTargetIds(nodeIds: string[]): string[] | undefined {
	const groupIds = new Set<string>();
	for (const nodeId of nodeIds) {
		const group = workflowDocumentStore.value.getGroupForNode(nodeId);
		if (!group) return undefined;
		groupIds.add(group.id);
	}
	return groupIds.size > 0 ? [...groupIds] : undefined;
}

// Context-aware Alt+G / Shift+Alt+G: an empty selection targets every group;
// a groups-only selection targets its groups. Mirrors the context menu, which
// hides its expand/collapse items for mixed selections — so a selection
// containing a loose node no-ops here too.
function onKeyboardSetGroupsExpanded(expanded: boolean) {
	if (selectedNodesAndGroups.value.length === 0) {
		onSetAllGroupsExpanded(expanded, 'keyboard-shortcut');
		return;
	}
	const groupIds = resolveGroupsOnlyTargetIds(selectedNodeIdsWithGroupMembers.value);
	if (groupIds === undefined) return;
	setGroupsExpanded(groupIds, expanded, 'keyboard-shortcut');
}

/**
 * Delete both regular nodes and collapsed group members.
 */
function onDeleteSelection() {
	const ids = selectedNodeIdsWithGroupMembers.value;
	// Removing the last group member also deletes the group via the document store
	if (ids.length > 0) emit('delete:nodes', ids);
}

// Last header-click toggle, for double-click suppression in onNodeClick.
let lastHeaderToggle: { groupId: string; at: number } | undefined;

function onNodeClick({ event, node }: NodeMouseEvent) {
	if (isCanvasGroupNode(node)) {
		// Modifier clicks keep VueFlow's multi-select behavior (cmd/ctrl+click).
		if (event.ctrlKey || event.metaKey || event.shiftKey) return;

		// A plain click both selects the title bar (VueFlow selected it before
		// emitting this event) and toggles collapse. Staying selected pairs the
		// click with Space-to-rename, like nodes.
		const groupId = parseCanvasGroupNodeId(node.id);
		if (groupId) {
			const isRepeatClick =
				lastHeaderToggle?.groupId === groupId &&
				event.timeStamp - lastHeaderToggle.at < CANVAS_GROUP_HEADER_TOGGLE_SUPPRESS_DURATION;
			if (!isRepeatClick) {
				lastHeaderToggle = { groupId, at: event.timeStamp };
				onCanvasGroupToggle(groupId, 'group-header');
			}
		}
		return;
	}

	if (chatPanelStore.isOpen && focusedNodesStore.isFeatureEnabled) {
		focusedNodesStore.setUnconfirmedFromCanvasSelection([node.id]);
	}

	emit('click:node', node.id, getProjectedPosition(event));

	if (event.ctrlKey || event.metaKey || selectedNodes.value.length < 2) {
		return;
	}

	onSelectNodes({ ids: [node.id] });
}

function onSelectionDragStop(event: NodeDragEvent) {
	const moves = groupDrag.processSelectionDragStop(event);
	if (moves.length > 0) commitManualNodePositions(moves);
}

function onSelectionEnd(event: MouseEvent) {
	// A single-element selection (one node, or one whole group) surfaces
	// itself — the selection box would only add noise.
	if (selectedElementCount.value <= 1) {
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
	removeSelectedNodes(selectedNodesAndGroups.value);
}

function onSelectAllNodes() {
	addSelectedNodes(selectableNodesAndGroups.value);
}

function onSelectNode() {
	emit('update:node:selected', lastSelectedNode.value?.id);
}

function onSelectNodes({ ids, panIntoView }: CanvasEventBusEvents['nodes:select']) {
	// A collapsed group hides its members, so selecting one would leave a lingering
	// selection box. Map members of collapsed groups to the group node instead.
	const resolvedIds = [
		...new Set(
			ids.map((id) => {
				const groupId = workflowDocumentStore.value.nodeIdToGroupId.get(id);
				return groupId && injectedNodeGroupView?.isGroupCollapsed(groupId)
					? createCanvasGroupNodeId(groupId)
					: id;
			}),
		),
	];

	clearSelectedNodes();
	addSelectedNodes(resolvedIds.map(findNode).filter(isPresent));

	if (panIntoView) {
		const nodes = resolvedIds.map(findNode).filter(isPresent);

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

function onReplaceNode(id: string) {
	emit('replace:node', id);
}

function onAddToAi(id: string) {
	focusedNodesStore.confirmNodes([id], 'context_menu');
	void chatPanelStore.open({ mode: 'builder' });
}

function onAddSelectedNodesToAi(nodeIds: string[]) {
	if (!focusedNodesStore.isFeatureEnabled) {
		return;
	}
	focusedNodesStore.confirmNodes(nodeIds, 'context_menu');
	void chatPanelStore.open({ mode: 'builder' });
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
		if (selectedNodeIdsWithGroupMembers.value.length > 0) {
			emitFn(selectedNodeIdsWithGroupMembers.value);
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
	if (document.hidden) {
		fitViewWhileHidden = true;
		return;
	}
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
const nodeDataById = computed(() =>
	props.nodes.reduce<Record<string, CanvasNodeData>>((acc, node) => {
		if (!isCanvasGroupNode(node) && node.data) {
			acc[node.id] = node.data;
		}
		return acc;
	}, {}),
);

const groupNodeFallbackDataById = computed(() =>
	props.nodes.reduce<Record<string, CanvasGroupNodeData>>((acc, node) => {
		if (isCanvasGroupNode(node) && node.data) {
			acc[node.id] = node.data;
		}
		return acc;
	}, {}),
);

/**
 * Context menu
 */

const contextMenu = useContextMenu();

// Carried on the menu target so mutating items disable on canvases that are
// read-only through props alone (e.g. while the AI builder streams) — the
// instance-wide read-only checks don't cover per-canvas state.
const isContextMenuReadOnly = computed(() => props.readOnly || props.suppressInteraction);

function onOpenContextMenu(
	event: MouseEvent,
	target?: Pick<Extract<ContextMenuTarget, { source: 'canvas' }>, 'nodeId'>,
) {
	contextMenu.open(event, {
		source: 'canvas',
		// Include collapsed group members so menu actions reach the nodes a
		// selected title bar stands for.
		nodeIds: selectedNodeIdsWithGroupMembers.value,
		readOnly: isContextMenuReadOnly.value,
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
		contextMenu.open(event, { source, nodeId: id, readOnly: isContextMenuReadOnly.value });
	} else if (selectedNodeIds.value.length > 1 && selectedNodeIds.value.includes(id)) {
		onOpenContextMenu(event, { nodeId: id });
	} else {
		onSelectNodes({ ids: [id] });
		contextMenu.open(event, { source, nodeId: id, readOnly: isContextMenuReadOnly.value });
	}
}

function onOpenGroupContextMenu(groupId: string, event: MouseEvent) {
	// Fall through to the native menu when interaction is suppressed. A
	// read-only canvas keeps the menu (like nodes do) — the target's readOnly
	// flag disables the mutating items while view/copy actions stay usable.
	if (props.suppressInteraction) return;
	const group = workflowDocumentStore.value.getGroupById(groupId);
	if (!group) return;

	// Mirror node behavior: a right-click inside a wider selection targets the
	// whole selection; otherwise the group becomes the selection.
	const groupNode = findNode(createCanvasGroupNodeId(groupId));
	if (groupNode?.selected && selectedElementCount.value > 1) {
		onOpenContextMenu(event);
		return;
	}

	// Reselecting an already-selected group would pass through a members-only
	// state the selection reconciler reads as a title-bar deselect, cascading
	// to a full deselect — keep the selection untouched instead.
	if (!groupNode?.selected) {
		onSelectNodes({ ids: group.nodeIds });
	}
	contextMenu.open(event, {
		source: 'group',
		groupId,
		nodeIds: [...group.nodeIds],
		readOnly: isContextMenuReadOnly.value,
	});
}

async function onContextMenuAction(action: ContextMenuAction, nodeIds: string[], groupId?: string) {
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
			return onSelectAllNodes();
		case 'deselect_all':
			return clearSelectedNodes();
		case 'duplicate':
			return emit('duplicate:nodes', nodeIds);
		case 'toggle_pin':
			return emit('update:nodes:pin', nodeIds, 'context-menu');
		case 'execute':
			return emit('run:node', nodeIds[0]);
		case 'copy_production_url':
			return emit('copy:production:url', nodeIds[0]);
		case 'copy_test_url':
			return emit('copy:test:url', nodeIds[0]);
		case 'toggle_activation':
			return emit('update:nodes:enabled', nodeIds);
		case 'open':
			return onSetNodeActivated(nodeIds[0]);
		case 'rename':
			return emit('update:node:name', nodeIds[0]);
		case 'replace':
			return emit('replace:node', nodeIds[0]);
		case 'change_color':
			return props.eventBus.emit('nodes:action', { ids: nodeIds, action: 'update:sticky:color' });
		case 'tidy_up':
			return await onTidyUp({ source: 'context-menu' });
		case 'extract_sub_workflow':
			return emit('extract-workflow', nodeIds);
		case 'group_nodes': {
			const group = groupNodes(nodeIds);
			if (group) {
				handleGroupCreated(group, 'context-menu');
			}
			return;
		}
		case 'rename_group': {
			if (groupId && workflowDocumentStore.value.getGroupById(groupId)) {
				openGroupRename(groupId);
			}
			return;
		}
		case 'ungroup_nodes': {
			if (groupId) {
				onCanvasGroupUngroup(groupId, 'context-menu');
			}
			return;
		}
		case 'expand_all_groups':
			return onSetAllGroupsExpanded(true, 'context-menu');
		case 'collapse_all_groups':
			return onSetAllGroupsExpanded(false, 'context-menu');
		case 'expand_selected_groups':
			return setGroupsExpanded(resolveTargetGroupIds(nodeIds, groupId), true, 'context-menu');
		case 'collapse_selected_groups':
			return setGroupsExpanded(resolveTargetGroupIds(nodeIds, groupId), false, 'context-menu');
		case 'show_all_group_descriptions':
			return onSetAllDescriptionsVisible(true);
		case 'hide_all_group_descriptions':
			return onSetAllDescriptionsVisible(false);
		case 'show_group_description':
			return onSetGroupDescriptionVisible(groupId, true);
		case 'hide_group_description':
			return onSetGroupDescriptionVisible(groupId, false);
		case 'open_sub_workflow': {
			return emit('open:sub-workflow', nodeIds[0]);
		}
		case 'focus_ai_on_selected': {
			focusedNodesStore.confirmNodes(nodeIds, 'context_menu');
			void chatPanelStore.open({ mode: 'builder' });
			return;
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

	emit(
		'tidy-up',
		{ result, target, source: payload.source },
		{
			trackEvents: payload.trackEvents,
			trackHistory: payload.trackHistory,
			trackBulk: payload.trackBulk,
		},
	);

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

function minimapNodeClassnameFn(node: CanvasNodeOrGroup) {
	if (isCanvasGroupNode(node)) return 'minimap-node-group';
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

let pendingFitViewOnInit = false;
let pendingConnections: IConnections | null = null;

// When fitView runs while the browser tab is in the background, VueFlow's
// container dimensions are 0 (offsetWidth/offsetHeight return 0 for hidden
// tabs) and fall back to 500×500, producing a wrong viewport transform.
// Track this so we can re-run fitView once the tab becomes visible.
let fitViewWhileHidden = false;

function onVisibilityChange() {
	if (!document.hidden && fitViewWhileHidden) {
		fitViewWhileHidden = false;
		void onFitView();
	}
}

function onRequestFitViewOnInit() {
	if (initialized.value) {
		void onFitView();
		return;
	}
	pendingFitViewOnInit = true;
}

function onRequestSetConnectionsOnInit(connections: IConnections) {
	// Always defer — this event is only emitted during importWorkflowExact which
	// recreates all nodes. VueFlow will drop edges applied before node handles
	// exist, so we must wait for onNodesInitialized.
	initialized.value = false;
	pendingConnections = connections;
}

onMounted(() => {
	props.eventBus.on('fitView', onFitView);
	props.eventBus.on('fitView:onNodesInit', onRequestFitViewOnInit);
	props.eventBus.on('setConnections:onNodesInit', onRequestSetConnectionsOnInit);
	props.eventBus.on('nodes:select', onSelectNodes);
	props.eventBus.on('nodes:selectAll', onSelectAllNodes);
	props.eventBus.on('tidyUp', onTidyUp);
	window.addEventListener('blur', onWindowBlur);
	document.addEventListener('visibilitychange', onVisibilityChange);
});

onUnmounted(() => {
	props.eventBus.off('fitView', onFitView);
	props.eventBus.off('fitView:onNodesInit', onRequestFitViewOnInit);
	props.eventBus.off('setConnections:onNodesInit', onRequestSetConnectionsOnInit);
	props.eventBus.off('nodes:select', onSelectNodes);
	props.eventBus.off('nodes:selectAll', onSelectAllNodes);
	props.eventBus.off('tidyUp', onTidyUp);
	window.removeEventListener('blur', onWindowBlur);
	document.removeEventListener('visibilitychange', onVisibilityChange);
});

onPaneReady(async () => {
	if (props.initialViewport) {
		await setViewport(props.initialViewport);
	} else {
		await onFitView();
	}
	isPaneReady.value = true;
});

onNodesInitialized(() => {
	initialized.value = true;

	if (pendingConnections) {
		const connections = pendingConnections;
		pendingConnections = null;
		workflowDocumentStore?.value?.setConnections(connections);
	}

	if (pendingFitViewOnInit) {
		pendingFitViewOnInit = false;
		void onFitView();
	}
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
		:nodes="vueFlowNodes"
		:edges="connections"
		:class="classes"
		:style="selectionBoxStyle"
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
		@node-drag-start="onNodeDragStart"
		@node-drag="onNodeDrag"
		@node-drag-stop="onNodeDragStop"
		@node-click="onNodeClick"
		@selection-drag-start="onSelectionDragStart"
		@selection-drag="onSelectionDrag"
		@selection-drag-stop="onSelectionDragStop"
		@selection-end="onSelectionEnd"
		@selection-context-menu="onOpenSelectionContextMenu"
		@dragover="onDragOver"
		@drop="onDrop"
		@viewport-change="onViewportChange"
	>
		<template #node-canvas-node-group="nodeProps">
			<CanvasNodeGroupTitleBar
				v-bind="nodeProps"
				:data="nodeProps.data ?? groupNodeFallbackDataById[nodeProps.id]"
				:autofocus-group-id="autofocusGroupTitleId"
				:read-only="readOnly || suppressInteraction"
				:can-extract="extractableGroupIds.has(parseCanvasGroupNodeId(nodeProps.id) ?? '')"
				@toggle="onCanvasGroupToggle"
				@update:name="onCanvasGroupNameUpdate"
				@update:description="onCanvasGroupDescriptionUpdate"
				@title:focused="onNodeGroupTitleFocused"
				@ungroup="onCanvasGroupUngroup"
				@extract="onCanvasGroupExtract"
				@open:contextmenu="onOpenGroupContextMenu"
			/>
		</template>

		<template #node-canvas-node="nodeProps">
			<slot name="node" v-bind="{ nodeProps }">
				<Node
					v-bind="nodeProps"
					:data="nodeDataById[nodeProps.id]"
					:selected="nodeProps.selected && !fullySelectedGroupMemberIds.has(nodeProps.id)"
					:read-only="readOnly"
					:can-execute="canExecute"
					:event-bus="eventBus"
					:hovered="nodesHoveredById[nodeProps.id]"
					:nearby-hovered="nodeProps.id === hoveredTriggerNode.id.value"
					:highlighted="setupPanelStore.highlightedNodeIds.has(nodeProps.id)"
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
					@replace:node="onReplaceNode"
					@add:ai="onAddToAi"
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
			<CanvasBackground :viewport="viewport" :striped="readOnly && stripedBackground" />
		</slot>

		<!-- A selection that is exactly one group acts through the group's own
		toolbar; the selection toolbar would only duplicate it and cover it. -->
		<CanvasSelectionToolbar
			v-if="showNodeGroups && soleSelectedGroupId === null"
			:selected-nodes="selectedNodes"
			:selection-bounds="selectionBoxBounds"
			:read-only="readOnly || suppressInteraction"
			@group-created="onNodeGroupCreated"
			@extract-workflow="emit('extract-workflow', $event)"
		/>

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
			v-if="!hideControls"
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
	-webkit-user-select: none;
	user-select: none;

	&.ready {
		opacity: 1;
	}

	&.isExperimentalNdvActive {
		/* stylelint-disable-next-line @n8n/css-var-naming */
		--canvas-zoom-compensation-factor: 0.5;
	}

	// VueFlow sizes its selection box to the selected VueFlow nodes only, which
	// cuts through expanded group frames (the frame overflows the title-bar
	// node). Override its inline geometry with our corrected bounds (set as CSS
	// variables in `selectionBoxStyle` whenever a selection exists), so the box
	// always wraps selected groups in full.
	/* stylelint-disable declaration-no-important */
	:global(.vue-flow__nodesselection-rect) {
		left: var(--canvas-selection-box--left) !important;
		top: var(--canvas-selection-box--top) !important;
		width: var(--canvas-selection-box--width) !important;
		height: var(--canvas-selection-box--height) !important;
	}
	/* stylelint-enable declaration-no-important */
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

.spotlightActive {
	:deep(.vue-flow__edges) {
		opacity: 0.2;
		transition: opacity 0.5s ease;
	}

	:deep(.vue-flow__node) {
		opacity: 0.4;
		transition: opacity 0.5s ease;
	}

	:deep(.vue-flow__node:has(.highlighted)) {
		opacity: 1;
	}
}
</style>
