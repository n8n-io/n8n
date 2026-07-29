import { createTestingPinia } from '@pinia/testing';
import { mockedStore } from '@/__tests__/utils';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import { createWorkflowDocumentId } from '@/app/stores/workflowDocument.store';
import { createExecutionDataId, useExecutionDataStore } from '@/app/stores/executionData.store';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';
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

	// The composable reads the execution through the injected workflow document
	// scope; with nothing provided it falls back to the workflows store's
	// (empty) workflow id, so seed the execution-state store keyed by that id.
	// Testing pinia makes store getters writable at runtime; the cast makes
	// that writability visible to the type checker.
	function setActiveExecution(execution: IExecutionResponse | null) {
		const executionStateStore = mockedStore(
			useWorkflowExecutionStateStore,
			createWorkflowDocumentId(''),
		) as unknown as { activeExecution: IExecutionResponse | null };
		executionStateStore.activeExecution = execution;
	}

	beforeEach(() => {
		vi.clearAllMocks();
		createTestingPinia({ stubActions: false });
		workflowsStore = mockedStore(useWorkflowsStore);
	});

	describe('computed properties', () => {
		it('should return isRedacted=false when no execution', () => {
			setActiveExecution(null);
			const { isRedacted, canReveal, isDynamicCredentials } = useExecutionRedaction();

			expect(isRedacted.value).toBe(false);
			expect(canReveal.value).toBe(false);
			expect(isDynamicCredentials.value).toBe(false);
		});

		it('should return isRedacted=true when redactionInfo.isRedacted is true', () => {
			setActiveExecution({
				data: {
					redactionInfo: { isRedacted: true, reason: 'workflow_redaction_policy', canReveal: true },
				},
			} as never);

			const { isRedacted, canReveal, isDynamicCredentials } = useExecutionRedaction();

			expect(isRedacted.value).toBe(true);
			expect(canReveal.value).toBe(true);
			expect(isDynamicCredentials.value).toBe(false);
		});

		it('should detect dynamic credentials reason', () => {
			setActiveExecution({
				data: {
					redactionInfo: {
						isRedacted: true,
						reason: 'dynamic_credentials',
						canReveal: false,
					},
				},
			} as never);

			const { isDynamicCredentials, canReveal } = useExecutionRedaction();

			expect(isDynamicCredentials.value).toBe(true);
			expect(canReveal.value).toBe(false);
		});
	});

	describe('revealData', () => {
		it('should not fetch when user cancels confirmation', async () => {
			setActiveExecution({
				id: 'exec-123',
				data: {
					redactionInfo: { isRedacted: true, reason: 'workflow_redaction_policy', canReveal: true },
				},
			} as never);

			confirm.mockResolvedValue('cancel');

			const { revealData } = useExecutionRedaction();
			await revealData();

			expect(workflowsStore.fetchExecutionDataById).not.toHaveBeenCalled();
		});

		it('should fetch with redactExecutionData=false on confirm', async () => {
			const revealedData = { resultData: { runData: { Node: [] } } };
			setActiveExecution({
				id: 'exec-123',
				data: {
					redactionInfo: { isRedacted: true, reason: 'workflow_redaction_policy', canReveal: true },
				},
			} as never);

			confirm.mockResolvedValue(MODAL_CONFIRM);
			workflowsStore.fetchExecutionDataById = vi.fn().mockResolvedValue({
				data: revealedData,
			});

			const executionDataStore = useExecutionDataStore(createExecutionDataId('exec-123'));
			const setExecutionRunDataSpy = vi.spyOn(executionDataStore, 'setExecutionRunData');

			const { revealData } = useExecutionRedaction();
			await revealData();

			expect(workflowsStore.fetchExecutionDataById).toHaveBeenCalledWith('exec-123', {
				redactExecutionData: false,
			});
			expect(setExecutionRunDataSpy).toHaveBeenCalledWith(revealedData);
		});

		it('should show error toast when fetch fails', async () => {
			setActiveExecution({
				id: 'exec-123',
				data: {
					redactionInfo: { isRedacted: true, reason: 'workflow_redaction_policy', canReveal: true },
				},
			} as never);

			const error = new Error('Forbidden');
			confirm.mockResolvedValue(MODAL_CONFIRM);
			workflowsStore.fetchExecutionDataById = vi.fn().mockRejectedValue(error);

			const { revealData } = useExecutionRedaction();
			await revealData();

			expect(showError).toHaveBeenCalledWith(error, expect.any(String));
		});

		it('should not fetch when execution id is missing', async () => {
			setActiveExecution({
				data: {
					redactionInfo: { isRedacted: true, reason: 'workflow_redaction_policy', canReveal: true },
				},
			} as never);

			confirm.mockResolvedValue(MODAL_CONFIRM);

			const { revealData } = useExecutionRedaction();
			await revealData();

			expect(workflowsStore.fetchExecutionDataById).not.toHaveBeenCalled();
		});
	});
});
