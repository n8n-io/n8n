import { defineStore } from 'pinia';
import { ref } from 'vue';
import { STORES } from '@n8n/stores';

export type SubworkflowProgress = {
	executionId: string;
	currentNodeName: string;
	currentNodeIndex: number;
	totalNodes: number;
};

function makeKey(parentExecutionId: string, parentNodeName: string): string {
	return `${parentExecutionId}::${parentNodeName}`;
}

/**
 * Live progress of sub-workflows, keyed by parent execution and node name, so
 * several Execute Sub-workflow nodes can show progress at once.
 */
export const useSubworkflowProgressStore = defineStore(STORES.SUBWORKFLOW_PROGRESS, () => {
	const progressByKey = ref(new Map<string, SubworkflowProgress>());

	/** The newest snapshot wins, also when it comes from a different child of the same node. */
	function updateProgress(payload: {
		parentExecutionId: string;
		parentNodeName: string;
		executionId: string;
		currentNodeName: string;
		currentNodeIndex: number;
		totalNodes: number;
	}) {
		const key = makeKey(payload.parentExecutionId, payload.parentNodeName);
		const next = new Map(progressByKey.value);
		next.set(key, {
			executionId: payload.executionId,
			currentNodeName: payload.currentNodeName,
			currentNodeIndex: payload.currentNodeIndex,
			totalNodes: payload.totalNodes,
		});
		progressByKey.value = next;
	}

	function clear(parentExecutionId: string, parentNodeName: string) {
		const key = makeKey(parentExecutionId, parentNodeName);
		if (!progressByKey.value.has(key)) return;
		const next = new Map(progressByKey.value);
		next.delete(key);
		progressByKey.value = next;
	}

	function getFor(
		parentExecutionId: string,
		parentNodeName: string,
	): SubworkflowProgress | undefined {
		return progressByKey.value.get(makeKey(parentExecutionId, parentNodeName));
	}

	function reset() {
		if (progressByKey.value.size === 0) return;
		progressByKey.value = new Map();
	}

	return {
		progressByKey,
		updateProgress,
		clear,
		getFor,
		reset,
	};
});
