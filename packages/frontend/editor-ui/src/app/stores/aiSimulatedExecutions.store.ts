import { defineStore } from 'pinia';
import { ref } from 'vue';

/**
 * Tracks which node outputs of an execution were simulated by the AI Assistant
 * during workflow verification (fabricated fixture data, not real service
 * responses). Written by the Instance AI preview when it displays an agent
 * execution; read by the NDV output panel to label simulated data and guard
 * against pinning it as if it were real.
 *
 * Display metadata only — deliberately kept out of execution data
 * (`resultData`), which stays a faithful record of what ran.
 */
/**
 * Only this many most recently marked executions are retained. The editor can
 * only re-display recent agent executions, and the bound keeps a long-lived
 * session with many verification runs from accumulating entries forever.
 */
const MAX_TRACKED_EXECUTIONS = 25;

export const useAiSimulatedExecutionsStore = defineStore('aiSimulatedExecutions', () => {
	const simulatedNodesByExecutionId = ref(new Map<string, Set<string>>());

	function markSimulatedNodes(executionId: string, nodeNames: string[]) {
		if (nodeNames.length === 0) return;
		// Delete before set so a re-marked execution moves to the newest position.
		simulatedNodesByExecutionId.value.delete(executionId);
		simulatedNodesByExecutionId.value.set(executionId, new Set(nodeNames));
		while (simulatedNodesByExecutionId.value.size > MAX_TRACKED_EXECUTIONS) {
			const oldest = simulatedNodesByExecutionId.value.keys().next().value;
			if (oldest === undefined) break;
			simulatedNodesByExecutionId.value.delete(oldest);
		}
	}

	function isSimulatedNodeOutput(
		executionId: string | undefined,
		nodeName: string | undefined,
	): boolean {
		if (!executionId || !nodeName) return false;
		return simulatedNodesByExecutionId.value.get(executionId)?.has(nodeName) ?? false;
	}

	return {
		markSimulatedNodes,
		isSimulatedNodeOutput,
	};
});
