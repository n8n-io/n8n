import { switchCaseHandler } from './switch-case-handler';
import type { SwitchCaseComposite, NodeInstance, GraphNode } from '../../../types/base';
import type { MutablePluginContext } from '../types';

// Helper to create a mock switch node
function createMockSwitchNode(name = 'Switch Node'): NodeInstance<string, string, unknown> {
	return {
		type: 'n8n-nodes-base.switch',
		name,
		version: '3',
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

type CaseValue =
	| NodeInstance<string, string, unknown>
	| Array<NodeInstance<string, string, unknown> | null>
	| null;

// Helper to create a mock SwitchCaseComposite
function createSwitchCaseComposite(
	options: {
		switchNodeName?: string;
		cases?: CaseValue[];
	} = {},
): SwitchCaseComposite {
	return {
		_isSwitchCaseComposite: true,
		switchNode: createMockSwitchNode(options.switchNodeName),
		cases: options.cases ?? [createMockNode('Case 0'), createMockNode('Case 1')],
	} as SwitchCaseComposite;
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

// Helper to create a SwitchCaseBuilder
function createSwitchCaseBuilder(
	options: {
		switchNodeName?: string;
		cases?: Map<number, CaseValue>;
	} = {},
): {
	_isSwitchCaseBuilder: true;
	switchNode: NodeInstance<string, string, unknown>;
	caseMapping: Map<number, CaseValue>;
} {
	const caseMapping =
		options.cases ??
		new Map<number, CaseValue>([
			[0, createMockNode('Case 0')],
			[1, createMockNode('Case 1')],
		]);

	return {
		_isSwitchCaseBuilder: true,
		switchNode: createMockSwitchNode(options.switchNodeName),
		caseMapping,
	};
}

describe('switchCaseHandler', () => {
	describe('metadata', () => {
		it('has correct id', () => {
			expect(switchCaseHandler.id).toBe('core:switch-case');
		});

		it('has correct name', () => {
			expect(switchCaseHandler.name).toBe('Switch/Case Handler');
		});

		it('has high priority', () => {
			expect(switchCaseHandler.priority).toBeGreaterThanOrEqual(100);
		});
	});

	describe('canHandle', () => {
		it('returns true for SwitchCaseComposite', () => {
			const composite = createSwitchCaseComposite();
			expect(switchCaseHandler.canHandle(composite)).toBe(true);
		});

		it('returns false for regular NodeInstance', () => {
			const node = createMockNode('Regular Node');
			expect(switchCaseHandler.canHandle(node)).toBe(false);
		});

		it('returns false for null', () => {
			expect(switchCaseHandler.canHandle(null)).toBe(false);
		});

		it('returns false for undefined', () => {
			expect(switchCaseHandler.canHandle(undefined)).toBe(false);
		});

		it('returns true for SwitchCaseBuilder (fluent API)', () => {
			const builder = createSwitchCaseBuilder();
			expect(switchCaseHandler.canHandle(builder)).toBe(true);
		});
	});

	describe('addNodes with SwitchCaseBuilder', () => {
		it('returns the Switch node name as head for SwitchCaseBuilder', () => {
			const builder = createSwitchCaseBuilder({ switchNodeName: 'Builder Switch' });
			const ctx = createMockContext();

			const headName = switchCaseHandler.addNodes(builder as unknown as SwitchCaseComposite, ctx);

			expect(headName).toBe('Builder Switch');
		});

		it('adds Switch node from SwitchCaseBuilder to context', () => {
			const builder = createSwitchCaseBuilder();
			const ctx = createMockContext();

			switchCaseHandler.addNodes(builder as unknown as SwitchCaseComposite, ctx);

			expect(ctx.nodes.has('Switch Node')).toBe(true);
		});

		it('creates connections from SwitchCaseBuilder caseMapping', () => {
			const case0 = createMockNode('Builder Case 0');
			const case1 = createMockNode('Builder Case 1');
			const builder = createSwitchCaseBuilder({
				cases: new Map([
					[0, case0],
					[1, case1],
				]),
			});
			const ctx = createMockContext();

			switchCaseHandler.addNodes(builder as unknown as SwitchCaseComposite, ctx);

			const switchNode = ctx.nodes.get('Switch Node');
			const mainConns = switchNode?.connections.get('main');

			expect(mainConns?.get(0)).toContainEqual(
				expect.objectContaining({ node: 'Builder Case 0', type: 'main', index: 0 }),
			);
			expect(mainConns?.get(1)).toContainEqual(
				expect.objectContaining({ node: 'Builder Case 1', type: 'main', index: 0 }),
			);
		});

		it('handles non-sequential case indices in SwitchCaseBuilder', () => {
			const case0 = createMockNode('Case 0');
			const case5 = createMockNode('Case 5');
			const builder = createSwitchCaseBuilder({
				cases: new Map([
					[0, case0],
					[5, case5], // Non-sequential index
				]),
			});
			const ctx = createMockContext();

			switchCaseHandler.addNodes(builder as unknown as SwitchCaseComposite, ctx);

			const switchNode = ctx.nodes.get('Switch Node');
			const mainConns = switchNode?.connections.get('main');

			expect(mainConns?.get(0)).toContainEqual(expect.objectContaining({ node: 'Case 0' }));
			expect(mainConns?.get(5)).toContainEqual(expect.objectContaining({ node: 'Case 5' }));
		});
	});

	describe('addNodes', () => {
		it('returns the Switch node name as head', () => {
			const composite = createSwitchCaseComposite({ switchNodeName: 'My Switch' });
			const ctx = createMockContext();

			const headName = switchCaseHandler.addNodes(composite, ctx);

			expect(headName).toBe('My Switch');
		});

		it('adds Switch node to the context nodes map', () => {
			const composite = createSwitchCaseComposite();
			const ctx = createMockContext();

			switchCaseHandler.addNodes(composite, ctx);

			expect(ctx.nodes.has('Switch Node')).toBe(true);
			expect(ctx.nodes.get('Switch Node')?.instance).toBe(composite.switchNode);
		});

		it('adds case nodes using addBranchToGraph', () => {
			const case0 = createMockNode('Case 0');
			const case1 = createMockNode('Case 1');
			const composite = createSwitchCaseComposite({ cases: [case0, case1] });
			const ctx = createMockContext();

			switchCaseHandler.addNodes(composite, ctx);

			expect(ctx.addBranchToGraph).toHaveBeenCalledWith(case0);
			expect(ctx.addBranchToGraph).toHaveBeenCalledWith(case1);
		});

		it('creates connection from Switch output 0 to case 0', () => {
			const case0 = createMockNode('Case 0');
			const composite = createSwitchCaseComposite({ cases: [case0] });
			const ctx = createMockContext();

			switchCaseHandler.addNodes(composite, ctx);

			const switchNode = ctx.nodes.get('Switch Node');
			const mainConns = switchNode?.connections.get('main');
			const output0Conns = mainConns?.get(0);

			expect(output0Conns).toBeDefined();
			expect(output0Conns).toContainEqual(
				expect.objectContaining({ node: 'Case 0', type: 'main', index: 0 }),
			);
		});

		it('creates connections to multiple cases at different outputs', () => {
			const case0 = createMockNode('Case 0');
			const case1 = createMockNode('Case 1');
			const case2 = createMockNode('Case 2');
			const composite = createSwitchCaseComposite({ cases: [case0, case1, case2] });
			const ctx = createMockContext();

			switchCaseHandler.addNodes(composite, ctx);

			const switchNode = ctx.nodes.get('Switch Node');
			const mainConns = switchNode?.connections.get('main');

			expect(mainConns?.get(0)).toContainEqual(expect.objectContaining({ node: 'Case 0' }));
			expect(mainConns?.get(1)).toContainEqual(expect.objectContaining({ node: 'Case 1' }));
			expect(mainConns?.get(2)).toContainEqual(expect.objectContaining({ node: 'Case 2' }));
		});

		it('handles null case (no connection for that output)', () => {
			const case1 = createMockNode('Case 1');
			const composite = createSwitchCaseComposite({ cases: [null, case1] });
			const ctx = createMockContext();

			switchCaseHandler.addNodes(composite, ctx);

			const switchNode = ctx.nodes.get('Switch Node');
			const mainConns = switchNode?.connections.get('main');

			// Output 0 should have no connections (null case)
			expect(mainConns?.get(0)).toBeUndefined();
			// Output 1 should connect to Case 1
			expect(mainConns?.get(1)).toContainEqual(expect.objectContaining({ node: 'Case 1' }));
		});

		it('handles array case (fan-out)', () => {
			const branch1 = createMockNode('Branch 1');
			const branch2 = createMockNode('Branch 2');
			const composite = createSwitchCaseComposite({ cases: [[branch1, branch2]] });
			const ctx = createMockContext();

			switchCaseHandler.addNodes(composite, ctx);

			// Both branches should be added
			expect(ctx.addBranchToGraph).toHaveBeenCalledWith(branch1);
			expect(ctx.addBranchToGraph).toHaveBeenCalledWith(branch2);

			// Output 0 should connect to both
			const switchNode = ctx.nodes.get('Switch Node');
			const mainConns = switchNode?.connections.get('main');
			const output0Conns = mainConns?.get(0);

			expect(output0Conns).toHaveLength(2);
			expect(output0Conns).toContainEqual(expect.objectContaining({ node: 'Branch 1' }));
			expect(output0Conns).toContainEqual(expect.objectContaining({ node: 'Branch 2' }));
		});

		it('handles null in array case', () => {
			const branch1 = createMockNode('Branch 1');
			const composite = createSwitchCaseComposite({ cases: [[branch1, null]] });
			const ctx = createMockContext();

			switchCaseHandler.addNodes(composite, ctx);

			// Only non-null branch should be added
			expect(ctx.addBranchToGraph).toHaveBeenCalledWith(branch1);
			expect(ctx.addBranchToGraph).toHaveBeenCalledTimes(1);
		});
	});
});
