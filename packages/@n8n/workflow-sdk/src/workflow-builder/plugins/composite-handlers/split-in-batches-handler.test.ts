import { splitInBatchesHandler } from './split-in-batches-handler';
import type { NodeInstance, GraphNode, ConnectionTarget } from '../../../types/base';
import type { MutablePluginContext } from '../types';

// Helper to create a mock split-in-batches node
function createMockSibNode(name = 'Split In Batches'): NodeInstance<string, string, unknown> {
	return {
		type: 'n8n-nodes-base.splitInBatches',
		name,
		version: '3',
		config: { parameters: { batchSize: 10 } },
	} as unknown as NodeInstance<string, string, unknown>;
}

// Helper to create a mock node
function createMockNode(name: string): NodeInstance<string, string, unknown> {
	return {
		type: 'n8n-nodes-base.set',
		name,
		version: '1',
		config: { parameters: {} },
	} as NodeInstance<string, string, unknown>;
}

// Type for named syntax split-in-batches builder
interface SplitInBatchesBuilderLike {
	sibNode: NodeInstance<string, string, unknown>;
	_doneNodes: Array<NodeInstance<string, string, unknown>>;
	_eachNodes: Array<NodeInstance<string, string, unknown>>;
	_doneTarget?:
		| NodeInstance<string, string, unknown>
		| Array<NodeInstance<string, string, unknown>>
		| null;
	_eachTarget?:
		| NodeInstance<string, string, unknown>
		| Array<NodeInstance<string, string, unknown>>
		| null;
}

// Helper to create a mock SplitInBatchesBuilder with named syntax
function createSplitInBatchesBuilder(
	options: {
		sibNodeName?: string;
		doneTarget?:
			| NodeInstance<string, string, unknown>
			| Array<NodeInstance<string, string, unknown>>
			| null;
		eachTarget?:
			| NodeInstance<string, string, unknown>
			| Array<NodeInstance<string, string, unknown>>
			| null;
	} = {},
): SplitInBatchesBuilderLike {
	return {
		sibNode: createMockSibNode(options.sibNodeName),
		_doneNodes: [],
		_eachNodes: [],
		_doneTarget: options.doneTarget,
		_eachTarget: options.eachTarget,
	};
}

// Helper to create a mock MutablePluginContext
function createMockContext(): MutablePluginContext {
	const nodes = new Map<string, GraphNode>();
	return {
		nodes,
		workflowId: 'test-workflow',
		workflowName: 'Test Workflow',
		settings: {},
		addNodeWithSubnodes: jest.fn((node: NodeInstance<string, string, unknown>) => {
			nodes.set(node.name, {
				instance: node,
				connections: new Map(),
			});
			return node.name;
		}),
		addBranchToGraph: jest.fn((branch: unknown) => {
			const branchNode = branch as NodeInstance<string, string, unknown>;
			nodes.set(branchNode.name, {
				instance: branchNode,
				connections: new Map(),
			});
			return branchNode.name;
		}),
	};
}

describe('splitInBatchesHandler', () => {
	describe('metadata', () => {
		it('has correct id', () => {
			expect(splitInBatchesHandler.id).toBe('core:split-in-batches');
		});

		it('has correct name', () => {
			expect(splitInBatchesHandler.name).toBe('Split In Batches Handler');
		});

		it('has high priority', () => {
			expect(splitInBatchesHandler.priority).toBeGreaterThanOrEqual(100);
		});
	});

	describe('canHandle', () => {
		it('returns true for SplitInBatchesBuilder', () => {
			const builder = createSplitInBatchesBuilder();
			expect(splitInBatchesHandler.canHandle(builder)).toBe(true);
		});

		it('returns false for regular NodeInstance', () => {
			const node = createMockNode('Regular Node');
			expect(splitInBatchesHandler.canHandle(node)).toBe(false);
		});

		it('returns false for null', () => {
			expect(splitInBatchesHandler.canHandle(null)).toBe(false);
		});

		it('returns false for undefined', () => {
			expect(splitInBatchesHandler.canHandle(undefined)).toBe(false);
		});
	});

	describe('addNodes', () => {
		it('returns the SIB node name as head', () => {
			const builder = createSplitInBatchesBuilder({ sibNodeName: 'My SIB' });
			const ctx = createMockContext();

			const headName = splitInBatchesHandler.addNodes(builder, ctx);

			expect(headName).toBe('My SIB');
		});

		it('adds SIB node to the context nodes map', () => {
			const builder = createSplitInBatchesBuilder();
			const ctx = createMockContext();

			splitInBatchesHandler.addNodes(builder, ctx);

			expect(ctx.nodes.has('Split In Batches')).toBe(true);
			expect(ctx.nodes.get('Split In Batches')?.instance).toBe(builder.sibNode);
		});

		it('adds done target using addBranchToGraph (output 0)', () => {
			const doneNode = createMockNode('Done Node');
			const builder = createSplitInBatchesBuilder({ doneTarget: doneNode });
			const ctx = createMockContext();

			splitInBatchesHandler.addNodes(builder, ctx);

			expect(ctx.addBranchToGraph).toHaveBeenCalledWith(doneNode);
		});

		it('creates connection from SIB output 0 to done target', () => {
			const doneNode = createMockNode('Done Node');
			const builder = createSplitInBatchesBuilder({ doneTarget: doneNode });
			const ctx = createMockContext();

			splitInBatchesHandler.addNodes(builder, ctx);

			const sibNode = ctx.nodes.get('Split In Batches');
			const mainConns = sibNode?.connections.get('main');
			const output0Conns = mainConns?.get(0);

			expect(output0Conns).toBeDefined();
			expect(output0Conns).toContainEqual(
				expect.objectContaining({ node: 'Done Node', type: 'main', index: 0 }),
			);
		});

		it('adds each target using addBranchToGraph (output 1)', () => {
			const eachNode = createMockNode('Each Node');
			const builder = createSplitInBatchesBuilder({ eachTarget: eachNode });
			const ctx = createMockContext();

			splitInBatchesHandler.addNodes(builder, ctx);

			expect(ctx.addBranchToGraph).toHaveBeenCalledWith(eachNode);
		});

		it('creates connection from SIB output 1 to each target', () => {
			const eachNode = createMockNode('Each Node');
			const builder = createSplitInBatchesBuilder({ eachTarget: eachNode });
			const ctx = createMockContext();

			splitInBatchesHandler.addNodes(builder, ctx);

			const sibNode = ctx.nodes.get('Split In Batches');
			const mainConns = sibNode?.connections.get('main');
			const output1Conns = mainConns?.get(1);

			expect(output1Conns).toBeDefined();
			expect(output1Conns).toContainEqual(
				expect.objectContaining({ node: 'Each Node', type: 'main', index: 0 }),
			);
		});

		it('handles array done target (fan-out)', () => {
			const done1 = createMockNode('Done 1');
			const done2 = createMockNode('Done 2');
			const builder = createSplitInBatchesBuilder({ doneTarget: [done1, done2] });
			const ctx = createMockContext();

			splitInBatchesHandler.addNodes(builder, ctx);

			// Both should be added
			expect(ctx.addBranchToGraph).toHaveBeenCalledWith(done1);
			expect(ctx.addBranchToGraph).toHaveBeenCalledWith(done2);

			// Output 0 should connect to both
			const sibNode = ctx.nodes.get('Split In Batches');
			const mainConns = sibNode?.connections.get('main');
			const output0Conns = mainConns?.get(0);

			expect(output0Conns).toHaveLength(2);
			expect(output0Conns).toContainEqual(expect.objectContaining({ node: 'Done 1' }));
			expect(output0Conns).toContainEqual(expect.objectContaining({ node: 'Done 2' }));
		});

		it('handles array each target (fan-out)', () => {
			const each1 = createMockNode('Each 1');
			const each2 = createMockNode('Each 2');
			const builder = createSplitInBatchesBuilder({ eachTarget: [each1, each2] });
			const ctx = createMockContext();

			splitInBatchesHandler.addNodes(builder, ctx);

			// Both should be added
			expect(ctx.addBranchToGraph).toHaveBeenCalledWith(each1);
			expect(ctx.addBranchToGraph).toHaveBeenCalledWith(each2);

			// Output 1 should connect to both
			const sibNode = ctx.nodes.get('Split In Batches');
			const mainConns = sibNode?.connections.get('main');
			const output1Conns = mainConns?.get(1);

			expect(output1Conns).toHaveLength(2);
			expect(output1Conns).toContainEqual(expect.objectContaining({ node: 'Each 1' }));
			expect(output1Conns).toContainEqual(expect.objectContaining({ node: 'Each 2' }));
		});

		it('handles null done target (no connection at output 0)', () => {
			const eachNode = createMockNode('Each Node');
			const builder = createSplitInBatchesBuilder({ doneTarget: null, eachTarget: eachNode });
			const ctx = createMockContext();

			splitInBatchesHandler.addNodes(builder, ctx);

			const sibNode = ctx.nodes.get('Split In Batches');
			const mainConns = sibNode?.connections.get('main');

			// Output 0 should have no connections
			expect(mainConns?.get(0)).toBeUndefined();
			// Output 1 should have connection
			expect(mainConns?.get(1)).toBeDefined();
		});

		it('handles both done and each targets', () => {
			const doneNode = createMockNode('Done Node');
			const eachNode = createMockNode('Each Node');
			const builder = createSplitInBatchesBuilder({ doneTarget: doneNode, eachTarget: eachNode });
			const ctx = createMockContext();

			splitInBatchesHandler.addNodes(builder, ctx);

			// Both should be added
			expect(ctx.addBranchToGraph).toHaveBeenCalledWith(doneNode);
			expect(ctx.addBranchToGraph).toHaveBeenCalledWith(eachNode);

			const sibNode = ctx.nodes.get('Split In Batches');
			const mainConns = sibNode?.connections.get('main');

			expect(mainConns?.get(0)).toContainEqual(expect.objectContaining({ node: 'Done Node' }));
			expect(mainConns?.get(1)).toContainEqual(expect.objectContaining({ node: 'Each Node' }));
		});
	});

	describe('recursion prevention', () => {
		it('returns SIB node name immediately if called recursively (prevents infinite loops)', () => {
			// Simulate a recursive call by calling addNodes twice with the same builder
			// The second call should return early without re-adding nodes
			const builder = createSplitInBatchesBuilder({ sibNodeName: 'Outer SIB' });
			const ctx = createMockContext();

			// Mock addBranchToGraph to call addNodes recursively (simulating nested SIB)
			let recursiveCallCount = 0;
			ctx.addBranchToGraph = jest.fn((branch: unknown) => {
				const branchNode = branch as NodeInstance<string, string, unknown>;
				ctx.nodes.set(branchNode.name, {
					instance: branchNode,
					connections: new Map(),
				});
				// On first call, try to add the same builder recursively
				if (recursiveCallCount === 0 && splitInBatchesHandler.canHandle(builder)) {
					recursiveCallCount++;
					// This recursive call should return early
					splitInBatchesHandler.addNodes(builder, ctx);
				}
				return branchNode.name;
			});

			const eachNode = createMockNode('Each Node');
			builder._eachTarget = eachNode;

			// Should not throw or infinite loop
			expect(() => splitInBatchesHandler.addNodes(builder, ctx)).not.toThrow();
			// Should have the SIB node in the map
			expect(ctx.nodes.has('Outer SIB')).toBe(true);
		});

		it('cleans up recursion guard after successful processing', () => {
			// After processing completes, the builder should be removed from the guard
			// so it can be processed again if needed (e.g., different workflow)
			const builder = createSplitInBatchesBuilder({ sibNodeName: 'My SIB' });

			// First call
			const ctx1 = createMockContext();
			splitInBatchesHandler.addNodes(builder, ctx1);
			expect(ctx1.nodes.has('My SIB')).toBe(true);

			// Second call with fresh context should work (guard was cleaned up)
			const ctx2 = createMockContext();
			splitInBatchesHandler.addNodes(builder, ctx2);
			expect(ctx2.nodes.has('My SIB')).toBe(true);
		});
	});

	describe('fluent API support (_doneBatches/_eachBatches)', () => {
		// Extended builder type that includes fluent API properties
		interface FluentSplitInBatchesBuilder {
			sibNode: NodeInstance<string, string, unknown>;
			_doneNodes: Array<NodeInstance<string, string, unknown>>;
			_eachNodes: Array<NodeInstance<string, string, unknown>>;
			_doneBatches: Array<
				NodeInstance<string, string, unknown> | Array<NodeInstance<string, string, unknown>>
			>;
			_eachBatches: Array<
				NodeInstance<string, string, unknown> | Array<NodeInstance<string, string, unknown>>
			>;
			_hasLoop: boolean;
			// No _doneTarget/_eachTarget - fluent API uses batches instead
		}

		function createFluentBuilder(
			options: {
				sibNodeName?: string;
				doneBatches?: Array<
					NodeInstance<string, string, unknown> | Array<NodeInstance<string, string, unknown>>
				>;
				eachBatches?: Array<
					NodeInstance<string, string, unknown> | Array<NodeInstance<string, string, unknown>>
				>;
				hasLoop?: boolean;
			} = {},
		): FluentSplitInBatchesBuilder {
			return {
				sibNode: createMockSibNode(options.sibNodeName),
				_doneNodes: [],
				_eachNodes: [],
				_doneBatches: options.doneBatches ?? [],
				_eachBatches: options.eachBatches ?? [],
				_hasLoop: options.hasLoop ?? false,
			};
		}

		it('handles fluent API with single done batch', () => {
			const doneBatch = createMockNode('Done Batch');
			const builder = createFluentBuilder({ doneBatches: [doneBatch] });
			const ctx = createMockContext();

			splitInBatchesHandler.addNodes(builder, ctx);

			// SIB output 0 should connect to the done batch
			const sibNode = ctx.nodes.get('Split In Batches');
			const mainConns = sibNode?.connections.get('main');
			expect(mainConns?.get(0)).toContainEqual(
				expect.objectContaining({ node: 'Done Batch', type: 'main', index: 0 }),
			);
		});

		it('handles fluent API with chained done batches', () => {
			const batch1 = createMockNode('Done Batch 1');
			const batch2 = createMockNode('Done Batch 2');
			const builder = createFluentBuilder({ doneBatches: [batch1, batch2] });

			// Create context that tracks connections properly
			const nodes = new Map<string, GraphNode>();
			const ctx: MutablePluginContext = {
				nodes,
				workflowId: 'test-workflow',
				workflowName: 'Test Workflow',
				settings: {},
				addNodeWithSubnodes: jest.fn((node: NodeInstance<string, string, unknown>) => {
					nodes.set(node.name, {
						instance: node,
						connections: new Map<string, Map<number, ConnectionTarget[]>>([
							['main', new Map<number, ConnectionTarget[]>()],
						]),
					});
					return node.name;
				}),
				addBranchToGraph: jest.fn((branch: unknown) => {
					const branchNode = branch as NodeInstance<string, string, unknown>;
					if (!nodes.has(branchNode.name)) {
						nodes.set(branchNode.name, {
							instance: branchNode,
							connections: new Map<string, Map<number, ConnectionTarget[]>>([
								['main', new Map<number, ConnectionTarget[]>()],
							]),
						});
					}
					return branchNode.name;
				}),
			};

			splitInBatchesHandler.addNodes(builder, ctx);

			// SIB output 0 should connect to batch1
			const sibNode = nodes.get('Split In Batches');
			const sibMainConns = sibNode?.connections.get('main');
			expect(sibMainConns?.get(0)).toContainEqual(
				expect.objectContaining({ node: 'Done Batch 1' }),
			);

			// batch1 should connect to batch2
			const batch1Node = nodes.get('Done Batch 1');
			const batch1MainConns = batch1Node?.connections.get('main');
			expect(batch1MainConns?.get(0)).toContainEqual(
				expect.objectContaining({ node: 'Done Batch 2' }),
			);
		});

		it('handles fluent API with single each batch', () => {
			const eachBatch = createMockNode('Each Batch');
			const builder = createFluentBuilder({ eachBatches: [eachBatch] });
			const ctx = createMockContext();

			splitInBatchesHandler.addNodes(builder, ctx);

			// SIB output 1 should connect to the each batch
			const sibNode = ctx.nodes.get('Split In Batches');
			const mainConns = sibNode?.connections.get('main');
			expect(mainConns?.get(1)).toContainEqual(
				expect.objectContaining({ node: 'Each Batch', type: 'main', index: 0 }),
			);
		});

		it('handles fluent API with loop connection (_hasLoop=true)', () => {
			const eachBatch = createMockNode('Each Batch');
			const builder = createFluentBuilder({
				sibNodeName: 'Loop SIB',
				eachBatches: [eachBatch],
				hasLoop: true,
			});

			// Create context that tracks connections
			const nodes = new Map<string, GraphNode>();
			const ctx: MutablePluginContext = {
				nodes,
				workflowId: 'test-workflow',
				workflowName: 'Test Workflow',
				settings: {},
				addNodeWithSubnodes: jest.fn((node: NodeInstance<string, string, unknown>) => {
					nodes.set(node.name, {
						instance: node,
						connections: new Map<string, Map<number, ConnectionTarget[]>>([
							['main', new Map<number, ConnectionTarget[]>()],
						]),
					});
					return node.name;
				}),
				addBranchToGraph: jest.fn((branch: unknown) => {
					const branchNode = branch as NodeInstance<string, string, unknown>;
					if (!nodes.has(branchNode.name)) {
						nodes.set(branchNode.name, {
							instance: branchNode,
							connections: new Map<string, Map<number, ConnectionTarget[]>>([
								['main', new Map<number, ConnectionTarget[]>()],
							]),
						});
					}
					return branchNode.name;
				}),
			};

			splitInBatchesHandler.addNodes(builder, ctx);

			// Last each node should connect back to SIB
			const eachNode = nodes.get('Each Batch');
			const eachMainConns = eachNode?.connections.get('main');
			expect(eachMainConns?.get(0)).toContainEqual(
				expect.objectContaining({ node: 'Loop SIB', type: 'main', index: 0 }),
			);
		});

		it('handles fluent API with fan-out in done batches', () => {
			const fanOut1 = createMockNode('Fan Out 1');
			const fanOut2 = createMockNode('Fan Out 2');
			// First batch is an array (fan-out)
			const builder = createFluentBuilder({ doneBatches: [[fanOut1, fanOut2]] });

			const nodes = new Map<string, GraphNode>();
			const ctx: MutablePluginContext = {
				nodes,
				workflowId: 'test-workflow',
				workflowName: 'Test Workflow',
				settings: {},
				addNodeWithSubnodes: jest.fn((node: NodeInstance<string, string, unknown>) => {
					nodes.set(node.name, {
						instance: node,
						connections: new Map<string, Map<number, ConnectionTarget[]>>([
							['main', new Map<number, ConnectionTarget[]>()],
						]),
					});
					return node.name;
				}),
				addBranchToGraph: jest.fn((branch: unknown) => {
					const branchNode = branch as NodeInstance<string, string, unknown>;
					if (!nodes.has(branchNode.name)) {
						nodes.set(branchNode.name, {
							instance: branchNode,
							connections: new Map<string, Map<number, ConnectionTarget[]>>([
								['main', new Map<number, ConnectionTarget[]>()],
							]),
						});
					}
					return branchNode.name;
				}),
			};

			splitInBatchesHandler.addNodes(builder, ctx);

			// SIB output 0 should connect to both fan-out targets
			const sibNode = nodes.get('Split In Batches');
			const sibMainConns = sibNode?.connections.get('main');
			const output0Conns = sibMainConns?.get(0);

			expect(output0Conns).toHaveLength(2);
			expect(output0Conns).toContainEqual(expect.objectContaining({ node: 'Fan Out 1' }));
			expect(output0Conns).toContainEqual(expect.objectContaining({ node: 'Fan Out 2' }));
		});

		it('prefers named syntax over fluent API when both are present', () => {
			// If _doneTarget is defined, use named syntax even if _doneBatches exists
			const doneTarget = createMockNode('Done Target');
			const doneBatch = createMockNode('Done Batch');
			const builder = {
				sibNode: createMockSibNode(),
				_doneNodes: [],
				_eachNodes: [],
				_doneTarget: doneTarget,
				_eachTarget: undefined,
				_doneBatches: [doneBatch],
				_eachBatches: [],
				_hasLoop: false,
			};
			const ctx = createMockContext();

			splitInBatchesHandler.addNodes(builder, ctx);

			// Should use _doneTarget (named syntax), not _doneBatches (fluent API)
			const sibNode = ctx.nodes.get('Split In Batches');
			const mainConns = sibNode?.connections.get('main');
			expect(mainConns?.get(0)).toContainEqual(expect.objectContaining({ node: 'Done Target' }));
		});
	});
});
