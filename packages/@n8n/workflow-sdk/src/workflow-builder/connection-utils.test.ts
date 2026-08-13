/**
 * Tests for connection utilities
 */

import { findMapKeyForNodeId, resolveTargetNodeName } from './connection-utils';
import type { GraphNode, NodeInstance, NodeChain } from '../types/base';
import type { PluginRegistry } from './plugins/registry';

// Helper to create a minimal node instance
function createNode(
	overrides: Partial<NodeInstance<string, string, unknown>> = {},
): NodeInstance<string, string, unknown> {
	return {
		type: 'n8n-nodes-base.set',
		version: 'v1',
		id: overrides.id ?? 'node-id',
		name: overrides.name ?? 'Test Node',
		config: {},
		update: () => ({}) as NodeInstance<string, string, unknown>,
		then: () => ({}) as NodeChain,
		to: () => ({}) as NodeChain,
		input: () => ({ node: {} as NodeInstance<string, string, unknown>, inputIndex: 0 }),
		output: () => ({}) as NodeChain,
		onError: () => ({}) as NodeChain,
		getConnections: () => [],
		...overrides,
	} as NodeInstance<string, string, unknown>;
}

// Helper to create a graph node
function createGraphNode(instance: NodeInstance<string, string, unknown>): GraphNode {
	return {
		instance,
		connections: new Map(),
	};
}

// Mock registry that doesn't handle any composites
function createMockRegistry(): PluginRegistry {
	return {
		isCompositeType: () => false,
		resolveCompositeHeadName: () => undefined,
	} as unknown as PluginRegistry;
}

describe('findMapKeyForNodeId', () => {
	it('returns the map key when node is found by ID', () => {
		const node = createNode({ id: 'abc-123', name: 'My Node' });
		const nodes = new Map<string, GraphNode>();
		nodes.set('custom-key', createGraphNode(node));

		const result = findMapKeyForNodeId('abc-123', nodes);

		expect(result).toBe('custom-key');
	});

	it('returns undefined when node ID is not found', () => {
		const node = createNode({ id: 'abc-123', name: 'My Node' });
		const nodes = new Map<string, GraphNode>();
		nodes.set('custom-key', createGraphNode(node));

		const result = findMapKeyForNodeId('not-found', nodes);

		expect(result).toBeUndefined();
	});

	it('searches through all nodes', () => {
		const node1 = createNode({ id: 'id-1', name: 'Node 1' });
		const node2 = createNode({ id: 'id-2', name: 'Node 2' });
		const node3 = createNode({ id: 'id-3', name: 'Node 3' });
		const nodes = new Map<string, GraphNode>();
		nodes.set('key-1', createGraphNode(node1));
		nodes.set('key-2', createGraphNode(node2));
		nodes.set('key-3', createGraphNode(node3));

		expect(findMapKeyForNodeId('id-1', nodes)).toBe('key-1');
		expect(findMapKeyForNodeId('id-2', nodes)).toBe('key-2');
		expect(findMapKeyForNodeId('id-3', nodes)).toBe('key-3');
	});
});

describe('resolveTargetNodeName', () => {
	it('returns undefined for null target', () => {
		const nodes = new Map<string, GraphNode>();
		const registry = createMockRegistry();

		const result = resolveTargetNodeName(null, nodes, registry);

		expect(result).toBeUndefined();
	});

	it('returns undefined for non-object target', () => {
		const nodes = new Map<string, GraphNode>();
		const registry = createMockRegistry();

		expect(resolveTargetNodeName('string', nodes, registry)).toBeUndefined();
		expect(resolveTargetNodeName(123, nodes, registry)).toBeUndefined();
		expect(resolveTargetNodeName(undefined, nodes, registry)).toBeUndefined();
	});

	it('resolves regular NodeInstance to its name', () => {
		const targetNode = createNode({ id: 'target-id', name: 'Target Node' });
		const nodes = new Map<string, GraphNode>();
		nodes.set('Target Node', createGraphNode(targetNode));
		const registry = createMockRegistry();

		const result = resolveTargetNodeName(targetNode, nodes, registry);

		expect(result).toBe('Target Node');
	});

	it('resolves auto-renamed node to its actual map key', () => {
		const targetNode = createNode({ id: 'target-id', name: 'Process' });
		const nodes = new Map<string, GraphNode>();
		// Node was auto-renamed from "Process" to "Process 1"
		nodes.set('Process 1', createGraphNode(targetNode));
		const registry = createMockRegistry();

		const result = resolveTargetNodeName(targetNode, nodes, registry);

		expect(result).toBe('Process 1');
	});

	it('uses nameMapping when provided', () => {
		const targetNode = createNode({ id: 'target-id', name: 'Original' });
		const nodes = new Map<string, GraphNode>();
		const registry = createMockRegistry();
		const nameMapping = new Map<string, string>();
		nameMapping.set('target-id', 'Renamed Key');

		const result = resolveTargetNodeName(targetNode, nodes, registry, nameMapping);

		expect(result).toBe('Renamed Key');
	});

	it('resolves NodeChain to head node name', () => {
		const headNode = createNode({ id: 'head-id', name: 'Head Node' });
		const chain = {
			_isChain: true, // Required for isNodeChain() type guard
			head: headNode,
			tail: headNode,
			allNodes: [headNode],
			getConnections: () => [],
			then: () => ({}) as NodeChain,
			to: () => ({}) as NodeChain,
			onError: () => ({}) as NodeChain,
		} as unknown as NodeChain;
		const nodes = new Map<string, GraphNode>();
		nodes.set('Head Node', createGraphNode(headNode));
		const registry = createMockRegistry();

		const result = resolveTargetNodeName(chain, nodes, registry);

		expect(result).toBe('Head Node');
	});

	it('delegates to registry for composite resolution', () => {
		const composite = { someComposite: true };
		const nodes = new Map<string, GraphNode>();
		const registry = {
			isCompositeType: () => false,
			resolveCompositeHeadName: (target: unknown) => {
				if (target === composite) return 'Composite Head';
				return undefined;
			},
		} as unknown as PluginRegistry;

		const result = resolveTargetNodeName(composite, nodes, registry);

		expect(result).toBe('Composite Head');
	});
});
