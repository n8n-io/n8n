import { ref, type Ref } from 'vue';

interface ExecutingNodeRefs {
	executingNode: Ref<string[]>;
	lastAddedExecutingNode: Ref<string | null>;
}

interface ExecutingNodeStrategy {
	add(nodeName: string, sequenceNumber: number): void;
	remove(nodeName: string): void;
}

/**
 * Shows only the latest node as executing (CAT-2895): each `nodeExecuteBefore`
 * carries a `sequenceNumber` — a per-execution monotonic counter assigned in
 * engine order — and we show the node of the highest one seen, clearing it on
 * its own `nodeExecuteAfter`. Events that arrive late or out of order (e.g.
 * after a suspended background tab resumes) carry a lower number and are
 * ignored, so a stale node can never overwrite the current one or leave several
 * spinners running at once.
 *
 * The counter restarts at 0 per run — and mid-run on a wait-node resume — so a
 * fresh event is also accepted whenever nothing is currently shown, not only
 * when it beats the last sequence number.
 */
function createLatestNodeStrategy({
	executingNode,
	lastAddedExecutingNode,
}: ExecutingNodeRefs): ExecutingNodeStrategy {
	// Sequence number of the node currently shown; -1 when nothing is shown.
	let latestSequenceNumber = -1;

	return {
		add(nodeName, sequenceNumber) {
			// Ignore an event older than the one currently shown (a late/out-of-order
			// delivery). When nothing is shown, accept it regardless — a new run, a
			// wait-node resume, or the first node all restart the counter at 0.
			if (executingNode.value.length > 0 && sequenceNumber <= latestSequenceNumber) {
				return;
			}
			executingNode.value = [nodeName];
			lastAddedExecutingNode.value = nodeName;
			latestSequenceNumber = sequenceNumber;
		},
		remove(nodeName) {
			// Identity-guarded: only clear when the node finishing is the one shown, so
			// a late/reordered `nodeExecuteAfter` for a superseded node is a no-op.
			if (executingNode.value[0] === nodeName) {
				executingNode.value = [];
			}
		},
	};
}

/**
 * Shows every node that started and did not finish. Engine v2 runs nodes in
 * parallel, and one node can have more than one run in flight, so it counts the
 * runs of each node. A node stops showing when its count is 0.
 *
 * It ignores `sequenceNumber`: a step's `nodeExecuteBefore` never follows its
 * own `nodeExecuteAfter`, the transport is ordered, and the editor handles push
 * messages one at a time.
 */
function createConcurrentNodeStrategy({
	executingNode,
	lastAddedExecutingNode,
}: ExecutingNodeRefs): ExecutingNodeStrategy {
	const runsInFlight = new Map<string, number>();

	return {
		add(nodeName) {
			runsInFlight.set(nodeName, (runsInFlight.get(nodeName) ?? 0) + 1);
			lastAddedExecutingNode.value = nodeName;
			if (!executingNode.value.includes(nodeName)) {
				executingNode.value = [...executingNode.value, nodeName];
			}
		},
		remove(nodeName) {
			const runs = runsInFlight.get(nodeName);
			if (runs === undefined) return;

			// "Waiting for next" follows the node that finished last, not a node that
			// started later and already finished.
			lastAddedExecutingNode.value = nodeName;
			if (runs > 1) {
				runsInFlight.set(nodeName, runs - 1);
				return;
			}
			runsInFlight.delete(nodeName);
			executingNode.value = executingNode.value.filter((name) => name !== nodeName);
		},
	};
}

/**
 * Tracks the nodes rendered as executing (the per-node loading spinner).
 *
 * A v1 run shows only the latest node. An engine v2 run shows every node that
 * is running. The first node of a run selects the strategy from
 * `allowsConcurrentNodes`. The strategy stays fixed until
 * `clearNodeExecutionQueue`.
 *
 * `executingNode` stays an array for its consumers' sake.
 */
export function useExecutingNode(options: { allowsConcurrentNodes?: () => boolean } = {}) {
	const executingNode = ref<string[]>([]);
	/**
	 * The node for the "waiting for next" state. On v1, the node that started
	 * last. On engine v2, the node that finished last.
	 */
	const lastAddedExecutingNode = ref<string | null>(null);
	// Null until the first node of a run selects a strategy.
	let strategy: ExecutingNodeStrategy | null = null;

	function addExecutingNode(nodeName: string, sequenceNumber: number) {
		strategy ??=
			options.allowsConcurrentNodes?.() === true
				? createConcurrentNodeStrategy({ executingNode, lastAddedExecutingNode })
				: createLatestNodeStrategy({ executingNode, lastAddedExecutingNode });
		strategy.add(nodeName, sequenceNumber);
	}

	function removeExecutingNode(nodeName: string) {
		strategy?.remove(nodeName);
	}

	function clearNodeExecutionQueue() {
		executingNode.value = [];
		lastAddedExecutingNode.value = null;
		strategy = null;
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
