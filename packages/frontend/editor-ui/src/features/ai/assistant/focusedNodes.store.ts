import { computed, ref, watch } from 'vue';
import { defineStore } from 'pinia';
import { STORES } from '@n8n/stores';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useDebounceFn } from '@vueuse/core';
import { DEBOUNCE_TIME, getDebounceTime } from '@/app/constants';
import type { FocusedNode, FocusedNodeState } from './focusedNodes.types';

const COLLAPSE_THRESHOLD = 7;
const MAX_UNCONFIRMED_DISPLAY = 50;

export const useFocusedNodesStore = defineStore(STORES.FOCUSED_NODES, () => {
	const workflowsStore = useWorkflowsStore();
	const telemetry = useTelemetry();

	// State
	const focusedNodesMap = ref<Record<string, FocusedNode>>({});
	const canvasSelectedNodeIds = ref<Set<string>>(new Set());

	// Computed
	const confirmedNodes = computed(() =>
		Object.values(focusedNodesMap.value).filter((node) => node.state === 'confirmed'),
	);

	const unconfirmedNodes = computed(() =>
		Object.values(focusedNodesMap.value).filter((node) => node.state === 'unconfirmed'),
	);

	const allVisibleNodes = computed(() => [...confirmedNodes.value, ...unconfirmedNodes.value]);

	const shouldCollapseChips = computed(() => confirmedNodes.value.length >= COLLAPSE_THRESHOLD);

	const confirmedNodeIds = computed(() => confirmedNodes.value.map((node) => node.nodeId));

	const hasVisibleNodes = computed(() => allVisibleNodes.value.length > 0);

	const tooManyUnconfirmed = computed(
		() => unconfirmedNodes.value.length > MAX_UNCONFIRMED_DISPLAY,
	);

	function isNodeSelectedOnCanvas(nodeId: string): boolean {
		return canvasSelectedNodeIds.value.has(nodeId);
	}

	// Helper to get node info from workflow
	function getNodeInfo(nodeId: string): { name: string; type: string } | null {
		const node = workflowsStore.allNodes.find((n) => n.id === nodeId);
		if (!node) return null;
		return { name: node.name, type: node.type };
	}

	// Actions
	function confirmNodes(nodeIds: string[], source: 'context_menu' | 'mention' | 'chip_click') {
		const nodeTypes: string[] = [];

		for (const nodeId of nodeIds) {
			const existingNode = focusedNodesMap.value[nodeId];
			if (existingNode) {
				// Update state to confirmed
				focusedNodesMap.value[nodeId] = { ...existingNode, state: 'confirmed' };
				nodeTypes.push(existingNode.nodeType);
			} else {
				// Add new node as confirmed
				const nodeInfo = getNodeInfo(nodeId);
				if (nodeInfo) {
					focusedNodesMap.value[nodeId] = {
						nodeId,
						nodeName: nodeInfo.name,
						nodeType: nodeInfo.type,
						state: 'confirmed',
					};
					nodeTypes.push(nodeInfo.type);
				}
			}
		}

		if (nodeTypes.length > 0) {
			telemetry.track('ai.focusedNodes.added', {
				source,
				node_count: nodeTypes.length,
				node_types: nodeTypes,
			});
		}
	}

	// Debounced version to avoid rapid state changes
	const debouncedSetUnconfirmed = useDebounceFn((nodeIds: string[]) => {
		// Get current confirmed node IDs to preserve them
		const currentConfirmedIds = new Set(confirmedNodeIds.value);

		// Build new map: keep confirmed nodes, add/update unconfirmed from selection
		const newMap: Record<string, FocusedNode> = {};

		// Keep all confirmed nodes
		for (const node of confirmedNodes.value) {
			newMap[node.nodeId] = node;
		}

		// Add unconfirmed nodes from canvas selection (if not already confirmed)
		for (const nodeId of nodeIds) {
			if (!currentConfirmedIds.has(nodeId)) {
				const existingUnconfirmed = focusedNodesMap.value[nodeId];
				if (existingUnconfirmed && existingUnconfirmed.state === 'unconfirmed') {
					newMap[nodeId] = existingUnconfirmed;
				} else {
					const nodeInfo = getNodeInfo(nodeId);
					if (nodeInfo) {
						newMap[nodeId] = {
							nodeId,
							nodeName: nodeInfo.name,
							nodeType: nodeInfo.type,
							state: 'unconfirmed',
						};
					}
				}
			}
		}

		focusedNodesMap.value = newMap;
	}, getDebounceTime(DEBOUNCE_TIME.INPUT.VALIDATION));

	function setUnconfirmedFromCanvasSelection(nodeIds: string[]) {
		canvasSelectedNodeIds.value = new Set(nodeIds);
		void debouncedSetUnconfirmed(nodeIds);
	}

	function toggleNode(nodeId: string, isSelectedOnCanvas: boolean) {
		const node = focusedNodesMap.value[nodeId];
		if (!node) return;

		if (node.state === 'unconfirmed') {
			// Unconfirmed → Confirmed
			confirmNodes([nodeId], 'chip_click');
		} else if (node.state === 'confirmed') {
			// Confirmed → Remove (if not selected on canvas) or make unconfirmed (if selected)
			if (isSelectedOnCanvas) {
				focusedNodesMap.value[nodeId] = { ...node, state: 'unconfirmed' };
			} else {
				removeNode(nodeId);
			}
		}
	}

	function removeNode(nodeId: string) {
		const node = focusedNodesMap.value[nodeId];
		if (!node) return;

		const wasConfirmed = node.state === 'confirmed';
		delete focusedNodesMap.value[nodeId];
		// Trigger reactivity
		focusedNodesMap.value = { ...focusedNodesMap.value };

		if (wasConfirmed) {
			telemetry.track('ai.focusedNodes.removed', {
				method: 'chip_click',
				remaining_count: confirmedNodes.value.length,
			});
		}
	}

	function clearAll() {
		const previousCount = confirmedNodes.value.length;
		focusedNodesMap.value = {};

		if (previousCount > 0) {
			telemetry.track('ai.focusedNodes.cleared', {
				previous_count: previousCount,
			});
		}
	}

	function handleNodeDeleted(nodeId: string) {
		if (focusedNodesMap.value[nodeId]) {
			delete focusedNodesMap.value[nodeId];
			focusedNodesMap.value = { ...focusedNodesMap.value };
		}
	}

	function handleNodeRenamed(nodeId: string, newName: string) {
		const node = focusedNodesMap.value[nodeId];
		if (node) {
			focusedNodesMap.value[nodeId] = { ...node, nodeName: newName };
		}
	}

	function setState(nodeId: string, state: FocusedNodeState) {
		const node = focusedNodesMap.value[nodeId];
		if (node) {
			focusedNodesMap.value[nodeId] = { ...node, state };
		}
	}

	// Watch for workflow changes - reset all focused nodes
	watch(
		() => workflowsStore.workflowId,
		() => {
			focusedNodesMap.value = {};
		},
	);

	// Watch for node deletions - auto-remove from focused nodes
	watch(
		() => workflowsStore.allNodes,
		(newNodes) => {
			const currentNodeIds = new Set(newNodes.map((n) => n.id));
			const focusedIds = Object.keys(focusedNodesMap.value);

			let hasChanges = false;
			for (const focusedId of focusedIds) {
				if (!currentNodeIds.has(focusedId)) {
					delete focusedNodesMap.value[focusedId];
					hasChanges = true;
				}
			}

			if (hasChanges) {
				focusedNodesMap.value = { ...focusedNodesMap.value };
			}
		},
		{ deep: true },
	);

	// Watch for node renames
	watch(
		() => workflowsStore.allNodes.map((n) => ({ id: n.id, name: n.name })),
		(newNodeNames) => {
			for (const { id, name } of newNodeNames) {
				const focusedNode = focusedNodesMap.value[id];
				if (focusedNode && focusedNode.nodeName !== name) {
					focusedNodesMap.value[id] = { ...focusedNode, nodeName: name };
				}
			}
		},
		{ deep: true },
	);

	return {
		// State
		focusedNodesMap,
		canvasSelectedNodeIds,
		// Computed
		confirmedNodes,
		unconfirmedNodes,
		allVisibleNodes,
		shouldCollapseChips,
		confirmedNodeIds,
		hasVisibleNodes,
		tooManyUnconfirmed,
		// Actions
		confirmNodes,
		setUnconfirmedFromCanvasSelection,
		toggleNode,
		removeNode,
		clearAll,
		handleNodeDeleted,
		handleNodeRenamed,
		setState,
		isNodeSelectedOnCanvas,
	};
});
