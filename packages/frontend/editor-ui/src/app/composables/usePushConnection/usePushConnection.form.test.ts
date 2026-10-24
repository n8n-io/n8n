import type { PushMessage } from '@n8n/api-types';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import { flushPromises, mount } from '@vue/test-utils';
import { stringify } from 'flatted';
import {
	createRunExecutionData,
	FORM_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	type IConnections,
	WAIT_INDEFINITELY,
} from 'n8n-workflow';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent } from 'vue';
import type { Router } from 'vue-router';
import { mock } from 'vitest-mock-extended';

import {
	createTestTaskData,
	createTestWorkflow,
	createTestWorkflowExecutionResponse,
	mockNode,
} from '@/__tests__/mocks';
import { createExecutionDataId, useExecutionDataStore } from '@/app/stores/executionData.store';
import type { OnPushMessageHandler } from '@/app/stores/pushConnection.store';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { useWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';

import { usePushConnection } from './usePushConnection';

const { addEventListener } = vi.hoisted(() => ({
	addEventListener: vi.fn<(handler: OnPushMessageHandler) => () => void>(() => vi.fn()),
}));

vi.mock('@/app/stores/pushConnection.store', () => ({
	usePushConnectionStore: () => ({ isConnected: true, addEventListener }),
}));
vi.mock('@n8n/rest-api-client');
vi.mock('@/features/ai/assistant/assistant.store', () => ({
	useAssistantStore: () => ({ onNodeExecution: vi.fn() }),
}));
vi.mock('@/features/ndv/runData/schemaPreview.store', () => ({
	useSchemaPreviewStore: () => ({ trackSchemaPreviewExecution: vi.fn() }),
}));
vi.mock('@/features/execution/executions/executions.utils', async (importOriginal) => ({
	...(await importOriginal<typeof import('@/features/execution/executions/executions.utils')>()),
	openFormPopupWindow: vi.fn(),
}));

describe('Form execution push events', () => {
	const workflowId = 'form-workflow';
	const executionId = 'form-execution';
	const documentId = createWorkflowDocumentId(workflowId);
	const trigger = mockNode({
		name: 'Upload document',
		type: FORM_TRIGGER_NODE_TYPE,
		typeVersion: 2.6,
	});
	const reviewForm = mockNode({
		name: 'Review document',
		type: FORM_NODE_TYPE,
		typeVersion: 2.5,
		parameters: { operation: 'page' },
	});
	const resumeFormUrl = 'https://example.com/form-waiting/form-execution';
	const connections: IConnections = {
		[trigger.name]: { main: [[{ node: reviewForm.name, type: 'main', index: 0 }]] },
	};
	const triggerTask = createTestTaskData({
		data: { main: [[{ json: { formMode: 'test', document: 'sample.pdf' } }]] },
	});
	const formTask = createTestTaskData({
		executionIndex: 1,
		executionStatus: 'waiting',
		source: [{ previousNode: trigger.name }],
		metadata: { resumeFormUrl },
		data: { main: [[{ json: { markdown: '# Document ready for review' } }]] },
	});
	let connection: ReturnType<typeof usePushConnection>;
	let wrapper: ReturnType<typeof mount>;
	let receive: OnPushMessageHandler;

	beforeEach(async () => {
		vi.clearAllMocks();
		const pinia = createPinia();
		setActivePinia(pinia);
		useWorkflowsStore().setWorkflowId(workflowId);
		useWorkflowDocumentStore(documentId).setNodes([trigger, reviewForm]);
		useWorkflowDocumentStore(documentId).setConnections(connections);
		useWorkflowExecutionStateStore(documentId).setActiveExecutionId(null);

		const savedExecution = createTestWorkflowExecutionResponse({
			id: executionId,
			workflowId,
			finished: false,
			status: 'waiting',
			workflowData: createTestWorkflow({
				id: workflowId,
				nodes: [trigger, reviewForm],
				connections,
			}),
			data: createRunExecutionData({
				waitTill: WAIT_INDEFINITELY,
				resultData: {
					lastNodeExecuted: reviewForm.name,
					runData: { [trigger.name]: [triggerTask], [reviewForm.name]: [formTask] },
				},
			}),
		});
		vi.mocked(makeRestApiRequest).mockResolvedValue({
			...savedExecution,
			data: stringify(savedExecution.data),
		});

		wrapper = mount(
			defineComponent({
				setup() {
					connection = usePushConnection({ router: mock<Router>() });
					connection.initialize();
					return () => null;
				},
			}),
			{ global: { plugins: [pinia] } },
		);
		receive = addEventListener.mock.calls[0][0];
		receive({
			type: 'executionStarted',
			data: {
				executionId,
				workflowId,
				mode: 'manual',
				startedAt: new Date(),
				flattedRunData: stringify({ [trigger.name]: [triggerTask] }),
			},
		});
		await flushPromises();
	});

	afterEach(() => {
		connection.terminate();
		wrapper.unmount();
	});

	async function reachReviewForm() {
		const { data: _output, ...taskMetadata } = formTask;
		const events: PushMessage[] = [
			{
				type: 'nodeExecuteBefore',
				data: {
					executionId,
					nodeName: reviewForm.name,
					sequenceNumber: 0,
					data: { startTime: formTask.startTime, executionIndex: 1, source: formTask.source },
				},
			},
			{
				type: 'nodeExecuteAfter',
				data: {
					executionId,
					nodeName: reviewForm.name,
					sequenceNumber: 1,
					itemCountByConnectionType: { main: [1] },
					data: taskMetadata,
				},
			},
			{
				type: 'nodeExecuteAfterData',
				data: {
					executionId,
					nodeName: reviewForm.name,
					itemCountByConnectionType: { main: [1] },
					data: formTask,
				},
			},
		];
		for (const event of events) receive(event);
		await flushPromises();
	}

	it('loads the Form output from node push events', async () => {
		await reachReviewForm();

		expect(
			useExecutionDataStore(createExecutionDataId(executionId)).execution?.data?.resultData.runData[
				reviewForm.name
			][0],
		).toEqual(formTask);
	});

	// NODE-5621: Testing a workflow must leave the running state when its review Form waits for input.
	it('updates the execution to waiting when the review Form pauses', async () => {
		await reachReviewForm();
		const executionStore = useExecutionDataStore(createExecutionDataId(executionId));
		expect(executionStore.execution?.status).toBe('running');

		receive({ type: 'executionWaiting', data: { executionId } });
		await flushPromises();

		expect(executionStore.execution?.status).toBe('waiting');
		const executionState = useWorkflowExecutionStateStore(documentId);
		expect(executionState.activeExecutionId).toBe(executionId);
		expect(executionState.executingNode.lastAddedExecutingNode).toBeNull();
		expect(executionStore.execution?.data?.resultData.runData[reviewForm.name][0]).toEqual(
			formTask,
		);
	});

	it('marks the same execution as running when it resumes', async () => {
		await reachReviewForm();
		const executionStore = useExecutionDataStore(createExecutionDataId(executionId));
		receive({ type: 'executionWaiting', data: { executionId } });
		await flushPromises();
		expect(executionStore.execution?.status).toBe('waiting');

		receive({
			type: 'executionStarted',
			data: {
				executionId,
				workflowId,
				mode: 'manual',
				startedAt: new Date(),
				flattedRunData: stringify({ [trigger.name]: [triggerTask], [reviewForm.name]: [formTask] }),
			},
		});
		await flushPromises();

		expect(executionStore.execution?.status).toBe('running');
		expect(useWorkflowExecutionStateStore(documentId).activeExecutionId).toBe(executionId);
		expect(executionStore.execution?.data?.resultData.runData[reviewForm.name][0]).toEqual(
			formTask,
		);
	});

	it('clears the executing node when a waiting execution has no data', async () => {
		await reachReviewForm();
		const executionStore = useExecutionDataStore(createExecutionDataId(executionId));
		executionStore.setExecution(null);
		const executionState = useWorkflowExecutionStateStore(documentId);
		expect(executionState.executingNode.lastAddedExecutingNode).toBe(reviewForm.name);

		receive({ type: 'executionWaiting', data: { executionId } });
		await flushPromises();

		expect(executionState.executingNode.lastAddedExecutingNode).toBeNull();
		expect(executionState.activeExecutionId).toBe(executionId);
		expect(executionStore.execution).toBeNull();
	});

	it('ignores a waiting event from another execution', async () => {
		await reachReviewForm();
		receive({ type: 'executionWaiting', data: { executionId: 'other-execution' } });
		await flushPromises();

		expect(useExecutionDataStore(createExecutionDataId(executionId)).execution?.status).toBe(
			'running',
		);
		expect(useWorkflowExecutionStateStore(documentId).executingNode.lastAddedExecutingNode).toBe(
			reviewForm.name,
		);
	});
});
