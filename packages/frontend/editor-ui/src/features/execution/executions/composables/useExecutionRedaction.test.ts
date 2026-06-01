import { createTestingPinia } from '@pinia/testing';
import { mockedStore } from '@/__tests__/utils';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useExecutionRedaction } from './useExecutionRedaction';
import { MODAL_CONFIRM } from '@/app/constants/modals';

const showError = vi.fn();
const confirm = vi.fn();

vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({ showError }),
}));

vi.mock('@/app/composables/useMessage', () => ({
	useMessage: () => ({ confirm }),
}));

vi.mock('vue-router', () => ({
	useRouter: () => ({}),
	useRoute: () => ({ meta: {} }),
	RouterLink: vi.fn(),
}));

describe('useExecutionRedaction()', () => {
	let workflowsStore: ReturnType<typeof mockedStore<typeof useWorkflowsStore>>;

	beforeEach(() => {
		vi.clearAllMocks();
		createTestingPinia({ stubActions: false });
		workflowsStore = mockedStore(useWorkflowsStore);
	});

	describe('computed properties', () => {
		it('should return isRedacted=false when no execution', () => {
			workflowsStore.getWorkflowExecution = null;
			const { isRedacted, canReveal, isDynamicCredentials } = useExecutionRedaction();

			expect(isRedacted.value).toBe(false);
			expect(canReveal.value).toBe(false);
			expect(isDynamicCredentials.value).toBe(false);
		});

		it('should return isRedacted=true when redactionInfo.isRedacted is true', () => {
			workflowsStore.getWorkflowExecution = {
				data: {
					redactionInfo: { isRedacted: true, reason: 'workflow_redaction_policy', canReveal: true },
				},
			} as never;

			const { isRedacted, canReveal, isDynamicCredentials } = useExecutionRedaction();

			expect(isRedacted.value).toBe(true);
			expect(canReveal.value).toBe(true);
			expect(isDynamicCredentials.value).toBe(false);
		});

		it('should detect dynamic credentials reason', () => {
			workflowsStore.getWorkflowExecution = {
				data: {
					redactionInfo: {
						isRedacted: true,
						reason: 'dynamic_credentials',
						canReveal: false,
					},
				},
			} as never;

			const { isDynamicCredentials, canReveal } = useExecutionRedaction();

			expect(isDynamicCredentials.value).toBe(true);
			expect(canReveal.value).toBe(false);
		});
	});

	describe('revealData', () => {
		it('should not fetch when user cancels confirmation', async () => {
			workflowsStore.getWorkflowExecution = {
				id: 'exec-123',
				data: {
					redactionInfo: { isRedacted: true, reason: 'workflow_redaction_policy', canReveal: true },
				},
			} as never;

			confirm.mockResolvedValue('cancel');

			const { revealData } = useExecutionRedaction();
			await revealData();

			expect(workflowsStore.fetchExecutionDataById).not.toHaveBeenCalled();
		});

		it('should fetch with redactExecutionData=false on confirm', async () => {
			const revealedData = { resultData: { runData: { Node: [] } } };
			workflowsStore.getWorkflowExecution = {
				id: 'exec-123',
				data: {
					redactionInfo: { isRedacted: true, reason: 'workflow_redaction_policy', canReveal: true },
				},
			} as never;

			confirm.mockResolvedValue(MODAL_CONFIRM);
			workflowsStore.fetchExecutionDataById = vi.fn().mockResolvedValue({
				data: revealedData,
			});

			const { revealData } = useExecutionRedaction();
			await revealData();

			expect(workflowsStore.fetchExecutionDataById).toHaveBeenCalledWith('exec-123', {
				redactExecutionData: false,
			});
			expect(workflowsStore.setWorkflowExecutionRunData).toHaveBeenCalledWith(revealedData);
		});

		it('should show error toast when fetch fails', async () => {
			workflowsStore.getWorkflowExecution = {
				id: 'exec-123',
				data: {
					redactionInfo: { isRedacted: true, reason: 'workflow_redaction_policy', canReveal: true },
				},
			} as never;

			const error = new Error('Forbidden');
			confirm.mockResolvedValue(MODAL_CONFIRM);
			workflowsStore.fetchExecutionDataById = vi.fn().mockRejectedValue(error);

			const { revealData } = useExecutionRedaction();
			await revealData();

			expect(showError).toHaveBeenCalledWith(error, expect.any(String));
		});

		it('should not fetch when execution id is missing', async () => {
			workflowsStore.getWorkflowExecution = {
				data: {
					redactionInfo: { isRedacted: true, reason: 'workflow_redaction_policy', canReveal: true },
				},
			} as never;

			confirm.mockResolvedValue(MODAL_CONFIRM);

			const { revealData } = useExecutionRedaction();
			await revealData();

			expect(workflowsStore.fetchExecutionDataById).not.toHaveBeenCalled();
		});
	});
});
