/**
 * Integration tests for the useWorkflowDocumentNodes facade.
 *
 * These tests use a real Pinia store (createPinia, not createTestingPinia) so
 * that every write goes through the actual workflowsStore and every read comes
 * back through the facade's public API. This "round-trip" pattern (write → read
 * back → assert) is intentional:
 *
 *  - It catches regressions when consumers migrate from workflowsStore to
 *    workflowDocumentStore — the round-trip proves both paths produce the same
 *    result.
 *  - It survives internal refactors. When the facade's internals change (e.g.
 *    owning its own refs instead of delegating), these tests stay unchanged
 *    because they only exercise the public contract.
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

			const facade = useWorkflowDocumentNodes(deps);
			facade.setNodes([nodeA, nodeB]);

			expect(facade.allNodes.value).toHaveLength(2);
			expect(facade.allNodes.value.map((n) => n.name)).toEqual(['A', 'B']);
		});

		it('nodes set via setNodes are readable via getNodeById', () => {
			const node = createNode({ name: 'A' });

			const facade = useWorkflowDocumentNodes(deps);
			facade.setNodes([node]);

			expect(facade.getNodeById(node.id)).toBeDefined();
			expect(facade.getNodeById(node.id)?.name).toBe('A');
		});

		it('nodes set via setNodes are readable via getNodeByName', () => {
			const node = createNode({ name: 'MyNode' });

			const facade = useWorkflowDocumentNodes(deps);
			facade.setNodes([node]);

			expect(facade.getNodeByName('MyNode')).toBeDefined();
			expect(facade.getNodeByName('MyNode')?.id).toBe(node.id);
		});

		it('nodes set via setNodes are readable via getNodes', () => {
			const facade = useWorkflowDocumentNodes(deps);
			facade.setNodes([createNode({ name: 'A' }), createNode({ name: 'B' })]);

			const nodes = facade.getNodes();
			expect(nodes).toHaveLength(2);
		});

		it('nodes set via setNodes are readable via nodesByName', () => {
			const node = createNode({ name: 'Alpha' });

			const facade = useWorkflowDocumentNodes(deps);
			facade.setNodes([node]);

			expect(facade.nodesByName.value).toHaveProperty('Alpha');
			expect(facade.nodesByName.value.Alpha.id).toBe(node.id);
		});

		it('canvasNames reflects set nodes', () => {
			const facade = useWorkflowDocumentNodes(deps);
			facade.setNodes([createNode({ name: 'X' }), createNode({ name: 'Y' })]);

			expect(facade.canvasNames.value).toEqual(new Set(['X', 'Y']));
		});

		it('getNodesByIds returns matching nodes', () => {
			const nodeA = createNode({ name: 'A' });
			const nodeB = createNode({ name: 'B' });

			const facade = useWorkflowDocumentNodes(deps);
			facade.setNodes([nodeA, nodeB]);

			const result = facade.getNodesByIds([nodeA.id]);
			expect(result).toHaveLength(1);
			expect(result[0].name).toBe('A');
		});

		it('findNodeByPartialId matches partial id', () => {
			const node = createNode({ name: 'FindMe' });

			const facade = useWorkflowDocumentNodes(deps);
			facade.setNodes([node]);

			// Use first 8 chars of UUID as partial
			const partial = node.id.slice(0, 8);
			const found = facade.findNodeByPartialId(partial);
			expect(found?.name).toBe('FindMe');
		});
	});

	describe('round-trip: addNode → read', () => {
		it('node added via addNode is readable via allNodes', () => {
			const node = createNode({ name: 'Added' });

			const facade = useWorkflowDocumentNodes(deps);
			facade.addNode(node);

			expect(facade.allNodes.value).toHaveLength(1);
			expect(facade.allNodes.value[0].name).toBe('Added');
		});

		it('node added via addNode is readable via getNodeById', () => {
			const node = createNode({ name: 'Added' });

			const facade = useWorkflowDocumentNodes(deps);
			facade.addNode(node);

			expect(facade.getNodeById(node.id)?.name).toBe('Added');
		});
	});

	describe('round-trip: removeNode → read', () => {
		it('removeNode removes node from allNodes', () => {
			const nodeA = createNode({ name: 'A' });
			const nodeB = createNode({ name: 'B' });

			const facade = useWorkflowDocumentNodes(deps);
			facade.setNodes([nodeA, nodeB]);
			facade.removeNode(nodeA);

			expect(facade.allNodes.value).toHaveLength(1);
			expect(facade.allNodes.value[0].name).toBe('B');
		});

		it('removeNodeById removes node from allNodes', () => {
			const node = createNode({ name: 'ToRemove' });

			const facade = useWorkflowDocumentNodes(deps);
			facade.setNodes([node]);
			facade.removeNodeById(node.id);

			expect(facade.allNodes.value).toHaveLength(0);
		});

		it('removeAllNodes empties all nodes', () => {
			const facade = useWorkflowDocumentNodes(deps);
			facade.setNodes([createNode({ name: 'A' }), createNode({ name: 'B' })]);

			facade.removeAllNodes({ setStateDirty: false, removePinData: false });

			expect(facade.allNodes.value).toHaveLength(0);
		});
	});

	describe('round-trip: mutations → read', () => {
		it('setNodeParameters updates parameters readable via getNodeByName', () => {
			const node = createNode({ name: 'Target', parameters: { old: 'value' } });

			const facade = useWorkflowDocumentNodes(deps);
			facade.setNodes([node]);
			facade.setNodeParameters({ name: 'Target', value: { new: 'value' } });

			expect(facade.getNodeByName('Target')?.parameters).toEqual({ new: 'value' });
		});

		it('setNodeParameters with append merges parameters', () => {
			const node = createNode({ name: 'Target', parameters: { existing: 'keep' } });

			const facade = useWorkflowDocumentNodes(deps);
			facade.setNodes([node]);
			facade.setNodeParameters({ name: 'Target', value: { added: 'new' } }, true);

			expect(facade.getNodeByName('Target')?.parameters).toEqual({
				existing: 'keep',
				added: 'new',
			});
		});

		it('setNodeParameters throws when node not found', () => {
			const facade = useWorkflowDocumentNodes(deps);

			expect(() => facade.setNodeParameters({ name: 'NonExistent', value: {} })).toThrow(
				'could not be found',
			);
		});

		it('setNodeValue updates a property readable via getNodeByName', () => {
			const node = createNode({ name: 'Target' });

			const facade = useWorkflowDocumentNodes(deps);
			facade.setNodes([node]);
			facade.setNodeValue({ name: 'Target', key: 'disabled', value: true });

			expect(facade.getNodeByName('Target')?.disabled).toBe(true);
		});

		it('setNodePositionById updates position readable via getNodeById', () => {
			const node = createNode({ name: 'Mover' });

			const facade = useWorkflowDocumentNodes(deps);
			facade.setNodes([node]);
			facade.setNodePositionById(node.id, [300, 400]);

			expect(facade.getNodeById(node.id)?.position).toEqual([300, 400]);
		});

		it('updateNodeById updates node readable via getNodeById', () => {
			const node = createNode({ name: 'Target' });

			const facade = useWorkflowDocumentNodes(deps);
			facade.setNodes([node]);
			const result = facade.updateNodeById(node.id, { disabled: true });

			expect(result).toBe(true);
			expect(facade.getNodeById(node.id)?.disabled).toBe(true);
		});

		it('updateNodeById returns false when node not found', () => {
			const facade = useWorkflowDocumentNodes(deps);

			expect(facade.updateNodeById('nonexistent', { disabled: true })).toBe(false);
		});

		it('updateNodeProperties updates properties readable via getNodeByName', () => {
			const node = createNode({ name: 'Target' });

			const facade = useWorkflowDocumentNodes(deps);
			facade.setNodes([node]);
			facade.updateNodeProperties({ name: 'Target', properties: { disabled: true } });

			expect(facade.getNodeByName('Target')?.disabled).toBe(true);
		});

		it('setNodeIssue adds issue readable via getNodeByName', () => {
			const node = createNode({ name: 'Target' });

			const facade = useWorkflowDocumentNodes(deps);
			facade.setNodes([node]);
			facade.setNodeIssue({
				node: 'Target',
				type: 'parameters',
				value: { param: ['Missing required parameter'] },
			});

			expect(facade.getNodeByName('Target')?.issues).toEqual({
				parameters: { param: ['Missing required parameter'] },
			});
		});

		it('setNodeIssue removes issue readable via getNodeByName', () => {
			const node = createNode({ name: 'Target' });
			node.issues = {
				parameters: { param: ['Missing'] },
				credentials: { cred: ['Invalid'] },
			};

			const facade = useWorkflowDocumentNodes(deps);
			facade.setNodes([node]);
			facade.setNodeIssue({ node: 'Target', type: 'parameters', value: null });

			const issues = facade.getNodeByName('Target')?.issues;
			expect(issues).toEqual({ credentials: { cred: ['Invalid'] } });
			expect(issues).not.toHaveProperty('parameters');
		});

		it('resetAllNodesIssues clears issues on all nodes', () => {
			const nodeA = createNode({ name: 'A', issues: { parameters: { x: ['err'] } } });
			const nodeB = createNode({ name: 'B', issues: { credentials: { y: ['err'] } } });

			const facade = useWorkflowDocumentNodes(deps);
			facade.setNodes([nodeA, nodeB]);
			const result = facade.resetAllNodesIssues();

			expect(result).toBe(true);
			expect(facade.getNodeByName('A')?.issues).toBeUndefined();
			expect(facade.getNodeByName('B')?.issues).toBeUndefined();
		});

		it('setLastNodeParameters does nothing when node type is not found', () => {
			const node = createNode({
				name: 'Target',
				type: 'n8n-nodes-base.set',
				parameters: { old: 'value' },
			});

			const facade = useWorkflowDocumentNodes(deps);
			facade.setNodes([node]);
			facade.setLastNodeParameters({
				key: 'n8n-nodes-base.set',
				name: '',
				value: { new: 'value' },
			});

			// getNodeType returns null (default mock), so parameters should not change
			expect(facade.getNodeByName('Target')?.parameters).toEqual({ old: 'value' });
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

			const facade = useWorkflowDocumentNodes(customDeps);
			facade.setNodes([node]);
			facade.setLastNodeParameters({
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

			const facade = useWorkflowDocumentNodes(deps);
			facade.setNodes([node]);

			const tsBefore = workflowsStore.nodeMetadata.Target.parametersLastUpdatedAt;
			facade.setNodeValue({ name: 'Target', key: 'position', value: [300, 400] });

			expect(workflowsStore.nodeMetadata.Target.parametersLastUpdatedAt).toBe(tsBefore);
		});

		it('setNodeValue updates parametersLastUpdatedAt for non-position changes', () => {
			const node = createNode({ name: 'Target' });

			const facade = useWorkflowDocumentNodes(deps);
			facade.setNodes([node]);

			facade.setNodeValue({ name: 'Target', key: 'disabled', value: true });

			expect(workflowsStore.nodeMetadata.Target.parametersLastUpdatedAt).toBeGreaterThan(0);
		});

		it('resetParametersLastUpdatedAt updates timestamp', () => {
			const node = createNode({ name: 'Target' });

			const facade = useWorkflowDocumentNodes(deps);
			facade.setNodes([node]);

			facade.resetParametersLastUpdatedAt('Target');

			expect(workflowsStore.nodeMetadata.Target.parametersLastUpdatedAt).toBeGreaterThan(0);
		});

		it('resetParametersLastUpdatedAt creates metadata entry if missing', () => {
			const facade = useWorkflowDocumentNodes(deps);

			facade.resetParametersLastUpdatedAt('NewNode');

			expect(workflowsStore.nodeMetadata.NewNode).toBeDefined();
			expect(workflowsStore.nodeMetadata.NewNode.parametersLastUpdatedAt).toBeGreaterThan(0);
		});
	});

	describe('events', () => {
		it('setNodes does not fire onNodesChange (initialization path)', () => {
			const hookSpy = vi.fn();

			const facade = useWorkflowDocumentNodes(deps);
			facade.onNodesChange(hookSpy);
			facade.setNodes([createNode()]);

			expect(hookSpy).not.toHaveBeenCalled();
		});

		it('addNode fires onNodesChange with add action', () => {
			const hookSpy = vi.fn();
			const node = createNode();

			const facade = useWorkflowDocumentNodes(deps);
			facade.onNodesChange(hookSpy);
			facade.addNode(node);

			expect(hookSpy).toHaveBeenCalledWith({
				action: 'add',
				payload: { node },
			});
		});

		it('removeNode fires onNodesChange with delete action', () => {
			const hookSpy = vi.fn();
			const node = createNode({ name: 'Target' });

			const facade = useWorkflowDocumentNodes(deps);
			facade.setNodes([node]);
			facade.onNodesChange(hookSpy);
			facade.removeNode(node);

			expect(hookSpy).toHaveBeenCalledWith({
				action: 'delete',
				payload: { name: 'Target', id: node.id },
			});
		});

		it('removeNodeById fires onNodesChange with delete action', () => {
			const hookSpy = vi.fn();
			const node = createNode({ name: 'Target' });

			const facade = useWorkflowDocumentNodes(deps);
			facade.setNodes([node]);
			facade.onNodesChange(hookSpy);
			facade.removeNodeById(node.id);

			expect(hookSpy).toHaveBeenCalledWith({
				action: 'delete',
				payload: { name: 'Target', id: node.id },
			});
		});

		it('addNode fires onStateDirty', () => {
			const dirtySpy = vi.fn();

			const facade = useWorkflowDocumentNodes(deps);
			facade.onStateDirty(dirtySpy);
			facade.addNode(createNode());

			expect(dirtySpy).toHaveBeenCalledOnce();
		});

		it('removeNode fires onStateDirty', () => {
			const dirtySpy = vi.fn();
			const node = createNode();

			const facade = useWorkflowDocumentNodes(deps);
			facade.setNodes([node]);
			facade.onStateDirty(dirtySpy);
			facade.removeNode(node);

			expect(dirtySpy).toHaveBeenCalledOnce();
		});

		it('removeNodeById fires onStateDirty', () => {
			const dirtySpy = vi.fn();
			const node = createNode();

			const facade = useWorkflowDocumentNodes(deps);
			facade.setNodes([node]);
			facade.onStateDirty(dirtySpy);
			facade.removeNodeById(node.id);

			expect(dirtySpy).toHaveBeenCalledOnce();
		});

		it('setNodes does not fire onStateDirty (initialization path)', () => {
			const dirtySpy = vi.fn();

			const facade = useWorkflowDocumentNodes(deps);
			facade.onStateDirty(dirtySpy);
			facade.setNodes([createNode()]);

			expect(dirtySpy).not.toHaveBeenCalled();
		});

		it('setNodeParameters fires onStateDirty when parameters change', () => {
			const dirtySpy = vi.fn();
			const node = createNode({ name: 'Target', parameters: { old: 'value' } });

			const facade = useWorkflowDocumentNodes(deps);
			facade.setNodes([node]);
			facade.onStateDirty(dirtySpy);
			facade.setNodeParameters({ name: 'Target', value: { new: 'value' } });

			expect(dirtySpy).toHaveBeenCalledOnce();
		});

		it('setNodeValue fires onStateDirty when value changes', () => {
			const dirtySpy = vi.fn();
			const node = createNode({ name: 'Target' });

			const facade = useWorkflowDocumentNodes(deps);
			facade.setNodes([node]);
			facade.onStateDirty(dirtySpy);
			facade.setNodeValue({ name: 'Target', key: 'disabled', value: true });

			expect(dirtySpy).toHaveBeenCalledOnce();
		});

		it('removeAllNodes fires onStateDirty when setStateDirty is true', () => {
			const dirtySpy = vi.fn();

			const facade = useWorkflowDocumentNodes(deps);
			facade.setNodes([createNode()]);
			facade.onStateDirty(dirtySpy);
			facade.removeAllNodes({ setStateDirty: true, removePinData: false });

			expect(dirtySpy).toHaveBeenCalledOnce();
		});

		it('removeAllNodes does not fire onStateDirty when setStateDirty is false', () => {
			const dirtySpy = vi.fn();

			const facade = useWorkflowDocumentNodes(deps);
			facade.setNodes([createNode()]);
			facade.onStateDirty(dirtySpy);
			facade.removeAllNodes({ setStateDirty: false, removePinData: false });

			expect(dirtySpy).not.toHaveBeenCalled();
		});

		it('removeNodeById uses empty name when node not found', () => {
			const hookSpy = vi.fn();

			const facade = useWorkflowDocumentNodes(deps);
			facade.onNodesChange(hookSpy);
			facade.removeNodeById('nonexistent');

			expect(hookSpy).toHaveBeenCalledWith({
				action: 'delete',
				payload: { name: '', id: 'nonexistent' },
			});
		});
	});
});
