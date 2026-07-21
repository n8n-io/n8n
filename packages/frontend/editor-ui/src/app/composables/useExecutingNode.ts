import { ref } from 'vue';

/**
 * Tracks the single node rendered as executing (the per-node loading spinner).
 *
 * Only the latest node executes at a time (CAT-2895): each `nodeExecuteBefore`
 * carries a `sequenceNumber` — a per-execution monotonic counter assigned in
 * engine order — and we show the node of the highest one seen, clearing it on
 * its own `nodeExecuteAfter`. Events that arrive late or out of order (e.g.
 * after a suspended background tab resumes) carry a lower number and are
 * ignored, so a stale node can never overwrite the current one or leave several
 * spinners running at once.
 *
 * `executingNode` stays an array for its consumers' sake. During live push it
 * holds at most one entry; the counter restarts at 0 per run — and mid-run on a
 * wait-node resume — so a fresh event is also accepted whenever nothing is
 * currently shown, not only when it beats the last sequence number. On a
 * reconnect/visibility reconcile (`reconcileExecutingNodes`) it is set from
 * ground truth and may hold more than one entry — a parent node plus a sub-node
 * executing inside it.
 */
export function useExecutingNode() {
	const executingNode = ref<string[]>([]);
	const lastAddedExecutingNode = ref<string | null>(null);
	// Sequence number of the node currently shown; -1 when nothing is shown.
	let latestSequenceNumber = -1;

	function addExecutingNode(nodeName: string, sequenceNumber: number) {
		// Ignore an event older than the one currently shown (a late/out-of-order
		// delivery). When nothing is shown, accept it regardless — a new run, a
		// wait-node resume, or the first node all restart the counter at 0.
		if (executingNode.value.length > 0 && sequenceNumber <= latestSequenceNumber) {
			return;
		}
		executingNode.value = [nodeName];
		lastAddedExecutingNode.value = nodeName;
		latestSequenceNumber = sequenceNumber;
	}

	function removeExecutingNode(nodeName: string) {
		// Identity-guarded: only clear when the node finishing is the one shown, so
		// a late/reordered `nodeExecuteAfter` for a superseded node is a no-op.
		if (executingNode.value[0] === nodeName) {
			executingNode.value = [];
		}
	}

	/**
	 * Replaces the shown executing node(s) with ground truth from the live-status
	 * endpoint (push reconnect / tab-visibility regain — CAT-2895 Option B).
	 *
	 * Unlike `addExecutingNode`, this is not sequence-gated: ground truth always
	 * wins. It seeds `latestSequenceNumber` from the endpoint so a late or
	 * replayed push event carrying a lower number can't resurrect a superseded
	 * spinner afterwards. The `nodes` array is written in a single assignment so
	 * the stale→reconciled swap is one paint (no clear-then-set flicker), and it
	 * may legitimately hold more than one entry — a parent node plus a sub-node
	 * executing inside it. An empty array clears the spinner (the run is active
	 * but momentarily between nodes).
	 */
	function reconcileExecutingNodes(nodes: string[], sequenceNumber: number) {
		executingNode.value = nodes;
		lastAddedExecutingNode.value = nodes.at(-1) ?? null;
		latestSequenceNumber = sequenceNumber;
	}

	function clearNodeExecutionQueue() {
		executingNode.value = [];
		lastAddedExecutingNode.value = null;
		latestSequenceNumber = -1;
	}

	function isNodeExecuting(nodeName: string): boolean {
		return executingNode.value.includes(nodeName);
	}

	return {
		executingNode,
		lastAddedExecutingNode,
		addExecutingNode,
		removeExecutingNode,
		reconcileExecutingNodes,
		isNodeExecuting,
		clearNodeExecutionQueue,
	};
}
