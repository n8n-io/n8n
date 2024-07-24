import type { Ref } from 'vue';
import { ref } from 'vue';
import { NodeConnectionType } from 'n8n-workflow';
import type { Workflow } from 'n8n-workflow';
import { createPinia, setActivePinia } from 'pinia';

import { useCanvasMapping } from '@/composables/useCanvasMapping';
import type { INodeUi } from '@/Interface';
import {
	createTestWorkflowObject,
	mockNode,
	mockNodes,
	mockNodeTypeDescription,
} from '@/__tests__/mocks';
import { MANUAL_TRIGGER_NODE_TYPE, SET_NODE_TYPE, STICKY_NODE_TYPE } from '@/constants';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import {
	createCanvasConnectionHandleString,
	createCanvasConnectionId,
} from '@/utils/canvasUtilsV2';
import { CanvasConnectionMode, CanvasNodeRenderType } from '@/types';

beforeEach(() => {
	const pinia = createPinia();
	setActivePinia(pinia);

	useNodeTypesStore().setNodeTypes([
		mockNodeTypeDescription({
			name: MANUAL_TRIGGER_NODE_TYPE,
		}),
		mockNodeTypeDescription({
			name: SET_NODE_TYPE,
		}),
	]);
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
					data: {
						id: manualTriggerNode.id,
						name: manualTriggerNode.name,
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
							count: 0,
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

			useWorkflowsStore().addExecutingNode(manualTriggerNode.name);

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
				][0][0],
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
				][0][0],
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
						fromNodeName: manualTriggerNode.name,
						source: {
							index: 0,
							type: NodeConnectionType.Main,
						},
						status: undefined,
						target: {
							index: 0,
							type: NodeConnectionType.Main,
						},
					},
					id: connectionId,
					label: '',
					source,
					sourceHandle,
					target,
					targetHandle,
					type: 'canvas-edge',
					animated: false,
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
						fromNodeName: manualTriggerNode.name,
						source: {
							index: 0,
							type: NodeConnectionType.AiTool,
						},
						status: undefined,
						target: {
							index: 0,
							type: NodeConnectionType.AiTool,
						},
					},
					id: connectionIdA,
					label: '',
					source: sourceA,
					sourceHandle: sourceHandleA,
					target: targetA,
					targetHandle: targetHandleA,
					type: 'canvas-edge',
					animated: false,
				},
				{
					data: {
						fromNodeName: manualTriggerNode.name,
						source: {
							index: 0,
							type: NodeConnectionType.AiDocument,
						},
						status: undefined,
						target: {
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
					animated: false,
				},
			]);
		});
	});
});
