import { describe, it, expect, beforeEach, vi } from 'vitest';
import { reactive, ref, nextTick } from 'vue';
import { fireEvent } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';

import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import type { INodeUi } from '@/Interface';
import ExecuteMessage from './ExecuteMessage.vue';
import { CHAT_TRIGGER_NODE_TYPE } from '@/constants';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useLogsStore } from '@/stores/logs.store';
import { useBuilderStore } from '../../builder.store';

const workflowValidationIssuesRef = ref<
	Array<{ node: string; type: string; value: string | string[] }>
>([]);
const executionWaitingForWebhookRef = ref(false);
const selectedTriggerNodeNameRef = ref<string | undefined>(undefined);
const hasNoCreditsRemainingRef = ref(false);
const workflowExecutionDataRef = reactive<{ status?: string }>({});
const workflowNodes = reactive<INodeUi[]>([
	{
		id: '1',
		name: 'Start Trigger',
		type: 'n8n-nodes-base.manualTrigger',
		position: [0, 0],
		parameters: {},
		typeVersion: 1,
		issues: {},
	},
]);

const showMessageMock = vi.fn();
const runWorkflowMock = vi.fn();

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		baseText: (key: string) => key,
	}),
}));

vi.mock('vue-router', () => ({
	useRouter: () => ({
		push: vi.fn(),
	}),
	useRoute: () => ({ params: {} }),
	RouterLink: vi.fn(),
}));

vi.mock('@/composables/useRunWorkflow', () => ({
	useRunWorkflow: () => ({
		runWorkflow: runWorkflowMock,
	}),
}));

vi.mock('@/composables/useToast', () => ({
	useToast: () => ({
		showMessage: showMessageMock,
	}),
}));

const renderComponent = createComponentRenderer(ExecuteMessage);

vi.mock('./NodeIssueItem.vue', () => ({
	default: {
		template: '<li />',
	},
}));

describe('ExecuteMessage', () => {
	let workflowsStore: ReturnType<typeof mockedStore<typeof useWorkflowsStore>>;
	let nodeTypesStore: ReturnType<typeof mockedStore<typeof useNodeTypesStore>>;
	let logsStore: ReturnType<typeof mockedStore<typeof useLogsStore>>;
	let builderStore: ReturnType<typeof mockedStore<typeof useBuilderStore>>;
	let renderExecuteMessage: () => ReturnType<ReturnType<typeof createComponentRenderer>>;

	beforeEach(() => {
		vi.clearAllMocks();
		runWorkflowMock.mockReset();
		showMessageMock.mockReset();
		workflowValidationIssuesRef.value = [];
		executionWaitingForWebhookRef.value = false;
		selectedTriggerNodeNameRef.value = undefined;
		hasNoCreditsRemainingRef.value = false;
		workflowExecutionDataRef.status = undefined;
		workflowNodes.splice(0, workflowNodes.length, {
			id: '1',
			name: 'Start Trigger',
			type: 'n8n-nodes-base.manualTrigger',
			position: [0, 0],
			parameters: {},
			typeVersion: 1,
			issues: {},
		});

		const pinia = createTestingPinia({ stubActions: false });
		setActivePinia(pinia);

		workflowsStore = mockedStore(useWorkflowsStore);
		nodeTypesStore = mockedStore(useNodeTypesStore);
		logsStore = mockedStore(useLogsStore);
		builderStore = mockedStore(useBuilderStore);

		workflowsStore.workflow.nodes = workflowNodes as unknown as INodeUi[];
		workflowsStore.workflow.connections = {} as never;
		Object.defineProperty(workflowsStore, 'workflowValidationIssues', {
			get: () => workflowValidationIssuesRef.value,
		});
		workflowsStore.formatIssueMessage = vi.fn((value: string | string[]) =>
			Array.isArray(value) ? value.join(', ') : String(value),
		);
		Object.defineProperty(workflowsStore, 'workflowExecutionData', {
			get: () => workflowExecutionDataRef,
		});
		Object.defineProperty(workflowsStore, 'executionWaitingForWebhook', {
			get: () => executionWaitingForWebhookRef.value,
			set: (value: boolean) => {
				executionWaitingForWebhookRef.value = value;
			},
		});
		Object.defineProperty(workflowsStore, 'selectedTriggerNodeName', {
			get: () => selectedTriggerNodeNameRef.value,
		});
		workflowsStore.setSelectedTriggerNodeName = vi.fn((name: string | undefined) => {
			selectedTriggerNodeNameRef.value = name;
		});
		workflowsStore.getNodeByName = vi.fn(
			(name: string) => workflowNodes.find((node) => node.name === name) ?? null,
		);
		logsStore.toggleOpen = vi.fn();
		nodeTypesStore.isTriggerNode = vi
			.fn()
			.mockImplementation((type: string) => type.toLowerCase().includes('trigger'));
		Object.defineProperty(builderStore, 'hasNoCreditsRemaining', {
			get: () => hasNoCreditsRemainingRef.value,
		});

		renderExecuteMessage = () => renderComponent({ pinia });
	});

	it('disables execution when validation issues exist', () => {
		workflowValidationIssuesRef.value = [
			{ node: 'Start Trigger', type: 'parameters', value: 'Missing field' },
		];

		const { getAllByTestId, getByText } = renderExecuteMessage();

		expect(getByText('aiAssistant.builder.executeMessage.description')).toBeInTheDocument();
		const button = getAllByTestId('execute-workflow-button')[0] as HTMLButtonElement;
		expect(button.disabled).toBe(true);
	});

	it('runs workflow and emits completion event when execution finishes', async () => {
		runWorkflowMock.mockImplementation(async () => {
			workflowExecutionDataRef.status = 'running';
		});

		const { getAllByTestId, emitted } = renderExecuteMessage();
		const button = getAllByTestId('execute-workflow-button')[0];
		expect(button).not.toHaveAttribute('disabled');

		await fireEvent.click(button);
		await flushPromises();
		await nextTick();
		workflowExecutionDataRef.status = 'success';
		await nextTick();
		await flushPromises();

		expect(runWorkflowMock).toHaveBeenCalledWith({ triggerNode: 'Start Trigger' });
		expect(emitted().workflowExecuted).toHaveLength(1);
	});

	it('opens chat logs and shows info toast for chat trigger nodes', async () => {
		workflowNodes.push({
			id: '2',
			name: 'Chat Trigger',
			type: CHAT_TRIGGER_NODE_TYPE,
			position: [0, 0],
			parameters: {},
			typeVersion: 1,
			issues: {},
		});
		selectedTriggerNodeNameRef.value = 'Chat Trigger';

		const { getAllByTestId, emitted } = renderExecuteMessage();
		const button = getAllByTestId('execute-workflow-button')[0];

		await fireEvent.click(button);

		expect(runWorkflowMock).not.toHaveBeenCalled();
		expect(showMessageMock).toHaveBeenCalledWith({
			title: 'aiAssistant.builder.toast.title',
			message: 'aiAssistant.builder.toast.description',
			type: 'info',
		});
		expect(logsStore.toggleOpen).toHaveBeenCalledWith(true);
		expect(emitted().workflowExecuted).toBeUndefined();

		// Simulate workflow execution externally (e.g., via chat panel)
		workflowExecutionDataRef.status = 'running';
		await nextTick();
		await nextTick();
		workflowExecutionDataRef.status = 'success';
		await nextTick();
		await flushPromises();

		expect(emitted().workflowExecuted).toHaveLength(1);
	});

	it('emits completion after multiple run state toggles', async () => {
		runWorkflowMock.mockImplementation(async () => {
			workflowExecutionDataRef.status = 'running';
			await nextTick();
			workflowExecutionDataRef.status = 'success';
		});

		const { getAllByTestId, emitted } = renderExecuteMessage();
		const button = getAllByTestId('execute-workflow-button')[0];

		await fireEvent.click(button);
		await flushPromises();
		await nextTick();

		// Toggle again manually to ensure watcher was cleaned up
		workflowExecutionDataRef.status = 'success';
		await nextTick();

		expect(emitted().workflowExecuted).toHaveLength(1);
	});

	it('supports consecutive manual executions', async () => {
		runWorkflowMock.mockImplementation(async () => {
			workflowExecutionDataRef.status = 'running';
			await nextTick();
			workflowExecutionDataRef.status = 'success';
			await nextTick();
		});

		const { getAllByTestId, emitted } = renderExecuteMessage();
		const button = getAllByTestId('execute-workflow-button')[0];

		await fireEvent.click(button);
		await flushPromises();
		await nextTick();

		await fireEvent.click(button);
		await flushPromises();
		await nextTick();

		expect(runWorkflowMock).toHaveBeenCalledTimes(2);
		expect(emitted().workflowExecuted).toHaveLength(2);
	});

	it('disables execution when no credits remaining', () => {
		hasNoCreditsRemainingRef.value = true;

		const { getAllByTestId } = renderExecuteMessage();
		const button = getAllByTestId('execute-workflow-button')[0] as HTMLButtonElement;

		expect(button.disabled).toBe(true);
	});

	it('disables execution when no credits remaining and validation issues exist', () => {
		hasNoCreditsRemainingRef.value = true;
		workflowValidationIssuesRef.value = [
			{ node: 'Start Trigger', type: 'parameters', value: 'Missing field' },
		];

		const { getAllByTestId } = renderExecuteMessage();
		const button = getAllByTestId('execute-workflow-button')[0] as HTMLButtonElement;

		expect(button.disabled).toBe(true);
	});

	it('enables execution when credits are available and no validation issues', () => {
		hasNoCreditsRemainingRef.value = false;

		const { getAllByTestId } = renderExecuteMessage();
		const button = getAllByTestId('execute-workflow-button')[0] as HTMLButtonElement;

		expect(button.disabled).toBe(false);
	});
});
