import { renderComponent } from '@/__tests__/render';
import { mockedStore, type MockedStore } from '@/__tests__/utils';
import TriggerPanel from './TriggerPanel.vue';
import { createTestingPinia } from '@pinia/testing';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import { createTestNode, mockNodeTypeDescription } from '@/__tests__/mocks';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { setActivePinia } from 'pinia';
import { computed, shallowRef } from 'vue';
import { WorkflowIdKey } from '@/app/constants/injectionKeys';
import {
	injectWorkflowDocumentStore,
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';

// Instantiates a store that derives the workflow id from the route. These tests run
// without a router, so resolve the id directly.
vi.mock('@/app/composables/useWorkflowId', async () => {
	const { computed } = await import('vue');
	return {
		useWorkflowId: () => computed(() => ''),
		useRouteWorkflowId: () => computed(() => ''),
	};
});

vi.mock('@/app/stores/workflowDocument.store', async () => {
	const actual = await vi.importActual('@/app/stores/workflowDocument.store');
	return { ...actual, injectWorkflowDocumentStore: vi.fn() };
});

let workflowsStore: MockedStore<typeof useWorkflowsStore>;
let nodeTypesStore: MockedStore<typeof useNodeTypesStore>;
let workflowDocStore: ReturnType<typeof useWorkflowDocumentStore>;

describe('TriggerPanel.vue', () => {
	beforeEach(async () => {
		setActivePinia(createTestingPinia({ stubActions: false }));
		workflowsStore = mockedStore(useWorkflowsStore);
		workflowsStore.setWorkflowId('1');
		const node = createTestNode({ id: '0', name: 'Webhook', type: 'n8n-nodes-base.webhook' });

		workflowDocStore = useWorkflowDocumentStore(
			createWorkflowDocumentId(workflowsStore.workflowId),
		);
		workflowDocStore.setNodes([node]);
		vi.mocked(injectWorkflowDocumentStore).mockReturnValue(shallowRef(workflowDocStore));

		nodeTypesStore = mockedStore(useNodeTypesStore);
		const nodeTypeDescription = mockNodeTypeDescription({
			name: 'n8n-nodes-base.webhook',
			displayName: 'Webhook',
			webhooks: [{ name: 'default', httpMethod: 'POST', path: 'webhook' }],
		});
		nodeTypesStore.getNodeType = vi.fn(() => nodeTypeDescription);
	});

	afterEach(() => {
		vi.clearAllMocks();
		vi.resetAllMocks();
	});

	function setExecutedNode(executedNode: string) {
		// Testing pinia makes store getters writable at runtime; the cast makes
		// that writability visible to the type checker.
		const executionStateStore = mockedStore(
			useWorkflowExecutionStateStore,
			createWorkflowDocumentId('1'),
		) as unknown as { activeExecutionExecutedNode: string | undefined };
		executionStateStore.activeExecutionExecutedNode = executedNode;
	}

	it('renders default state', () => {
		const { getByTestId } = renderComponent(TriggerPanel, {
			props: { nodeName: 'Webhook' },
			global: {
				provide: {
					[WorkflowIdKey as unknown as string]: computed(() => '1'),
				},
			},
		});
		expect(getByTestId('trigger-header')).toBeInTheDocument();
		expect(getByTestId('trigger-header')).toHaveTextContent('Pull in events from Webhook');
		expect(getByTestId('trigger-execute-button')).toBeInTheDocument();
	});

	it('renders listening state for webhook node', () => {
		useWorkflowExecutionStateStore(createWorkflowDocumentId('1')).setExecutionWaitingForWebhook(
			true,
		);
		setExecutedNode('Webhook');
		const { getByTestId } = renderComponent(TriggerPanel, {
			props: { nodeName: 'Webhook' },
			global: {
				provide: {
					[WorkflowIdKey as unknown as string]: computed(() => '1'),
				},
			},
		});
		expect(getByTestId('trigger-listening')).toBeInTheDocument();
	});

	it('does not render listening state for other nodes', () => {
		useWorkflowExecutionStateStore(createWorkflowDocumentId('1')).setExecutionWaitingForWebhook(
			true,
		);
		setExecutedNode('OtherNode');
		const { queryByTestId } = renderComponent(TriggerPanel, {
			props: { nodeName: 'Webhook' },
			global: {
				provide: {
					[WorkflowIdKey as unknown as string]: computed(() => '1'),
				},
			},
		});
		expect(queryByTestId('trigger-listening')).not.toBeInTheDocument();
	});

	it('renders listening state when executedNode is a child of the current node', () => {
		useWorkflowExecutionStateStore(createWorkflowDocumentId('1')).setExecutionWaitingForWebhook(
			true,
		);
		setExecutedNode('ChildNode');
		vi.spyOn(workflowDocStore, 'getParentNodes').mockReturnValue(['Webhook']);
		const { getByTestId } = renderComponent(TriggerPanel, {
			props: { nodeName: 'Webhook' },
			global: {
				provide: {
					[WorkflowIdKey as unknown as string]: computed(() => '1'),
				},
			},
		});
		expect(getByTestId('trigger-listening')).toBeInTheDocument();
	});

	it('does not render listening state when executedNode is not a child or current node', () => {
		useWorkflowExecutionStateStore(createWorkflowDocumentId('1')).setExecutionWaitingForWebhook(
			true,
		);
		setExecutedNode('UnrelatedNode');
		const { queryByTestId } = renderComponent(TriggerPanel, {
			props: { nodeName: 'Webhook' },
			global: {
				provide: {
					[WorkflowIdKey as unknown as string]: computed(() => '1'),
				},
			},
		});
		expect(queryByTestId('trigger-listening')).not.toBeInTheDocument();
	});
});
