import { createPinia, setActivePinia } from 'pinia';
import type { Connection } from '@vue-flow/core';
import type { IConnection, Workflow } from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';
import { useCanvasOperations } from '@/composables/useCanvasOperations';
import type { CanvasNode } from '@/types';
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
import { useWorkflowHelpers } from '@/composables/useWorkflowHelpers';
import { telemetry } from '@/plugins/telemetry';
import { useClipboard } from '@/composables/useClipboard';

vi.mock('vue-router', async (importOriginal) => {
	const actual = await importOriginal<{}>();
	return {
		...actual,
		useRouter: () => ({}),
	};
});

vi.mock('@/composables/useClipboard', async () => {
	const copySpy = vi.fn();
	return { useClipboard: vi.fn(() => ({ copy: copySpy })) };
});

describe('useCanvasOperations', () => {
	let workflowsStore: ReturnType<typeof useWorkflowsStore>;
	let uiStore: ReturnType<typeof useUIStore>;
	let ndvStore: ReturnType<typeof useNDVStore>;
	let historyStore: ReturnType<typeof useHistoryStore>;
	let nodeTypesStore: ReturnType<typeof useNodeTypesStore>;
	let credentialsStore: ReturnType<typeof useCredentialsStore>;
	let canvasOperations: ReturnType<typeof useCanvasOperations>;
	let workflowHelpers: ReturnType<typeof useWorkflowHelpers>;

	const lastClickPosition = ref<XYPosition>([450, 450]);
	const router = useRouter();

	beforeEach(async () => {
		const pinia = createPinia();
		setActivePinia(pinia);

		workflowsStore = useWorkflowsStore();
		uiStore = useUIStore();
		ndvStore = useNDVStore();
		historyStore = useHistoryStore();
		nodeTypesStore = useNodeTypesStore();
		credentialsStore = useCredentialsStore();
		workflowHelpers = useWorkflowHelpers({ router });

		const workflowId = 'test';
		const workflow = mock<IWorkflowDb>({
			id: workflowId,
			nodes: [],
			connections: {},
			tags: [],
			usedCredentials: [],
		});

		workflowsStore.resetWorkflow();
		workflowsStore.resetState();
		await workflowHelpers.initState(workflow);

		canvasOperations = useCanvasOperations({ router, lastClickPosition });
		vi.clearAllMocks();
	});

	describe('addNode', () => {
		it('should throw error when node type does not exist', async () => {
			vi.spyOn(nodeTypesStore, 'getNodeTypes').mockResolvedValue(undefined);

			await expect(canvasOperations.addNode({ type: 'nonexistent' })).rejects.toThrow();
		});

		it('should create node with default version when version is undefined', async () => {
			nodeTypesStore.setNodeTypes([mockNodeTypeDescription({ name: 'type' })]);

			const result = await canvasOperations.addNode({
				name: 'example',
				type: 'type',
			});

			expect(result.typeVersion).toBe(1);
		});

		it('should create node with last version when version is an array', async () => {
			nodeTypesStore.setNodeTypes([mockNodeTypeDescription({ name: 'type', version: [1, 2] })]);

			const result = await canvasOperations.addNode({
				type: 'type',
			});

			expect(result.typeVersion).toBe(2);
		});

		it('should create node with default position when position is not provided', async () => {
			nodeTypesStore.setNodeTypes([mockNodeTypeDescription({ name: 'type' })]);

			const result = await canvasOperations.addNode({
				type: 'type',
			});

			expect(result.position).toEqual([460, 460]); // Default last click position
		});

		it('should create node with provided position when position is provided', async () => {
			nodeTypesStore.setNodeTypes([mockNodeTypeDescription({ name: 'type' })]);

			const result = await canvasOperations.addNode({
				type: 'type',
				position: [20, 20],
			});

			expect(result.position).toEqual([20, 20]);
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

			const result = await canvasOperations.addNode({
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

			const result = await canvasOperations.addNode({
				type: 'type',
			});
			expect(result.credentials).toBeUndefined();
		});

		it('should open NDV when specified', async () => {
			nodeTypesStore.setNodeTypes([mockNodeTypeDescription({ name: 'type' })]);

			await canvasOperations.addNode(
				{
					type: 'type',
					name: 'Test Name',
				},
				{ openNDV: true },
			);

			expect(ndvStore.activeNodeName).toBe('Test Name');
		});
	});

	describe('updateNodesPosition', () => {
		it('records history for multiple node position updates when tracking is enabled', () => {
			const events = [
				{ id: 'node1', position: { x: 100, y: 100 } },
				{ id: 'node2', position: { x: 200, y: 200 } },
			];
			const startRecordingUndoSpy = vi.spyOn(historyStore, 'startRecordingUndo');
			const stopRecordingUndoSpy = vi.spyOn(historyStore, 'stopRecordingUndo');

			canvasOperations.updateNodesPosition(events, { trackHistory: true, trackBulk: true });

			expect(startRecordingUndoSpy).toHaveBeenCalled();
			expect(stopRecordingUndoSpy).toHaveBeenCalled();
		});

		it('updates positions for multiple nodes', () => {
			const events = [
				{ id: 'node1', position: { x: 100, y: 100 } },
				{ id: 'node2', position: { x: 200, y: 200 } },
			];
			const setNodePositionByIdSpy = vi.spyOn(workflowsStore, 'setNodePositionById');
			vi.spyOn(workflowsStore, 'getNodeById')
				.mockReturnValueOnce(
					createTestNode({
						id: events[0].id,
						position: [events[0].position.x, events[0].position.y],
					}),
				)
				.mockReturnValueOnce(
					createTestNode({
						id: events[1].id,
						position: [events[1].position.x, events[1].position.y],
					}),
				);

			canvasOperations.updateNodesPosition(events);

			expect(setNodePositionByIdSpy).toHaveBeenCalledTimes(2);
			expect(setNodePositionByIdSpy).toHaveBeenCalledWith('node1', [100, 100]);
			expect(setNodePositionByIdSpy).toHaveBeenCalledWith('node2', [200, 200]);
		});

		it('does not record history when trackHistory is false', () => {
			const events = [{ id: 'node1', position: { x: 100, y: 100 } }];
			const startRecordingUndoSpy = vi.spyOn(historyStore, 'startRecordingUndo');
			const stopRecordingUndoSpy = vi.spyOn(historyStore, 'stopRecordingUndo');

			canvasOperations.updateNodesPosition(events, { trackHistory: false, trackBulk: false });

			expect(startRecordingUndoSpy).not.toHaveBeenCalled();
			expect(stopRecordingUndoSpy).not.toHaveBeenCalled();
		});
	});

	describe('updateNodePosition', () => {
		it('should update node position', () => {
			const setNodePositionByIdSpy = vi
				.spyOn(workflowsStore, 'setNodePositionById')
				.mockImplementation(() => {});
			const id = 'node1';
			const position: CanvasNode['position'] = { x: 10, y: 20 };
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
				mockNode({ name: 'Node 1', type: nodeTypeName, position: [120, 120] }),
				mockNode({ name: 'Node 2', type: nodeTypeName, position: [180, 320] }),
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

			vi.spyOn(workflowsStore, 'getCurrentWorkflow').mockImplementation(() =>
				mock<Workflow>({
					getParentNodesByDepth: () =>
						nodes.map((node) => ({
							name: node.name,
							depth: 0,
							indicies: [],
						})),
				}),
			);

			await canvasOperations.addNodes(nodes, {});

			expect(setNodePositionByIdSpy).toHaveBeenCalledTimes(2);
			expect(setNodePositionByIdSpy).toHaveBeenCalledWith(nodes[1].id, expect.any(Object));
			expect(setNodePositionByIdSpy).toHaveBeenCalledWith(nodes[2].id, expect.any(Object));
		});
	});

	describe('revertAddNode', () => {
		it('deletes node if it exists', async () => {
			const node = createTestNode();
			vi.spyOn(workflowsStore, 'getNodeByName').mockReturnValueOnce(node);
			vi.spyOn(workflowsStore, 'getNodeById').mockReturnValueOnce(node);
			const removeNodeByIdSpy = vi.spyOn(workflowsStore, 'removeNodeById');

			await canvasOperations.revertAddNode(node.name);

			expect(removeNodeByIdSpy).toHaveBeenCalledWith(node.id);
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

		it('should connect adjacent nodes when deleting a node surrounded by other nodes', () => {
			nodeTypesStore.setNodeTypes([mockNodeTypeDescription({ name: 'node' })]);
			const nodes = [
				createTestNode({
					id: 'input',
					type: 'node',
					position: [10, 20],
					name: 'Input Node',
				}),
				createTestNode({
					id: 'middle',
					type: 'node',
					position: [10, 20],
					name: 'Middle Node',
				}),
				createTestNode({
					id: 'output',
					type: 'node',
					position: [10, 20],
					name: 'Output Node',
				}),
			];
			workflowsStore.setNodes(nodes);
			workflowsStore.setConnections({
				'Input Node': {
					main: [
						[
							{
								node: 'Middle Node',
								type: NodeConnectionType.Main,
								index: 0,
							},
						],
					],
				},
				'Middle Node': {
					main: [
						[
							{
								node: 'Output Node',
								type: NodeConnectionType.Main,
								index: 0,
							},
						],
					],
				},
			});

			canvasOperations.deleteNode('middle');
			expect(workflowsStore.allConnections).toEqual({
				'Input Node': {
					main: [
						[
							{
								node: 'Output Node',
								type: NodeConnectionType.Main,
								index: 0,
							},
						],
					],
				},
			});
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

	describe('toggleNodesDisabled', () => {
		it('disables nodes based on provided ids', async () => {
			const nodes = [
				createTestNode({ id: '1', name: 'A' }),
				createTestNode({ id: '2', name: 'B' }),
			];
			vi.spyOn(workflowsStore, 'getNodesByIds').mockReturnValue(nodes);
			const updateNodePropertiesSpy = vi.spyOn(workflowsStore, 'updateNodeProperties');

			canvasOperations.toggleNodesDisabled([nodes[0].id, nodes[1].id], {
				trackHistory: true,
				trackBulk: true,
			});

			expect(updateNodePropertiesSpy).toHaveBeenCalledWith({
				name: nodes[0].name,
				properties: {
					disabled: true,
				},
			});
		});
	});

	describe('revertToggleNodeDisabled', () => {
		it('re-enables a previously disabled node', () => {
			const nodeName = 'testNode';
			const node = createTestNode({ name: nodeName });
			vi.spyOn(workflowsStore, 'getNodeByName').mockReturnValue(node);
			const updateNodePropertiesSpy = vi.spyOn(workflowsStore, 'updateNodeProperties');

			canvasOperations.revertToggleNodeDisabled(nodeName);

			expect(updateNodePropertiesSpy).toHaveBeenCalledWith({
				name: nodeName,
				properties: {
					disabled: true,
				},
			});
		});
	});

	describe('addConnections', () => {
		it('should create connections between nodes', async () => {
			const nodeTypeName = 'type';
			const nodes = [
				mockNode({ id: 'a', name: 'Node A', type: nodeTypeName, position: [40, 40] }),
				mockNode({ id: 'b', name: 'Node B', type: nodeTypeName, position: [40, 40] }),
				mockNode({ id: 'c', name: 'Node C', type: nodeTypeName, position: [40, 40] }),
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
				{
					source: nodes[0].id,
					target: nodes[1].id,
					data: {
						source: { type: NodeConnectionType.Main, index: 0 },
						target: { type: NodeConnectionType.Main, index: 0 },
					},
				},
				{
					source: nodes[1].id,
					target: nodes[2].id,
					data: {
						source: { type: NodeConnectionType.Main, index: 0 },
						target: { type: NodeConnectionType.Main, index: 0 },
					},
				},
			];

			const addConnectionSpy = vi.spyOn(workflowsStore, 'addConnection');

			await canvasOperations.addConnections(connections);

			expect(addConnectionSpy).toHaveBeenCalledWith({
				connection: [
					{
						index: 0,
						node: 'Node A',
						type: NodeConnectionType.Main,
					},
					{
						index: 0,
						node: 'Node B',
						type: NodeConnectionType.Main,
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

			vi.spyOn(workflowsStore, 'getNodeById').mockReturnValueOnce(nodeA).mockReturnValueOnce(nodeB);

			const connection: Connection = {
				source: nodeA.id,
				sourceHandle: `outputs/${NodeConnectionType.Main}/0`,
				target: nodeB.id,
				targetHandle: `inputs/${NodeConnectionType.Main}/0`,
			};

			const nodeTypeDescription = mockNodeTypeDescription({
				name: 'node',
				inputs: [NodeConnectionType.Main],
			});

			nodeTypesStore.setNodeTypes([nodeTypeDescription]);
			canvasOperations.editableWorkflowObject.value.nodes[nodeA.name] = nodeA;
			canvasOperations.editableWorkflowObject.value.nodes[nodeB.name] = nodeB;

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

	describe('revertCreateConnection', () => {
		it('deletes connection if both source and target nodes exist', () => {
			const connection: [IConnection, IConnection] = [
				{ node: 'sourceNode', type: NodeConnectionType.Main, index: 0 },
				{ node: 'targetNode', type: NodeConnectionType.Main, index: 0 },
			];
			const testNode = createTestNode();

			const removeConnectionSpy = vi.spyOn(workflowsStore, 'removeConnection');
			vi.spyOn(workflowsStore, 'getNodeByName').mockReturnValue(testNode);
			vi.spyOn(workflowsStore, 'getNodeById').mockReturnValue(testNode);

			canvasOperations.revertCreateConnection(connection);

			expect(removeConnectionSpy).toHaveBeenCalled();
		});
	});

	describe('isConnectionAllowed', () => {
		it('should return false if source and target nodes are the same', () => {
			const node = mockNode({ id: '1', type: 'testType', name: 'Test Node' });
			expect(canvasOperations.isConnectionAllowed(node, node, NodeConnectionType.Main)).toBe(false);
		});

		it('should return false if target node type does not have inputs', () => {
			const sourceNode = mockNode({
				id: '1',
				type: 'sourceType',
				name: 'Source Node',
			});
			const targetNode = mockNode({
				id: '2',
				type: 'targetType',
				name: 'Target Node',
			});
			const nodeTypeDescription = mockNodeTypeDescription({
				name: 'targetType',
				inputs: [],
			});
			nodeTypesStore.setNodeTypes([nodeTypeDescription]);

			expect(
				canvasOperations.isConnectionAllowed(sourceNode, targetNode, NodeConnectionType.Main),
			).toBe(false);
		});

		it('should return false if target node does not exist in the workflow', () => {
			const sourceNode = mockNode({
				id: '1',
				type: 'sourceType',
				name: 'Source Node',
			});
			const targetNode = mockNode({
				id: '2',
				type: 'targetType',
				name: 'Target Node',
			});
			const nodeTypeDescription = mockNodeTypeDescription({
				name: 'targetType',
				inputs: [NodeConnectionType.Main],
			});
			nodeTypesStore.setNodeTypes([nodeTypeDescription]);

			expect(
				canvasOperations.isConnectionAllowed(sourceNode, targetNode, NodeConnectionType.Main),
			).toBe(false);
		});

		it('should return false if input type does not match connection type', () => {
			const sourceNode = mockNode({
				id: '1',
				type: 'sourceType',
				name: 'Source Node',
			});

			const targetNode = mockNode({
				id: '2',
				type: 'targetType',
				name: 'Target Node',
			});

			const nodeTypeDescription = mockNodeTypeDescription({
				name: 'targetType',
				inputs: [NodeConnectionType.AiTool],
			});

			nodeTypesStore.setNodeTypes([nodeTypeDescription]);
			canvasOperations.editableWorkflowObject.value.nodes[sourceNode.name] = sourceNode;
			canvasOperations.editableWorkflowObject.value.nodes[targetNode.name] = targetNode;

			expect(
				canvasOperations.isConnectionAllowed(sourceNode, targetNode, NodeConnectionType.Main),
			).toBe(false);
		});

		it('should return false if source node type is not allowed by target node input filter', () => {
			const sourceNode = mockNode({
				id: '1',
				type: 'sourceType',
				name: 'Source Node',
				typeVersion: 1,
			});

			const targetNode = mockNode({
				id: '2',
				type: 'targetType',
				name: 'Target Node',
				typeVersion: 1,
			});

			const nodeTypeDescription = mockNodeTypeDescription({
				name: 'targetType',
				inputs: [
					{
						type: NodeConnectionType.Main,
						filter: {
							nodes: ['allowedType'],
						},
					},
				],
			});

			nodeTypesStore.setNodeTypes([nodeTypeDescription]);
			canvasOperations.editableWorkflowObject.value.nodes[sourceNode.name] = sourceNode;
			canvasOperations.editableWorkflowObject.value.nodes[targetNode.name] = targetNode;

			expect(
				canvasOperations.isConnectionAllowed(sourceNode, targetNode, NodeConnectionType.Main),
			).toBe(false);
		});

		it('should return true if all conditions including filter are met', () => {
			const sourceNode = mockNode({
				id: '1',
				type: 'sourceType',
				name: 'Source Node',
				typeVersion: 1,
			});

			const targetNode = mockNode({
				id: '2',
				type: 'targetType',
				name: 'Target Node',
				typeVersion: 1,
			});

			const nodeTypeDescription = mockNodeTypeDescription({
				name: 'targetType',
				inputs: [
					{
						type: NodeConnectionType.Main,
						filter: {
							nodes: ['sourceType'],
						},
					},
				],
			});

			nodeTypesStore.setNodeTypes([nodeTypeDescription]);
			canvasOperations.editableWorkflowObject.value.nodes[sourceNode.name] = sourceNode;
			canvasOperations.editableWorkflowObject.value.nodes[targetNode.name] = targetNode;

			expect(
				canvasOperations.isConnectionAllowed(sourceNode, targetNode, NodeConnectionType.Main),
			).toBe(true);
		});

		it('should return true if all conditions are met and no filter is set', () => {
			const sourceNode = mockNode({
				id: '1',
				type: 'sourceType',
				name: 'Source Node',
				typeVersion: 1,
			});

			const targetNode = mockNode({
				id: '2',
				type: 'targetType',
				name: 'Target Node',
				typeVersion: 1,
			});

			const nodeTypeDescription = mockNodeTypeDescription({
				name: 'targetType',
				inputs: [
					{
						type: NodeConnectionType.Main,
					},
				],
			});

			nodeTypesStore.setNodeTypes([nodeTypeDescription]);
			canvasOperations.editableWorkflowObject.value.nodes[sourceNode.name] = sourceNode;
			canvasOperations.editableWorkflowObject.value.nodes[targetNode.name] = targetNode;

			expect(
				canvasOperations.isConnectionAllowed(sourceNode, targetNode, NodeConnectionType.Main),
			).toBe(true);
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

	describe('duplicateNodes', () => {
		it('should duplicate nodes', async () => {
			nodeTypesStore.setNodeTypes([mockNodeTypeDescription({ name: 'type' })]);
			const telemetrySpy = vi.spyOn(telemetry, 'track');

			const nodes = buildImportNodes();
			workflowsStore.setNodes(nodes);

			const duplicatedNodeIds = await canvasOperations.duplicateNodes(['1', '2']);
			expect(duplicatedNodeIds.length).toBe(2);
			expect(duplicatedNodeIds).not.toContain('1');
			expect(duplicatedNodeIds).not.toContain('2');
			expect(workflowsStore.workflow.nodes.length).toEqual(4);
			expect(telemetrySpy).toHaveBeenCalledWith(
				'User duplicated nodes',
				expect.objectContaining({ node_graph_string: expect.any(String), workflow_id: 'test' }),
			);
		});
	});

	describe('copyNodes', () => {
		it('should copy nodes', async () => {
			nodeTypesStore.setNodeTypes([mockNodeTypeDescription({ name: 'type' })]);
			const telemetrySpy = vi.spyOn(telemetry, 'track');
			const nodes = buildImportNodes();
			workflowsStore.setNodes(nodes);

			await canvasOperations.copyNodes(['1', '2']);
			expect(useClipboard().copy).toHaveBeenCalledTimes(1);
			expect(vi.mocked(useClipboard().copy).mock.calls).toMatchSnapshot();
			expect(telemetrySpy).toHaveBeenCalledWith(
				'User copied nodes',
				expect.objectContaining({ node_types: ['type', 'type'], workflow_id: 'test' }),
			);
		});
	});

	describe('cutNodes', () => {
		it('should copy and delete nodes', async () => {
			nodeTypesStore.setNodeTypes([mockNodeTypeDescription({ name: 'type' })]);
			const telemetrySpy = vi.spyOn(telemetry, 'track');
			const nodes = buildImportNodes();
			workflowsStore.setNodes(nodes);

			await canvasOperations.cutNodes(['1', '2']);
			expect(useClipboard().copy).toHaveBeenCalledTimes(1);
			expect(vi.mocked(useClipboard().copy).mock.calls).toMatchSnapshot();
			expect(telemetrySpy).toHaveBeenCalledWith(
				'User copied nodes',
				expect.objectContaining({ node_types: ['type', 'type'], workflow_id: 'test' }),
			);
			expect(workflowsStore.getNodes().length).toBe(0);
		});
	});
});

function buildImportNodes() {
	return [
		mockNode({ id: '1', name: 'Node 1', type: 'type' }),
		mockNode({ id: '2', name: 'Node 2', type: 'type' }),
	].map((node) => {
		// Setting position in mockNode will wrap it in a Proxy
		// This causes deepCopy to remove position -> set position after instead
		node.position = [40, 40];
		return node;
	});
}
