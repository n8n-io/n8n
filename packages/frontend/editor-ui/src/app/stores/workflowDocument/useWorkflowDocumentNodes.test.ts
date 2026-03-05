import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { mockedStore } from '@/__tests__/utils';
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
	let workflowsStore: ReturnType<typeof mockedStore<typeof useWorkflowsStore>>;
	let deps: WorkflowDocumentNodesDeps;

	beforeEach(() => {
		setActivePinia(createTestingPinia());
		workflowsStore = mockedStore(useWorkflowsStore);
		deps = createDeps();

		// Provide workflowObject.setNodes for updateNodeAtIndex
		workflowsStore.workflowObject = { setNodes: vi.fn() } as unknown as ReturnType<
			typeof useWorkflowsStore
		>['workflowObject'];
	});

	describe('read API delegation', () => {
		it('getNodeById delegates to workflowsStore.getNodeById', () => {
			const node = createNode();
			workflowsStore.getNodeById.mockReturnValue(node);

			const { getNodeById } = useWorkflowDocumentNodes(deps);
			const result = getNodeById('node-1');

			expect(result).toBe(node);
			expect(workflowsStore.getNodeById).toHaveBeenCalledWith('node-1');
		});

		it('getNodeByName delegates to workflowsStore.getNodeByName', () => {
			const node = createNode();
			workflowsStore.getNodeByName.mockReturnValue(node);

			const { getNodeByName } = useWorkflowDocumentNodes(deps);
			const result = getNodeByName('Test Node');

			expect(result).toBe(node);
			expect(workflowsStore.getNodeByName).toHaveBeenCalledWith('Test Node');
		});

		it('getNodes delegates to workflowsStore.getNodes', () => {
			const nodes = [createNode()];
			workflowsStore.getNodes.mockReturnValue(nodes);

			const { getNodes } = useWorkflowDocumentNodes(deps);
			const result = getNodes();

			expect(result).toBe(nodes);
			expect(workflowsStore.getNodes).toHaveBeenCalled();
		});

		it('findNodeByPartialId delegates to workflowsStore.findNodeByPartialId', () => {
			const node = createNode();
			workflowsStore.findNodeByPartialId.mockReturnValue(node);

			const { findNodeByPartialId } = useWorkflowDocumentNodes(deps);
			const result = findNodeByPartialId('node');

			expect(result).toBe(node);
			expect(workflowsStore.findNodeByPartialId).toHaveBeenCalledWith('node');
		});

		it('getNodesByIds delegates to workflowsStore.getNodesByIds', () => {
			const nodes = [createNode()];
			workflowsStore.getNodesByIds.mockReturnValue(nodes);

			const { getNodesByIds } = useWorkflowDocumentNodes(deps);
			const result = getNodesByIds(['node-1']);

			expect(result).toBe(nodes);
			expect(workflowsStore.getNodesByIds).toHaveBeenCalledWith(['node-1']);
		});
	});

	describe('computed properties', () => {
		it('allNodes reflects workflowsStore.allNodes', () => {
			const nodes = [createNode({ name: 'A' }), createNode({ name: 'B' })];
			workflowsStore.allNodes = nodes;

			const { allNodes } = useWorkflowDocumentNodes(deps);

			expect(allNodes.value).toEqual(nodes);
		});

		it('nodesByName reflects workflowsStore.nodesByName', () => {
			const nodeA = createNode({ name: 'A' });
			workflowsStore.nodesByName = { A: nodeA };

			const { nodesByName } = useWorkflowDocumentNodes(deps);

			expect(nodesByName.value).toEqual({ A: nodeA });
		});

		it('canvasNames returns a Set of all node names', () => {
			const nodes = [createNode({ name: 'A' }), createNode({ name: 'B' })];
			workflowsStore.allNodes = nodes;

			const { canvasNames } = useWorkflowDocumentNodes(deps);

			expect(canvasNames.value).toEqual(new Set(['A', 'B']));
		});
	});

	describe('write API delegation', () => {
		it('setNodes delegates to workflowsStore.setNodes', () => {
			const nodes = [createNode()];

			const { setNodes } = useWorkflowDocumentNodes(deps);
			setNodes(nodes);

			expect(workflowsStore.setNodes).toHaveBeenCalledWith(nodes);
		});

		it('addNode delegates to workflowsStore.addNode', () => {
			const node = createNode();

			const { addNode } = useWorkflowDocumentNodes(deps);
			addNode(node);

			expect(workflowsStore.addNode).toHaveBeenCalledWith(node);
		});

		it('removeNode delegates to workflowsStore.removeNode', () => {
			const node = createNode();

			const { removeNode } = useWorkflowDocumentNodes(deps);
			removeNode(node);

			expect(workflowsStore.removeNode).toHaveBeenCalledWith(node);
		});

		it('removeNodeById delegates to workflowsStore.removeNodeById', () => {
			const { removeNodeById } = useWorkflowDocumentNodes(deps);
			removeNodeById('node-1');

			expect(workflowsStore.removeNodeById).toHaveBeenCalledWith('node-1');
		});
	});

	describe('node mutation', () => {
		it('setNodeParameters updates node parameters', () => {
			const node = createNode({ parameters: { old: 'value' } });
			workflowsStore.workflow.nodes = [node];
			workflowsStore.nodeMetadata = {
				'Test Node': { pristine: true, parametersLastUpdatedAt: 0 },
			};

			const { setNodeParameters } = useWorkflowDocumentNodes(deps);
			setNodeParameters({ name: 'Test Node', value: { new: 'value' } });

			expect(node.parameters).toEqual({ new: 'value' });
		});

		it('setNodeParameters with append merges parameters', () => {
			const node = createNode({ parameters: { existing: 'keep' } });
			workflowsStore.workflow.nodes = [node];
			workflowsStore.nodeMetadata = {
				'Test Node': { pristine: true, parametersLastUpdatedAt: 0 },
			};

			const { setNodeParameters } = useWorkflowDocumentNodes(deps);
			setNodeParameters({ name: 'Test Node', value: { added: 'new' } }, true);

			expect(node.parameters).toEqual({ existing: 'keep', added: 'new' });
		});

		it('setNodeParameters throws when node not found', () => {
			workflowsStore.workflow.nodes = [];

			const { setNodeParameters } = useWorkflowDocumentNodes(deps);

			expect(() => setNodeParameters({ name: 'NonExistent', value: {} })).toThrow(
				'could not be found',
			);
		});

		it('setNodeValue updates a node property', () => {
			const node = createNode();
			workflowsStore.workflow.nodes = [node];
			workflowsStore.nodeMetadata = {
				'Test Node': { pristine: true, parametersLastUpdatedAt: 0 },
			};

			const { setNodeValue } = useWorkflowDocumentNodes(deps);
			setNodeValue({ name: 'Test Node', key: 'disabled', value: true });

			expect(node.disabled).toBe(true);
		});

		it('setNodeValue does not update parametersLastUpdatedAt for position changes', () => {
			const node = createNode();
			workflowsStore.workflow.nodes = [node];
			workflowsStore.nodeMetadata = {
				'Test Node': { pristine: true, parametersLastUpdatedAt: 42 },
			};

			const { setNodeValue } = useWorkflowDocumentNodes(deps);
			setNodeValue({ name: 'Test Node', key: 'position', value: [300, 400] });

			expect(workflowsStore.nodeMetadata['Test Node'].parametersLastUpdatedAt).toBe(42);
		});

		it('setNodePositionById finds node by id and sets position', () => {
			const node = createNode({ id: 'abc-123' });
			workflowsStore.workflow.nodes = [node];
			workflowsStore.nodeMetadata = {
				'Test Node': { pristine: true, parametersLastUpdatedAt: 0 },
			};

			const { setNodePositionById } = useWorkflowDocumentNodes(deps);
			setNodePositionById('abc-123', [300, 400]);

			expect(node.position).toEqual([300, 400]);
		});

		it('updateNodeById updates a node by its id', () => {
			const node = createNode({ id: 'abc-123' });
			workflowsStore.workflow.nodes = [node];

			const { updateNodeById } = useWorkflowDocumentNodes(deps);
			const result = updateNodeById('abc-123', { disabled: true });

			expect(result).toBe(true);
			expect(node.disabled).toBe(true);
		});

		it('updateNodeById returns false when node not found', () => {
			workflowsStore.workflow.nodes = [];

			const { updateNodeById } = useWorkflowDocumentNodes(deps);
			const result = updateNodeById('nonexistent', { disabled: true });

			expect(result).toBe(false);
		});

		it('updateNodeProperties updates multiple properties', () => {
			const node = createNode();
			workflowsStore.workflow.nodes = [node];

			const { updateNodeProperties } = useWorkflowDocumentNodes(deps);
			updateNodeProperties({
				name: 'Test Node',
				properties: { disabled: true },
			});

			expect(node.disabled).toBe(true);
		});

		it('setNodeIssue adds an issue to a node', () => {
			const node = createNode();
			workflowsStore.workflow.nodes = [node];

			const { setNodeIssue } = useWorkflowDocumentNodes(deps);
			setNodeIssue({
				node: 'Test Node',
				type: 'parameters',
				value: { param: ['Missing required parameter'] },
			});

			expect(node.issues).toEqual({
				parameters: { param: ['Missing required parameter'] },
			});
		});

		it('setNodeIssue removes an issue from a node', () => {
			const node = createNode();
			node.issues = {
				parameters: { param: ['Missing'] },
				credentials: { cred: ['Invalid'] },
			};
			workflowsStore.workflow.nodes = [node];

			const { setNodeIssue } = useWorkflowDocumentNodes(deps);
			setNodeIssue({
				node: 'Test Node',
				type: 'parameters',
				value: null,
			});

			expect(node.issues).toEqual({ credentials: { cred: ['Invalid'] } });
			expect(node.issues).not.toHaveProperty('parameters');
		});

		it('removeAllNodes clears all nodes and metadata', () => {
			workflowsStore.workflow.nodes = [createNode(), createNode({ id: 'node-2', name: 'B' })];
			workflowsStore.nodeMetadata = { 'Test Node': { pristine: true }, B: { pristine: true } };

			const { removeAllNodes } = useWorkflowDocumentNodes(deps);
			removeAllNodes({ setStateDirty: true, removePinData: false });

			expect(workflowsStore.workflow.nodes).toHaveLength(0);
			expect(workflowsStore.nodeMetadata).toEqual({});
			expect(workflowsStore.workflowObject.setNodes).toHaveBeenCalledWith([]);
		});

		it('resetAllNodesIssues clears issues on all nodes', () => {
			const nodeA = createNode({ issues: { parameters: { x: ['err'] } } });
			const nodeB = createNode({
				id: 'node-2',
				name: 'B',
				issues: { credentials: { y: ['err'] } },
			});
			workflowsStore.workflow.nodes = [nodeA, nodeB];

			const { resetAllNodesIssues } = useWorkflowDocumentNodes(deps);
			const result = resetAllNodesIssues();

			expect(result).toBe(true);
			expect(nodeA.issues).toBeUndefined();
			expect(nodeB.issues).toBeUndefined();
		});

		it('setLastNodeParameters finds latest node by type and sets parameters', () => {
			const node = createNode({
				type: 'n8n-nodes-base.set',
				parameters: { existing: 'keep' },
			});
			workflowsStore.workflow.nodes = [node];
			workflowsStore.nodeMetadata = {
				'Test Node': { pristine: true, parametersLastUpdatedAt: 0 },
			};

			const mockNodeType = {
				properties: [
					{
						displayName: 'Value',
						name: 'value',
						type: 'string' as const,
						default: '',
					},
				],
			};

			const customDeps = createDeps({
				getNodeType: vi.fn().mockReturnValue(mockNodeType),
			});

			const { setLastNodeParameters } = useWorkflowDocumentNodes(customDeps);
			setLastNodeParameters({
				key: 'n8n-nodes-base.set',
				name: '',
				value: { value: 'hello' },
			});

			expect(customDeps.getNodeType).toHaveBeenCalledWith('n8n-nodes-base.set');
		});

		it('setLastNodeParameters does nothing when node type is not found', () => {
			const node = createNode({ type: 'n8n-nodes-base.set', parameters: { old: 'value' } });
			workflowsStore.workflow.nodes = [node];
			workflowsStore.nodeMetadata = {
				'Test Node': { pristine: true, parametersLastUpdatedAt: 0 },
			};

			const { setLastNodeParameters } = useWorkflowDocumentNodes(deps);
			setLastNodeParameters({
				key: 'n8n-nodes-base.set',
				name: '',
				value: { new: 'value' },
			});

			// getNodeType returns null (default mock), so parameters should not change
			expect(node.parameters).toEqual({ old: 'value' });
		});

		it('resetParametersLastUpdatedAt updates timestamp', () => {
			workflowsStore.nodeMetadata = {
				'Test Node': { pristine: true, parametersLastUpdatedAt: 0 },
			};

			const { resetParametersLastUpdatedAt } = useWorkflowDocumentNodes(deps);
			resetParametersLastUpdatedAt('Test Node');

			expect(workflowsStore.nodeMetadata['Test Node'].parametersLastUpdatedAt).toBeGreaterThan(0);
		});

		it('resetParametersLastUpdatedAt creates metadata entry if missing', () => {
			workflowsStore.nodeMetadata = {};

			const { resetParametersLastUpdatedAt } = useWorkflowDocumentNodes(deps);
			resetParametersLastUpdatedAt('NewNode');

			expect(workflowsStore.nodeMetadata.NewNode).toBeDefined();
			expect(workflowsStore.nodeMetadata.NewNode.parametersLastUpdatedAt).toBeGreaterThan(0);
		});
	});

	describe('events', () => {
		it('setNodes does not fire onNodesChange (initialization path)', () => {
			const hookSpy = vi.fn();
			const nodes = [createNode()];

			const { setNodes, onNodesChange } = useWorkflowDocumentNodes(deps);
			onNodesChange(hookSpy);
			setNodes(nodes);

			expect(hookSpy).not.toHaveBeenCalled();
		});

		it('addNode fires onNodesChange with add action', () => {
			const hookSpy = vi.fn();
			const node = createNode();

			const { addNode, onNodesChange } = useWorkflowDocumentNodes(deps);
			onNodesChange(hookSpy);
			addNode(node);

			expect(hookSpy).toHaveBeenCalledWith({
				action: 'add',
				payload: { node },
			});
		});

		it('removeNode fires onNodesChange with delete action', () => {
			const hookSpy = vi.fn();
			const node = createNode({ id: 'abc-123', name: 'Test Node' });

			const { removeNode, onNodesChange } = useWorkflowDocumentNodes(deps);
			onNodesChange(hookSpy);
			removeNode(node);

			expect(hookSpy).toHaveBeenCalledWith({
				action: 'delete',
				payload: { name: 'Test Node', id: 'abc-123' },
			});
		});

		it('removeNodeById fires onNodesChange with delete action', () => {
			const hookSpy = vi.fn();
			const node = createNode({ id: 'abc-123', name: 'Test Node' });
			workflowsStore.getNodeById.mockReturnValue(node);

			const { removeNodeById, onNodesChange } = useWorkflowDocumentNodes(deps);
			onNodesChange(hookSpy);
			removeNodeById('abc-123');

			expect(hookSpy).toHaveBeenCalledWith({
				action: 'delete',
				payload: { name: 'Test Node', id: 'abc-123' },
			});
		});

		it('addNode fires onStateDirty', () => {
			const dirtySpy = vi.fn();
			const node = createNode();

			const { addNode, onStateDirty } = useWorkflowDocumentNodes(deps);
			onStateDirty(dirtySpy);
			addNode(node);

			expect(dirtySpy).toHaveBeenCalledOnce();
		});

		it('removeNode fires onStateDirty', () => {
			const dirtySpy = vi.fn();
			const node = createNode();

			const { removeNode, onStateDirty } = useWorkflowDocumentNodes(deps);
			onStateDirty(dirtySpy);
			removeNode(node);

			expect(dirtySpy).toHaveBeenCalledOnce();
		});

		it('removeNodeById fires onStateDirty', () => {
			const dirtySpy = vi.fn();
			workflowsStore.getNodeById.mockReturnValue(createNode({ id: 'abc-123' }));

			const { removeNodeById, onStateDirty } = useWorkflowDocumentNodes(deps);
			onStateDirty(dirtySpy);
			removeNodeById('abc-123');

			expect(dirtySpy).toHaveBeenCalledOnce();
		});

		it('setNodes does not fire onStateDirty (initialization path)', () => {
			const dirtySpy = vi.fn();

			const { setNodes, onStateDirty } = useWorkflowDocumentNodes(deps);
			onStateDirty(dirtySpy);
			setNodes([createNode()]);

			expect(dirtySpy).not.toHaveBeenCalled();
		});

		it('setNodeParameters fires onStateDirty when parameters change', () => {
			const dirtySpy = vi.fn();
			const node = createNode({ parameters: { old: 'value' } });
			workflowsStore.workflow.nodes = [node];
			workflowsStore.nodeMetadata = {
				'Test Node': { pristine: true, parametersLastUpdatedAt: 0 },
			};

			const { setNodeParameters, onStateDirty } = useWorkflowDocumentNodes(deps);
			onStateDirty(dirtySpy);
			setNodeParameters({ name: 'Test Node', value: { new: 'value' } });

			expect(dirtySpy).toHaveBeenCalledOnce();
		});

		it('setNodeValue fires onStateDirty when value changes', () => {
			const dirtySpy = vi.fn();
			const node = createNode();
			workflowsStore.workflow.nodes = [node];
			workflowsStore.nodeMetadata = {
				'Test Node': { pristine: true, parametersLastUpdatedAt: 0 },
			};

			const { setNodeValue, onStateDirty } = useWorkflowDocumentNodes(deps);
			onStateDirty(dirtySpy);
			setNodeValue({ name: 'Test Node', key: 'disabled', value: true });

			expect(dirtySpy).toHaveBeenCalledOnce();
		});

		it('removeAllNodes fires onStateDirty when setStateDirty is true', () => {
			const dirtySpy = vi.fn();
			workflowsStore.workflow.nodes = [createNode()];
			workflowsStore.nodeMetadata = { 'Test Node': { pristine: true } };

			const { removeAllNodes, onStateDirty } = useWorkflowDocumentNodes(deps);
			onStateDirty(dirtySpy);
			removeAllNodes({ setStateDirty: true, removePinData: false });

			expect(dirtySpy).toHaveBeenCalledOnce();
		});

		it('removeAllNodes does not fire onStateDirty when setStateDirty is false', () => {
			const dirtySpy = vi.fn();
			workflowsStore.workflow.nodes = [createNode()];
			workflowsStore.nodeMetadata = { 'Test Node': { pristine: true } };

			const { removeAllNodes, onStateDirty } = useWorkflowDocumentNodes(deps);
			onStateDirty(dirtySpy);
			removeAllNodes({ setStateDirty: false, removePinData: false });

			expect(dirtySpy).not.toHaveBeenCalled();
		});

		it('removeNodeById uses empty name when node not found', () => {
			const hookSpy = vi.fn();
			workflowsStore.getNodeById.mockReturnValue(undefined);

			const { removeNodeById, onNodesChange } = useWorkflowDocumentNodes(deps);
			onNodesChange(hookSpy);
			removeNodeById('nonexistent');

			expect(hookSpy).toHaveBeenCalledWith({
				action: 'delete',
				payload: { name: '', id: 'nonexistent' },
			});
		});
	});
});
