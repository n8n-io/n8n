import { ref } from 'vue';

/**
 * Composable to keep track of the currently executing node.
 * The queue is used to keep track of the order in which nodes are completed and
 * to ensure that there's always at least one node in the executing queue.
 *
 * The completion queue serves as a workaround for the fact that the execution status of a node
 * is not updated in real-time when dealing with large amounts of data, meaning we can end up in a
 * state where no node is actively executing, even though the workflow execution is not completed.
 */
export function useExecutingNode() {
	const executingNode = ref<string[]>([]);
	const executingNodeCompletionQueue = ref<string[]>([]);

	function addExecutingNode(nodeName: string) {
		resolveNodeExecutionQueue();
		executingNode.value.push(nodeName);
	}

	function removeExecutingNode(nodeName: string) {
		executingNodeCompletionQueue.value.push(nodeName);
		resolveNodeExecutionQueue(
			executingNode.value.length <= executingNodeCompletionQueue.value.length,
		);
	}

	function resolveNodeExecutionQueue(keepLastInQueue = false) {
		const lastExecutingNode = executingNodeCompletionQueue.value.at(-1);
		const nodesToRemove = keepLastInQueue
			? executingNodeCompletionQueue.value.slice(0, -1)
			: executingNodeCompletionQueue.value;

		executingNode.value = executingNode.value.filter((name) => !nodesToRemove.includes(name));
		executingNodeCompletionQueue.value =
			keepLastInQueue && lastExecutingNode ? [lastExecutingNode] : [];
	}

	function clearNodeExecutionQueue() {
		executingNode.value = [];
		executingNodeCompletionQueue.value = [];
	}

	return {
		executingNode,
		executingNodeCompletionQueue,
		addExecutingNode,
		removeExecutingNode,
		resolveNodeExecutionQueue,
		clearNodeExecutionQueue,
	};
}
