import { waitFor } from '@testing-library/vue';
import { createPinia, setActivePinia } from 'pinia';
import WorkflowCanvas from '@/components/canvas/WorkflowCanvas.vue';
import { createEventBus } from '@n8n/utils/event-bus';
import { createCanvasNodeElement, createCanvasConnection } from '@/__tests__/data';
import type { Workflow } from 'n8n-workflow';
import { createComponentRenderer } from '@/__tests__/render';
import { STICKY_NODE_TYPE } from '@/constants';
import { CanvasNodeRenderType } from '@/types';
import {
	createTestNode,
	createTestWorkflow,
	createTestWorkflowObject,
	defaultNodeDescriptions,
} from '@/__tests__/mocks';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import * as vueuse from '@vueuse/core';

vi.mock('@vueuse/core', async () => {
	const actual = await vi.importActual('@vueuse/core');
	return {
		...actual,
		throttledRef: vi.fn(actual.throttledRef as typeof vueuse.throttledRef),
	};
});

const renderComponent = createComponentRenderer(WorkflowCanvas, {
	props: {
		id: 'canvas',
		workflow: {
			id: '1',
			name: 'Test Workflow',
			nodes: [],
			connections: [],
		},
		workflowObject: {} as Workflow,
		eventBus: createEventBus(),
	},
});

beforeEach(() => {
	const pinia = createPinia();
	setActivePinia(pinia);

	const nodeTypesStore = useNodeTypesStore();
	nodeTypesStore.setNodeTypes(defaultNodeDescriptions);
});

afterEach(() => {
	vi.clearAllMocks();
});

describe('WorkflowCanvas', () => {
	it('should initialize with default props', () => {
		const { getByTestId } = renderComponent();

		expect(getByTestId('canvas')).toBeVisible();
	});

	it('should render nodes and connections', async () => {
		const nodes = [
			createCanvasNodeElement({ id: '1', label: 'Node 1' }),
			createCanvasNodeElement({ id: '2', label: 'Node 2' }),
		];
		const connections = [createCanvasConnection(nodes[0], nodes[1])];

		const { container } = renderComponent({
			props: {
				nodes,
				connections,
			},
		});

		await waitFor(() => expect(container.querySelectorAll('.vue-flow__node')).toHaveLength(2));

		expect(container.querySelector(`[data-id="${nodes[0].id}"]`)).toBeInTheDocument();
		expect(container.querySelector(`[data-id="${nodes[1].id}"]`)).toBeInTheDocument();
		expect(container.querySelector(`[data-id="${connections[0].id}"]`)).toBeInTheDocument();
	});

	it('should handle empty nodes and connections gracefully', async () => {
		const { container } = renderComponent();

		await waitFor(() => expect(container.querySelectorAll('.vue-flow__node')).toHaveLength(0));
		expect(container.querySelectorAll('.vue-flow__connection')).toHaveLength(0);
	});

	it('should render fallback nodes when sticky nodes are present', async () => {
		const stickyNodes = [createTestNode({ id: '2', name: 'Sticky Node', type: STICKY_NODE_TYPE })];
		const fallbackNodes = [
			createTestNode({
				id: CanvasNodeRenderType.AddNodes,
				type: CanvasNodeRenderType.AddNodes,
				name: CanvasNodeRenderType.AddNodes,
			}),
		];

		const workflow = createTestWorkflow({
			id: '1',
			name: 'Test Workflow',
			nodes: [...stickyNodes],
			connections: {},
		});

		const workflowObject = createTestWorkflowObject(workflow);

		const { container } = renderComponent({
			props: {
				workflow,
				workflowObject,
				fallbackNodes,
				showFallbackNodes: true,
			},
		});

		await waitFor(() => expect(container.querySelectorAll('.vue-flow__node')).toHaveLength(2));

		expect(container.querySelector(`[data-id="${stickyNodes[0].id}"]`)).toBeInTheDocument();
		expect(container.querySelector(`[data-id="${fallbackNodes[0].id}"]`)).toBeInTheDocument();
	});

	it('should not render fallback nodes when showFallbackNodes is false', async () => {
		const nodes = [createTestNode({ id: '1', name: 'Non-Sticky Node 1' })];
		const fallbackNodes = [
			createTestNode({
				id: CanvasNodeRenderType.AddNodes,
				type: CanvasNodeRenderType.AddNodes,
				name: CanvasNodeRenderType.AddNodes,
			}),
		];

		const workflow = createTestWorkflow({
			id: '1',
			name: 'Test Workflow',
			nodes,
			connections: {},
		});

		const workflowObject = createTestWorkflowObject(workflow);

		const { container } = renderComponent({
			props: {
				workflow,
				workflowObject,
				fallbackNodes,
				showFallbackNodes: false,
			},
		});

		await waitFor(() => expect(container.querySelectorAll('.vue-flow__node')).toHaveLength(1));

		expect(container.querySelector(`[data-id="${nodes[0].id}"]`)).toBeInTheDocument();
		expect(container.querySelector(`[data-id="${fallbackNodes[0].id}"]`)).not.toBeInTheDocument();
	});

	describe('debouncing behavior', () => {
		it('should configure debouncing with delay when executing', async () => {
			renderComponent({
				props: {
					executing: true,
				},
			});

			expect(vueuse.throttledRef).toHaveBeenCalledTimes(2);

			// Find calls related to our specific debouncing logic
			const calls = vi.mocked(vueuse.throttledRef).mock.calls;
			const executingCalls = calls.filter((call) => call[1] === 200);

			expect(executingCalls.length).toBeGreaterThanOrEqual(2);
			expect(executingCalls[0][1]).toBe(200);
		});
	});
});
