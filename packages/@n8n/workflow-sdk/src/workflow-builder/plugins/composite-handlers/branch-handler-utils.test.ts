import {
	getTargetNodeName,
	collectFromTarget,
	addBranchTargetNodes,
	processBranchForComposite,
	processBranchForBuilder,
} from './branch-handler-utils';
import type { NodeInstance, ConnectionTarget } from '../../../types/base';
import type { MutablePluginContext } from '../types';

// Mock node factory
function createMockNode(name: string): NodeInstance<string, string, unknown> {
	return {
		type: 'n8n-nodes-base.httpRequest',
		version: '4.2',
		config: {},
		id: `id-${name}`,
		name,
		update: () => ({}) as NodeInstance<string, string, unknown>,
		to: () => ({}) as never,
		input: () => ({}) as never,
		output: () => ({}) as never,
		onTrue: () => ({}) as never,
		onFalse: () => ({}) as never,
		onCase: () => ({}) as never,
		onError: () => ({}) as never,
		getConnections: () => [],
	};
}

describe('branch-handler-utils', () => {
	describe('getTargetNodeName', () => {
		it('should return undefined for null', () => {
			expect(getTargetNodeName(null)).toBeUndefined();
		});

		it('should return undefined for undefined', () => {
			expect(getTargetNodeName(undefined)).toBeUndefined();
		});

		it('should return name for NodeInstance', () => {
			const node = createMockNode('TestNode');
			expect(getTargetNodeName(node)).toBe('TestNode');
		});

		it('should return head name for NodeChain', () => {
			const head = createMockNode('Head');
			const tail = createMockNode('Tail');
			const chain = {
				_isChain: true as const,
				head,
				tail,
				allNodes: [head, tail],
			};
			expect(getTargetNodeName(chain)).toBe('Head');
		});
	});

	describe('collectFromTarget', () => {
		it('should not call collector for null', () => {
			const collector = jest.fn();
			collectFromTarget(null, collector);
			expect(collector).not.toHaveBeenCalled();
		});

		it('should not call collector for undefined', () => {
			const collector = jest.fn();
			collectFromTarget(undefined, collector);
			expect(collector).not.toHaveBeenCalled();
		});

		it('should call collector for single node', () => {
			const node = createMockNode('TestNode');
			const collector = jest.fn();
			collectFromTarget(node, collector);
			expect(collector).toHaveBeenCalledWith(node);
		});

		it('should call collector for each node in array', () => {
			const node1 = createMockNode('Node1');
			const node2 = createMockNode('Node2');
			const collector = jest.fn();
			collectFromTarget([node1, node2], collector);
			expect(collector).toHaveBeenCalledTimes(2);
			expect(collector).toHaveBeenCalledWith(node1);
			expect(collector).toHaveBeenCalledWith(node2);
		});

		it('should skip null elements in array', () => {
			const node1 = createMockNode('Node1');
			const collector = jest.fn();
			collectFromTarget([node1, null, null], collector);
			expect(collector).toHaveBeenCalledTimes(1);
			expect(collector).toHaveBeenCalledWith(node1);
		});
	});

	describe('addBranchTargetNodes', () => {
		it('should do nothing for null', () => {
			const ctx = {
				addBranchToGraph: jest.fn(),
			} as unknown as MutablePluginContext;
			addBranchTargetNodes(null, ctx);
			expect(ctx.addBranchToGraph).not.toHaveBeenCalled();
		});

		it('should call addBranchToGraph for single target', () => {
			const node = createMockNode('TestNode');
			const ctx = {
				addBranchToGraph: jest.fn(),
			} as unknown as MutablePluginContext;
			addBranchTargetNodes(node, ctx);
			expect(ctx.addBranchToGraph).toHaveBeenCalledWith(node);
		});

		it('should call addBranchToGraph for each element in array', () => {
			const node1 = createMockNode('Node1');
			const node2 = createMockNode('Node2');
			const ctx = {
				addBranchToGraph: jest.fn(),
			} as unknown as MutablePluginContext;
			addBranchTargetNodes([node1, node2], ctx);
			expect(ctx.addBranchToGraph).toHaveBeenCalledTimes(2);
		});
	});

	describe('processBranchForComposite', () => {
		it('should skip null branch', () => {
			const mainConns = new Map<number, ConnectionTarget[]>();
			const ctx = {
				addBranchToGraph: jest.fn(),
			} as unknown as MutablePluginContext;
			processBranchForComposite(null, 0, ctx, mainConns);
			expect(mainConns.size).toBe(0);
		});

		it('should add single node connection', () => {
			const node = createMockNode('TestNode');
			const mainConns = new Map<number, ConnectionTarget[]>();
			const ctx = {
				addBranchToGraph: jest.fn().mockReturnValue('TestNode'),
			} as unknown as MutablePluginContext;
			processBranchForComposite(node, 0, ctx, mainConns);
			expect(mainConns.get(0)).toEqual([{ node: 'TestNode', type: 'main', index: 0 }]);
		});

		it('should handle fan-out (array) branches', () => {
			const node1 = createMockNode('Node1');
			const node2 = createMockNode('Node2');
			const mainConns = new Map<number, ConnectionTarget[]>();
			const ctx = {
				addBranchToGraph: jest.fn().mockImplementation((n: { name: string }) => n.name),
			} as unknown as MutablePluginContext;
			processBranchForComposite([node1, node2], 0, ctx, mainConns);
			expect(mainConns.get(0)).toEqual([
				{ node: 'Node1', type: 'main', index: 0 },
				{ node: 'Node2', type: 'main', index: 0 },
			]);
		});
	});

	describe('processBranchForBuilder', () => {
		it('should skip null branch', () => {
			const mainConns = new Map<number, ConnectionTarget[]>();
			processBranchForBuilder(null, 0, mainConns);
			expect(mainConns.size).toBe(0);
		});

		it('should add single node connection by name', () => {
			const node = createMockNode('TestNode');
			const mainConns = new Map<number, ConnectionTarget[]>();
			processBranchForBuilder(node, 0, mainConns);
			expect(mainConns.get(0)).toEqual([{ node: 'TestNode', type: 'main', index: 0 }]);
		});

		it('should handle fan-out (array) branches', () => {
			const node1 = createMockNode('Node1');
			const node2 = createMockNode('Node2');
			const mainConns = new Map<number, ConnectionTarget[]>();
			processBranchForBuilder([node1, node2], 0, mainConns);
			expect(mainConns.get(0)).toEqual([
				{ node: 'Node1', type: 'main', index: 0 },
				{ node: 'Node2', type: 'main', index: 0 },
			]);
		});
	});
});
