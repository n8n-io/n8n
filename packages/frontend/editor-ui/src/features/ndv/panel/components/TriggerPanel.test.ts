import { renderComponent } from '@/__tests__/render';
import { mockedStore, type MockedStore } from '@/__tests__/utils';
import TriggerPanel from './TriggerPanel.vue';
import { createTestingPinia } from '@pinia/testing';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import {
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';
import { WorkflowDocumentStoreKey } from '@/app/constants/injectionKeys';
import { createTestNode, mockNodeTypeDescription } from '@/__tests__/mocks';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { setActivePinia } from 'pinia';
import { shallowRef } from 'vue';

let workflowsStore: MockedStore<typeof useWorkflowsStore>;
let nodeTypesStore: MockedStore<typeof useNodeTypesStore>;
let workflowDocumentStoreRef: ReturnType<
	typeof shallowRef<ReturnType<typeof useWorkflowDocumentStore> | null>
>;

describe('TriggerPanel.vue', () => {
	beforeEach(async () => {
		setActivePinia(createTestingPinia());
		workflowsStore = mockedStore(useWorkflowsStore);
		workflowsStore.workflowName = 'Test Workflow';
		workflowsStore.workflowId = '1';
		const node = createTestNode({ id: '0', name: 'Webhook', type: 'n8n-nodes-base.webhook' });
		workflowsStore.getNodeByName.mockReturnValue(node);
		workflowsStore.workflow.nodes = [node];

		const documentStore = useWorkflowDocumentStore(createWorkflowDocumentId('1'));
		vi.mocked(documentStore.findNodeByName).mockImplementation((name: string) =>
			workflowsStore.getNodeByName(name),
		);
		workflowDocumentStoreRef = shallowRef(documentStore);

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
	});

	it('renders default state', () => {
		const { getByTestId } = renderComponent(TriggerPanel, {
			props: { nodeName: 'Webhook' },
			global: { provide: { [WorkflowDocumentStoreKey as symbol]: workflowDocumentStoreRef } },
		});
		expect(getByTestId('trigger-header')).toBeInTheDocument();
		expect(getByTestId('trigger-header')).toHaveTextContent('Pull in events from Webhook');
		expect(getByTestId('trigger-execute-button')).toBeInTheDocument();
	});

	it('renders listening state for webhook node', () => {
		workflowsStore.executionWaitingForWebhook = true;
		workflowsStore.executedNode = 'Webhook';
		const { getByTestId } = renderComponent(TriggerPanel, {
			props: { nodeName: 'Webhook' },
			global: { provide: { [WorkflowDocumentStoreKey as symbol]: workflowDocumentStoreRef } },
		});
		expect(getByTestId('trigger-listening')).toBeInTheDocument();
	});

	it('does not render listening state for other nodes', () => {
		workflowsStore.executionWaitingForWebhook = true;
		workflowsStore.executedNode = 'OtherNode';
		const { queryByTestId } = renderComponent(TriggerPanel, {
			props: { nodeName: 'Webhook' },
			global: { provide: { [WorkflowDocumentStoreKey as symbol]: workflowDocumentStoreRef } },
		});
		expect(queryByTestId('trigger-listening')).not.toBeInTheDocument();
	});

	it('renders listening state when executedNode is a child of the current node', () => {
		workflowsStore.executionWaitingForWebhook = true;
		workflowsStore.executedNode = 'ChildNode';
		workflowsStore.workflowObject.getParentNodes = vi.fn(() => ['Webhook']);
		const { getByTestId } = renderComponent(TriggerPanel, {
			props: { nodeName: 'Webhook' },
			global: { provide: { [WorkflowDocumentStoreKey as symbol]: workflowDocumentStoreRef } },
		});
		expect(getByTestId('trigger-listening')).toBeInTheDocument();
	});

	it('does not render listening state when executedNode is not a child or current node', () => {
		workflowsStore.executionWaitingForWebhook = true;
		workflowsStore.executedNode = 'UnrelatedNode';
		workflowsStore.workflowObject.getParentNodes = vi.fn(() => []);
		const { queryByTestId } = renderComponent(TriggerPanel, {
			props: { nodeName: 'Webhook' },
			global: { provide: { [WorkflowDocumentStoreKey as symbol]: workflowDocumentStoreRef } },
		});
		expect(queryByTestId('trigger-listening')).not.toBeInTheDocument();
	});
});
