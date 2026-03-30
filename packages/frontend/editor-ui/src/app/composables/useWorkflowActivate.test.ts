import { useWorkflowActivate } from './useWorkflowActivate';
import * as activationConfirmation from '@/app/composables/useWorkflowActivateConfirmation';

const mockOpenModal = vi.fn();
vi.mock('@/app/stores/ui.store', () => ({
	useUIStore: vi.fn(() => ({
		openModal: mockOpenModal,
		openModalWithData: vi.fn(),
	})),
}));

const mockPublishWorkflow = vi.fn();
const mockSetWorkflowActive = vi.fn();
const mockSetWorkflowInactive = vi.fn();
const mockSetWorkflowVersionData = vi.fn();
vi.mock('@/app/stores/workflows.store', () => ({
	useWorkflowsStore: vi.fn(() => ({
		workflowId: 'wf-1',
		publishWorkflow: mockPublishWorkflow,
		setWorkflowActive: mockSetWorkflowActive,
		setWorkflowInactive: mockSetWorkflowInactive,
		setWorkflowVersionData: mockSetWorkflowVersionData,
		versionData: null,
	})),
}));

vi.mock('@/app/stores/workflowsList.store', () => ({
	useWorkflowsListStore: vi.fn(() => ({
		getWorkflowById: vi.fn(() => ({ activeVersion: null })),
		fetchWorkflow: vi.fn(),
	})),
}));

const mockSetActiveState = vi.fn();
const mockSetChecksum = vi.fn();
vi.mock('@/app/stores/workflowDocument.store', () => ({
	useWorkflowDocumentStore: vi.fn(() => ({
		checksum: 'test-checksum',
		setActiveState: mockSetActiveState,
		setChecksum: mockSetChecksum,
	})),
	createWorkflowDocumentId: vi.fn((id: string) => id),
}));

vi.mock('@/app/composables/useStorage', () => ({
	useStorage: vi.fn(() => ({ value: 'false' })),
}));

vi.mock('@/app/composables/useExternalHooks', () => ({
	useExternalHooks: vi.fn(() => ({
		run: vi.fn(),
	})),
}));

vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: vi.fn(() => ({
		track: vi.fn(),
	})),
}));

vi.mock('@/app/composables/useToast', () => ({
	useToast: vi.fn(() => ({
		showError: vi.fn(),
	})),
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: vi.fn(() => ({
		baseText: vi.fn((key: string) => key),
	})),
}));

vi.mock('@/features/collaboration/collaboration/collaboration.store', () => ({
	useCollaborationStore: vi.fn(() => ({
		requestWriteAccess: vi.fn(),
	})),
}));

vi.mock('@/app/composables/useWorkflowActivateConfirmation');

const ACTIVATION_MODAL_KEY = 'activation';

function mockSuccessfulApiResponse() {
	mockPublishWorkflow.mockResolvedValue({
		activeVersion: { versionId: 'v-1' },
		checksum: 'new-checksum',
		versionId: 'v-1',
	});
}

describe('useWorkflowActivate', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('publishWorkflow', () => {
		it('should wait for activation confirmation before showing success modal', async () => {
			mockSuccessfulApiResponse();
			vi.mocked(activationConfirmation.waitForActivationConfirmation).mockResolvedValue(true);

			const { publishWorkflow } = useWorkflowActivate();
			const result = await publishWorkflow('wf-1', 'v-1');

			expect(activationConfirmation.waitForActivationConfirmation).toHaveBeenCalledWith(
				'wf-1',
				'v-1',
			);
			expect(result).toEqual({ success: true });
			expect(mockOpenModal).toHaveBeenCalledWith(ACTIVATION_MODAL_KEY);
		});

		it('should not show success modal when confirmation fails', async () => {
			mockSuccessfulApiResponse();
			vi.mocked(activationConfirmation.waitForActivationConfirmation).mockResolvedValue(false);

			const { publishWorkflow } = useWorkflowActivate();
			const result = await publishWorkflow('wf-1', 'v-1');

			expect(result).toEqual({ success: false, errorHandled: true });
			expect(mockOpenModal).not.toHaveBeenCalled();
		});

		it('should cancel confirmation listener and return errorHandled when API call fails', async () => {
			mockPublishWorkflow.mockRejectedValue(new Error('API error'));
			vi.mocked(activationConfirmation.waitForActivationConfirmation).mockResolvedValue(true);

			const { publishWorkflow } = useWorkflowActivate();
			const result = await publishWorkflow('wf-1', 'v-1');

			expect(activationConfirmation.cancelActivationConfirmation).toHaveBeenCalledWith('wf-1');
			expect(result).toEqual({ success: false, errorHandled: true });
		});

		it('should register confirmation listener before the API call', async () => {
			const callOrder: string[] = [];

			vi.mocked(activationConfirmation.waitForActivationConfirmation).mockImplementation(
				async () => {
					callOrder.push('waitForConfirmation');
					return true;
				},
			);
			mockPublishWorkflow.mockImplementation(async () => {
				callOrder.push('publishApi');
				return {
					activeVersion: { versionId: 'v-1' },
					checksum: 'new-checksum',
					versionId: 'v-1',
				};
			});

			const { publishWorkflow } = useWorkflowActivate();
			await publishWorkflow('wf-1', 'v-1');

			expect(callOrder.indexOf('waitForConfirmation')).toBeLessThan(
				callOrder.indexOf('publishApi'),
			);
		});
	});
});
