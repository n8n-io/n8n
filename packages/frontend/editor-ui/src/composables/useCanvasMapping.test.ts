import type { Ref } from 'vue';
import { ref } from 'vue';
import { NodeConnectionTypes } from 'n8n-workflow';
import type { Workflow, INode, NodeApiError } from 'n8n-workflow';
import { setActivePinia } from 'pinia';

import { useCanvasMapping } from '@/composables/useCanvasMapping';
import type { INodeUi } from '@/Interface';
import {
	createTestNode,
	createTestWorkflowObject,
	mockNode,
	mockNodes,
	mockNodeTypeDescription,
} from '@/__tests__/mocks';
import { STORES } from '@n8n/stores';
import { MANUAL_TRIGGER_NODE_TYPE, SET_NODE_TYPE, STICKY_NODE_TYPE } from '@/constants';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { createCanvasConnectionHandleString, createCanvasConnectionId } from '@/utils/canvasUtils';
import { CanvasConnectionMode, CanvasNodeRenderType } from '@/types';
import { MarkerType } from '@vue-flow/core';
import { createTestingPinia } from '@pinia/testing';
import { mockedStore } from '@/__tests__/utils';
import { mock } from 'vitest-mock-extended';
import { useRootStore } from '@n8n/stores/useRootStore';

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
			const workflowsStore = mockedStore(useWorkflowsStore);
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

			workflowsStore.isNodeExecuting.mockReturnValue(false);

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
			const workflowsStore = mockedStore(useWorkflowsStore);
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

			workflowsStore.isNodeExecuting.mockReturnValue(true);

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

			workflowsStore.executingNode = [];
			workflowsStore.lastAddedExecutingNode = node1.name;
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

			workflowsStore.executingNode = [];
			workflowsStore.lastAddedExecutingNode = node1.name;
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

			workflowsStore.executingNode = [node2.name];
			workflowsStore.lastAddedExecutingNode = node1.name;
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

				workflowsStore.isNodeExecuting.mockImplementation((nodeName: string) => {
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

				expect(mappedConnections.value[0]?.data?.status).toEqual('running');
			});
		});
	});
});
