import { useExecutingNode } from './useExecutingNode';

describe('useExecutingNode composable', () => {
	it('should initialize with an empty executingNode queue', () => {
		const { executingNode } = useExecutingNode();
		expect(executingNode.value).toEqual([]);
	});

	it('should show a node once it starts executing', () => {
		const { executingNode, addExecutingNode, isNodeExecuting } = useExecutingNode();
		addExecutingNode('node1', 0);
		expect(executingNode.value).toEqual(['node1']);
		expect(isNodeExecuting('node1')).toBe(true);
	});

	it('should return false for a node that is not executing', () => {
		const { isNodeExecuting } = useExecutingNode();
		expect(isNodeExecuting('node1')).toBe(false);
	});

	describe('only the latest node executes', () => {
		it('supersedes the current node when a higher sequence number arrives', () => {
			const { executingNode, addExecutingNode, isNodeExecuting } = useExecutingNode();

			addExecutingNode('nodeA', 0);
			addExecutingNode('nodeB', 2);

			expect(executingNode.value).toEqual(['nodeB']);
			expect(isNodeExecuting('nodeA')).toBe(false);
			expect(isNodeExecuting('nodeB')).toBe(true);
		});

		it('ignores a stale / out-of-order event with a lower sequence number', () => {
			const { executingNode, addExecutingNode, isNodeExecuting } = useExecutingNode();

			// nodeB (seq 2) is executing; a late nodeA event (seq 1) resurfaces after
			// a suspended tab resumes — it must not overwrite the current node.
			addExecutingNode('nodeB', 2);
			addExecutingNode('nodeA', 1);

			expect(executingNode.value).toEqual(['nodeB']);
			expect(isNodeExecuting('nodeA')).toBe(false);
			expect(isNodeExecuting('nodeB')).toBe(true);
		});
	});

	describe('clearing', () => {
		it("clears when the shown node's own nodeExecuteAfter arrives", () => {
			const { executingNode, addExecutingNode, removeExecutingNode, isNodeExecuting } =
				useExecutingNode();

			addExecutingNode('nodeA', 0);
			removeExecutingNode('nodeA');

			expect(executingNode.value).toEqual([]);
			expect(isNodeExecuting('nodeA')).toBe(false);
		});

		it('ignores a nodeExecuteAfter for a node that is not the one shown', () => {
			const { executingNode, addExecutingNode, removeExecutingNode, isNodeExecuting } =
				useExecutingNode();

			// nodeB superseded nodeA; a late after(nodeA) must not clear nodeB's spinner.
			addExecutingNode('nodeB', 2);
			removeExecutingNode('nodeA');

			expect(executingNode.value).toEqual(['nodeB']);
			expect(isNodeExecuting('nodeB')).toBe(true);
		});

		it('clears the queue and resets the sequence baseline', () => {
			const { executingNode, addExecutingNode, clearNodeExecutionQueue, lastAddedExecutingNode } =
				useExecutingNode();

			addExecutingNode('nodeA', 5);
			clearNodeExecutionQueue();

			expect(executingNode.value).toEqual([]);
			expect(lastAddedExecutingNode.value).toBeNull();

			// After a clear the baseline is reset, so the next run's first event (seq 0)
			// is accepted even though 0 is not greater than the previous sequence.
			addExecutingNode('nodeB', 0);
			expect(executingNode.value).toEqual(['nodeB']);
		});
	});

	describe('per-run counter reset', () => {
		it('shows the next node when the counter restarts at 0 (e.g. wait-node resume)', () => {
			const { executingNode, addExecutingNode, removeExecutingNode, isNodeExecuting } =
				useExecutingNode();

			// A run reaches a wait node, which finishes and clears the spinner.
			addExecutingNode('Wait', 0);
			removeExecutingNode('Wait');
			expect(executingNode.value).toEqual([]);

			// On resume the per-execution counter restarts at 0. Because nothing is
			// shown, the resumed node is accepted despite the low sequence number.
			addExecutingNode('AfterWait', 0);
			expect(isNodeExecuting('AfterWait')).toBe(true);
			expect(executingNode.value).toEqual(['AfterWait']);
		});
	});

	it('tracks the last node that started executing', () => {
		const { lastAddedExecutingNode, addExecutingNode } = useExecutingNode();
		addExecutingNode('nodeA', 0);
		addExecutingNode('nodeB', 1);
		expect(lastAddedExecutingNode.value).toBe('nodeB');
	});

	describe('concurrent strategy', () => {
		const useConcurrentExecutingNode = () => useExecutingNode({ engineType: 'v2' });

		it('shows every node that runs at the same time', () => {
			const { executingNode, addExecutingNode, isNodeExecuting } = useConcurrentExecutingNode();

			addExecutingNode('nodeA', 0, 0);
			addExecutingNode('nodeB', 1, 1);

			expect(executingNode.value).toEqual(['nodeA', 'nodeB']);
			expect(isNodeExecuting('nodeA')).toBe(true);
			expect(isNodeExecuting('nodeB')).toBe(true);
		});

		it('clears each node on its own nodeExecuteAfter', () => {
			const { addExecutingNode, removeExecutingNode, isNodeExecuting } =
				useConcurrentExecutingNode();

			addExecutingNode('nodeA', 0, 0);
			addExecutingNode('nodeB', 1, 1);
			removeExecutingNode('nodeA', 0);

			expect(isNodeExecuting('nodeA')).toBe(false);
			expect(isNodeExecuting('nodeB')).toBe(true);

			removeExecutingNode('nodeB', 1);

			expect(isNodeExecuting('nodeB')).toBe(false);
		});

		it('keeps a node with two runs in flight until both finish', () => {
			const { executingNode, addExecutingNode, removeExecutingNode, isNodeExecuting } =
				useConcurrentExecutingNode();

			addExecutingNode('nodeA', 0, 0);
			addExecutingNode('nodeA', 1, 1);
			expect(executingNode.value).toEqual(['nodeA']);

			removeExecutingNode('nodeA', 1);
			expect(isNodeExecuting('nodeA')).toBe(true);

			removeExecutingNode('nodeA', 0);
			expect(isNodeExecuting('nodeA')).toBe(false);
		});

		it('ignores a nodeExecuteAfter for a run that is not in flight', () => {
			const { executingNode, lastAddedExecutingNode, addExecutingNode, removeExecutingNode } =
				useConcurrentExecutingNode();

			addExecutingNode('nodeA', 0, 0);
			// A finished run of the same node, and an After whose Before never arrived.
			removeExecutingNode('nodeA', 0);
			addExecutingNode('nodeA', 1, 1);
			removeExecutingNode('nodeA', 0);
			removeExecutingNode('nodeA', 5);

			expect(executingNode.value).toEqual(['nodeA']);
			expect(lastAddedExecutingNode.value).toBe('nodeA');
		});

		it('ignores a nodeExecuteAfter for a node that is not running', () => {
			const { executingNode, lastAddedExecutingNode, addExecutingNode, removeExecutingNode } =
				useConcurrentExecutingNode();

			addExecutingNode('nodeA', 0, 0);
			removeExecutingNode('nodeB', 0);
			removeExecutingNode('nodeB', 1);

			expect(executingNode.value).toEqual(['nodeA']);
			expect(lastAddedExecutingNode.value).toBe('nodeA');
		});

		it('tracks the node that finished last', () => {
			const { lastAddedExecutingNode, addExecutingNode, removeExecutingNode } =
				useConcurrentExecutingNode();

			addExecutingNode('nodeB', 0, 0);
			addExecutingNode('nodeA', 1, 1);
			removeExecutingNode('nodeA', 1);
			removeExecutingNode('nodeB', 0);

			expect(lastAddedExecutingNode.value).toBe('nodeB');
		});

		it('ignores a nodeExecuteAfter before any node started', () => {
			const { executingNode, lastAddedExecutingNode, removeExecutingNode } =
				useConcurrentExecutingNode();

			removeExecutingNode('nodeA', 0);

			expect(executingNode.value).toEqual([]);
			expect(lastAddedExecutingNode.value).toBeNull();
		});

		it('clears every running node', () => {
			const {
				executingNode,
				lastAddedExecutingNode,
				addExecutingNode,
				removeExecutingNode,
				clearNodeExecutionQueue,
				isNodeExecuting,
			} = useConcurrentExecutingNode();

			addExecutingNode('nodeA', 0, 0);
			addExecutingNode('nodeA', 1, 1);
			addExecutingNode('nodeB', 2, 2);
			clearNodeExecutionQueue();

			expect(executingNode.value).toEqual([]);
			expect(lastAddedExecutingNode.value).toBeNull();

			// The runs in flight reset too, so the next run reuses execution index 0.
			addExecutingNode('nodeA', 0, 0);
			removeExecutingNode('nodeA', 0);
			expect(isNodeExecuting('nodeA')).toBe(false);
		});

		it('selects the strategy again after a clear', () => {
			let engineType: 'v1' | 'v2' = 'v1';
			const { executingNode, addExecutingNode, clearNodeExecutionQueue } = useExecutingNode({
				engineType: () => engineType,
			});

			addExecutingNode('nodeA', 0, 0);
			addExecutingNode('nodeB', 1, 1);
			expect(executingNode.value).toEqual(['nodeB']);

			// A settings change during a run applies from the next run.
			engineType = 'v2';
			addExecutingNode('nodeC', 2, 2);
			expect(executingNode.value).toEqual(['nodeC']);

			clearNodeExecutionQueue();
			addExecutingNode('nodeA', 0, 0);
			addExecutingNode('nodeB', 1, 1);
			expect(executingNode.value).toEqual(['nodeA', 'nodeB']);
		});

		it('shows only the latest node after a clear when no engine type is set', () => {
			const { executingNode, addExecutingNode, clearNodeExecutionQueue } = useExecutingNode();

			addExecutingNode('nodeA', 0, 0);
			clearNodeExecutionQueue();
			addExecutingNode('nodeA', 0, 0);
			addExecutingNode('nodeB', 1, 1);

			expect(executingNode.value).toEqual(['nodeB']);
		});
	});
});
