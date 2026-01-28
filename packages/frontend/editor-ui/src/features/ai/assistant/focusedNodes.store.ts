import { computed, ref, watch } from 'vue';
import { defineStore } from 'pinia';
import { STORES } from '@n8n/stores';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useDebounceFn } from '@vueuse/core';
import { DEBOUNCE_TIME, getDebounceTime } from '@/app/constants';
import type {
	FocusedNode,
	FocusedNodeState,
	FocusedNodesContextPayload,
} from './focusedNodes.types';
import type { INodeIssues } from 'n8n-workflow';

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

	// Telemetry types
	type AddSource = 'context_menu' | 'canvas_selection' | 'mention' | 'keyboard_shortcut';
	type RemoveMethod = 'badge_click' | 'clear_all' | 'node_deleted' | 'workflow_changed';

	// Actions
	function confirmNodes(
		nodeIds: string[],
		source: AddSource,
		options?: { mentionQueryLength?: number },
	) {
		console.log('[FocusedNodesStore] confirmNodes called', { nodeIds, source });
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
				...(source === 'mention' && options?.mentionQueryLength !== undefined
					? { mention_query_length: options.mentionQueryLength }
					: {}),
			});
		}
	}

	// Debounced version to avoid rapid state changes
	const debouncedSetUnconfirmed = useDebounceFn((nodeIds: string[]) => {
		console.log('[FocusedNodesStore] debouncedSetUnconfirmed called', { nodeIds });
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
		console.log('[FocusedNodesStore] setUnconfirmedFromCanvasSelection called', { nodeIds });
		canvasSelectedNodeIds.value = new Set(nodeIds);
		void debouncedSetUnconfirmed(nodeIds);
	}

	function toggleNode(nodeId: string, isSelectedOnCanvas: boolean) {
		const node = focusedNodesMap.value[nodeId];
		if (!node) return;

		if (node.state === 'unconfirmed') {
			// Unconfirmed → Confirmed (clicking unconfirmed badge = canvas_selection confirmation)
			confirmNodes([nodeId], 'canvas_selection');
		} else if (node.state === 'confirmed') {
			// Confirmed → Remove (if not selected on canvas) or make unconfirmed (if selected)
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
		// Trigger reactivity
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
			// Merged into ai.focusedNodes.removed with method 'clear_all'
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

		// Remove all confirmed nodes, but keep those that are selected on canvas as unconfirmed
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

		// Trigger reactivity
		focusedNodesMap.value = { ...focusedNodesMap.value };

		if (previousCount > 0) {
			telemetry.track('ai.focusedNodes.removed', {
				method: 'clear_all',
				removed_count: previousCount,
				remaining_count: confirmedNodes.value.length,
			});
		}
	}

	// Watch for workflow changes - reset all focused nodes
	watch(
		() => workflowsStore.workflowId,
		(_newId, oldId) => {
			// Only track if there were confirmed nodes and this isn't the initial load
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

	// Watch for node deletions - auto-remove from focused nodes
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

	/**
	 * Builds the context payload for confirmed focused nodes.
	 * This payload is sent to the AI workflow builder to provide context
	 * about which nodes the user wants the AI to focus on.
	 */
	function buildContextPayload(): FocusedNodesContextPayload[] {
		const confirmedNodesList = confirmedNodes.value;
		if (confirmedNodesList.length === 0) {
			return [];
		}

		const connectionsByDestination = workflowsStore.connectionsByDestinationNode;
		const connectionsBySource = workflowsStore.connectionsBySourceNode;
		const allNodes = workflowsStore.allNodes;

		// Build a map of nodeId -> node for quick lookup
		const nodeById = new Map(allNodes.map((n) => [n.id, n]));

		return confirmedNodesList.map((focusedNode) => {
			const node = nodeById.get(focusedNode.nodeId);
			if (!node) {
				// Fallback if node not found (shouldn't happen)
				return {
					name: focusedNode.nodeName,
					incomingConnections: [],
					outgoingConnections: [],
				};
			}

			// Get incoming connections (nodes that connect TO this node)
			const incomingConnections: string[] = [];
			const nodeConnections = connectionsByDestination[node.name];
			if (nodeConnections?.main) {
				for (const inputConnections of nodeConnections.main) {
					if (inputConnections) {
						for (const conn of inputConnections) {
							if (conn.node && !incomingConnections.includes(conn.node)) {
								incomingConnections.push(conn.node);
							}
						}
					}
				}
			}

			// Get outgoing connections (nodes that this node connects TO)
			const outgoingConnections: string[] = [];
			const sourceConnections = connectionsBySource[node.name];
			if (sourceConnections?.main) {
				for (const outputConnections of sourceConnections.main) {
					if (outputConnections) {
						for (const conn of outputConnections) {
							if (conn.node && !outgoingConnections.includes(conn.node)) {
								outgoingConnections.push(conn.node);
							}
						}
					}
				}
			}

			// Build issues map (convert INodeIssues to Record<string, string[]>)
			let issues: Record<string, string[]> | undefined;
			if (node.issues) {
				issues = {};
				const nodeIssues = node.issues as INodeIssues;
				if (nodeIssues.parameters) {
					for (const [param, paramIssues] of Object.entries(nodeIssues.parameters)) {
						if (Array.isArray(paramIssues)) {
							issues[param] = paramIssues;
						}
					}
				}
				if (nodeIssues.credentials) {
					for (const [cred, credIssues] of Object.entries(nodeIssues.credentials)) {
						if (Array.isArray(credIssues)) {
							issues[`credential:${cred}`] = credIssues;
						}
					}
				}
				// Clean up empty issues object
				if (Object.keys(issues).length === 0) {
					issues = undefined;
				}
			}

			// Return only additional context - full node details are in currentWorkflow.nodes
			return {
				name: node.name,
				issues,
				incomingConnections,
				outgoingConnections,
			};
		});
	}

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
		buildContextPayload,
		confirmAllUnconfirmed,
		removeAllConfirmed,
	};
});
