import { useCanvasOperations } from '@/composables/useCanvasOperations';
import type { CanvasElement } from '@/types';
import type { INodeUi } from '@/Interface';
import { RemoveNodeCommand } from '@/models/history';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useUIStore } from '@/stores/ui.store';
import { useHistoryStore } from '@/stores/history.store';
import { createPinia, setActivePinia } from 'pinia';
import { createTestNode } from '@/__tests__/mocks';
import type { Connection } from '@vue-flow/core';
import type { IConnection } from 'n8n-workflow';

describe('useCanvasOperations', () => {
	let workflowsStore: ReturnType<typeof useWorkflowsStore>;
	let uiStore: ReturnType<typeof useUIStore>;
	let historyStore: ReturnType<typeof useHistoryStore>;
	let canvasOperations: ReturnType<typeof useCanvasOperations>;

	beforeEach(() => {
		const pinia = createPinia();
		setActivePinia(pinia);

		workflowsStore = useWorkflowsStore();
		uiStore = useUIStore();
		historyStore = useHistoryStore();
		canvasOperations = useCanvasOperations();
	});

	describe('updateNodePosition', () => {
		it('should update node position', () => {
			const setNodePositionByIdSpy = vi
				.spyOn(workflowsStore, 'setNodePositionById')
				.mockImplementation(() => {});
			const id = 'node1';
			const position: CanvasElement['position'] = { x: 10, y: 20 };
			const node = createTestNode({
				id,
				type: 'node',
				position: [0, 0],
				name: 'Node 1',
			});

			vi.spyOn(workflowsStore, 'getNodeById').mockReturnValueOnce(node);

			canvasOperations.updateNodePosition(id, position);

			expect(setNodePositionByIdSpy).toHaveBeenCalledWith(id, [position.x, position.y]);
		});
	});

	describe('deleteNode', () => {
		it('should delete node and track history', () => {
			const removeNodeByIdSpy = vi
				.spyOn(workflowsStore, 'removeNodeById')
				.mockImplementation(() => {});
			const removeNodeConnectionsByIdSpy = vi
				.spyOn(workflowsStore, 'removeNodeConnectionsById')
				.mockImplementation(() => {});
			const removeNodeExecutionDataByIdSpy = vi
				.spyOn(workflowsStore, 'removeNodeExecutionDataById')
				.mockImplementation(() => {});
			const pushCommandToUndoSpy = vi
				.spyOn(historyStore, 'pushCommandToUndo')
				.mockImplementation(() => {});

			const id = 'node1';
			const node: INodeUi = createTestNode({
				id,
				type: 'node',
				position: [10, 20],
				name: 'Node 1',
			});

			vi.spyOn(workflowsStore, 'getNodeById').mockReturnValue(node);

			canvasOperations.deleteNode(id, { trackHistory: true });

			expect(removeNodeByIdSpy).toHaveBeenCalledWith(id);
			expect(removeNodeConnectionsByIdSpy).toHaveBeenCalledWith(id);
			expect(removeNodeExecutionDataByIdSpy).toHaveBeenCalledWith(id);
			expect(pushCommandToUndoSpy).toHaveBeenCalledWith(new RemoveNodeCommand(node));
		});

		it('should delete node without tracking history', () => {
			const removeNodeByIdSpy = vi
				.spyOn(workflowsStore, 'removeNodeById')
				.mockImplementation(() => {});
			const removeNodeConnectionsByIdSpy = vi
				.spyOn(workflowsStore, 'removeNodeConnectionsById')
				.mockImplementation(() => {});
			const removeNodeExecutionDataByIdSpy = vi
				.spyOn(workflowsStore, 'removeNodeExecutionDataById')
				.mockImplementation(() => {});
			const pushCommandToUndoSpy = vi
				.spyOn(historyStore, 'pushCommandToUndo')
				.mockImplementation(() => {});

			const id = 'node1';
			const node = createTestNode({
				id,
				type: 'node',
				position: [10, 20],
				name: 'Node 1',
				parameters: {},
			});

			vi.spyOn(workflowsStore, 'getNodeById').mockReturnValue(node);

			canvasOperations.deleteNode(id, { trackHistory: false });

			expect(removeNodeByIdSpy).toHaveBeenCalledWith(id);
			expect(removeNodeConnectionsByIdSpy).toHaveBeenCalledWith(id);
			expect(removeNodeExecutionDataByIdSpy).toHaveBeenCalledWith(id);
			expect(pushCommandToUndoSpy).not.toHaveBeenCalled();
		});
	});

	describe('revertDeleteNode', () => {
		it('should revert delete node', () => {
			const addNodeSpy = vi.spyOn(workflowsStore, 'addNode').mockImplementation(() => {});

			const node = createTestNode({
				id: 'node1',
				type: 'node',
				position: [10, 20],
				name: 'Node 1',
				parameters: {},
			});

			canvasOperations.revertDeleteNode(node);

			expect(addNodeSpy).toHaveBeenCalledWith(node);
		});
	});

	describe('createConnection', () => {
		it('should not create a connection if source node does not exist', () => {
			const addConnectionSpy = vi
				.spyOn(workflowsStore, 'addConnection')
				.mockImplementation(() => {});
			const connection: Connection = { source: 'nonexistent', target: 'targetNode' };

			vi.spyOn(workflowsStore, 'getNodeById').mockReturnValueOnce(undefined);

			canvasOperations.createConnection(connection);

			expect(addConnectionSpy).not.toHaveBeenCalled();
			expect(uiStore.stateIsDirty).toBe(false);
		});

		it('should not create a connection if target node does not exist', () => {
			const addConnectionSpy = vi
				.spyOn(workflowsStore, 'addConnection')
				.mockImplementation(() => {});
			const connection: Connection = { source: 'sourceNode', target: 'nonexistent' };

			vi.spyOn(workflowsStore, 'getNodeById')
				.mockReturnValueOnce(createTestNode())
				.mockReturnValueOnce(undefined);

			canvasOperations.createConnection(connection);

			expect(addConnectionSpy).not.toHaveBeenCalled();
			expect(uiStore.stateIsDirty).toBe(false);
		});

		// @TODO Implement once the isConnectionAllowed method is implemented
		it.skip('should not create a connection if connection is not allowed', () => {
			const addConnectionSpy = vi
				.spyOn(workflowsStore, 'addConnection')
				.mockImplementation(() => {});
			const connection: Connection = { source: 'sourceNode', target: 'targetNode' };

			vi.spyOn(workflowsStore, 'getNodeById')
				.mockReturnValueOnce(createTestNode())
				.mockReturnValueOnce(createTestNode());

			canvasOperations.createConnection(connection);

			expect(addConnectionSpy).not.toHaveBeenCalled();
			expect(uiStore.stateIsDirty).toBe(false);
		});

		it('should create a connection if source and target nodes exist and connection is allowed', () => {
			const addConnectionSpy = vi
				.spyOn(workflowsStore, 'addConnection')
				.mockImplementation(() => {});

			const nodeA = createTestNode({
				id: 'a',
				type: 'node',
				name: 'Node A',
			});

			const nodeB = createTestNode({
				id: 'b',
				type: 'node',
				name: 'Node B',
			});

			const connection: Connection = {
				source: nodeA.id,
				sourceHandle: 'outputs/main/0',
				target: nodeB.id,
				targetHandle: 'inputs/main/0',
			};

			vi.spyOn(workflowsStore, 'getNodeById').mockReturnValueOnce(nodeA).mockReturnValueOnce(nodeB);

			canvasOperations.createConnection(connection);

			expect(addConnectionSpy).toHaveBeenCalledWith({
				connection: [
					{ index: 0, node: nodeA.name, type: 'main' },
					{ index: 0, node: nodeB.name, type: 'main' },
				],
			});
			expect(uiStore.stateIsDirty).toBe(true);
		});
	});

	describe('deleteConnection', () => {
		it('should not delete a connection if source node does not exist', () => {
			const removeConnectionSpy = vi
				.spyOn(workflowsStore, 'removeConnection')
				.mockImplementation(() => {});
			const connection: Connection = { source: 'nonexistent', target: 'targetNode' };

			vi.spyOn(workflowsStore, 'getNodeById')
				.mockReturnValueOnce(undefined)
				.mockReturnValueOnce(createTestNode());

			canvasOperations.deleteConnection(connection);

			expect(removeConnectionSpy).not.toHaveBeenCalled();
		});

		it('should not delete a connection if target node does not exist', () => {
			const removeConnectionSpy = vi
				.spyOn(workflowsStore, 'removeConnection')
				.mockImplementation(() => {});
			const connection: Connection = { source: 'sourceNode', target: 'nonexistent' };

			vi.spyOn(workflowsStore, 'getNodeById')
				.mockReturnValueOnce(createTestNode())
				.mockReturnValueOnce(undefined);

			canvasOperations.deleteConnection(connection);

			expect(removeConnectionSpy).not.toHaveBeenCalled();
		});

		it('should delete a connection if source and target nodes exist', () => {
			const removeConnectionSpy = vi
				.spyOn(workflowsStore, 'removeConnection')
				.mockImplementation(() => {});

			const nodeA = createTestNode({
				id: 'a',
				type: 'node',
				name: 'Node A',
			});

			const nodeB = createTestNode({
				id: 'b',
				type: 'node',
				name: 'Node B',
			});

			const connection: Connection = {
				source: nodeA.id,
				sourceHandle: 'outputs/main/0',
				target: nodeB.id,
				targetHandle: 'inputs/main/0',
			};

			vi.spyOn(workflowsStore, 'getNodeById').mockReturnValueOnce(nodeA).mockReturnValueOnce(nodeB);

			canvasOperations.deleteConnection(connection);

			expect(removeConnectionSpy).toHaveBeenCalledWith({
				connection: [
					{ index: 0, node: nodeA.name, type: 'main' },
					{ index: 0, node: nodeB.name, type: 'main' },
				],
			});
		});
	});

	describe('revertDeleteConnection', () => {
		it('should revert delete connection', () => {
			const addConnectionSpy = vi
				.spyOn(workflowsStore, 'addConnection')
				.mockImplementation(() => {});

			const connection: [IConnection, IConnection] = [
				{ node: 'sourceNode', type: 'type', index: 1 },
				{ node: 'targetNode', type: 'type', index: 2 },
			];

			canvasOperations.revertDeleteConnection(connection);

			expect(addConnectionSpy).toHaveBeenCalledWith({ connection });
		});
	});
});
