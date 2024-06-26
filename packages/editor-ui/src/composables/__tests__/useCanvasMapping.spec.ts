import type { Ref } from 'vue';
import { ref } from 'vue';
import { NodeConnectionType } from 'n8n-workflow';
import type { Workflow } from 'n8n-workflow';
import { createPinia, setActivePinia } from 'pinia';
import { mock } from 'vitest-mock-extended';

import { useCanvasMapping } from '@/composables/useCanvasMapping';
import type { IWorkflowDb } from '@/Interface';
import { createTestWorkflowObject, mockNode, mockNodes } from '@/__tests__/mocks';
import { MANUAL_TRIGGER_NODE_TYPE } from '@/constants';

vi.mock('@/stores/nodeTypes.store', () => ({
	useNodeTypesStore: vi.fn(() => ({
		getNodeType: vi.fn(() => ({
			name: 'test',
			description: 'Test Node Description',
		})),
		isTriggerNode: vi.fn(),
		isConfigNode: vi.fn(),
		isConfigurableNode: vi.fn(),
	})),
}));

beforeEach(() => {
	const pinia = createPinia();
	setActivePinia(pinia);
});

afterEach(() => {
	vi.clearAllMocks();
});

describe('useCanvasMapping', () => {
	it('should initialize with default props', () => {
		const workflow = mock<IWorkflowDb>({
			nodes: [],
		});
		const workflowObject = createTestWorkflowObject(workflow);

		const { elements, connections } = useCanvasMapping({
			workflow: ref(workflow),
			workflowObject: ref(workflowObject) as Ref<Workflow>,
		});

		expect(elements.value).toEqual([]);
		expect(connections.value).toEqual([]);
	});

	describe('elements', () => {
		it('should map nodes to canvas elements', () => {
			const manualTriggerNode = mockNode({
				name: 'Manual Trigger',
				type: MANUAL_TRIGGER_NODE_TYPE,
				disabled: false,
			});
			const workflow = mock<IWorkflowDb>({
				nodes: [manualTriggerNode],
			});
			const workflowObject = createTestWorkflowObject(workflow);

			const { elements } = useCanvasMapping({
				workflow: ref(workflow),
				workflowObject: ref(workflowObject) as Ref<Workflow>,
			});

			expect(elements.value).toEqual([
				{
					id: manualTriggerNode.id,
					label: manualTriggerNode.name,
					type: 'canvas-node',
					position: expect.anything(),
					data: {
						id: manualTriggerNode.id,
						type: manualTriggerNode.type,
						typeVersion: expect.anything(),
						disabled: false,
						inputs: [],
						outputs: [],
						connections: {
							input: {},
							output: {},
						},
						renderType: 'default',
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
			const workflow = mock<IWorkflowDb>({
				nodes: [manualTriggerNode],
			});
			const workflowObject = createTestWorkflowObject(workflow);

			const { elements } = useCanvasMapping({
				workflow: ref(workflow),
				workflowObject: ref(workflowObject) as Ref<Workflow>,
			});

			expect(elements.value[0]?.data?.disabled).toEqual(true);
		});

		it('should handle input and output connections', () => {
			const [manualTriggerNode, setNode] = mockNodes.slice(0, 2);
			const workflow = mock<IWorkflowDb>({
				nodes: [manualTriggerNode, setNode],
				connections: {
					[manualTriggerNode.name]: {
						[NodeConnectionType.Main]: [
							[{ node: setNode.name, type: NodeConnectionType.Main, index: 0 }],
						],
					},
				},
			});
			const workflowObject = createTestWorkflowObject(workflow);

			const { elements } = useCanvasMapping({
				workflow: ref(workflow),
				workflowObject: ref(workflowObject) as Ref<Workflow>,
			});

			expect(elements.value[0]?.data?.connections.output).toHaveProperty(NodeConnectionType.Main);
			expect(elements.value[0]?.data?.connections.output[NodeConnectionType.Main][0][0]).toEqual(
				expect.objectContaining({
					node: setNode.name,
					type: NodeConnectionType.Main,
					index: 0,
				}),
			);

			expect(elements.value[1]?.data?.connections.input).toHaveProperty(NodeConnectionType.Main);
			expect(elements.value[1]?.data?.connections.input[NodeConnectionType.Main][0][0]).toEqual(
				expect.objectContaining({
					node: manualTriggerNode.name,
					type: NodeConnectionType.Main,
					index: 0,
				}),
			);
		});
	});

	describe('connections', () => {
		it('should map connections to canvas connections', () => {
			const [manualTriggerNode, setNode] = mockNodes.slice(0, 2);
			const workflow = mock<IWorkflowDb>({
				nodes: [manualTriggerNode, setNode],
				connections: {
					[manualTriggerNode.name]: {
						[NodeConnectionType.Main]: [
							[{ node: setNode.name, type: NodeConnectionType.Main, index: 0 }],
						],
					},
				},
			});
			const workflowObject = createTestWorkflowObject(workflow);

			const { connections } = useCanvasMapping({
				workflow: ref(workflow),
				workflowObject: ref(workflowObject) as Ref<Workflow>,
			});

			expect(connections.value).toEqual([
				{
					data: {
						fromNodeName: manualTriggerNode.name,
						source: {
							index: 0,
							type: NodeConnectionType.Main,
						},
						target: {
							index: 0,
							type: NodeConnectionType.Main,
						},
					},
					id: `[${manualTriggerNode.id}/${NodeConnectionType.Main}/0][${setNode.id}/${NodeConnectionType.Main}/0]`,
					label: '',
					source: manualTriggerNode.id,
					sourceHandle: `outputs/${NodeConnectionType.Main}/0`,
					target: setNode.id,
					targetHandle: `inputs/${NodeConnectionType.Main}/0`,
					type: 'canvas-edge',
				},
			]);
		});

		it('should map multiple input types to canvas connections', () => {
			const [manualTriggerNode, setNode] = mockNodes.slice(0, 2);
			const workflow = mock<IWorkflowDb>({
				nodes: [manualTriggerNode, setNode],
				connections: {
					[manualTriggerNode.name]: {
						[NodeConnectionType.AiTool]: [
							[{ node: setNode.name, type: NodeConnectionType.AiTool, index: 0 }],
						],
						[NodeConnectionType.AiDocument]: [
							[{ node: setNode.name, type: NodeConnectionType.AiDocument, index: 1 }],
						],
					},
				},
			});
			const workflowObject = createTestWorkflowObject(workflow);

			const { connections } = useCanvasMapping({
				workflow: ref(workflow),
				workflowObject: ref(workflowObject) as Ref<Workflow>,
			});

			expect(connections.value).toEqual([
				{
					data: {
						fromNodeName: manualTriggerNode.name,
						source: {
							index: 0,
							type: NodeConnectionType.AiTool,
						},
						target: {
							index: 0,
							type: NodeConnectionType.AiTool,
						},
					},
					id: `[${manualTriggerNode.id}/${NodeConnectionType.AiTool}/0][${setNode.id}/${NodeConnectionType.AiTool}/0]`,
					label: '',
					source: manualTriggerNode.id,
					sourceHandle: `outputs/${NodeConnectionType.AiTool}/0`,
					target: setNode.id,
					targetHandle: `inputs/${NodeConnectionType.AiTool}/0`,
					type: 'canvas-edge',
				},
				{
					data: {
						fromNodeName: manualTriggerNode.name,
						source: {
							index: 0,
							type: NodeConnectionType.AiDocument,
						},
						target: {
							index: 1,
							type: NodeConnectionType.AiDocument,
						},
					},
					id: `[${manualTriggerNode.id}/${NodeConnectionType.AiDocument}/0][${setNode.id}/${NodeConnectionType.AiDocument}/1]`,
					label: '',
					source: manualTriggerNode.id,
					sourceHandle: `outputs/${NodeConnectionType.AiDocument}/0`,
					target: setNode.id,
					targetHandle: `inputs/${NodeConnectionType.AiDocument}/1`,
					type: 'canvas-edge',
				},
			]);
		});
	});
});
