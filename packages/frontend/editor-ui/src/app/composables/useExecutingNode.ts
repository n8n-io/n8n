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
 * `executingNode` stays an array for its consumers' sake, but now holds at most
 * one entry. The counter restarts at 0 per run — and mid-run on a wait-node
 * resume — so a fresh event is also accepted whenever nothing is currently
 * shown, not only when it beats the last sequence number.
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
		isNodeExecuting,
		clearNodeExecutionQueue,
	};
}
