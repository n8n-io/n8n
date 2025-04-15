import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { PushMessage } from '@n8n/api-types';

// Stub the push store
const addEventListenerMock = vi.fn();
const removeEventListenerMock = vi.fn();

vi.mock('@/stores/pushConnection.store', () => ({
	usePushConnectionStore: () => ({
		addEventListener: addEventListenerMock.mockImplementation(
			(cb: (event: PushMessage) => void) => {
				// Return the removal callback
				return removeEventListenerMock;
			},
		),
	}),
}));

// Stub the handler functions. Each handler returns a resolved promise.
const testWebhookDeleted = vi.fn(async (event: any) => Promise.resolve('deleted'));
const testWebhookReceived = vi.fn(async (event: any) => Promise.resolve('received'));
const reloadNodeType = vi.fn(async (event: any) => Promise.resolve('reload'));
const removeNodeType = vi.fn(async (event: any) => Promise.resolve('remove'));
const nodeDescriptionUpdated = vi.fn(async (event: any) => Promise.resolve('description'));
const nodeExecuteBefore = vi.fn(async (event: any) => Promise.resolve('before'));
const nodeExecuteAfter = vi.fn(async (event: any) => Promise.resolve('after'));
const executionStarted = vi.fn(async (event: any) => Promise.resolve('started'));
const executionWaiting = vi.fn(async (event: any) => Promise.resolve('waiting'));
const sendWorkerStatusMessage = vi.fn(async (event: any) => Promise.resolve('worker'));
const sendConsoleMessage = vi.fn(async (event: any) => Promise.resolve('console'));
const workflowFailedToActivate = vi.fn(async (event: any) => Promise.resolve('failed'));
const executionFinished = vi.fn(async (event: any) => Promise.resolve('finished'));
const executionRecovered = vi.fn(async (event: any) => Promise.resolve('recovered'));
const workflowActivated = vi.fn(async (event: any) => Promise.resolve('activated'));
const workflowDeactivated = vi.fn(async (event: any) => Promise.resolve('deactivated'));
const collaboratorsChanged = vi.fn(async (event: any) => Promise.resolve('collab'));

vi.mock('@/composables/usePushConnection/handlers', () => ({
	testWebhookDeleted,
	testWebhookReceived,
	reloadNodeType,
	removeNodeType,
	nodeDescriptionUpdated,
	nodeExecuteBefore,
	nodeExecuteAfter,
	executionStarted,
	executionWaiting,
	sendWorkerStatusMessage,
	sendConsoleMessage,
	workflowFailedToActivate,
	executionFinished,
	executionRecovered,
	workflowActivated,
	workflowDeactivated,
	collaboratorsChanged,
}));

// Now import the composable to test.
import { usePushConnection } from '@/composables/usePushConnection';

describe('usePushConnection composable', () => {
	let pushConnection: ReturnType<typeof usePushConnection>;

	beforeEach(() => {
		vi.clearAllMocks();
		pushConnection = usePushConnection();
	});

	afterEach(() => {
		// In case some test leaves fake timers active or similar,
		// restore them.
		vi.useRealTimers();
	});

	it('should register an event listener on initialize', () => {
		pushConnection.initialize();
		expect(addEventListenerMock).toHaveBeenCalledTimes(1);
	});

	it('should call the correct handler when an event is received', async () => {
		pushConnection.initialize();

		// Get the event callback which was registered via addEventListener.
		const eventCallback = addEventListenerMock.mock.calls[0][0];

		// Create a test event for one of the handled types.
		// In this test, we simulate the event type 'testWebhookReceived'.
		const testEvent: PushMessage = { type: 'testWebhookReceived', payload: 'dummy' } as PushMessage;

		// Call the event callback with our test event.
		await eventCallback(testEvent);

		// Allow any microtasks to complete.
		await Promise.resolve();

		// Verify that the correct handler was called.
		expect(testWebhookReceived).toHaveBeenCalledTimes(1);
		expect(testWebhookReceived).toHaveBeenCalledWith(testEvent);
	});

	it('should call removeEventListener when terminate is called', () => {
		pushConnection.initialize();
		pushConnection.terminate();

		expect(removeEventListenerMock).toHaveBeenCalledTimes(1);
	});
});
