import { ref } from 'vue';

/**
 * Composable to keep track of the currently executing node.
 * The queue is used to keep track of the order in which nodes are executed and to ensure that
 * the UI reflects the correct execution status.
 *
 * Once a node is added to the queue, it will be removed after a short delay
 * to allow the running spinner to show for a small amount of time.
 *
 * The number of additions and removals from the queue should always be equal.
 * A node can exist multiple times in the queue, in order to prevent the loading spinner from
 * disappearing when a node is executed multiple times in quick succession.
 */
export function useExecutingNode() {
	const executingNode = ref<string[]>([]);
	const lastAddedExecutingNode = ref<string | null>(null);

	function addExecutingNode(nodeName: string) {
		executingNode.value.push(nodeName);
		lastAddedExecutingNode.value = nodeName;
	}

	function removeExecutingNode(nodeName: string) {
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
