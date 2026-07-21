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

	describe('reconcileExecutingNodes (reconnect / visibility ground-truth)', () => {
		it('replaces the shown node(s) with ground truth in a single assignment', () => {
			const { executingNode, addExecutingNode, reconcileExecutingNodes, lastAddedExecutingNode } =
				useExecutingNode();

			// A stale spinner is up (nodeA), but ground truth says nodeB is running.
			addExecutingNode('nodeA', 0);
			reconcileExecutingNodes(['nodeB'], 5);

			expect(executingNode.value).toEqual(['nodeB']);
			expect(lastAddedExecutingNode.value).toBe('nodeB');
		});

		it('holds a legitimately-nested parent + sub-node pair', () => {
			const { executingNode, reconcileExecutingNodes, isNodeExecuting } = useExecutingNode();

			reconcileExecutingNodes(['Agent', 'Sub Model'], 7);

			expect(executingNode.value).toEqual(['Agent', 'Sub Model']);
			expect(isNodeExecuting('Agent')).toBe(true);
			expect(isNodeExecuting('Sub Model')).toBe(true);
		});

		it('seeds the sequence baseline so a replayed lower-sequence event is ignored afterwards', () => {
			const { executingNode, addExecutingNode, reconcileExecutingNodes } = useExecutingNode();

			reconcileExecutingNodes(['nodeB'], 5);
			// A late/replayed push for the superseded nodeA (seq 5 <= 5) is ignored.
			addExecutingNode('nodeA', 5);

			expect(executingNode.value).toEqual(['nodeB']);
		});

		it('clears the spinner when ground truth reports no node in flight', () => {
			const { executingNode, addExecutingNode, reconcileExecutingNodes, lastAddedExecutingNode } =
				useExecutingNode();

			addExecutingNode('nodeA', 0);
			// Run is active but momentarily between nodes (empty `nodes`).
			reconcileExecutingNodes([], 3);

			expect(executingNode.value).toEqual([]);
			expect(lastAddedExecutingNode.value).toBeNull();
		});
	});

	it('tracks the last node that started executing', () => {
		const { lastAddedExecutingNode, addExecutingNode } = useExecutingNode();
		addExecutingNode('nodeA', 0);
		addExecutingNode('nodeB', 1);
		expect(lastAddedExecutingNode.value).toBe('nodeB');
	});
});
