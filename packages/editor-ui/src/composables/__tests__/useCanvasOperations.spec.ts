import { createPinia, setActivePinia } from 'pinia';
import type { Connection } from '@vue-flow/core';
import type { IConnection } from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';
import { useCanvasOperations } from '@/composables/useCanvasOperations';
import type { CanvasElement } from '@/types';
import type { ICredentialsResponse, INodeUi, IWorkflowDb, XYPosition } from '@/Interface';
import { RemoveNodeCommand } from '@/models/history';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useUIStore } from '@/stores/ui.store';
import { useHistoryStore } from '@/stores/history.store';
import { useNDVStore } from '@/stores/ndv.store';
import { ref } from 'vue';
import {
	createTestNode,
	createTestWorkflowObject,
	mockNode,
	mockNodeTypeDescription,
} from '@/__tests__/mocks';
import { useRouter } from 'vue-router';
import { mock } from 'vitest-mock-extended';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useCredentialsStore } from '@/stores/credentials.store';

vi.mock('vue-router', async () => {
	const actual = await import('vue-router');

	return {
		...actual,
		useRouter: () => ({}),
	};
});

describe('useCanvasOperations', () => {
	let workflowsStore: ReturnType<typeof useWorkflowsStore>;
	let uiStore: ReturnType<typeof useUIStore>;
	let ndvStore: ReturnType<typeof useNDVStore>;
	let historyStore: ReturnType<typeof useHistoryStore>;
	let nodeTypesStore: ReturnType<typeof useNodeTypesStore>;
	let credentialsStore: ReturnType<typeof useCredentialsStore>;
	let canvasOperations: ReturnType<typeof useCanvasOperations>;

	const lastClickPosition = ref<XYPosition>([450, 450]);
	const router = useRouter();

	beforeEach(() => {
		const pinia = createPinia();
		setActivePinia(pinia);

		workflowsStore = useWorkflowsStore();
		uiStore = useUIStore();
		ndvStore = useNDVStore();
		historyStore = useHistoryStore();
		nodeTypesStore = useNodeTypesStore();
		credentialsStore = useCredentialsStore();

		const workflowId = 'test';
		workflowsStore.workflowsById[workflowId] = mock<IWorkflowDb>({
			id: workflowId,
			nodes: [],
			tags: [],
			usedCredentials: [],
		});
		workflowsStore.initializeEditableWorkflow(workflowId);

		canvasOperations = useCanvasOperations({ router, lastClickPosition });
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

	describe('setNodeSelected', () => {
		it('should set last selected node when node id is provided and node exists', () => {
			const nodeId = 'node1';
			const nodeName = 'Node 1';
			workflowsStore.getNodeById = vi.fn().mockReturnValue({ name: nodeName });
			uiStore.lastSelectedNode = '';

			canvasOperations.setNodeSelected(nodeId);

			expect(uiStore.lastSelectedNode).toBe(nodeName);
		});

		it('should not change last selected node when node id is provided but node does not exist', () => {
			const nodeId = 'node1';
			workflowsStore.getNodeById = vi.fn().mockReturnValue(undefined);
			uiStore.lastSelectedNode = 'Existing Node';

			canvasOperations.setNodeSelected(nodeId);

			expect(uiStore.lastSelectedNode).toBe('Existing Node');
		});

		it('should clear last selected node when node id is not provided', () => {
			uiStore.lastSelectedNode = 'Existing Node';

			canvasOperations.setNodeSelected();

			expect(uiStore.lastSelectedNode).toBe('');
		});
	});

	describe('initializeNodeDataWithDefaultCredentials', () => {
		it('should throw error when node type does not exist', async () => {
			vi.spyOn(nodeTypesStore, 'getNodeTypes').mockResolvedValue(undefined);

			await expect(
				canvasOperations.initializeNodeDataWithDefaultCredentials({ type: 'nonexistent' }),
			).rejects.toThrow();
		});

		it('should create node with default version when version is undefined', async () => {
			nodeTypesStore.setNodeTypes([mockNodeTypeDescription({ name: 'type' })]);

			const result = await canvasOperations.initializeNodeDataWithDefaultCredentials({
				name: 'example',
				type: 'type',
			});

			expect(result.typeVersion).toBe(1);
		});

		it('should create node with last version when version is an array', async () => {
			nodeTypesStore.setNodeTypes([mockNodeTypeDescription({ name: 'type', version: [1, 2] })]);

			const result = await canvasOperations.initializeNodeDataWithDefaultCredentials({
				type: 'type',
			});

			expect(result.typeVersion).toBe(2);
		});

		it('should create node with default position when position is not provided', async () => {
			nodeTypesStore.setNodeTypes([mockNodeTypeDescription({ name: 'type' })]);

			const result = await canvasOperations.initializeNodeDataWithDefaultCredentials({
				type: 'type',
			});

			expect(result.position).toEqual([0, 0]);
		});

		it('should create node with provided position when position is provided', async () => {
			nodeTypesStore.setNodeTypes([mockNodeTypeDescription({ name: 'type' })]);

			const result = await canvasOperations.initializeNodeDataWithDefaultCredentials({
				type: 'type',
				position: [10, 20],
			});

			expect(result.position).toEqual([10, 20]);
		});

		it('should create node with default credentials when only one credential is available', async () => {
			const credential = mock<ICredentialsResponse>({ id: '1', name: 'cred', type: 'cred' });
			const nodeTypeName = 'type';

			nodeTypesStore.setNodeTypes([
				mockNodeTypeDescription({ name: nodeTypeName, credentials: [{ name: credential.name }] }),
			]);

			credentialsStore.addCredentials([credential]);

			// @ts-expect-error Known pinia issue when spying on store getters
			vi.spyOn(credentialsStore, 'getUsableCredentialByType', 'get').mockReturnValue(() => [
				credential,
			]);

			const result = await canvasOperations.initializeNodeDataWithDefaultCredentials({
				type: nodeTypeName,
			});

			expect(result.credentials).toEqual({ [credential.name]: { id: '1', name: credential.name } });
		});

		it('should not assign credentials when multiple credentials are available', async () => {
			const credentialA = mock<ICredentialsResponse>({ id: '1', name: 'credA', type: 'cred' });
			const credentialB = mock<ICredentialsResponse>({ id: '1', name: 'credB', type: 'cred' });
			const nodeTypeName = 'type';

			nodeTypesStore.setNodeTypes([
				mockNodeTypeDescription({
					name: nodeTypeName,
					credentials: [{ name: credentialA.name }, { name: credentialB.name }],
				}),
			]);

			// @ts-expect-error Known pinia issue when spying on store getters
			vi.spyOn(credentialsStore, 'getUsableCredentialByType', 'get').mockReturnValue(() => [
				credentialA,
				credentialB,
			]);

			const result = await canvasOperations.initializeNodeDataWithDefaultCredentials({
				type: 'type',
			});
			expect(result.credentials).toBeUndefined();
		});
	});

	describe('addNodes', () => {
		it('should add nodes at specified positions', async () => {
			const nodeTypeName = 'type';
			const nodes = [
				mockNode({ name: 'Node 1', type: nodeTypeName, position: [30, 40] }),
				mockNode({ name: 'Node 2', type: nodeTypeName, position: [100, 240] }),
			];

			nodeTypesStore.setNodeTypes([
				mockNodeTypeDescription({
					name: nodeTypeName,
				}),
			]);

			await canvasOperations.addNodes(nodes, {});

			expect(workflowsStore.workflow.nodes).toHaveLength(2);
			expect(workflowsStore.workflow.nodes[0]).toHaveProperty('name', nodes[0].name);
			expect(workflowsStore.workflow.nodes[0]).toHaveProperty('parameters', {});
			expect(workflowsStore.workflow.nodes[0]).toHaveProperty('type', nodeTypeName);
			expect(workflowsStore.workflow.nodes[0]).toHaveProperty('typeVersion', 1);
			expect(workflowsStore.workflow.nodes[0]).toHaveProperty('position');
		});

		it('should add nodes at current position when position is not specified', async () => {
			const nodeTypeName = 'type';
			const nodes = [
				mockNode({ name: 'Node 1', type: nodeTypeName, position: [40, 40] }),
				mockNode({ name: 'Node 2', type: nodeTypeName, position: [100, 240] }),
			];
			const workflowStoreAddNodeSpy = vi.spyOn(workflowsStore, 'addNode');

			nodeTypesStore.setNodeTypes([
				mockNodeTypeDescription({
					name: nodeTypeName,
				}),
			]);

			await canvasOperations.addNodes(nodes, { position: [50, 60] });

			expect(workflowStoreAddNodeSpy).toHaveBeenCalledTimes(2);
			expect(workflowStoreAddNodeSpy.mock.calls[0][0].position).toEqual(
				expect.arrayContaining(nodes[0].position),
			);
			expect(workflowStoreAddNodeSpy.mock.calls[1][0].position).toEqual(
				expect.arrayContaining(nodes[1].position),
			);
		});

		it('should adjust the position of nodes with multiple inputs', async () => {
			const nodeTypeName = 'type';
			const nodes = [
				mockNode({ id: 'a', name: 'Node A', type: nodeTypeName, position: [40, 40] }),
				mockNode({ id: 'b', name: 'Node B', type: nodeTypeName, position: [40, 40] }),
				mockNode({ id: 'c', name: 'Node C', type: nodeTypeName, position: [100, 240] }),
			];

			const setNodePositionByIdSpy = vi.spyOn(workflowsStore, 'setNodePositionById');
			vi.spyOn(workflowsStore, 'getNodeByName')
				.mockReturnValueOnce(nodes[1])
				.mockReturnValueOnce(nodes[2]);
			vi.spyOn(workflowsStore, 'getNodeById')
				.mockReturnValueOnce(nodes[1])
				.mockReturnValueOnce(nodes[2]);

			nodeTypesStore.setNodeTypes([
				mockNodeTypeDescription({
					name: nodeTypeName,
				}),
			]);

			canvasOperations.editableWorkflowObject.value.getParentNodesByDepth = vi
				.fn()
				.mockReturnValue(nodes.map((node) => node.name));

			await canvasOperations.addNodes(nodes, {});

			expect(setNodePositionByIdSpy).toHaveBeenCalledTimes(2);
			expect(setNodePositionByIdSpy).toHaveBeenCalledWith(nodes[1].id, expect.any(Object));
			expect(setNodePositionByIdSpy).toHaveBeenCalledWith(nodes[2].id, expect.any(Object));
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

	describe('addConnections', () => {
		it('should create connections between nodes', async () => {
			const nodeTypeName = 'type';
			const nodes = [
				mockNode({ id: 'a', name: 'Node A', type: nodeTypeName, position: [40, 40] }),
				mockNode({ id: 'b', name: 'Node B', type: nodeTypeName, position: [40, 40] }),
			];

			nodeTypesStore.setNodeTypes([
				mockNodeTypeDescription({
					name: nodeTypeName,
				}),
			]);

			await canvasOperations.addNodes(nodes, {});

			vi.spyOn(workflowsStore, 'getNodeById')
				.mockReturnValueOnce(nodes[0])
				.mockReturnValueOnce(nodes[1]);

			const connections = [
				{ from: { nodeIndex: 0, outputIndex: 0 }, to: { nodeIndex: 1, inputIndex: 0 } },
				{ from: { nodeIndex: 1, outputIndex: 0 }, to: { nodeIndex: 2, inputIndex: 0 } },
			];
			const offsetIndex = 0;

			const addConnectionSpy = vi.spyOn(workflowsStore, 'addConnection');

			await canvasOperations.addConnections(connections, { offsetIndex });

			expect(addConnectionSpy).toHaveBeenCalledWith({
				connection: [
					{
						index: 0,
						node: 'Node B',
						type: 'main',
					},
					{
						index: 0,
						node: 'spy',
						type: 'main',
					},
				],
			});
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
