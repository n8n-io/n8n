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
import { CHAT_TRIGGER_NODE_TYPE } from '@/app/constants';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useLogsStore } from '@/app/stores/logs.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useBuilderStore } from '../../builder.store';
import { SETUP_CREDENTIALS_MODAL_KEY } from '@/app/constants';

const workflowValidationIssuesRef = ref<
	Array<{ node: string; type: string; value: string | string[] }>
>([]);
const workflowTodosRef = ref<Array<{ node: string; type: string; value: string | string[] }>>([]);
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

vi.mock('@/app/composables/useRunWorkflow', () => ({
	useRunWorkflow: () => ({
		runWorkflow: runWorkflowMock,
	}),
}));

vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({
		showMessage: showMessageMock,
	}),
}));

const renderComponent = createComponentRenderer(ExecuteMessage);

vi.mock('./NodeIssueItem.vue', () => ({
	default: {
		template: '<li data-test-id="node-issue-item" @click="$emit(\'click\')" />',
		emits: ['click'],
	},
}));

vi.mock('./CredentialsSetupCard.vue', () => ({
	default: {
		template: '<div data-test-id="credentials-setup-card" @click="$emit(\'click\')" />',
		emits: ['click'],
	},
}));

describe('ExecuteMessage', () => {
	let workflowsStore: ReturnType<typeof mockedStore<typeof useWorkflowsStore>>;
	let nodeTypesStore: ReturnType<typeof mockedStore<typeof useNodeTypesStore>>;
	let logsStore: ReturnType<typeof mockedStore<typeof useLogsStore>>;
	let uiStore: ReturnType<typeof mockedStore<typeof useUIStore>>;
	let builderStore: ReturnType<typeof mockedStore<typeof useBuilderStore>>;
	let renderExecuteMessage: () => ReturnType<ReturnType<typeof createComponentRenderer>>;

	beforeEach(() => {
		vi.clearAllMocks();
		runWorkflowMock.mockReset();
		showMessageMock.mockReset();
		workflowValidationIssuesRef.value = [];
		workflowTodosRef.value = [];
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
		uiStore = mockedStore(useUIStore);
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
		Object.defineProperty(builderStore, 'workflowTodos', {
			get: () => workflowTodosRef.value,
		});
		builderStore.trackWorkflowBuilderJourney = vi.fn();

		renderExecuteMessage = () => renderComponent({ pinia });
	});

	it('disables execution when validation issues exist', () => {
		const issue = { node: 'Start Trigger', type: 'parameters', value: 'Missing field' };
		workflowValidationIssuesRef.value = [issue];
		workflowTodosRef.value = [issue];

		const { getAllByTestId, getByText } = renderExecuteMessage();

		expect(getByText('aiAssistant.builder.executeMessage.description')).toBeInTheDocument();
		const button = getAllByTestId('execute-workflow-button')[0] as HTMLButtonElement;
		expect(button.disabled).toBe(true);
	});

	it('disables execution when placeholder values are present', () => {
		workflowNodes[0].parameters = {
			url: '<__PLACEHOLDER_VALUE__API endpoint URL__>',
		};
		workflowTodosRef.value = [
			{ node: 'Start Trigger', type: 'parameters', value: 'Fill in placeholder value' },
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

	it('does not duplicate placeholder issues when node.issues.parameters has string values', () => {
		// Setup node with placeholder and existing issue as a string (type violation scenario)
		workflowNodes[0].parameters = {
			url: '<__PLACEHOLDER_VALUE__API endpoint URL__>',
		};
		workflowNodes[0].issues = {
			parameters: {
				url: 'aiAssistant.builder.executeMessage.fillParameter' as unknown as string[],
			},
		};

		const { container } = renderExecuteMessage();
		const issueItems = container.querySelectorAll('li');

		// Should not create duplicate issues when the same message exists in node.issues.parameters
		// Even when the value is incorrectly a string instead of an array
		expect(issueItems.length).toBeLessThanOrEqual(1);
	});

	it('creates placeholder issue when different from existing node issues', () => {
		// Setup node with placeholder but different existing issue
		workflowNodes[0].parameters = {
			url: '<__PLACEHOLDER_VALUE__API endpoint URL__>',
		};
		workflowNodes[0].issues = {
			parameters: {
				url: ['Some other validation error'],
			},
		};
		workflowTodosRef.value = [
			{ node: 'Start Trigger', type: 'parameters', value: 'Some other validation error' },
			{ node: 'Start Trigger', type: 'parameters', value: 'Fill in placeholder value' },
		];

		const { getAllByTestId, container } = renderExecuteMessage();
		const button = getAllByTestId('execute-workflow-button')[0] as HTMLButtonElement;
		const issueItems = container.querySelectorAll('li');

		// Should be disabled and show issues
		expect(button.disabled).toBe(true);
		// Should have both the existing issue and the placeholder issue
		expect(issueItems.length).toBeGreaterThan(0);
	});

	it('tracks user_clicked_todo when clicking on an issue item', async () => {
		const todoIssue = { node: 'HTTP Request', type: 'parameters', value: 'Missing URL' };
		workflowTodosRef.value = [todoIssue];
		workflowNodes.push({
			id: '2',
			name: 'HTTP Request',
			type: 'n8n-nodes-base.httpRequest',
			position: [100, 0],
			parameters: {},
			typeVersion: 1,
			issues: {},
		});

		const { getAllByTestId } = renderExecuteMessage();
		const issueItem = getAllByTestId('node-issue-item')[0];

		await fireEvent.click(issueItem);

		expect(builderStore.trackWorkflowBuilderJourney).toHaveBeenCalledWith('user_clicked_todo', {
			node_type: 'n8n-nodes-base.httpRequest',
			type: 'parameters',
		});
	});

	it('opens credentials modal and tracks telemetry when clicking credentials card', async () => {
		const credentialIssue = {
			node: 'OpenAI Model',
			type: 'credentials',
			value: "Credentials for 'OpenAI' are not set",
		};
		workflowTodosRef.value = [credentialIssue];
		workflowNodes.push({
			id: '2',
			name: 'OpenAI Model',
			type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
			position: [100, 0],
			parameters: {},
			typeVersion: 1,
			issues: {},
		});

		const { getByTestId } = renderExecuteMessage();
		const credentialsCard = getByTestId('credentials-setup-card');

		await fireEvent.click(credentialsCard);

		expect(uiStore.openModalWithData).toHaveBeenCalledWith({
			name: SETUP_CREDENTIALS_MODAL_KEY,
			data: { source: 'builder' },
		});
		expect(builderStore.trackWorkflowBuilderJourney).toHaveBeenCalledWith('user_clicked_todo', {
			type: 'credentials',
			count: 1,
			source: 'builder',
		});
	});

	it('tracks no_placeholder_values_left when all todos are resolved', async () => {
		const todoIssue = { node: 'Start Trigger', type: 'parameters', value: 'Missing field' };
		workflowTodosRef.value = [todoIssue];

		renderExecuteMessage();

		// Simulate resolving all todos
		workflowTodosRef.value = [];
		await nextTick();
		await flushPromises();

		expect(builderStore.trackWorkflowBuilderJourney).toHaveBeenCalledWith(
			'no_placeholder_values_left',
		);
	});

	it('does not track no_placeholder_values_left when component mounts without issues', async () => {
		workflowTodosRef.value = [];

		renderExecuteMessage();
		await nextTick();

		expect(builderStore.trackWorkflowBuilderJourney).not.toHaveBeenCalledWith(
			'no_placeholder_values_left',
		);
	});
});
