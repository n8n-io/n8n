import { useCanvasOperations } from '@/composables/useCanvasOperations';
import type { CanvasElement } from '@/types';
import type { INodeUi } from '@/Interface';
import { RemoveNodeCommand } from '@/models/history';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useUIStore } from '@/stores/ui.store';
import { useHistoryStore } from '@/stores/history.store';
import { createPinia, setActivePinia } from 'pinia';
import { createTestNode, createTestWorkflowObject } from '@/__tests__/mocks';
import type { Connection } from '@vue-flow/core';
import type { IConnection } from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';
import { useNDVStore } from '@/stores/ndv.store';

describe('useCanvasOperations', () => {
	let workflowsStore: ReturnType<typeof useWorkflowsStore>;
	let uiStore: ReturnType<typeof useUIStore>;
	let ndvStore: ReturnType<typeof useNDVStore>;
	let historyStore: ReturnType<typeof useHistoryStore>;
	let canvasOperations: ReturnType<typeof useCanvasOperations>;

	beforeEach(() => {
		const pinia = createPinia();
		setActivePinia(pinia);

		workflowsStore = useWorkflowsStore();
		uiStore = useUIStore();
		ndvStore = useNDVStore();
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

	describe('renameNode', () => {
		it('should rename node', async () => {
			const oldName = 'Old Node';
			const newName = 'New Node';

			const workflowObject = createTestWorkflowObject();
			workflowObject.renameNode = vi.fn();

			vi.spyOn(workflowsStore, 'getCurrentWorkflow').mockReturnValue(workflowObject);

			workflowsStore.getNodeByName = vi.fn().mockReturnValue({ name: oldName });
			ndvStore.activeNodeName = oldName;

			await canvasOperations.renameNode(oldName, newName);

			expect(workflowObject.renameNode).toHaveBeenCalledWith(oldName, newName);
			expect(ndvStore.activeNodeName).toBe(newName);
		});

		it('should not rename node when new name is same as old name', async () => {
			const oldName = 'Old Node';
			workflowsStore.getNodeByName = vi.fn().mockReturnValue({ name: oldName });
			ndvStore.activeNodeName = oldName;

			await canvasOperations.renameNode(oldName, oldName);

			expect(ndvStore.activeNodeName).toBe(oldName);
		});
	});

	describe('revertRenameNode', () => {
		it('should revert node renaming', async () => {
			const oldName = 'Old Node';
			const currentName = 'New Node';
			workflowsStore.getNodeByName = vi.fn().mockReturnValue({ name: currentName });
			ndvStore.activeNodeName = currentName;

			await canvasOperations.revertRenameNode(currentName, oldName);

			expect(ndvStore.activeNodeName).toBe(oldName);
		});

		it('should not revert node renaming when old name is same as new name', async () => {
			const oldName = 'Old Node';
			workflowsStore.getNodeByName = vi.fn().mockReturnValue({ name: oldName });
			ndvStore.activeNodeName = oldName;

			await canvasOperations.revertRenameNode(oldName, oldName);

			expect(ndvStore.activeNodeName).toBe(oldName);
		});
	});

	describe('setNodeActive', () => {
		it('should set active node name when node exists', () => {
			const nodeId = 'node1';
			const nodeName = 'Node 1';
			workflowsStore.getNodeById = vi.fn().mockReturnValue({ name: nodeName });
			ndvStore.activeNodeName = '';

			canvasOperations.setNodeActive(nodeId);

			expect(ndvStore.activeNodeName).toBe(nodeName);
		});

		it('should not change active node name when node does not exist', () => {
			const nodeId = 'node1';
			workflowsStore.getNodeById = vi.fn().mockReturnValue(undefined);
			ndvStore.activeNodeName = 'Existing Node';

			canvasOperations.setNodeActive(nodeId);

			expect(ndvStore.activeNodeName).toBe('Existing Node');
		});
	});

	describe('setNodeActiveByName', () => {
		it('should set active node name', () => {
			const nodeName = 'Node 1';
			ndvStore.activeNodeName = '';

			canvasOperations.setNodeActiveByName(nodeName);

			expect(ndvStore.activeNodeName).toBe(nodeName);
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
				sourceHandle: `outputs/${NodeConnectionType.Main}/0`,
				target: nodeB.id,
				targetHandle: `inputs/${NodeConnectionType.Main}/0`,
			};

			vi.spyOn(workflowsStore, 'getNodeById').mockReturnValueOnce(nodeA).mockReturnValueOnce(nodeB);

			canvasOperations.createConnection(connection);

			expect(addConnectionSpy).toHaveBeenCalledWith({
				connection: [
					{ index: 0, node: nodeA.name, type: NodeConnectionType.Main },
					{ index: 0, node: nodeB.name, type: NodeConnectionType.Main },
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
				sourceHandle: `outputs/${NodeConnectionType.Main}/0`,
				target: nodeB.id,
				targetHandle: `inputs/${NodeConnectionType.Main}/0`,
			};

			vi.spyOn(workflowsStore, 'getNodeById').mockReturnValueOnce(nodeA).mockReturnValueOnce(nodeB);

			canvasOperations.deleteConnection(connection);

			expect(removeConnectionSpy).toHaveBeenCalledWith({
				connection: [
					{ index: 0, node: nodeA.name, type: NodeConnectionType.Main },
					{ index: 0, node: nodeB.name, type: NodeConnectionType.Main },
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
				{ node: 'sourceNode', type: NodeConnectionType.Main, index: 1 },
				{ node: 'targetNode', type: NodeConnectionType.Main, index: 2 },
			];

			canvasOperations.revertDeleteConnection(connection);

			expect(addConnectionSpy).toHaveBeenCalledWith({ connection });
		});
	});
});
