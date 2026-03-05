import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { mockedStore } from '@/__tests__/utils';
import { createTestNode } from '@/__tests__/mocks';
import type { INodeUi } from '@/Interface';
import { useWorkflowDocumentNodes } from './useWorkflowDocumentNodes';

function createNode(overrides: Partial<INodeUi> = {}): INodeUi {
	return createTestNode({ name: 'Test Node', ...overrides }) as INodeUi;
}

describe('useWorkflowDocumentNodes', () => {
	let workflowsStore: ReturnType<typeof mockedStore<typeof useWorkflowsStore>>;

	beforeEach(() => {
		setActivePinia(createTestingPinia());
		workflowsStore = mockedStore(useWorkflowsStore);
	});

	describe('read API delegation', () => {
		it('getNodeById delegates to workflowsStore.getNodeById', () => {
			const node = createNode();
			workflowsStore.getNodeById.mockReturnValue(node);

			const { getNodeById } = useWorkflowDocumentNodes();
			const result = getNodeById('node-1');

			expect(result).toBe(node);
			expect(workflowsStore.getNodeById).toHaveBeenCalledWith('node-1');
		});

		it('getNodeByName delegates to workflowsStore.getNodeByName', () => {
			const node = createNode();
			workflowsStore.getNodeByName.mockReturnValue(node);

			const { getNodeByName } = useWorkflowDocumentNodes();
			const result = getNodeByName('Test Node');

			expect(result).toBe(node);
			expect(workflowsStore.getNodeByName).toHaveBeenCalledWith('Test Node');
		});

		it('getNodes delegates to workflowsStore.getNodes', () => {
			const nodes = [createNode()];
			workflowsStore.getNodes.mockReturnValue(nodes);

			const { getNodes } = useWorkflowDocumentNodes();
			const result = getNodes();

			expect(result).toBe(nodes);
			expect(workflowsStore.getNodes).toHaveBeenCalled();
		});

		it('getNodesByIds delegates to workflowsStore.getNodesByIds', () => {
			const nodes = [createNode()];
			workflowsStore.getNodesByIds.mockReturnValue(nodes);

			const { getNodesByIds } = useWorkflowDocumentNodes();
			const result = getNodesByIds(['node-1']);

			expect(result).toBe(nodes);
			expect(workflowsStore.getNodesByIds).toHaveBeenCalledWith(['node-1']);
		});
	});

	describe('computed properties', () => {
		it('allNodes reflects workflowsStore.allNodes', () => {
			const nodes = [createNode({ name: 'A' }), createNode({ name: 'B' })];
			workflowsStore.allNodes = nodes;

			const { allNodes } = useWorkflowDocumentNodes();

			expect(allNodes.value).toEqual(nodes);
		});

		it('nodesByName reflects workflowsStore.nodesByName', () => {
			const nodeA = createNode({ name: 'A' });
			workflowsStore.nodesByName = { A: nodeA };

			const { nodesByName } = useWorkflowDocumentNodes();

			expect(nodesByName.value).toEqual({ A: nodeA });
		});
	});

	describe('write API delegation', () => {
		it('setNodes delegates to workflowsStore.setNodes', () => {
			const nodes = [createNode()];

			const { setNodes } = useWorkflowDocumentNodes();
			setNodes(nodes);

			expect(workflowsStore.setNodes).toHaveBeenCalledWith(nodes);
		});

		it('addNode delegates to workflowsStore.addNode', () => {
			const node = createNode();

			const { addNode } = useWorkflowDocumentNodes();
			addNode(node);

			expect(workflowsStore.addNode).toHaveBeenCalledWith(node);
		});

		it('removeNode delegates to workflowsStore.removeNode', () => {
			const node = createNode();

			const { removeNode } = useWorkflowDocumentNodes();
			removeNode(node);

			expect(workflowsStore.removeNode).toHaveBeenCalledWith(node);
		});

		it('removeNodeById delegates to workflowsStore.removeNodeById', () => {
			const { removeNodeById } = useWorkflowDocumentNodes();
			removeNodeById('node-1');

			expect(workflowsStore.removeNodeById).toHaveBeenCalledWith('node-1');
		});
	});

	describe('events', () => {
		it('setNodes does not fire onNodesChange (initialization path)', () => {
			const hookSpy = vi.fn();
			const nodes = [createNode()];

			const { setNodes, onNodesChange } = useWorkflowDocumentNodes();
			onNodesChange(hookSpy);
			setNodes(nodes);

			expect(hookSpy).not.toHaveBeenCalled();
		});

		it('addNode fires onNodesChange with add action', () => {
			const hookSpy = vi.fn();
			const node = createNode();

			const { addNode, onNodesChange } = useWorkflowDocumentNodes();
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

			const { removeNode, onNodesChange } = useWorkflowDocumentNodes();
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

			const { removeNodeById, onNodesChange } = useWorkflowDocumentNodes();
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

			const { addNode, onStateDirty } = useWorkflowDocumentNodes();
			onStateDirty(dirtySpy);
			addNode(node);

			expect(dirtySpy).toHaveBeenCalledOnce();
		});

		it('removeNode fires onStateDirty', () => {
			const dirtySpy = vi.fn();
			const node = createNode();

			const { removeNode, onStateDirty } = useWorkflowDocumentNodes();
			onStateDirty(dirtySpy);
			removeNode(node);

			expect(dirtySpy).toHaveBeenCalledOnce();
		});

		it('removeNodeById fires onStateDirty', () => {
			const dirtySpy = vi.fn();
			workflowsStore.getNodeById.mockReturnValue(createNode({ id: 'abc-123' }));

			const { removeNodeById, onStateDirty } = useWorkflowDocumentNodes();
			onStateDirty(dirtySpy);
			removeNodeById('abc-123');

			expect(dirtySpy).toHaveBeenCalledOnce();
		});

		it('setNodes does not fire onStateDirty (initialization path)', () => {
			const dirtySpy = vi.fn();

			const { setNodes, onStateDirty } = useWorkflowDocumentNodes();
			onStateDirty(dirtySpy);
			setNodes([createNode()]);

			expect(dirtySpy).not.toHaveBeenCalled();
		});

		it('removeNodeById uses empty name when node not found', () => {
			const hookSpy = vi.fn();
			workflowsStore.getNodeById.mockReturnValue(undefined);

			const { removeNodeById, onNodesChange } = useWorkflowDocumentNodes();
			onNodesChange(hookSpy);
			removeNodeById('nonexistent');

			expect(hookSpy).toHaveBeenCalledWith({
				action: 'delete',
				payload: { name: '', id: 'nonexistent' },
			});
		});
	});
});
