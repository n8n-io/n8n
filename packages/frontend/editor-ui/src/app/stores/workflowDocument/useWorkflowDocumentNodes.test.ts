/**
 * Integration tests for useWorkflowDocumentNodes.
 *
 * These tests use a real Pinia store (createPinia, not createTestingPinia) so
 * that every write goes through the actual workflowsStore and every read comes
 * back through the public API. This "round-trip" pattern (write → read back →
 * assert) is intentional:
 *
 *  - It catches regressions when consumers migrate from workflowsStore to
 *    workflowDocumentStore — the round-trip proves both paths produce the same
 *    result.
 *  - It survives internal refactors. When the internals change (e.g. owning
 *    its own refs instead of delegating), these tests stay unchanged because
 *    they only exercise the public contract.
 *  - Delegation-style tests (expect(store.method).toHaveBeenCalled()) would
 *    need to be rewritten every time internals change; round-trips do not.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { createTestNode } from '@/__tests__/mocks';
import type { INodeUi } from '@/Interface';
import {
	useWorkflowDocumentNodes,
	type WorkflowDocumentNodesDeps,
} from './useWorkflowDocumentNodes';

function createNode(overrides: Partial<INodeUi> = {}): INodeUi {
	return createTestNode({ name: 'Test Node', ...overrides }) as INodeUi;
}

function createDeps(overrides: Partial<WorkflowDocumentNodesDeps> = {}): WorkflowDocumentNodesDeps {
	return {
		getNodeType: vi.fn().mockReturnValue(null),
		...overrides,
	};
}

describe('useWorkflowDocumentNodes', () => {
	let workflowsStore: ReturnType<typeof useWorkflowsStore>;
	let deps: WorkflowDocumentNodesDeps;

	beforeEach(() => {
		setActivePinia(createPinia());
		workflowsStore = useWorkflowsStore();
		deps = createDeps();
	});

	describe('round-trip: setNodes → read', () => {
		it('nodes set via setNodes are readable via allNodes', () => {
			const nodeA = createNode({ name: 'A' });
			const nodeB = createNode({ name: 'B' });

			const workflowDocumentNodes = useWorkflowDocumentNodes(deps);
			workflowDocumentNodes.setNodes([nodeA, nodeB]);

			expect(workflowDocumentNodes.allNodes.value).toHaveLength(2);
			expect(workflowDocumentNodes.allNodes.value.map((n) => n.name)).toEqual(['A', 'B']);
		});

		it('nodes set via setNodes are readable via getNodeById', () => {
			const node = createNode({ name: 'A' });

			const workflowDocumentNodes = useWorkflowDocumentNodes(deps);
			workflowDocumentNodes.setNodes([node]);

			expect(workflowDocumentNodes.getNodeById(node.id)).toBeDefined();
			expect(workflowDocumentNodes.getNodeById(node.id)?.name).toBe('A');
		});

		it('nodes set via setNodes are readable via getNodeByName', () => {
			const node = createNode({ name: 'MyNode' });

			const workflowDocumentNodes = useWorkflowDocumentNodes(deps);
			workflowDocumentNodes.setNodes([node]);

			expect(workflowDocumentNodes.getNodeByName('MyNode')).toBeDefined();
			expect(workflowDocumentNodes.getNodeByName('MyNode')?.id).toBe(node.id);
		});

		it('nodes set via setNodes are readable via getNodes', () => {
			const workflowDocumentNodes = useWorkflowDocumentNodes(deps);
			workflowDocumentNodes.setNodes([createNode({ name: 'A' }), createNode({ name: 'B' })]);

			const nodes = workflowDocumentNodes.getNodes();
			expect(nodes).toHaveLength(2);
		});

		it('nodes set via setNodes are readable via nodesByName', () => {
			const node = createNode({ name: 'Alpha' });

			const workflowDocumentNodes = useWorkflowDocumentNodes(deps);
			workflowDocumentNodes.setNodes([node]);

			expect(workflowDocumentNodes.nodesByName.value).toHaveProperty('Alpha');
			expect(workflowDocumentNodes.nodesByName.value.Alpha.id).toBe(node.id);
		});

		it('canvasNames reflects set nodes', () => {
			const workflowDocumentNodes = useWorkflowDocumentNodes(deps);
			workflowDocumentNodes.setNodes([createNode({ name: 'X' }), createNode({ name: 'Y' })]);

			expect(workflowDocumentNodes.canvasNames.value).toEqual(new Set(['X', 'Y']));
		});

		it('getNodesByIds returns matching nodes', () => {
			const nodeA = createNode({ name: 'A' });
			const nodeB = createNode({ name: 'B' });

			const workflowDocumentNodes = useWorkflowDocumentNodes(deps);
			workflowDocumentNodes.setNodes([nodeA, nodeB]);

			const result = workflowDocumentNodes.getNodesByIds([nodeA.id]);
			expect(result).toHaveLength(1);
			expect(result[0].name).toBe('A');
		});

		it('findNodeByPartialId matches partial id', () => {
			const node = createNode({ name: 'FindMe' });

			const workflowDocumentNodes = useWorkflowDocumentNodes(deps);
			workflowDocumentNodes.setNodes([node]);

			// Use first 8 chars of UUID as partial
			const partial = node.id.slice(0, 8);
			const found = workflowDocumentNodes.findNodeByPartialId(partial);
			expect(found?.name).toBe('FindMe');
		});
	});

	describe('round-trip: addNode → read', () => {
		it('node added via addNode is readable via allNodes', () => {
			const node = createNode({ name: 'Added' });

			const workflowDocumentNodes = useWorkflowDocumentNodes(deps);
			workflowDocumentNodes.addNode(node);

			expect(workflowDocumentNodes.allNodes.value).toHaveLength(1);
			expect(workflowDocumentNodes.allNodes.value[0].name).toBe('Added');
		});

		it('node added via addNode is readable via getNodeById', () => {
			const node = createNode({ name: 'Added' });

			const workflowDocumentNodes = useWorkflowDocumentNodes(deps);
			workflowDocumentNodes.addNode(node);

			expect(workflowDocumentNodes.getNodeById(node.id)?.name).toBe('Added');
		});
	});

	describe('round-trip: removeNode → read', () => {
		it('removeNode removes node from allNodes', () => {
			const nodeA = createNode({ name: 'A' });
			const nodeB = createNode({ name: 'B' });

			const workflowDocumentNodes = useWorkflowDocumentNodes(deps);
			workflowDocumentNodes.setNodes([nodeA, nodeB]);
			workflowDocumentNodes.removeNode(nodeA);

			expect(workflowDocumentNodes.allNodes.value).toHaveLength(1);
			expect(workflowDocumentNodes.allNodes.value[0].name).toBe('B');
		});

		it('removeNodeById removes node from allNodes', () => {
			const node = createNode({ name: 'ToRemove' });

			const workflowDocumentNodes = useWorkflowDocumentNodes(deps);
			workflowDocumentNodes.setNodes([node]);
			workflowDocumentNodes.removeNodeById(node.id);

			expect(workflowDocumentNodes.allNodes.value).toHaveLength(0);
		});

		it('removeAllNodes empties all nodes', () => {
			const workflowDocumentNodes = useWorkflowDocumentNodes(deps);
			workflowDocumentNodes.setNodes([createNode({ name: 'A' }), createNode({ name: 'B' })]);

			workflowDocumentNodes.removeAllNodes();

			expect(workflowDocumentNodes.allNodes.value).toHaveLength(0);
		});

		it('removeAllNodes clears nodeMetadata', () => {
			const workflowDocumentNodes = useWorkflowDocumentNodes(deps);
			workflowDocumentNodes.setNodes([createNode({ name: 'A' })]);

			expect(workflowsStore.nodeMetadata).toHaveProperty('A');

			workflowDocumentNodes.removeAllNodes();

			expect(workflowsStore.nodeMetadata).toEqual({});
		});
	});

	describe('round-trip: mutations → read', () => {
		it('setNodeParameters updates parameters readable via getNodeByName', () => {
			const node = createNode({ name: 'Target', parameters: { old: 'value' } });

			const workflowDocumentNodes = useWorkflowDocumentNodes(deps);
			workflowDocumentNodes.setNodes([node]);
			workflowDocumentNodes.setNodeParameters({ name: 'Target', value: { new: 'value' } });

			expect(workflowDocumentNodes.getNodeByName('Target')?.parameters).toEqual({ new: 'value' });
		});

		it('setNodeParameters with append merges parameters', () => {
			const node = createNode({ name: 'Target', parameters: { existing: 'keep' } });

			const workflowDocumentNodes = useWorkflowDocumentNodes(deps);
			workflowDocumentNodes.setNodes([node]);
			workflowDocumentNodes.setNodeParameters({ name: 'Target', value: { added: 'new' } }, true);

			expect(workflowDocumentNodes.getNodeByName('Target')?.parameters).toEqual({
				existing: 'keep',
				added: 'new',
			});
		});

		it('setNodeParameters throws when node not found', () => {
			const workflowDocumentNodes = useWorkflowDocumentNodes(deps);

			expect(() =>
				workflowDocumentNodes.setNodeParameters({ name: 'NonExistent', value: {} }),
			).toThrow('could not be found');
		});

		it('setNodeValue updates a property readable via getNodeByName', () => {
			const node = createNode({ name: 'Target' });

			const workflowDocumentNodes = useWorkflowDocumentNodes(deps);
			workflowDocumentNodes.setNodes([node]);
			workflowDocumentNodes.setNodeValue({ name: 'Target', key: 'disabled', value: true });

			expect(workflowDocumentNodes.getNodeByName('Target')?.disabled).toBe(true);
		});

		it('setNodeValue throws when node not found', () => {
			const workflowDocumentNodes = useWorkflowDocumentNodes(deps);

			expect(() =>
				workflowDocumentNodes.setNodeValue({ name: 'NonExistent', key: 'disabled', value: true }),
			).toThrow('could not be found');
		});

		it('setNodePositionById updates position readable via getNodeById', () => {
			const node = createNode({ name: 'Mover' });

			const workflowDocumentNodes = useWorkflowDocumentNodes(deps);
			workflowDocumentNodes.setNodes([node]);
			workflowDocumentNodes.setNodePositionById(node.id, [300, 400]);

			expect(workflowDocumentNodes.getNodeById(node.id)?.position).toEqual([300, 400]);
		});

		it('updateNodeById updates node readable via getNodeById', () => {
			const node = createNode({ name: 'Target' });

			const workflowDocumentNodes = useWorkflowDocumentNodes(deps);
			workflowDocumentNodes.setNodes([node]);
			const result = workflowDocumentNodes.updateNodeById(node.id, { disabled: true });

			expect(result).toBe(true);
			expect(workflowDocumentNodes.getNodeById(node.id)?.disabled).toBe(true);
		});

		it('updateNodeById returns false when node not found', () => {
			const workflowDocumentNodes = useWorkflowDocumentNodes(deps);

			expect(workflowDocumentNodes.updateNodeById('nonexistent', { disabled: true })).toBe(false);
		});

		it('updateNodeProperties updates properties readable via getNodeByName', () => {
			const node = createNode({ name: 'Target' });

			const workflowDocumentNodes = useWorkflowDocumentNodes(deps);
			workflowDocumentNodes.setNodes([node]);
			workflowDocumentNodes.updateNodeProperties({
				name: 'Target',
				properties: { disabled: true },
			});

			expect(workflowDocumentNodes.getNodeByName('Target')?.disabled).toBe(true);
		});

		it('setNodeIssue adds issue readable via getNodeByName', () => {
			const node = createNode({ name: 'Target' });

			const workflowDocumentNodes = useWorkflowDocumentNodes(deps);
			workflowDocumentNodes.setNodes([node]);
			workflowDocumentNodes.setNodeIssue({
				node: 'Target',
				type: 'parameters',
				value: { param: ['Missing required parameter'] },
			});

			expect(workflowDocumentNodes.getNodeByName('Target')?.issues).toEqual({
				parameters: { param: ['Missing required parameter'] },
			});
		});

		it('setNodeIssue removes issue readable via getNodeByName', () => {
			const node = createNode({ name: 'Target' });
			node.issues = {
				parameters: { param: ['Missing'] },
				credentials: { cred: ['Invalid'] },
			};

			const workflowDocumentNodes = useWorkflowDocumentNodes(deps);
			workflowDocumentNodes.setNodes([node]);
			workflowDocumentNodes.setNodeIssue({ node: 'Target', type: 'parameters', value: null });

			const issues = workflowDocumentNodes.getNodeByName('Target')?.issues;
			expect(issues).toEqual({ credentials: { cred: ['Invalid'] } });
			expect(issues).not.toHaveProperty('parameters');
		});

		it('resetAllNodesIssues clears issues on all nodes', () => {
			const nodeA = createNode({ name: 'A', issues: { parameters: { x: ['err'] } } });
			const nodeB = createNode({ name: 'B', issues: { credentials: { y: ['err'] } } });

			const workflowDocumentNodes = useWorkflowDocumentNodes(deps);
			workflowDocumentNodes.setNodes([nodeA, nodeB]);
			const result = workflowDocumentNodes.resetAllNodesIssues();

			expect(result).toBe(true);
			expect(workflowDocumentNodes.getNodeByName('A')?.issues).toBeUndefined();
			expect(workflowDocumentNodes.getNodeByName('B')?.issues).toBeUndefined();
		});

		it('setLastNodeParameters does nothing when node type is not found', () => {
			const node = createNode({
				name: 'Target',
				type: 'n8n-nodes-base.set',
				parameters: { old: 'value' },
			});

			const workflowDocumentNodes = useWorkflowDocumentNodes(deps);
			workflowDocumentNodes.setNodes([node]);
			workflowDocumentNodes.setLastNodeParameters({
				key: 'n8n-nodes-base.set',
				name: '',
				value: { new: 'value' },
			});

			// getNodeType returns null (default mock), so parameters should not change
			expect(workflowDocumentNodes.getNodeByName('Target')?.parameters).toEqual({ old: 'value' });
		});

		it('setLastNodeParameters finds latest node by type and sets parameters', () => {
			const node = createNode({
				name: 'Target',
				type: 'n8n-nodes-base.set',
				parameters: { existing: 'keep' },
			});

			const mockNodeType = {
				properties: [{ displayName: 'Value', name: 'value', type: 'string' as const, default: '' }],
			};

			const customDeps = createDeps({
				getNodeType: vi.fn().mockReturnValue(mockNodeType),
			});

			const workflowDocumentNodes = useWorkflowDocumentNodes(customDeps);
			workflowDocumentNodes.setNodes([node]);
			workflowDocumentNodes.setLastNodeParameters({
				key: 'n8n-nodes-base.set',
				name: '',
				value: { value: 'hello' },
			});

			expect(customDeps.getNodeType).toHaveBeenCalledWith('n8n-nodes-base.set');
		});
	});

	describe('dirty tracking', () => {
		it('setNodeValue does not update parametersLastUpdatedAt for position changes', () => {
			const node = createNode({ name: 'Target' });

			const workflowDocumentNodes = useWorkflowDocumentNodes(deps);
			workflowDocumentNodes.setNodes([node]);

			const tsBefore = workflowsStore.nodeMetadata.Target.parametersLastUpdatedAt;
			workflowDocumentNodes.setNodeValue({ name: 'Target', key: 'position', value: [300, 400] });

			expect(workflowsStore.nodeMetadata.Target.parametersLastUpdatedAt).toBe(tsBefore);
		});

		it('setNodeValue updates parametersLastUpdatedAt for non-position changes', () => {
			const node = createNode({ name: 'Target' });

			const workflowDocumentNodes = useWorkflowDocumentNodes(deps);
			workflowDocumentNodes.setNodes([node]);

			workflowDocumentNodes.setNodeValue({ name: 'Target', key: 'disabled', value: true });

			expect(workflowsStore.nodeMetadata.Target.parametersLastUpdatedAt).toBeGreaterThan(0);
		});

		it('resetParametersLastUpdatedAt updates timestamp', () => {
			const node = createNode({ name: 'Target' });

			const workflowDocumentNodes = useWorkflowDocumentNodes(deps);
			workflowDocumentNodes.setNodes([node]);

			workflowDocumentNodes.resetParametersLastUpdatedAt('Target');

			expect(workflowsStore.nodeMetadata.Target.parametersLastUpdatedAt).toBeGreaterThan(0);
		});

		it('resetParametersLastUpdatedAt creates metadata entry if missing', () => {
			const workflowDocumentNodes = useWorkflowDocumentNodes(deps);

			workflowDocumentNodes.resetParametersLastUpdatedAt('NewNode');

			expect(workflowsStore.nodeMetadata.NewNode).toBeDefined();
			expect(workflowsStore.nodeMetadata.NewNode.parametersLastUpdatedAt).toBeGreaterThan(0);
		});
	});

	describe('events', () => {
		it('setNodes does not fire onNodesChange (initialization path)', () => {
			const hookSpy = vi.fn();

			const workflowDocumentNodes = useWorkflowDocumentNodes(deps);
			workflowDocumentNodes.onNodesChange(hookSpy);
			workflowDocumentNodes.setNodes([createNode()]);

			expect(hookSpy).not.toHaveBeenCalled();
		});

		it('addNode fires onNodesChange with add action', () => {
			const hookSpy = vi.fn();
			const node = createNode();

			const workflowDocumentNodes = useWorkflowDocumentNodes(deps);
			workflowDocumentNodes.onNodesChange(hookSpy);
			workflowDocumentNodes.addNode(node);

			expect(hookSpy).toHaveBeenCalledWith({
				action: 'add',
				payload: { node },
			});
		});

		it('removeNode fires onNodesChange with delete action', () => {
			const hookSpy = vi.fn();
			const node = createNode({ name: 'Target' });

			const workflowDocumentNodes = useWorkflowDocumentNodes(deps);
			workflowDocumentNodes.setNodes([node]);
			workflowDocumentNodes.onNodesChange(hookSpy);
			workflowDocumentNodes.removeNode(node);

			expect(hookSpy).toHaveBeenCalledWith({
				action: 'delete',
				payload: { name: 'Target', id: node.id },
			});
		});

		it('removeNodeById fires onNodesChange with delete action', () => {
			const hookSpy = vi.fn();
			const node = createNode({ name: 'Target' });

			const workflowDocumentNodes = useWorkflowDocumentNodes(deps);
			workflowDocumentNodes.setNodes([node]);
			workflowDocumentNodes.onNodesChange(hookSpy);
			workflowDocumentNodes.removeNodeById(node.id);

			expect(hookSpy).toHaveBeenCalledWith({
				action: 'delete',
				payload: { name: 'Target', id: node.id },
			});
		});

		it('addNode fires onStateDirty', () => {
			const dirtySpy = vi.fn();

			const workflowDocumentNodes = useWorkflowDocumentNodes(deps);
			workflowDocumentNodes.onStateDirty(dirtySpy);
			workflowDocumentNodes.addNode(createNode());

			expect(dirtySpy).toHaveBeenCalledOnce();
		});

		it('removeNode fires onStateDirty', () => {
			const dirtySpy = vi.fn();
			const node = createNode();

			const workflowDocumentNodes = useWorkflowDocumentNodes(deps);
			workflowDocumentNodes.setNodes([node]);
			workflowDocumentNodes.onStateDirty(dirtySpy);
			workflowDocumentNodes.removeNode(node);

			expect(dirtySpy).toHaveBeenCalledOnce();
		});

		it('removeNodeById fires onStateDirty', () => {
			const dirtySpy = vi.fn();
			const node = createNode();

			const workflowDocumentNodes = useWorkflowDocumentNodes(deps);
			workflowDocumentNodes.setNodes([node]);
			workflowDocumentNodes.onStateDirty(dirtySpy);
			workflowDocumentNodes.removeNodeById(node.id);

			expect(dirtySpy).toHaveBeenCalledOnce();
		});

		it('setNodes does not fire onStateDirty (initialization path)', () => {
			const dirtySpy = vi.fn();

			const workflowDocumentNodes = useWorkflowDocumentNodes(deps);
			workflowDocumentNodes.onStateDirty(dirtySpy);
			workflowDocumentNodes.setNodes([createNode()]);

			expect(dirtySpy).not.toHaveBeenCalled();
		});

		it('setNodeParameters fires onStateDirty when parameters change', () => {
			const dirtySpy = vi.fn();
			const node = createNode({ name: 'Target', parameters: { old: 'value' } });

			const workflowDocumentNodes = useWorkflowDocumentNodes(deps);
			workflowDocumentNodes.setNodes([node]);
			workflowDocumentNodes.onStateDirty(dirtySpy);
			workflowDocumentNodes.setNodeParameters({ name: 'Target', value: { new: 'value' } });

			expect(dirtySpy).toHaveBeenCalledOnce();
		});

		it('setNodeValue fires onStateDirty when value changes', () => {
			const dirtySpy = vi.fn();
			const node = createNode({ name: 'Target' });

			const workflowDocumentNodes = useWorkflowDocumentNodes(deps);
			workflowDocumentNodes.setNodes([node]);
			workflowDocumentNodes.onStateDirty(dirtySpy);
			workflowDocumentNodes.setNodeValue({ name: 'Target', key: 'disabled', value: true });

			expect(dirtySpy).toHaveBeenCalledOnce();
		});

		it('removeAllNodes does not fire onStateDirty (initialization path)', () => {
			const dirtySpy = vi.fn();

			const workflowDocumentNodes = useWorkflowDocumentNodes(deps);
			workflowDocumentNodes.setNodes([createNode()]);
			workflowDocumentNodes.onStateDirty(dirtySpy);
			workflowDocumentNodes.removeAllNodes();

			expect(dirtySpy).not.toHaveBeenCalled();
		});

		it('removeNodeById uses empty name when node not found', () => {
			const hookSpy = vi.fn();

			const workflowDocumentNodes = useWorkflowDocumentNodes(deps);
			workflowDocumentNodes.onNodesChange(hookSpy);
			workflowDocumentNodes.removeNodeById('nonexistent');

			expect(hookSpy).toHaveBeenCalledWith({
				action: 'delete',
				payload: { name: '', id: 'nonexistent' },
			});
		});
	});
});
