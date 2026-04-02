import { ifElseHandler } from './if-else-handler';
import type { IfElseComposite, NodeInstance, GraphNode } from '../../../types/base';
import type { MutablePluginContext } from '../types';

// Helper to create a mock if node
function createMockIfNode(name = 'If Node'): NodeInstance<string, string, unknown> {
	return {
		type: 'n8n-nodes-base.if',
		name,
		version: '2',
		config: { parameters: {} },
	} as NodeInstance<string, string, unknown>;
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

// Helper to create a mock IfElseComposite
function createIfElseComposite(
	options: {
		ifNodeName?: string;
		trueBranch?:
			| NodeInstance<string, string, unknown>
			| Array<NodeInstance<string, string, unknown>>
			| null;
		falseBranch?:
			| NodeInstance<string, string, unknown>
			| Array<NodeInstance<string, string, unknown>>
			| null;
	} = {},
): IfElseComposite {
	return {
		_isIfElseComposite: true,
		ifNode: createMockIfNode(options.ifNodeName),
		// Use 'in' operator to check if property was explicitly provided (even if null)
		trueBranch: 'trueBranch' in options ? options.trueBranch : createMockNode('True Branch'),
		falseBranch: 'falseBranch' in options ? options.falseBranch : createMockNode('False Branch'),
	} as IfElseComposite;
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

// Helper to create an IfElseBuilder
function createIfElseBuilder(
	options: {
		ifNodeName?: string;
		trueBranch?:
			| NodeInstance<string, string, unknown>
			| Array<NodeInstance<string, string, unknown>>
			| null;
		falseBranch?:
			| NodeInstance<string, string, unknown>
			| Array<NodeInstance<string, string, unknown>>
			| null;
	} = {},
): {
	_isIfElseBuilder: true;
	ifNode: NodeInstance<string, string, unknown>;
	trueBranch: unknown;
	falseBranch: unknown;
} {
	return {
		_isIfElseBuilder: true,
		ifNode: createMockIfNode(options.ifNodeName),
		trueBranch: 'trueBranch' in options ? options.trueBranch : createMockNode('True Branch'),
		falseBranch: 'falseBranch' in options ? options.falseBranch : createMockNode('False Branch'),
	};
}

describe('ifElseHandler', () => {
	describe('metadata', () => {
		it('has correct id', () => {
			expect(ifElseHandler.id).toBe('core:if-else');
		});

		it('has correct name', () => {
			expect(ifElseHandler.name).toBe('If/Else Handler');
		});

		it('has high priority', () => {
			expect(ifElseHandler.priority).toBeGreaterThanOrEqual(100);
		});
	});

	describe('canHandle', () => {
		it('returns true for IfElseComposite', () => {
			const composite = createIfElseComposite();
			expect(ifElseHandler.canHandle(composite)).toBe(true);
		});

		it('returns false for regular NodeInstance', () => {
			const node = createMockNode('Regular Node');
			expect(ifElseHandler.canHandle(node)).toBe(false);
		});

		it('returns false for null', () => {
			expect(ifElseHandler.canHandle(null)).toBe(false);
		});

		it('returns false for undefined', () => {
			expect(ifElseHandler.canHandle(undefined)).toBe(false);
		});

		it('returns false for primitive values', () => {
			expect(ifElseHandler.canHandle('string')).toBe(false);
			expect(ifElseHandler.canHandle(123)).toBe(false);
		});

		it('returns true for IfElseBuilder (fluent API)', () => {
			const builder = createIfElseBuilder();
			expect(ifElseHandler.canHandle(builder)).toBe(true);
		});
	});

	describe('addNodes with IfElseBuilder', () => {
		it('returns the IF node name as head for IfElseBuilder', () => {
			const builder = createIfElseBuilder({ ifNodeName: 'Builder If' });
			const ctx = createMockContext();

			const headName = ifElseHandler.addNodes(builder as unknown as IfElseComposite, ctx);

			expect(headName).toBe('Builder If');
		});

		it('adds IF node from IfElseBuilder to context', () => {
			const builder = createIfElseBuilder();
			const ctx = createMockContext();

			ifElseHandler.addNodes(builder as unknown as IfElseComposite, ctx);

			expect(ctx.nodes.has('If Node')).toBe(true);
		});

		it('creates connections from IfElseBuilder true branch', () => {
			const trueBranch = createMockNode('Builder True');
			const builder = createIfElseBuilder({ trueBranch, falseBranch: null });
			const ctx = createMockContext();

			ifElseHandler.addNodes(builder as unknown as IfElseComposite, ctx);

			const ifNode = ctx.nodes.get('If Node');
			const mainConns = ifNode?.connections.get('main');
			const output0Conns = mainConns?.get(0);

			expect(output0Conns).toContainEqual(
				expect.objectContaining({ node: 'Builder True', type: 'main', index: 0 }),
			);
		});

		it('creates connections from IfElseBuilder false branch', () => {
			const falseBranch = createMockNode('Builder False');
			const builder = createIfElseBuilder({ trueBranch: null, falseBranch });
			const ctx = createMockContext();

			ifElseHandler.addNodes(builder as unknown as IfElseComposite, ctx);

			const ifNode = ctx.nodes.get('If Node');
			const mainConns = ifNode?.connections.get('main');
			const output1Conns = mainConns?.get(1);

			expect(output1Conns).toContainEqual(
				expect.objectContaining({ node: 'Builder False', type: 'main', index: 0 }),
			);
		});
	});

	describe('addNodes', () => {
		it('returns the IF node name as head', () => {
			const composite = createIfElseComposite({ ifNodeName: 'My If' });
			const ctx = createMockContext();

			const headName = ifElseHandler.addNodes(composite, ctx);

			expect(headName).toBe('My If');
		});

		it('adds IF node to the context nodes map', () => {
			const composite = createIfElseComposite();
			const ctx = createMockContext();

			ifElseHandler.addNodes(composite, ctx);

			expect(ctx.nodes.has('If Node')).toBe(true);
			expect(ctx.nodes.get('If Node')?.instance).toBe(composite.ifNode);
		});

		it('adds true branch using addBranchToGraph', () => {
			const trueBranch = createMockNode('True Branch');
			const composite = createIfElseComposite({ trueBranch });
			const ctx = createMockContext();

			ifElseHandler.addNodes(composite, ctx);

			expect(ctx.addBranchToGraph).toHaveBeenCalledWith(trueBranch);
		});

		it('adds false branch using addBranchToGraph', () => {
			const falseBranch = createMockNode('False Branch');
			const composite = createIfElseComposite({ falseBranch });
			const ctx = createMockContext();

			ifElseHandler.addNodes(composite, ctx);

			expect(ctx.addBranchToGraph).toHaveBeenCalledWith(falseBranch);
		});

		it('creates connection from IF output 0 to true branch', () => {
			const trueBranch = createMockNode('True Branch');
			const composite = createIfElseComposite({ trueBranch, falseBranch: null });
			const ctx = createMockContext();

			ifElseHandler.addNodes(composite, ctx);

			const ifNode = ctx.nodes.get('If Node');
			const mainConns = ifNode?.connections.get('main');
			const output0Conns = mainConns?.get(0);

			expect(output0Conns).toBeDefined();
			expect(output0Conns).toContainEqual(
				expect.objectContaining({ node: 'True Branch', type: 'main', index: 0 }),
			);
		});

		it('creates connection from IF output 1 to false branch', () => {
			const falseBranch = createMockNode('False Branch');
			const composite = createIfElseComposite({ trueBranch: null, falseBranch });
			const ctx = createMockContext();

			ifElseHandler.addNodes(composite, ctx);

			const ifNode = ctx.nodes.get('If Node');
			const mainConns = ifNode?.connections.get('main');
			const output1Conns = mainConns?.get(1);

			expect(output1Conns).toBeDefined();
			expect(output1Conns).toContainEqual(
				expect.objectContaining({ node: 'False Branch', type: 'main', index: 0 }),
			);
		});

		it('handles null true branch (no connection at output 0)', () => {
			const composite = createIfElseComposite({ trueBranch: null });
			const ctx = createMockContext();

			ifElseHandler.addNodes(composite, ctx);

			const ifNode = ctx.nodes.get('If Node');
			const mainConns = ifNode?.connections.get('main');

			// Output 0 should have no connections
			expect(mainConns?.get(0)).toBeUndefined();
		});

		it('handles null false branch (no connection at output 1)', () => {
			const composite = createIfElseComposite({ falseBranch: null });
			const ctx = createMockContext();

			ifElseHandler.addNodes(composite, ctx);

			const ifNode = ctx.nodes.get('If Node');
			const mainConns = ifNode?.connections.get('main');

			// Output 1 should have no connections
			expect(mainConns?.get(1)).toBeUndefined();
		});

		it('handles array true branch (fan-out)', () => {
			const branch1 = createMockNode('True Branch 1');
			const branch2 = createMockNode('True Branch 2');
			const composite = createIfElseComposite({
				trueBranch: [branch1, branch2],
				falseBranch: null,
			});
			const ctx = createMockContext();

			ifElseHandler.addNodes(composite, ctx);

			// Both branches should be added
			expect(ctx.addBranchToGraph).toHaveBeenCalledWith(branch1);
			expect(ctx.addBranchToGraph).toHaveBeenCalledWith(branch2);

			// Output 0 should connect to both
			const ifNode = ctx.nodes.get('If Node');
			const mainConns = ifNode?.connections.get('main');
			const output0Conns = mainConns?.get(0);

			expect(output0Conns).toHaveLength(2);
			expect(output0Conns).toContainEqual(expect.objectContaining({ node: 'True Branch 1' }));
			expect(output0Conns).toContainEqual(expect.objectContaining({ node: 'True Branch 2' }));
		});
	});
});
