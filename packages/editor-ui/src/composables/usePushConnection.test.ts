import { stringify } from 'flatted';
import { useRouter } from 'vue-router';
import { createPinia, setActivePinia } from 'pinia';
import type { PushMessage, PushPayload } from '@n8n/api-types';
import { mock } from 'vitest-mock-extended';
import type { WorkflowOperationError } from 'n8n-workflow';

import { usePushConnection } from '@/composables/usePushConnection';
import { usePushConnectionStore } from '@/stores/pushConnection.store';
import { useOrchestrationStore } from '@/stores/orchestration.store';
import { useUIStore } from '@/stores/ui.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useToast } from '@/composables/useToast';
import type { IExecutionResponse } from '@/Interface';

vi.mock('vue-router', () => {
	return {
		RouterLink: vi.fn(),
		useRouter: () => ({
			push: vi.fn(),
		}),
		useRoute: () => ({}),
	};
});

vi.mock('@/composables/useToast', () => {
	const showMessage = vi.fn();
	const showError = vi.fn();
	return {
		useToast: () => {
			return {
				showMessage,
				showError,
			};
		},
	};
});

vi.useFakeTimers();

describe('usePushConnection()', () => {
	let router: ReturnType<typeof useRouter>;
	let pushStore: ReturnType<typeof usePushConnectionStore>;
	let orchestrationStore: ReturnType<typeof useOrchestrationStore>;
	let pushConnection: ReturnType<typeof usePushConnection>;
	let uiStore: ReturnType<typeof useUIStore>;
	let workflowsStore: ReturnType<typeof useWorkflowsStore>;
	let toast: ReturnType<typeof useToast>;

	beforeEach(() => {
		setActivePinia(createPinia());

		router = vi.mocked(useRouter)();
		pushStore = usePushConnectionStore();
		orchestrationStore = useOrchestrationStore();
		uiStore = useUIStore();
		workflowsStore = useWorkflowsStore();
		pushConnection = usePushConnection({ router });
		toast = useToast();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('initialize()', () => {
		it('should add event listener to the pushStore', () => {
			const spy = vi.spyOn(pushStore, 'addEventListener').mockImplementation(() => () => {});

			pushConnection.initialize();

			expect(spy).toHaveBeenCalled();
		});
	});

	describe('terminate()', () => {
		it('should remove event listener from the pushStore', () => {
			const returnFn = vi.fn();
			vi.spyOn(pushStore, 'addEventListener').mockImplementation(() => returnFn);

			pushConnection.initialize();
			pushConnection.terminate();

			expect(returnFn).toHaveBeenCalled();
		});
	});

	describe('queuePushMessage()', () => {
		it('should add message to the queue and sets timeout if not already set', () => {
			const event: PushMessage = {
				type: 'sendWorkerStatusMessage',
				data: {
					workerId: '1',
					status: {} as PushPayload<'sendWorkerStatusMessage'>['status'],
				},
			};

			pushConnection.queuePushMessage(event, 5);

			expect(pushConnection.pushMessageQueue.value).toHaveLength(1);
			expect(pushConnection.pushMessageQueue.value[0]).toEqual({ message: event, retriesLeft: 5 });
			expect(pushConnection.retryTimeout.value).not.toBeNull();
		});
	});

	describe('processWaitingPushMessages()', () => {
		it('should clear the queue and reset the timeout', async () => {
			const event: PushMessage = { type: 'executionRecovered', data: { executionId: '1' } };

			pushConnection.queuePushMessage(event, 0);
			expect(pushConnection.pushMessageQueue.value).toHaveLength(1);
			expect(pushConnection.retryTimeout.value).toBeDefined();

			await pushConnection.processWaitingPushMessages();

			expect(pushConnection.pushMessageQueue.value).toHaveLength(0);
			expect(pushConnection.retryTimeout.value).toBeNull();
		});
	});

	describe('pushMessageReceived()', () => {
		describe('sendWorkerStatusMessage', () => {
			it('should handle event type correctly', async () => {
				const spy = vi.spyOn(orchestrationStore, 'updateWorkerStatus').mockImplementation(() => {});
				const event: PushMessage = {
					type: 'sendWorkerStatusMessage',
					data: {
						workerId: '1',
						status: {} as PushPayload<'sendWorkerStatusMessage'>['status'],
					},
				};

				const result = await pushConnection.pushMessageReceived(event);

				expect(spy).toHaveBeenCalledWith(event.data.status);
				expect(result).toBeTruthy();
			});
		});

		describe('executionFinished', () => {
			const executionId = '1';
			const event: PushMessage = {
				type: 'executionFinished',
				data: { executionId: '1' },
			};

			beforeEach(() => {
				workflowsStore.activeExecutionId = executionId;
				uiStore.isActionActive.workflowRunning = true;
			});

			it('should handle executionFinished event correctly', async () => {
				const spy = vi.spyOn(workflowsStore, 'fetchExecutionDataById').mockResolvedValue(
					mock<IExecutionResponse>({
						id: executionId,
						data: stringify({
							resultData: {
								runData: {},
							},
						}) as unknown as IExecutionResponse['data'],
						finished: true,
						mode: 'manual',
						startedAt: new Date(),
						stoppedAt: new Date(),
						status: 'success',
					}),
				);

				const result = await pushConnection.pushMessageReceived(event);

				expect(result).toBeTruthy();
				expect(workflowsStore.workflowExecutionData).toBeDefined();
				expect(uiStore.isActionActive['workflowRunning']).toBeTruthy();
				expect(spy).toHaveBeenCalledWith(executionId);

				expect(toast.showMessage).toHaveBeenCalledWith({
					title: 'Workflow executed successfully',
					type: 'success',
				});
			});

			it('should handle isManualExecutionCancelled correctly', async () => {
				const spy = vi.spyOn(workflowsStore, 'fetchExecutionDataById').mockResolvedValue(
					mock<IExecutionResponse>({
						id: executionId,
						data: stringify({
							startData: {},
							resultData: {
								runData: {
									'Last Node': [],
								},
								lastNodeExecuted: 'Last Node',
								error: {
									message:
										'Your trial has ended. <a href="https://app.n8n.cloud/account/change-plan">Upgrade now</a> to keep automating',
									name: 'NodeApiError',
									node: 'Last Node',
								} as unknown as WorkflowOperationError,
							},
						}) as unknown as IExecutionResponse['data'],
						mode: 'manual',
						startedAt: new Date(),
						status: 'running',
					}),
				);

				const result = await pushConnection.pushMessageReceived(event);

				expect(useToast().showMessage).toHaveBeenCalledWith({
					message:
						'Your trial has ended. <a href="https://app.n8n.cloud/account/change-plan">Upgrade now</a> to keep automating',
					title: 'Problem in node ‘Last Node‘',
					type: 'error',
					duration: 0,
					dangerouslyUseHTMLString: true,
				});

				expect(result).toBeTruthy();
				expect(workflowsStore.workflowExecutionData).toBeDefined();
				expect(uiStore.isActionActive.workflowRunning).toBeTruthy();
				expect(spy).toHaveBeenCalledWith(executionId);
			});
		});
	});
});
