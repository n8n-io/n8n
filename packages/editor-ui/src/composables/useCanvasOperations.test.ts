import { setActivePinia } from 'pinia';
import type {
	IConnection,
	INodeTypeDescription,
	IWebhookDescription,
	Workflow,
	INodeConnections,
} from 'n8n-workflow';
import { NodeConnectionType, NodeHelpers } from 'n8n-workflow';
import { useCanvasOperations } from '@/composables/useCanvasOperations';
import type { CanvasConnection, CanvasNode } from '@/types';
import { CanvasConnectionMode } from '@/types';
import type { ICredentialsResponse, INodeUi, IWorkflowDb } from '@/Interface';
import { RemoveNodeCommand } from '@/models/history';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useUIStore } from '@/stores/ui.store';
import { useHistoryStore } from '@/stores/history.store';
import { useNDVStore } from '@/stores/ndv.store';
import {
	createTestNode,
	createTestWorkflow,
	createTestWorkflowObject,
	mockNode,
	mockNodeTypeDescription,
} from '@/__tests__/mocks';
import { useRouter } from 'vue-router';
import { mock } from 'vitest-mock-extended';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useCredentialsStore } from '@/stores/credentials.store';
import { waitFor } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import { mockedStore } from '@/__tests__/utils';
import {
	FORM_TRIGGER_NODE_TYPE,
	SET_NODE_TYPE,
	STICKY_NODE_TYPE,
	STORES,
	WEBHOOK_NODE_TYPE,
} from '@/constants';
import type { Connection } from '@vue-flow/core';
import { useClipboard } from '@/composables/useClipboard';
import { createCanvasConnectionHandleString } from '@/utils/canvasUtilsV2';

vi.mock('vue-router', async (importOriginal) => {
	const actual = await importOriginal<{}>();
	return {
		...actual,
		useRouter: () => ({}),
	};
});

vi.mock('n8n-workflow', async (importOriginal) => {
	const actual = await importOriginal<{}>();
	return {
		...actual,
		TelemetryHelpers: {
			generateNodesGraph: vi.fn().mockReturnValue({
				nodeGraph: {
					nodes: [],
				},
			}),
		},
	};
});

vi.mock('@/composables/useClipboard', async () => {
	const copySpy = vi.fn();
	return { useClipboard: vi.fn(() => ({ copy: copySpy })) };
});

vi.mock('@/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: vi.fn() }),
}));

describe('useCanvasOperations', () => {
	const router = useRouter();

	const workflowId = 'test';
	const initialState = {
		[STORES.NODE_TYPES]: {},
		[STORES.NDV]: {},
		[STORES.WORKFLOWS]: {
			workflowId,
			workflow: mock<IWorkflowDb>({
				id: workflowId,
				nodes: [],
				connections: {},
				tags: [],
				usedCredentials: [],
			}),
		},
		[STORES.SETTINGS]: {
			settings: {
				enterprise: {},
			},
		},
	};

	beforeEach(() => {
		vi.clearAllMocks();

		const pinia = createTestingPinia({ initialState });
		setActivePinia(pinia);
	});

	describe('requireNodeTypeDescription', () => {
		it('should return node type description when type and version match', () => {
			const nodeTypesStore = useNodeTypesStore();
			const type = 'testType';
			const version = 1;
			const expectedDescription = mockNodeTypeDescription({ name: type, version });

			nodeTypesStore.nodeTypes = { [type]: { [version]: expectedDescription } };

			const { requireNodeTypeDescription } = useCanvasOperations({ router });
			const result = requireNodeTypeDescription(type, version);

			expect(result).toBe(expectedDescription);
		});

		it('should return node type description when only type is provided and it exists', () => {
			const nodeTypesStore = useNodeTypesStore();
			const type = 'testTypeWithoutVersion';
			const expectedDescription = mockNodeTypeDescription({ name: type });

			nodeTypesStore.nodeTypes = { [type]: { 2: expectedDescription } };

			const { requireNodeTypeDescription } = useCanvasOperations({ router });
			const result = requireNodeTypeDescription(type);

			expect(result).toBe(expectedDescription);
		});

		it("should return placeholder node type description if node type doesn't exist", () => {
			const type = 'nonexistentType';

			const { requireNodeTypeDescription } = useCanvasOperations({ router });
			const result = requireNodeTypeDescription(type);

			expect(result).toEqual({
				name: type,
				displayName: type,
				description: '',
				defaults: {},
				group: [],
				inputs: [],
				outputs: [],
				properties: [],
				version: 1,
			});
		});
	});

	describe('addNode', () => {
		it('should create node with default version when version is undefined', () => {
			const { addNode } = useCanvasOperations({ router });
			const result = addNode(
				{
					name: 'example',
					type: 'type',
					typeVersion: 1,
				},
				mockNodeTypeDescription({ name: 'type' }),
			);

			expect(result.typeVersion).toBe(1);
		});

		it('should create node with default position when position is not provided', () => {
			const { addNode } = useCanvasOperations({ router });
			const result = addNode(
				{
					type: 'type',
					typeVersion: 1,
				},
				mockNodeTypeDescription({ name: 'type' }),
			);

			expect(result.position).toEqual([0, 0]); // Default last click position
		});

		it('should create node with provided position when position is provided', () => {
			const { addNode } = useCanvasOperations({ router });
			const result = addNode(
				{
					type: 'type',
					typeVersion: 1,
					position: [20, 20],
				},
				mockNodeTypeDescription({ name: 'type' }),
			);

			expect(result.position).toEqual([20, 20]);
		});

		it('should not assign credentials when multiple credentials are available', () => {
			const credentialsStore = useCredentialsStore();
			const credentialA = mock<ICredentialsResponse>({ id: '1', name: 'credA', type: 'cred' });
			const credentialB = mock<ICredentialsResponse>({ id: '1', name: 'credB', type: 'cred' });
			const nodeTypeName = 'type';
			const nodeTypeDescription = mockNodeTypeDescription({
				name: nodeTypeName,
				credentials: [{ name: credentialA.name }, { name: credentialB.name }],
			});

			// @ts-expect-error Known pinia issue when spying on store getters
			vi.spyOn(credentialsStore, 'getUsableCredentialByType', 'get').mockReturnValue(() => [
				credentialA,
				credentialB,
			]);

			const { addNode } = useCanvasOperations({ router });
			const result = addNode(
				{
					type: 'type',
					typeVersion: 1,
				},
				nodeTypeDescription,
			);
			expect(result.credentials).toBeUndefined();
		});

		it('should open NDV when specified', async () => {
			const ndvStore = useNDVStore();
			const nodeTypeDescription = mockNodeTypeDescription({ name: 'type' });

			const { addNode } = useCanvasOperations({ router });
			addNode(
				{
					type: 'type',
					typeVersion: 1,
					name: 'Test Name',
				},
				nodeTypeDescription,
				{ openNDV: true },
			);

			await waitFor(() => expect(ndvStore.setActiveNodeName).toHaveBeenCalledWith('Test Name'));
		});

		it('should not set sticky node type as active node', async () => {
			const ndvStore = useNDVStore();
			const nodeTypeDescription = mockNodeTypeDescription({ name: STICKY_NODE_TYPE });

			const { addNode } = useCanvasOperations({ router });
			addNode(
				{
					type: STICKY_NODE_TYPE,
					typeVersion: 1,
					name: 'Test Name',
				},
				nodeTypeDescription,
				{ openNDV: true },
			);

			await waitFor(() => expect(ndvStore.setActiveNodeName).not.toHaveBeenCalled());
		});
	});

	describe('resolveNodePosition', () => {
		it('should return the node position if it is already set', () => {
			const node = createTestNode({ position: [100, 100] });
			const nodeTypeDescription = mockNodeTypeDescription();

			const { resolveNodePosition } = useCanvasOperations({ router });
			const position = resolveNodePosition(node, nodeTypeDescription);

			expect(position).toEqual([100, 100]);
		});

		it('should place the node at the last cancelled connection position', () => {
			const uiStore = mockedStore(useUIStore);
			const workflowsStore = mockedStore(useWorkflowsStore);
			const nodeTypesStore = mockedStore(useNodeTypesStore);
			const node = createTestNode({ id: '0' });
			const nodeTypeDescription = mockNodeTypeDescription();

			vi.spyOn(uiStore, 'lastInteractedWithNode', 'get').mockReturnValue(node);
			nodeTypesStore.getNodeType = vi.fn().mockReturnValue(nodeTypeDescription);
			workflowsStore.getCurrentWorkflow.mockReturnValue(
				createTestWorkflowObject(workflowsStore.workflow),
			);

			uiStore.lastInteractedWithNodeHandle = 'inputs/main/0';
			uiStore.lastCancelledConnectionPosition = [200, 200];

			const { resolveNodePosition } = useCanvasOperations({ router });
			const position = resolveNodePosition({ ...node, position: undefined }, nodeTypeDescription);

			expect(position).toEqual([200, 160]);
			expect(uiStore.lastCancelledConnectionPosition).toBeUndefined();
		});

		it('should place the node to the right of the last interacted with node', () => {
			const uiStore = mockedStore(useUIStore);
			const workflowsStore = mockedStore(useWorkflowsStore);
			const nodeTypesStore = mockedStore(useNodeTypesStore);

			const node = createTestNode({ id: '0' });
			const nodeTypeDescription = mockNodeTypeDescription();
			const workflowObject = createTestWorkflowObject(workflowsStore.workflow);

			uiStore.lastInteractedWithNode = createTestNode({
				position: [100, 100],
				type: 'test',
				typeVersion: 1,
			});
			nodeTypesStore.getNodeType = vi.fn().mockReturnValue(nodeTypeDescription);
			workflowsStore.getCurrentWorkflow.mockReturnValue(workflowObject);
			workflowObject.getNode = vi.fn().mockReturnValue(node);

			const { resolveNodePosition } = useCanvasOperations({ router });
			const position = resolveNodePosition({ ...node, position: undefined }, nodeTypeDescription);

			expect(position).toEqual([320, 100]);
		});

		it('should place the node below the last interacted with node if it has non-main outputs', () => {
			const uiStore = mockedStore(useUIStore);
			const workflowsStore = mockedStore(useWorkflowsStore);
			const nodeTypesStore = mockedStore(useNodeTypesStore);

			const node = createTestNode({ id: '0' });
			const nodeTypeDescription = mockNodeTypeDescription();
			const workflowObject = createTestWorkflowObject(workflowsStore.workflow);

			uiStore.lastInteractedWithNode = createTestNode({
				position: [100, 100],
				type: 'test',
				typeVersion: 1,
			});
			nodeTypesStore.getNodeType = vi.fn().mockReturnValue(nodeTypeDescription);
			workflowsStore.getCurrentWorkflow.mockReturnValue(workflowObject);
			workflowObject.getNode = vi.fn().mockReturnValue(node);

			vi.spyOn(NodeHelpers, 'getNodeOutputs').mockReturnValueOnce([
				{ type: NodeConnectionType.AiTool },
			]);
			vi.spyOn(NodeHelpers, 'getConnectionTypes')
				.mockReturnValueOnce([NodeConnectionType.AiTool])
				.mockReturnValueOnce([NodeConnectionType.AiTool]);

			const { resolveNodePosition } = useCanvasOperations({ router });
			const position = resolveNodePosition({ ...node, position: undefined }, nodeTypeDescription);

			expect(position).toEqual([460, 100]);
		});

		it('should place the node at the last clicked position if no other position is set', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);

			const node = createTestNode({ id: '0' });
			const nodeTypeDescription = mockNodeTypeDescription();

			workflowsStore.workflowTriggerNodes = [
				createTestNode({ id: 'trigger', position: [100, 100] }),
			];

			const { resolveNodePosition, lastClickPosition } = useCanvasOperations({ router });
			lastClickPosition.value = [300, 300];

			const position = resolveNodePosition({ ...node, position: undefined }, nodeTypeDescription);

			expect(position).toEqual([300, 300]);
		});

		it('should place the trigger node at the root if it is the first trigger node', () => {
			const node = createTestNode({ id: '0' });
			const nodeTypeDescription = mockNodeTypeDescription();

			const { resolveNodePosition } = useCanvasOperations({ router });
			const position = resolveNodePosition({ ...node, position: undefined }, nodeTypeDescription);

			expect(position).toEqual([0, 0]);
		});
	});

	describe('updateNodesPosition', () => {
		it('records history for multiple node position updates when tracking is enabled', () => {
			const historyStore = useHistoryStore();
			const events = [
				{ id: 'node1', position: { x: 100, y: 100 } },
				{ id: 'node2', position: { x: 200, y: 200 } },
			];
			const startRecordingUndoSpy = vi.spyOn(historyStore, 'startRecordingUndo');
			const stopRecordingUndoSpy = vi.spyOn(historyStore, 'stopRecordingUndo');

			const { updateNodesPosition } = useCanvasOperations({ router });
			updateNodesPosition(events, { trackHistory: true, trackBulk: true });

			expect(startRecordingUndoSpy).toHaveBeenCalled();
			expect(stopRecordingUndoSpy).toHaveBeenCalled();
		});

		it('updates positions for multiple nodes', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const events = [
				{ id: 'node1', position: { x: 100, y: 100 } },
				{ id: 'node2', position: { x: 200, y: 200 } },
			];
			const setNodePositionByIdSpy = vi.spyOn(workflowsStore, 'setNodePositionById');
			workflowsStore.getNodeById
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

			const { updateNodesPosition } = useCanvasOperations({ router });
			updateNodesPosition(events);

			expect(setNodePositionByIdSpy).toHaveBeenCalledTimes(2);
			expect(setNodePositionByIdSpy).toHaveBeenCalledWith('node1', [100, 100]);
			expect(setNodePositionByIdSpy).toHaveBeenCalledWith('node2', [200, 200]);
		});

		it('does not record history when trackHistory is false', () => {
			const historyStore = useHistoryStore();
			const events = [{ id: 'node1', position: { x: 100, y: 100 } }];
			const startRecordingUndoSpy = vi.spyOn(historyStore, 'startRecordingUndo');
			const stopRecordingUndoSpy = vi.spyOn(historyStore, 'stopRecordingUndo');

			const { updateNodesPosition } = useCanvasOperations({ router });
			updateNodesPosition(events, { trackHistory: false, trackBulk: false });

			expect(startRecordingUndoSpy).not.toHaveBeenCalled();
			expect(stopRecordingUndoSpy).not.toHaveBeenCalled();
		});
	});

	describe('updateNodePosition', () => {
		it('should update node position', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const id = 'node1';
			const position: CanvasNode['position'] = { x: 10, y: 20 };
			const node = createTestNode({
				id,
				type: 'node',
				position: [0, 0],
				name: 'Node 1',
			});

			workflowsStore.getNodeById.mockReturnValueOnce(node);

			const { updateNodePosition } = useCanvasOperations({ router });
			updateNodePosition(id, position);

			expect(workflowsStore.setNodePositionById).toHaveBeenCalledWith(id, [position.x, position.y]);
		});
	});

	describe('setNodeSelected', () => {
		it('should set last selected node when node id is provided and node exists', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const uiStore = useUIStore();
			const nodeId = 'node1';
			const nodeName = 'Node 1';
			workflowsStore.getNodeById = vi.fn().mockReturnValue({ name: nodeName });
			uiStore.lastSelectedNode = '';

			const { setNodeSelected } = useCanvasOperations({ router });
			setNodeSelected(nodeId);

			expect(uiStore.lastSelectedNode).toBe(nodeName);
		});

		it('should not change last selected node when node id is provided but node does not exist', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const uiStore = useUIStore();
			const nodeId = 'node1';
			workflowsStore.getNodeById = vi.fn().mockReturnValue(undefined);
			uiStore.lastSelectedNode = 'Existing Node';

			const { setNodeSelected } = useCanvasOperations({ router });
			setNodeSelected(nodeId);

			expect(uiStore.lastSelectedNode).toBe('Existing Node');
		});

		it('should clear last selected node when node id is not provided', () => {
			const uiStore = useUIStore();
			uiStore.lastSelectedNode = 'Existing Node';

			const { setNodeSelected } = useCanvasOperations({ router });
			setNodeSelected();

			expect(uiStore.lastSelectedNode).toBe('');
		});
	});

	describe('addNodes', () => {
		it('should add nodes at specified positions', async () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const nodeTypesStore = useNodeTypesStore();
			const nodeTypeName = 'type';
			const nodes = [
				mockNode({ name: 'Node 1', type: nodeTypeName, position: [30, 40] }),
				mockNode({ name: 'Node 2', type: nodeTypeName, position: [100, 240] }),
			];

			workflowsStore.getCurrentWorkflow.mockReturnValue(
				createTestWorkflowObject(workflowsStore.workflow),
			);

			nodeTypesStore.nodeTypes = {
				[nodeTypeName]: { 1: mockNodeTypeDescription({ name: nodeTypeName }) },
			};

			const { addNodes } = useCanvasOperations({ router });
			await addNodes(nodes, {});

			expect(workflowsStore.addNode).toHaveBeenCalledTimes(2);
			expect(workflowsStore.addNode.mock.calls[0][0]).toMatchObject({
				name: nodes[0].name,
				type: nodeTypeName,
				typeVersion: 1,
				position: [40, 40],
				parameters: {},
			});
			expect(workflowsStore.addNode.mock.calls[1][0]).toMatchObject({
				name: nodes[1].name,
				type: nodeTypeName,
				typeVersion: 1,
				position: [100, 240],
				parameters: {},
			});
		});

		it('should add nodes at current position when position is not specified', async () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const nodeTypesStore = mockedStore(useNodeTypesStore);
			const nodeTypeName = 'type';
			const nodes = [
				mockNode({ name: 'Node 1', type: nodeTypeName, position: [120, 120] }),
				mockNode({ name: 'Node 2', type: nodeTypeName, position: [180, 320] }),
			];

			workflowsStore.getCurrentWorkflow.mockReturnValue(
				createTestWorkflowObject(workflowsStore.workflow),
			);

			nodeTypesStore.nodeTypes = {
				[nodeTypeName]: { 1: mockNodeTypeDescription({ name: nodeTypeName }) },
			};

			const { addNodes } = useCanvasOperations({ router });
			await addNodes(nodes, { position: [50, 60] });

			expect(workflowsStore.addNode).toHaveBeenCalledTimes(2);
			expect(workflowsStore.addNode.mock.calls[0][0].position).toEqual(
				expect.arrayContaining(nodes[0].position),
			);
			expect(workflowsStore.addNode.mock.calls[1][0].position).toEqual(
				expect.arrayContaining(nodes[1].position),
			);
		});

		it('should adjust the position of nodes with multiple inputs', async () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const nodeTypesStore = useNodeTypesStore();
			const nodeTypeName = 'type';
			const nodes = [
				mockNode({ id: 'a', name: 'Node A', type: nodeTypeName, position: [40, 40] }),
				mockNode({ id: 'b', name: 'Node B', type: nodeTypeName, position: [40, 40] }),
				mockNode({ id: 'c', name: 'Node C', type: nodeTypeName, position: [100, 240] }),
			];

			const setNodePositionByIdSpy = vi.spyOn(workflowsStore, 'setNodePositionById');
			workflowsStore.getNodeByName.mockReturnValueOnce(nodes[1]).mockReturnValueOnce(nodes[2]);
			workflowsStore.getNodeById.mockReturnValueOnce(nodes[1]).mockReturnValueOnce(nodes[2]);

			nodeTypesStore.nodeTypes = {
				[nodeTypeName]: { 1: mockNodeTypeDescription({ name: nodeTypeName }) },
			};

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

			const { addNodes } = useCanvasOperations({ router });
			await addNodes(nodes, {});

			expect(setNodePositionByIdSpy).toHaveBeenCalledTimes(2);
			expect(setNodePositionByIdSpy).toHaveBeenCalledWith(nodes[1].id, expect.any(Object));
			expect(setNodePositionByIdSpy).toHaveBeenCalledWith(nodes[2].id, expect.any(Object));
		});

		it('should return newly added nodes', async () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const nodeTypesStore = useNodeTypesStore();
			const nodeTypeName = 'type';
			const nodes = [
				mockNode({ name: 'Node 1', type: nodeTypeName, position: [30, 40] }),
				mockNode({ name: 'Node 2', type: nodeTypeName, position: [100, 240] }),
			];

			workflowsStore.getCurrentWorkflow.mockReturnValue(
				createTestWorkflowObject(workflowsStore.workflow),
			);

			nodeTypesStore.nodeTypes = {
				[nodeTypeName]: { 1: mockNodeTypeDescription({ name: nodeTypeName }) },
			};

			const { addNodes } = useCanvasOperations({ router });
			const added = await addNodes(nodes, {});
			expect(added.length).toBe(2);
		});

		it('should mark UI state as dirty', async () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const uiStore = mockedStore(useUIStore);
			const nodeTypesStore = useNodeTypesStore();
			const nodeTypeName = 'type';
			const nodes = [mockNode({ name: 'Node 1', type: nodeTypeName, position: [30, 40] })];

			workflowsStore.getCurrentWorkflow.mockReturnValue(
				createTestWorkflowObject(workflowsStore.workflow),
			);

			nodeTypesStore.nodeTypes = {
				[nodeTypeName]: { 1: mockNodeTypeDescription({ name: nodeTypeName }) },
			};

			const { addNodes } = useCanvasOperations({ router });
			await addNodes(nodes, { keepPristine: false });

			expect(uiStore.stateIsDirty).toEqual(true);
		});

		it('should not mark UI state as dirty if keepPristine is true', async () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const uiStore = mockedStore(useUIStore);
			const nodeTypesStore = useNodeTypesStore();
			const nodeTypeName = 'type';
			const nodes = [mockNode({ name: 'Node 1', type: nodeTypeName, position: [30, 40] })];

			workflowsStore.getCurrentWorkflow.mockReturnValue(
				createTestWorkflowObject(workflowsStore.workflow),
			);

			nodeTypesStore.nodeTypes = {
				[nodeTypeName]: { 1: mockNodeTypeDescription({ name: nodeTypeName }) },
			};

			const { addNodes } = useCanvasOperations({ router });
			await addNodes(nodes, { keepPristine: true });

			expect(uiStore.stateIsDirty).toEqual(false);
		});
	});

	describe('revertAddNode', () => {
		it('deletes node if it exists', async () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const node = createTestNode();
			workflowsStore.getNodeByName.mockReturnValueOnce(node);
			workflowsStore.getNodeById.mockReturnValueOnce(node);
			const removeNodeByIdSpy = vi.spyOn(workflowsStore, 'removeNodeById');

			const { revertAddNode } = useCanvasOperations({ router });
			await revertAddNode(node.name);

			expect(removeNodeByIdSpy).toHaveBeenCalledWith(node.id);
		});
	});

	describe('deleteNode', () => {
		it('should delete node and track history', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const historyStore = mockedStore(useHistoryStore);
			const workflowObject = createTestWorkflowObject(workflowsStore.workflow);

			workflowsStore.getCurrentWorkflow.mockReturnValue(workflowObject);
			workflowsStore.incomingConnectionsByNodeName.mockReturnValue({});

			const id = 'node1';
			const node: INodeUi = createTestNode({
				id,
				type: 'node',
				position: [10, 20],
				name: 'Node 1',
			});

			workflowsStore.getNodeById.mockReturnValue(node);

			const { deleteNode } = useCanvasOperations({ router });
			deleteNode(id, { trackHistory: true });

			expect(workflowsStore.removeNodeById).toHaveBeenCalledWith(id);
			expect(workflowsStore.removeNodeExecutionDataById).toHaveBeenCalledWith(id);
			expect(historyStore.pushCommandToUndo).toHaveBeenCalledWith(new RemoveNodeCommand(node));
		});

		it('should delete node without tracking history', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const historyStore = mockedStore(useHistoryStore);
			const workflowObject = createTestWorkflowObject(workflowsStore.workflow);

			workflowsStore.getCurrentWorkflow.mockReturnValue(workflowObject);
			workflowsStore.incomingConnectionsByNodeName.mockReturnValue({});

			const id = 'node1';
			const node = createTestNode({
				id,
				type: 'node',
				position: [10, 20],
				name: 'Node 1',
				parameters: {},
			});

			workflowsStore.getNodeById.mockReturnValue(node);

			const { deleteNode } = useCanvasOperations({ router });
			deleteNode(id, { trackHistory: false });

			expect(workflowsStore.removeNodeById).toHaveBeenCalledWith(id);
			expect(workflowsStore.removeNodeExecutionDataById).toHaveBeenCalledWith(id);
			expect(historyStore.pushCommandToUndo).not.toHaveBeenCalled();
		});

		it('should connect adjacent nodes when deleting a node surrounded by other nodes', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const nodeTypesStore = mockedStore(useNodeTypesStore);

			nodeTypesStore.nodeTypes = {
				[SET_NODE_TYPE]: { 1: mockNodeTypeDescription({ name: SET_NODE_TYPE }) },
			};

			const nodes = [
				createTestNode({
					id: 'input',
					type: SET_NODE_TYPE,
					position: [10, 20],
					name: 'Input Node',
				}),
				createTestNode({
					id: 'middle',
					type: SET_NODE_TYPE,
					position: [10, 20],
					name: 'Middle Node',
				}),
				createTestNode({
					id: 'output',
					type: SET_NODE_TYPE,
					position: [10, 20],
					name: 'Output Node',
				}),
			];

			workflowsStore.workflow.nodes = nodes;
			workflowsStore.workflow.connections = {
				[nodes[0].name]: {
					main: [
						[
							{
								node: nodes[1].name,
								type: NodeConnectionType.Main,
								index: 0,
							},
						],
					],
				},
				[nodes[1].name]: {
					main: [
						[
							{
								node: nodes[2].name,
								type: NodeConnectionType.Main,
								index: 0,
							},
						],
					],
				},
			};

			const workflowObject = createTestWorkflowObject(workflowsStore.workflow);
			workflowsStore.getCurrentWorkflow.mockReturnValue(workflowObject);
			workflowsStore.incomingConnectionsByNodeName.mockReturnValue({});

			workflowsStore.getNodeById.mockReturnValue(nodes[1]);

			const { deleteNode } = useCanvasOperations({ router });
			deleteNode(nodes[1].id);

			expect(workflowsStore.removeNodeById).toHaveBeenCalledWith(nodes[1].id);
			expect(workflowsStore.removeNodeExecutionDataById).toHaveBeenCalledWith(nodes[1].id);
			expect(workflowsStore.removeNodeById).toHaveBeenCalledWith(nodes[1].id);
		});
	});

	describe('revertDeleteNode', () => {
		it('should revert delete node', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);

			const node = createTestNode({
				id: 'node1',
				type: 'node',
				position: [10, 20],
				name: 'Node 1',
				parameters: {},
			});

			const { revertDeleteNode } = useCanvasOperations({ router });
			revertDeleteNode(node);

			expect(workflowsStore.addNode).toHaveBeenCalledWith(node);
		});
	});

	describe('renameNode', () => {
		it('should rename node', async () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const ndvStore = mockedStore(useNDVStore);
			const oldName = 'Old Node';
			const newName = 'New Node';

			const workflowObject = createTestWorkflowObject();
			workflowObject.renameNode = vi.fn();
			workflowsStore.getCurrentWorkflow.mockReturnValue(workflowObject);
			workflowsStore.getNodeByName = vi.fn().mockReturnValue({ name: oldName });
			ndvStore.activeNodeName = oldName;

			const { renameNode } = useCanvasOperations({ router });
			await renameNode(oldName, newName);

			expect(workflowObject.renameNode).toHaveBeenCalledWith(oldName, newName);
			expect(ndvStore.activeNodeName).toBe(newName);
		});

		it('should not rename node when new name is same as old name', async () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const ndvStore = mockedStore(useNDVStore);
			const oldName = 'Old Node';
			workflowsStore.getNodeByName = vi.fn().mockReturnValue({ name: oldName });
			ndvStore.activeNodeName = oldName;

			const { renameNode } = useCanvasOperations({ router });
			await renameNode(oldName, oldName);

			expect(ndvStore.activeNodeName).toBe(oldName);
		});
	});

	describe('revertRenameNode', () => {
		it('should revert node renaming', async () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const ndvStore = mockedStore(useNDVStore);
			const oldName = 'Old Node';
			const currentName = 'New Node';

			const workflowObject = createTestWorkflowObject();
			workflowObject.renameNode = vi.fn();
			workflowsStore.getCurrentWorkflow.mockReturnValue(workflowObject);
			workflowsStore.getNodeByName = vi.fn().mockReturnValue({ name: currentName });
			ndvStore.activeNodeName = currentName;

			const { revertRenameNode } = useCanvasOperations({ router });
			await revertRenameNode(currentName, oldName);

			expect(ndvStore.activeNodeName).toBe(oldName);
		});

		it('should not revert node renaming when old name is same as new name', async () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const ndvStore = mockedStore(useNDVStore);
			const oldName = 'Old Node';
			workflowsStore.getNodeByName = vi.fn().mockReturnValue({ name: oldName });
			ndvStore.activeNodeName = oldName;

			const { revertRenameNode } = useCanvasOperations({ router });
			await revertRenameNode(oldName, oldName);

			expect(ndvStore.activeNodeName).toBe(oldName);
		});
	});

	describe('setNodeActive', () => {
		it('should set active node name when node exists', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const ndvStore = mockedStore(useNDVStore);
			const nodeId = 'node1';
			const nodeName = 'Node 1';
			workflowsStore.getNodeById = vi.fn().mockReturnValue({ name: nodeName });
			ndvStore.activeNodeName = '';

			const { setNodeActive } = useCanvasOperations({ router });
			setNodeActive(nodeId);

			expect(ndvStore.activeNodeName).toBe(nodeName);
		});

		it('should not change active node name when node does not exist', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const ndvStore = mockedStore(useNDVStore);
			const nodeId = 'node1';
			workflowsStore.getNodeById = vi.fn().mockReturnValue(undefined);
			ndvStore.activeNodeName = 'Existing Node';

			const { setNodeActive } = useCanvasOperations({ router });
			setNodeActive(nodeId);

			expect(ndvStore.activeNodeName).toBe('Existing Node');
		});
	});

	describe('setNodeActiveByName', () => {
		it('should set active node name', () => {
			const ndvStore = useNDVStore();
			const nodeName = 'Node 1';
			ndvStore.activeNodeName = '';

			const { setNodeActiveByName } = useCanvasOperations({ router });
			setNodeActiveByName(nodeName);

			expect(ndvStore.activeNodeName).toBe(nodeName);
		});
	});

	describe('toggleNodesDisabled', () => {
		it('disables nodes based on provided ids', async () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const nodes = [
				createTestNode({ id: '1', name: 'A' }),
				createTestNode({ id: '2', name: 'B' }),
			];
			workflowsStore.getNodesByIds.mockReturnValue(nodes);

			const { toggleNodesDisabled } = useCanvasOperations({ router });
			toggleNodesDisabled([nodes[0].id, nodes[1].id], {
				trackHistory: true,
				trackBulk: true,
			});

			expect(workflowsStore.updateNodeProperties).toHaveBeenCalledWith({
				name: nodes[0].name,
				properties: {
					disabled: true,
				},
			});
		});
	});

	describe('revertToggleNodeDisabled', () => {
		it('re-enables a previously disabled node', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const nodeName = 'testNode';
			const node = createTestNode({ name: nodeName });
			workflowsStore.getNodeByName.mockReturnValue(node);
			const updateNodePropertiesSpy = vi.spyOn(workflowsStore, 'updateNodeProperties');

			const { revertToggleNodeDisabled } = useCanvasOperations({ router });
			revertToggleNodeDisabled(nodeName);

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
			const workflowsStore = mockedStore(useWorkflowsStore);
			const nodeTypesStore = mockedStore(useNodeTypesStore);
			const nodeTypeName = SET_NODE_TYPE;
			const nodeType = mockNodeTypeDescription({
				name: nodeTypeName,
				inputs: [NodeConnectionType.Main],
				outputs: [NodeConnectionType.Main],
			});
			const nodes = [
				mockNode({ id: 'a', name: 'Node A', type: nodeTypeName, position: [40, 40] }),
				mockNode({ id: 'b', name: 'Node B', type: nodeTypeName, position: [40, 40] }),
				mockNode({ id: 'c', name: 'Node C', type: nodeTypeName, position: [40, 40] }),
			];
			const connections = [
				{
					source: nodes[0].id,
					sourceHandle: createCanvasConnectionHandleString({
						mode: CanvasConnectionMode.Output,
						index: 0,
						type: NodeConnectionType.Main,
					}),
					target: nodes[1].id,
					targetHandle: createCanvasConnectionHandleString({
						mode: CanvasConnectionMode.Input,
						index: 0,
						type: NodeConnectionType.Main,
					}),
					data: {
						source: { type: NodeConnectionType.Main, index: 0 },
						target: { type: NodeConnectionType.Main, index: 0 },
					},
				},
				{
					source: nodes[1].id,
					sourceHandle: createCanvasConnectionHandleString({
						mode: CanvasConnectionMode.Output,
						index: 0,
						type: NodeConnectionType.Main,
					}),
					target: nodes[2].id,
					targetHandle: createCanvasConnectionHandleString({
						mode: CanvasConnectionMode.Input,
						index: 0,
						type: NodeConnectionType.Main,
					}),
					data: {
						source: { type: NodeConnectionType.Main, index: 0 },
						target: { type: NodeConnectionType.Main, index: 0 },
					},
				},
			];

			workflowsStore.workflow.nodes = nodes;
			nodeTypesStore.nodeTypes = {
				[nodeTypeName]: { 1: nodeType },
			};

			const workflowObject = createTestWorkflowObject(workflowsStore.workflow);
			workflowsStore.getCurrentWorkflow.mockReturnValue(workflowObject);
			workflowsStore.getNodeById.mockReturnValueOnce(nodes[0]).mockReturnValueOnce(nodes[1]);
			nodeTypesStore.getNodeType = vi.fn().mockReturnValue(nodeType);

			const { addConnections } = useCanvasOperations({ router });
			await addConnections(connections);

			expect(workflowsStore.addConnection).toHaveBeenCalledWith({
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

		it('should set UI state as dirty', async () => {
			const uiStore = mockedStore(useUIStore);
			const connections: CanvasConnection[] = [];

			const { addConnections } = useCanvasOperations({ router });
			await addConnections(connections, { keepPristine: false });

			expect(uiStore.stateIsDirty).toBe(true);
		});

		it('should not set UI state as dirty if keepPristine is true', async () => {
			const uiStore = mockedStore(useUIStore);
			const connections: CanvasConnection[] = [];

			const { addConnections } = useCanvasOperations({ router });
			await addConnections(connections, { keepPristine: true });

			expect(uiStore.stateIsDirty).toBe(false);
		});
	});

	describe('createConnection', () => {
		it('should not create a connection if source node does not exist', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const uiStore = mockedStore(useUIStore);
			const connection: Connection = { source: 'nonexistent', target: 'targetNode' };

			workflowsStore.getNodeById.mockReturnValueOnce(undefined);

			const { createConnection } = useCanvasOperations({ router });
			createConnection(connection);

			expect(workflowsStore.addConnection).not.toHaveBeenCalled();
			expect(uiStore.stateIsDirty).toBe(false);
		});

		it('should not create a connection if target node does not exist', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const uiStore = mockedStore(useUIStore);
			const connection: Connection = { source: 'sourceNode', target: 'nonexistent' };

			workflowsStore.getNodeById
				.mockReturnValueOnce(createTestNode())
				.mockReturnValueOnce(undefined);

			const { createConnection } = useCanvasOperations({ router });
			createConnection(connection);

			expect(workflowsStore.addConnection).not.toHaveBeenCalled();
			expect(uiStore.stateIsDirty).toBe(false);
		});

		it('should create a connection if source and target nodes exist and connection is allowed', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const uiStore = mockedStore(useUIStore);
			const nodeTypesStore = mockedStore(useNodeTypesStore);

			const nodeTypeDescription = mockNodeTypeDescription({
				name: SET_NODE_TYPE,
				inputs: [NodeConnectionType.Main],
				outputs: [NodeConnectionType.Main],
			});

			const nodeA = createTestNode({
				id: 'a',
				type: nodeTypeDescription.name,
				name: 'Node A',
			});

			const nodeB = createTestNode({
				id: 'b',
				type: nodeTypeDescription.name,
				name: 'Node B',
			});

			const connection: Connection = {
				source: nodeA.id,
				sourceHandle: `outputs/${NodeConnectionType.Main}/0`,
				target: nodeB.id,
				targetHandle: `inputs/${NodeConnectionType.Main}/0`,
			};

			nodeTypesStore.nodeTypes = {
				node: { 1: nodeTypeDescription },
			};

			workflowsStore.workflow.nodes = [nodeA, nodeB];
			workflowsStore.getNodeById.mockReturnValueOnce(nodeA).mockReturnValueOnce(nodeB);
			nodeTypesStore.getNodeType = vi.fn().mockReturnValue(nodeTypeDescription);

			const workflowObject = createTestWorkflowObject(workflowsStore.workflow);
			workflowsStore.getCurrentWorkflow.mockReturnValue(workflowObject);

			const { createConnection, editableWorkflowObject } = useCanvasOperations({ router });

			editableWorkflowObject.value.nodes[nodeA.name] = nodeA;
			editableWorkflowObject.value.nodes[nodeB.name] = nodeB;

			createConnection(connection);

			expect(workflowsStore.addConnection).toHaveBeenCalledWith({
				connection: [
					{ index: 0, node: nodeA.name, type: NodeConnectionType.Main },
					{ index: 0, node: nodeB.name, type: NodeConnectionType.Main },
				],
			});
			expect(uiStore.stateIsDirty).toBe(true);
		});

		it('should not set UI state as dirty if keepPristine is true', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const uiStore = mockedStore(useUIStore);
			const nodeTypesStore = mockedStore(useNodeTypesStore);

			const nodeTypeDescription = mockNodeTypeDescription({
				name: SET_NODE_TYPE,
				inputs: [NodeConnectionType.Main],
				outputs: [NodeConnectionType.Main],
			});

			const nodeA = createTestNode({
				id: 'a',
				type: nodeTypeDescription.name,
				name: 'Node A',
			});

			const nodeB = createTestNode({
				id: 'b',
				type: nodeTypeDescription.name,
				name: 'Node B',
			});

			const connection: Connection = {
				source: nodeA.id,
				sourceHandle: `outputs/${NodeConnectionType.Main}/0`,
				target: nodeB.id,
				targetHandle: `inputs/${NodeConnectionType.Main}/0`,
			};

			nodeTypesStore.nodeTypes = {
				node: { 1: nodeTypeDescription },
			};

			workflowsStore.workflow.nodes = [nodeA, nodeB];
			workflowsStore.getNodeById.mockReturnValueOnce(nodeA).mockReturnValueOnce(nodeB);
			nodeTypesStore.getNodeType = vi.fn().mockReturnValue(nodeTypeDescription);

			const workflowObject = createTestWorkflowObject(workflowsStore.workflow);
			workflowsStore.getCurrentWorkflow.mockReturnValue(workflowObject);

			const { createConnection, editableWorkflowObject } = useCanvasOperations({ router });

			editableWorkflowObject.value.nodes[nodeA.name] = nodeA;
			editableWorkflowObject.value.nodes[nodeB.name] = nodeB;

			createConnection(connection, { keepPristine: true });

			expect(uiStore.stateIsDirty).toBe(false);
		});
	});

	describe('revertCreateConnection', () => {
		it('deletes connection if both source and target nodes exist', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const connection: [IConnection, IConnection] = [
				{ node: 'sourceNode', type: NodeConnectionType.Main, index: 0 },
				{ node: 'targetNode', type: NodeConnectionType.Main, index: 0 },
			];
			const testNode = createTestNode();

			workflowsStore.getNodeByName.mockReturnValue(testNode);
			workflowsStore.getNodeById.mockReturnValue(testNode);

			const { revertCreateConnection } = useCanvasOperations({ router });
			revertCreateConnection(connection);

			expect(workflowsStore.removeConnection).toHaveBeenCalled();
		});
	});

	describe('isConnectionAllowed', () => {
		it('should return false if target node type does not have inputs', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const nodeTypesStore = mockedStore(useNodeTypesStore);
			const sourceNode = mockNode({
				id: '1',
				type: 'sourceType',
				name: 'Source Node',
			});
			const sourceNodeTypeDescription = mockNodeTypeDescription({
				name: sourceNode.type,
				outputs: [],
			});
			const sourceHandle: IConnection = {
				node: sourceNode.name,
				type: NodeConnectionType.Main,
				index: 0,
			};
			const targetNode = mockNode({
				id: '2',
				type: 'targetType',
				name: 'Target Node',
			});
			const targetNodeTypeDescription = mockNodeTypeDescription({
				name: targetNode.type,
				inputs: [],
			});
			const targetHandle: IConnection = {
				node: targetNode.name,
				type: NodeConnectionType.Main,
				index: 0,
			};

			const workflowObject = createTestWorkflowObject(workflowsStore.workflow);
			workflowsStore.getCurrentWorkflow.mockReturnValue(workflowObject);

			nodeTypesStore.getNodeType = vi.fn(
				(nodeTypeName: string) =>
					({
						[sourceNode.type]: sourceNodeTypeDescription,
						[targetNode.type]: targetNodeTypeDescription,
					})[nodeTypeName],
			);

			const { isConnectionAllowed } = useCanvasOperations({ router });
			expect(isConnectionAllowed(sourceNode, targetNode, sourceHandle, targetHandle)).toBe(false);
		});

		it('should return false if target node does not exist in the workflow', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const nodeTypesStore = mockedStore(useNodeTypesStore);

			const sourceNode = mockNode({
				id: '1',
				type: 'sourceType',
				name: 'Source Node',
			});
			const sourceNodeTypeDescription = mockNodeTypeDescription({
				name: sourceNode.type,
				outputs: [],
			});
			const sourceHandle: IConnection = {
				node: sourceNode.name,
				type: NodeConnectionType.Main,
				index: 0,
			};
			const targetNode = mockNode({
				id: '2',
				type: 'targetType',
				name: 'Target Node',
			});
			const targetNodeTypeDescription = mockNodeTypeDescription({
				name: targetNode.type,
				inputs: [NodeConnectionType.Main],
			});
			const targetHandle: IConnection = {
				node: targetNode.name,
				type: NodeConnectionType.Main,
				index: 0,
			};

			const workflowObject = createTestWorkflowObject(workflowsStore.workflow);
			workflowsStore.getCurrentWorkflow.mockReturnValue(workflowObject);
			nodeTypesStore.getNodeType = vi.fn(
				(nodeTypeName: string) =>
					({
						[sourceNode.type]: sourceNodeTypeDescription,
						[targetNode.type]: targetNodeTypeDescription,
					})[nodeTypeName],
			);

			const { isConnectionAllowed } = useCanvasOperations({ router });
			expect(isConnectionAllowed(sourceNode, targetNode, sourceHandle, targetHandle)).toBe(false);
		});

		it('should return false if source node does not have connection type', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const nodeTypesStore = mockedStore(useNodeTypesStore);
			const sourceNode = mockNode({
				id: '1',
				type: 'sourceType',
				name: 'Source Node',
			});
			const sourceNodeTypeDescription = mockNodeTypeDescription({
				name: sourceNode.type,
				outputs: [NodeConnectionType.Main],
			});
			const sourceHandle: IConnection = {
				node: sourceNode.name,
				type: NodeConnectionType.AiTool,
				index: 0,
			};

			const targetNode = mockNode({
				id: '2',
				type: 'targetType',
				name: 'Target Node',
			});
			const targetNodeTypeDescription = mockNodeTypeDescription({
				name: 'targetType',
				inputs: [NodeConnectionType.AiTool],
			});
			const targetHandle: IConnection = {
				node: targetNode.name,
				type: NodeConnectionType.AiTool,
				index: 0,
			};

			const workflowObject = createTestWorkflowObject(workflowsStore.workflow);
			workflowsStore.getCurrentWorkflow.mockReturnValue(workflowObject);

			const { isConnectionAllowed, editableWorkflowObject } = useCanvasOperations({ router });

			editableWorkflowObject.value.nodes[sourceNode.name] = sourceNode;
			editableWorkflowObject.value.nodes[targetNode.name] = targetNode;
			nodeTypesStore.getNodeType = vi.fn(
				(nodeTypeName: string) =>
					({
						[sourceNode.type]: sourceNodeTypeDescription,
						[targetNode.type]: targetNodeTypeDescription,
					})[nodeTypeName],
			);

			expect(isConnectionAllowed(sourceNode, targetNode, sourceHandle, targetHandle)).toBe(false);
		});

		it('should return false if target node does not have connection type', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const nodeTypesStore = mockedStore(useNodeTypesStore);
			const sourceNode = mockNode({
				id: '1',
				type: 'sourceType',
				name: 'Source Node',
			});
			const sourceNodeTypeDescription = mockNodeTypeDescription({
				name: sourceNode.type,
				outputs: [NodeConnectionType.Main],
			});
			const sourceHandle: IConnection = {
				node: sourceNode.name,
				type: NodeConnectionType.Main,
				index: 0,
			};

			const targetNode = mockNode({
				id: '2',
				type: 'targetType',
				name: 'Target Node',
			});
			const targetNodeTypeDescription = mockNodeTypeDescription({
				name: 'targetType',
				inputs: [NodeConnectionType.AiTool],
			});
			const targetHandle: IConnection = {
				node: targetNode.name,
				type: NodeConnectionType.AiTool,
				index: 0,
			};

			const workflowObject = createTestWorkflowObject(workflowsStore.workflow);
			workflowsStore.getCurrentWorkflow.mockReturnValue(workflowObject);

			const { isConnectionAllowed, editableWorkflowObject } = useCanvasOperations({ router });

			editableWorkflowObject.value.nodes[sourceNode.name] = sourceNode;
			editableWorkflowObject.value.nodes[targetNode.name] = targetNode;
			nodeTypesStore.getNodeType = vi.fn(
				(nodeTypeName: string) =>
					({
						[sourceNode.type]: sourceNodeTypeDescription,
						[targetNode.type]: targetNodeTypeDescription,
					})[nodeTypeName],
			);

			expect(isConnectionAllowed(sourceNode, targetNode, sourceHandle, targetHandle)).toBe(false);
		});

		it('should return false if source node type is not allowed by target node input filter', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const nodeTypesStore = mockedStore(useNodeTypesStore);
			const sourceNode = mockNode({
				id: '1',
				type: 'sourceType',
				name: 'Source Node',
				typeVersion: 1,
			});
			const sourceNodeTypeDescription = mockNodeTypeDescription({
				name: sourceNode.type,
				outputs: [NodeConnectionType.Main],
			});
			const sourceHandle: IConnection = {
				node: sourceNode.name,
				type: NodeConnectionType.Main,
				index: 0,
			};

			const targetNode = mockNode({
				id: '2',
				type: 'targetType',
				name: 'Target Node',
				typeVersion: 1,
			});
			const targetNodeTypeDescription = mockNodeTypeDescription({
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
			const targetHandle: IConnection = {
				node: targetNode.name,
				type: NodeConnectionType.Main,
				index: 0,
			};

			const workflowObject = createTestWorkflowObject(workflowsStore.workflow);
			workflowsStore.getCurrentWorkflow.mockReturnValue(workflowObject);

			const { isConnectionAllowed, editableWorkflowObject } = useCanvasOperations({ router });

			editableWorkflowObject.value.nodes[sourceNode.name] = sourceNode;
			editableWorkflowObject.value.nodes[targetNode.name] = targetNode;
			nodeTypesStore.getNodeType = vi.fn(
				(nodeTypeName: string) =>
					({
						[sourceNode.type]: sourceNodeTypeDescription,
						[targetNode.type]: targetNodeTypeDescription,
					})[nodeTypeName],
			);

			expect(isConnectionAllowed(sourceNode, targetNode, sourceHandle, targetHandle)).toBe(false);
		});

		it('should return false if source node type does not have connection type index', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const nodeTypesStore = mockedStore(useNodeTypesStore);
			const sourceNode = mockNode({
				id: '1',
				type: 'sourceType',
				name: 'Source Node',
				typeVersion: 1,
			});
			const sourceNodeTypeDescription = mockNodeTypeDescription({
				name: sourceNode.type,
				outputs: [NodeConnectionType.Main],
			});
			const sourceHandle: IConnection = {
				node: sourceNode.name,
				type: NodeConnectionType.Main,
				index: 1,
			};

			const targetNode = mockNode({
				id: '2',
				type: 'targetType',
				name: 'Target Node',
				typeVersion: 1,
			});
			const targetNodeTypeDescription = mockNodeTypeDescription({
				name: targetNode.type,
				inputs: [
					{
						type: NodeConnectionType.Main,
						filter: {
							nodes: [sourceNode.type],
						},
					},
				],
			});
			const targetHandle: IConnection = {
				node: targetNode.name,
				type: NodeConnectionType.Main,
				index: 0,
			};

			const workflowObject = createTestWorkflowObject(workflowsStore.workflow);
			workflowsStore.getCurrentWorkflow.mockReturnValue(workflowObject);

			const { isConnectionAllowed, editableWorkflowObject } = useCanvasOperations({ router });

			editableWorkflowObject.value.nodes[sourceNode.name] = sourceNode;
			editableWorkflowObject.value.nodes[targetNode.name] = targetNode;
			nodeTypesStore.getNodeType = vi.fn(
				(nodeTypeName: string) =>
					({
						[sourceNode.type]: sourceNodeTypeDescription,
						[targetNode.type]: targetNodeTypeDescription,
					})[nodeTypeName],
			);

			expect(isConnectionAllowed(sourceNode, targetNode, sourceHandle, targetHandle)).toBe(false);
		});

		it('should return false if target node type does not have connection type index', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const nodeTypesStore = mockedStore(useNodeTypesStore);
			const sourceNode = mockNode({
				id: '1',
				type: 'sourceType',
				name: 'Source Node',
				typeVersion: 1,
			});
			const sourceNodeTypeDescription = mockNodeTypeDescription({
				name: sourceNode.type,
				outputs: [NodeConnectionType.Main],
			});
			const sourceHandle: IConnection = {
				node: sourceNode.name,
				type: NodeConnectionType.Main,
				index: 0,
			};

			const targetNode = mockNode({
				id: '2',
				type: 'targetType',
				name: 'Target Node',
				typeVersion: 1,
			});
			const targetNodeTypeDescription = mockNodeTypeDescription({
				name: targetNode.type,
				inputs: [
					{
						type: NodeConnectionType.Main,
						filter: {
							nodes: [sourceNode.type],
						},
					},
				],
			});
			const targetHandle: IConnection = {
				node: targetNode.name,
				type: NodeConnectionType.Main,
				index: 1,
			};

			const workflowObject = createTestWorkflowObject(workflowsStore.workflow);
			workflowsStore.getCurrentWorkflow.mockReturnValue(workflowObject);

			const { isConnectionAllowed, editableWorkflowObject } = useCanvasOperations({ router });

			editableWorkflowObject.value.nodes[sourceNode.name] = sourceNode;
			editableWorkflowObject.value.nodes[targetNode.name] = targetNode;
			nodeTypesStore.getNodeType = vi.fn(
				(nodeTypeName: string) =>
					({
						[sourceNode.type]: sourceNodeTypeDescription,
						[targetNode.type]: targetNodeTypeDescription,
					})[nodeTypeName],
			);

			expect(isConnectionAllowed(sourceNode, targetNode, sourceHandle, targetHandle)).toBe(false);
		});

		it('should return true if all conditions including filter are met', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const nodeTypesStore = mockedStore(useNodeTypesStore);

			const sourceNode = mockNode({
				id: '1',
				type: 'sourceType',
				name: 'Source Node',
				typeVersion: 1,
			});
			const sourceNodeTypeDescription = mockNodeTypeDescription({
				name: sourceNode.type,
				outputs: [NodeConnectionType.Main],
			});
			const sourceHandle: IConnection = {
				node: sourceNode.name,
				type: NodeConnectionType.Main,
				index: 0,
			};

			const targetNode = mockNode({
				id: '2',
				type: 'targetType',
				name: 'Target Node',
				typeVersion: 1,
			});
			const targetNodeTypeDescription = mockNodeTypeDescription({
				name: targetNode.type,
				inputs: [
					{
						type: NodeConnectionType.Main,
						filter: {
							nodes: [sourceNode.type],
						},
					},
				],
			});
			const targetHandle: IConnection = {
				node: targetNode.name,
				type: NodeConnectionType.Main,
				index: 0,
			};

			const workflowObject = createTestWorkflowObject(workflowsStore.workflow);
			workflowsStore.getCurrentWorkflow.mockReturnValue(workflowObject);

			const { isConnectionAllowed, editableWorkflowObject } = useCanvasOperations({ router });

			editableWorkflowObject.value.nodes[sourceNode.name] = sourceNode;
			editableWorkflowObject.value.nodes[targetNode.name] = targetNode;
			nodeTypesStore.getNodeType = vi.fn(
				(nodeTypeName: string) =>
					({
						[sourceNode.type]: sourceNodeTypeDescription,
						[targetNode.type]: targetNodeTypeDescription,
					})[nodeTypeName],
			);

			expect(isConnectionAllowed(sourceNode, targetNode, sourceHandle, targetHandle)).toBe(true);
		});

		it('should return true if all conditions are met and no filter is set', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const nodeTypesStore = mockedStore(useNodeTypesStore);

			const sourceNode = mockNode({
				id: '1',
				type: 'sourceType',
				name: 'Source Node',
				typeVersion: 1,
			});
			const sourceNodeTypeDescription = mockNodeTypeDescription({
				name: sourceNode.type,
				outputs: [NodeConnectionType.Main],
			});
			const sourceHandle: IConnection = {
				node: sourceNode.name,
				type: NodeConnectionType.Main,
				index: 0,
			};

			const targetNode = mockNode({
				id: '2',
				type: 'targetType',
				name: 'Target Node',
				typeVersion: 1,
			});
			const targetNodeTypeDescription = mockNodeTypeDescription({
				name: targetNode.type,
				inputs: [
					{
						type: NodeConnectionType.Main,
					},
				],
			});
			const targetHandle: IConnection = {
				node: targetNode.name,
				type: NodeConnectionType.Main,
				index: 0,
			};

			const workflowObject = createTestWorkflowObject(workflowsStore.workflow);
			workflowsStore.getCurrentWorkflow.mockReturnValue(workflowObject);

			const { isConnectionAllowed, editableWorkflowObject } = useCanvasOperations({ router });

			editableWorkflowObject.value.nodes[sourceNode.name] = sourceNode;
			editableWorkflowObject.value.nodes[targetNode.name] = targetNode;
			nodeTypesStore.getNodeType = vi.fn(
				(nodeTypeName: string) =>
					({
						[sourceNode.type]: sourceNodeTypeDescription,
						[targetNode.type]: targetNodeTypeDescription,
					})[nodeTypeName],
			);

			expect(isConnectionAllowed(sourceNode, targetNode, sourceHandle, targetHandle)).toBe(true);
		});

		it('should return true if node connecting to itself', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const nodeTypesStore = mockedStore(useNodeTypesStore);

			const sourceNode = mockNode({
				id: '1',
				type: 'sourceType',
				name: 'Source Node',
				typeVersion: 1,
			});
			const sourceNodeTypeDescription = mockNodeTypeDescription({
				name: sourceNode.type,
				outputs: [NodeConnectionType.Main],
			});
			const sourceHandle: IConnection = {
				node: sourceNode.name,
				type: NodeConnectionType.Main,
				index: 0,
			};
			const targetHandle: IConnection = {
				node: sourceNode.name,
				type: NodeConnectionType.Main,
				index: 0,
			};

			const workflowObject = createTestWorkflowObject(workflowsStore.workflow);
			workflowsStore.getCurrentWorkflow.mockReturnValue(workflowObject);

			const { isConnectionAllowed, editableWorkflowObject } = useCanvasOperations({ router });

			editableWorkflowObject.value.nodes[sourceNode.name] = sourceNode;
			nodeTypesStore.getNodeType = vi.fn(
				(nodeTypeName: string) =>
					({
						[sourceNode.type]: sourceNodeTypeDescription,
					})[nodeTypeName],
			);

			expect(isConnectionAllowed(sourceNode, sourceNode, sourceHandle, targetHandle)).toBe(true);
		});
	});

	describe('deleteConnection', () => {
		it('should not delete a connection if source node does not exist', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const connection: Connection = { source: 'nonexistent', target: 'targetNode' };

			workflowsStore.getNodeById
				.mockReturnValueOnce(undefined)
				.mockReturnValueOnce(createTestNode());

			const { deleteConnection } = useCanvasOperations({ router });
			deleteConnection(connection);

			expect(workflowsStore.removeConnection).not.toHaveBeenCalled();
		});

		it('should not delete a connection if target node does not exist', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const connection: Connection = { source: 'sourceNode', target: 'nonexistent' };

			workflowsStore.getNodeById
				.mockReturnValueOnce(createTestNode())
				.mockReturnValueOnce(undefined);

			const { deleteConnection } = useCanvasOperations({ router });
			deleteConnection(connection);

			expect(workflowsStore.removeConnection).not.toHaveBeenCalled();
		});

		it('should delete a connection if source and target nodes exist', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);

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

			workflowsStore.getNodeById.mockReturnValueOnce(nodeA).mockReturnValueOnce(nodeB);

			const { deleteConnection } = useCanvasOperations({ router });
			deleteConnection(connection);

			expect(workflowsStore.removeConnection).toHaveBeenCalledWith({
				connection: [
					{ index: 0, node: nodeA.name, type: NodeConnectionType.Main },
					{ index: 0, node: nodeB.name, type: NodeConnectionType.Main },
				],
			});
		});
	});

	describe('revertDeleteConnection', () => {
		it('should revert delete connection', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);

			const connection: [IConnection, IConnection] = [
				{ node: 'sourceNode', type: NodeConnectionType.Main, index: 1 },
				{ node: 'targetNode', type: NodeConnectionType.Main, index: 2 },
			];

			const { revertDeleteConnection } = useCanvasOperations({ router });
			revertDeleteConnection(connection);

			expect(workflowsStore.addConnection).toHaveBeenCalledWith({ connection });
		});
	});

	describe('deleteConnectionsByNodeId', () => {
		it('should delete all connections for a given node ID', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const { deleteConnectionsByNodeId } = useCanvasOperations({ router });

			const node1 = createTestNode({ id: 'node1', name: 'Node 1' });
			const node2 = createTestNode({ id: 'node2', name: 'Node 1' });

			workflowsStore.workflow.connections = {
				[node1.name]: {
					[NodeConnectionType.Main]: [
						[{ node: node2.name, type: NodeConnectionType.Main, index: 0 }],
					],
				},
				node2: {
					[NodeConnectionType.Main]: [
						[{ node: node1.name, type: NodeConnectionType.Main, index: 0 }],
					],
				},
			};

			workflowsStore.getNodeById.mockReturnValue(node1);
			workflowsStore.getNodeByName.mockReturnValueOnce(node1).mockReturnValueOnce(node2);

			deleteConnectionsByNodeId(node1.id);

			expect(workflowsStore.removeConnection).toHaveBeenCalledWith({
				connection: [
					{ node: node1.name, type: NodeConnectionType.Main, index: 0 },
					{ node: node2.name, type: NodeConnectionType.Main, index: 0 },
				],
			});

			expect(workflowsStore.removeConnection).toHaveBeenCalledWith({
				connection: [
					{ node: node2.name, type: NodeConnectionType.Main, index: 0 },
					{ node: node1.name, type: NodeConnectionType.Main, index: 0 },
				],
			});

			expect(workflowsStore.workflow.connections[node1.name]).toBeUndefined();
		});

		it('should not delete connections if node ID does not exist', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const { deleteConnectionsByNodeId } = useCanvasOperations({ router });

			const nodeId = 'nonexistent';
			workflowsStore.getNodeById.mockReturnValue(undefined);

			deleteConnectionsByNodeId(nodeId);

			expect(workflowsStore.removeConnection).not.toHaveBeenCalled();
		});
	});

	describe('duplicateNodes', () => {
		it('should duplicate nodes', async () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const nodeTypesStore = useNodeTypesStore();
			const nodeTypeDescription = mockNodeTypeDescription({ name: SET_NODE_TYPE });

			nodeTypesStore.nodeTypes = {
				[SET_NODE_TYPE]: { 1: nodeTypeDescription },
			};

			const nodes = buildImportNodes();
			workflowsStore.workflow.nodes = nodes;
			workflowsStore.getNodesByIds.mockReturnValue(nodes);
			workflowsStore.outgoingConnectionsByNodeName.mockReturnValue({});

			const workflowObject = createTestWorkflowObject(workflowsStore.workflow);
			workflowsStore.getCurrentWorkflow.mockReturnValue(workflowObject);
			workflowsStore.getWorkflow.mockReturnValue(workflowObject);

			const canvasOperations = useCanvasOperations({ router });
			const duplicatedNodeIds = await canvasOperations.duplicateNodes(['1', '2']);

			expect(duplicatedNodeIds.length).toBe(2);
			expect(duplicatedNodeIds).not.toContain('1');
			expect(duplicatedNodeIds).not.toContain('2');
		});
	});

	describe('copyNodes', () => {
		it('should copy nodes', async () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const nodeTypesStore = useNodeTypesStore();
			const nodeTypeDescription = mockNodeTypeDescription({ name: SET_NODE_TYPE });

			nodeTypesStore.nodeTypes = {
				[SET_NODE_TYPE]: { 1: nodeTypeDescription },
			};

			const nodes = buildImportNodes();
			workflowsStore.workflow.nodes = nodes;
			workflowsStore.getNodesByIds.mockReturnValue(nodes);
			workflowsStore.outgoingConnectionsByNodeName.mockReturnValue({});

			const { copyNodes } = useCanvasOperations({ router });
			await copyNodes(['1', '2']);

			expect(useClipboard().copy).toHaveBeenCalledTimes(1);
			expect(vi.mocked(useClipboard().copy).mock.calls).toMatchSnapshot();
		});
	});

	describe('cutNodes', () => {
		it('should copy and delete nodes', async () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const nodeTypesStore = useNodeTypesStore();
			const nodeTypeDescription = mockNodeTypeDescription({ name: SET_NODE_TYPE });

			nodeTypesStore.nodeTypes = {
				[SET_NODE_TYPE]: { 1: nodeTypeDescription },
			};

			const nodes = buildImportNodes();
			workflowsStore.workflow.nodes = nodes;
			workflowsStore.getNodesByIds.mockReturnValue(nodes);
			workflowsStore.outgoingConnectionsByNodeName.mockReturnValue({});

			const { cutNodes } = useCanvasOperations({ router });
			await cutNodes(['1', '2']);
			expect(useClipboard().copy).toHaveBeenCalledTimes(1);
			expect(vi.mocked(useClipboard().copy).mock.calls).toMatchSnapshot();
		});
	});

	describe('resolveNodeWebhook', () => {
		const nodeTypeDescription = mock<INodeTypeDescription>({
			webhooks: [mock<IWebhookDescription>()],
		});

		it("should set webhookId if it doesn't already exist", () => {
			const node = mock<INodeUi>({ webhookId: undefined });

			const { resolveNodeWebhook } = useCanvasOperations({ router });
			resolveNodeWebhook(node, nodeTypeDescription);

			expect(node.webhookId).toBeDefined();
		});

		it('should not set webhookId if it already exists', () => {
			const node = mock<INodeUi>({ webhookId: 'random-id' });

			const { resolveNodeWebhook } = useCanvasOperations({ router });
			resolveNodeWebhook(node, nodeTypeDescription);

			expect(node.webhookId).toBe('random-id');
		});

		it("should not set webhookId if node description doesn't define any webhooks", () => {
			const node = mock<INodeUi>({ webhookId: undefined });

			const { resolveNodeWebhook } = useCanvasOperations({ router });
			resolveNodeWebhook(node, mock<INodeTypeDescription>({ webhooks: [] }));

			expect(node.webhookId).toBeUndefined();
		});

		test.each([WEBHOOK_NODE_TYPE, FORM_TRIGGER_NODE_TYPE])(
			'should update the webhook path, if the node type is %s, and the path parameter is empty',
			(nodeType) => {
				const node = mock<INodeUi>({
					webhookId: 'random-id',
					type: nodeType,
					parameters: { path: '' },
				});

				const { resolveNodeWebhook } = useCanvasOperations({ router });
				resolveNodeWebhook(node, nodeTypeDescription);

				expect(node.webhookId).toBe('random-id');
				expect(node.parameters.path).toBe('random-id');
			},
		);
	});

	describe('initializeWorkspace', () => {
		it('should initialize the workspace', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const workflow = createTestWorkflow({
				nodes: [createTestNode()],
				connections: {},
			});

			const { initializeWorkspace } = useCanvasOperations({ router });
			initializeWorkspace(workflow);

			expect(workflowsStore.setNodes).toHaveBeenCalled();
			expect(workflowsStore.setConnections).toHaveBeenCalled();
		});

		it('should initialize node data from node type description', () => {
			const nodeTypesStore = mockedStore(useNodeTypesStore);
			const type = SET_NODE_TYPE;
			const version = 1;
			const expectedDescription = mockNodeTypeDescription({
				name: type,
				version,
				properties: [
					{
						displayName: 'Value',
						name: 'value',
						type: 'boolean',
						default: true,
					},
				],
			});

			nodeTypesStore.nodeTypes = { [type]: { [version]: expectedDescription } };

			const workflow = createTestWorkflow({
				nodes: [createTestNode()],
				connections: {},
			});

			const { initializeWorkspace } = useCanvasOperations({ router });
			initializeWorkspace(workflow);

			expect(workflow.nodes[0].parameters).toEqual({ value: true });
		});
	});

	describe('filterConnectionsByNodes', () => {
		it('should return filtered connections when all nodes are included', () => {
			const connections: INodeConnections = {
				[NodeConnectionType.Main]: [
					[
						{ node: 'node1', type: NodeConnectionType.Main, index: 0 },
						{ node: 'node2', type: NodeConnectionType.Main, index: 0 },
					],
					[{ node: 'node3', type: NodeConnectionType.Main, index: 0 }],
				],
			};
			const includeNodeNames = new Set<string>(['node1', 'node2', 'node3']);

			const { filterConnectionsByNodes } = useCanvasOperations({ router });
			const result = filterConnectionsByNodes(connections, includeNodeNames);

			expect(result).toEqual(connections);
		});

		it('should return empty connections when no nodes are included', () => {
			const connections: INodeConnections = {
				[NodeConnectionType.Main]: [
					[
						{ node: 'node1', type: NodeConnectionType.Main, index: 0 },
						{ node: 'node2', type: NodeConnectionType.Main, index: 0 },
					],
					[{ node: 'node3', type: NodeConnectionType.Main, index: 0 }],
				],
			};
			const includeNodeNames = new Set<string>();

			const { filterConnectionsByNodes } = useCanvasOperations({ router });
			const result = filterConnectionsByNodes(connections, includeNodeNames);

			expect(result).toEqual({
				[NodeConnectionType.Main]: [[], []],
			});
		});

		it('should return partially filtered connections when some nodes are included', () => {
			const connections: INodeConnections = {
				[NodeConnectionType.Main]: [
					[
						{ node: 'node1', type: NodeConnectionType.Main, index: 0 },
						{ node: 'node2', type: NodeConnectionType.Main, index: 0 },
					],
					[{ node: 'node3', type: NodeConnectionType.Main, index: 0 }],
				],
			};
			const includeNodeNames = new Set<string>(['node1']);

			const { filterConnectionsByNodes } = useCanvasOperations({ router });
			const result = filterConnectionsByNodes(connections, includeNodeNames);

			expect(result).toEqual({
				[NodeConnectionType.Main]: [
					[{ node: 'node1', type: NodeConnectionType.Main, index: 0 }],
					[],
				],
			});
		});

		it('should handle empty connections input', () => {
			const connections: INodeConnections = {};
			const includeNodeNames = new Set<string>(['node1']);

			const { filterConnectionsByNodes } = useCanvasOperations({ router });
			const result = filterConnectionsByNodes(connections, includeNodeNames);

			expect(result).toEqual({});
		});

		it('should handle connections with no valid nodes', () => {
			const connections: INodeConnections = {
				[NodeConnectionType.Main]: [
					[
						{ node: 'node4', type: NodeConnectionType.Main, index: 0 },
						{ node: 'node5', type: NodeConnectionType.Main, index: 0 },
					],
					[{ node: 'node6', type: NodeConnectionType.Main, index: 0 }],
				],
			};
			const includeNodeNames = new Set<string>(['node1', 'node2', 'node3']);

			const { filterConnectionsByNodes } = useCanvasOperations({ router });
			const result = filterConnectionsByNodes(connections, includeNodeNames);

			expect(result).toEqual({
				[NodeConnectionType.Main]: [[], []],
			});
		});
	});
});

function buildImportNodes() {
	return [
		mockNode({ id: '1', name: 'Node 1', type: SET_NODE_TYPE }),
		mockNode({ id: '2', name: 'Node 2', type: SET_NODE_TYPE }),
	].map((node) => {
		// Setting position in mockNode will wrap it in a Proxy
		// This causes deepCopy to remove position -> set position after instead
		node.position = [40, 40];
		return node;
	});
}
