import { computed, ref, shallowRef } from 'vue';
import { defineStore } from 'pinia';
import { useWorkflowsStore } from '@/stores/workflows.store';
import type { INodeUi, XYPosition } from '@/Interface';
import { useLoadingService } from '@/composables/useLoadingService';

export const useCanvasStore = defineStore('canvas', () => {
	const workflowStore = useWorkflowsStore();
	const loadingService = useLoadingService();

	const newNodeInsertPosition = ref<XYPosition | null>(null);
	const collapsedNodes = shallowRef<Partial<Record<string, boolean>>>({});

	const nodes = computed<INodeUi[]>(() => workflowStore.allNodes);
	const aiNodes = computed<INodeUi[]>(() =>
		nodes.value.filter((node) => node.type.includes('langchain')),
	);
	const hasRangeSelection = ref(false);

	function setHasRangeSelection(value: boolean) {
		hasRangeSelection.value = value;
	}

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

	return {
		newNodeInsertPosition,
		isLoading: loadingService.isLoading,
		aiNodes,
		hasRangeSelection: computed(() => hasRangeSelection.value),
		collapsedNodes: computed(() => collapsedNodes.value),
		startLoading: loadingService.startLoading,
		setLoadingText: loadingService.setLoadingText,
		stopLoading: loadingService.stopLoading,
		setHasRangeSelection,
		setNodeExpanded,
		expandAllNodes,
		collapseAllNodes,
	};
});
