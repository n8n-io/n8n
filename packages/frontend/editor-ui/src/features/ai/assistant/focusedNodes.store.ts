import { computed, ref, watch } from 'vue';
import { defineStore } from 'pinia';
import { STORES } from '@n8n/stores';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { usePostHog } from '@/app/stores/posthog.store';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useDebounceFn } from '@vueuse/core';
import { DEBOUNCE_TIME, FOCUSED_NODES_EXPERIMENT, getDebounceTime } from '@/app/constants';
import type {
	FocusedNode,
	FocusedNodeState,
	FocusedNodesContextPayload,
} from './focusedNodes.types';
import { buildFocusedNodesPayload } from './focusedNodes.utils';
import { useChatPanelStateStore } from './chatPanelState.store';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';

const COLLAPSE_THRESHOLD = 7;
const MAX_UNCONFIRMED_DISPLAY = 50;

export const useFocusedNodesStore = defineStore(STORES.FOCUSED_NODES, () => {
	const workflowsStore = useWorkflowsStore();
	const posthogStore = usePostHog();
	const telemetry = useTelemetry();
	const chatPanelStateStore = useChatPanelStateStore();
	const ndvStore = useNDVStore();

	const isFeatureEnabled = computed(() => {
		return posthogStore.isVariantEnabled(
			FOCUSED_NODES_EXPERIMENT.name,
			FOCUSED_NODES_EXPERIMENT.variant,
		);
	});

	const focusedNodesMap = ref<Record<string, FocusedNode>>({});
	const canvasSelectedNodeIds = ref<Set<string>>(new Set());

	const confirmedNodes = computed(() =>
		Object.values(focusedNodesMap.value).filter((node) => node.state === 'confirmed'),
	);

	const unconfirmedNodes = computed(() =>
		Object.values(focusedNodesMap.value).filter((node) => node.state === 'unconfirmed'),
	);

	const filteredUnconfirmedNodes = computed(() => {
		const totalWorkflowNodes = workflowsStore.allNodes.length;
		const availableNodes = totalWorkflowNodes - confirmedNodes.value.length;
		if (
			confirmedNodes.value.length > 0 &&
			availableNodes > 0 &&
			unconfirmedNodes.value.length >= availableNodes
		) {
			return [];
		}
		return unconfirmedNodes.value;
	});

	const allVisibleNodes = computed(() => [
		...confirmedNodes.value,
		...filteredUnconfirmedNodes.value,
	]);

	const shouldCollapseChips = computed(() => confirmedNodes.value.length >= COLLAPSE_THRESHOLD);

	const confirmedNodeIds = computed(() => confirmedNodes.value.map((node) => node.nodeId));

	const hasVisibleNodes = computed(() => allVisibleNodes.value.length > 0);

	const tooManyUnconfirmed = computed(
		() => filteredUnconfirmedNodes.value.length > MAX_UNCONFIRMED_DISPLAY,
	);

	function isNodeSelectedOnCanvas(nodeId: string): boolean {
		return canvasSelectedNodeIds.value.has(nodeId);
	}

	function getNodeInfo(nodeId: string): { name: string; type: string } | null {
		const node = workflowsStore.allNodes.find((n) => n.id === nodeId);
		if (!node) return null;
		return { name: node.name, type: node.type };
	}

	type AddSource = 'context_menu' | 'canvas_selection' | 'mention' | 'keyboard_shortcut';
	type RemoveMethod = 'badge_click' | 'clear_all' | 'node_deleted' | 'workflow_changed';

	function confirmNodes(
		nodeIds: string[],
		source: AddSource,
		options?: { mentionQueryLength?: number },
	) {
		const nodeTypes: string[] = [];

		for (const nodeId of nodeIds) {
			const existingNode = focusedNodesMap.value[nodeId];
			if (existingNode) {
				focusedNodesMap.value[nodeId] = { ...existingNode, state: 'confirmed' };
				nodeTypes.push(existingNode.nodeType);
			} else {
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
				...(source === 'mention' && options?.mentionQueryLength !== undefined
					? { mention_query_length: options.mentionQueryLength }
					: {}),
			});
		}
	}

	const debouncedSetUnconfirmed = useDebounceFn((nodeIds: string[]) => {
		const currentConfirmedIds = new Set(confirmedNodeIds.value);
		const newMap: Record<string, FocusedNode> = {};

		for (const node of confirmedNodes.value) {
			newMap[node.nodeId] = node;
		}

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
			confirmNodes([nodeId], 'canvas_selection');
		} else if (node.state === 'confirmed') {
			if (isSelectedOnCanvas) {
				focusedNodesMap.value[nodeId] = { ...node, state: 'unconfirmed' };
			} else {
				removeNode(nodeId);
			}
		}
	}

	function removeNode(nodeId: string, method: RemoveMethod = 'badge_click') {
		const node = focusedNodesMap.value[nodeId];
		if (!node) return;

		const wasConfirmed = node.state === 'confirmed';
		delete focusedNodesMap.value[nodeId];
		focusedNodesMap.value = { ...focusedNodesMap.value };

		if (wasConfirmed) {
			telemetry.track('ai.focusedNodes.removed', {
				method,
				removed_count: 1,
				remaining_count: confirmedNodes.value.length,
			});
		}
	}

	function clearAll() {
		const previousCount = confirmedNodes.value.length;
		focusedNodesMap.value = {};

		if (previousCount > 0) {
			telemetry.track('ai.focusedNodes.removed', {
				method: 'clear_all',
				removed_count: previousCount,
				remaining_count: 0,
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

	function confirmAllUnconfirmed() {
		const unconfirmedNodeIds = unconfirmedNodes.value.map((n) => n.nodeId);
		if (unconfirmedNodeIds.length > 0) {
			confirmNodes(unconfirmedNodeIds, 'canvas_selection');
		}
	}

	function removeAllConfirmed() {
		const previousCount = confirmedNodes.value.length;
		const confirmedIds = confirmedNodes.value.map((n) => n.nodeId);

		for (const nodeId of confirmedIds) {
			if (canvasSelectedNodeIds.value.has(nodeId)) {
				const node = focusedNodesMap.value[nodeId];
				if (node) {
					focusedNodesMap.value[nodeId] = { ...node, state: 'unconfirmed' };
				}
			} else {
				delete focusedNodesMap.value[nodeId];
			}
		}

		focusedNodesMap.value = { ...focusedNodesMap.value };

		if (previousCount > 0) {
			telemetry.track('ai.focusedNodes.removed', {
				method: 'clear_all',
				removed_count: previousCount,
				remaining_count: confirmedNodes.value.length,
			});
		}
	}

	watch(
		() => workflowsStore.workflowId,
		(_newId, oldId) => {
			const previousCount = confirmedNodes.value.length;
			focusedNodesMap.value = {};

			if (previousCount > 0 && oldId !== undefined) {
				telemetry.track('ai.focusedNodes.removed', {
					method: 'workflow_changed',
					removed_count: previousCount,
					remaining_count: 0,
				});
			}
		},
	);

	watch(
		() => workflowsStore.allNodes,
		(newNodes) => {
			const currentNodeIds = new Set(newNodes.map((n) => n.id));
			const focusedIds = Object.keys(focusedNodesMap.value);

			let deletedConfirmedCount = 0;
			for (const focusedId of focusedIds) {
				if (!currentNodeIds.has(focusedId)) {
					const node = focusedNodesMap.value[focusedId];
					if (node?.state === 'confirmed') {
						deletedConfirmedCount++;
					}
					delete focusedNodesMap.value[focusedId];
				}
			}

			if (deletedConfirmedCount > 0) {
				focusedNodesMap.value = { ...focusedNodesMap.value };
				telemetry.track('ai.focusedNodes.removed', {
					method: 'node_deleted',
					removed_count: deletedConfirmedCount,
					remaining_count: confirmedNodes.value.length,
				});
			}
		},
		{ deep: true },
	);

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

	watch(
		() => ndvStore.activeNode,
		(node) => {
			if (!isFeatureEnabled.value || !chatPanelStateStore.isOpen) return;
			if (node && !focusedNodesMap.value[node.id]) {
				setUnconfirmedFromCanvasSelection([node.id]);
			}
		},
	);

	function buildContextPayload(): FocusedNodesContextPayload[] {
		if (!isFeatureEnabled.value) {
			return [];
		}

		return buildFocusedNodesPayload(
			confirmedNodes.value,
			workflowsStore.allNodes,
			workflowsStore.connectionsByDestinationNode,
			workflowsStore.connectionsBySourceNode,
		);
	}

	return {
		focusedNodesMap,
		canvasSelectedNodeIds,
		isFeatureEnabled,
		confirmedNodes,
		unconfirmedNodes,
		filteredUnconfirmedNodes,
		allVisibleNodes,
		shouldCollapseChips,
		confirmedNodeIds,
		hasVisibleNodes,
		tooManyUnconfirmed,
		confirmNodes,
		setUnconfirmedFromCanvasSelection,
		toggleNode,
		removeNode,
		clearAll,
		handleNodeDeleted,
		handleNodeRenamed,
		setState,
		isNodeSelectedOnCanvas,
		buildContextPayload,
		confirmAllUnconfirmed,
		removeAllConfirmed,
	};
});
