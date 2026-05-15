import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref, shallowReactive, type ComputedRef } from 'vue';
import { mock } from 'vitest-mock-extended';
import { NodeConnectionTypes, type INodeTypeDescription, type Workflow } from 'n8n-workflow';
import { createTestNode, mockNodeTypeDescription } from '@/__tests__/mocks';
import type { INodeUi } from '@/Interface';
import type { CanvasConnectionPort } from '@/features/workflows/canvas/canvas.types';
import { createEventHook } from '@vueuse/core';
import {
	useWorkflowDocumentRenderData,
	type WorkflowDocumentRenderDataDeps,
} from './useWorkflowDocumentRenderData';
import { CHANGE_ACTION } from './types';
import type { NodesChangeEvent } from './useWorkflowDocumentNodes';

function createNode(overrides: Partial<INodeUi> = {}): INodeUi {
	return createTestNode({ name: 'Test Node', ...overrides }) as INodeUi;
}

function createNodeTypeDescription(
	overrides: Partial<INodeTypeDescription> = {},
): INodeTypeDescription {
	return mockNodeTypeDescription({
		name: 'test.node',
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		...overrides,
	});
}

function createWorkflowObjectForNodes(nodes: INodeUi[]) {
	const byName = new Map(nodes.map((n) => [n.name, n]));
	return mock<Workflow>({
		getNode: (name: string) => byName.get(name) ?? null,
	});
}

function setupDeps(options: {
	nodes: INodeUi[];
	nodeType?: INodeTypeDescription | null;
	getNodeType?: WorkflowDocumentRenderDataDeps['getNodeType'];
	getCommunityNodeType?: WorkflowDocumentRenderDataDeps['getCommunityNodeType'];
}) {
	const nodesRef = ref(options.nodes);
	const byId = new Map(options.nodes.map((n) => [n.id, n]));
	const onNodesChangeHook = createEventHook<NodesChangeEvent>();
	const nodeType = options.nodeType ?? createNodeTypeDescription();

	const nodeInputsByNodeId = shallowReactive(
		new Map<string, ComputedRef<CanvasConnectionPort[]>>(),
	);
	const nodeOutputsByNodeId = shallowReactive(
		new Map<string, ComputedRef<CanvasConnectionPort[]>>(),
	);

	const deps: WorkflowDocumentRenderDataDeps = {
		nodes: nodesRef as unknown as WorkflowDocumentRenderDataDeps['nodes'],
		getNodeById: (id) => byId.get(id),
		workflowObject: ref(
			createWorkflowObjectForNodes(options.nodes),
		) as unknown as WorkflowDocumentRenderDataDeps['workflowObject'],
		getNodeType: options.getNodeType ?? vi.fn().mockReturnValue(nodeType),
		getCommunityNodeType: options.getCommunityNodeType ?? vi.fn().mockReturnValue(undefined),
		onNodesChange: onNodesChangeHook.on,
		nodeInputsByNodeId,
		nodeOutputsByNodeId,
	};

	function addNodeToIndex(node: INodeUi) {
		byId.set(node.id, node);
	}
	function removeNodeFromIndex(id: string) {
		byId.delete(id);
	}

	return {
		deps,
		triggerChange: onNodesChangeHook.trigger,
		addNodeToIndex,
		removeNodeFromIndex,
		nodeInputsByNodeId,
		nodeOutputsByNodeId,
	};
}

describe('useWorkflowDocumentRenderData', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('initial reconciliation', () => {
		it('seeds entries for nodes present at construction time', () => {
			const nodeA = createNode({ name: 'A', id: 'a' });
			const nodeB = createNode({ name: 'B', id: 'b' });

			const { deps, nodeInputsByNodeId, nodeOutputsByNodeId } = setupDeps({
				nodes: [nodeA, nodeB],
			});
			useWorkflowDocumentRenderData(deps);

			expect(nodeInputsByNodeId.size).toBe(2);
			expect(nodeOutputsByNodeId.size).toBe(2);
			expect(nodeInputsByNodeId.has('a')).toBe(true);
			expect(nodeInputsByNodeId.has('b')).toBe(true);
		});

		it('returns empty maps when starting with no nodes', () => {
			const { deps, nodeInputsByNodeId, nodeOutputsByNodeId } = setupDeps({ nodes: [] });
			useWorkflowDocumentRenderData(deps);

			expect(nodeInputsByNodeId.size).toBe(0);
			expect(nodeOutputsByNodeId.size).toBe(0);
		});

		it('exposes the same map references via the render field', () => {
			const { deps, nodeInputsByNodeId, nodeOutputsByNodeId } = setupDeps({ nodes: [] });
			const { render } = useWorkflowDocumentRenderData(deps);

			expect(render.nodeInputsByNodeId).toBe(nodeInputsByNodeId);
			expect(render.nodeOutputsByNodeId).toBe(nodeOutputsByNodeId);
		});
	});

	describe('ADD event', () => {
		it('adds an entry to both input and output maps', async () => {
			const initialNode = createNode({ name: 'A', id: 'a' });
			const { deps, triggerChange, addNodeToIndex, nodeInputsByNodeId, nodeOutputsByNodeId } =
				setupDeps({ nodes: [initialNode] });
			useWorkflowDocumentRenderData(deps);

			const newNode = createNode({ name: 'B', id: 'b' });
			addNodeToIndex(newNode);
			await triggerChange({
				action: CHANGE_ACTION.ADD,
				payload: { node: newNode },
			});

			expect(nodeInputsByNodeId.has('b')).toBe(true);
			expect(nodeOutputsByNodeId.has('b')).toBe(true);
		});

		it('does not duplicate an existing entry', async () => {
			const nodeA = createNode({ name: 'A', id: 'a' });
			const { deps, triggerChange, nodeInputsByNodeId } = setupDeps({ nodes: [nodeA] });
			useWorkflowDocumentRenderData(deps);

			const originalInputs = nodeInputsByNodeId.get('a');
			await triggerChange({
				action: CHANGE_ACTION.ADD,
				payload: { node: nodeA },
			});

			expect(nodeInputsByNodeId.size).toBe(1);
			expect(nodeInputsByNodeId.get('a')).toBe(originalInputs);
		});
	});

	describe('DELETE event', () => {
		it('removes the specific entry when id is provided', async () => {
			const nodeA = createNode({ name: 'A', id: 'a' });
			const nodeB = createNode({ name: 'B', id: 'b' });
			const { deps, triggerChange, removeNodeFromIndex, nodeInputsByNodeId, nodeOutputsByNodeId } =
				setupDeps({ nodes: [nodeA, nodeB] });
			useWorkflowDocumentRenderData(deps);

			removeNodeFromIndex('a');
			await triggerChange({
				action: CHANGE_ACTION.DELETE,
				payload: { id: 'a', name: 'A' },
			});

			expect(nodeInputsByNodeId.has('a')).toBe(false);
			expect(nodeOutputsByNodeId.has('a')).toBe(false);
			expect(nodeInputsByNodeId.has('b')).toBe(true);
			expect(nodeOutputsByNodeId.has('b')).toBe(true);
		});

		it('clears all entries when payload has no id (removeAllNodes case)', async () => {
			const nodeA = createNode({ name: 'A', id: 'a' });
			const nodeB = createNode({ name: 'B', id: 'b' });
			const { deps, triggerChange, nodeInputsByNodeId, nodeOutputsByNodeId } = setupDeps({
				nodes: [nodeA, nodeB],
			});
			useWorkflowDocumentRenderData(deps);

			await triggerChange({
				action: CHANGE_ACTION.DELETE,
				payload: { id: '', name: '' },
			});

			expect(nodeInputsByNodeId.size).toBe(0);
			expect(nodeOutputsByNodeId.size).toBe(0);
		});
	});

	describe('SET event', () => {
		it('reconciles entries: adds new ids, removes missing ones', async () => {
			const nodeA = createNode({ name: 'A', id: 'a' });
			const nodeB = createNode({ name: 'B', id: 'b' });
			const { deps, triggerChange, addNodeToIndex, removeNodeFromIndex, nodeInputsByNodeId } =
				setupDeps({ nodes: [nodeA, nodeB] });
			useWorkflowDocumentRenderData(deps);

			const nodeC = createNode({ name: 'C', id: 'c' });
			removeNodeFromIndex('a');
			addNodeToIndex(nodeC);

			await triggerChange({
				action: CHANGE_ACTION.SET,
				payload: { nodeIds: ['b', 'c'] },
			});

			expect(nodeInputsByNodeId.has('a')).toBe(false);
			expect(nodeInputsByNodeId.has('b')).toBe(true);
			expect(nodeInputsByNodeId.has('c')).toBe(true);
		});

		it('handles SET with empty array (clears all entries)', async () => {
			const nodeA = createNode({ name: 'A', id: 'a' });
			const { deps, triggerChange, nodeInputsByNodeId, nodeOutputsByNodeId } = setupDeps({
				nodes: [nodeA],
			});
			useWorkflowDocumentRenderData(deps);

			await triggerChange({
				action: CHANGE_ACTION.SET,
				payload: { nodeIds: [] },
			});

			expect(nodeInputsByNodeId.size).toBe(0);
			expect(nodeOutputsByNodeId.size).toBe(0);
		});
	});

	describe('port computation', () => {
		it('returns empty array when node cannot be found', () => {
			const nodeA = createNode({ name: 'A', id: 'a' });
			const { deps, nodeInputsByNodeId, nodeOutputsByNodeId } = setupDeps({
				nodes: [nodeA],
				getNodeType: vi.fn().mockReturnValue(createNodeTypeDescription()),
			});
			// Override getNodeById to simulate node not being indexed
			const customDeps: WorkflowDocumentRenderDataDeps = {
				...deps,
				getNodeById: () => undefined,
			};
			useWorkflowDocumentRenderData(customDeps);

			expect(nodeInputsByNodeId.get('a')?.value).toEqual([]);
			expect(nodeOutputsByNodeId.get('a')?.value).toEqual([]);
		});

		it('returns empty array when node type is not resolved', () => {
			const nodeA = createNode({ name: 'A', id: 'a' });
			const { deps, nodeInputsByNodeId, nodeOutputsByNodeId } = setupDeps({
				nodes: [nodeA],
				getNodeType: vi.fn().mockReturnValue(null),
				getCommunityNodeType: vi.fn().mockReturnValue(undefined),
			});
			useWorkflowDocumentRenderData(deps);

			expect(nodeInputsByNodeId.get('a')?.value).toEqual([]);
			expect(nodeOutputsByNodeId.get('a')?.value).toEqual([]);
		});

		it('falls back to communityNodeType.nodeDescription when getNodeType returns null', () => {
			const nodeA = createNode({ name: 'A', id: 'a', type: 'community.foo' });
			const communityDescription = createNodeTypeDescription({ name: 'community.foo' });
			const { deps, nodeInputsByNodeId } = setupDeps({
				nodes: [nodeA],
				getNodeType: vi.fn().mockReturnValue(null),
				getCommunityNodeType: vi.fn().mockReturnValue({ nodeDescription: communityDescription }),
			});
			useWorkflowDocumentRenderData(deps);

			const inputs = nodeInputsByNodeId.get('a')?.value;
			expect(inputs).toHaveLength(1);
			expect(inputs?.[0].type).toBe(NodeConnectionTypes.Main);
		});

		it('maps node type inputs/outputs through canvas port mapper', () => {
			const nodeA = createNode({ name: 'A', id: 'a' });
			const nodeType = createNodeTypeDescription({
				inputs: [NodeConnectionTypes.Main, NodeConnectionTypes.AiTool],
				outputs: [NodeConnectionTypes.Main],
			});
			const { deps, nodeInputsByNodeId, nodeOutputsByNodeId } = setupDeps({
				nodes: [nodeA],
				nodeType,
			});
			useWorkflowDocumentRenderData(deps);

			const inputs = nodeInputsByNodeId.get('a')?.value;
			const outputs = nodeOutputsByNodeId.get('a')?.value;

			expect(inputs).toHaveLength(2);
			expect(inputs?.map((p) => p.type)).toEqual([
				NodeConnectionTypes.Main,
				NodeConnectionTypes.AiTool,
			]);
			expect(outputs).toHaveLength(1);
			expect(outputs?.[0].type).toBe(NodeConnectionTypes.Main);
		});
	});

	describe('removal lifecycle', () => {
		it('re-adding a removed node creates a fresh computed entry', async () => {
			const nodeA = createNode({ name: 'A', id: 'a' });
			const { deps, triggerChange, removeNodeFromIndex, addNodeToIndex, nodeInputsByNodeId } =
				setupDeps({ nodes: [nodeA] });
			useWorkflowDocumentRenderData(deps);
			const originalInputs = nodeInputsByNodeId.get('a');

			removeNodeFromIndex('a');
			await triggerChange({
				action: CHANGE_ACTION.DELETE,
				payload: { id: 'a', name: 'A' },
			});
			expect(nodeInputsByNodeId.has('a')).toBe(false);

			addNodeToIndex(nodeA);
			await triggerChange({
				action: CHANGE_ACTION.ADD,
				payload: { node: nodeA },
			});

			expect(nodeInputsByNodeId.has('a')).toBe(true);
			expect(nodeInputsByNodeId.get('a')).not.toBe(originalInputs);
		});
	});
});
