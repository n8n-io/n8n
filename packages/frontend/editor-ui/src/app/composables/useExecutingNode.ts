import { ref, toValue, type MaybeRefOrGetter, type Ref } from 'vue';
import type { IWorkflowSettings } from 'n8n-workflow';

interface ExecutingNodeRefs {
	executingNode: Ref<string[]>;
	lastAddedExecutingNode: Ref<string | null>;
}

interface ExecutingNodeStrategy {
	add(nodeName: string, sequenceNumber: number, executionIndex: number | undefined): void;
	remove(nodeName: string, executionIndex: number | undefined): void;
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
 * parallel, and one node can have more than one run in flight. Each
 * `nodeExecuteAfter` finishes only the run whose `nodeExecuteBefore` carried the
 * same `executionIndex`. An After for another run, or with no Before, changes
 * nothing.
 *
 * It ignores `sequenceNumber`: a step's `nodeExecuteBefore` never follows its
 * own `nodeExecuteAfter`, the transport is ordered, and the editor handles push
 * messages one at a time.
 */
function createConcurrentNodeStrategy({
	executingNode,
	lastAddedExecutingNode,
}: ExecutingNodeRefs): ExecutingNodeStrategy {
	// The node name of each run in flight, by the run's `executionIndex`.
	const runsInFlight = new Map<number | undefined, string>();

	return {
		add(nodeName, _sequenceNumber, executionIndex) {
			runsInFlight.set(executionIndex, nodeName);
			lastAddedExecutingNode.value = nodeName;
			if (!executingNode.value.includes(nodeName)) {
				executingNode.value = [...executingNode.value, nodeName];
			}
		},
		remove(nodeName, executionIndex) {
			if (runsInFlight.get(executionIndex) !== nodeName) return;
			runsInFlight.delete(executionIndex);

			// "Waiting for next" follows the node that finished last, not a node that
			// started later and already finished.
			lastAddedExecutingNode.value = nodeName;
			if ([...runsInFlight.values()].includes(nodeName)) return;
			executingNode.value = executingNode.value.filter((name) => name !== nodeName);
		},
	};
}

/**
 * Tracks the nodes rendered as executing (the per-node loading spinner).
 *
 * A v1 run shows only the latest node. An engine v2 run shows every node that
 * is running. The first node of a run reads `engineType` to select the
 * strategy. The strategy stays fixed until `clearNodeExecutionQueue`.
 *
 * `executingNode` stays an array for its consumers' sake. The push handlers
 * pass each event's `executionIndex`, which pairs a run's start and finish.
 */
export function useExecutingNode(
	options: { engineType?: MaybeRefOrGetter<IWorkflowSettings['engineType']> } = {},
) {
	const executingNode = ref<string[]>([]);
	/**
	 * The node for the "waiting for next" state. On v1, the node that started
	 * last. On engine v2, the node that finished last.
	 */
	const lastAddedExecutingNode = ref<string | null>(null);
	// Null until the first node of a run selects a strategy.
	let strategy: ExecutingNodeStrategy | null = null;

	function addExecutingNode(nodeName: string, sequenceNumber: number, executionIndex?: number) {
		strategy ??=
			toValue(options.engineType) === 'v2'
				? createConcurrentNodeStrategy({ executingNode, lastAddedExecutingNode })
				: createLatestNodeStrategy({ executingNode, lastAddedExecutingNode });
		strategy.add(nodeName, sequenceNumber, executionIndex);
	}

	function removeExecutingNode(nodeName: string, executionIndex?: number) {
		strategy?.remove(nodeName, executionIndex);
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
