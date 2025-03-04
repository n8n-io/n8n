import { reactive } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { useRouter } from 'vue-router';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import { type MockedStore, mockedStore } from '@/__tests__/utils';
import { mockNode, mockNodeTypeDescription } from '@/__tests__/mocks';
import { nodeViewEventBus } from '@/event-bus';
import { CHAT_TRIGGER_NODE_TYPE, SET_NODE_TYPE } from '@/constants';
import NodeExecuteButton from '@/components/NodeExecuteButton.vue';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useUIStore } from '@/stores/ui.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useNDVStore } from '@/stores/ndv.store';
import { useExecutionsStore } from '@/stores/executions.store';
import { useRunWorkflow } from '@/composables/useRunWorkflow';
import { useExternalHooks } from '@/composables/useExternalHooks';

vi.mock('vue-router', () => ({
	useRouter: () => ({}),
	useRoute: () => reactive({}),
	RouterLink: vi.fn(),
}));

vi.mock('@/composables/useRunWorkflow', () => ({
	useRunWorkflow: () => ({
		runWorkflow: vi.fn(),
		stopCurrentExecution: vi.fn(),
	}),
}));

vi.mock('@/composables/useExternalHooks', () => ({
	useExternalHooks: () => ({
		run: vi.fn(),
	}),
}));

let renderComponent: ReturnType<typeof createComponentRenderer>;
let workflowsStore: MockedStore<typeof useWorkflowsStore>;
let uiStore: MockedStore<typeof useUIStore>;
let nodeTypesStore: MockedStore<typeof useNodeTypesStore>;
let ndvStore: MockedStore<typeof useNDVStore>;
let executionsStore: MockedStore<typeof useExecutionsStore>;

let runWorkflow: ReturnType<typeof useRunWorkflow>;
let externalHooks: ReturnType<typeof useExternalHooks>;

const nodeViewEventBusEmitSpy = vi.spyOn(nodeViewEventBus, 'emit');

describe('NodeExecuteButton', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		renderComponent = createComponentRenderer(NodeExecuteButton, {
			pinia: createTestingPinia(),
			props: {
				nodeName: 'test-node',
				telemetrySource: 'test-source',
			},
		});

		workflowsStore = mockedStore(useWorkflowsStore);
		uiStore = mockedStore(useUIStore);
		nodeTypesStore = mockedStore(useNodeTypesStore);
		ndvStore = mockedStore(useNDVStore);
		executionsStore = mockedStore(useExecutionsStore);

		runWorkflow = useRunWorkflow({ router: useRouter() });
		externalHooks = useExternalHooks();

		workflowsStore.workflowId = 'abc123';
	});

	it('renders without error', () => {
		expect(() => renderComponent()).not.toThrow();
	});

	it('should be disabled if the node is disabled and show tooltip', async () => {
		workflowsStore.getNodeByName.mockReturnValue(
			mockNode({ name: 'test', type: SET_NODE_TYPE, disabled: true }),
		);

		const { getByRole, queryByRole } = renderComponent();

		const button = getByRole('button');
		expect(button).toBeDisabled();
		expect(queryByRole('tooltip')).not.toBeInTheDocument();

		await userEvent.hover(button);
		expect(getByRole('tooltip')).toBeVisible();
		expect(getByRole('tooltip')).toHaveTextContent('Enable node to execute');
	});

	it('should be disabled when workflow is running but node is not executing', async () => {
		uiStore.isActionActive.workflowRunning = true;
		workflowsStore.isNodeExecuting.mockReturnValue(false);
		workflowsStore.getNodeByName.mockReturnValue(
			mockNode({ name: 'test-node', type: SET_NODE_TYPE }),
		);

		const { getByRole, queryByRole } = renderComponent();

		const button = getByRole('button');
		expect(button).toBeDisabled();
		expect(queryByRole('tooltip')).not.toBeInTheDocument();

		await userEvent.hover(button);
		expect(getByRole('tooltip')).toBeVisible();
		expect(getByRole('tooltip')).toHaveTextContent('Workflow is already running');
	});

	it('disables button when trigger node has issues', async () => {
		nodeTypesStore.isTriggerNode = () => true;
		workflowsStore.getNodeByName.mockReturnValue(
			mockNode({
				name: 'test',
				type: SET_NODE_TYPE,
				issues: {
					typeUnknown: true,
				},
			}),
		);

		const { getByRole } = renderComponent();

		expect(getByRole('button')).toBeDisabled();
	});

	it('stops webhook when clicking button while listening for events', async () => {
		workflowsStore.executionWaitingForWebhook = true;
		nodeTypesStore.isTriggerNode = () => true;
		workflowsStore.getNodeByName.mockReturnValue(
			mockNode({ name: 'test-node', type: SET_NODE_TYPE }),
		);

		const { getByRole } = renderComponent();

		await userEvent.click(getByRole('button'));

		expect(workflowsStore.removeTestWebhook).toHaveBeenCalledWith('abc123');
	});

	it('stops execution when clicking button while workflow is running', async () => {
		uiStore.isActionActive.workflowRunning = true;
		nodeTypesStore.isTriggerNode = () => true;
		workflowsStore.activeExecutionId = 'test-execution-id';
		workflowsStore.isNodeExecuting.mockReturnValue(true);
		workflowsStore.getNodeByName.mockReturnValue(
			mockNode({ name: 'test-node', type: SET_NODE_TYPE }),
		);

		const { getByRole, emitted } = renderComponent();

		await userEvent.click(getByRole('button'));

		expect(executionsStore.stopCurrentExecution).toHaveBeenCalledWith('test-execution-id');
		expect(emitted().stopExecution).toBeTruthy();
	});

	it('runs workflow when clicking button normally', async () => {
		workflowsStore.getNodeByName.mockReturnValue(
			mockNode({ name: 'test-node', type: SET_NODE_TYPE }),
		);
		nodeTypesStore.getNodeType = () => mockNodeTypeDescription();

		const { getByRole, emitted } = renderComponent();

		await userEvent.click(getByRole('button'));

		expect(externalHooks.run).toHaveBeenCalledWith('nodeExecuteButton.onClick', expect.any(Object));
		expect(runWorkflow.runWorkflow).toHaveBeenCalledWith({
			destinationNode: 'test-node',
			source: 'RunData.ExecuteNodeButton',
		});
		expect(emitted().execute).toBeTruthy();
	});

	it('opens chat when clicking button for chat node', async () => {
		workflowsStore.getNodeByName.mockReturnValue(
			mockNode({ name: 'test-node', type: SET_NODE_TYPE }),
		);
		nodeTypesStore.getNodeType = () => mockNodeTypeDescription({ name: CHAT_TRIGGER_NODE_TYPE });

		const { getByRole } = renderComponent();

		await userEvent.click(getByRole('button'));

		expect(ndvStore.setActiveNodeName).toHaveBeenCalledWith(null);
		expect(workflowsStore.chatPartialExecutionDestinationNode).toBe('test-node');
		expect(nodeViewEventBusEmitSpy).toHaveBeenCalledWith('openChat');
	});

	it('opens chat when clicking button for chat child node', async () => {
		workflowsStore.getNodeByName.mockReturnValue(
			mockNode({ name: 'test-node', type: SET_NODE_TYPE }),
		);
		workflowsStore.checkIfNodeHasChatParent.mockReturnValue(true);

		const { getByRole } = renderComponent();

		await userEvent.click(getByRole('button'));

		expect(ndvStore.setActiveNodeName).toHaveBeenCalledWith(null);
		expect(workflowsStore.chatPartialExecutionDestinationNode).toBe('test-node');
		expect(nodeViewEventBusEmitSpy).toHaveBeenCalledWith('openChat');
	});
});
