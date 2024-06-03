import { useCanvasOperations } from '@/composables/useCanvasOperations';
import type { CanvasElement } from '@/types';
import type { INodeUi } from '@/Interface';
import { RemoveNodeCommand } from '@/models/history';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useHistoryStore } from '@/stores/history.store';
import { createPinia, setActivePinia } from 'pinia';
import { createTestNode } from '@/__tests__/mocks';

describe('useCanvasOperations', () => {
	let workflowsStore: ReturnType<typeof useWorkflowsStore>;
	let historyStore: ReturnType<typeof useHistoryStore>;
	let canvasOperations: ReturnType<typeof useCanvasOperations>;

	beforeEach(() => {
		const pinia = createPinia();
		setActivePinia(pinia);

		workflowsStore = useWorkflowsStore();
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
				parameters: {},
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
			const connection: Connection = { source: 'nonexistent', target: 'targetNode' };

			workflowsStore.getNodeById.mockReturnValueOnce(null);

			canvasOperations.createConnection(connection);

			expect(workflowsStore.addConnection).not.toHaveBeenCalled();
			expect(uiStore.stateIsDirty).toBe(false);
		});

		it('should not create a connection if target node does not exist', () => {
			const connection: Connection = { source: 'sourceNode', target: 'nonexistent' };

			workflowsStore.getNodeById.mockReturnValueOnce({}).mockReturnValueOnce(null);

			canvasOperations.createConnection(connection);

			expect(workflowsStore.addConnection).not.toHaveBeenCalled();
			expect(uiStore.stateIsDirty).toBe(false);
		});

		it('should not create a connection if connection is not allowed', () => {
			const connection: Connection = { source: 'sourceNode', target: 'targetNode' };

			workflowsStore.getNodeById.mockReturnValue({});
			canvasOperations.checkIfNodeConnectionIsAllowed = jest.fn().mockReturnValue(false);

			canvasOperations.createConnection(connection);

			expect(workflowsStore.addConnection).not.toHaveBeenCalled();
			expect(uiStore.stateIsDirty).toBe(false);
		});

		it('should create a connection if source and target nodes exist and connection is allowed', () => {
			const connection: Connection = { source: 'sourceNode', target: 'targetNode' };
			const mappedConnection = { connection: 'mappedConnection' };

			workflowsStore.getNodeById.mockReturnValue({});
			canvasOperations.checkIfNodeConnectionIsAllowed = jest.fn().mockReturnValue(true);
			canvasOperations.mapCanvasConnectionToLegacyConnection = jest
				.fn()
				.mockReturnValue(mappedConnection);

			canvasOperations.createConnection(connection);

			expect(workflowsStore.addConnection).toHaveBeenCalledWith(mappedConnection);
			expect(uiStore.stateIsDirty).toBe(true);
		});
	});
});
