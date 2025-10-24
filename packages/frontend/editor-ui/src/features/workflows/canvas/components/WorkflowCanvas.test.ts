import { waitFor } from '@testing-library/vue';
import { createPinia, setActivePinia } from 'pinia';
import WorkflowCanvas from './WorkflowCanvas.vue';
import { createEventBus } from '@n8n/utils/event-bus';
import type { Workflow } from 'n8n-workflow';
import { createComponentRenderer } from '@/__tests__/render';
import { STICKY_NODE_TYPE } from '@/constants';
import { CanvasNodeRenderType } from '../canvas.types';
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
		workflow: createTestWorkflow({
			id: '1',
			name: 'Test Workflow',
			nodes: [],
			connections: {},
		}),
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
		const workflow = createTestWorkflow({
			nodes: [
				createTestNode({ id: '1', name: 'Node 1' }),
				createTestNode({ id: '2', name: 'Node 2' }),
			],
			connections: { 'Node 1': { main: [[{ node: 'Node 2', type: 'main', index: 0 }]] } },
		});
		const { container } = renderComponent({
			props: {
				workflow,
				workflowObject: createTestWorkflowObject(workflow),
			},
		});

		await waitFor(() => expect(container.querySelectorAll('.vue-flow__node')).toHaveLength(2));

		expect(container.querySelector('[data-id="1"]')).toBeInTheDocument();
		expect(container.querySelector('[data-id="2"]')).toBeInTheDocument();
		expect(
			container.querySelector('[data-id="[1/outputs/main/0][2/inputs/main/0]"]'),
		).toBeInTheDocument();
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
