import { ref } from 'vue';
import { useExecutingNode } from '@/app/composables/useExecutingNode';

/** Where a live sub-workflow execution hangs off the run that started it. */
export type SubExecutionLink = {
	executionId: string;
	workflowId: string;
	parentExecutionId: string;
	parentNodeName: string;
	/** One sub-execution per iteration when the node runs in a loop. */
	parentNodeRunIndex: number;
};

function parentNodeKey(parentExecutionId: string, parentNodeName: string) {
	return `${parentExecutionId}:${parentNodeName}`;
}

/**
 * Tracks the sub-workflow executions of the run a document is watching. Their
 * node events arrive under their own execution id, so registering them here is
 * what lets the push handlers accept them instead of discarding them as foreign.
 *
 * Only the newest sub-execution per parent node is kept: the canvas has one node
 * per name, so superseded loop iterations are dropped rather than piling up.
 */
export function useSubExecutions() {
	const byExecutionId = ref(new Map<string, SubExecutionLink>());
	/** Newest sub-execution id per `parentExecutionId:parentNodeName`. */
	const currentByParentNode = ref(new Map<string, string>());

	/**
	 * Node currently executing inside a sub-execution. Separate from the parent
	 * run's queue, which numbers its node events independently and whose calling
	 * node stays running while the child advances.
	 */
	const executingNode = useExecutingNode();

	function has(executionId: string): boolean {
		return byExecutionId.value.has(executionId);
	}

	function get(executionId: string): SubExecutionLink | undefined {
		return byExecutionId.value.get(executionId);
	}

	/** Ids of `executionId`'s own sub-executions, transitively. */
	function collectDescendants(executionId: string): string[] {
		const descendants: string[] = [];
		const queue = [executionId];

		while (queue.length > 0) {
			const current = queue.shift()!;
			for (const link of byExecutionId.value.values()) {
				if (link.parentExecutionId === current) {
					descendants.push(link.executionId);
					queue.push(link.executionId);
				}
			}
		}

		return descendants;
	}

	function forget(executionId: string) {
		const link = byExecutionId.value.get(executionId);
		if (!link) return;

		byExecutionId.value.delete(executionId);
		const key = parentNodeKey(link.parentExecutionId, link.parentNodeName);
		if (currentByParentNode.value.get(key) === executionId) {
			currentByParentNode.value.delete(key);
		}
	}

	/**
	 * Registers a sub-execution, superseding the previous one from the same parent
	 * node. Returns the superseded ids (and their descendants) to dispose.
	 */
	function register(link: SubExecutionLink): string[] {
		const key = parentNodeKey(link.parentExecutionId, link.parentNodeName);
		const superseded = currentByParentNode.value.get(key);
		const dropped =
			superseded !== undefined && superseded !== link.executionId
				? [superseded, ...collectDescendants(superseded)]
				: [];

		for (const id of dropped) forget(id);

		byExecutionId.value.set(link.executionId, link);
		currentByParentNode.value.set(key, link.executionId);

		return dropped;
	}

	/** Returns every registered id and empties the registry. */
	function clear(): string[] {
		const ids = Array.from(byExecutionId.value.keys());
		byExecutionId.value = new Map();
		currentByParentNode.value = new Map();
		executingNode.clearNodeExecutionQueue();
		return ids;
	}

	return {
		/** Registered sub-executions, in the order they started. */
		byExecutionId,
		executingNode,
		has,
		get,
		register,
		forget,
		collectDescendants,
		clear,
	};
}
