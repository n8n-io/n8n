import { defineStore } from 'pinia';
import { ref } from 'vue';
import { STORES } from '@n8n/stores';

export type SubworkflowProgress = {
	executionId: string;
	currentNodeName?: string;
	currentNodeIndex: number;
	totalNodes: number;
	phase: 'running' | 'success' | 'error';
};

function makeKey(parentExecutionId: string, parentNodeName: string): string {
	return `${parentExecutionId}::${parentNodeName}`;
}

/**
 * Tracks per-node sub-workflow progress so the canvas can render a live
 * overlay on Execute Sub-workflow nodes while the child runs.
 *
 * Keyed by `${parentExecutionId}::${parentNodeName}` to support multiple
 * sub-workflows running in parallel from the same parent workflow.
 */
export const useSubworkflowProgressStore = defineStore(STORES.SUBWORKFLOW_PROGRESS, () => {
	const progressByKey = ref(new Map<string, SubworkflowProgress>());

	function setStarted(payload: {
		parentExecutionId: string;
		parentNodeName: string;
		executionId: string;
		totalNodes: number;
	}) {
		const key = makeKey(payload.parentExecutionId, payload.parentNodeName);
		const next = new Map(progressByKey.value);
		next.set(key, {
			executionId: payload.executionId,
			currentNodeIndex: 0,
			totalNodes: payload.totalNodes,
			phase: 'running',
		});
		progressByKey.value = next;
	}

	function updateProgress(payload: {
		parentExecutionId: string;
		parentNodeName: string;
		executionId: string;
		currentNodeName: string;
		currentNodeIndex: number;
		totalNodes: number;
		phase: 'running' | 'success' | 'error';
	}) {
		const key = makeKey(payload.parentExecutionId, payload.parentNodeName);
		const existing = progressByKey.value.get(key);
		// Ignore stragglers from a previous child execution if a newer one has started.
		if (existing && existing.executionId !== payload.executionId) return;
		const next = new Map(progressByKey.value);
		next.set(key, {
			executionId: payload.executionId,
			currentNodeName: payload.currentNodeName,
			currentNodeIndex: payload.currentNodeIndex,
			totalNodes: payload.totalNodes,
			phase: payload.phase,
		});
		progressByKey.value = next;
	}

	function clear(payload: { parentExecutionId: string; parentNodeName: string }) {
		const key = makeKey(payload.parentExecutionId, payload.parentNodeName);
		if (!progressByKey.value.has(key)) return;
		const next = new Map(progressByKey.value);
		next.delete(key);
		progressByKey.value = next;
	}

	function resetForExecution(parentExecutionId: string) {
		const prefix = `${parentExecutionId}::`;
		const next = new Map(progressByKey.value);
		let changed = false;
		for (const key of next.keys()) {
			if (key.startsWith(prefix)) {
				next.delete(key);
				changed = true;
			}
		}
		if (changed) progressByKey.value = next;
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
		setStarted,
		updateProgress,
		clear,
		resetForExecution,
		getFor,
		reset,
	};
});
