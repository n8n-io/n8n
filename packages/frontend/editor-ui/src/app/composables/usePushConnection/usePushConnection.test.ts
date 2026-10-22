import { usePushConnection } from '@/app/composables/usePushConnection';
import {
	testWebhookReceived,
	builderCreditsUpdated,
	executionStarted,
	executionFinished,
	agentNodeProgress,
} from '@/app/composables/usePushConnection/handlers';
import type { TestWebhookReceived } from '@n8n/api-types/push/webhook';
import type { BuilderCreditsPushMessage } from '@n8n/api-types/push/builder-credits';
import type { AgentNodeProgress, PushMessage } from '@n8n/api-types';
import { pushHandlerRegistry } from '@n8n/frontend-module-sdk';
import { useRouter } from 'vue-router';
import type { OnPushMessageHandler } from '@/app/stores/pushConnection.store';
import { createPinia, setActivePinia } from 'pinia';
import { flushPromises } from '@vue/test-utils';
import { stringify } from 'flatted';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import { createWorkflowDocumentId } from '@/app/stores/workflowDocument.store';
import { createExecutionDataId, useExecutionDataStore } from '@/app/stores/executionData.store';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';
import type { ExecutionStatus } from 'n8n-workflow';

const removeEventListener = vi.fn();
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const addEventListener = vi.fn((_handler: OnPushMessageHandler) => removeEventListener);

const pushStore = vi.hoisted(() => ({ isConnected: false }));

vi.mock('@/app/stores/pushConnection.store', async () => {
	const { reactive } = await import('vue');
	const store = reactive({ isConnected: false });
	Object.defineProperty(pushStore, 'isConnected', {
		get: () => store.isConnected,
		set: (value: boolean) => {
			store.isConnected = value;
		},
	});
	return {
		usePushConnectionStore: () => Object.assign(store, { addEventListener }),
	};
});

vi.mock('@n8n/rest-api-client');

const showMessage = vi.hoisted(() => vi.fn());
vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showMessage }),
}));

const editorContext = vi.hoisted(() => ({
	executionSuccessToasts: { value: true },
	executionErrorToasts: { value: true },
}));
vi.mock('@/app/composables/useEditorContext', () => ({
	useEditorContext: () => editorContext,
}));

vi.mock('@/app/composables/usePushConnection/handlers', () => ({
	testWebhookDeleted: vi.fn(),
	testWebhookReceived: vi.fn(),
	reloadNodeType: vi.fn(),
	removeNodeType: vi.fn(),
	nodeDescriptionUpdated: vi.fn(),
	nodeExecuteBefore: vi.fn(),
	nodeExecuteAfter: vi.fn(),
	nodeExecuteAfterData: vi.fn(),
	executionStarted: vi.fn(),
	executionWaiting: vi.fn(),
	sendWorkerStatusMessage: vi.fn(),
	sendConsoleMessage: vi.fn(),
	workflowFailedToActivate: vi.fn(),
	workflowPartiallyActivated: vi.fn(),
	executionFinished: vi.fn(),
	executionRecovered: vi.fn(),
	workflowActivated: vi.fn(),
	workflowDeactivated: vi.fn(),
	collaboratorsChanged: vi.fn(),
	builderCreditsUpdated: vi.fn(),
	agentNodeProgress: vi.fn(),
}));

vi.mock('vue-router', async (importOriginal) => {
	return {
		...(await importOriginal()),
		useRouter: vi.fn().mockReturnValue({
			push: vi.fn(),
		}),
		useRoute: vi.fn(),
	};
});

describe('usePushConnection composable', () => {
	let pushConnection: ReturnType<typeof usePushConnection>;

	beforeEach(() => {
		vi.clearAllMocks();
		pushHandlerRegistry.clear();

		setActivePinia(createPinia());

		const router = useRouter();
		pushConnection = usePushConnection({ router });
	});

	afterEach(() => {
		pushConnection.terminate();
	});

	it('should register an event listener on initialize', () => {
		pushConnection.initialize();
		expect(addEventListener).toHaveBeenCalledTimes(1);
	});

	it('should call the correct handler when an event is received', async () => {
		pushConnection.initialize();

		// Get the event callback which was registered via addEventListener.
		const handler = addEventListener.mock.calls[0][0];

		// Create a test event for one of the handled types.
		// In this test, we simulate the event type 'testWebhookReceived'.
		const testEvent: TestWebhookReceived = {
			type: 'testWebhookReceived',
			data: {
				executionId: '123',
				workflowId: '456',
			},
		};

		// Call the event callback with our test event.
		handler(testEvent);

		// Allow any microtasks to complete.
		await Promise.resolve();

		// Verify that the correct handler was called.
		expect(testWebhookReceived).toHaveBeenCalledTimes(1);
		expect(testWebhookReceived).toHaveBeenCalledWith(testEvent, expect.any(Object));
	});

	it('yields a push type a module owns, and never runs the handler itself', async () => {
		const moduleHandler = vi.fn();
		pushHandlerRegistry.register('executionStarted', moduleHandler);

		pushConnection.initialize();

		const handler = addEventListener.mock.calls[0][0];
		const testEvent = {
			type: 'executionStarted',
			data: { executionId: '123' },
		} as unknown as PushMessage;

		handler(testEvent);
		await Promise.resolve();

		expect(executionStarted).not.toHaveBeenCalled();
		expect(moduleHandler).not.toHaveBeenCalled();
	});

	it('should call removeEventListener when terminate is called', () => {
		pushConnection.initialize();
		pushConnection.terminate();

		expect(removeEventListener).toHaveBeenCalledTimes(1);
	});

	it('routes agent capability progress to its execution-scoped handler', async () => {
		pushConnection.initialize();
		const handler = addEventListener.mock.calls[0][0];
		const event: AgentNodeProgress = {
			type: 'agentNodeProgress',
			data: {
				executionId: 'exec-1',
				nodeId: 'node-1',
				nodeName: 'Message an Agent',
				runIndex: 0,
				itemIndex: 0,
				sequenceNumber: 0,
				toolCallId: 'tc-1',
				capability: { kind: 'tool', name: 'lookup' },
				status: 'running',
			},
		};

		handler(event);
		await Promise.resolve();

		expect(agentNodeProgress).toHaveBeenCalledWith(event, expect.any(Object));
	});

	it('should handle updateBuilderCredits event correctly', async () => {
		pushConnection.initialize();

		// Get the event callback which was registered via addEventListener.
		const handler = addEventListener.mock.calls[0][0];

		// Create a test event for updateBuilderCredits.
		const testEvent: BuilderCreditsPushMessage = {
			type: 'updateBuilderCredits',
			data: {
				creditsQuota: 1000,
				creditsClaimed: 250,
			},
		};

		// Call the event callback with our test event.
		handler(testEvent);

		// Allow any microtasks to complete.
		await Promise.resolve();

		// Verify that the correct handler was called.
		expect(builderCreditsUpdated).toHaveBeenCalledTimes(1);
		expect(builderCreditsUpdated).toHaveBeenCalledWith(testEvent);
	});

	describe('resync after reconnect', () => {
		const WORKFLOW_ID = 'w1';
		const EXECUTION_ID = '42';

		const SERVER_RUN_DATA = { resultData: { runData: { Tool: [] } } };

		const serverExecution = (status: ExecutionStatus) => ({
			id: EXECUTION_ID,
			workflowId: WORKFLOW_ID,
			status,
			finished: status === 'success',
			mode: 'manual',
			startedAt: new Date(),
			workflowData: { id: WORKFLOW_ID, nodes: [], connections: {} },
			data: stringify(SERVER_RUN_DATA),
		});

		const localExecutionData = () =>
			useExecutionDataStore(createExecutionDataId(EXECUTION_ID)).execution?.data;

		const trackedExecutionId = () =>
			useWorkflowExecutionStateStore(createWorkflowDocumentId(WORKFLOW_ID)).activeExecutionId;

		const trackExecution = () => {
			useWorkflowsStore().setWorkflowId(WORKFLOW_ID);
			useExecutionDataStore(createExecutionDataId(EXECUTION_ID)).setExecution({
				id: EXECUTION_ID,
				status: 'running',
				data: { resultData: { runData: {} } },
			} as IExecutionResponse);
			useWorkflowExecutionStateStore(createWorkflowDocumentId(WORKFLOW_ID)).setActiveExecutionId(
				EXECUTION_ID,
			);
		};

		const holdServerAnswer = () => {
			let answer: (execution: unknown) => void = () => {};
			vi.mocked(makeRestApiRequest).mockReturnValue(
				new Promise((resolve) => {
					answer = resolve;
				}),
			);
			return async (execution: unknown) => {
				answer(execution);
				await flushPromises();
			};
		};

		const reconnect = async () => {
			pushStore.isConnected = false;
			await flushPromises();
			pushStore.isConnected = true;
			await flushPromises();
		};

		beforeEach(() => {
			pushStore.isConnected = false;
			editorContext.executionErrorToasts.value = true;
		});

		it('does not fetch or dispatch on connect when no execution is tracked', async () => {
			pushConnection.initialize();

			await reconnect();

			expect(makeRestApiRequest).not.toHaveBeenCalled();
			expect(executionFinished).not.toHaveBeenCalled();
		});

		it('dispatches nothing on reconnect while the tracked execution is still running', async () => {
			trackExecution();
			vi.mocked(makeRestApiRequest).mockResolvedValue(serverExecution('running'));
			pushConnection.initialize();

			await reconnect();

			expect(executionFinished).not.toHaveBeenCalled();
		});

		it('dispatches nothing on reconnect while the tracked execution is waiting', async () => {
			trackExecution();
			vi.mocked(makeRestApiRequest).mockResolvedValue(serverExecution('waiting'));
			pushConnection.initialize();

			await reconnect();

			expect(executionFinished).not.toHaveBeenCalled();
		});

		it('dispatches executionFinished on reconnect when the tracked execution has finished', async () => {
			trackExecution();
			vi.mocked(makeRestApiRequest).mockResolvedValue(serverExecution('success'));
			pushConnection.initialize();

			await reconnect();

			expect(makeRestApiRequest).toHaveBeenCalledWith(
				expect.any(Object),
				'GET',
				`/executions/${EXECUTION_ID}`,
			);
			expect(executionFinished).toHaveBeenCalledTimes(1);
			expect(executionFinished).toHaveBeenCalledWith(
				{
					type: 'executionFinished',
					data: { executionId: EXECUTION_ID, workflowId: WORKFLOW_ID, status: 'success' },
				},
				expect.any(Object),
			);
		});

		it.each<ExecutionStatus>(['error', 'crashed', 'canceled'])(
			'dispatches the %s status on reconnect when the tracked execution ended with it',
			async (status) => {
				trackExecution();
				vi.mocked(makeRestApiRequest).mockResolvedValue(serverExecution(status));
				pushConnection.initialize();

				await reconnect();

				expect(executionFinished).toHaveBeenCalledWith(
					expect.objectContaining({ data: expect.objectContaining({ status }) }),
					expect.any(Object),
				);
			},
		);

		it('restores the run data from the fetched execution before dispatching the finish', async () => {
			trackExecution();
			vi.mocked(makeRestApiRequest).mockResolvedValue(serverExecution('success'));
			let runDataAtDispatch: ReturnType<typeof localExecutionData>;
			vi.mocked(executionFinished).mockImplementationOnce(async () => {
				runDataAtDispatch = localExecutionData();
			});
			pushConnection.initialize();

			await reconnect();

			expect(runDataAtDispatch).toEqual(SERVER_RUN_DATA);
		});

		it('keeps the local run data on reconnect while the tracked execution is still running', async () => {
			trackExecution();
			vi.mocked(makeRestApiRequest).mockResolvedValue(serverExecution('running'));
			pushConnection.initialize();

			await reconnect();

			expect(localExecutionData()).toEqual({ resultData: { runData: {} } });
		});

		it('keeps tracking the execution when the reconnect fetch fails', async () => {
			trackExecution();
			vi.mocked(makeRestApiRequest).mockRejectedValue(new Error('Network Error'));
			pushConnection.initialize();

			await reconnect();

			expect(trackedExecutionId()).toBe(EXECUTION_ID);
		});

		it('stops tracking the execution on reconnect when the server has no record of it', async () => {
			trackExecution();
			vi.mocked(makeRestApiRequest).mockResolvedValue(undefined);
			pushConnection.initialize();

			await reconnect();

			expect(trackedExecutionId()).toBeUndefined();
		});

		it('shows a warning on reconnect when the server has no record of the tracked execution', async () => {
			trackExecution();
			vi.mocked(makeRestApiRequest).mockResolvedValue(undefined);
			pushConnection.initialize();

			await reconnect();

			expect(showMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'warning' }));
		});

		it('shows no warning when a live finish settles the run during the reconnect fetch', async () => {
			trackExecution();
			const answerFetch = holdServerAnswer();
			pushConnection.initialize();
			await reconnect();

			useWorkflowExecutionStateStore(createWorkflowDocumentId(WORKFLOW_ID)).setActiveExecutionId(
				undefined,
			);
			await answerFetch(undefined);

			expect(showMessage).not.toHaveBeenCalled();
		});

		it('dispatches nothing when a live finish settles the run during the reconnect fetch', async () => {
			trackExecution();
			const answerFetch = holdServerAnswer();
			pushConnection.initialize();
			await reconnect();

			useWorkflowExecutionStateStore(createWorkflowDocumentId(WORKFLOW_ID)).setActiveExecutionId(
				undefined,
			);
			await answerFetch(serverExecution('success'));

			expect(executionFinished).not.toHaveBeenCalled();
		});

		it('shows no warning when the editor turns off execution error toasts', async () => {
			editorContext.executionErrorToasts.value = false;
			trackExecution();
			vi.mocked(makeRestApiRequest).mockResolvedValue(undefined);
			pushConnection.initialize();

			await reconnect();

			expect(showMessage).not.toHaveBeenCalled();
		});

		it('terminate stops the reconnect resync', async () => {
			trackExecution();
			vi.mocked(makeRestApiRequest).mockResolvedValue(serverExecution('success'));
			pushConnection.initialize();
			pushConnection.terminate();

			await reconnect();

			expect(makeRestApiRequest).not.toHaveBeenCalled();
			expect(executionFinished).not.toHaveBeenCalled();
		});
	});
});
