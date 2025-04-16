import { usePushConnection } from '@/composables/usePushConnection';
import { testWebhookReceived } from '@/composables/usePushConnection/handlers';
import type { TestWebhookReceived } from '@n8n/api-types/push/webhook';
import type { PushMessage } from '@n8n/api-types';

const removeEventListener = vi.fn();
const addEventListener = vi.fn((event: PushMessage) => removeEventListener);

vi.mock('@/stores/pushConnection.store', () => ({
	usePushConnectionStore: () => ({
		addEventListener,
	}),
}));

vi.mock('@/composables/usePushConnection/handlers', () => ({
	testWebhookDeleted: vi.fn(),
	testWebhookReceived: vi.fn(),
	reloadNodeType: vi.fn(),
	removeNodeType: vi.fn(),
	nodeDescriptionUpdated: vi.fn(),
	nodeExecuteBefore: vi.fn(),
	nodeExecuteAfter: vi.fn(),
	executionStarted: vi.fn(),
	executionWaiting: vi.fn(),
	sendWorkerStatusMessage: vi.fn(),
	sendConsoleMessage: vi.fn(),
	workflowFailedToActivate: vi.fn(),
	executionFinished: vi.fn(),
	executionRecovered: vi.fn(),
	workflowActivated: vi.fn(),
	workflowDeactivated: vi.fn(),
	collaboratorsChanged: vi.fn(),
}));

describe('usePushConnection composable', () => {
	let pushConnection: ReturnType<typeof usePushConnection>;

	beforeEach(() => {
		vi.clearAllMocks();
		pushConnection = usePushConnection();
	});

	it('should register an event listener on initialize', () => {
		pushConnection.initialize();
		expect(addEventListener).toHaveBeenCalledTimes(1);
	});

	it('should call the correct handler when an event is received', async () => {
		pushConnection.initialize();

		// Get the event callback which was registered via addEventListener.
		const fn = addEventListener.mock.calls[0][0];

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
		await fn(testEvent);

		// Allow any microtasks to complete.
		await Promise.resolve();

		// Verify that the correct handler was called.
		expect(testWebhookReceived).toHaveBeenCalledTimes(1);
		expect(testWebhookReceived).toHaveBeenCalledWith(testEvent);
	});

	it('should call removeEventListener when terminate is called', () => {
		pushConnection.initialize();
		pushConnection.terminate();

		expect(removeEventListener).toHaveBeenCalledTimes(1);
	});
});
