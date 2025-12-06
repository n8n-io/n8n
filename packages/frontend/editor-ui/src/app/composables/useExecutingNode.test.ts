import { useExecutingNode } from './useExecutingNode';

describe('useExecutingNode composable', () => {
	it('should initialize with an empty executingNode queue', () => {
		const { executingNode } = useExecutingNode();
		expect(executingNode.value).toEqual([]);
	});

	it('should add a node to the executing queue', () => {
		const { executingNode, addExecutingNode } = useExecutingNode();
		addExecutingNode('node1');
		expect(executingNode.value).toEqual(['node1']);
	});

	it('should remove an executing node from the queue (removes one occurrence at a time)', () => {
		const { executingNode, addExecutingNode, removeExecutingNode } = useExecutingNode();

		// Add nodes, including duplicates.
		addExecutingNode('node1');
		addExecutingNode('node2');
		addExecutingNode('node1');

		// After removal, only the first occurrence of "node1" should be removed.
		removeExecutingNode('node1');
		expect(executingNode.value).toEqual(['node2', 'node1']);
	});

	it('should not remove a node that does not exist', () => {
		const { executingNode, removeExecutingNode } = useExecutingNode();

		// Manually set the state for testing.
		executingNode.value = ['node1'];
		removeExecutingNode('node2'); // Trying to remove a non-existent node.
		expect(executingNode.value).toEqual(['node1']);
	});

	it('should return true if a node is executing', () => {
		const { addExecutingNode, isNodeExecuting } = useExecutingNode();
		addExecutingNode('node1');
		expect(isNodeExecuting('node1')).toBe(true);
	});

	it('should return false if a node is not executing', () => {
		const { isNodeExecuting } = useExecutingNode();
		expect(isNodeExecuting('node1')).toBe(false);
	});

	it('should clear the node execution queue', () => {
		const { executingNode, addExecutingNode, clearNodeExecutionQueue } = useExecutingNode();
		addExecutingNode('node1');
		addExecutingNode('node2');
		expect(executingNode.value).toEqual(['node1', 'node2']);
		clearNodeExecutionQueue();
		expect(executingNode.value).toEqual([]);
	});
});
