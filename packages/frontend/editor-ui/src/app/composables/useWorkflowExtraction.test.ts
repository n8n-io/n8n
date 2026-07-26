import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import type { IConnections, INode, IWorkflowGroup } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import type { INodeUi } from '@/Interface';
import type { WorkflowDataCreate } from '@n8n/rest-api-client/api/workflows';

const {
	mockWorkflowsStore,
	mockWorkflowDocumentStore,
	mockNodeTypesStore,
	mockCanvasOperations,
	mockTelemetry,
	mockGroupTelemetry,
	mockHistoryStore,
	mockUIStore,
} = vi.hoisted(() => ({
	mockWorkflowsStore: {
		workflowId: 'parent-workflow-id',
		createNewWorkflow: vi.fn(),
		publishWorkflow: vi.fn(),
	},
	mockWorkflowDocumentStore: {
		allNodes: [] as INodeUi[],
		allGroups: [] as IWorkflowGroup[],
		connectionsBySourceNode: {} as IConnections,
		homeProject: { id: 'home-project' },
		parentFolder: null as { id: string } | null,
		getNodeById: vi.fn(),
		getNodeByName: vi.fn(),
		getParentNodes: vi.fn().mockReturnValue([]),
		getChildNodes: vi.fn().mockReturnValue([]),
		getExpressionHandler: vi.fn().mockReturnValue(undefined),
		getGroupForNode: vi.fn(),
		getGroupById: vi.fn(),
		addNodesToGroup: vi.fn(),
		deleteGroup: vi.fn(),
	},
	mockNodeTypesStore: {
		getNodeType: vi.fn().mockReturnValue({
			displayName: 'Set',
			name: 'n8n-nodes-base.set',
			group: ['transform'],
			version: 1,
			description: '',
			defaults: { name: 'Set' },
			inputs: ['main'],
			outputs: ['main'],
			properties: [],
		}),
	},
	mockCanvasOperations: {
		addNodes: vi.fn().mockResolvedValue([{ id: 'execute-node-id' }]),
		replaceNodeConnections: vi.fn(),
		deleteNodes: vi.fn(),
		replaceNodeParameters: vi.fn(),
	},
	mockTelemetry: {
		track: vi.fn(),
	},
	mockGroupTelemetry: {
		trackUngrouped: vi.fn(),
	},
	mockHistoryStore: {
		startRecordingUndo: vi.fn(),
		stopRecordingUndo: vi.fn(),
		pushCommandToUndo: vi.fn(),
	},
	mockUIStore: {
		resetLastInteractedWith: vi.fn(),
		markStateDirty: vi.fn(),
		openModalWithData: vi.fn(),
	},
}));

vi.mock('@/app/stores/workflows.store', () => ({
	useWorkflowsStore: vi.fn().mockReturnValue(mockWorkflowsStore),
}));

vi.mock('@/app/stores/workflowDocument.store', () => ({
	injectWorkflowDocumentStore: vi.fn().mockReturnValue({ value: mockWorkflowDocumentStore }),
}));

vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: vi.fn().mockReturnValue(mockNodeTypesStore),
}));

vi.mock('@/app/composables/useCanvasOperations', () => ({
	useCanvasOperations: vi.fn().mockReturnValue(mockCanvasOperations),
}));

vi.mock('@/app/stores/ui.store', () => ({
	useUIStore: vi.fn().mockReturnValue(mockUIStore),
}));

vi.mock('@/app/stores/history.store', () => ({
	useHistoryStore: vi.fn().mockReturnValue(mockHistoryStore),
}));

vi.mock('@/app/composables/useToast', () => ({
	useToast: vi.fn().mockReturnValue({
		showMessage: vi.fn(),
		showError: vi.fn(),
	}),
}));

vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: vi.fn().mockReturnValue(mockTelemetry),
}));

vi.mock('@/features/workflows/canvas/composables/useCanvasNodeGroupTelemetry', () => ({
	useCanvasNodeGroupTelemetry: vi.fn().mockReturnValue(mockGroupTelemetry),
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: vi.fn().mockReturnValue({
		baseText: vi.fn().mockImplementation((key: string) => key),
	}),
}));

vi.mock('vue-router', () => ({
	useRouter: vi.fn().mockReturnValue({
		resolve: vi.fn().mockReturnValue({ href: '/workflow/new-id' }),
	}),
}));

import { useWorkflowExtraction } from '@/app/composables/useWorkflowExtraction';
import { RemoveNodeGroupCommand, UpdateNodeGroupCommand } from '@/app/models/history';

function makeNode(name: string, position: [number, number] = [0, 0]): INodeUi {
	return {
		id: `id-${name}`,
		name,
		type: 'n8n-nodes-base.set',
		typeVersion: 1,
		position,
		parameters: {},
		disabled: false,
		issues: undefined,
		typeUnknown: false,
	} as INodeUi;
}

function setWorkflowNodes(nodes: INodeUi[]) {
	mockWorkflowDocumentStore.allNodes = nodes;
	const nodesById = new Map(nodes.map((node) => [node.id, node]));
	const nodesByName = new Map(nodes.map((node) => [node.name, node]));

	mockWorkflowDocumentStore.getNodeById.mockImplementation((id: string) => nodesById.get(id));
	mockWorkflowDocumentStore.getNodeByName.mockImplementation(
		(name: string) => nodesByName.get(name) ?? null,
	);
}

function mockSuccessfulWorkflowCreation() {
	mockWorkflowsStore.createNewWorkflow.mockResolvedValue({ id: 'new-id', versionId: 'v1' });
	mockWorkflowsStore.publishWorkflow.mockResolvedValue(undefined);
}

describe('useWorkflowExtraction', () => {
	beforeEach(() => {
		const pinia = createTestingPinia({ stubActions: false });
		setActivePinia(pinia);

		mockWorkflowsStore.createNewWorkflow.mockReset();
		mockWorkflowsStore.publishWorkflow.mockReset();
		mockCanvasOperations.addNodes.mockClear();
		mockCanvasOperations.replaceNodeConnections.mockClear();
		mockCanvasOperations.deleteNodes.mockClear();
		mockCanvasOperations.replaceNodeParameters.mockClear();
		mockTelemetry.track.mockClear();
		mockGroupTelemetry.trackUngrouped.mockClear();
		mockUIStore.resetLastInteractedWith.mockClear();
		mockUIStore.markStateDirty.mockClear();
		mockUIStore.openModalWithData.mockClear();
		mockWorkflowDocumentStore.getNodeById.mockReset();
		mockWorkflowDocumentStore.getNodeByName.mockReset();
		mockWorkflowDocumentStore.getParentNodes.mockReset();
		mockWorkflowDocumentStore.getParentNodes.mockReturnValue([]);
		mockWorkflowDocumentStore.getChildNodes.mockReset();
		mockWorkflowDocumentStore.getChildNodes.mockReturnValue([]);
		mockWorkflowDocumentStore.getExpressionHandler.mockReset();
		mockWorkflowDocumentStore.getExpressionHandler.mockReturnValue(undefined);
		mockWorkflowDocumentStore.getGroupForNode.mockReset();
		mockWorkflowDocumentStore.getGroupById.mockReset();
		mockWorkflowDocumentStore.addNodesToGroup.mockReset();
		mockWorkflowDocumentStore.deleteGroup.mockReset();
		mockNodeTypesStore.getNodeType.mockClear();
		mockHistoryStore.startRecordingUndo.mockClear();
		mockHistoryStore.stopRecordingUndo.mockClear();
		mockHistoryStore.pushCommandToUndo.mockClear();
		mockWorkflowDocumentStore.allNodes = [];
		mockWorkflowDocumentStore.allGroups = [];
		mockWorkflowDocumentStore.connectionsBySourceNode = {};
	});

	describe('extractWorkflow', () => {
		it('does not track start telemetry for an empty selection', () => {
			const { extractWorkflow } = useWorkflowExtraction();

			extractWorkflow([]);

			expect(mockTelemetry.track).not.toHaveBeenCalled();
		});

		it('includes attached sub-nodes when starting extraction', () => {
			const nodeA = makeNode('A', [0, 0]);
			const agentB = makeNode('Agent B', [200, 0]);
			const agentC = makeNode('Agent C', [400, 0]);
			const model = makeNode('Model', [200, 120]);

			setWorkflowNodes([nodeA, agentB, agentC, model]);
			mockWorkflowDocumentStore.connectionsBySourceNode = {
				A: {
					[NodeConnectionTypes.Main]: [
						[{ node: 'Agent B', type: NodeConnectionTypes.Main, index: 0 }],
					],
				},
				'Agent B': {
					[NodeConnectionTypes.Main]: [
						[{ node: 'Agent C', type: NodeConnectionTypes.Main, index: 0 }],
					],
				},
				Model: {
					[NodeConnectionTypes.AiLanguageModel]: [
						[{ node: 'Agent B', type: NodeConnectionTypes.AiLanguageModel, index: 0 }],
					],
				},
			};
			mockWorkflowDocumentStore.getParentNodes.mockImplementation((nodeName, type) => {
				if (nodeName === 'Agent B' && type === 'ALL_NON_MAIN') return ['Model'];
				return [];
			});

			const { extractWorkflow } = useWorkflowExtraction();

			extractWorkflow([agentB.id]);

			expect(mockUIStore.openModalWithData).toHaveBeenCalledTimes(1);
			const modalData = mockUIStore.openModalWithData.mock.calls[0][0].data as {
				subGraph: INodeUi[];
				selection: { start?: string; end?: string };
			};
			expect(modalData.subGraph.map((node) => node.name).sort()).toEqual(
				['Agent B', 'Model'].sort(),
			);
			expect(modalData.selection).toEqual({ start: 'Agent B', end: 'Agent B' });
		});
	});

	describe('extractNodesIntoSubworkflow', () => {
		it('strips connections referencing nodes outside the extracted selection', async () => {
			const nodeA = makeNode('A', [0, 0]);
			const nodeB = makeNode('B', [200, 0]);
			const nodeC = makeNode('C', [400, 0]); // outside the extracted selection

			setWorkflowNodes([nodeA, nodeB, nodeC]);
			mockWorkflowDocumentStore.connectionsBySourceNode = {
				A: {
					[NodeConnectionTypes.Main]: [
						[
							{ node: 'B', type: NodeConnectionTypes.Main, index: 0 },
							{ node: 'C', type: NodeConnectionTypes.Main, index: 0 },
						],
					],
				},
			};

			mockSuccessfulWorkflowCreation();

			const { extractNodesIntoSubworkflow } = useWorkflowExtraction();

			await extractNodesIntoSubworkflow(
				{ start: 'A', end: undefined },
				[nodeA, nodeB],
				'Sub-workflow',
			);

			expect(mockWorkflowsStore.createNewWorkflow).toHaveBeenCalledTimes(1);
			const created = mockWorkflowsStore.createNewWorkflow.mock.calls[0][0] as WorkflowDataCreate;

			const aMainBuckets = created.connections?.A?.[NodeConnectionTypes.Main];
			expect(aMainBuckets).toBeDefined();
			const targetsFromA = (aMainBuckets?.[0] ?? []).map((c) => c?.node);
			expect(targetsFromA).toContain('B');
			expect(targetsFromA).not.toContain('C');

			const allTargets = Object.values(created.connections ?? {}).flatMap((byType) =>
				Object.values(byType).flatMap((buckets) =>
					(buckets ?? []).flatMap((bucket) => (bucket ?? []).map((c) => c?.node)),
				),
			);
			expect(allTargets).not.toContain('C');

			const createdNodeNames = (created.nodes ?? []).map((n: INode) => n.name);
			expect(createdNodeNames).not.toContain('C');
		});

		it('records the Execute Workflow node joining the group as undoable history', async () => {
			const nodeA = makeNode('A', [0, 0]);
			const nodeB = makeNode('B', [200, 0]);
			const nodeC = makeNode('C', [400, 0]); // survives, so the group is kept
			const group = { id: 'g1', name: 'Group 1', nodeIds: [nodeA.id, nodeB.id, nodeC.id] };

			setWorkflowNodes([nodeA, nodeB, nodeC]);
			mockWorkflowDocumentStore.connectionsBySourceNode = {
				A: {
					[NodeConnectionTypes.Main]: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]],
				},
				B: {
					[NodeConnectionTypes.Main]: [[{ node: 'C', type: NodeConnectionTypes.Main, index: 0 }]],
				},
			};
			mockWorkflowDocumentStore.getGroupForNode.mockImplementation((nodeId: string) =>
				group.nodeIds.includes(nodeId) ? group : undefined,
			);
			mockWorkflowDocumentStore.getGroupById
				.mockReturnValueOnce({ ...group })
				.mockReturnValueOnce({ ...group, nodeIds: [...group.nodeIds, 'execute-node-id'] });

			mockSuccessfulWorkflowCreation();

			const { extractNodesIntoSubworkflow } = useWorkflowExtraction();

			await extractNodesIntoSubworkflow({ start: 'A', end: 'B' }, [nodeA, nodeB], 'Sub');

			expect(mockWorkflowDocumentStore.addNodesToGroup).toHaveBeenCalledWith(group.id, [
				'execute-node-id',
			]);

			const groupCommand = mockHistoryStore.pushCommandToUndo.mock.calls
				.map(([command]) => command)
				.find((command) => command instanceof UpdateNodeGroupCommand) as
				| UpdateNodeGroupCommand
				| undefined;
			expect(groupCommand).toBeInstanceOf(UpdateNodeGroupCommand);
			expect(groupCommand?.before.nodeIds).toEqual([nodeA.id, nodeB.id, nodeC.id]);
			expect(groupCommand?.after.nodeIds).toEqual([
				nodeA.id,
				nodeB.id,
				nodeC.id,
				'execute-node-id',
			]);
		});

		it('dissolves the group when every group member is extracted', async () => {
			const nodeA = makeNode('A', [0, 0]);
			const nodeB = makeNode('B', [200, 0]);
			const group = { id: 'g1', name: 'Group 1', nodeIds: [nodeA.id, nodeB.id] };

			setWorkflowNodes([nodeA, nodeB]);
			mockWorkflowDocumentStore.connectionsBySourceNode = {
				A: {
					[NodeConnectionTypes.Main]: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]],
				},
			};
			mockWorkflowDocumentStore.getGroupForNode.mockImplementation((nodeId: string) =>
				group.nodeIds.includes(nodeId) ? group : undefined,
			);
			mockWorkflowDocumentStore.getGroupById.mockReturnValue({
				...group,
				nodeIds: [...group.nodeIds],
			});

			mockSuccessfulWorkflowCreation();

			const { extractNodesIntoSubworkflow } = useWorkflowExtraction();

			await extractNodesIntoSubworkflow({ start: 'A', end: 'B' }, [nodeA, nodeB], 'Sub');

			expect(mockWorkflowDocumentStore.deleteGroup).toHaveBeenCalledWith(group.id);

			expect(mockWorkflowDocumentStore.addNodesToGroup).not.toHaveBeenCalled();

			const removeCommand = mockHistoryStore.pushCommandToUndo.mock.calls
				.map(([command]) => command)
				.find((command) => command instanceof RemoveNodeGroupCommand) as
				| RemoveNodeGroupCommand
				| undefined;
			expect(removeCommand).toBeInstanceOf(RemoveNodeGroupCommand);
			expect(removeCommand?.group.nodeIds).toEqual([nodeA.id, nodeB.id]);

			expect(mockGroupTelemetry.trackUngrouped).toHaveBeenCalledWith(
				expect.objectContaining({ id: group.id }),
				'sub-workflow-extraction',
			);
		});

		it('keeps the group when only some members are extracted', async () => {
			const nodeA = makeNode('A', [0, 0]);
			const nodeB = makeNode('B', [200, 0]);
			const nodeC = makeNode('C', [400, 0]);
			const group = { id: 'g1', name: 'Group 1', nodeIds: [nodeA.id, nodeB.id, nodeC.id] };

			setWorkflowNodes([nodeA, nodeB, nodeC]);
			mockWorkflowDocumentStore.connectionsBySourceNode = {
				A: {
					[NodeConnectionTypes.Main]: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]],
				},
				B: {
					[NodeConnectionTypes.Main]: [[{ node: 'C', type: NodeConnectionTypes.Main, index: 0 }]],
				},
			};
			mockWorkflowDocumentStore.getGroupForNode.mockImplementation((nodeId: string) =>
				group.nodeIds.includes(nodeId) ? group : undefined,
			);
			mockWorkflowDocumentStore.getGroupById
				.mockReturnValueOnce({ ...group, nodeIds: [...group.nodeIds] })
				.mockReturnValueOnce({ ...group, nodeIds: [...group.nodeIds, 'execute-node-id'] });

			mockSuccessfulWorkflowCreation();

			const { extractNodesIntoSubworkflow } = useWorkflowExtraction();

			await extractNodesIntoSubworkflow({ start: 'A', end: 'B' }, [nodeA, nodeB], 'Sub');

			expect(mockWorkflowDocumentStore.addNodesToGroup).toHaveBeenCalledWith(group.id, [
				'execute-node-id',
			]);

			expect(mockWorkflowDocumentStore.deleteGroup).not.toHaveBeenCalled();
			expect(mockGroupTelemetry.trackUngrouped).not.toHaveBeenCalled();
		});

		it('copies shared sub-nodes into the sub-workflow but keeps them in the parent', async () => {
			const nodeA = makeNode('A', [0, 0]);
			const agentB = makeNode('Agent B', [200, 0]);
			const agentC = makeNode('Agent C', [400, 0]);
			agentC.parameters = { value: '={{ $("Model").item.json.foo }}' };
			const model = makeNode('Model', [200, 120]);
			const agentGroup = { id: 'agents', name: 'Agents', nodeIds: [agentB.id, agentC.id] };
			const modelGroup = { id: 'models', name: 'Models', nodeIds: [model.id] };

			setWorkflowNodes([nodeA, agentB, agentC, model]);
			mockWorkflowDocumentStore.getGroupForNode.mockImplementation((nodeId: string) => {
				if (agentGroup.nodeIds.includes(nodeId)) return agentGroup;
				if (modelGroup.nodeIds.includes(nodeId)) return modelGroup;
				return undefined;
			});
			mockWorkflowDocumentStore.getGroupById
				.mockReturnValueOnce({ ...agentGroup })
				.mockReturnValueOnce({
					...agentGroup,
					nodeIds: [...agentGroup.nodeIds, 'execute-node-id'],
				});
			mockWorkflowDocumentStore.connectionsBySourceNode = {
				A: {
					[NodeConnectionTypes.Main]: [
						[{ node: 'Agent B', type: NodeConnectionTypes.Main, index: 0 }],
					],
				},
				'Agent B': {
					[NodeConnectionTypes.Main]: [
						[{ node: 'Agent C', type: NodeConnectionTypes.Main, index: 0 }],
					],
				},
				Model: {
					[NodeConnectionTypes.AiLanguageModel]: [
						[
							{ node: 'Agent B', type: NodeConnectionTypes.AiLanguageModel, index: 0 },
							{ node: 'Agent C', type: NodeConnectionTypes.AiLanguageModel, index: 0 },
						],
					],
				},
			};
			mockWorkflowDocumentStore.getChildNodes.mockImplementation((nodeName, type) => {
				if (nodeName === 'Agent B' && type === NodeConnectionTypes.Main) return ['Agent C'];
				if (nodeName === 'Agent B' && type === 'ALL') return ['Agent C'];
				return [];
			});
			mockSuccessfulWorkflowCreation();

			const { extractNodesIntoSubworkflow } = useWorkflowExtraction();

			await extractNodesIntoSubworkflow(
				{ start: 'Agent B', end: 'Agent B' },
				[agentB, model],
				'Sub',
			);

			const created = mockWorkflowsStore.createNewWorkflow.mock.calls[0][0] as WorkflowDataCreate;
			expect((created.nodes ?? []).map((node: INode) => node.name)).toEqual(
				expect.arrayContaining(['Agent B', 'Model']),
			);

			const modelConnections =
				created.connections?.Model?.[NodeConnectionTypes.AiLanguageModel]?.[0] ?? [];
			expect(modelConnections.map((connection) => connection.node)).toEqual(['Agent B']);
			expect(mockCanvasOperations.deleteNodes.mock.calls[0][0]).toEqual([agentB.id]);
			expect(mockWorkflowDocumentStore.addNodesToGroup).toHaveBeenCalledWith(agentGroup.id, [
				'execute-node-id',
			]);
			expect(mockCanvasOperations.replaceNodeParameters).not.toHaveBeenCalled();
		});

		it('removes unshared extracted sub-nodes from the parent', async () => {
			const nodeA = makeNode('A', [0, 0]);
			const agentB = makeNode('Agent B', [200, 0]);
			const agentC = makeNode('Agent C', [400, 0]);
			const memory = makeNode('Memory', [200, 120]);

			setWorkflowNodes([nodeA, agentB, agentC, memory]);
			mockWorkflowDocumentStore.connectionsBySourceNode = {
				A: {
					[NodeConnectionTypes.Main]: [
						[{ node: 'Agent B', type: NodeConnectionTypes.Main, index: 0 }],
					],
				},
				'Agent B': {
					[NodeConnectionTypes.Main]: [
						[{ node: 'Agent C', type: NodeConnectionTypes.Main, index: 0 }],
					],
				},
				Memory: {
					[NodeConnectionTypes.AiMemory]: [
						[{ node: 'Agent B', type: NodeConnectionTypes.AiMemory, index: 0 }],
					],
				},
			};
			mockWorkflowDocumentStore.getChildNodes.mockImplementation((nodeName, type) => {
				if (nodeName === 'Agent B' && type === NodeConnectionTypes.Main) return ['Agent C'];
				if (nodeName === 'Agent B' && type === 'ALL') return ['Agent C'];
				return [];
			});
			mockSuccessfulWorkflowCreation();

			const { extractNodesIntoSubworkflow } = useWorkflowExtraction();

			await extractNodesIntoSubworkflow(
				{ start: 'Agent B', end: 'Agent B' },
				[agentB, memory],
				'Sub',
			);

			const created = mockWorkflowsStore.createNewWorkflow.mock.calls[0][0] as WorkflowDataCreate;
			const memoryConnections =
				created.connections?.Memory?.[NodeConnectionTypes.AiMemory]?.[0] ?? [];
			expect(memoryConnections.map((connection) => connection.node)).toEqual(['Agent B']);
			expect(mockCanvasOperations.deleteNodes.mock.calls[0][0]).toEqual([agentB.id, memory.id]);
		});

		it('keeps sub-nodes that feed preserved shared sub-nodes in the parent', async () => {
			const agentB = makeNode('Agent B', [200, 0]);
			const agentC = makeNode('Agent C', [400, 0]);
			const model = makeNode('Model', [200, 120]);
			const parser = makeNode('Parser', [200, 240]);

			setWorkflowNodes([agentB, agentC, model, parser]);
			mockWorkflowDocumentStore.connectionsBySourceNode = {
				Model: {
					[NodeConnectionTypes.AiLanguageModel]: [
						[
							{ node: 'Agent B', type: NodeConnectionTypes.AiLanguageModel, index: 0 },
							{ node: 'Agent C', type: NodeConnectionTypes.AiLanguageModel, index: 0 },
						],
					],
				},
				Parser: {
					[NodeConnectionTypes.AiOutputParser]: [
						[{ node: 'Model', type: NodeConnectionTypes.AiOutputParser, index: 0 }],
					],
				},
			};
			mockSuccessfulWorkflowCreation();

			const { extractNodesIntoSubworkflow } = useWorkflowExtraction();

			await extractNodesIntoSubworkflow(
				{ start: undefined, end: undefined },
				[agentB, model, parser],
				'Sub',
			);

			expect(mockCanvasOperations.deleteNodes.mock.calls[0][0]).toEqual([agentB.id]);
		});
	});

	describe('sub-workflow node groups', () => {
		it('preserves a group when the selection includes that group plus extra nodes', async () => {
			const nodeA = makeNode('A', [0, 0]);
			const nodeB = makeNode('B', [200, 0]);
			const nodeC = makeNode('C', [400, 0]); // extra node outside the group
			const group = { id: 'g1', name: 'Group 1', nodeIds: [nodeA.id, nodeB.id] };

			setWorkflowNodes([nodeA, nodeB, nodeC]);
			mockWorkflowDocumentStore.allGroups = [group];
			mockWorkflowDocumentStore.connectionsBySourceNode = {
				A: {
					[NodeConnectionTypes.Main]: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]],
				},
				B: {
					[NodeConnectionTypes.Main]: [[{ node: 'C', type: NodeConnectionTypes.Main, index: 0 }]],
				},
			};

			mockSuccessfulWorkflowCreation();

			const { extractNodesIntoSubworkflow } = useWorkflowExtraction();

			await extractNodesIntoSubworkflow({ start: 'A', end: 'C' }, [nodeA, nodeB, nodeC], 'Sub');

			const created = mockWorkflowsStore.createNewWorkflow.mock.calls[0][0] as WorkflowDataCreate;
			expect(created.nodeGroups).toHaveLength(1);
			expect(created.nodeGroups?.[0].name).toBe('Group 1');
			expect(created.nodeGroups?.[0].nodeIds).toEqual([nodeA.id, nodeB.id]);
			// A fresh id is minted so the sub-workflow copy doesn't share the parent group id.
			expect(created.nodeGroups?.[0].id).not.toBe(group.id);
		});

		it('preserves every group when the selection spans multiple groups', async () => {
			const nodeA1 = makeNode('A1', [0, 0]);
			const nodeA2 = makeNode('A2', [200, 0]);
			const nodeB1 = makeNode('B1', [400, 0]);
			const nodeB2 = makeNode('B2', [600, 0]);
			const groupA = { id: 'gA', name: 'Group A', nodeIds: [nodeA1.id, nodeA2.id] };
			const groupB = { id: 'gB', name: 'Group B', nodeIds: [nodeB1.id, nodeB2.id] };

			setWorkflowNodes([nodeA1, nodeA2, nodeB1, nodeB2]);
			mockWorkflowDocumentStore.allGroups = [groupA, groupB];
			mockWorkflowDocumentStore.connectionsBySourceNode = {
				A1: {
					[NodeConnectionTypes.Main]: [[{ node: 'A2', type: NodeConnectionTypes.Main, index: 0 }]],
				},
				A2: {
					[NodeConnectionTypes.Main]: [[{ node: 'B1', type: NodeConnectionTypes.Main, index: 0 }]],
				},
				B1: {
					[NodeConnectionTypes.Main]: [[{ node: 'B2', type: NodeConnectionTypes.Main, index: 0 }]],
				},
			};

			mockSuccessfulWorkflowCreation();

			const { extractNodesIntoSubworkflow } = useWorkflowExtraction();

			await extractNodesIntoSubworkflow(
				{ start: 'A1', end: 'B2' },
				[nodeA1, nodeA2, nodeB1, nodeB2],
				'Sub',
			);

			const created = mockWorkflowsStore.createNewWorkflow.mock.calls[0][0] as WorkflowDataCreate;
			expect(created.nodeGroups).toHaveLength(2);
			const byName = Object.fromEntries((created.nodeGroups ?? []).map((g) => [g.name, g]));
			expect(byName['Group A'].nodeIds).toEqual([nodeA1.id, nodeA2.id]);
			expect(byName['Group B'].nodeIds).toEqual([nodeB1.id, nodeB2.id]);
		});

		it('does not recreate the group when the whole selection is exactly the same as that group', async () => {
			const nodeA = makeNode('A', [0, 0]);
			const nodeB = makeNode('B', [200, 0]);
			const group = { id: 'g1', name: 'Group 1', nodeIds: [nodeA.id, nodeB.id] };

			setWorkflowNodes([nodeA, nodeB]);
			mockWorkflowDocumentStore.allGroups = [group];
			mockWorkflowDocumentStore.connectionsBySourceNode = {
				A: {
					[NodeConnectionTypes.Main]: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]],
				},
			};

			mockSuccessfulWorkflowCreation();

			const { extractNodesIntoSubworkflow } = useWorkflowExtraction();

			await extractNodesIntoSubworkflow({ start: 'A', end: 'B' }, [nodeA, nodeB], 'Sub');

			const created = mockWorkflowsStore.createNewWorkflow.mock.calls[0][0] as WorkflowDataCreate;
			expect(created.nodeGroups).toEqual([]);
		});

		it('does not recreate a group that is only partially in the selection', async () => {
			const nodeA = makeNode('A', [0, 0]);
			const nodeB = makeNode('B', [200, 0]);
			const nodeC = makeNode('C', [400, 0]); // group member left behind
			const group = { id: 'g1', name: 'Group 1', nodeIds: [nodeA.id, nodeB.id, nodeC.id] };

			setWorkflowNodes([nodeA, nodeB, nodeC]);
			mockWorkflowDocumentStore.allGroups = [group];
			mockWorkflowDocumentStore.connectionsBySourceNode = {
				A: {
					[NodeConnectionTypes.Main]: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]],
				},
				B: {
					[NodeConnectionTypes.Main]: [[{ node: 'C', type: NodeConnectionTypes.Main, index: 0 }]],
				},
			};

			mockSuccessfulWorkflowCreation();

			const { extractNodesIntoSubworkflow } = useWorkflowExtraction();

			await extractNodesIntoSubworkflow({ start: 'A', end: 'B' }, [nodeA, nodeB], 'Sub');

			const created = mockWorkflowsStore.createNewWorkflow.mock.calls[0][0] as WorkflowDataCreate;
			expect(created.nodeGroups).toEqual([]);
		});

		it('creates no groups when the workflow has none', async () => {
			const nodeA = makeNode('A', [0, 0]);
			const nodeB = makeNode('B', [200, 0]);

			setWorkflowNodes([nodeA, nodeB]);
			mockWorkflowDocumentStore.connectionsBySourceNode = {
				A: {
					[NodeConnectionTypes.Main]: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]],
				},
			};

			mockSuccessfulWorkflowCreation();

			const { extractNodesIntoSubworkflow } = useWorkflowExtraction();

			await extractNodesIntoSubworkflow({ start: 'A', end: 'B' }, [nodeA, nodeB], 'Sub');

			const created = mockWorkflowsStore.createNewWorkflow.mock.calls[0][0] as WorkflowDataCreate;
			expect(created.nodeGroups).toEqual([]);
		});
	});
});
