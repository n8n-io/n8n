/**
 * Tests for basic node management operations in useCanvasOperations
 * Extracted from the original 3,877-line test file for better maintainability
 *
 * Test coverage:
 * - requireNodeTypeDescription
 * - addNode
 * - resolveNodePosition
 * - updateNodesPosition
 * - tidyUp
 * - updateNodePosition
 * - setNodeSelected
 * - addNodes
 */

import {
	setupCanvasOperationsTest,
	useCanvasOperations,
	useNodeTypesStore,
	useCredentialsStore,
	useNDVStore,
	useUIStore,
	useHistoryStore,
	useWorkflowsStore,
	mockNodeTypeDescription,
	mockNode,
	createTestNode,
	createTestWorkflowObject,
	mock,
	waitFor,
	mockedStore,
	NodeHelpers,
	NodeConnectionTypes,
	STICKY_NODE_TYPE,
	SET_NODE_TYPE,
	type ICredentialsResponse,
	type CanvasNode,
	type CanvasLayoutEvent,
	useTelemetry,
	type Workflow,
} from './useCanvasOperations.shared';

describe('useCanvasOperations - Node Operations', () => {
	beforeEach(() => {
		setupCanvasOperationsTest();
	});

	describe('requireNodeTypeDescription', () => {
		it('should return node type description when type and version match', () => {
			const nodeTypesStore = useNodeTypesStore();
			const type = 'testType';
			const version = 1;
			const expectedDescription = mockNodeTypeDescription({ name: type, version });

			nodeTypesStore.nodeTypes = { [type]: { [version]: expectedDescription } };

			const { requireNodeTypeDescription } = useCanvasOperations();
			const result = requireNodeTypeDescription(type, version);

			expect(result).toBe(expectedDescription);
		});

		it('should return node type description when only type is provided and it exists', () => {
			const nodeTypesStore = useNodeTypesStore();
			const type = 'testTypeWithoutVersion';
			const expectedDescription = mockNodeTypeDescription({ name: type });

			nodeTypesStore.nodeTypes = { [type]: { 2: expectedDescription } };

			const { requireNodeTypeDescription } = useCanvasOperations();
			const result = requireNodeTypeDescription(type);

			expect(result).toBe(expectedDescription);
		});

		it("should return placeholder node type description if node type doesn't exist", () => {
			const type = 'nonexistentType';

			const { requireNodeTypeDescription } = useCanvasOperations();
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
			const { addNode } = useCanvasOperations();
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
			const { addNode } = useCanvasOperations();
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
			const { addNode } = useCanvasOperations();
			const result = addNode(
				{
					type: 'type',
					typeVersion: 1,
					position: [32, 32],
				},
				mockNodeTypeDescription({ name: 'type' }),
			);

			expect(result.position).toEqual([32, 32]);
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

			const { addNode } = useCanvasOperations();
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

			const { addNode } = useCanvasOperations();
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

			const { addNode } = useCanvasOperations();
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
			const node = createTestNode({ position: [112, 112] });
			const nodeTypeDescription = mockNodeTypeDescription();

			const { resolveNodePosition } = useCanvasOperations();
			const position = resolveNodePosition(node, nodeTypeDescription);

			expect(position).toEqual([112, 112]);
		});

		it('should place the node at the last cancelled connection position', () => {
			const uiStore = mockedStore(useUIStore);
			const workflowsStore = mockedStore(useWorkflowsStore);
			const nodeTypesStore = mockedStore(useNodeTypesStore);
			const node = createTestNode({ id: '0' });
			const nodeTypeDescription = mockNodeTypeDescription();

			vi.spyOn(uiStore, 'lastInteractedWithNode', 'get').mockReturnValue(node);
			nodeTypesStore.getNodeType = vi.fn().mockReturnValue(nodeTypeDescription);
			workflowsStore.workflowObject = createTestWorkflowObject(workflowsStore.workflow);

			uiStore.lastInteractedWithNodeHandle = 'inputs/main/0';
			uiStore.lastCancelledConnectionPosition = [200, 200];

			const { resolveNodePosition } = useCanvasOperations();
			const position = resolveNodePosition({ ...node, position: undefined }, nodeTypeDescription);

			expect(position).toEqual([208, 160]);
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
				position: [112, 112],
				type: 'test',
				typeVersion: 1,
			});
			nodeTypesStore.getNodeType = vi.fn().mockReturnValue(nodeTypeDescription);
			workflowsStore.workflowObject = workflowObject;
			workflowsStore.cloneWorkflowObject = vi.fn().mockReturnValue(workflowObject);
			workflowObject.getNode = vi.fn().mockReturnValue(node);

			const { resolveNodePosition } = useCanvasOperations();
			const position = resolveNodePosition({ ...node, position: undefined }, nodeTypeDescription);

			expect(position).toEqual([320, 112]);
		});

		it('should place the node below the last interacted with node if it has non-main outputs', () => {
			const uiStore = mockedStore(useUIStore);
			const workflowsStore = mockedStore(useWorkflowsStore);
			const nodeTypesStore = mockedStore(useNodeTypesStore);

			const node = createTestNode({ id: '0' });
			const nodeTypeDescription = mockNodeTypeDescription();
			const workflowObject = createTestWorkflowObject(workflowsStore.workflow);

			uiStore.lastInteractedWithNode = createTestNode({
				position: [96, 96],
				type: 'test',
				typeVersion: 1,
			});
			nodeTypesStore.getNodeType = vi.fn().mockReturnValue(nodeTypeDescription);
			workflowsStore.workflowObject = workflowObject;
			workflowsStore.cloneWorkflowObject = vi.fn().mockReturnValue(workflowObject);
			workflowObject.getNode = vi.fn().mockReturnValue(node);

			vi.spyOn(NodeHelpers, 'getNodeOutputs').mockReturnValueOnce([
				{ type: NodeConnectionTypes.AiTool },
			]);
			vi.spyOn(NodeHelpers, 'getConnectionTypes')
				.mockReturnValueOnce([NodeConnectionTypes.AiTool])
				.mockReturnValueOnce([NodeConnectionTypes.AiTool]);

			const { resolveNodePosition } = useCanvasOperations();
			const position = resolveNodePosition({ ...node, position: undefined }, nodeTypeDescription);

			expect(position).toEqual([448, 96]);
		});

		it('should place the node at the last clicked position if no other position is set', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);

			const node = createTestNode({ id: '0' });
			const nodeTypeDescription = mockNodeTypeDescription();

			workflowsStore.workflowTriggerNodes = [createTestNode({ id: 'trigger', position: [96, 96] })];

			const { resolveNodePosition, lastClickPosition } = useCanvasOperations();
			lastClickPosition.value = [300, 300];

			const position = resolveNodePosition({ ...node, position: undefined }, nodeTypeDescription);

			expect(position).toEqual([304, 304]); // Snapped to grid
		});

		it('should place the trigger node at the root if it is the first trigger node', () => {
			const node = createTestNode({ id: '0' });
			const nodeTypeDescription = mockNodeTypeDescription();

			const { resolveNodePosition } = useCanvasOperations();
			const position = resolveNodePosition({ ...node, position: undefined }, nodeTypeDescription);

			expect(position).toEqual([0, 0]);
		});

		it('should apply custom Y offset for AI Language Model connection type', () => {
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
			uiStore.lastInteractedWithNodeHandle = `outputs/${NodeConnectionTypes.AiLanguageModel}/0`;
			nodeTypesStore.getNodeType = vi.fn().mockReturnValue(nodeTypeDescription);
			workflowsStore.workflowObject = workflowObject;
			workflowsStore.cloneWorkflowObject = vi.fn().mockReturnValue(workflowObject);
			workflowObject.getNode = vi.fn().mockReturnValue(node);

			vi.spyOn(NodeHelpers, 'getNodeOutputs').mockReturnValueOnce([
				{ type: NodeConnectionTypes.AiLanguageModel },
			]);
			vi.spyOn(NodeHelpers, 'getConnectionTypes')
				.mockReturnValueOnce([])
				.mockReturnValueOnce([])
				.mockReturnValueOnce([NodeConnectionTypes.AiLanguageModel]);

			const { resolveNodePosition } = useCanvasOperations();
			const position = resolveNodePosition({ ...node, position: undefined }, nodeTypeDescription);

			// Configuration node size is [200, 80], so customOffset = 200 * 2 = 400
			// Expected position: [100 + (200/1) * 1 - 200/2 - 400, 100 + 220] = [-200, 320]
			expect(position[0]).toBeLessThan(100); // Node should be moved left due to custom offset
			expect(position[1]).toEqual(320); // Standard Y position for configuration nodes
		});

		it('should apply custom Y offset for AI Memory connection type', () => {
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
			uiStore.lastInteractedWithNodeHandle = `outputs/${NodeConnectionTypes.AiMemory}/0`;
			nodeTypesStore.getNodeType = vi.fn().mockReturnValue(nodeTypeDescription);
			workflowsStore.workflowObject = workflowObject;
			workflowsStore.cloneWorkflowObject = vi.fn().mockReturnValue(workflowObject);
			workflowObject.getNode = vi.fn().mockReturnValue(node);

			vi.spyOn(NodeHelpers, 'getNodeOutputs').mockReturnValueOnce([
				{ type: NodeConnectionTypes.AiMemory },
			]);
			vi.spyOn(NodeHelpers, 'getConnectionTypes')
				.mockReturnValueOnce([])
				.mockReturnValueOnce([])
				.mockReturnValueOnce([NodeConnectionTypes.AiMemory]);

			const { resolveNodePosition } = useCanvasOperations();
			const position = resolveNodePosition({ ...node, position: undefined }, nodeTypeDescription);

			expect(position[0]).toBeLessThan(100); // Node should be moved left due to custom offset
			expect(position[1]).toEqual(320); // Standard Y position for configuration nodes
		});

		it('should not apply custom offset for regular connection types', () => {
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
			uiStore.lastInteractedWithNodeHandle = `outputs/${NodeConnectionTypes.AiTool}/0`;
			nodeTypesStore.getNodeType = vi.fn().mockReturnValue(nodeTypeDescription);
			workflowsStore.workflowObject = workflowObject;
			workflowsStore.cloneWorkflowObject = vi.fn().mockReturnValue(workflowObject);
			workflowObject.getNode = vi.fn().mockReturnValue(node);

			vi.spyOn(NodeHelpers, 'getNodeOutputs').mockReturnValueOnce([
				{ type: NodeConnectionTypes.AiTool },
			]);
			vi.spyOn(NodeHelpers, 'getConnectionTypes')
				.mockReturnValueOnce([])
				.mockReturnValueOnce([])
				.mockReturnValueOnce([NodeConnectionTypes.AiTool]);

			const { resolveNodePosition } = useCanvasOperations();
			const position = resolveNodePosition({ ...node, position: undefined }, nodeTypeDescription);

			// No custom offset applied, allowing for some wiggle room when tests are run on different environments
			expect(position[0]).toBeGreaterThanOrEqual(40);
			expect(position[0]).toBeLessThanOrEqual(80);
			expect(position[1]).toBe(320);
		});

		it('should handle missing connection type gracefully', () => {
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
			// No lastInteractedWithNodeHandle set
			nodeTypesStore.getNodeType = vi.fn().mockReturnValue(nodeTypeDescription);
			workflowsStore.workflowObject = workflowObject;
			workflowsStore.cloneWorkflowObject = vi.fn().mockReturnValue(workflowObject);
			workflowObject.getNode = vi.fn().mockReturnValue(node);

			vi.spyOn(NodeHelpers, 'getNodeOutputs').mockReturnValueOnce([
				{ type: NodeConnectionTypes.AiTool },
			]);
			vi.spyOn(NodeHelpers, 'getConnectionTypes')
				.mockReturnValueOnce([])
				.mockReturnValueOnce([])
				.mockReturnValueOnce([NodeConnectionTypes.AiTool]);

			const { resolveNodePosition } = useCanvasOperations();
			const position = resolveNodePosition({ ...node, position: undefined }, nodeTypeDescription);

			// No custom offset applied, allowing for some wiggle room when tests are run on different environments
			expect(position[0]).toBeGreaterThanOrEqual(40);
			expect(position[0]).toBeLessThanOrEqual(80);
			expect(position[1]).toBe(320);
		});
	});

	describe('updateNodesPosition', () => {
		it('records history for multiple node position updates when tracking is enabled', () => {
			const historyStore = useHistoryStore();
			const events = [
				{ id: 'node1', position: { x: 96, y: 96 } },
				{ id: 'node2', position: { x: 208, y: 208 } },
			];
			const startRecordingUndoSpy = vi.spyOn(historyStore, 'startRecordingUndo');
			const stopRecordingUndoSpy = vi.spyOn(historyStore, 'stopRecordingUndo');

			const { updateNodesPosition } = useCanvasOperations();
			updateNodesPosition(events, { trackHistory: true, trackBulk: true });

			expect(startRecordingUndoSpy).toHaveBeenCalled();
			expect(stopRecordingUndoSpy).toHaveBeenCalled();
		});

		it('updates positions for multiple nodes', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const events = [
				{ id: 'node1', position: { x: 96, y: 96 } },
				{ id: 'node2', position: { x: 208, y: 208 } },
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

			const { updateNodesPosition } = useCanvasOperations();
			updateNodesPosition(events);

			expect(setNodePositionByIdSpy).toHaveBeenCalledTimes(2);
			expect(setNodePositionByIdSpy).toHaveBeenCalledWith('node1', [96, 96]);
			expect(setNodePositionByIdSpy).toHaveBeenCalledWith('node2', [208, 208]);
		});

		it('does not record history when trackHistory is false', () => {
			const historyStore = useHistoryStore();
			const events = [{ id: 'node1', position: { x: 96, y: 96 } }];
			const startRecordingUndoSpy = vi.spyOn(historyStore, 'startRecordingUndo');
			const stopRecordingUndoSpy = vi.spyOn(historyStore, 'stopRecordingUndo');

			const { updateNodesPosition } = useCanvasOperations();
			updateNodesPosition(events, { trackHistory: false, trackBulk: false });

			expect(startRecordingUndoSpy).not.toHaveBeenCalled();
			expect(stopRecordingUndoSpy).not.toHaveBeenCalled();
		});
	});

	describe('tidyUp', () => {
		it('records history for multiple node position updates', () => {
			const historyStore = useHistoryStore();
			const event: CanvasLayoutEvent = {
				source: 'canvas-button',
				target: 'all',
				result: {
					nodes: [
						{ id: 'node1', x: 96, y: 96 },
						{ id: 'node2', x: 208, y: 208 },
					],
					boundingBox: { height: 96, width: 96, x: 0, y: 0 },
				},
			};
			const startRecordingUndoSpy = vi.spyOn(historyStore, 'startRecordingUndo');
			const stopRecordingUndoSpy = vi.spyOn(historyStore, 'stopRecordingUndo');

			const { tidyUp } = useCanvasOperations();
			tidyUp(event);

			expect(startRecordingUndoSpy).toHaveBeenCalled();
			expect(stopRecordingUndoSpy).toHaveBeenCalled();
		});

		it('updates positions for multiple nodes', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const event: CanvasLayoutEvent = {
				source: 'canvas-button',
				target: 'all',
				result: {
					nodes: [
						{ id: 'node1', x: 96, y: 96 },
						{ id: 'node2', x: 208, y: 208 },
					],
					boundingBox: { height: 96, width: 96, x: 0, y: 0 },
				},
			};
			const setNodePositionByIdSpy = vi.spyOn(workflowsStore, 'setNodePositionById');
			workflowsStore.getNodeById
				.mockReturnValueOnce(
					createTestNode({
						id: event.result.nodes[0].id,
						position: [event.result.nodes[0].x, event.result.nodes[0].y],
					}),
				)
				.mockReturnValueOnce(
					createTestNode({
						id: event.result.nodes[1].id,
						position: [event.result.nodes[1].x, event.result.nodes[1].y],
					}),
				);

			const { tidyUp } = useCanvasOperations();
			tidyUp(event);

			expect(setNodePositionByIdSpy).toHaveBeenCalledTimes(2);
			expect(setNodePositionByIdSpy).toHaveBeenCalledWith('node1', [96, 96]);
			expect(setNodePositionByIdSpy).toHaveBeenCalledWith('node2', [208, 208]);
		});

		it('should send a "User tidied up workflow" telemetry event', () => {
			const event: CanvasLayoutEvent = {
				source: 'canvas-button',
				target: 'all',
				result: {
					nodes: [
						{ id: 'node1', x: 96, y: 96 },
						{ id: 'node2', x: 208, y: 208 },
					],
					boundingBox: { height: 96, width: 96, x: 0, y: 0 },
				},
			};

			const { tidyUp } = useCanvasOperations();
			tidyUp(event);

			expect(useTelemetry().track).toHaveBeenCalledWith('User tidied up canvas', {
				nodes_count: 2,
				source: 'canvas-button',
				target: 'all',
			});
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

			const { updateNodePosition } = useCanvasOperations();
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

			const { setNodeSelected } = useCanvasOperations();
			setNodeSelected(nodeId);

			expect(uiStore.lastSelectedNode).toBe(nodeName);
		});

		it('should not change last selected node when node id is provided but node does not exist', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const uiStore = useUIStore();
			const nodeId = 'node1';
			workflowsStore.getNodeById = vi.fn().mockReturnValue(undefined);
			uiStore.lastSelectedNode = 'Existing Node';

			const { setNodeSelected } = useCanvasOperations();
			setNodeSelected(nodeId);

			expect(uiStore.lastSelectedNode).toBe('Existing Node');
		});

		it('should clear last selected node when node id is not provided', () => {
			const uiStore = useUIStore();
			uiStore.lastSelectedNode = 'Existing Node';

			const { setNodeSelected } = useCanvasOperations();
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
				mockNode({ name: 'Node 1', type: nodeTypeName, position: [32, 32] }),
				mockNode({ name: 'Node 2', type: nodeTypeName, position: [96, 256] }),
			];

			workflowsStore.workflowObject = createTestWorkflowObject(workflowsStore.workflow);

			nodeTypesStore.nodeTypes = {
				[nodeTypeName]: { 1: mockNodeTypeDescription({ name: nodeTypeName }) },
			};

			const { addNodes } = useCanvasOperations();
			await addNodes(nodes, {});

			expect(workflowsStore.addNode).toHaveBeenCalledTimes(2);
			expect(workflowsStore.addNode.mock.calls[0][0]).toMatchObject({
				name: nodes[0].name,
				type: nodeTypeName,
				typeVersion: 1,
				position: [32, 32],
				parameters: {},
			});
			expect(workflowsStore.addNode.mock.calls[1][0]).toMatchObject({
				name: nodes[1].name,
				type: nodeTypeName,
				typeVersion: 1,
				position: [96, 256],
				parameters: {},
			});
		});

		it('should add nodes at current position when position is not specified', async () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const nodeTypesStore = mockedStore(useNodeTypesStore);
			const nodeTypeName = 'type';
			const nodes = [
				mockNode({ name: 'Node 1', type: nodeTypeName, position: [128, 128] }),
				mockNode({ name: 'Node 2', type: nodeTypeName, position: [192, 320] }),
			];

			workflowsStore.workflowObject = createTestWorkflowObject(workflowsStore.workflow);

			nodeTypesStore.nodeTypes = {
				[nodeTypeName]: { 1: mockNodeTypeDescription({ name: nodeTypeName }) },
			};

			const { addNodes } = useCanvasOperations();
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
				mockNode({ id: 'a', name: 'Node A', type: nodeTypeName, position: [32, 32] }),
				mockNode({ id: 'b', name: 'Node B', type: nodeTypeName, position: [32, 32] }),
				mockNode({ id: 'c', name: 'Node C', type: nodeTypeName, position: [96, 256] }),
			];

			const setNodePositionByIdSpy = vi.spyOn(workflowsStore, 'setNodePositionById');
			workflowsStore.getNodeByName.mockReturnValueOnce(nodes[1]).mockReturnValueOnce(nodes[2]);
			workflowsStore.getNodeById.mockReturnValueOnce(nodes[1]).mockReturnValueOnce(nodes[2]);

			nodeTypesStore.nodeTypes = {
				[nodeTypeName]: { 1: mockNodeTypeDescription({ name: nodeTypeName }) },
			};

			workflowsStore.workflowObject = mock<Workflow>({
				getParentNodesByDepth: () =>
					nodes.map((node) => ({
						name: node.name,
						depth: 0,
						indicies: [],
					})),
			});

			const { addNodes } = useCanvasOperations();
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
				mockNode({ name: 'Node 2', type: nodeTypeName, position: [96, 240] }),
			];

			workflowsStore.workflowObject = createTestWorkflowObject(workflowsStore.workflow);

			nodeTypesStore.nodeTypes = {
				[nodeTypeName]: { 1: mockNodeTypeDescription({ name: nodeTypeName }) },
			};

			const { addNodes } = useCanvasOperations();
			const added = await addNodes(nodes, {});
			expect(added.length).toBe(2);
		});

		it('should mark UI state as dirty', async () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const uiStore = mockedStore(useUIStore);
			const nodeTypesStore = useNodeTypesStore();
			const nodeTypeName = 'type';
			const nodes = [mockNode({ name: 'Node 1', type: nodeTypeName, position: [30, 40] })];

			workflowsStore.workflowObject = createTestWorkflowObject(workflowsStore.workflow);

			nodeTypesStore.nodeTypes = {
				[nodeTypeName]: { 1: mockNodeTypeDescription({ name: nodeTypeName }) },
			};

			const { addNodes } = useCanvasOperations();
			await addNodes(nodes, { keepPristine: false });

			expect(uiStore.stateIsDirty).toEqual(true);
		});

		it('should not mark UI state as dirty if keepPristine is true', async () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const uiStore = mockedStore(useUIStore);
			const nodeTypesStore = useNodeTypesStore();
			const nodeTypeName = 'type';
			const nodes = [mockNode({ name: 'Node 1', type: nodeTypeName, position: [30, 40] })];

			workflowsStore.workflowObject = createTestWorkflowObject(workflowsStore.workflow);

			nodeTypesStore.nodeTypes = {
				[nodeTypeName]: { 1: mockNodeTypeDescription({ name: nodeTypeName }) },
			};

			const { addNodes } = useCanvasOperations();
			await addNodes(nodes, { keepPristine: true });

			expect(uiStore.stateIsDirty).toEqual(false);
		});
	});
});
