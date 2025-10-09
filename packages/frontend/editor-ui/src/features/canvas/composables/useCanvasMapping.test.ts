import type { INode, NodeApiError, Workflow } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import { setActivePinia } from 'pinia';
import type { Ref } from 'vue';
import { ref } from 'vue';

import {
	createTestNode,
	createTestWorkflowObject,
	mockNode,
	mockNodes,
	mockNodeTypeDescription,
} from '@/__tests__/mocks';
import { mockedStore } from '@/__tests__/utils';
import { useCanvasMapping } from '@/features/canvas/composables/useCanvasMapping';
import {
	FORM_TRIGGER_NODE_TYPE,
	MANUAL_TRIGGER_NODE_TYPE,
	SET_NODE_TYPE,
	STICKY_NODE_TYPE,
} from '@/constants';
import type { INodeUi } from '@/Interface';
import { useWorkflowsStore } from '@/stores/workflows.store';
import {
	CanvasConnectionMode,
	CanvasNodeRenderType,
	type CanvasNodeDefaultRender,
} from '../canvas.types';
import { createCanvasConnectionHandleString, createCanvasConnectionId } from '../canvas.utils';
import { STORES } from '@n8n/stores';
import { useRootStore } from '@n8n/stores/useRootStore';
import { createTestingPinia } from '@pinia/testing';
import { MarkerType } from '@vue-flow/core';
import { mock } from 'vitest-mock-extended';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import {
	injectWorkflowState,
	useWorkflowState,
	type WorkflowState,
} from '@/composables/useWorkflowState';

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		shortNodeType: (nodeType: string) => nodeType,
		nodeText: (key: string) => ({
			eventTriggerDescription: () => key,
		}),
		baseText: (key: string, options: { interpolate: { count: number } }) => {
			if (key === 'ndv.output.items') {
				return `${options.interpolate.count} item${options.interpolate.count > 1 ? 's' : ''}`;
			} else if (key === 'ndv.output.itemsTotal') {
				return `${options.interpolate.count} items total`;
			} else {
				return key;
			}
		},
	}),
}));

vi.mock('@/composables/useWorkflowState', async () => {
	const actual = await vi.importActual('@/composables/useWorkflowState');
	return {
		...actual,
		injectWorkflowState: vi.fn(),
	};
});

let workflowState: WorkflowState;

beforeEach(() => {
	const pinia = createTestingPinia({
		initialState: {
			[STORES.WORKFLOWS]: {
				workflowExecutionData: {},
			},
			[STORES.NODE_TYPES]: {
				nodeTypes: {
					[MANUAL_TRIGGER_NODE_TYPE]: {
						1: mockNodeTypeDescription({
							name: MANUAL_TRIGGER_NODE_TYPE,
							group: ['trigger'],
						}),
					},
					[FORM_TRIGGER_NODE_TYPE]: {
						1: mockNodeTypeDescription({
							name: FORM_TRIGGER_NODE_TYPE,
							group: ['trigger'],
							eventTriggerDescription: 'n8n-nodes-base.formTrigger',
						}),
					},
					[SET_NODE_TYPE]: {
						1: mockNodeTypeDescription({
							name: SET_NODE_TYPE,
						}),
					},
				},
			},
		},
	});
	setActivePinia(pinia);

	workflowState = useWorkflowState();
	vi.mocked(injectWorkflowState).mockReturnValue(workflowState);
});

afterEach(() => {
	vi.clearAllMocks();
});

describe('useCanvasMapping', () => {
	it('should initialize with default props', () => {
		const nodes: INodeUi[] = [];
		const connections = {};
		const workflowObject = createTestWorkflowObject({
			nodes,
			connections,
		});

		const { nodes: mappedNodes, connections: mappedConnections } = useCanvasMapping({
			nodes: ref(nodes),
			connections: ref(connections),
			workflowObject: ref(workflowObject) as Ref<Workflow>,
		});

		expect(mappedNodes.value).toEqual([]);
		expect(mappedConnections.value).toEqual([]);
	});

	describe('nodes', () => {
		it('should map nodes to canvas nodes', () => {
			const manualTriggerNode = mockNode({
				name: 'Manual Trigger',
				type: MANUAL_TRIGGER_NODE_TYPE,
				disabled: false,
			});
			const nodes = [manualTriggerNode];
			const connections = {};
			const workflowObject = createTestWorkflowObject({
				nodes,
				connections,
			});
			workflowState.executingNode.isNodeExecuting = vi.fn().mockReturnValue(false);

			const { nodes: mappedNodes } = useCanvasMapping({
				nodes: ref(nodes),
				connections: ref(connections),
				workflowObject: ref(workflowObject) as Ref<Workflow>,
			});

			expect(mappedNodes.value).toEqual([
				{
					id: manualTriggerNode.id,
					label: manualTriggerNode.name,
					type: 'canvas-node',
					position: expect.anything(),
					draggable: true,
					data: {
						id: manualTriggerNode.id,
						name: manualTriggerNode.name,
						subtitle: '',
						type: manualTriggerNode.type,
						typeVersion: expect.anything(),
						disabled: false,
						execution: {
							status: 'new',
							running: false,
							waiting: undefined,
							waitingForNext: false,
						},
						issues: {
							execution: [],
							validation: [],
							visible: false,
						},
						pinnedData: {
							count: 0,
							visible: false,
						},
						runData: {
							iterations: 0,
							outputMap: {},
							visible: false,
						},
						inputs: [
							{
								index: 0,
								label: undefined,
								type: 'main',
							},
						],
						outputs: [
							{
								index: 0,
								label: undefined,
								type: 'main',
							},
						],
						connections: {
							[CanvasConnectionMode.Input]: {},
							[CanvasConnectionMode.Output]: {},
						},
						render: {
							type: CanvasNodeRenderType.Default,
							options: {
								configurable: false,
								configuration: false,
								icon: {
									src: '/nodes/test-node/icon.svg',
									type: 'file',
								},
								trigger: true,
								inputs: {
									labelSize: 'small',
								},
								outputs: {
									labelSize: 'small',
								},
							},
						},
					},
				},
			]);
		});

		it('should handle node disabled state', () => {
			const manualTriggerNode = mockNode({
				name: 'Manual Trigger',
				type: MANUAL_TRIGGER_NODE_TYPE,
				disabled: true,
			});
			const nodes = [manualTriggerNode];
			const connections = {};
			const workflowObject = createTestWorkflowObject({
				nodes,
				connections,
			});

			const { nodes: mappedNodes } = useCanvasMapping({
				nodes: ref(nodes),
				connections: ref(connections),
				workflowObject: ref(workflowObject) as Ref<Workflow>,
			});

			expect(mappedNodes.value[0]?.data?.disabled).toEqual(true);
		});

		it('should handle execution state', () => {
			const manualTriggerNode = mockNode({
				name: 'Manual Trigger',
				type: MANUAL_TRIGGER_NODE_TYPE,
				disabled: true,
			});
			const nodes = [manualTriggerNode];
			const connections = {};
			const workflowObject = createTestWorkflowObject({
				nodes,
				connections,
			});

			workflowState.executingNode.isNodeExecuting = vi.fn().mockReturnValue(true);

			const { nodes: mappedNodes } = useCanvasMapping({
				nodes: ref(nodes),
				connections: ref(connections),
				workflowObject: ref(workflowObject) as Ref<Workflow>,
			});

			expect(mappedNodes.value[0]?.data?.execution.running).toEqual(true);
		});

		it('should handle input and output connections', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);

			const [manualTriggerNode, setNode] = mockNodes.slice(0, 2);
			const nodes = [manualTriggerNode, setNode];
			const connections = {
				[manualTriggerNode.name]: {
					[NodeConnectionTypes.Main]: [
						[{ node: setNode.name, type: NodeConnectionTypes.Main, index: 0 }],
					],
				},
			};

			workflowsStore.workflow.connections = connections;

			const workflowObject = createTestWorkflowObject({
				nodes,
				connections,
			});

			const { nodes: mappedNodes } = useCanvasMapping({
				nodes: ref(nodes),
				connections: ref(connections),
				workflowObject: ref(workflowObject) as Ref<Workflow>,
			});

			expect(mappedNodes.value[0]?.data?.connections[CanvasConnectionMode.Output]).toHaveProperty(
				NodeConnectionTypes.Main,
			);
			expect(
				mappedNodes.value[0]?.data?.connections[CanvasConnectionMode.Output][
					NodeConnectionTypes.Main
				][0]?.[0],
			).toEqual(
				expect.objectContaining({
					node: setNode.name,
					type: NodeConnectionTypes.Main,
					index: 0,
				}),
			);

			expect(mappedNodes.value[1]?.data?.connections[CanvasConnectionMode.Input]).toHaveProperty(
				NodeConnectionTypes.Main,
			);
			expect(
				mappedNodes.value[1]?.data?.connections[CanvasConnectionMode.Input][
					NodeConnectionTypes.Main
				][0]?.[0],
			).toEqual(
				expect.objectContaining({
					node: manualTriggerNode.name,
					type: NodeConnectionTypes.Main,
					index: 0,
				}),
			);
		});
	});

	describe('render', () => {
		it('should handle render options for default node type', () => {
			const manualTriggerNode = mockNode({
				name: 'Manual Trigger',
				type: MANUAL_TRIGGER_NODE_TYPE,
				disabled: false,
			});
			const nodes = [manualTriggerNode];
			const connections = {};
			const workflowObject = createTestWorkflowObject({
				nodes,
				connections,
			});

			const { nodes: mappedNodes } = useCanvasMapping({
				nodes: ref(nodes),
				connections: ref(connections),
				workflowObject: ref(workflowObject) as Ref<Workflow>,
			});

			const rootStore = mockedStore(useRootStore);
			rootStore.baseUrl = 'http://test.local/';

			expect(mappedNodes.value[0]?.data?.render).toEqual({
				type: CanvasNodeRenderType.Default,
				options: {
					configurable: false,
					configuration: false,
					trigger: true,
					icon: {
						src: 'http://test.local/nodes/test-node/icon.svg',
						type: 'file',
					},
					inputs: {
						labelSize: 'small',
					},
					outputs: {
						labelSize: 'small',
					},
				},
			});
		});

		it('should handle render options for addNodes node type', () => {
			const addNodesNode = mockNode({
				name: CanvasNodeRenderType.AddNodes,
				type: CanvasNodeRenderType.AddNodes,
				disabled: false,
			});
			const nodes = [addNodesNode];
			const connections = {};
			const workflowObject = createTestWorkflowObject({
				nodes: [],
				connections,
			});

			const { nodes: mappedNodes } = useCanvasMapping({
				nodes: ref(nodes),
				connections: ref(connections),
				workflowObject: ref(workflowObject) as Ref<Workflow>,
			});

			expect(mappedNodes.value[0]?.data?.render).toEqual({
				type: CanvasNodeRenderType.AddNodes,
				options: {},
			});
		});

		it('should handle render options for stickyNote node type', () => {
			const stickyNoteNode = mockNode({
				name: 'Sticky',
				type: STICKY_NODE_TYPE,
				disabled: false,
				parameters: {
					width: 200,
					height: 200,
					color: 3,
					content: '# Hello world',
				},
			});
			const nodes = [stickyNoteNode];
			const connections = {};
			const workflowObject = createTestWorkflowObject({
				nodes,
				connections,
			});

			const { nodes: mappedNodes } = useCanvasMapping({
				nodes: ref(nodes),
				connections: ref(connections),
				workflowObject: ref(workflowObject) as Ref<Workflow>,
			});

			expect(mappedNodes.value[0]?.data?.render).toEqual({
				type: CanvasNodeRenderType.StickyNote,
				options: stickyNoteNode.parameters,
			});
		});
	});

	describe('runData', () => {
		describe('nodeExecutionRunDataOutputMapById', () => {
			it('should return an empty object when there is no run data', () => {
				const workflowsStore = mockedStore(useWorkflowsStore);
				const nodes: INodeUi[] = [];
				const connections = {};
				const workflowObject = createTestWorkflowObject({
					nodes,
					connections,
				});

				workflowsStore.getWorkflowResultDataByNodeName.mockReturnValue(null);

				const { nodeExecutionRunDataOutputMapById } = useCanvasMapping({
					nodes: ref(nodes),
					connections: ref(connections),
					workflowObject: ref(workflowObject) as Ref<Workflow>,
				});

				expect(nodeExecutionRunDataOutputMapById.value).toEqual({});
			});

			it('should calculate iterations and total correctly for single node', () => {
				const workflowsStore = mockedStore(useWorkflowsStore);
				const nodes = [createTestNode({ name: 'Node 1' })];
				const connections = {};
				const workflowObject = createTestWorkflowObject({
					nodes,
					connections,
				});

				workflowsStore.getWorkflowResultDataByNodeName.mockReturnValue([
					{
						startTime: 0,
						executionTime: 0,
						executionIndex: 0,
						source: [],
						data: {
							[NodeConnectionTypes.Main]: [[{ json: {} }, { json: {} }]],
						},
					},
				]);

				const { nodeExecutionRunDataOutputMapById } = useCanvasMapping({
					nodes: ref(nodes),
					connections: ref(connections),
					workflowObject: ref(workflowObject) as Ref<Workflow>,
				});

				expect(nodeExecutionRunDataOutputMapById.value).toEqual({
					[nodes[0].id]: {
						[NodeConnectionTypes.Main]: {
							0: {
								iterations: 1,
								total: 2,
							},
						},
					},
				});
			});

			it('should handle multiple nodes with different connection types', () => {
				const workflowsStore = mockedStore(useWorkflowsStore);
				const nodes = [
					createTestNode({ id: 'node1', name: 'Node 1' }),
					createTestNode({ id: 'node2', name: 'Node 2' }),
				];
				const connections = {};
				const workflowObject = createTestWorkflowObject({
					nodes,
					connections,
				});

				workflowsStore.getWorkflowResultDataByNodeName.mockImplementation((nodeName: string) => {
					if (nodeName === 'Node 1') {
						return [
							{
								startTime: 0,
								executionTime: 0,
								executionIndex: 0,
								source: [],
								data: {
									[NodeConnectionTypes.Main]: [[{ json: {} }]],
									[NodeConnectionTypes.AiAgent]: [[{ json: {} }, { json: {} }]],
								},
							},
						];
					} else if (nodeName === 'Node 2') {
						return [
							{
								startTime: 0,
								executionTime: 0,
								executionIndex: 0,
								source: [],
								data: {
									[NodeConnectionTypes.Main]: [[{ json: {} }, { json: {} }, { json: {} }]],
								},
							},
						];
					}

					return null;
				});

				const { nodeExecutionRunDataOutputMapById } = useCanvasMapping({
					nodes: ref(nodes),
					connections: ref(connections),
					workflowObject: ref(workflowObject) as Ref<Workflow>,
				});

				expect(nodeExecutionRunDataOutputMapById.value).toEqual({
					node1: {
						[NodeConnectionTypes.Main]: {
							0: {
								iterations: 1,
								total: 1,
							},
						},
						[NodeConnectionTypes.AiAgent]: {
							0: {
								iterations: 1,
								total: 2,
							},
						},
					},
					node2: {
						[NodeConnectionTypes.Main]: {
							0: {
								iterations: 1,
								total: 3,
							},
						},
					},
				});
			});

			it('handles multiple iterations correctly', () => {
				const workflowsStore = mockedStore(useWorkflowsStore);
				const nodes = [createTestNode({ name: 'Node 1' })];
				const connections = {};
				const workflowObject = createTestWorkflowObject({
					nodes,
					connections,
				});

				workflowsStore.getWorkflowResultDataByNodeName.mockReturnValue([
					{
						startTime: 0,
						executionTime: 0,
						executionIndex: 0,
						source: [],
						data: {
							[NodeConnectionTypes.Main]: [[{ json: {} }]],
						},
					},
					{
						startTime: 0,
						executionTime: 0,
						executionIndex: 1,
						source: [],
						data: {
							[NodeConnectionTypes.Main]: [[{ json: {} }, { json: {} }, { json: {} }]],
						},
					},
					{
						startTime: 0,
						executionTime: 0,
						executionIndex: 2,
						source: [],
						data: {
							[NodeConnectionTypes.Main]: [[{ json: {} }, { json: {} }]],
						},
					},
				]);

				const { nodeExecutionRunDataOutputMapById } = useCanvasMapping({
					nodes: ref(nodes),
					connections: ref(connections),
					workflowObject: ref(workflowObject) as Ref<Workflow>,
				});

				expect(nodeExecutionRunDataOutputMapById.value).toEqual({
					[nodes[0].id]: {
						[NodeConnectionTypes.Main]: {
							0: {
								iterations: 3,
								total: 6,
							},
						},
					},
				});
			});

			it('should not count canceled iterations but still count their data', () => {
				const workflowsStore = mockedStore(useWorkflowsStore);
				const nodes = [createTestNode({ name: 'Node 1' })];
				const connections = {};
				const workflowObject = createTestWorkflowObject({
					nodes,
					connections,
				});

				workflowsStore.getWorkflowResultDataByNodeName.mockReturnValue([
					{
						startTime: 0,
						executionTime: 0,
						executionIndex: 0,
						source: [],
						executionStatus: 'success',
						data: {
							[NodeConnectionTypes.Main]: [[{ json: {} }, { json: {} }]],
						},
					},
					{
						startTime: 0,
						executionTime: 0,
						executionIndex: 1,
						source: [],
						executionStatus: 'canceled',
						data: {
							[NodeConnectionTypes.Main]: [[{ json: {} }, { json: {} }, { json: {} }]],
						},
					},
					{
						startTime: 0,
						executionTime: 0,
						executionIndex: 2,
						source: [],
						executionStatus: 'success',
						data: {
							[NodeConnectionTypes.Main]: [[{ json: {} }]],
						},
					},
				]);

				const { nodeExecutionRunDataOutputMapById } = useCanvasMapping({
					nodes: ref(nodes),
					connections: ref(connections),
					workflowObject: ref(workflowObject) as Ref<Workflow>,
				});

				expect(nodeExecutionRunDataOutputMapById.value).toEqual({
					[nodes[0].id]: {
						[NodeConnectionTypes.Main]: {
							0: {
								iterations: 2, // Only 2 iterations counted (not the canceled one)
								total: 6, // All data items still counted
							},
						},
					},
				});
			});

			it('should handle all canceled iterations correctly', () => {
				const workflowsStore = mockedStore(useWorkflowsStore);
				const nodes = [createTestNode({ name: 'Node 1' })];
				const connections = {};
				const workflowObject = createTestWorkflowObject({
					nodes,
					connections,
				});

				workflowsStore.getWorkflowResultDataByNodeName.mockReturnValue([
					{
						startTime: 0,
						executionTime: 0,
						executionIndex: 0,
						source: [],
						executionStatus: 'canceled',
						data: {
							[NodeConnectionTypes.Main]: [[{ json: {} }, { json: {} }]],
						},
					},
					{
						startTime: 0,
						executionTime: 0,
						executionIndex: 1,
						source: [],
						executionStatus: 'canceled',
						data: {
							[NodeConnectionTypes.Main]: [[{ json: {} }]],
						},
					},
				]);

				const { nodeExecutionRunDataOutputMapById } = useCanvasMapping({
					nodes: ref(nodes),
					connections: ref(connections),
					workflowObject: ref(workflowObject) as Ref<Workflow>,
				});

				expect(nodeExecutionRunDataOutputMapById.value).toEqual({
					[nodes[0].id]: {
						[NodeConnectionTypes.Main]: {
							0: {
								iterations: 0, // No iterations counted since all are canceled
								total: 3, // But data items still counted
							},
						},
					},
				});
			});
		});

		describe('additionalNodePropertiesById', () => {
			it('should return empty object when there are no sticky nodes', () => {
				const nodes = ref([]);
				const connections = {};
				const workflowObject = createTestWorkflowObject();
				const { additionalNodePropertiesById } = useCanvasMapping({
					nodes: ref(nodes),
					connections: ref(connections),
					workflowObject: ref(workflowObject) as Ref<Workflow>,
				});
				expect(additionalNodePropertiesById.value).toEqual({});
			});

			it('should calculate zIndex correctly for a single sticky node', () => {
				const nodes = [
					createTestNode({
						id: '1',
						type: STICKY_NODE_TYPE,
						position: [0, 0],
						parameters: { width: 100, height: 100 },
					}),
				];
				const connections = {};
				const workflowObject = createTestWorkflowObject();
				const { additionalNodePropertiesById } = useCanvasMapping({
					nodes: ref(nodes),
					connections: ref(connections),
					workflowObject: ref(workflowObject) as Ref<Workflow>,
				});
				expect(additionalNodePropertiesById.value[nodes[0].id]).toEqual({
					style: { zIndex: -100 },
				});
			});

			it('should calculate zIndex correctly for multiple sticky nodes with no overlap', () => {
				const nodes = [
					createTestNode({
						id: '1',
						type: STICKY_NODE_TYPE,
						position: [0, 0],
						parameters: { width: 100, height: 100 },
					}),
					createTestNode({
						id: '2',
						type: STICKY_NODE_TYPE,
						position: [200, 200],
						parameters: { width: 100, height: 100 },
					}),
				];
				const connections = {};
				const workflowObject = createTestWorkflowObject();
				const { additionalNodePropertiesById } = useCanvasMapping({
					nodes: ref(nodes),
					connections: ref(connections),
					workflowObject: ref(workflowObject) as Ref<Workflow>,
				});

				expect(additionalNodePropertiesById.value[nodes[0].id]).toEqual({
					style: { zIndex: -100 },
				});
				expect(additionalNodePropertiesById.value[nodes[1].id]).toEqual({
					style: { zIndex: -99 },
				});
			});

			it('should calculate zIndex correctly for overlapping sticky nodes', () => {
				const nodes = [
					createTestNode({
						id: '1',
						type: STICKY_NODE_TYPE,
						position: [50, 50],
						parameters: { width: 100, height: 100 },
					}),
					createTestNode({
						id: '2',
						type: STICKY_NODE_TYPE,
						position: [0, 0],
						parameters: { width: 150, height: 150 },
					}),
				];
				const connections = {};
				const workflowObject = createTestWorkflowObject();
				const { additionalNodePropertiesById } = useCanvasMapping({
					nodes: ref(nodes),
					connections: ref(connections),
					workflowObject: ref(workflowObject) as Ref<Workflow>,
				});

				expect(additionalNodePropertiesById.value[nodes[0].id]).toEqual({
					style: { zIndex: -99 },
				});
				expect(additionalNodePropertiesById.value[nodes[1].id]).toEqual({
					style: { zIndex: -100 },
				});
			});

			it('calculates zIndex correctly for multiple overlapping sticky nodes', () => {
				const nodes = [
					createTestNode({
						id: '1',
						type: STICKY_NODE_TYPE,
						position: [0, 0],
						parameters: { width: 100, height: 100 },
					}),
					createTestNode({
						id: '2',
						type: STICKY_NODE_TYPE,
						position: [25, 25],
						parameters: { width: 50, height: 50 },
					}),
					createTestNode({
						id: '3',
						type: STICKY_NODE_TYPE,
						position: [50, 50],
						parameters: { width: 100, height: 100 },
					}),
				];
				const connections = {};
				const workflowObject = createTestWorkflowObject();
				const { additionalNodePropertiesById } = useCanvasMapping({
					nodes: ref(nodes),
					connections: ref(connections),
					workflowObject: ref(workflowObject) as Ref<Workflow>,
				});

				expect(additionalNodePropertiesById.value[nodes[0].id]).toEqual({
					style: { zIndex: -100 },
				});
				expect(additionalNodePropertiesById.value[nodes[1].id]).toEqual({
					style: { zIndex: -98 },
				});
				expect(additionalNodePropertiesById.value[nodes[2].id]).toEqual({
					style: { zIndex: -99 },
				});
			});
		});

		describe('node issues', () => {
			it('should return empty arrays when node has no issues', () => {
				const workflowsStore = mockedStore(useWorkflowsStore);
				const node = createTestNode({ name: 'Test Node' });
				const nodes = [node];
				const connections = {};
				const workflowObject = createTestWorkflowObject({ nodes, connections });

				workflowsStore.getWorkflowRunData = {};

				const { nodes: mappedNodes } = useCanvasMapping({
					nodes: ref(nodes),
					connections: ref(connections),
					workflowObject: ref(workflowObject) as Ref<Workflow>,
				});

				expect(mappedNodes.value[0]?.data?.issues).toEqual({
					execution: [],
					validation: [],
					visible: false,
				});
			});

			it('should handle execution errors', () => {
				const workflowsStore = mockedStore(useWorkflowsStore);
				const node = createTestNode({ name: 'Test Node' });
				const nodes = [node];
				const connections = {};
				const workflowObject = createTestWorkflowObject({ nodes, connections });

				const errorMessage = 'Test error message';
				const errorDescription = 'Test error description';
				workflowsStore.getWorkflowRunData = {
					'Test Node': [
						{
							startTime: 0,
							executionTime: 0,
							executionIndex: 0,
							source: [],
							error: mock<NodeApiError>({
								message: errorMessage,
								description: errorDescription,
							}),
						},
					],
				};

				const { nodes: mappedNodes } = useCanvasMapping({
					nodes: ref(nodes),
					connections: ref(connections),
					workflowObject: ref(workflowObject) as Ref<Workflow>,
				});

				expect(mappedNodes.value[0]?.data?.issues).toEqual({
					execution: [`${errorMessage} (${errorDescription})`],
					validation: [],
					visible: true,
				});
			});

			it('should handle execution error without description', () => {
				const workflowsStore = mockedStore(useWorkflowsStore);
				const node = createTestNode({ name: 'Test Node' });
				const nodes = [node];
				const connections = {};
				const workflowObject = createTestWorkflowObject({ nodes, connections });

				const errorMessage = 'Test error message';
				workflowsStore.getWorkflowRunData = {
					'Test Node': [
						{
							startTime: 0,
							executionTime: 0,
							executionIndex: 0,
							source: [],
							error: mock<NodeApiError>({
								message: errorMessage,
								description: null,
							}),
						},
					],
				};

				const { nodes: mappedNodes } = useCanvasMapping({
					nodes: ref(nodes),
					connections: ref(connections),
					workflowObject: ref(workflowObject) as Ref<Workflow>,
				});

				expect(mappedNodes.value[0]?.data?.issues).toEqual({
					execution: [errorMessage],
					validation: [],
					visible: true,
				});
			});

			it('should handle multiple execution errors', () => {
				const workflowsStore = mockedStore(useWorkflowsStore);
				const node = createTestNode({ name: 'Test Node' });
				const nodes = [node];
				const connections = {};
				const workflowObject = createTestWorkflowObject({ nodes, connections });

				workflowsStore.getWorkflowRunData = {
					'Test Node': [
						{
							startTime: 0,
							executionTime: 0,
							executionIndex: 0,
							source: [],
							error: mock<NodeApiError>({
								message: 'Error 1',
								description: 'Description 1',
							}),
						},
						{
							startTime: 0,
							executionTime: 0,
							executionIndex: 1,
							source: [],
							error: mock<NodeApiError>({
								message: 'Error 2',
								description: 'Description 2',
							}),
						},
					],
				};

				const { nodes: mappedNodes } = useCanvasMapping({
					nodes: ref(nodes),
					connections: ref(connections),
					workflowObject: ref(workflowObject) as Ref<Workflow>,
				});

				expect(mappedNodes.value[0]?.data?.issues).toEqual({
					execution: ['Error 1 (Description 1)', 'Error 2 (Description 2)'],
					validation: [],
					visible: true,
				});
			});

			it('should handle node issues', () => {
				const workflowsStore = mockedStore(useWorkflowsStore);
				const node = createTestNode({
					name: 'Test Node',
					issues: {
						typeUnknown: true,
					},
				} as Partial<INode>);
				const nodes = [node];
				const connections = {};
				const workflowObject = createTestWorkflowObject({ nodes, connections });

				workflowsStore.getWorkflowRunData = {};

				const { nodes: mappedNodes } = useCanvasMapping({
					nodes: ref(nodes),
					connections: ref(connections),
					workflowObject: ref(workflowObject) as Ref<Workflow>,
				});

				expect(mappedNodes.value[0]?.data?.issues).toEqual({
					execution: [],
					validation: ['Node Type "n8n-nodes-base.set" is not known.'],
					visible: true,
				});
			});

			it('should combine execution errors and node issues', () => {
				const workflowsStore = mockedStore(useWorkflowsStore);
				const node = createTestNode({
					name: 'Test Node',
					issues: {
						typeUnknown: true,
					},
				} as Partial<INode>);
				const nodes = [node];
				const connections = {};
				const workflowObject = createTestWorkflowObject({ nodes, connections });

				workflowsStore.getWorkflowRunData = {
					'Test Node': [
						{
							startTime: 0,
							executionTime: 0,
							executionIndex: 0,
							source: [],
							error: mock<NodeApiError>({
								message: 'Execution error',
								description: 'Error description',
							}),
						},
					],
				};

				const { nodes: mappedNodes } = useCanvasMapping({
					nodes: ref(nodes),
					connections: ref(connections),
					workflowObject: ref(workflowObject) as Ref<Workflow>,
				});

				expect(mappedNodes.value[0]?.data?.issues).toEqual({
					execution: ['Execution error (Error description)'],
					validation: ['Node Type "n8n-nodes-base.set" is not known.'],
					visible: true,
				});
			});

			it('should handle multiple nodes with different issues', () => {
				const workflowsStore = mockedStore(useWorkflowsStore);
				const node1 = createTestNode({
					name: 'Node 1',
					issues: {
						typeUnknown: true,
					},
				} as Partial<INode>);
				const node2 = createTestNode({ name: 'Node 2' });
				const nodes = [node1, node2];
				const connections = {};
				const workflowObject = createTestWorkflowObject({ nodes, connections });

				workflowsStore.getWorkflowRunData = {
					'Node 2': [
						{
							startTime: 0,
							executionTime: 0,
							executionIndex: 0,
							source: [],
							error: mock<NodeApiError>({
								message: 'Execution error',
								description: 'Error description',
							}),
						},
					],
				};

				const { nodes: mappedNodes } = useCanvasMapping({
					nodes: ref(nodes),
					connections: ref(connections),
					workflowObject: ref(workflowObject) as Ref<Workflow>,
				});

				expect(mappedNodes.value[0]?.data?.issues).toEqual({
					execution: [],
					validation: ['Node Type "n8n-nodes-base.set" is not known.'],
					visible: true,
				});
				expect(mappedNodes.value[1]?.data?.issues).toEqual({
					execution: ['Execution error (Error description)'],
					validation: [],
					visible: true,
				});
			});
		});

		describe('filterOutCanceled helper function', () => {
			it('should return null for null input', () => {
				const workflowsStore = mockedStore(useWorkflowsStore);
				const nodes = [createTestNode({ name: 'Node 1' })];
				const connections = {};
				const workflowObject = createTestWorkflowObject({ nodes, connections });

				workflowsStore.getWorkflowResultDataByNodeName.mockReturnValue(null);

				const { nodes: mappedNodes } = useCanvasMapping({
					nodes: ref(nodes),
					connections: ref(connections),
					workflowObject: ref(workflowObject) as Ref<Workflow>,
				});

				expect(mappedNodes.value[0]?.data?.runData?.iterations).toEqual(0);
			});

			it('should filter out canceled tasks and return correct iteration count', () => {
				const workflowsStore = mockedStore(useWorkflowsStore);
				const nodes = [createTestNode({ name: 'Node 1' })];
				const connections = {};
				const workflowObject = createTestWorkflowObject({ nodes, connections });

				workflowsStore.getWorkflowResultDataByNodeName.mockReturnValue([
					{
						startTime: 0,
						executionTime: 0,
						executionIndex: 0,
						source: [],
						executionStatus: 'success',
						data: {
							[NodeConnectionTypes.Main]: [[{ json: {} }]],
						},
					},
					{
						startTime: 0,
						executionTime: 0,
						executionIndex: 1,
						source: [],
						executionStatus: 'canceled',
						data: {
							[NodeConnectionTypes.Main]: [[{ json: {} }]],
						},
					},
					{
						startTime: 0,
						executionTime: 0,
						executionIndex: 2,
						source: [],
						executionStatus: 'error',
						data: {
							[NodeConnectionTypes.Main]: [[{ json: {} }]],
						},
					},
				]);

				const { nodes: mappedNodes } = useCanvasMapping({
					nodes: ref(nodes),
					connections: ref(connections),
					workflowObject: ref(workflowObject) as Ref<Workflow>,
				});

				expect(mappedNodes.value[0]?.data?.runData?.iterations).toEqual(2);
				expect(mappedNodes.value[0]?.data?.runData?.visible).toEqual(true);
			});

			it('should return 0 iterations when all tasks are canceled', () => {
				const workflowsStore = mockedStore(useWorkflowsStore);
				const nodes = [createTestNode({ name: 'Node 1' })];
				const connections = {};
				const workflowObject = createTestWorkflowObject({ nodes, connections });

				workflowsStore.getWorkflowResultDataByNodeName.mockReturnValue([
					{
						startTime: 0,
						executionTime: 0,
						executionIndex: 0,
						source: [],
						executionStatus: 'canceled',
						data: {
							[NodeConnectionTypes.Main]: [[{ json: {} }]],
						},
					},
					{
						startTime: 0,
						executionTime: 0,
						executionIndex: 1,
						source: [],
						executionStatus: 'canceled',
						data: {
							[NodeConnectionTypes.Main]: [[{ json: {} }]],
						},
					},
				]);

				const { nodes: mappedNodes } = useCanvasMapping({
					nodes: ref(nodes),
					connections: ref(connections),
					workflowObject: ref(workflowObject) as Ref<Workflow>,
				});

				expect(mappedNodes.value[0]?.data?.runData?.iterations).toEqual(0);
				expect(mappedNodes.value[0]?.data?.runData?.visible).toEqual(true);
			});

			it('should return correct count when no canceled tasks', () => {
				const workflowsStore = mockedStore(useWorkflowsStore);
				const nodes = [createTestNode({ name: 'Node 1' })];
				const connections = {};
				const workflowObject = createTestWorkflowObject({ nodes, connections });

				workflowsStore.getWorkflowResultDataByNodeName.mockReturnValue([
					{
						startTime: 0,
						executionTime: 0,
						executionIndex: 0,
						source: [],
						executionStatus: 'success',
						data: {
							[NodeConnectionTypes.Main]: [[{ json: {} }]],
						},
					},
					{
						startTime: 0,
						executionTime: 0,
						executionIndex: 1,
						source: [],
						executionStatus: 'error',
						data: {
							[NodeConnectionTypes.Main]: [[{ json: {} }]],
						},
					},
				]);

				const { nodes: mappedNodes } = useCanvasMapping({
					nodes: ref(nodes),
					connections: ref(connections),
					workflowObject: ref(workflowObject) as Ref<Workflow>,
				});

				expect(mappedNodes.value[0]?.data?.runData?.iterations).toEqual(2);
			});
		});

		describe('nodeExecutionStatusById', () => {
			it('should return last execution status when not canceled', () => {
				const workflowsStore = mockedStore(useWorkflowsStore);
				const node = createTestNode({ name: 'Test Node' });
				const nodes = [node];
				const connections = {};
				const workflowObject = createTestWorkflowObject({ nodes, connections });

				workflowsStore.getWorkflowRunData = {
					'Test Node': [
						{
							startTime: 0,
							executionTime: 0,
							executionIndex: 0,
							source: [],
							executionStatus: 'success',
						},
					],
				};

				const { nodes: mappedNodes } = useCanvasMapping({
					nodes: ref(nodes),
					connections: ref(connections),
					workflowObject: ref(workflowObject) as Ref<Workflow>,
				});

				expect(mappedNodes.value[0]?.data?.execution?.status).toEqual('success');
			});

			it('should return second-to-last status when last execution is canceled and multiple tasks exist', () => {
				const workflowsStore = mockedStore(useWorkflowsStore);
				const node = createTestNode({ name: 'Test Node' });
				const nodes = [node];
				const connections = {};
				const workflowObject = createTestWorkflowObject({ nodes, connections });

				workflowsStore.getWorkflowRunData = {
					'Test Node': [
						{
							startTime: 0,
							executionTime: 0,
							executionIndex: 0,
							source: [],
							executionStatus: 'success',
						},
						{
							startTime: 0,
							executionTime: 0,
							executionIndex: 1,
							source: [],
							executionStatus: 'canceled',
						},
					],
				};

				const { nodes: mappedNodes } = useCanvasMapping({
					nodes: ref(nodes),
					connections: ref(connections),
					workflowObject: ref(workflowObject) as Ref<Workflow>,
				});

				expect(mappedNodes.value[0]?.data?.execution?.status).toEqual('success');
			});

			it('should return canceled status when only one task exists and it is canceled', () => {
				const workflowsStore = mockedStore(useWorkflowsStore);
				const node = createTestNode({ name: 'Test Node' });
				const nodes = [node];
				const connections = {};
				const workflowObject = createTestWorkflowObject({ nodes, connections });

				workflowsStore.getWorkflowRunData = {
					'Test Node': [
						{
							startTime: 0,
							executionTime: 0,
							executionIndex: 0,
							source: [],
							executionStatus: 'canceled',
						},
					],
				};

				const { nodes: mappedNodes } = useCanvasMapping({
					nodes: ref(nodes),
					connections: ref(connections),
					workflowObject: ref(workflowObject) as Ref<Workflow>,
				});

				expect(mappedNodes.value[0]?.data?.execution?.status).toEqual('canceled');
			});

			it('should return new status when no tasks exist', () => {
				const workflowsStore = mockedStore(useWorkflowsStore);
				const node = createTestNode({ name: 'Test Node' });
				const nodes = [node];
				const connections = {};
				const workflowObject = createTestWorkflowObject({ nodes, connections });

				workflowsStore.getWorkflowRunData = {};

				const { nodes: mappedNodes } = useCanvasMapping({
					nodes: ref(nodes),
					connections: ref(connections),
					workflowObject: ref(workflowObject) as Ref<Workflow>,
				});

				expect(mappedNodes.value[0]?.data?.execution?.status).toEqual('new');
			});
		});

		describe('nodeHasIssuesById', () => {
			it('should return false when node has no issues or errors', () => {
				const workflowsStore = mockedStore(useWorkflowsStore);
				const node = createTestNode({ name: 'Test Node' });
				const nodes = [node];
				const connections = {};
				const workflowObject = createTestWorkflowObject({ nodes, connections });

				workflowsStore.getWorkflowRunData = {};
				workflowsStore.pinDataByNodeName.mockReturnValue(undefined);

				const { nodeHasIssuesById } = useCanvasMapping({
					nodes: ref(nodes),
					connections: ref(connections),
					workflowObject: ref(workflowObject) as Ref<Workflow>,
				});

				expect(nodeHasIssuesById.value[node.id]).toBe(false);
			});

			it('should return true when execution status is crashed', () => {
				const workflowsStore = mockedStore(useWorkflowsStore);
				const node = createTestNode({ name: 'Test Node' });
				const nodes = [node];
				const connections = {};
				const workflowObject = createTestWorkflowObject({ nodes, connections });

				workflowsStore.getWorkflowRunData = {
					'Test Node': [
						{
							startTime: 0,
							executionTime: 0,
							executionIndex: 0,
							source: [],
							executionStatus: 'crashed',
						},
					],
				};
				workflowsStore.pinDataByNodeName.mockReturnValue(undefined);

				const { nodeHasIssuesById } = useCanvasMapping({
					nodes: ref(nodes),
					connections: ref(connections),
					workflowObject: ref(workflowObject) as Ref<Workflow>,
				});

				expect(nodeHasIssuesById.value[node.id]).toBe(true);
			});

			it('should return true when execution status is error', () => {
				const workflowsStore = mockedStore(useWorkflowsStore);
				const node = createTestNode({ name: 'Test Node' });
				const nodes = [node];
				const connections = {};
				const workflowObject = createTestWorkflowObject({ nodes, connections });

				workflowsStore.getWorkflowRunData = {
					'Test Node': [
						{
							startTime: 0,
							executionTime: 0,
							executionIndex: 0,
							source: [],
							executionStatus: 'error',
						},
					],
				};
				workflowsStore.pinDataByNodeName.mockReturnValue(undefined);

				const { nodeHasIssuesById } = useCanvasMapping({
					nodes: ref(nodes),
					connections: ref(connections),
					workflowObject: ref(workflowObject) as Ref<Workflow>,
				});

				expect(nodeHasIssuesById.value[node.id]).toBe(true);
			});

			it('should return false when node has pinned data regardless of issues', () => {
				const workflowsStore = mockedStore(useWorkflowsStore);
				const node = createTestNode({
					name: 'Test Node',
					issues: {
						typeUnknown: true,
					},
				} as Partial<INode>);
				const nodes = [node];
				const connections = {};
				const workflowObject = createTestWorkflowObject({ nodes, connections });

				workflowsStore.getWorkflowRunData = {};
				workflowsStore.pinDataByNodeName.mockReturnValue([{ json: {} }]);

				const { nodeHasIssuesById } = useCanvasMapping({
					nodes: ref(nodes),
					connections: ref(connections),
					workflowObject: ref(workflowObject) as Ref<Workflow>,
				});

				expect(nodeHasIssuesById.value[node.id]).toBe(false);
			});

			it('should return true when node has issues and no pinned data', () => {
				const workflowsStore = mockedStore(useWorkflowsStore);
				const node = createTestNode({
					name: 'Test Node',
					issues: {
						typeUnknown: true,
					},
				} as Partial<INode>);
				const nodes = [node];
				const connections = {};
				const workflowObject = createTestWorkflowObject({ nodes, connections });

				workflowsStore.getWorkflowRunData = {};
				workflowsStore.pinDataByNodeName.mockReturnValue(undefined);

				const { nodeHasIssuesById } = useCanvasMapping({
					nodes: ref(nodes),
					connections: ref(connections),
					workflowObject: ref(workflowObject) as Ref<Workflow>,
				});

				expect(nodeHasIssuesById.value[node.id]).toBe(true);
			});

			it('should return true for execution errors even with other issues', () => {
				const workflowsStore = mockedStore(useWorkflowsStore);
				const node = createTestNode({
					name: 'Test Node',
					issues: {
						typeUnknown: true,
					},
				} as Partial<INode>);
				const nodes = [node];
				const connections = {};
				const workflowObject = createTestWorkflowObject({ nodes, connections });

				workflowsStore.getWorkflowRunData = {
					'Test Node': [
						{
							startTime: 0,
							executionTime: 0,
							executionIndex: 0,
							source: [],
							executionStatus: 'error',
							error: mock<NodeApiError>({
								message: 'Execution error',
								description: 'Error description',
							}),
						},
					],
				};
				workflowsStore.pinDataByNodeName.mockReturnValue(undefined);

				const { nodeHasIssuesById } = useCanvasMapping({
					nodes: ref(nodes),
					connections: ref(connections),
					workflowObject: ref(workflowObject) as Ref<Workflow>,
				});

				expect(nodeHasIssuesById.value[node.id]).toBe(true);
			});

			it('should handle multiple nodes with different issue states', () => {
				const workflowsStore = mockedStore(useWorkflowsStore);
				const node1 = createTestNode({
					name: 'Node 1',
					issues: {
						typeUnknown: true,
					},
				} as Partial<INode>);
				const node2 = createTestNode({ name: 'Node 2' });
				const node3 = createTestNode({ name: 'Node 3' });
				const nodes = [node1, node2, node3];
				const connections = {};
				const workflowObject = createTestWorkflowObject({ nodes, connections });

				workflowsStore.getWorkflowRunData = {
					'Node 2': [
						{
							startTime: 0,
							executionTime: 0,
							executionIndex: 0,
							source: [],
							executionStatus: 'error',
						},
					],
					'Node 3': [
						{
							startTime: 0,
							executionTime: 0,
							executionIndex: 0,
							source: [],
							executionStatus: 'success',
						},
					],
				};
				workflowsStore.pinDataByNodeName.mockImplementation((nodeName: string) => {
					return nodeName === 'Node 1' ? [{ json: {} }] : undefined;
				});

				const { nodeHasIssuesById } = useCanvasMapping({
					nodes: ref(nodes),
					connections: ref(connections),
					workflowObject: ref(workflowObject) as Ref<Workflow>,
				});

				expect(nodeHasIssuesById.value[node1.id]).toBe(false); // Has issues but also pinned data
				expect(nodeHasIssuesById.value[node2.id]).toBe(true); // Has error status
				expect(nodeHasIssuesById.value[node3.id]).toBe(false); // No issues
			});

			it('should handle node validation issues', () => {
				const node1 = createTestNode({
					name: 'Node 1',
					issues: {
						parameters: {
							formTitle: ['Parameter "Form Title" is required.'],
						},
					},
				} as Partial<INode>);
				const nodes = [node1];
				const connections = {};
				const workflowObject = createTestWorkflowObject({ nodes, connections });

				const { nodeHasIssuesById } = useCanvasMapping({
					nodes: ref(nodes),
					connections: ref(connections),
					workflowObject: ref(workflowObject) as Ref<Workflow>,
				});
				expect(nodeHasIssuesById.value[node1.id]).toBe(true); // Has error status
			});

			it('should handle successful executions after errors', () => {
				const workflowsStore = mockedStore(useWorkflowsStore);
				const node1 = createTestNode({ name: 'Node 2' });
				const nodes = [node1];
				const connections = {};
				const workflowObject = createTestWorkflowObject({ nodes, connections });

				workflowsStore.getWorkflowRunData = {
					'Node 2': [
						{
							startTime: 0,
							executionTime: 0,
							executionIndex: 0,
							source: [],
							executionStatus: 'error',
						},
						{
							startTime: 0,
							executionTime: 0,
							executionIndex: 0,
							source: [],
							executionStatus: 'success',
						},
					],
				};

				const { nodeHasIssuesById } = useCanvasMapping({
					nodes: ref(nodes),
					connections: ref(connections),
					workflowObject: ref(workflowObject) as Ref<Workflow>,
				});

				expect(nodeHasIssuesById.value[node1.id]).toBe(false); // Last run was successful
			});
		});
	});

	describe('nodeExecutionWaitingForNextById', () => {
		it('should be true when already executed node is waiting for next', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const node1 = createTestNode({
				name: 'Node 1',
			});
			const node2 = createTestNode({
				name: 'Node 2',
			});
			const nodes = [node1, node2];
			const connections = {};

			const workflowObject = createTestWorkflowObject({
				nodes,
				connections,
			});

			workflowState.executingNode.executingNode = [];
			workflowState.executingNode.lastAddedExecutingNode = node1.name;
			workflowsStore.isWorkflowRunning = true;

			const { nodeExecutionWaitingForNextById } = useCanvasMapping({
				nodes: ref(nodes),
				connections: ref(connections),
				workflowObject: ref(workflowObject) as Ref<Workflow>,
			});

			expect(nodeExecutionWaitingForNextById.value[node1.id]).toBe(true);
			expect(nodeExecutionWaitingForNextById.value[node2.id]).toBe(false);
		});

		it('should be false when workflow is not executing', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const node1 = createTestNode({
				name: 'Node 1',
			});
			const node2 = createTestNode({
				name: 'Node 2',
			});
			const nodes = [node1, node2];
			const connections = {};

			const workflowObject = createTestWorkflowObject({
				nodes,
				connections,
			});

			workflowState.executingNode.executingNode = [];
			workflowState.executingNode.lastAddedExecutingNode = node1.name;
			workflowsStore.isWorkflowRunning = false;

			const { nodeExecutionWaitingForNextById } = useCanvasMapping({
				nodes: ref(nodes),
				connections: ref(connections),
				workflowObject: ref(workflowObject) as Ref<Workflow>,
			});

			expect(nodeExecutionWaitingForNextById.value[node1.id]).toBe(false);
			expect(nodeExecutionWaitingForNextById.value[node2.id]).toBe(false);
		});

		it('should be false when there are nodes that are executing', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const node1 = createTestNode({
				name: 'Node 1',
			});
			const node2 = createTestNode({
				name: 'Node 2',
			});
			const nodes = [node1, node2];
			const connections = {};

			const workflowObject = createTestWorkflowObject({
				nodes,
				connections,
			});

			workflowState.executingNode.executingNode = [node2.name];
			workflowState.executingNode.lastAddedExecutingNode = node1.name;
			workflowsStore.isWorkflowRunning = false;

			const { nodeExecutionWaitingForNextById } = useCanvasMapping({
				nodes: ref(nodes),
				connections: ref(connections),
				workflowObject: ref(workflowObject) as Ref<Workflow>,
			});

			expect(nodeExecutionWaitingForNextById.value[node1.id]).toBe(false);
			expect(nodeExecutionWaitingForNextById.value[node2.id]).toBe(false);
		});
	});

	describe('trigger tooltip behavior with pinned data', () => {
		it('should show tooltip for trigger node with no pinned data when workflow is running', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const triggerNode = mockNode({
				name: 'Manual Trigger',
				type: MANUAL_TRIGGER_NODE_TYPE,
				disabled: false,
			});
			const nodesList = [triggerNode];
			const connections = {};
			const workflowObject = createTestWorkflowObject({
				nodes: nodesList,
				connections,
			});

			workflowsStore.isWorkflowRunning = true;
			workflowsStore.getWorkflowRunData = {};
			workflowsStore.pinDataByNodeName.mockReturnValue(undefined);

			const { nodes: mappedNodes } = useCanvasMapping({
				nodes: ref(nodesList),
				connections: ref(connections),
				workflowObject: ref(workflowObject) as Ref<Workflow>,
			});

			const renderOptions = mappedNodes.value[0]?.data?.render as CanvasNodeDefaultRender;
			expect(renderOptions.options.tooltip).toBe('node.waitingForYouToCreateAnEventIn');
		});

		describe('when the node has a custom eventTriggerDescription', () => {
			it('should show tooltip for trigger node with no pinned data when workflow is running', () => {
				const workflowsStore = mockedStore(useWorkflowsStore);
				const triggerNode = mockNode({
					name: 'Form Trigger',
					type: FORM_TRIGGER_NODE_TYPE,
					disabled: false,
				});
				const nodesList = [triggerNode];
				const connections = {};
				const workflowObject = createTestWorkflowObject({
					nodes: nodesList,
					connections,
				});

				workflowsStore.isWorkflowRunning = true;
				workflowsStore.getWorkflowRunData = {};
				workflowsStore.pinDataByNodeName.mockReturnValue(undefined);

				const { nodes: mappedNodes } = useCanvasMapping({
					nodes: ref(nodesList),
					connections: ref(connections),
					workflowObject: ref(workflowObject) as Ref<Workflow>,
				});

				const renderOptions = mappedNodes.value[0]?.data?.render as CanvasNodeDefaultRender;
				expect(renderOptions.options.tooltip).toBe('n8n-nodes-base.formTrigger');
			});
		});

		it('should not show tooltip for trigger node with pinned data when workflow is running', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const triggerNode = mockNode({
				name: 'Manual Trigger',
				type: MANUAL_TRIGGER_NODE_TYPE,
				disabled: false,
			});
			const nodesList = [triggerNode];
			const connections = {};
			const workflowObject = createTestWorkflowObject({
				nodes: nodesList,
				connections,
			});

			workflowsStore.isWorkflowRunning = true;
			workflowsStore.getWorkflowRunData = {};
			workflowsStore.pinDataByNodeName.mockReturnValue([{ json: {} }]); // Node has pinned data

			const { nodes: mappedNodes } = useCanvasMapping({
				nodes: ref(nodesList),
				connections: ref(connections),
				workflowObject: ref(workflowObject) as Ref<Workflow>,
			});

			const renderOptions = mappedNodes.value[0]?.data?.render as CanvasNodeDefaultRender;
			expect(renderOptions.options.tooltip).toBeUndefined();
		});

		it('should not show tooltip when workflow is not running', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const triggerNode = mockNode({
				name: 'Manual Trigger',
				type: MANUAL_TRIGGER_NODE_TYPE,
				disabled: false,
			});
			const nodesList = [triggerNode];
			const connections = {};
			const workflowObject = createTestWorkflowObject({
				nodes: nodesList,
				connections,
			});

			workflowsStore.isWorkflowRunning = false;
			workflowsStore.getWorkflowRunData = {};
			workflowsStore.pinDataByNodeName.mockReturnValue(undefined);

			const { nodes: mappedNodes } = useCanvasMapping({
				nodes: ref(nodesList),
				connections: ref(connections),
				workflowObject: ref(workflowObject) as Ref<Workflow>,
			});

			const renderOptions = mappedNodes.value[0]?.data?.render as CanvasNodeDefaultRender;
			expect(renderOptions.options.tooltip).toBeUndefined();
		});
	});

	describe('connections', () => {
		it('should map connections to canvas connections', () => {
			const [manualTriggerNode, setNode] = mockNodes.slice(0, 2);
			const nodes = [manualTriggerNode, setNode];
			const connections = {
				[manualTriggerNode.name]: {
					[NodeConnectionTypes.Main]: [
						[{ node: setNode.name, type: NodeConnectionTypes.Main, index: 0 }],
					],
				},
			};
			const workflowObject = createTestWorkflowObject({
				nodes,
				connections,
			});

			const { connections: mappedConnections } = useCanvasMapping({
				nodes: ref(nodes),
				connections: ref(connections),
				workflowObject: ref(workflowObject) as Ref<Workflow>,
			});

			const source = manualTriggerNode.id;
			const sourceHandle = createCanvasConnectionHandleString({
				type: NodeConnectionTypes.Main,
				index: 0,
				mode: CanvasConnectionMode.Output,
			});
			const target = setNode.id;
			const targetHandle = createCanvasConnectionHandleString({
				type: NodeConnectionTypes.Main,
				index: 0,
				mode: CanvasConnectionMode.Input,
			});
			const connectionId = createCanvasConnectionId({
				source,
				sourceHandle,
				target,
				targetHandle,
			});

			expect(mappedConnections.value).toEqual([
				{
					data: {
						source: {
							node: manualTriggerNode.name,
							index: 0,
							type: NodeConnectionTypes.Main,
						},
						status: undefined,
						target: {
							node: setNode.name,
							index: 0,
							type: NodeConnectionTypes.Main,
						},
					},
					id: connectionId,
					label: '',
					markerEnd: MarkerType.ArrowClosed,
					source,
					sourceHandle,
					target,
					targetHandle,
					type: 'canvas-edge',
				},
			]);
		});

		it('should map multiple input types to canvas connections', () => {
			const [manualTriggerNode, setNode] = mockNodes.slice(0, 2);
			const nodes = [manualTriggerNode, setNode];
			const connections = {
				[manualTriggerNode.name]: {
					[NodeConnectionTypes.AiTool]: [
						[{ node: setNode.name, type: NodeConnectionTypes.AiTool, index: 0 }],
					],
					[NodeConnectionTypes.AiDocument]: [
						[{ node: setNode.name, type: NodeConnectionTypes.AiDocument, index: 1 }],
					],
				},
			};
			const workflowObject = createTestWorkflowObject({
				nodes,
				connections,
			});

			const { connections: mappedConnections } = useCanvasMapping({
				nodes: ref(nodes),
				connections: ref(connections),
				workflowObject: ref(workflowObject) as Ref<Workflow>,
			});

			const sourceA = manualTriggerNode.id;
			const sourceHandleA = createCanvasConnectionHandleString({
				type: NodeConnectionTypes.AiTool,
				index: 0,
				mode: CanvasConnectionMode.Output,
			});
			const targetA = setNode.id;
			const targetHandleA = createCanvasConnectionHandleString({
				type: NodeConnectionTypes.AiTool,
				index: 0,
				mode: CanvasConnectionMode.Input,
			});
			const connectionIdA = createCanvasConnectionId({
				source: sourceA,
				sourceHandle: sourceHandleA,
				target: targetA,
				targetHandle: targetHandleA,
			});

			const sourceB = manualTriggerNode.id;
			const sourceHandleB = createCanvasConnectionHandleString({
				type: NodeConnectionTypes.AiDocument,
				index: 0,
				mode: CanvasConnectionMode.Output,
			});
			const targetB = setNode.id;
			const targetHandleB = createCanvasConnectionHandleString({
				type: NodeConnectionTypes.AiDocument,
				index: 1,
				mode: CanvasConnectionMode.Input,
			});
			const connectionIdB = createCanvasConnectionId({
				source: sourceB,
				sourceHandle: sourceHandleB,
				target: targetB,
				targetHandle: targetHandleB,
			});

			expect(mappedConnections.value).toEqual([
				{
					data: {
						source: {
							node: manualTriggerNode.name,
							index: 0,
							type: NodeConnectionTypes.AiTool,
						},
						status: undefined,
						target: {
							node: setNode.name,
							index: 0,
							type: NodeConnectionTypes.AiTool,
						},
					},
					id: connectionIdA,
					label: '',
					markerEnd: MarkerType.ArrowClosed,
					source: sourceA,
					sourceHandle: sourceHandleA,
					target: targetA,
					targetHandle: targetHandleA,
					type: 'canvas-edge',
				},
				{
					data: {
						source: {
							node: manualTriggerNode.name,
							index: 0,
							type: NodeConnectionTypes.AiDocument,
						},
						status: undefined,
						target: {
							node: setNode.name,
							index: 1,
							type: NodeConnectionTypes.AiDocument,
						},
					},
					id: connectionIdB,
					label: '',
					source: sourceB,
					sourceHandle: sourceHandleB,
					target: targetB,
					targetHandle: targetHandleB,
					type: 'canvas-edge',
					markerEnd: MarkerType.ArrowClosed,
				},
			]);
		});

		describe('connection status with canceled tasks', () => {
			it('should not set success status when last task is canceled', () => {
				const workflowsStore = mockedStore(useWorkflowsStore);
				const [manualTriggerNode, setNode] = mockNodes.slice(0, 2);
				const nodes = [manualTriggerNode, setNode];
				const connections = {
					[manualTriggerNode.name]: {
						[NodeConnectionTypes.Main]: [
							[{ node: setNode.name, type: NodeConnectionTypes.Main, index: 0 }],
						],
					},
				};
				const workflowObject = createTestWorkflowObject({
					nodes,
					connections,
				});

				workflowsStore.getWorkflowResultDataByNodeName.mockImplementation((nodeName: string) => {
					if (nodeName === manualTriggerNode.name) {
						return [
							{
								startTime: 0,
								executionTime: 0,
								executionIndex: 0,
								source: [],
								executionStatus: 'canceled',
								data: {
									[NodeConnectionTypes.Main]: [[{ json: {} }]],
								},
							},
						];
					}
					return null;
				});

				const { connections: mappedConnections } = useCanvasMapping({
					nodes: ref(nodes),
					connections: ref(connections),
					workflowObject: ref(workflowObject) as Ref<Workflow>,
				});

				expect(mappedConnections.value[0]?.data?.status).toBeUndefined();
			});

			it('should set success status when last task is canceled but previous is success', () => {
				const workflowsStore = mockedStore(useWorkflowsStore);
				const [manualTriggerNode, setNode] = mockNodes.slice(0, 2);
				const nodes = [manualTriggerNode, setNode];
				const connections = {
					[manualTriggerNode.name]: {
						[NodeConnectionTypes.Main]: [
							[{ node: setNode.name, type: NodeConnectionTypes.Main, index: 0 }],
						],
					},
				};
				const workflowObject = createTestWorkflowObject({
					nodes,
					connections,
				});

				workflowsStore.getWorkflowResultDataByNodeName.mockImplementation((nodeName: string) => {
					if (nodeName === manualTriggerNode.name) {
						return [
							{
								startTime: 0,
								executionTime: 0,
								executionIndex: 0,
								source: [],
								executionStatus: 'success',
								data: {
									[NodeConnectionTypes.Main]: [[{ json: {} }]],
								},
							},
							{
								startTime: 0,
								executionTime: 0,
								executionIndex: 1,
								source: [],
								executionStatus: 'canceled',
								data: {
									[NodeConnectionTypes.Main]: [[{ json: {} }]],
								},
							},
						];
					}
					return null;
				});

				const { connections: mappedConnections } = useCanvasMapping({
					nodes: ref(nodes),
					connections: ref(connections),
					workflowObject: ref(workflowObject) as Ref<Workflow>,
				});

				expect(mappedConnections.value[0]?.data?.status).toEqual('success');
			});

			it('should handle connection with only canceled tasks', () => {
				const workflowsStore = mockedStore(useWorkflowsStore);
				const [manualTriggerNode, setNode] = mockNodes.slice(0, 2);
				const nodes = [manualTriggerNode, setNode];
				const connections = {
					[manualTriggerNode.name]: {
						[NodeConnectionTypes.Main]: [
							[{ node: setNode.name, type: NodeConnectionTypes.Main, index: 0 }],
						],
					},
				};
				const workflowObject = createTestWorkflowObject({
					nodes,
					connections,
				});

				workflowsStore.getWorkflowResultDataByNodeName.mockImplementation((nodeName: string) => {
					if (nodeName === manualTriggerNode.name) {
						return [
							{
								startTime: 0,
								executionTime: 0,
								executionIndex: 0,
								source: [],
								executionStatus: 'canceled',
								data: {
									[NodeConnectionTypes.Main]: [[{ json: {} }]],
								},
							},
							{
								startTime: 0,
								executionTime: 0,
								executionIndex: 1,
								source: [],
								executionStatus: 'canceled',
								data: {
									[NodeConnectionTypes.Main]: [[{ json: {} }]],
								},
							},
						];
					}
					return null;
				});

				const { connections: mappedConnections } = useCanvasMapping({
					nodes: ref(nodes),
					connections: ref(connections),
					workflowObject: ref(workflowObject) as Ref<Workflow>,
				});

				expect(mappedConnections.value[0]?.data?.status).toBeUndefined();
			});

			it('should prioritize running status over canceled task handling', () => {
				const workflowsStore = mockedStore(useWorkflowsStore);
				const [manualTriggerNode, setNode] = mockNodes.slice(0, 2);
				const nodes = [manualTriggerNode, setNode];
				const connections = {
					[manualTriggerNode.name]: {
						[NodeConnectionTypes.Main]: [
							[{ node: setNode.name, type: NodeConnectionTypes.Main, index: 0 }],
						],
					},
				};
				const workflowObject = createTestWorkflowObject({
					nodes,
					connections,
				});

				workflowState.executingNode.isNodeExecuting = vi
					.fn()
					.mockImplementation((nodeName: string) => {
						return nodeName === manualTriggerNode.name;
					});

				workflowsStore.getWorkflowResultDataByNodeName.mockImplementation((nodeName: string) => {
					if (nodeName === manualTriggerNode.name) {
						return [
							{
								startTime: 0,
								executionTime: 0,
								executionIndex: 0,
								source: [],
								executionStatus: 'canceled',
								data: {
									[NodeConnectionTypes.Main]: [[]],
								},
							},
						];
					}
					return null;
				});

				const { connections: mappedConnections } = useCanvasMapping({
					nodes: ref(nodes),
					connections: ref(connections),
					workflowObject: ref(workflowObject) as Ref<Workflow>,
				});

				expect(mappedConnections.value[0]?.data?.status).toEqual('running');
			});
		});

		describe('getConnectionLabel', () => {
			it('should return undefined when source node is not found', () => {
				const [, setNode] = mockNodes.slice(0, 2);
				const nodes = [setNode]; // manualTriggerNode is missing
				const connections = {
					'Non-existent Node': {
						[NodeConnectionTypes.Main]: [
							[{ node: setNode.name, type: NodeConnectionTypes.Main, index: 0 }],
						],
					},
				};
				const workflowObject = createTestWorkflowObject({
					nodes,
					connections,
				});

				const { connections: mappedConnections } = useCanvasMapping({
					nodes: ref(nodes),
					connections: ref(connections),
					workflowObject: ref(workflowObject) as Ref<Workflow>,
				});

				expect(mappedConnections.value[0]?.label).toBe(undefined);
			});

			it('should return pinned data count label when node has pinned data', () => {
				const workflowsStore = mockedStore(useWorkflowsStore);
				const [manualTriggerNode, setNode] = mockNodes.slice(0, 2);
				const nodes = [manualTriggerNode, setNode];
				const connections = {
					[manualTriggerNode.name]: {
						[NodeConnectionTypes.Main]: [
							[{ node: setNode.name, type: NodeConnectionTypes.Main, index: 0 }],
						],
					},
				};
				const workflowObject = createTestWorkflowObject({
					nodes,
					connections,
				});

				// Mock pinned data with 3 items
				workflowsStore.pinDataByNodeName.mockImplementation((nodeName: string) => {
					return nodeName === manualTriggerNode.name
						? [{ json: { id: 1 } }, { json: { id: 2 } }, { json: { id: 3 } }]
						: undefined;
				});

				const { connections: mappedConnections } = useCanvasMapping({
					nodes: ref(nodes),
					connections: ref(connections),
					workflowObject: ref(workflowObject) as Ref<Workflow>,
				});

				expect(mappedConnections.value[0]?.label).toBe('3 items');
			});

			it('should return singular item label when pinned data has 1 item', () => {
				const workflowsStore = mockedStore(useWorkflowsStore);
				const [manualTriggerNode, setNode] = mockNodes.slice(0, 2);
				const nodes = [manualTriggerNode, setNode];
				const connections = {
					[manualTriggerNode.name]: {
						[NodeConnectionTypes.Main]: [
							[{ node: setNode.name, type: NodeConnectionTypes.Main, index: 0 }],
						],
					},
				};
				const workflowObject = createTestWorkflowObject({
					nodes,
					connections,
				});

				// Mock pinned data with 1 item
				workflowsStore.pinDataByNodeName.mockImplementation((nodeName: string) => {
					return nodeName === manualTriggerNode.name ? [{ json: { id: 1 } }] : undefined;
				});

				const { connections: mappedConnections } = useCanvasMapping({
					nodes: ref(nodes),
					connections: ref(connections),
					workflowObject: ref(workflowObject) as Ref<Workflow>,
				});

				expect(mappedConnections.value[0]?.label).toBe('1 item');
			});

			it('should return empty string when pinned data is empty array', () => {
				const workflowsStore = mockedStore(useWorkflowsStore);
				const [manualTriggerNode, setNode] = mockNodes.slice(0, 2);
				const nodes = [manualTriggerNode, setNode];
				const connections = {
					[manualTriggerNode.name]: {
						[NodeConnectionTypes.Main]: [
							[{ node: setNode.name, type: NodeConnectionTypes.Main, index: 0 }],
						],
					},
				};
				const workflowObject = createTestWorkflowObject({
					nodes,
					connections,
				});

				// Mock pinned data with empty array
				workflowsStore.pinDataByNodeName.mockImplementation((nodeName: string) => {
					return nodeName === manualTriggerNode.name ? [] : undefined;
				});

				const { connections: mappedConnections } = useCanvasMapping({
					nodes: ref(nodes),
					connections: ref(connections),
					workflowObject: ref(workflowObject) as Ref<Workflow>,
				});

				expect(mappedConnections.value[0]?.label).toBe('');
			});

			it('should return execution data count when node has run data and no pinned data', () => {
				const workflowsStore = mockedStore(useWorkflowsStore);
				const [manualTriggerNode, setNode] = mockNodes.slice(0, 2);
				const nodes = [manualTriggerNode, setNode];
				const connections = {
					[manualTriggerNode.name]: {
						[NodeConnectionTypes.Main]: [
							[{ node: setNode.name, type: NodeConnectionTypes.Main, index: 0 }],
						],
					},
				};
				const workflowObject = createTestWorkflowObject({
					nodes,
					connections,
				});

				workflowsStore.pinDataByNodeName.mockReturnValue(undefined);
				workflowsStore.getWorkflowResultDataByNodeName.mockImplementation((nodeName: string) => {
					if (nodeName === manualTriggerNode.name) {
						return [
							{
								startTime: 0,
								executionTime: 0,
								executionIndex: 0,
								source: [],
								data: {
									[NodeConnectionTypes.Main]: [[{ json: {} }, { json: {} }, { json: {} }]],
								},
							},
						];
					}
					return null;
				});

				const { connections: mappedConnections } = useCanvasMapping({
					nodes: ref(nodes),
					connections: ref(connections),
					workflowObject: ref(workflowObject) as Ref<Workflow>,
				});

				expect(mappedConnections.value[0]?.label).toBe('3 items');
			});

			it('should return singular item label for execution data with 1 item', () => {
				const workflowsStore = mockedStore(useWorkflowsStore);
				const [manualTriggerNode, setNode] = mockNodes.slice(0, 2);
				const nodes = [manualTriggerNode, setNode];
				const connections = {
					[manualTriggerNode.name]: {
						[NodeConnectionTypes.Main]: [
							[{ node: setNode.name, type: NodeConnectionTypes.Main, index: 0 }],
						],
					},
				};
				const workflowObject = createTestWorkflowObject({
					nodes,
					connections,
				});

				workflowsStore.pinDataByNodeName.mockReturnValue(undefined);
				workflowsStore.getWorkflowResultDataByNodeName.mockImplementation((nodeName: string) => {
					if (nodeName === manualTriggerNode.name) {
						return [
							{
								startTime: 0,
								executionTime: 0,
								executionIndex: 0,
								source: [],
								data: {
									[NodeConnectionTypes.Main]: [[{ json: {} }]],
								},
							},
						];
					}
					return null;
				});

				const { connections: mappedConnections } = useCanvasMapping({
					nodes: ref(nodes),
					connections: ref(connections),
					workflowObject: ref(workflowObject) as Ref<Workflow>,
				});

				expect(mappedConnections.value[0]?.label).toBe('1 item');
			});

			it('should return empty string when execution data total is 0', () => {
				const workflowsStore = mockedStore(useWorkflowsStore);
				const [manualTriggerNode, setNode] = mockNodes.slice(0, 2);
				const nodes = [manualTriggerNode, setNode];
				const connections = {
					[manualTriggerNode.name]: {
						[NodeConnectionTypes.Main]: [
							[{ node: setNode.name, type: NodeConnectionTypes.Main, index: 0 }],
						],
					},
				};
				const workflowObject = createTestWorkflowObject({
					nodes,
					connections,
				});

				workflowsStore.pinDataByNodeName.mockReturnValue(undefined);
				workflowsStore.getWorkflowResultDataByNodeName.mockImplementation((nodeName: string) => {
					if (nodeName === manualTriggerNode.name) {
						return [
							{
								startTime: 0,
								executionTime: 0,
								executionIndex: 0,
								source: [],
								data: {
									[NodeConnectionTypes.Main]: [[]],
								},
							},
						];
					}
					return null;
				});

				const { connections: mappedConnections } = useCanvasMapping({
					nodes: ref(nodes),
					connections: ref(connections),
					workflowObject: ref(workflowObject) as Ref<Workflow>,
				});

				expect(mappedConnections.value[0]?.label).toBe('');
			});

			it('should handle multiple iterations with single execution data label', () => {
				const workflowsStore = mockedStore(useWorkflowsStore);
				const [manualTriggerNode, setNode] = mockNodes.slice(0, 2);
				const nodes = [manualTriggerNode, setNode];
				const connections = {
					[manualTriggerNode.name]: {
						[NodeConnectionTypes.Main]: [
							[{ node: setNode.name, type: NodeConnectionTypes.Main, index: 0 }],
						],
					},
				};
				const workflowObject = createTestWorkflowObject({
					nodes,
					connections,
				});

				workflowsStore.pinDataByNodeName.mockReturnValue(undefined);
				workflowsStore.getWorkflowResultDataByNodeName.mockImplementation((nodeName: string) => {
					if (nodeName === manualTriggerNode.name) {
						return [
							{
								startTime: 0,
								executionTime: 0,
								executionIndex: 0,
								source: [],
								data: {
									[NodeConnectionTypes.Main]: [[{ json: {} }, { json: {} }]],
								},
							},
						];
					}
					return null;
				});

				const { connections: mappedConnections } = useCanvasMapping({
					nodes: ref(nodes),
					connections: ref(connections),
					workflowObject: ref(workflowObject) as Ref<Workflow>,
				});

				expect(mappedConnections.value[0]?.label).toBe('2 items');
			});

			it('should handle multiple iterations with total items label', () => {
				const workflowsStore = mockedStore(useWorkflowsStore);
				const [manualTriggerNode, setNode] = mockNodes.slice(0, 2);
				const nodes = [manualTriggerNode, setNode];
				const connections = {
					[manualTriggerNode.name]: {
						[NodeConnectionTypes.Main]: [
							[{ node: setNode.name, type: NodeConnectionTypes.Main, index: 0 }],
						],
					},
				};
				const workflowObject = createTestWorkflowObject({
					nodes,
					connections,
				});

				workflowsStore.pinDataByNodeName.mockReturnValue(undefined);
				workflowsStore.getWorkflowResultDataByNodeName.mockImplementation((nodeName: string) => {
					if (nodeName === manualTriggerNode.name) {
						return [
							{
								startTime: 0,
								executionTime: 0,
								executionIndex: 0,
								source: [],
								data: {
									[NodeConnectionTypes.Main]: [[{ json: {} }]],
								},
							},
							{
								startTime: 0,
								executionTime: 0,
								executionIndex: 1,
								source: [],
								data: {
									[NodeConnectionTypes.Main]: [[{ json: {} }, { json: {} }]],
								},
							},
						];
					}
					return null;
				});

				const { connections: mappedConnections } = useCanvasMapping({
					nodes: ref(nodes),
					connections: ref(connections),
					workflowObject: ref(workflowObject) as Ref<Workflow>,
				});

				expect(mappedConnections.value[0]?.label).toBe('3 items total');
			});

			it('should handle different connection types correctly', () => {
				const workflowsStore = mockedStore(useWorkflowsStore);
				const [manualTriggerNode, setNode] = mockNodes.slice(0, 2);
				const nodes = [manualTriggerNode, setNode];
				const connections = {
					[manualTriggerNode.name]: {
						[NodeConnectionTypes.AiTool]: [
							[{ node: setNode.name, type: NodeConnectionTypes.AiTool, index: 0 }],
						],
					},
				};
				const workflowObject = createTestWorkflowObject({
					nodes,
					connections,
				});

				workflowsStore.pinDataByNodeName.mockReturnValue(undefined);
				workflowsStore.getWorkflowResultDataByNodeName.mockImplementation((nodeName: string) => {
					if (nodeName === manualTriggerNode.name) {
						return [
							{
								startTime: 0,
								executionTime: 0,
								executionIndex: 0,
								source: [],
								data: {
									[NodeConnectionTypes.AiTool]: [[{ json: {} }, { json: {} }]],
								},
							},
						];
					}
					return null;
				});

				const { connections: mappedConnections } = useCanvasMapping({
					nodes: ref(nodes),
					connections: ref(connections),
					workflowObject: ref(workflowObject) as Ref<Workflow>,
				});

				expect(mappedConnections.value[0]?.label).toBe('2 items');
			});

			it('should prioritize pinned data over execution data', () => {
				const workflowsStore = mockedStore(useWorkflowsStore);
				const [manualTriggerNode, setNode] = mockNodes.slice(0, 2);
				const nodes = [manualTriggerNode, setNode];
				const connections = {
					[manualTriggerNode.name]: {
						[NodeConnectionTypes.Main]: [
							[{ node: setNode.name, type: NodeConnectionTypes.Main, index: 0 }],
						],
					},
				};
				const workflowObject = createTestWorkflowObject({
					nodes,
					connections,
				});

				// Mock both pinned data and execution data
				workflowsStore.pinDataByNodeName.mockImplementation((nodeName: string) => {
					return nodeName === manualTriggerNode.name
						? [{ json: { id: 1 } }, { json: { id: 2 } }]
						: undefined;
				});
				workflowsStore.getWorkflowResultDataByNodeName.mockImplementation((nodeName: string) => {
					if (nodeName === manualTriggerNode.name) {
						return [
							{
								startTime: 0,
								executionTime: 0,
								executionIndex: 0,
								source: [],
								data: {
									[NodeConnectionTypes.Main]: [[{ json: {} }, { json: {} }, { json: {} }]],
								},
							},
						];
					}
					return null;
				});

				const { connections: mappedConnections } = useCanvasMapping({
					nodes: ref(nodes),
					connections: ref(connections),
					workflowObject: ref(workflowObject) as Ref<Workflow>,
				});

				// Should show pinned data count (2 items), not execution data count (3 items)
				expect(mappedConnections.value[0]?.label).toBe('2 items');
			});

			it('should return empty string when no data is available', () => {
				const workflowsStore = mockedStore(useWorkflowsStore);
				const [manualTriggerNode, setNode] = mockNodes.slice(0, 2);
				const nodes = [manualTriggerNode, setNode];
				const connections = {
					[manualTriggerNode.name]: {
						[NodeConnectionTypes.Main]: [
							[{ node: setNode.name, type: NodeConnectionTypes.Main, index: 0 }],
						],
					},
				};
				const workflowObject = createTestWorkflowObject({
					nodes,
					connections,
				});

				workflowsStore.pinDataByNodeName.mockReturnValue(undefined);
				workflowsStore.getWorkflowResultDataByNodeName.mockReturnValue(null);

				const { connections: mappedConnections } = useCanvasMapping({
					nodes: ref(nodes),
					connections: ref(connections),
					workflowObject: ref(workflowObject) as Ref<Workflow>,
				});

				expect(mappedConnections.value[0]?.label).toBe('');
			});

			it('should handle connection with specific output index', () => {
				const workflowsStore = mockedStore(useWorkflowsStore);
				const [manualTriggerNode, setNode] = mockNodes.slice(0, 2);
				const nodes = [manualTriggerNode, setNode];
				const connections = {
					[manualTriggerNode.name]: {
						[NodeConnectionTypes.Main]: [
							[], // index 0 - empty
							[{ node: setNode.name, type: NodeConnectionTypes.Main, index: 0 }], // index 1 - connected
						],
					},
				};
				const workflowObject = createTestWorkflowObject({
					nodes,
					connections,
				});

				workflowsStore.pinDataByNodeName.mockReturnValue(undefined);
				workflowsStore.getWorkflowResultDataByNodeName.mockImplementation((nodeName: string) => {
					if (nodeName === manualTriggerNode.name) {
						return [
							{
								startTime: 0,
								executionTime: 0,
								executionIndex: 0,
								source: [],
								data: {
									[NodeConnectionTypes.Main]: [
										[{ json: {} }], // index 0 - 1 item
										[{ json: {} }, { json: {} }, { json: {} }], // index 1 - 3 items
									],
								},
							},
						];
					}
					return null;
				});

				const { connections: mappedConnections } = useCanvasMapping({
					nodes: ref(nodes),
					connections: ref(connections),
					workflowObject: ref(workflowObject) as Ref<Workflow>,
				});

				// Should show the count for output index 1 (3 items), not index 0 (1 item)
				expect(mappedConnections.value[0]?.label).toBe('3 items');
			});
		});

		describe('getConnectionData', () => {
			it('should return running status when source node is executing and has no run data', () => {
				const workflowsStore = mockedStore(useWorkflowsStore);
				const [manualTriggerNode, setNode] = mockNodes.slice(0, 2);
				const nodes = [manualTriggerNode, setNode];
				const connections = {
					[manualTriggerNode.name]: {
						[NodeConnectionTypes.Main]: [
							[{ node: setNode.name, type: NodeConnectionTypes.Main, index: 0 }],
						],
					},
				};
				const workflowObject = createTestWorkflowObject({
					nodes,
					connections,
				});

				workflowState.executingNode.isNodeExecuting = vi
					.fn()
					.mockImplementation((nodeName: string) => {
						return nodeName === manualTriggerNode.name;
					});
				workflowsStore.getWorkflowResultDataByNodeName.mockReturnValue(null);

				const { connections: mappedConnections } = useCanvasMapping({
					nodes: ref(nodes),
					connections: ref(connections),
					workflowObject: ref(workflowObject) as Ref<Workflow>,
				});

				expect(mappedConnections.value[0]?.data?.status).toEqual('running');
			});

			it('should return pinned status when source has both pinned data and execution data', () => {
				const workflowsStore = mockedStore(useWorkflowsStore);
				const [manualTriggerNode, setNode] = mockNodes.slice(0, 2);
				const nodes = [manualTriggerNode, setNode];
				const connections = {
					[manualTriggerNode.name]: {
						[NodeConnectionTypes.Main]: [
							[{ node: setNode.name, type: NodeConnectionTypes.Main, index: 0 }],
						],
					},
				};
				const workflowObject = createTestWorkflowObject({
					nodes,
					connections,
				});

				workflowsStore.pinDataByNodeName.mockImplementation((nodeName: string) => {
					return nodeName === manualTriggerNode.name ? [{ json: {} }] : undefined;
				});
				workflowsStore.getWorkflowResultDataByNodeName.mockImplementation((nodeName: string) => {
					if (nodeName === manualTriggerNode.name) {
						return [
							{
								startTime: 0,
								executionTime: 0,
								executionIndex: 0,
								source: [],
								data: {
									[NodeConnectionTypes.Main]: [[{ json: {} }]],
								},
							},
						];
					}
					return null;
				});

				const { connections: mappedConnections } = useCanvasMapping({
					nodes: ref(nodes),
					connections: ref(connections),
					workflowObject: ref(workflowObject) as Ref<Workflow>,
				});

				expect(mappedConnections.value[0]?.data?.status).toEqual('pinned');
			});

			it('should return error status when source node has issues', () => {
				const workflowsStore = mockedStore(useWorkflowsStore);
				const node = createTestNode({
					name: 'Test Node',
					issues: { typeUnknown: true },
				} as Partial<INode>);
				const setNode = createTestNode({ name: 'Set Node' });
				const nodes = [node, setNode];
				const connections = {
					[node.name]: {
						[NodeConnectionTypes.Main]: [
							[{ node: setNode.name, type: NodeConnectionTypes.Main, index: 0 }],
						],
					},
				};
				const workflowObject = createTestWorkflowObject({ nodes, connections });

				workflowsStore.getWorkflowRunData = {};

				const { connections: mappedConnections } = useCanvasMapping({
					nodes: ref(nodes),
					connections: ref(connections),
					workflowObject: ref(workflowObject) as Ref<Workflow>,
				});

				expect(mappedConnections.value[0]?.data?.status).toEqual('error');
			});

			it('should return success status when node has run data and no issues', () => {
				const workflowsStore = mockedStore(useWorkflowsStore);
				const [manualTriggerNode, setNode] = mockNodes.slice(0, 2);
				const nodes = [manualTriggerNode, setNode];
				const connections = {
					[manualTriggerNode.name]: {
						[NodeConnectionTypes.Main]: [
							[{ node: setNode.name, type: NodeConnectionTypes.Main, index: 0 }],
						],
					},
				};
				const workflowObject = createTestWorkflowObject({
					nodes,
					connections,
				});

				workflowsStore.getWorkflowResultDataByNodeName.mockImplementation((nodeName: string) => {
					if (nodeName === manualTriggerNode.name) {
						return [
							{
								startTime: 0,
								executionTime: 0,
								executionIndex: 0,
								source: [],
								executionStatus: 'success',
								data: {
									[NodeConnectionTypes.Main]: [[{ json: {} }]],
								},
							},
						];
					}
					return null;
				});

				const { connections: mappedConnections } = useCanvasMapping({
					nodes: ref(nodes),
					connections: ref(connections),
					workflowObject: ref(workflowObject) as Ref<Workflow>,
				});

				expect(mappedConnections.value[0]?.data?.status).toEqual('success');
			});

			it('should return undefined status when no conditions are met', () => {
				const workflowsStore = mockedStore(useWorkflowsStore);
				const [manualTriggerNode, setNode] = mockNodes.slice(0, 2);
				const nodes = [manualTriggerNode, setNode];
				const connections = {
					[manualTriggerNode.name]: {
						[NodeConnectionTypes.Main]: [
							[{ node: setNode.name, type: NodeConnectionTypes.Main, index: 0 }],
						],
					},
				};
				const workflowObject = createTestWorkflowObject({
					nodes,
					connections,
				});

				workflowsStore.getWorkflowResultDataByNodeName.mockReturnValue(null);
				workflowsStore.pinDataByNodeName.mockReturnValue(undefined);

				const { connections: mappedConnections } = useCanvasMapping({
					nodes: ref(nodes),
					connections: ref(connections),
					workflowObject: ref(workflowObject) as Ref<Workflow>,
				});

				expect(mappedConnections.value[0]?.data?.status).toBeUndefined();
			});

			it('should include maxConnections when ports have connection limits', () => {
				const nodeTypesStore = mockedStore(useNodeTypesStore);
				const manualTriggerNode = mockNode({
					name: 'Manual Trigger',
					type: MANUAL_TRIGGER_NODE_TYPE,
				});
				const setNode = mockNode({
					name: 'Set',
					type: SET_NODE_TYPE,
				});
				const nodes = [manualTriggerNode, setNode];
				const connections = {
					[manualTriggerNode.name]: {
						[NodeConnectionTypes.Main]: [
							[{ node: setNode.name, type: NodeConnectionTypes.Main, index: 0 }],
						],
					},
				};

				// Mock node type with maxConnections
				const nodeTypeWithMaxConnections = mockNodeTypeDescription({
					name: SET_NODE_TYPE,
					inputs: [
						{
							type: NodeConnectionTypes.Main,
							maxConnections: 1,
						},
					],
				});

				nodeTypesStore.nodeTypes = {
					[MANUAL_TRIGGER_NODE_TYPE]: {
						1: mockNodeTypeDescription({
							name: MANUAL_TRIGGER_NODE_TYPE,
						}),
					},
					[SET_NODE_TYPE]: {
						1: nodeTypeWithMaxConnections,
					},
				};

				const workflowObject = createTestWorkflowObject({
					nodes,
					connections,
				});

				const { connections: mappedConnections } = useCanvasMapping({
					nodes: ref(nodes),
					connections: ref(connections),
					workflowObject: ref(workflowObject) as Ref<Workflow>,
				});

				expect(mappedConnections.value[0]?.data?.maxConnections).toEqual(1);
			});

			it('should use minimum maxConnections when multiple ports have limits', () => {
				const nodeTypesStore = mockedStore(useNodeTypesStore);
				const manualTriggerNode = mockNode({
					name: 'Manual Trigger',
					type: MANUAL_TRIGGER_NODE_TYPE,
				});
				const setNode = mockNode({
					name: 'Set',
					type: SET_NODE_TYPE,
				});
				const nodes = [manualTriggerNode, setNode];
				const connections = {
					[manualTriggerNode.name]: {
						[NodeConnectionTypes.Main]: [
							[{ node: setNode.name, type: NodeConnectionTypes.Main, index: 0 }],
						],
					},
				};

				nodeTypesStore.nodeTypes = {
					[MANUAL_TRIGGER_NODE_TYPE]: {
						1: mockNodeTypeDescription({
							name: MANUAL_TRIGGER_NODE_TYPE,
							outputs: [
								{
									type: NodeConnectionTypes.Main,
									maxConnections: 3,
								},
							],
						}),
					},
					[SET_NODE_TYPE]: {
						1: mockNodeTypeDescription({
							name: SET_NODE_TYPE,
							inputs: [
								{
									type: NodeConnectionTypes.Main,
									maxConnections: 2,
								},
							],
						}),
					},
				};

				const workflowObject = createTestWorkflowObject({
					nodes,
					connections,
				});

				const { connections: mappedConnections } = useCanvasMapping({
					nodes: ref(nodes),
					connections: ref(connections),
					workflowObject: ref(workflowObject) as Ref<Workflow>,
				});

				expect(mappedConnections.value[0]?.data?.maxConnections).toEqual(2);
			});

			it('should not include maxConnections when no limits are set', () => {
				const [manualTriggerNode, setNode] = mockNodes.slice(0, 2);
				const nodes = [manualTriggerNode, setNode];
				const connections = {
					[manualTriggerNode.name]: {
						[NodeConnectionTypes.Main]: [
							[{ node: setNode.name, type: NodeConnectionTypes.Main, index: 0 }],
						],
					},
				};
				const workflowObject = createTestWorkflowObject({
					nodes,
					connections,
				});

				const { connections: mappedConnections } = useCanvasMapping({
					nodes: ref(nodes),
					connections: ref(connections),
					workflowObject: ref(workflowObject) as Ref<Workflow>,
				});

				expect(mappedConnections.value[0]?.data?.maxConnections).toBeUndefined();
			});

			it('should preserve existing connection data', () => {
				const [manualTriggerNode, setNode] = mockNodes.slice(0, 2);
				const nodes = [manualTriggerNode, setNode];
				const connections = {
					[manualTriggerNode.name]: {
						[NodeConnectionTypes.Main]: [
							[
								{
									node: setNode.name,
									type: NodeConnectionTypes.Main,
									index: 0,
									// Add custom data that should be preserved
									customField: 'customValue',
								},
							],
						],
					},
				};
				const workflowObject = createTestWorkflowObject({
					nodes,
					connections,
				});

				const { connections: mappedConnections } = useCanvasMapping({
					nodes: ref(nodes),
					connections: ref(connections),
					workflowObject: ref(workflowObject) as Ref<Workflow>,
				});

				expect(mappedConnections.value[0]?.data?.source.node).toEqual(manualTriggerNode.name);
				expect(mappedConnections.value[0]?.data?.target.node).toEqual(setNode.name);
			});

			it('should handle connections with different output indices correctly', () => {
				const workflowsStore = mockedStore(useWorkflowsStore);
				const [manualTriggerNode, setNode] = mockNodes.slice(0, 2);
				const nodes = [manualTriggerNode, setNode];
				const connections = {
					[manualTriggerNode.name]: {
						[NodeConnectionTypes.Main]: [
							[], // index 0 - empty
							[{ node: setNode.name, type: NodeConnectionTypes.Main, index: 0 }], // index 1
						],
					},
				};
				const workflowObject = createTestWorkflowObject({
					nodes,
					connections,
				});

				workflowsStore.getWorkflowResultDataByNodeName.mockImplementation((nodeName: string) => {
					if (nodeName === manualTriggerNode.name) {
						return [
							{
								startTime: 0,
								executionTime: 0,
								executionIndex: 0,
								source: [],
								executionStatus: 'success',
								data: {
									[NodeConnectionTypes.Main]: [
										[{ json: {} }], // index 0
										[{ json: {} }, { json: {} }], // index 1
									],
								},
							},
						];
					}
					return null;
				});

				const { connections: mappedConnections } = useCanvasMapping({
					nodes: ref(nodes),
					connections: ref(connections),
					workflowObject: ref(workflowObject) as Ref<Workflow>,
				});

				expect(mappedConnections.value[0]?.data?.status).toEqual('success');
			});

			it('should handle different connection types', () => {
				const workflowsStore = mockedStore(useWorkflowsStore);
				const [manualTriggerNode, setNode] = mockNodes.slice(0, 2);
				const nodes = [manualTriggerNode, setNode];
				const connections = {
					[manualTriggerNode.name]: {
						[NodeConnectionTypes.AiTool]: [
							[{ node: setNode.name, type: NodeConnectionTypes.AiTool, index: 0 }],
						],
					},
				};
				const workflowObject = createTestWorkflowObject({
					nodes,
					connections,
				});

				workflowsStore.getWorkflowResultDataByNodeName.mockImplementation((nodeName: string) => {
					if (nodeName === manualTriggerNode.name) {
						return [
							{
								startTime: 0,
								executionTime: 0,
								executionIndex: 0,
								source: [],
								executionStatus: 'success',
								data: {
									[NodeConnectionTypes.AiTool]: [[{ json: {} }]],
								},
							},
						];
					}
					return null;
				});

				const { connections: mappedConnections } = useCanvasMapping({
					nodes: ref(nodes),
					connections: ref(connections),
					workflowObject: ref(workflowObject) as Ref<Workflow>,
				});

				expect(mappedConnections.value[0]?.data?.status).toEqual('success');
			});
		});
	});
});
