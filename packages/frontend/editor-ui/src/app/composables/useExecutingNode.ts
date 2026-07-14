import { ref } from 'vue';

/**
 * Composable to keep track of the currently executing node(s), driving the
 * per-node loading spinner. A node can appear multiple times in the queue so
 * the spinner does not flicker when a node runs several times in quick
 * succession — each `nodeExecuteBefore` adds one entry, each `nodeExecuteAfter`
 * removes one.
 *
 * Scope-aware collapse: the backend relays node events fire-and-forget with no
 * sequence numbers, so a browser tab suspended to save memory can miss a
 * `nodeExecuteAfter` and leave a node stuck in the queue — surfacing as several
 * nodes spinning at once (CAT-2895). The main runner executes one node at a
 * time, so when a node starts we drop every other queued node except the ones
 * that legitimately enclose it: a sub-node (an AI Agent's tool/model/memory,
 * a vector store's embeddings, …) runs nested inside its consumer's execution,
 * so that consumer keeps spinning. `getEnclosingNodeNames` returns those
 * enclosing consumers (transitively) for a given node; same-node entries are
 * kept regardless, to preserve the quick-succession refcount above.
 */
export function useExecutingNode(getEnclosingNodeNames: (nodeName: string) => string[]) {
	const executingNode = ref<string[]>([]);
	const lastAddedExecutingNode = ref<string | null>(null);

	function addExecutingNode(nodeName: string) {
		// Supersede stale same-scope siblings (their `nodeExecuteAfter` was lost)
		// while keeping this node's own entries and its enclosing consumers, so
		// genuine parent+sub-node nesting still shows both spinners.
		const enclosingNodeNames = new Set(getEnclosingNodeNames(nodeName));
		executingNode.value = [
			...executingNode.value.filter((name) => name === nodeName || enclosingNodeNames.has(name)),
			nodeName,
		];
		lastAddedExecutingNode.value = nodeName;
	}

	function removeExecutingNode(nodeName: string) {
		// Identity-scoped: only an entry matching `nodeName` is dropped, so a
		// late or reordered `nodeExecuteAfter` for an already-superseded node is a
		// no-op and can never clear a different node's spinner.
		const executionIndex = executingNode.value.indexOf(nodeName);
		if (executionIndex === -1) {
			return;
		}

		executingNode.value.splice(executionIndex, 1);
	}

	function clearNodeExecutionQueue() {
		executingNode.value = [];
		lastAddedExecutingNode.value = null;
	}

	function isNodeExecuting(nodeName: string): boolean {
		return executingNode.value.includes(nodeName);
	}

	return {
		executingNode,
		lastAddedExecutingNode,
		addExecutingNode,
		removeExecutingNode,
		isNodeExecuting,
		clearNodeExecutionQueue,
	};
}
