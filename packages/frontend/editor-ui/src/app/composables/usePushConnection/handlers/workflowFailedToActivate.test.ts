import { workflowFailedToActivate } from './workflowFailedToActivate';
import type { WorkflowFailedToActivate } from '@n8n/api-types/push/workflow';
import type { WorkflowState } from '@/app/composables/useWorkflowState';
import * as activationConfirmation from '@/app/composables/useWorkflowActivateConfirmation';

vi.mock('@/app/stores/workflows.store', () => ({
	useWorkflowsStore: vi.fn(() => ({
		workflowId: 'wf-1',
		setWorkflowInactive: vi.fn(),
	})),
}));

vi.mock('@/app/stores/workflowDocument.store', () => ({
	injectWorkflowDocumentStore: vi.fn(() => ({
		value: { setActiveState: vi.fn() },
	})),
}));

const mockCloseModal = vi.fn();
vi.mock('@/app/stores/ui.store', () => ({
	useUIStore: vi.fn(() => ({
		closeModal: mockCloseModal,
	})),
}));

const mockShowError = vi.fn();
vi.mock('@/app/composables/useToast', () => ({
	useToast: vi.fn(() => ({
		showError: mockShowError,
	})),
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: vi.fn(() => ({
		baseText: vi.fn((key: string, opts?: { interpolate?: Record<string, string> }) => {
			if (opts?.interpolate) {
				return `${key}[${JSON.stringify(opts.interpolate)}]`;
			}
			return key;
		}),
	})),
}));

vi.mock('@/app/composables/useWorkflowActivateConfirmation');

describe('workflowFailedToActivate', () => {
	const options = { workflowState: {} as WorkflowState };

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should reject pending activation confirmation', async () => {
		vi.mocked(activationConfirmation.rejectActivationConfirmation).mockReturnValue(true);

		const event: WorkflowFailedToActivate = {
			type: 'workflowFailedToActivate',
			data: { workflowId: 'wf-1', errorMessage: 'Webhook registration failed' },
		};

		await workflowFailedToActivate(event, options);

		expect(activationConfirmation.rejectActivationConfirmation).toHaveBeenCalledWith('wf-1');
	});

	it('should close the activation success modal', async () => {
		vi.mocked(activationConfirmation.rejectActivationConfirmation).mockReturnValue(false);

		const event: WorkflowFailedToActivate = {
			type: 'workflowFailedToActivate',
			data: { workflowId: 'wf-1', errorMessage: 'error' },
		};

		await workflowFailedToActivate(event, options);

		expect(mockCloseModal).toHaveBeenCalledWith('activation');
	});

	it('should show error toast when there is no pending confirmation', async () => {
		vi.mocked(activationConfirmation.rejectActivationConfirmation).mockReturnValue(false);

		const event: WorkflowFailedToActivate = {
			type: 'workflowFailedToActivate',
			data: { workflowId: 'wf-1', errorMessage: 'Webhook failed' },
		};

		await workflowFailedToActivate(event, options);

		expect(mockShowError).toHaveBeenCalledWith(
			expect.any(Error),
			expect.stringContaining('"newStateName":"published"'),
		);
	});

	it('should not show error toast when a pending confirmation was consumed', async () => {
		vi.mocked(activationConfirmation.rejectActivationConfirmation).mockReturnValue(true);

		const event: WorkflowFailedToActivate = {
			type: 'workflowFailedToActivate',
			data: { workflowId: 'wf-1', errorMessage: 'Webhook failed' },
		};

		await workflowFailedToActivate(event, options);

		expect(mockShowError).not.toHaveBeenCalled();
	});

	it('should skip processing when workflowId does not match current workflow', async () => {
		const event: WorkflowFailedToActivate = {
			type: 'workflowFailedToActivate',
			data: { workflowId: 'wf-other', errorMessage: 'error' },
		};

		await workflowFailedToActivate(event, options);

		expect(activationConfirmation.rejectActivationConfirmation).not.toHaveBeenCalled();
		expect(mockCloseModal).not.toHaveBeenCalled();
		expect(mockShowError).not.toHaveBeenCalled();
	});
});
