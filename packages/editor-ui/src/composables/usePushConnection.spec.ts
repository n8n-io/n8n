import { usePushConnection } from '@/composables/usePushConnection';
import { useRouter } from 'vue-router';
import { createPinia, setActivePinia } from 'pinia';
import { usePushConnectionStore } from '@/stores/pushConnection.store';
import { useCollaborationStore } from '@/stores/collaboration.store';
import type { IPushData, PushDataWorkerStatusMessage } from '@/Interface';
import { useOrchestrationStore } from '@/stores/orchestration.store';

vi.mock('vue-router', () => {
	return {
		RouterLink: vi.fn(),
		useRouter: () => ({
			push: vi.fn(),
		}),
	};
});

vi.useFakeTimers();

describe('usePushConnection()', () => {
	let router: ReturnType<typeof useRouter>;
	let pushStore: ReturnType<typeof usePushConnectionStore>;
	let collaborationStore: ReturnType<typeof useCollaborationStore>;
	let orchestrationStore: ReturnType<typeof useOrchestrationStore>;
	let pushConnection: ReturnType<typeof usePushConnection>;

	beforeEach(() => {
		setActivePinia(createPinia());

		router = vi.mocked(useRouter)();
		pushStore = usePushConnectionStore();
		collaborationStore = useCollaborationStore();
		orchestrationStore = useOrchestrationStore();
		pushConnection = usePushConnection({ router });
	});

	describe('initialize()', () => {
		it('should add event listener to the pushStore', () => {
			const spy = vi.spyOn(pushStore, 'addEventListener').mockImplementation(() => () => {});

			pushConnection.initialize();

			expect(spy).toHaveBeenCalled();
		});

		it('should initialize collaborationStore', () => {
			const spy = vi.spyOn(collaborationStore, 'initialize').mockImplementation(() => {});
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

		it('should terminate collaborationStore', () => {
			const spy = vi.spyOn(collaborationStore, 'terminate').mockImplementation(() => {});
			pushConnection.terminate();
			expect(spy).toHaveBeenCalled();
		});
	});

	describe('queuePushMessage()', () => {
		it('should add message to the queue and sets timeout if not already set', () => {
			const event: IPushData = {
				type: 'sendWorkerStatusMessage',
				data: {
					workerId: '1',
					status: {},
				},
			} as PushDataWorkerStatusMessage;

			pushConnection.queuePushMessage(event, 5);

			expect(pushConnection.pushMessageQueue.value).toHaveLength(1);
			expect(pushConnection.pushMessageQueue.value[0]).toEqual({ message: event, retriesLeft: 5 });
			expect(pushConnection.retryTimeout.value).not.toBeNull();
		});
	});

	describe('processWaitingPushMessages()', () => {
		it('should clear the queue and reset the timeout', async () => {
			const event: IPushData = { type: 'executionRecovered', data: { executionId: '1' } };

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
				const event: IPushData = {
					type: 'sendWorkerStatusMessage',
					data: {
						workerId: '1',
						status: {},
					},
				} as PushDataWorkerStatusMessage;

				const result = await pushConnection.pushMessageReceived(event);

				expect(spy).toHaveBeenCalledWith(event.data.status);
				expect(result).toBeTruthy();
			});
		});
	});
});
