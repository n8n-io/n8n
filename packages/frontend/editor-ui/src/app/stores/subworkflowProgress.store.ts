import { defineStore } from 'pinia';
import { shallowReactive } from 'vue';
import { STORES } from '@n8n/stores';
import type { SubworkflowNodeProgress } from '@n8n/api-types/push/execution';

export type SubworkflowProgress = Pick<
	SubworkflowNodeProgress['data'],
	'currentNodeName' | 'currentNodeIndex' | 'totalNodes'
>;

function makeKey(parentExecutionId: string, parentNodeName: string): string {
	return `${parentExecutionId}::${parentNodeName}`;
}

/**
 * Live progress of sub-workflows, keyed by parent execution and node name, so
 * several Execute Sub-workflow nodes can show progress at once.
 */
export const useSubworkflowProgressStore = defineStore(STORES.SUBWORKFLOW_PROGRESS, () => {
	// Mutated in place, so a reader only re-runs when its own key changes.
	const progressByKey = shallowReactive(new Map<string, SubworkflowProgress>());

	/** The newest snapshot wins, also when it comes from a different child of the same node. */
	function updateProgress({
		parentExecutionId,
		parentNodeName,
		currentNodeName,
		currentNodeIndex,
		totalNodes,
	}: SubworkflowNodeProgress['data']) {
		progressByKey.set(makeKey(parentExecutionId, parentNodeName), {
			currentNodeName,
			currentNodeIndex,
			totalNodes,
		});
	}

	function clear(parentExecutionId: string, parentNodeName: string) {
		progressByKey.delete(makeKey(parentExecutionId, parentNodeName));
	}

	function getFor(
		parentExecutionId: string,
		parentNodeName: string,
	): SubworkflowProgress | undefined {
		return progressByKey.get(makeKey(parentExecutionId, parentNodeName));
	}

	function reset() {
		progressByKey.clear();
	}

	return {
		updateProgress,
		clear,
		getFor,
		reset,
	};
});
