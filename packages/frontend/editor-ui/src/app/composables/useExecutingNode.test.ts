import { useExecutingNode } from './useExecutingNode';

/** Topology stub for plain main-flow nodes: they enclose nothing. */
const noEnclosing = () => [];

describe('useExecutingNode composable', () => {
	it('should initialize with an empty executingNode queue', () => {
		const { executingNode } = useExecutingNode(noEnclosing);
		expect(executingNode.value).toEqual([]);
	});

	it('should add a node to the executing queue', () => {
		const { executingNode, addExecutingNode } = useExecutingNode(noEnclosing);
		addExecutingNode('node1');
		expect(executingNode.value).toEqual(['node1']);
	});

	it('should return true if a node is executing', () => {
		const { addExecutingNode, isNodeExecuting } = useExecutingNode(noEnclosing);
		addExecutingNode('node1');
		expect(isNodeExecuting('node1')).toBe(true);
	});

	it('should return false if a node is not executing', () => {
		const { isNodeExecuting } = useExecutingNode(noEnclosing);
		expect(isNodeExecuting('node1')).toBe(false);
	});

	it('should not remove a node that does not exist', () => {
		const { executingNode, addExecutingNode, removeExecutingNode } = useExecutingNode(noEnclosing);
		addExecutingNode('node1');
		removeExecutingNode('node2');
		expect(executingNode.value).toEqual(['node1']);
	});

	it('should clear the node execution queue', () => {
		const { executingNode, addExecutingNode, clearNodeExecutionQueue } =
			useExecutingNode(noEnclosing);
		addExecutingNode('node1');
		addExecutingNode('node1');
		expect(executingNode.value).toEqual(['node1', 'node1']);
		clearNodeExecutionQueue();
		expect(executingNode.value).toEqual([]);
	});

	describe('same-node quick succession', () => {
		it('keeps one queue entry per concurrent run so the spinner survives the first nodeExecuteAfter', () => {
			const { executingNode, addExecutingNode, removeExecutingNode, isNodeExecuting } =
				useExecutingNode(noEnclosing);

			// The same node starts twice before either run finishes.
			addExecutingNode('node1');
			addExecutingNode('node1');
			expect(executingNode.value).toEqual(['node1', 'node1']);

			// The first nodeExecuteAfter must not drop the spinner while the second run is in flight.
			removeExecutingNode('node1');
			expect(isNodeExecuting('node1')).toBe(true);
			expect(executingNode.value).toEqual(['node1']);

			removeExecutingNode('node1');
			expect(isNodeExecuting('node1')).toBe(false);
		});
	});

	describe('scope-aware supersede', () => {
		it('supersedes a stale sibling whose nodeExecuteAfter was lost when the next node starts', () => {
			const { executingNode, addExecutingNode, isNodeExecuting } = useExecutingNode(noEnclosing);

			addExecutingNode('nodeA');
			// nodeA's nodeExecuteAfter is dropped (suspended tab); nodeB then starts.
			addExecutingNode('nodeB');

			expect(isNodeExecuting('nodeA')).toBe(false);
			expect(isNodeExecuting('nodeB')).toBe(true);
			expect(executingNode.value).toEqual(['nodeB']);
		});
	});

	describe('parent + sub-node nesting', () => {
		// Agent runs a Tool and a Model as sub-nodes; both connect into the Agent
		// via non-main connections, so the Agent encloses their execution.
		const enclosing = (nodeName: string) =>
			nodeName === 'Tool' || nodeName === 'Model' ? ['Agent'] : [];

		it('keeps an enclosing consumer spinning while its sub-node runs', () => {
			const { executingNode, addExecutingNode, isNodeExecuting } = useExecutingNode(enclosing);

			addExecutingNode('Agent');
			addExecutingNode('Tool');

			expect(isNodeExecuting('Agent')).toBe(true);
			expect(isNodeExecuting('Tool')).toBe(true);
			expect(executingNode.value).toEqual(['Agent', 'Tool']);
		});

		it('supersedes a stale sibling sub-node but keeps the shared enclosing consumer', () => {
			const { executingNode, addExecutingNode, isNodeExecuting } = useExecutingNode(enclosing);

			addExecutingNode('Agent');
			addExecutingNode('Tool'); // Tool's nodeExecuteAfter is dropped
			addExecutingNode('Model');

			expect(isNodeExecuting('Agent')).toBe(true);
			expect(isNodeExecuting('Tool')).toBe(false);
			expect(isNodeExecuting('Model')).toBe(true);
			expect(executingNode.value).toEqual(['Agent', 'Model']);
		});

		it('preserves the full enclosing chain for deeply nested sub-nodes', () => {
			// Embeddings → VectorStore → Agent: each is enclosed by the ones below it.
			const chain: Record<string, string[]> = {
				Embeddings: ['VectorStore', 'Agent'],
				VectorStore: ['Agent'],
			};
			const { executingNode, addExecutingNode, isNodeExecuting } = useExecutingNode(
				(nodeName) => chain[nodeName] ?? [],
			);

			addExecutingNode('Agent');
			addExecutingNode('VectorStore');
			addExecutingNode('Embeddings');

			expect(isNodeExecuting('Agent')).toBe(true);
			expect(isNodeExecuting('VectorStore')).toBe(true);
			expect(isNodeExecuting('Embeddings')).toBe(true);
			expect(executingNode.value).toEqual(['Agent', 'VectorStore', 'Embeddings']);
		});
	});

	describe('identity-guarded clear', () => {
		it('ignores a late nodeExecuteAfter for a node the next start already superseded', () => {
			const { executingNode, addExecutingNode, removeExecutingNode, isNodeExecuting } =
				useExecutingNode(noEnclosing);

			addExecutingNode('nodeA');
			addExecutingNode('nodeB'); // supersedes stale nodeA → ['nodeB']

			// A late / reordered nodeExecuteAfter(nodeA) arrives after nodeB has started.
			removeExecutingNode('nodeA');

			expect(isNodeExecuting('nodeB')).toBe(true);
			expect(executingNode.value).toEqual(['nodeB']);
		});
	});
});
