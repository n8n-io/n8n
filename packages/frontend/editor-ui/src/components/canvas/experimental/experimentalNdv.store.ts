import { computed, shallowRef } from 'vue';
import { defineStore } from 'pinia';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useVueFlow } from '@vue-flow/core';
import { calculateNodeSize } from '@/utils/nodeViewUtils';

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
		return isEnabled.value && canvasZoom === maxCanvasZoom.value;
	}

	function focusNode(nodeId: string) {
		const nodeToFocus = workflowStore.getNodeById(nodeId);

		if (!nodeToFocus) {
			return;
		}

		// Call useVueFlow() here because having it in setup fn scope seem to cause initialization problem
		const vueFlow = useVueFlow(workflowStore.workflow.id);

		collapsedNodes.value = workflowStore.allNodes.reduce<Partial<Record<string, boolean>>>(
			(acc, node) => {
				acc[node.id] = node.id !== nodeId;
				return acc;
			},
			{},
		);

		const workflow = workflowStore.getCurrentWorkflow();
		const nodeSize = calculateNodeSize(
			workflow.getChildNodes(nodeToFocus.name, 'ALL_NON_MAIN').length > 0,
			workflow.getParentNodes(nodeToFocus.name, 'ALL_NON_MAIN').length > 0,
			workflow.getParentNodes(nodeToFocus.name, 'main').length,
			workflow.getChildNodes(nodeToFocus.name, 'main').length,
			workflow.getParentNodes(nodeToFocus.name, 'ALL_NON_MAIN').length,
		);

		void vueFlow.setCenter(
			nodeToFocus.position[0] + (nodeSize.width * 1.5) / 2,
			nodeToFocus.position[1] + 80,
			{ duration: 200, zoom: maxCanvasZoom.value },
		);
	}

	return {
		isEnabled,
		maxCanvasZoom,
		collapsedNodes: computed(() => collapsedNodes.value),
		isActive,
		setNodeExpanded,
		expandAllNodes,
		collapseAllNodes,
		focusNode,
	};
});
