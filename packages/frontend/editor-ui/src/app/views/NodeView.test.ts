import { createTestNode, mockNodeTypeDescription } from '@/__tests__/mocks';
import { waitFor } from '@testing-library/vue';
import { EVALUATION_TRIGGER_NODE_TYPE, MANUAL_TRIGGER_NODE_TYPE } from 'n8n-workflow';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '../stores/workflowDocument.store';
import { createPinia, setActivePinia } from 'pinia';
import { useWorkflowsStore } from '../stores/workflows.store';
import { useWorkflowExecutionStateStore } from '../stores/workflowExecutionState.store';
import { useNodeTypesStore } from '../stores/nodeTypes.store';
import { renderComponent } from '@/__tests__/render';
import NodeView from './NodeView.vue';
import { WorkflowIdKey, WorkflowDocumentStoreKey } from '../constants/injectionKeys';
import { computed, defineComponent, shallowRef } from 'vue';

const routerMock = vi.hoisted(() => ({
	push: vi.fn(),
	replace: vi.fn(),
	resolve: vi.fn().mockReturnValue({ href: '' }),
}));

const routeMock = vi.hoisted(() => ({
	params: {},
	query: {} as Record<string, string>,
}));

vi.mock('vue-router', () => ({
	useRouter: () => routerMock,
	useRoute: () => routeMock,
	RouterLink: {
		template: '<a><slot /></a>',
	},
	onBeforeRouteLeave: vi.fn(),
}));

describe('NodeView', () => {
	let workflowsStore: ReturnType<typeof useWorkflowsStore>;
	let workflowDocumentStore: ReturnType<typeof useWorkflowDocumentStore>;
	let ensureNodesAreVisible: ReturnType<typeof vi.fn>;
	let workflowExecutionState: ReturnType<typeof useWorkflowExecutionStateStore>;

	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
		vi.stubGlobal('localStorage', {
			getItem: vi.fn().mockReturnValue(null),
		});
		routeMock.params = {};
		routeMock.query = {};
		ensureNodesAreVisible = vi.fn();
		workflowsStore = useWorkflowsStore();
		workflowsStore.setWorkflowId('w0');
		workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId('w0'));
		workflowExecutionState = useWorkflowExecutionStateStore(createWorkflowDocumentId('w0'));
	});

	function renderNodeView() {
		const workflowDocStore = useWorkflowDocumentStore(
			createWorkflowDocumentId(workflowDocumentStore.workflowId),
		);

		return renderComponent(NodeView, {
			global: {
				provide: {
					[WorkflowIdKey as symbol]: computed(() => workflowDocumentStore.workflowId),
					[WorkflowDocumentStoreKey as symbol]: shallowRef(workflowDocStore),
				},
				stubs: {
					WorkflowCanvas: defineComponent({
						setup(_, { expose }) {
							expose({ ensureNodesAreVisible });
						},
						template: '<div />',
					}),
				},
			},
		});
	}

	describe('Trigger node selection', () => {
		const n0 = createTestNode({ type: MANUAL_TRIGGER_NODE_TYPE, name: 'n0' });
		const n1 = createTestNode({ type: MANUAL_TRIGGER_NODE_TYPE, name: 'n1' });
		const n2 = createTestNode({ type: MANUAL_TRIGGER_NODE_TYPE, name: 'n2' });

		beforeEach(() => {
			workflowDocumentStore.setNodes([n0, n1]);

			const nodeTypesStore = useNodeTypesStore();
			nodeTypesStore.setNodeTypes([
				mockNodeTypeDescription({
					name: MANUAL_TRIGGER_NODE_TYPE,
					group: ['trigger'],
				}),
			]);
		});

		it('should select newly added trigger node automatically', async () => {
			renderNodeView();
			await waitFor(() => expect(workflowExecutionState.selectedTriggerNodeName).toBe('n0'));
			workflowDocumentStore.addNode(n2);
			await waitFor(() => expect(workflowExecutionState.selectedTriggerNodeName).toBe('n2'));
		});

		it('should re-select a trigger when selected trigger gets disabled or removed', async () => {
			renderNodeView();
			await waitFor(() => expect(workflowExecutionState.selectedTriggerNodeName).toBe('n0'));
			useWorkflowDocumentStore(
				createWorkflowDocumentId(workflowDocumentStore.workflowId),
			).removeNode(n0);
			await waitFor(() => expect(workflowExecutionState.selectedTriggerNodeName).toBe('n1'));
			useWorkflowDocumentStore(
				createWorkflowDocumentId(workflowDocumentStore.workflowId),
			).setNodeValue({
				name: 'n1',
				key: 'disabled',
				value: true,
			});
			await waitFor(() => expect(workflowExecutionState.selectedTriggerNodeName).toBe(undefined));
		});
	});

	describe('Evaluation trigger route action', () => {
		beforeEach(() => {
			const nodeTypesStore = useNodeTypesStore();
			nodeTypesStore.setNodeTypes([
				mockNodeTypeDescription({
					name: EVALUATION_TRIGGER_NODE_TYPE,
					group: ['trigger'],
				}),
			]);
		});

		it('should add the evaluation trigger node and show it on the canvas', async () => {
			routeMock.query = { action: 'addEvaluationTrigger' };

			renderNodeView();

			await waitFor(() => {
				const evaluationTrigger = workflowDocumentStore.allNodes.find(
					(node) => node.type === EVALUATION_TRIGGER_NODE_TYPE,
				);

				expect(evaluationTrigger).toBeDefined();
				expect(ensureNodesAreVisible).toHaveBeenCalledWith([evaluationTrigger?.id]);
			});

			expect(routerMock.replace).toHaveBeenCalledWith({
				query: { action: undefined },
			});
		});

		it('should open the existing evaluation trigger instead of adding another one', async () => {
			const existingEvaluationTrigger = createTestNode({
				type: EVALUATION_TRIGGER_NODE_TYPE,
				name: 'Evaluation',
			});
			workflowDocumentStore.setNodes([existingEvaluationTrigger]);
			routeMock.query = { action: 'addEvaluationTrigger' };

			renderNodeView();

			await waitFor(() => {
				expect(ensureNodesAreVisible).toHaveBeenCalledWith([existingEvaluationTrigger.id]);
			});

			expect(
				workflowDocumentStore.allNodes.filter((node) => node.type === EVALUATION_TRIGGER_NODE_TYPE),
			).toHaveLength(1);
		});
	});
});
