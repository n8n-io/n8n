import type { Ref } from 'vue';
import { ref } from 'vue';
import { NodeConnectionType } from 'n8n-workflow';
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
import { MANUAL_TRIGGER_NODE_TYPE, SET_NODE_TYPE, STICKY_NODE_TYPE, STORES } from '@/constants';
import { useWorkflowsStore } from '@/stores/workflows.store';
import {
	createCanvasConnectionHandleString,
	createCanvasConnectionId,
} from '@/utils/canvasUtilsV2';
import { CanvasConnectionMode, CanvasNodeRenderType } from '@/types';
import { MarkerType } from '@vue-flow/core';
import { createTestingPinia } from '@pinia/testing';
import { mockedStore } from '@/__tests__/utils';
import { mock } from 'vitest-mock-extended';

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
						},
						issues: {
							items: [],
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
			const [manualTriggerNode, setNode] = mockNodes.slice(0, 2);
			const nodes = [manualTriggerNode, setNode];
			const connections = {
				[manualTriggerNode.name]: {
					[NodeConnectionType.Main]: [
						[{ node: setNode.name, type: NodeConnectionType.Main, index: 0 }],
					],
				},
			};
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
				NodeConnectionType.Main,
			);
			expect(
				mappedNodes.value[0]?.data?.connections[CanvasConnectionMode.Output][
					NodeConnectionType.Main
				][0]?.[0],
			).toEqual(
				expect.objectContaining({
					node: setNode.name,
					type: NodeConnectionType.Main,
					index: 0,
				}),
			);

			expect(mappedNodes.value[1]?.data?.connections[CanvasConnectionMode.Input]).toHaveProperty(
				NodeConnectionType.Main,
			);
			expect(
				mappedNodes.value[1]?.data?.connections[CanvasConnectionMode.Input][
					NodeConnectionType.Main
				][0]?.[0],
			).toEqual(
				expect.objectContaining({
					node: manualTriggerNode.name,
					type: NodeConnectionType.Main,
					index: 0,
				}),
			);
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

				expect(mappedNodes.value[0]?.data?.render).toEqual({
					type: CanvasNodeRenderType.Default,
					options: {
						configurable: false,
						configuration: false,
						trigger: true,
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
							source: [],
							data: {
								[NodeConnectionType.Main]: [[{ json: {} }, { json: {} }]],
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
							[NodeConnectionType.Main]: {
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
									source: [],
									data: {
										[NodeConnectionType.Main]: [[{ json: {} }]],
										[NodeConnectionType.AiAgent]: [[{ json: {} }, { json: {} }]],
									},
								},
							];
						} else if (nodeName === 'Node 2') {
							return [
								{
									startTime: 0,
									executionTime: 0,
									source: [],
									data: {
										[NodeConnectionType.Main]: [[{ json: {} }, { json: {} }, { json: {} }]],
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
							[NodeConnectionType.Main]: {
								0: {
									iterations: 1,
									total: 1,
								},
							},
							[NodeConnectionType.AiAgent]: {
								0: {
									iterations: 1,
									total: 2,
								},
							},
						},
						node2: {
							[NodeConnectionType.Main]: {
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
							source: [],
							data: {
								[NodeConnectionType.Main]: [[{ json: {} }]],
							},
						},
						{
							startTime: 0,
							executionTime: 0,
							source: [],
							data: {
								[NodeConnectionType.Main]: [[{ json: {} }, { json: {} }, { json: {} }]],
							},
						},
						{
							startTime: 0,
							executionTime: 0,
							source: [],
							data: {
								[NodeConnectionType.Main]: [[{ json: {} }, { json: {} }]],
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
							[NodeConnectionType.Main]: {
								0: {
									iterations: 3,
									total: 6,
								},
							},
						},
					});
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
				expect(additionalNodePropertiesById.value[nodes[1].id]).toEqual({ style: { zIndex: -99 } });
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

		describe('nodeIssuesById', () => {
			it('should return empty array when node has no issues', () => {
				const workflowsStore = mockedStore(useWorkflowsStore);
				const node = createTestNode({ name: 'Test Node' });
				const nodes = [node];
				const connections = {};
				const workflowObject = createTestWorkflowObject({ nodes, connections });

				workflowsStore.getWorkflowRunData = {};

				const { nodeIssuesById } = useCanvasMapping({
					nodes: ref(nodes),
					connections: ref(connections),
					workflowObject: ref(workflowObject) as Ref<Workflow>,
				});

				expect(nodeIssuesById.value[node.id]).toEqual([]);
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
							source: [],
							error: mock<NodeApiError>({
								message: errorMessage,
								description: errorDescription,
							}),
						},
					],
				};

				const { nodeIssuesById } = useCanvasMapping({
					nodes: ref(nodes),
					connections: ref(connections),
					workflowObject: ref(workflowObject) as Ref<Workflow>,
				});

				expect(nodeIssuesById.value[node.id]).toEqual([`${errorMessage} (${errorDescription})`]);
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
							source: [],
							error: mock<NodeApiError>({
								message: errorMessage,
								description: null,
							}),
						},
					],
				};

				const { nodeIssuesById } = useCanvasMapping({
					nodes: ref(nodes),
					connections: ref(connections),
					workflowObject: ref(workflowObject) as Ref<Workflow>,
				});

				expect(nodeIssuesById.value[node.id]).toEqual([errorMessage]);
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
							source: [],
							error: mock<NodeApiError>({
								message: 'Error 1',
								description: 'Description 1',
							}),
						},
						{
							startTime: 0,
							executionTime: 0,
							source: [],
							error: mock<NodeApiError>({
								message: 'Error 2',
								description: 'Description 2',
							}),
						},
					],
				};

				const { nodeIssuesById } = useCanvasMapping({
					nodes: ref(nodes),
					connections: ref(connections),
					workflowObject: ref(workflowObject) as Ref<Workflow>,
				});

				expect(nodeIssuesById.value[node.id]).toEqual([
					'Error 1 (Description 1)',
					'Error 2 (Description 2)',
				]);
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

				const { nodeIssuesById } = useCanvasMapping({
					nodes: ref(nodes),
					connections: ref(connections),
					workflowObject: ref(workflowObject) as Ref<Workflow>,
				});

				expect(nodeIssuesById.value[node.id]).toEqual([
					'Node Type "n8n-nodes-base.set" is not known.',
				]);
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
							source: [],
							error: mock<NodeApiError>({
								message: 'Execution error',
								description: 'Error description',
							}),
						},
					],
				};

				const { nodeIssuesById } = useCanvasMapping({
					nodes: ref(nodes),
					connections: ref(connections),
					workflowObject: ref(workflowObject) as Ref<Workflow>,
				});

				expect(nodeIssuesById.value[node.id]).toEqual([
					'Execution error (Error description)',
					'Node Type "n8n-nodes-base.set" is not known.',
				]);
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
							source: [],
							error: mock<NodeApiError>({
								message: 'Execution error',
								description: 'Error description',
							}),
						},
					],
				};

				const { nodeIssuesById } = useCanvasMapping({
					nodes: ref(nodes),
					connections: ref(connections),
					workflowObject: ref(workflowObject) as Ref<Workflow>,
				});

				expect(nodeIssuesById.value[node1.id]).toEqual([
					'Node Type "n8n-nodes-base.set" is not known.',
				]);
				expect(nodeIssuesById.value[node2.id]).toEqual(['Execution error (Error description)']);
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
							source: [],
							executionStatus: 'error',
						},
					],
					'Node 3': [
						{
							startTime: 0,
							executionTime: 0,
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
		});
	});

	describe('connections', () => {
		it('should map connections to canvas connections', () => {
			const [manualTriggerNode, setNode] = mockNodes.slice(0, 2);
			const nodes = [manualTriggerNode, setNode];
			const connections = {
				[manualTriggerNode.name]: {
					[NodeConnectionType.Main]: [
						[{ node: setNode.name, type: NodeConnectionType.Main, index: 0 }],
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
				type: NodeConnectionType.Main,
				index: 0,
				mode: CanvasConnectionMode.Output,
			});
			const target = setNode.id;
			const targetHandle = createCanvasConnectionHandleString({
				type: NodeConnectionType.Main,
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
							type: NodeConnectionType.Main,
						},
						status: undefined,
						target: {
							node: setNode.name,
							index: 0,
							type: NodeConnectionType.Main,
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
					[NodeConnectionType.AiTool]: [
						[{ node: setNode.name, type: NodeConnectionType.AiTool, index: 0 }],
					],
					[NodeConnectionType.AiDocument]: [
						[{ node: setNode.name, type: NodeConnectionType.AiDocument, index: 1 }],
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
				type: NodeConnectionType.AiTool,
				index: 0,
				mode: CanvasConnectionMode.Output,
			});
			const targetA = setNode.id;
			const targetHandleA = createCanvasConnectionHandleString({
				type: NodeConnectionType.AiTool,
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
				type: NodeConnectionType.AiDocument,
				index: 0,
				mode: CanvasConnectionMode.Output,
			});
			const targetB = setNode.id;
			const targetHandleB = createCanvasConnectionHandleString({
				type: NodeConnectionType.AiDocument,
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
							type: NodeConnectionType.AiTool,
						},
						status: undefined,
						target: {
							node: setNode.name,
							index: 0,
							type: NodeConnectionType.AiTool,
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
							type: NodeConnectionType.AiDocument,
						},
						status: undefined,
						target: {
							node: setNode.name,
							index: 1,
							type: NodeConnectionType.AiDocument,
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
	});
});
