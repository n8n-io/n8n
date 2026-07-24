import { usePushConnection } from '@/app/composables/usePushConnection';
import {
	testWebhookReceived,
	builderCreditsUpdated,
	resumeComplete,
} from '@/app/composables/usePushConnection/handlers';
import type { TestWebhookReceived } from '@n8n/api-types/push/webhook';
import type { BuilderCreditsPushMessage } from '@n8n/api-types/push/builder-credits';
import type { ResumeComplete } from '@n8n/api-types';
import { useRouter } from 'vue-router';
import type { OnPushMessageHandler } from '@/app/stores/pushConnection.store';
import { createPinia, setActivePinia } from 'pinia';

const removeEventListener = vi.fn();
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const addEventListener = vi.fn((_handler: OnPushMessageHandler) => removeEventListener);
const removeConnectedHandler = vi.fn();
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const addConnectedHandler = vi.fn((_handler: () => void) => removeConnectedHandler);
const send = vi.fn();

vi.mock('@/app/stores/pushConnection.store', () => ({
	usePushConnectionStore: () => ({
		addEventListener,
		addConnectedHandler,
		send,
	}),
}));

// The resume handshake reads the single tracked execution id. Controlled per
// test via `mockActiveExecutionId`.
let mockActiveExecutionId: string | null | undefined;
vi.mock('@/app/stores/workflowExecutionState.store', () => ({
	useWorkflowExecutionStateStore: vi.fn(() => ({
		get activeExecutionId() {
			return mockActiveExecutionId;
		},
	})),
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
	resumeComplete: vi.fn(),
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
		mockActiveExecutionId = undefined;

		setActivePinia(createPinia());

		const router = useRouter();
		pushConnection = usePushConnection({ router });
	});

	it('should register an event listener on initialize', () => {
		pushConnection.initialize();
		expect(addEventListener).toHaveBeenCalledTimes(1);
	});

	it('should register a connected handler on initialize', () => {
		pushConnection.initialize();
		expect(addConnectedHandler).toHaveBeenCalledTimes(1);
	});

	describe('resume handshake on (re)connect', () => {
		const triggerConnected = () => {
			pushConnection.initialize();
			const connectedHandler = addConnectedHandler.mock.calls[0][0];
			connectedHandler();
		};

		it('sends a resume message with no id when no execution is tracked', () => {
			mockActiveExecutionId = undefined;

			triggerConnected();

			expect(send).toHaveBeenCalledWith({ type: 'resume', data: { awaiting: [] } });
		});

		it('sends a resume message with the single tracked execution id', () => {
			mockActiveExecutionId = 'exec-1';

			triggerConnected();

			expect(send).toHaveBeenCalledWith({ type: 'resume', data: { awaiting: ['exec-1'] } });
		});

		it('omits a pending (null) execution id from the resume message', () => {
			// `activeExecutionId === null` means a run started but the backend id is
			// not yet known — there is nothing to await by id.
			mockActiveExecutionId = null;

			triggerConnected();

			expect(send).toHaveBeenCalledWith({ type: 'resume', data: { awaiting: [] } });
		});
	});

	it('should dispatch resumeComplete events to the resumeComplete handler', async () => {
		pushConnection.initialize();

		const handler = addEventListener.mock.calls[0][0];

		const testEvent: ResumeComplete = { type: 'resumeComplete', data: {} };
		handler(testEvent);

		await Promise.resolve();

		expect(resumeComplete).toHaveBeenCalledTimes(1);
		expect(resumeComplete).toHaveBeenCalledWith(testEvent);
	});

	it('should unregister the connected handler when terminate is called', () => {
		pushConnection.initialize();
		pushConnection.terminate();

		expect(removeConnectedHandler).toHaveBeenCalledTimes(1);
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
});
