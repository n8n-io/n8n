import { createTestNode, mockNodeTypeDescription } from '@/__tests__/mocks';
import { waitFor } from '@testing-library/vue';
import { MANUAL_TRIGGER_NODE_TYPE } from 'n8n-workflow';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '../stores/workflowDocument.store';
import { createPinia, setActivePinia } from 'pinia';
import { useWorkflowsStore } from '../stores/workflows.store';
import { useNodeTypesStore } from '../stores/nodeTypes.store';
import { renderComponent } from '@/__tests__/render';
import NodeView from './NodeView.vue';
import { WorkflowIdKey, WorkflowDocumentStoreKey } from '../constants/injectionKeys';
import { computed, shallowRef } from 'vue';

vi.mock('vue-router', () => ({
	useRouter: () => ({
		push: vi.fn(),
		resolve: vi.fn().mockReturnValue({ href: '' }),
	}),
	useRoute: () => ({
		params: {},
		query: {},
	}),
	RouterLink: {
		template: '<a><slot /></a>',
	},
	onBeforeRouteLeave: vi.fn(),
}));

describe('NodeView', () => {
	let workflowsStore: ReturnType<typeof useWorkflowsStore>;
	let workflowDocumentStore: ReturnType<typeof useWorkflowDocumentStore>;

	beforeEach(() => {
		setActivePinia(createPinia());
		workflowsStore = useWorkflowsStore();
		workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId('w0'));
	});

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
						WorkflowCanvas: { template: '<div />' },
					},
				},
			});
		}

		it('should select newly added trigger node automatically', async () => {
			renderNodeView();
			await waitFor(() => expect(workflowsStore.selectedTriggerNodeName).toBe('n0'));
			workflowDocumentStore.addNode(n2);
			await waitFor(() => expect(workflowsStore.selectedTriggerNodeName).toBe('n2'));
		});

		it('should re-select a trigger when selected trigger gets disabled or removed', async () => {
			renderNodeView();
			await waitFor(() => expect(workflowsStore.selectedTriggerNodeName).toBe('n0'));
			useWorkflowDocumentStore(
				createWorkflowDocumentId(workflowDocumentStore.workflowId),
			).removeNode(n0);
			await waitFor(() => expect(workflowsStore.selectedTriggerNodeName).toBe('n1'));
			useWorkflowDocumentStore(
				createWorkflowDocumentId(workflowDocumentStore.workflowId),
			).setNodeValue({
				name: 'n1',
				key: 'disabled',
				value: true,
			});
			await waitFor(() => expect(workflowsStore.selectedTriggerNodeName).toBe(undefined));
		});
	});
});
