import { usePushConnection } from '@/app/composables/usePushConnection';
import { builderCreditsUpdated } from '@/app/composables/usePushConnection/handlers';
import type { TestWebhookReceived } from '@n8n/api-types/push/webhook';
import type { BuilderCreditsPushMessage } from '@n8n/api-types/push/builder-credits';
import type { OnPushMessageHandler } from '@/app/stores/pushConnection.store';
import { createPinia, setActivePinia } from 'pinia';

const removeEventListener = vi.fn();
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const addEventListener = vi.fn((_handler: OnPushMessageHandler) => removeEventListener);

vi.mock('@/app/stores/pushConnection.store', () => ({
	usePushConnectionStore: () => ({
		addEventListener,
	}),
}));

const mockTestWebhookReceived = vi.fn();

vi.mock('@/app/composables/usePushConnection/handlers', () => ({
	useTestWebhookDeleted: vi.fn(() => ({ testWebhookDeleted: vi.fn() })),
	useTestWebhookReceived: vi.fn(() => ({ testWebhookReceived: mockTestWebhookReceived })),
	reloadNodeType: vi.fn(),
	removeNodeType: vi.fn(),
	nodeDescriptionUpdated: vi.fn(),
	useNodeExecuteBefore: vi.fn(() => ({ nodeExecuteBefore: vi.fn() })),
	useNodeExecuteAfter: vi.fn(() => ({ nodeExecuteAfter: vi.fn() })),
	nodeExecuteAfterData: vi.fn(),
	executionStarted: vi.fn(),
	sendWorkerStatusMessage: vi.fn(),
	sendConsoleMessage: vi.fn(),
	useWorkflowFailedToActivate: vi.fn(() => ({ workflowFailedToActivate: vi.fn() })),
	useExecutionFinished: vi.fn(() => ({ executionFinished: vi.fn() })),
	useExecutionRecovered: vi.fn(() => ({ executionRecovered: vi.fn() })),
	useWorkflowActivated: vi.fn(() => ({ workflowActivated: vi.fn() })),
	useWorkflowDeactivated: vi.fn(() => ({ workflowDeactivated: vi.fn() })),
	useWorkflowAutoDeactivated: vi.fn(() => ({ workflowAutoDeactivated: vi.fn() })),
	workflowSettingsUpdated: vi.fn(),
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

		setActivePinia(createPinia());

		pushConnection = usePushConnection();
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
		expect(mockTestWebhookReceived).toHaveBeenCalledTimes(1);
		expect(mockTestWebhookReceived).toHaveBeenCalledWith(testEvent);
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
