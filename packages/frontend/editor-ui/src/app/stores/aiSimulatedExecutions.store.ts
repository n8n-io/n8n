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
export const useAiSimulatedExecutionsStore = defineStore('aiSimulatedExecutions', () => {
	const simulatedNodesByExecutionId = ref(new Map<string, Set<string>>());

	function markSimulatedNodes(executionId: string, nodeNames: string[]) {
		if (nodeNames.length === 0) return;
		simulatedNodesByExecutionId.value.set(executionId, new Set(nodeNames));
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
