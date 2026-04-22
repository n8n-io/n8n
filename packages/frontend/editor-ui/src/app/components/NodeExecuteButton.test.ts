import { reactive, shallowRef, computed } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { useRouter } from 'vue-router';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';
import { createComponentRenderer } from '@/__tests__/render';
import { type MockedStore, mockedStore, getTooltip } from '@/__tests__/utils';
import { mockNode, mockNodeTypeDescription } from '@/__tests__/mocks';
import { nodeViewEventBus } from '@/app/event-bus';
import {
	AI_TRANSFORM_NODE_TYPE,
	AI_TRANSFORM_CODE_GENERATED_FOR_PROMPT,
	AI_TRANSFORM_JS_CODE,
} from 'n8n-workflow';
import {
	CHAT_TRIGGER_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	SET_NODE_TYPE,
	WEBHOOK_NODE_TYPE,
} from '@/app/constants';
import NodeExecuteButton from './NodeExecuteButton.vue';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import {
	injectWorkflowDocumentStore,
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';
import { useRunWorkflow } from '@/app/composables/useRunWorkflow';
import { useExternalHooks } from '@/app/composables/useExternalHooks';
import { usePinnedData } from '@/app/composables/usePinnedData';
import { useMessage } from '@/app/composables/useMessage';
import { useToast } from '@/app/composables/useToast';
import * as buttonParameterUtils from '@/features/ndv/parameters/utils/buttonParameter.utils';
import {
	injectWorkflowState,
	useWorkflowState,
	type WorkflowState,
} from '@/app/composables/useWorkflowState';

vi.mock('vue-router', () => ({
	useRouter: () => ({}),
	useRoute: () => reactive({}),
	RouterLink: vi.fn(),
}));

vi.mock('@/app/composables/useToast', () => {
	const showError = vi.fn();
	const showMessage = vi.fn();
	return {
		useToast: () => ({
			showError,
			showMessage,
		}),
	};
});

vi.mock('@/app/composables/useRunWorkflow', () => {
	const runWorkflow = vi.fn();
	const stopCurrentExecution = vi.fn();
	return {
		useRunWorkflow: () => ({
			runWorkflow,
			stopCurrentExecution,
		}),
	};
});

vi.mock('@/app/composables/useExternalHooks', () => {
	const run = vi.fn();
	return {
		useExternalHooks: () => ({
			run,
		}),
	};
});

vi.mock('@/app/composables/usePinnedData', () => {
	const createMock = () => ({
		hasData: computed(() => false),
		canPinNode: vi.fn().mockReturnValue(false),
		setData: vi.fn(),
		onSetDataSuccess: vi.fn(),
		onSetDataError: vi.fn(),
		unsetData: vi.fn(),
		onUnsetData: vi.fn(),
		isValidNodeType: computed(() => false),
		isValidJSON: vi.fn(),
		isValidSize: vi.fn(),
		data: computed(() => undefined),
	});
	return {
		usePinnedData: vi.fn(createMock),
	};
});

vi.mock('@/app/composables/useMessage', () => {
	const confirm = vi.fn(async () => 'confirm');
	return {
		useMessage: () => ({
			confirm,
		}),
	};
});

vi.mock('@/app/composables/useWorkflowState', async () => {
	const actual = await vi.importActual('@/app/composables/useWorkflowState');
	return {
		...actual,
		injectWorkflowState: vi.fn(),
	};
});

vi.mock('@/app/stores/workflowDocument.store', async (importOriginal) => ({
	...(await importOriginal()),
	injectWorkflowDocumentStore: vi.fn(),
}));

let renderComponent: ReturnType<typeof createComponentRenderer>;
let workflowsStore: MockedStore<typeof useWorkflowsStore>;
let workflowDocumentStore: ReturnType<typeof useWorkflowDocumentStore>;
let nodeTypesStore: MockedStore<typeof useNodeTypesStore>;
let ndvStore: MockedStore<typeof useNDVStore>;

let runWorkflow: ReturnType<typeof useRunWorkflow>;
let externalHooks: ReturnType<typeof useExternalHooks>;
let message: ReturnType<typeof useMessage>;
let toast: ReturnType<typeof useToast>;
let workflowState: WorkflowState;
let nodeViewEventBusEmitSpy: ReturnType<typeof vi.spyOn>;

describe('NodeExecuteButton', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		nodeViewEventBusEmitSpy = vi.spyOn(nodeViewEventBus, 'emit');

		renderComponent = createComponentRenderer(NodeExecuteButton, {
			pinia: createTestingPinia(),
			props: {
				nodeName: 'test-node',
				telemetrySource: 'test-source',
			},
		});

		workflowsStore = mockedStore(useWorkflowsStore);
		workflowsStore.workflowId = 'abc123';
		workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId('abc123'));
		vi.mocked(injectWorkflowDocumentStore).mockReturnValue(shallowRef(workflowDocumentStore));
		workflowState = useWorkflowState();
		vi.mocked(injectWorkflowState).mockReturnValue(workflowState);

		nodeTypesStore = mockedStore(useNodeTypesStore);
		ndvStore = mockedStore(useNDVStore);

		runWorkflow = useRunWorkflow({ router: useRouter() });
		externalHooks = useExternalHooks();
		message = useMessage();
		toast = useToast();
	});

	afterEach(() => {
		nodeViewEventBusEmitSpy.mockRestore();
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
		vi.spyOn(workflowDocumentStore, 'getNodeByName').mockReturnValue(node);
		nodeTypesStore.getNodeType = () => ({
			...mockNodeTypeDescription(),
			name: WEBHOOK_NODE_TYPE,
		});

		const { getByRole } = renderComponent();
		expect(getByRole('button').textContent).toBe('Listen for test event');
	});

	it('displays correct button label for form trigger node', () => {
		const node = mockNode({ name: 'test-node', type: FORM_TRIGGER_NODE_TYPE });
		vi.spyOn(workflowDocumentStore, 'getNodeByName').mockReturnValue(node);
		nodeTypesStore.getNodeType = () => ({
			...mockNodeTypeDescription(),
			name: FORM_TRIGGER_NODE_TYPE,
		});

		const { getByRole } = renderComponent();
		expect(getByRole('button').textContent).toBe('Execute step');
	});

	it('displays correct button label for chat node', () => {
		const node = mockNode({ name: 'test-node', type: CHAT_TRIGGER_NODE_TYPE });
		vi.spyOn(workflowDocumentStore, 'getNodeByName').mockReturnValue(node);
		nodeTypesStore.getNodeType = () => ({
			...mockNodeTypeDescription(),
			name: CHAT_TRIGGER_NODE_TYPE,
		});

		const { getByRole } = renderComponent();
		expect(getByRole('button').textContent).toBe('Open chat');
	});

	it('displays correct button label for polling node', () => {
		const node = mockNode({ name: 'test-node', type: SET_NODE_TYPE });
		vi.spyOn(workflowDocumentStore, 'getNodeByName').mockReturnValue(node);
		nodeTypesStore.getNodeType = () => ({
			...mockNodeTypeDescription(),
			polling: true,
		});

		const { getByRole } = renderComponent();
		expect(getByRole('button').textContent).toBe('Fetch Test Event');
	});

	it('displays "Stop Listening" when node is listening for events', () => {
		const node = mockNode({ name: 'test-node', type: SET_NODE_TYPE });
		vi.spyOn(workflowDocumentStore, 'getNodeByName').mockReturnValue(node);
		workflowsStore.executionWaitingForWebhook = true;
		nodeTypesStore.isTriggerNode = () => true;

		const { getByRole } = renderComponent();
		expect(getByRole('button').textContent).toBe('Stop Listening');
	});

	it('displays "Stop Listening" when node is running and is a trigger node', () => {
		const node = mockNode({ name: 'test-node', type: SET_NODE_TYPE });
		vi.spyOn(workflowDocumentStore, 'getNodeByName').mockReturnValue(node);
		workflowState.executingNode.isNodeExecuting = vi.fn().mockReturnValue(true);
		nodeTypesStore.isTriggerNode = () => true;
		workflowsStore.isWorkflowRunning = true;

		const { getByRole } = renderComponent();
		expect(getByRole('button').textContent).toBe('Stop Listening');
	});

	it('sets button to loading state when node is executing', () => {
		const node = mockNode({ name: 'test-node', type: SET_NODE_TYPE });
		vi.spyOn(workflowDocumentStore, 'getNodeByName').mockReturnValue(node);
		workflowState.executingNode.isNodeExecuting = vi.fn().mockReturnValue(true);
		workflowsStore.isWorkflowRunning = true;

		const { getByRole } = renderComponent();
		expect(getByRole('button')).toHaveAttribute('aria-busy', 'true');
	});

	it('should be disabled if the node is disabled and show tooltip', async () => {
		vi.spyOn(workflowDocumentStore, 'getNodeByName').mockReturnValue(
			mockNode({ name: 'test', type: SET_NODE_TYPE, disabled: true }),
		);

		const { getByRole } = renderComponent();

		const button = getByRole('button');
		expect(button).toBeDisabled();

		await userEvent.hover(button);

		await waitFor(() => {
			const tooltip = getTooltip();
			expect(tooltip).toHaveTextContent('Enable node to execute');
		});
	});

	it('should be disabled when workflow is running but node is not executing', async () => {
		workflowsStore.isWorkflowRunning = true;
		workflowState.executingNode.isNodeExecuting = vi.fn().mockReturnValue(false);
		vi.spyOn(workflowDocumentStore, 'getNodeByName').mockReturnValue(
			mockNode({ name: 'test-node', type: SET_NODE_TYPE }),
		);

		const { getByRole } = renderComponent();

		const button = getByRole('button');
		expect(button).toBeDisabled();

		await userEvent.hover(button);

		await waitFor(() => {
			const tooltip = getTooltip();
			expect(tooltip).toHaveTextContent('Workflow is already running');
		});
	});

	it('disables button when trigger node has issues', async () => {
		nodeTypesStore.isTriggerNode = () => true;
		vi.spyOn(workflowDocumentStore, 'getNodeByName').mockReturnValue(
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
		vi.spyOn(workflowDocumentStore, 'getNodeByName').mockReturnValue(
			mockNode({ name: 'test-node', type: SET_NODE_TYPE }),
		);

		const { getByRole } = renderComponent();

		await userEvent.click(getByRole('button'));

		expect(workflowsStore.removeTestWebhook).toHaveBeenCalledWith('abc123');
	});

	it('stops execution when clicking button while workflow is running', async () => {
		workflowsStore.isWorkflowRunning = true;
		nodeTypesStore.isTriggerNode = () => true;
		useWorkflowState().setActiveExecutionId('test-execution-id');
		workflowState.executingNode.isNodeExecuting = vi.fn().mockReturnValue(true);
		vi.spyOn(workflowDocumentStore, 'getNodeByName').mockReturnValue(
			mockNode({ name: 'test-node', type: SET_NODE_TYPE }),
		);

		const { getByRole, emitted } = renderComponent();

		await userEvent.click(getByRole('button'));

		expect(runWorkflow.stopCurrentExecution).toHaveBeenCalledTimes(1);
		expect(emitted().stopExecution).toBeTruthy();
	});

	it('runs workflow when clicking button normally', async () => {
		const node = mockNode({ name: 'test-node', type: SET_NODE_TYPE });
		vi.spyOn(workflowDocumentStore, 'getNodeByName').mockReturnValue(node);
		nodeTypesStore.getNodeType = () => mockNodeTypeDescription();

		const { getByRole, emitted } = renderComponent();

		await userEvent.click(getByRole('button'));

		expect(externalHooks.run).toHaveBeenCalledWith('nodeExecuteButton.onClick', expect.any(Object));
		expect(runWorkflow.runWorkflow).toHaveBeenCalledWith({
			destinationNode: {
				nodeName: node.name,
				mode: 'inclusive',
			},
			source: 'RunData.ExecuteNodeButton',
		});
		expect(emitted().execute).toBeTruthy();
	});

	it('opens chat when clicking button for chat node', async () => {
		const node = mockNode({ name: 'test-node', type: SET_NODE_TYPE });
		vi.spyOn(workflowDocumentStore, 'getNodeByName').mockReturnValue(node);
		nodeTypesStore.getNodeType = () => mockNodeTypeDescription({ name: CHAT_TRIGGER_NODE_TYPE });

		const { getByRole } = renderComponent();

		await userEvent.click(getByRole('button'));

		expect(ndvStore.unsetActiveNodeName).toHaveBeenCalled();
		expect(runWorkflow.runWorkflow).toHaveBeenCalledWith({
			destinationNode: { nodeName: node.name, mode: 'inclusive' },
			source: 'RunData.ExecuteNodeButton',
		});
	});

	it('opens chat when clicking button for chat child node', async () => {
		const node = mockNode({ name: 'test-node', type: SET_NODE_TYPE });
		vi.spyOn(workflowDocumentStore, 'getNodeByName').mockReturnValue(node);
		workflowsStore.checkIfNodeHasChatParent.mockReturnValue(true);

		const { getByRole } = renderComponent();

		await userEvent.click(getByRole('button'));

		expect(ndvStore.unsetActiveNodeName).toHaveBeenCalled();
		expect(runWorkflow.runWorkflow).toHaveBeenCalledWith({
			destinationNode: { nodeName: node.name, mode: 'inclusive' },
			source: 'RunData.ExecuteNodeButton',
		});
	});

	it('prompts for confirmation when pinned data exists', async () => {
		const node = mockNode({ name: 'test-node', type: SET_NODE_TYPE });
		vi.spyOn(workflowDocumentStore, 'getNodeByName').mockReturnValue(node);

		// Use a one-time mock return value so the mocked `usePinnedData` implementation does not leak into subsequent tests.
		const mockUnsetData = vi.fn();
		vi.mocked(usePinnedData).mockReturnValueOnce({
			hasData: computed(() => true),
			canPinNode: vi.fn().mockReturnValue(true),
			setData: vi.fn(),
			onSetDataSuccess: vi.fn(),
			onSetDataError: vi.fn(),
			unsetData: mockUnsetData,
			onUnsetData: vi.fn(),
			isValidNodeType: computed(() => true),
			isValidJSON: vi.fn(),
			isValidSize: vi.fn(),
			data: computed(() => undefined),
		});

		const { getByRole } = renderComponent();

		await userEvent.click(getByRole('button'));

		expect(message.confirm).toHaveBeenCalledTimes(1);
		expect(mockUnsetData).toHaveBeenCalledWith('unpin-and-execute-modal');
		expect(runWorkflow.runWorkflow).toHaveBeenCalledTimes(1);
	});

	it('generates code for AI Transform node', async () => {
		const generateCodeForAiTransformSpy = vi
			.spyOn(buttonParameterUtils, 'generateCodeForAiTransform')
			.mockImplementation(async () => ({
				name: 'test',
				value: 'Test',
			}));
		const updateNodePropertiesSpy = vi.spyOn(workflowDocumentStore, 'updateNodeProperties');
		const node = mockNode({
			name: 'test-node',
			type: AI_TRANSFORM_NODE_TYPE,
			parameters: {
				instructions: 'Test instructions',
				[AI_TRANSFORM_CODE_GENERATED_FOR_PROMPT]: 'Test prompt',
			},
		});
		vi.spyOn(workflowDocumentStore, 'getNodeByName').mockReturnValue(node);

		const { getByRole } = renderComponent();

		await userEvent.click(getByRole('button'));

		expect(generateCodeForAiTransformSpy).toHaveBeenCalledTimes(1);
		expect(toast.showMessage).toHaveBeenCalledTimes(1);
		expect(updateNodePropertiesSpy).toHaveBeenCalledWith({
			name: 'test-node',
			properties: {
				parameters: expect.objectContaining({
					instructions: 'Test instructions',
					[AI_TRANSFORM_JS_CODE]: 'Test',
					[AI_TRANSFORM_CODE_GENERATED_FOR_PROMPT]: 'Test instructions',
				}),
			},
		});
	});
});
