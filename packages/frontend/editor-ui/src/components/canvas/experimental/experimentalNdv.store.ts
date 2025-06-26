import { computed, shallowRef } from 'vue';
import { defineStore } from 'pinia';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useSettingsStore } from '@/stores/settings.store';

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
			[nodeId]: isExpanded ?? !collapsedNodes.value[nodeId],
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

	return {
		isEnabled,
		maxCanvasZoom,
		collapsedNodes: computed(() => collapsedNodes.value),
		isActive,
		setNodeExpanded,
		expandAllNodes,
		collapseAllNodes,
	};
});
