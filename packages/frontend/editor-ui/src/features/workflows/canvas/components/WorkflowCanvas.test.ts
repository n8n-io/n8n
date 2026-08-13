import { screen, waitFor } from '@testing-library/vue';
import { createPinia, setActivePinia } from 'pinia';
import WorkflowCanvas from './WorkflowCanvas.vue';
import { createEventBus } from '@n8n/utils/event-bus';
import { createComponentRenderer } from '@/__tests__/render';
import { STICKY_NODE_TYPE } from '@/app/constants';
import { CANVAS_NODE_GROUP_ID_PREFIX, CanvasNodeRenderType } from '../canvas.types';
import { createTestNode, createTestWorkflow, defaultNodeDescriptions } from '@/__tests__/mocks';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import {
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';
import type { IWorkflowDb } from '@/Interface';
import * as vueuse from '@vueuse/core';
import { useWorkflowGenerativeUiStore } from '@/experiments/workflowGenerativeUi/workflowGenerativeUi.store';

// Instantiates a store that derives the workflow id from the route. These tests run
// without a router, so resolve the id directly.
vi.mock('@/app/composables/useWorkflowId', async () => {
	const { computed } = await import('vue');
	return {
		useWorkflowId: () => computed(() => ''),
		useRouteWorkflowId: () => computed(() => ''),
	};
});

vi.mock('@vueuse/core', async () => {
	const actual = await vi.importActual('@vueuse/core');
	return {
		...actual,
		throttledRef: vi.fn(actual.throttledRef as typeof vueuse.throttledRef),
	};
});

function setupWorkflow(workflow: IWorkflowDb) {
	useWorkflowsStore().workflowId = workflow.id;
	const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId(workflow.id));
	workflowDocumentStore.hydrate(workflow);
}

const renderComponent = createComponentRenderer(WorkflowCanvas, {
	props: {
		id: 'canvas',
		eventBus: createEventBus(),
	},
});

beforeEach(() => {
	const pinia = createPinia();
	setActivePinia(pinia);

	const nodeTypesStore = useNodeTypesStore();
	nodeTypesStore.setNodeTypes(defaultNodeDescriptions);

	setupWorkflow(
		createTestWorkflow({
			id: '1',
			name: 'Test Workflow',
			nodes: [],
			connections: {},
		}),
	);
});

afterEach(() => {
	vi.clearAllMocks();
	vi.unstubAllGlobals();
});

describe('WorkflowCanvas', () => {
	it('should initialize with default props', () => {
		const { getByTestId } = renderComponent();

		expect(getByTestId('canvas')).toBeVisible();
	});

	it('keeps Vue Flow mounted and hidden when a generated view is selected', async () => {
		const { container, getByTestId } = renderComponent();
		await waitFor(() =>
			expect(container.querySelector('[data-testid="generative-ui-picker"]')).toBeInTheDocument(),
		);
		const store = useWorkflowGenerativeUiStore();

		await store.setView('story');

		await waitFor(() => expect(getByTestId('canvas')).not.toBeVisible());
		expect(getByTestId('canvas')).toBeInTheDocument();
	});

	it('removes the previous spec when the workflow hash changes', async () => {
		const workflow = createTestWorkflow({
			id: '1',
			name: 'First Workflow',
			nodes: [createTestNode({ id: '1', name: 'Node 1' })],
			connections: {},
		});
		setupWorkflow(workflow);
		const firstSpec = {
			root: 'screen',
			elements: {
				screen: {
					type: 'Screen',
					props: { title: 'First Workflow' },
					children: ['text'],
				},
				text: {
					type: 'Text',
					props: { text: 'Previous workflow spec' },
					children: [],
				},
			},
		};
		const pendingResponse = new Promise<Response>(() => {});
		vi.stubGlobal(
			'fetch',
			vi
				.fn()
				.mockResolvedValueOnce(
					new Response(
						JSON.stringify({
							content: [{ type: 'text', text: JSON.stringify(firstSpec) }],
						}),
						{ status: 200 },
					),
				)
				.mockReturnValueOnce(pendingResponse),
		);
		const { container } = renderComponent();
		await waitFor(() =>
			expect(container.querySelector('[data-testid="generative-ui-picker"]')).toBeInTheDocument(),
		);
		const store = useWorkflowGenerativeUiStore();
		store.apiKey = 'test-key';

		await store.setView('story');
		expect(await screen.findByText('Previous workflow spec')).toBeInTheDocument();

		useWorkflowDocumentStore(createWorkflowDocumentId(workflow.id)).setName('Second Workflow');

		await waitFor(() => expect(store.activeSpec).toBeUndefined());
		expect(screen.queryByText('Previous workflow spec')).not.toBeInTheDocument();
	});

	it('should render nodes and connections', async () => {
		const workflow = createTestWorkflow({
			nodes: [
				createTestNode({ id: '1', name: 'Node 1' }),
				createTestNode({ id: '2', name: 'Node 2' }),
			],
			connections: { 'Node 1': { main: [[{ node: 'Node 2', type: 'main', index: 0 }]] } },
		});
		setupWorkflow(workflow);

		const { container } = renderComponent();

		await waitFor(() => expect(container.querySelectorAll('.vue-flow__node')).toHaveLength(2));

		expect(container.querySelector('[data-id="1"]')).toBeInTheDocument();
		expect(container.querySelector('[data-id="2"]')).toBeInTheDocument();
		expect(
			container.querySelector('[data-id="[1/outputs/main/0][2/inputs/main/0]"]'),
		).toBeInTheDocument();
	});

	it('should render workflow node groups from the workflow document store collapsed by default', async () => {
		const workflow = createTestWorkflow({
			nodes: [createTestNode({ id: '1', name: 'Node 1' })],
			connections: {},
			nodeGroups: [{ id: 'g1', name: 'Group 1', nodeIds: ['1'] }],
		});
		setupWorkflow(workflow);

		const { container } = renderComponent();

		await waitFor(() => expect(container.querySelectorAll('.vue-flow__node')).toHaveLength(1));

		expect(
			container.querySelector(`[data-id="${CANVAS_NODE_GROUP_ID_PREFIX}g1"]`),
		).toBeInTheDocument();
		expect(container.querySelector('[data-id="1"]')).not.toBeInTheDocument();
	});

	it('expands every group when groupExpansionMode is "all"', async () => {
		const workflow = createTestWorkflow({
			nodes: [createTestNode({ id: '1', name: 'Node 1' })],
			connections: {},
			nodeGroups: [{ id: 'g1', name: 'Group 1', nodeIds: ['1'] }],
		});
		setupWorkflow(workflow);

		const { container } = renderComponent({ props: { groupExpansionMode: 'all' } });

		// An expanded group renders its member node; a collapsed one hides it.
		await waitFor(() => expect(container.querySelector('[data-id="1"]')).toBeInTheDocument());
	});

	it('keeps groups without an errored node collapsed when groupExpansionMode is "errored"', async () => {
		const workflow = createTestWorkflow({
			nodes: [createTestNode({ id: '1', name: 'Node 1' })],
			connections: {},
			nodeGroups: [{ id: 'g1', name: 'Group 1', nodeIds: ['1'] }],
		});
		setupWorkflow(workflow);

		const { container } = renderComponent({ props: { groupExpansionMode: 'errored' } });

		await waitFor(() =>
			expect(
				container.querySelector(`[data-id="${CANVAS_NODE_GROUP_ID_PREFIX}g1"]`),
			).toBeInTheDocument(),
		);
		expect(container.querySelector('[data-id="1"]')).not.toBeInTheDocument();
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
		setupWorkflow(workflow);

		const { container } = renderComponent({
			props: {
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
		setupWorkflow(workflow);

		const { container } = renderComponent({
			props: {
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
