import { computed, ref, shallowRef } from 'vue';
import { defineStore } from 'pinia';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useSettingsStore } from '@/stores/settings.store';
import {
	useVueFlow,
	type FitView,
	type GraphNode,
	type SetViewport,
	type ViewportTransform,
	type ZoomTo,
} from '@vue-flow/core';
import { calculateNodeSize } from '@/utils/nodeViewUtils';
import { CanvasNodeRenderType, type CanvasNodeData } from '@/types';

export const useExperimentalNdvStore = defineStore('experimentalNdv', () => {
	const workflowStore = useWorkflowsStore();
	const settingsStore = useSettingsStore();
	const isEnabled = computed(
		() =>
			!Number.isNaN(settingsStore.experimental__minZoomNodeSettingsInCanvas) &&
			settingsStore.experimental__minZoomNodeSettingsInCanvas > 0,
	);
	const maxCanvasZoom = computed(() =>
		isEnabled.value ? settingsStore.experimental__minZoomNodeSettingsInCanvas : 4,
	);

	const previousViewport = ref<ViewportTransform>();
	const collapsedNodes = shallowRef<Partial<Record<string, boolean>>>({});

	function setNodeExpanded(nodeId: string, isExpanded?: boolean) {
		collapsedNodes.value = {
			...collapsedNodes.value,
			[nodeId]: isExpanded === undefined ? !collapsedNodes.value[nodeId] : !isExpanded,
		};
	}

	function collapseAllNodes() {
		collapsedNodes.value = workflowStore.allNodes.reduce<Partial<Record<string, boolean>>>(
			(acc, node) => {
				acc[node.id] = true;
				return acc;
			},
			{},
		);
	}

	function expandAllNodes() {
		collapsedNodes.value = {};
	}

	function isActive(canvasZoom: number) {
		return isEnabled.value && Math.abs(canvasZoom - maxCanvasZoom.value) < 0.000001;
	}

	function focusNode(nodeId: string, { collapseOthers = true }: { collapseOthers?: boolean } = {}) {
		const nodeToFocus = workflowStore.getNodeById(nodeId);

		if (!nodeToFocus) {
			return;
		}

		// Call useVueFlow() here because having it in setup fn scope seem to cause initialization problem
		const vueFlow = useVueFlow(workflowStore.workflow.id);

		collapsedNodes.value = collapseOthers
			? workflowStore.allNodes.reduce<Partial<Record<string, boolean>>>((acc, node) => {
					acc[node.id] = node.id !== nodeId;
					return acc;
				}, {})
			: { ...collapsedNodes.value, [nodeId]: false };

		const workflow = workflowStore.getCurrentWorkflow();
		const nodeSize = calculateNodeSize(
			workflow.getChildNodes(nodeToFocus.name, 'ALL_NON_MAIN').length > 0,
			workflow.getParentNodes(nodeToFocus.name, 'ALL_NON_MAIN').length > 0,
			workflow.getParentNodes(nodeToFocus.name, 'main').length,
			workflow.getChildNodes(nodeToFocus.name, 'main').length,
			workflow.getParentNodes(nodeToFocus.name, 'ALL_NON_MAIN').length,
		);

		const topMargin = 0; // pixels

		void vueFlow.setCenter(
			nodeToFocus.position[0] + (nodeSize.width * 1.5) / 2,
			nodeToFocus.position[1] +
				((vueFlow.dimensions.value.height * (1 / 2)) / vueFlow.viewport.value.zoom - topMargin),
			{
				duration: 200,
				zoom: maxCanvasZoom.value,
				interpolate: 'linear',
			},
		);
	}

	function toggleZoomMode(
		viewport: ViewportTransform,
		selectedNodes: Array<GraphNode<CanvasNodeData>>,
		setViewport: SetViewport,
		fitViewport: FitView,
		zoomTo: ZoomTo,
	) {
		if (isActive(viewport.zoom)) {
			if (previousViewport.value === undefined) {
				void fitViewport({ duration: 200, interpolate: 'linear' });
				return;
			}

			void setViewport(previousViewport.value, { duration: 200, interpolate: 'linear' });
			return;
		}

		previousViewport.value = viewport;

		const toFocus = selectedNodes
			.filter((node) => node.data.render.type === CanvasNodeRenderType.Default)
			.toSorted((a, b) =>
				a.position.y === b.position.y ? a.position.x - b.position.x : a.position.y - b.position.y,
			)[0];

		if (toFocus) {
			focusNode(toFocus.id, { collapseOthers: false });
			return;
		}

		void zoomTo(maxCanvasZoom.value, { duration: 200, interpolate: 'linear' });
	}

	return {
		isEnabled,
		maxCanvasZoom,
		previousZoom: computed(() => previousViewport.value),
		collapsedNodes: computed(() => collapsedNodes.value),
		isActive,
		setNodeExpanded,
		expandAllNodes,
		collapseAllNodes,
		toggleZoomMode,
		focusNode,
	};
});
