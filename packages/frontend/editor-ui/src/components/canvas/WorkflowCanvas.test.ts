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
import * as lodash from 'lodash-es';

vi.mock('lodash-es', async () => {
	const actual = await vi.importActual('lodash-es');
	return {
		...actual,
		debounce: vi.fn((fn) => {
			// Return a function that immediately calls the provided function
			return (...args: unknown[]) => fn(...args);
		}),
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
		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should initialize debounced watchers on component mount', async () => {
			renderComponent();

			expect(lodash.debounce).toHaveBeenCalledTimes(3);
		});

		it('should configure debouncing with no delay when not executing', async () => {
			renderComponent({
				props: {
					executing: false,
				},
			});

			expect(lodash.debounce).toHaveBeenCalledTimes(3);

			// Find calls related to our specific debouncing logic
			const calls = vi.mocked(lodash.debounce).mock.calls;
			const nonExecutingCalls = calls.filter((call) => call[1] === 0 && call[2]?.maxWait === 0);

			expect(nonExecutingCalls.length).toBeGreaterThanOrEqual(2);
			expect(nonExecutingCalls[0][1]).toBe(0);
			expect(nonExecutingCalls[0][2]).toEqual({ maxWait: 0 });
		});

		it('should configure debouncing with delay when executing', async () => {
			renderComponent({
				props: {
					executing: true,
				},
			});

			expect(lodash.debounce).toHaveBeenCalledTimes(3);

			// Find calls related to our specific debouncing logic
			const calls = vi.mocked(lodash.debounce).mock.calls;
			const executingCalls = calls.filter((call) => call[1] === 200 && call[2]?.maxWait === 50);

			expect(executingCalls.length).toBeGreaterThanOrEqual(2);
			expect(executingCalls[0][1]).toBe(200);
			expect(executingCalls[0][2]).toEqual({ maxWait: 50 });
		});
	});
});
