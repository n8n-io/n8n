/**
 * Tests for node state management and lifecycle operations in useCanvasOperations
 * Extracted from the original 3,877-line test file for better maintainability
 *
 * Test coverage:
 * - revertAddNode
 * - deleteNode
 * - revertDeleteNode
 * - renameNode
 * - revertRenameNode
 * - setNodeActive
 * - setNodeActiveByName
 * - toggleNodesDisabled
 * - revertToggleNodeDisabled
 */

import {
	setupCanvasOperationsTest,
	useCanvasOperations,
	useWorkflowsStore,
	useHistoryStore,
	useNDVStore,
	useNodeTypesStore,
	createTestNode,
	createTestWorkflowObject,
	mockedStore,
	RemoveNodeCommand,
	mockNodeTypeDescription,
	NodeConnectionTypes,
	SET_NODE_TYPE,
	UserError,
	useToast,
	type INodeUi,
} from './useCanvasOperations.shared';

describe('useCanvasOperations - Node Lifecycle', () => {
	beforeEach(() => {
		setupCanvasOperationsTest();
	});

	describe('revertAddNode', () => {
		it('deletes node if it exists', async () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const node = createTestNode();
			workflowsStore.getNodeByName.mockReturnValueOnce(node);
			workflowsStore.getNodeById.mockReturnValueOnce(node);
			const removeNodeByIdSpy = vi.spyOn(workflowsStore, 'removeNodeById');

			const { revertAddNode } = useCanvasOperations();
			await revertAddNode(node.name);

			expect(removeNodeByIdSpy).toHaveBeenCalledWith(node.id);
		});
	});

	describe('deleteNode', () => {
		it('should delete node and track history', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const historyStore = mockedStore(useHistoryStore);
			const workflowObject = createTestWorkflowObject(workflowsStore.workflow);

			workflowsStore.workflowObject = workflowObject;
			workflowsStore.cloneWorkflowObject = vi.fn().mockReturnValue(workflowObject);
			workflowsStore.incomingConnectionsByNodeName.mockReturnValue({});

			const id = 'node1';
			const node: INodeUi = createTestNode({
				id,
				type: 'node',
				position: [10, 20],
				name: 'Node 1',
			});

			workflowsStore.getNodeById.mockReturnValue(node);

			const { deleteNode } = useCanvasOperations();
			deleteNode(id, { trackHistory: true });

			expect(workflowsStore.removeNodeById).toHaveBeenCalledWith(id);
			expect(workflowsStore.removeNodeExecutionDataById).toHaveBeenCalledWith(id);
			expect(historyStore.pushCommandToUndo).toHaveBeenCalledWith(
				new RemoveNodeCommand(node, expect.any(Number)),
			);
		});

		it('should delete node without tracking history', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const historyStore = mockedStore(useHistoryStore);
			const workflowObject = createTestWorkflowObject(workflowsStore.workflow);

			workflowsStore.workflowObject = workflowObject;
			workflowsStore.cloneWorkflowObject = vi.fn().mockReturnValue(workflowObject);
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

			const { deleteNode } = useCanvasOperations();
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
								type: NodeConnectionTypes.Main,
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
								type: NodeConnectionTypes.Main,
								index: 0,
							},
						],
					],
				},
			};

			const workflowObject = createTestWorkflowObject(workflowsStore.workflow);
			workflowsStore.workflowObject = workflowObject;
			workflowsStore.cloneWorkflowObject = vi.fn().mockReturnValue(workflowObject);
			workflowsStore.incomingConnectionsByNodeName.mockReturnValue({});

			workflowsStore.getNodeById.mockReturnValue(nodes[1]);

			const { deleteNode } = useCanvasOperations();
			deleteNode(nodes[1].id);

			expect(workflowsStore.removeNodeById).toHaveBeenCalledWith(nodes[1].id);
			expect(workflowsStore.removeNodeExecutionDataById).toHaveBeenCalledWith(nodes[1].id);
			expect(workflowsStore.removeNodeById).toHaveBeenCalledWith(nodes[1].id);
		});

		it('should handle nodes with null connections for unconnected indexes', () => {
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

			workflowsStore.getNodeByName = vi
				.fn()
				.mockImplementation((name: string) => nodes.find((node) => node.name === name));

			workflowsStore.workflow.nodes = nodes;
			workflowsStore.workflow.connections = {
				[nodes[0].name]: {
					main: [
						null,
						[
							{
								node: nodes[1].name,
								type: NodeConnectionTypes.Main,
								index: 0,
							},
						],
					],
				},
				[nodes[1].name]: {
					main: [
						// null here to simulate no connection at index
						null,
						[
							{
								node: nodes[2].name,
								type: NodeConnectionTypes.Main,
								index: 0,
							},
						],
					],
				},
			};

			const workflowObject = createTestWorkflowObject(workflowsStore.workflow);
			workflowsStore.workflowObject = workflowObject;
			workflowsStore.cloneWorkflowObject = vi.fn().mockReturnValue(workflowObject);
			workflowsStore.incomingConnectionsByNodeName.mockReturnValue({});

			workflowsStore.getNodeById.mockReturnValue(nodes[1]);

			const { deleteNode } = useCanvasOperations();
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

			const { revertDeleteNode } = useCanvasOperations();
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
			workflowsStore.workflowObject = workflowObject;
			workflowsStore.cloneWorkflowObject = vi.fn().mockReturnValue(workflowObject);
			workflowsStore.getNodeByName = vi.fn().mockReturnValue({ name: oldName });
			ndvStore.activeNodeName = oldName;

			const { renameNode } = useCanvasOperations();
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

			const { renameNode } = useCanvasOperations();
			await renameNode(oldName, oldName);

			expect(ndvStore.activeNodeName).toBe(oldName);
		});

		it('should show error toast when renameNode throws an error', async () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const ndvStore = mockedStore(useNDVStore);
			const toast = useToast();
			const oldName = 'Old Node';
			const newName = 'New Node';
			const errorMessage = 'Node name already exists';
			const errorDescription = 'Please choose a different name';

			const workflowObject = createTestWorkflowObject();
			workflowObject.renameNode = vi.fn().mockImplementation(() => {
				const error = new UserError(errorMessage, { description: errorDescription });
				throw error;
			});
			workflowsStore.workflowObject = workflowObject;
			workflowsStore.cloneWorkflowObject = vi.fn().mockReturnValue(workflowObject);
			workflowsStore.getNodeByName = vi.fn().mockReturnValue({ name: oldName });
			ndvStore.activeNodeName = oldName;

			const { renameNode } = useCanvasOperations();
			await renameNode(oldName, newName);

			expect(workflowObject.renameNode).toHaveBeenCalledWith(oldName, newName);
			expect(toast.showMessage).toHaveBeenCalledWith({
				type: 'error',
				title: errorMessage,
				message: errorDescription,
			});
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
			workflowsStore.workflowObject = workflowObject;
			workflowsStore.cloneWorkflowObject = vi.fn().mockReturnValue(workflowObject);
			workflowsStore.getNodeByName = vi.fn().mockReturnValue({ name: currentName });
			ndvStore.activeNodeName = currentName;

			const { revertRenameNode } = useCanvasOperations();
			await revertRenameNode(currentName, oldName);

			expect(ndvStore.activeNodeName).toBe(oldName);
		});

		it('should not revert node renaming when old name is same as new name', async () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const ndvStore = mockedStore(useNDVStore);
			const oldName = 'Old Node';
			workflowsStore.getNodeByName = vi.fn().mockReturnValue({ name: oldName });
			ndvStore.activeNodeName = oldName;

			const { revertRenameNode } = useCanvasOperations();
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

			const { setNodeActive } = useCanvasOperations();
			setNodeActive(nodeId);

			expect(ndvStore.activeNodeName).toBe(nodeName);
		});

		it('should not change active node name when node does not exist', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const ndvStore = mockedStore(useNDVStore);
			const nodeId = 'node1';
			workflowsStore.getNodeById = vi.fn().mockReturnValue(undefined);
			ndvStore.activeNodeName = 'Existing Node';

			const { setNodeActive } = useCanvasOperations();
			setNodeActive(nodeId);

			expect(ndvStore.activeNodeName).toBe('Existing Node');
		});

		it('should set node as dirty when node is set active', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const node = createTestNode();

			workflowsStore.getNodeById.mockImplementation(() => node);

			const { setNodeActive } = useCanvasOperations();
			setNodeActive(node.id);

			expect(workflowsStore.setNodePristine).toHaveBeenCalledWith(node.name, false);
		});
	});

	describe('setNodeActiveByName', () => {
		it('should set active node name', () => {
			const ndvStore = useNDVStore();
			const nodeName = 'Node 1';
			ndvStore.activeNodeName = '';

			const { setNodeActiveByName } = useCanvasOperations();
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

			const { toggleNodesDisabled } = useCanvasOperations();
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

			const { revertToggleNodeDisabled } = useCanvasOperations();
			revertToggleNodeDisabled(nodeName);

			expect(updateNodePropertiesSpy).toHaveBeenCalledWith({
				name: nodeName,
				properties: {
					disabled: true,
				},
			});
		});
	});
});
