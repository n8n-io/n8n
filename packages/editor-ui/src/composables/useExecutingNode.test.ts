import { useExecutingNode } from '@/composables/useExecutingNode';

describe('useExecutingNode', () => {
	it('should always have at least one executing node during execution', () => {
		const { executingNode, executingNodeCompletionQueue, addExecutingNode, removeExecutingNode } =
			useExecutingNode();

		addExecutingNode('node1');

		expect(executingNode.value).toEqual(['node1']);
		expect(executingNodeCompletionQueue.value).toEqual([]);

		addExecutingNode('node2');

		expect(executingNode.value).toEqual(['node1', 'node2']);
		expect(executingNodeCompletionQueue.value).toEqual([]);

		addExecutingNode('node3');

		expect(executingNode.value).toEqual(['node1', 'node2', 'node3']);
		expect(executingNodeCompletionQueue.value).toEqual([]);

		removeExecutingNode('node1');

		expect(executingNode.value).toEqual(['node2', 'node3']);
		expect(executingNodeCompletionQueue.value).toEqual([]);

		removeExecutingNode('node2');

		expect(executingNode.value).toEqual(['node3']);
		expect(executingNodeCompletionQueue.value).toEqual([]);

		removeExecutingNode('node3');

		expect(executingNode.value).toEqual(['node3']);
		expect(executingNodeCompletionQueue.value).toEqual(['node3']);

		addExecutingNode('node4');

		expect(executingNode.value).toEqual(['node4']);
		expect(executingNodeCompletionQueue.value).toEqual([]);
	});

	describe('resolveNodeExecutionQueue', () => {
		it('should clear all nodes from the execution queue', () => {
			const { executingNode, executingNodeCompletionQueue, resolveNodeExecutionQueue } =
				useExecutingNode();

			executingNode.value = ['node1', 'node2'];
			executingNodeCompletionQueue.value = ['node1', 'node2'];

			resolveNodeExecutionQueue();

			expect(executingNode.value).toEqual([]);
			expect(executingNodeCompletionQueue.value).toEqual([]);
		});

		it('should keep the last executing node if keepLastInQueue is true and only one node is executing', () => {
			const { executingNode, executingNodeCompletionQueue, resolveNodeExecutionQueue } =
				useExecutingNode();
			executingNode.value = ['node1'];
			executingNodeCompletionQueue.value = ['node1'];

			resolveNodeExecutionQueue(true);

			expect(executingNode.value).toEqual(['node1']);
			expect(executingNodeCompletionQueue.value).toEqual(['node1']);
		});

		it('should remove all nodes except the last one if keepLastInQueue is true and more than one node is executing', () => {
			const { executingNode, executingNodeCompletionQueue, resolveNodeExecutionQueue } =
				useExecutingNode();

			executingNode.value = ['node1', 'node2'];
			executingNodeCompletionQueue.value = ['node1', 'node2'];

			resolveNodeExecutionQueue(true);

			expect(executingNode.value).toEqual(['node2']);
			expect(executingNodeCompletionQueue.value).toEqual(['node2']);
		});

		it('should clear all nodes if keepLastInQueue is false', () => {
			const { executingNode, executingNodeCompletionQueue, resolveNodeExecutionQueue } =
				useExecutingNode();

			executingNode.value = ['node1', 'node2'];
			executingNodeCompletionQueue.value = ['node1', 'node2'];

			resolveNodeExecutionQueue(false);

			expect(executingNode.value).toEqual([]);
			expect(executingNodeCompletionQueue.value).toEqual([]);
		});

		it('should handle empty execution queue gracefully', () => {
			const { executingNode, executingNodeCompletionQueue, resolveNodeExecutionQueue } =
				useExecutingNode();

			executingNode.value = [];
			executingNodeCompletionQueue.value = [];

			resolveNodeExecutionQueue();

			expect(executingNode.value).toEqual([]);
			expect(executingNodeCompletionQueue.value).toEqual([]);
		});
	});
});
