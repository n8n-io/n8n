import type { Ref } from 'vue';
import { ref } from 'vue';
import { useCanvasMapping } from '@/composables/useCanvasMapping';
import { createTestNode, createTestWorkflow, createTestWorkflowObject } from '@/__tests__/mocks';
import type { IConnections, Workflow } from 'n8n-workflow';
import { createPinia, setActivePinia } from 'pinia';
import { MANUAL_TRIGGER_NODE_TYPE, SET_NODE_TYPE } from '@/constants';
import { NodeConnectionType } from 'n8n-workflow';

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
		const workflow = createTestWorkflow({
			id: '1',
			name: 'Test Workflow',
			nodes: [],
			connections: {},
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
			const node = createTestNode({
				name: 'Node',
				type: MANUAL_TRIGGER_NODE_TYPE,
			});
			const workflow = createTestWorkflow({
				name: 'Test Workflow',
				nodes: [node],
				connections: {},
			});
			const workflowObject = createTestWorkflowObject(workflow);

			const { elements } = useCanvasMapping({
				workflow: ref(workflow),
				workflowObject: ref(workflowObject) as Ref<Workflow>,
			});

			expect(elements.value).toEqual([
				{
					id: node.id,
					label: node.name,
					type: 'canvas-node',
					position: { x: 0, y: 0 },
					data: {
						id: node.id,
						type: node.type,
						typeVersion: 1,
						inputs: [],
						outputs: [],
						renderType: 'default',
					},
				},
			]);
		});
	});

	describe('connections', () => {
		it('should map connections to canvas connections', () => {
			const nodeA = createTestNode({
				name: 'Node A',
				type: MANUAL_TRIGGER_NODE_TYPE,
			});
			const nodeB = createTestNode({
				name: 'Node B',
				type: SET_NODE_TYPE,
			});
			const workflow = createTestWorkflow({
				name: 'Test Workflow',
				nodes: [nodeA, nodeB],
				connections: {
					[nodeA.name]: {
						[NodeConnectionType.Main]: [
							[{ node: nodeB.name, type: NodeConnectionType.Main, index: 0 }],
						],
					},
				} as IConnections,
			});
			const workflowObject = createTestWorkflowObject(workflow);

			const { connections } = useCanvasMapping({
				workflow: ref(workflow),
				workflowObject: ref(workflowObject) as Ref<Workflow>,
			});

			expect(connections.value).toEqual([
				{
					data: {
						fromNodeName: nodeA.name,
						source: {
							index: 0,
							type: NodeConnectionType.Main,
						},
						target: {
							index: 0,
							type: NodeConnectionType.Main,
						},
					},
					id: `[${nodeA.id}/${NodeConnectionType.Main}/0][${nodeB.id}/${NodeConnectionType.Main}/0]`,
					label: '',
					source: nodeA.id,
					sourceHandle: `outputs/${NodeConnectionType.Main}/0`,
					target: nodeB.id,
					targetHandle: `inputs/${NodeConnectionType.Main}/0`,
					type: 'canvas-edge',
				},
			]);
		});

		it('should map multiple input types to canvas connections', () => {
			const nodeA = createTestNode({
				name: 'Node A',
				type: MANUAL_TRIGGER_NODE_TYPE,
			});
			const nodeB = createTestNode({
				name: 'Node B',
				type: SET_NODE_TYPE,
			});
			const workflow = createTestWorkflow({
				name: 'Test Workflow',
				nodes: [nodeA, nodeB],
				connections: {
					'Node A': {
						[NodeConnectionType.AiTool]: [
							[{ node: nodeB.name, type: NodeConnectionType.AiTool, index: 0 }],
						],
						[NodeConnectionType.AiDocument]: [
							[{ node: nodeB.name, type: NodeConnectionType.AiDocument, index: 1 }],
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
						fromNodeName: nodeA.name,
						source: {
							index: 0,
							type: NodeConnectionType.AiTool,
						},
						target: {
							index: 0,
							type: NodeConnectionType.AiTool,
						},
					},
					id: `[${nodeA.id}/${NodeConnectionType.AiTool}/0][${nodeB.id}/${NodeConnectionType.AiTool}/0]`,
					label: '',
					source: nodeA.id,
					sourceHandle: `outputs/${NodeConnectionType.AiTool}/0`,
					target: nodeB.id,
					targetHandle: `inputs/${NodeConnectionType.AiTool}/0`,
					type: 'canvas-edge',
				},
				{
					data: {
						fromNodeName: nodeA.name,
						source: {
							index: 0,
							type: NodeConnectionType.AiDocument,
						},
						target: {
							index: 1,
							type: NodeConnectionType.AiDocument,
						},
					},
					id: `[${nodeA.id}/${NodeConnectionType.AiDocument}/0][${nodeB.id}/${NodeConnectionType.AiDocument}/1]`,
					label: '',
					source: nodeA.id,
					sourceHandle: `outputs/${NodeConnectionType.AiDocument}/0`,
					target: nodeB.id,
					targetHandle: `inputs/${NodeConnectionType.AiDocument}/1`,
					type: 'canvas-edge',
				},
			]);
		});
	});
});
