import { usePushConnection } from '@/app/composables/usePushConnection';
import {
	testWebhookReceived,
	builderCreditsUpdated,
	reconcileExecutionStateOnReconnect,
} from '@/app/composables/usePushConnection/handlers';
import type { TestWebhookReceived } from '@n8n/api-types/push/webhook';
import type { BuilderCreditsPushMessage } from '@n8n/api-types/push/builder-credits';
import { useRouter } from 'vue-router';
import type { OnPushMessageHandler } from '@/app/stores/pushConnection.store';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick, ref } from 'vue';

const removeEventListener = vi.fn();
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const addEventListener = vi.fn((_handler: OnPushMessageHandler) => removeEventListener);
const isConnected = ref(false);

vi.mock('@/app/stores/pushConnection.store', () => ({
	usePushConnectionStore: () => ({
		addEventListener,
		get isConnected() {
			return isConnected.value;
		},
	}),
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
	reconcileExecutionStateOnReconnect: vi.fn(),
	workflowActivated: vi.fn(),
	workflowDeactivated: vi.fn(),
	collaboratorsChanged: vi.fn(),
	builderCreditsUpdated: vi.fn(),
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
		isConnected.value = false;

		setActivePinia(createPinia());

		const router = useRouter();
		pushConnection = usePushConnection({ router });
	});

	afterEach(() => {
		// The composable is created outside a component scope in these tests, so
		// its reconnect watcher isn't auto-disposed — stop it to prevent leaking
		// watchers across tests that share the module-level `isConnected` ref.
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

	it('should call removeEventListener when terminate is called', () => {
		pushConnection.initialize();
		pushConnection.terminate();

		expect(removeEventListener).toHaveBeenCalledTimes(1);
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

	describe('execution state reconciliation on reconnect', () => {
		it('should not reconcile on the initial connect', async () => {
			pushConnection.initialize();

			isConnected.value = true;
			await nextTick();

			expect(reconcileExecutionStateOnReconnect).not.toHaveBeenCalled();
		});

		it('should reconcile execution state on reconnect', async () => {
			pushConnection.initialize();

			// Initial connect, then a drop and a reconnect.
			isConnected.value = true;
			await nextTick();
			isConnected.value = false;
			await nextTick();
			isConnected.value = true;
			await nextTick();

			expect(reconcileExecutionStateOnReconnect).toHaveBeenCalledTimes(1);
			expect(reconcileExecutionStateOnReconnect).toHaveBeenCalledWith(expect.any(Object));
		});

		it('should treat a connection already established at setup as the initial connect', async () => {
			isConnected.value = true;
			pushConnection.initialize();

			// A drop and reconnect after an already-live connection is a reconnect.
			isConnected.value = false;
			await nextTick();
			isConnected.value = true;
			await nextTick();

			expect(reconcileExecutionStateOnReconnect).toHaveBeenCalledTimes(1);
		});

		it('should stop reconciling after terminate', async () => {
			pushConnection.initialize();

			isConnected.value = true;
			await nextTick();
			pushConnection.terminate();

			isConnected.value = false;
			await nextTick();
			isConnected.value = true;
			await nextTick();

			expect(reconcileExecutionStateOnReconnect).not.toHaveBeenCalled();
		});
	});
});
