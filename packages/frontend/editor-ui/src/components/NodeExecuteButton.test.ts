import { reactive } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { useRouter } from 'vue-router';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import { type MockedStore, mockedStore } from '@/__tests__/utils';
import { mockNode, mockNodeTypeDescription } from '@/__tests__/mocks';
import { nodeViewEventBus } from '@/event-bus';
import { AI_TRANSFORM_NODE_TYPE, AI_TRANSFORM_CODE_GENERATED_FOR_PROMPT } from 'n8n-workflow';
import {
	CHAT_TRIGGER_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	SET_NODE_TYPE,
	WEBHOOK_NODE_TYPE,
} from '@/constants';
import NodeExecuteButton from '@/components/NodeExecuteButton.vue';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useNDVStore } from '@/stores/ndv.store';
import { useRunWorkflow } from '@/composables/useRunWorkflow';
import { useExternalHooks } from '@/composables/useExternalHooks';
import { usePinnedData } from '@/composables/usePinnedData';
import { useMessage } from '@/composables/useMessage';
import { useToast } from '@/composables/useToast';
import * as buttonParameterUtils from '@/components/ButtonParameter/utils';

vi.mock('vue-router', () => ({
	useRouter: () => ({}),
	useRoute: () => reactive({}),
	RouterLink: vi.fn(),
}));

vi.mock('@/composables/useToast', () => {
	const showError = vi.fn();
	const showMessage = vi.fn();
	return {
		useToast: () => ({
			showError,
			showMessage,
		}),
	};
});

vi.mock('@/composables/useRunWorkflow', () => {
	const runWorkflow = vi.fn();
	const stopCurrentExecution = vi.fn();
	return {
		useRunWorkflow: () => ({
			runWorkflow,
			stopCurrentExecution,
		}),
	};
});

vi.mock('@/composables/useExternalHooks', () => {
	const run = vi.fn();
	return {
		useExternalHooks: () => ({
			run,
		}),
	};
});

vi.mock('@/composables/usePinnedData', () => {
	const hasData = {};
	const unsetData = vi.fn();
	return {
		usePinnedData: () => ({
			hasData,
			unsetData,
		}),
	};
});

vi.mock('@/composables/useMessage', () => {
	const confirm = vi.fn(async () => 'confirm');
	return {
		useMessage: () => ({
			confirm,
		}),
	};
});

let renderComponent: ReturnType<typeof createComponentRenderer>;
let workflowsStore: MockedStore<typeof useWorkflowsStore>;
let nodeTypesStore: MockedStore<typeof useNodeTypesStore>;
let ndvStore: MockedStore<typeof useNDVStore>;

let runWorkflow: ReturnType<typeof useRunWorkflow>;
let externalHooks: ReturnType<typeof useExternalHooks>;
let pinnedData: ReturnType<typeof usePinnedData>;
let message: ReturnType<typeof useMessage>;
let toast: ReturnType<typeof useToast>;

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
		nodeTypesStore = mockedStore(useNodeTypesStore);
		ndvStore = mockedStore(useNDVStore);

		runWorkflow = useRunWorkflow({ router: useRouter() });
		externalHooks = useExternalHooks();
		message = useMessage();
		toast = useToast();

		workflowsStore.workflowId = 'abc123';
	});

	it('renders without error', () => {
		expect(() => renderComponent()).not.toThrow();
	});

	it('displays correct button label for regular node', () => {
		const { getByRole } = renderComponent();
		expect(getByRole('button').textContent).toBe('Execute step');
	});

	it('displays correct button label for webhook node', () => {
		const node = mockNode({ name: 'test-node', type: WEBHOOK_NODE_TYPE });
		workflowsStore.getNodeByName.mockReturnValue(node);
		nodeTypesStore.getNodeType = () => ({
			...mockNodeTypeDescription(),
			name: WEBHOOK_NODE_TYPE,
		});

		const { getByRole } = renderComponent();
		expect(getByRole('button').textContent).toBe('Listen for test event');
	});

	it('displays correct button label for form trigger node', () => {
		const node = mockNode({ name: 'test-node', type: FORM_TRIGGER_NODE_TYPE });
		workflowsStore.getNodeByName.mockReturnValue(node);
		nodeTypesStore.getNodeType = () => ({
			...mockNodeTypeDescription(),
			name: FORM_TRIGGER_NODE_TYPE,
		});

		const { getByRole } = renderComponent();
		expect(getByRole('button').textContent).toBe('Execute step');
	});

	it('displays correct button label for chat node', () => {
		const node = mockNode({ name: 'test-node', type: CHAT_TRIGGER_NODE_TYPE });
		workflowsStore.getNodeByName.mockReturnValue(node);
		nodeTypesStore.getNodeType = () => ({
			...mockNodeTypeDescription(),
			name: CHAT_TRIGGER_NODE_TYPE,
		});

		const { getByRole } = renderComponent();
		expect(getByRole('button').textContent).toBe('Test chat');
	});

	it('displays correct button label for polling node', () => {
		const node = mockNode({ name: 'test-node', type: SET_NODE_TYPE });
		workflowsStore.getNodeByName.mockReturnValue(node);
		nodeTypesStore.getNodeType = () => ({
			...mockNodeTypeDescription(),
			polling: true,
		});

		const { getByRole } = renderComponent();
		expect(getByRole('button').textContent).toBe('Fetch Test Event');
	});

	it('displays "Stop Listening" when node is listening for events', () => {
		const node = mockNode({ name: 'test-node', type: SET_NODE_TYPE });
		workflowsStore.getNodeByName.mockReturnValue(node);
		workflowsStore.executionWaitingForWebhook = true;
		nodeTypesStore.isTriggerNode = () => true;

		const { getByRole } = renderComponent();
		expect(getByRole('button').textContent).toBe('Stop Listening');
	});

	it('displays "Stop Listening" when node is running and is a trigger node', () => {
		const node = mockNode({ name: 'test-node', type: SET_NODE_TYPE });
		workflowsStore.getNodeByName.mockReturnValue(node);
		workflowsStore.isNodeExecuting = vi.fn(() => true);
		nodeTypesStore.isTriggerNode = () => true;
		workflowsStore.isWorkflowRunning = true;

		const { getByRole } = renderComponent();
		expect(getByRole('button').textContent).toBe('Stop Listening');
	});

	it('sets button to loading state when node is executing', () => {
		const node = mockNode({ name: 'test-node', type: SET_NODE_TYPE });
		workflowsStore.getNodeByName.mockReturnValue(node);
		workflowsStore.isNodeExecuting = vi.fn(() => true);
		workflowsStore.isWorkflowRunning = true;

		const { getByRole } = renderComponent();
		expect(getByRole('button').querySelector('.n8n-spinner')).toBeVisible();
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
		workflowsStore.isWorkflowRunning = true;
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
		workflowsStore.isWorkflowRunning = true;
		nodeTypesStore.isTriggerNode = () => true;
		workflowsStore.setActiveExecutionId('test-execution-id');
		workflowsStore.isNodeExecuting.mockReturnValue(true);
		workflowsStore.getNodeByName.mockReturnValue(
			mockNode({ name: 'test-node', type: SET_NODE_TYPE }),
		);

		const { getByRole, emitted } = renderComponent();

		await userEvent.click(getByRole('button'));

		expect(runWorkflow.stopCurrentExecution).toHaveBeenCalledTimes(1);
		expect(emitted().stopExecution).toBeTruthy();
	});

	it('runs workflow when clicking button normally', async () => {
		const node = mockNode({ name: 'test-node', type: SET_NODE_TYPE });
		workflowsStore.getNodeByName.mockReturnValue(node);
		nodeTypesStore.getNodeType = () => mockNodeTypeDescription();

		const { getByRole, emitted } = renderComponent();

		await userEvent.click(getByRole('button'));

		expect(externalHooks.run).toHaveBeenCalledWith('nodeExecuteButton.onClick', expect.any(Object));
		expect(runWorkflow.runWorkflow).toHaveBeenCalledWith({
			destinationNode: node.name,
			source: 'RunData.ExecuteNodeButton',
		});
		expect(emitted().execute).toBeTruthy();
	});

	it('opens chat when clicking button for chat node', async () => {
		const node = mockNode({ name: 'test-node', type: SET_NODE_TYPE });
		workflowsStore.getNodeByName.mockReturnValue(node);
		nodeTypesStore.getNodeType = () => mockNodeTypeDescription({ name: CHAT_TRIGGER_NODE_TYPE });

		const { getByRole } = renderComponent();

		await userEvent.click(getByRole('button'));

		expect(ndvStore.setActiveNodeName).toHaveBeenCalledWith(null);
		expect(workflowsStore.chatPartialExecutionDestinationNode).toBe(node.name);
		expect(nodeViewEventBusEmitSpy).toHaveBeenCalledWith('openChat');
	});

	it('opens chat when clicking button for chat child node', async () => {
		const node = mockNode({ name: 'test-node', type: SET_NODE_TYPE });
		workflowsStore.getNodeByName.mockReturnValue(node);
		workflowsStore.checkIfNodeHasChatParent.mockReturnValue(true);

		const { getByRole } = renderComponent();

		await userEvent.click(getByRole('button'));

		expect(ndvStore.setActiveNodeName).toHaveBeenCalledWith(null);
		expect(workflowsStore.chatPartialExecutionDestinationNode).toBe(node.name);
		expect(nodeViewEventBusEmitSpy).toHaveBeenCalledWith('openChat');
	});

	it('prompts for confirmation when pinned data exists', async () => {
		const node = mockNode({ name: 'test-node', type: SET_NODE_TYPE });
		workflowsStore.getNodeByName.mockReturnValue(node);
		pinnedData = usePinnedData(node);
		Object.defineProperty(pinnedData.hasData, 'value', { value: true });

		const { getByRole } = renderComponent();

		await userEvent.click(getByRole('button'));

		expect(message.confirm).toHaveBeenCalledTimes(1);
		expect(pinnedData.unsetData).toHaveBeenCalledWith('unpin-and-execute-modal');
		expect(runWorkflow.runWorkflow).toHaveBeenCalledTimes(1);
	});

	it('generates code for AI Transform node', async () => {
		const generateCodeForAiTransformSpy = vi
			.spyOn(buttonParameterUtils, 'generateCodeForAiTransform')
			.mockImplementation(async () => ({
				name: 'test',
				value: 'Test',
			}));
		const node = mockNode({
			name: 'test-node',
			type: AI_TRANSFORM_NODE_TYPE,
			parameters: {
				instructions: 'Test instructions',
				[AI_TRANSFORM_CODE_GENERATED_FOR_PROMPT]: 'Test prompt',
			},
		});
		workflowsStore.getNodeByName.mockReturnValue(node);

		const { getByRole, emitted } = renderComponent();

		await userEvent.click(getByRole('button'));

		expect(generateCodeForAiTransformSpy).toHaveBeenCalledTimes(1);
		expect(toast.showMessage).toHaveBeenCalledTimes(1);
		expect(emitted().valueChanged).toEqual([
			[{ name: 'test', value: 'Test' }],
			[
				{
					name: `parameters.${AI_TRANSFORM_CODE_GENERATED_FOR_PROMPT}`,
					value: 'Test instructions',
				},
			],
		]);
	});
});
