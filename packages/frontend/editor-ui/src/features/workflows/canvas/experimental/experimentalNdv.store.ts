import { computed, ref, shallowRef } from 'vue';
import { defineStore } from 'pinia';
import {
	type Dimensions,
	type FitView,
	type GraphNode,
	type SetCenter,
	type SetViewport,
	type ViewportTransform,
	type ZoomTo,
} from '@vue-flow/core';
import { CanvasNodeRenderType, type CanvasNodeData } from '../canvas.types';
import { usePostHog } from '@/app/stores/posthog.store';
import {
	CANVAS_ZOOMED_VIEW_EXPERIMENT,
	NDV_IN_FOCUS_PANEL_EXPERIMENT,
	NODE_PANEL_ANCHORED_EXPERIMENT,
	NODE_PANEL_FIELD_LAYOUT_EXPERIMENT,
} from '@/app/constants';
import type { INodeUi } from '@/Interface';
import { useStorage } from '@n8n/composables/useStorage';

export type NodePanelTab = 'properties' | 'input' | 'output' | 'settings';

export type NodePanelState = {
	selectedTab: NodePanelTab;
	isShowingAllSettings: boolean;
	settingsFilter: string;
	scrollTop: number;
};

const NODE_PANEL_WIDTH_STORAGE_KEY = 'N8N_NODE_PANEL_WIDTH';
const NODE_PANEL_ALWAYS_SHOW_SETTINGS_STORAGE_KEY = 'N8N_NODE_PANEL_ALWAYS_SHOW_SETTINGS';
const DEFAULT_NODE_PANEL_WIDTH = 420;
const MIN_NODE_PANEL_WIDTH = 420;
const MAX_NODE_PANEL_WIDTH = 1000;

const DEFAULT_NODE_PANEL_STATE: NodePanelState = {
	selectedTab: 'properties',
	isShowingAllSettings: false,
	settingsFilter: '',
	scrollTop: 0,
};

export const useExperimentalNdvStore = defineStore('experimentalNdv', () => {
	const postHogStore = usePostHog();
	// HACKMATION BRANCH ONLY — not for merge.
	// The three node-panel experiments default to their variant so a deployed test
	// instance needs no console setup. Overriding a flag to 'control' still turns it
	// off, e.g. featureFlags.override('node_panel_anchored', 'control').
	function isVariantByDefault(experiment: { name: string; control: string }) {
		return postHogStore.getVariant(experiment.name) !== experiment.control;
	}

	const isZoomedViewEnabled = computed(
		() =>
			postHogStore.getVariant(CANVAS_ZOOMED_VIEW_EXPERIMENT.name) ===
			CANVAS_ZOOMED_VIEW_EXPERIMENT.variant,
	);
	const isNdvInFocusPanelEnabled = computed(() =>
		isVariantByDefault(NDV_IN_FOCUS_PANEL_EXPERIMENT),
	);
	const maxCanvasZoom = computed(() => (isZoomedViewEnabled.value ? 2 : 4));

	const previousViewport = ref<ViewportTransform>();
	const collapsedNodes = shallowRef<Partial<Record<string, boolean>>>({});
	const nodeNameToBeFocused = ref<string | undefined>();
	const mapperOpen = ref(false);
	const isMapperPinned = ref(false);
	const nodePanelStates = shallowRef<Record<string, NodePanelState>>({});
	const nodePanelWidthStorage = useStorage(NODE_PANEL_WIDTH_STORAGE_KEY);
	const alwaysShowSettingsStorage = useStorage(NODE_PANEL_ALWAYS_SHOW_SETTINGS_STORAGE_KEY);
	const nodePanelWidth = computed(() => {
		const storedWidth = Number(nodePanelWidthStorage.value);
		if (!Number.isFinite(storedWidth)) return DEFAULT_NODE_PANEL_WIDTH;

		return Math.min(MAX_NODE_PANEL_WIDTH, Math.max(MIN_NODE_PANEL_WIDTH, storedWidth));
	});
	const isMapperOpen = computed(() => mapperOpen.value || isMapperPinned.value);
	const alwaysShowAllSettings = computed(() => alwaysShowSettingsStorage.value === 'true');
	// Driven through the feature-flag overrides so it can be toggled live from the
	// console without a reload: featureFlags.override('node_panel_anchored', 'variant')
	const isPanelAnchored = computed(() => isVariantByDefault(NODE_PANEL_ANCHORED_EXPERIMENT));

	// featureFlags.override('node_panel_field_layout', 'variant')
	const isCompactFieldLayout = computed(() =>
		isVariantByDefault(NODE_PANEL_FIELD_LAYOUT_EXPERIMENT),
	);

	function setPanelAnchored(value: boolean) {
		window.featureFlags?.override(
			NODE_PANEL_ANCHORED_EXPERIMENT.name,
			value ? NODE_PANEL_ANCHORED_EXPERIMENT.variant : NODE_PANEL_ANCHORED_EXPERIMENT.control,
		);
	}

	function setNodeExpanded(nodeId: string, isExpanded?: boolean) {
		collapsedNodes.value = {
			...collapsedNodes.value,
			[nodeId]: isExpanded === undefined ? !collapsedNodes.value[nodeId] : !isExpanded,
		};
	}

	function collapseAllNodes(allNodes: INodeUi[]) {
		collapsedNodes.value = allNodes.reduce<Partial<Record<string, boolean>>>((acc, node) => {
			acc[node.id] = true;
			return acc;
		}, {});
	}

	function expandAllNodes() {
		collapsedNodes.value = {};
	}

	function isActive(canvasZoom: number) {
		return isZoomedViewEnabled.value && Math.abs(canvasZoom - maxCanvasZoom.value) < 0.000001;
	}

	function setNodeNameToBeFocused(nodeName: string) {
		nodeNameToBeFocused.value = nodeName;
	}

	function setMapperOpen(value: boolean) {
		mapperOpen.value = value;
	}

	function setMapperPinned(value: boolean) {
		isMapperPinned.value = value;
	}

	function updateNodePanelWidth(width: number) {
		nodePanelWidthStorage.value = String(
			Math.min(MAX_NODE_PANEL_WIDTH, Math.max(MIN_NODE_PANEL_WIDTH, width)),
		);
	}

	function setAlwaysShowAllSettings(value: boolean) {
		alwaysShowSettingsStorage.value = String(value);
	}

	function getNodePanelState(nodeId: string): NodePanelState {
		return nodePanelStates.value[nodeId] ?? DEFAULT_NODE_PANEL_STATE;
	}

	function updateNodePanelState(nodeId: string, update: Partial<NodePanelState>) {
		nodePanelStates.value = {
			...nodePanelStates.value,
			[nodeId]: {
				...getNodePanelState(nodeId),
				...update,
			},
		};
	}

	interface FocusNodeOptions {
		canvasViewport: ViewportTransform;
		canvasDimensions: Dimensions;
		setCenter: SetCenter;
	}

	function focusNode(
		node: GraphNode<CanvasNodeData>,
		{ canvasDimensions, canvasViewport, setCenter }: FocusNodeOptions,
	) {
		collapsedNodes.value = { ...collapsedNodes.value, [node.id]: false };

		const topMargin = 80; // pixels
		const nodeWidth = node.dimensions.width * (isActive(canvasViewport.zoom) ? 1 : 1.5);

		if (nodeNameToBeFocused.value === node.data.name) {
			nodeNameToBeFocused.value = undefined;
		}

		// Move the node to top center of the canvas
		void setCenter(
			node.position.x + nodeWidth / 2,
			node.position.y + (canvasDimensions.height * (1 / 2) - topMargin) / maxCanvasZoom.value,
			{
				duration: 200,
				zoom: maxCanvasZoom.value,
				interpolate: 'linear',
			},
		);
	}

	interface ToggleZoomModeOptions {
		canvasViewport: ViewportTransform;
		canvasDimensions: Dimensions;
		selectedNodes: Array<GraphNode<CanvasNodeData>>;
		setViewport: SetViewport;
		fitView: FitView;
		zoomTo: ZoomTo;
		setCenter: SetCenter;
	}

	function toggleZoomMode(options: ToggleZoomModeOptions) {
		if (isActive(options.canvasViewport.zoom)) {
			if (previousViewport.value === undefined) {
				void options.fitView({ duration: 200, interpolate: 'linear' });
				return;
			}

			void options.setViewport(previousViewport.value, { duration: 200, interpolate: 'linear' });
			return;
		}

		previousViewport.value = options.canvasViewport;

		const toFocus = options.selectedNodes
			.filter((node) => node.data.render.type === CanvasNodeRenderType.Default)
			.toSorted((a, b) =>
				a.position.y === b.position.y ? a.position.x - b.position.x : a.position.y - b.position.y,
			)[0];

		if (toFocus) {
			focusNode(toFocus, options);
			return;
		}

		void options.zoomTo(maxCanvasZoom.value, { duration: 200, interpolate: 'linear' });
	}

	return {
		isZoomedViewEnabled,
		isNdvInFocusPanelEnabled,
		maxCanvasZoom,
		previousZoom: computed(() => previousViewport.value),
		collapsedNodes: computed(() => collapsedNodes.value),
		nodeNameToBeFocused: computed(() => nodeNameToBeFocused.value),
		isMapperOpen,
		isMapperPinned: computed(() => isMapperPinned.value),
		alwaysShowAllSettings,
		isPanelAnchored,
		isCompactFieldLayout,
		nodePanelWidth,
		isActive,
		setNodeExpanded,
		expandAllNodes,
		collapseAllNodes,
		toggleZoomMode,
		focusNode,
		setNodeNameToBeFocused,
		setMapperOpen,
		setMapperPinned,
		updateNodePanelWidth,
		setAlwaysShowAllSettings,
		setPanelAnchored,
		getNodePanelState,
		updateNodePanelState,
	};
});
