import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { useUIStore } from '@/app/stores/ui.store';
import { useWorkflowActivate } from './useWorkflowActivate';
import { WORKFLOW_PUBLISH_MODAL_KEY } from '@/app/constants';
import { WORKFLOW_AUTHORING_CHECKS_MODAL_KEY } from '@/features/workflows/authoringChecks/authoringChecks.constants';

const mockPreview = vi.fn();

vi.mock('@/features/workflows/authoringChecks/authoringChecks.api', () => ({
	previewWorkflowAuthoringChecks: (...args: unknown[]) => mockPreview(...args),
}));

describe('useWorkflowActivate', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: false }));
		mockPreview.mockReset();
	});

	describe('runAuthoringChecksAndOpenPublishModal', () => {
		it('opens publish modal directly when preview returns no results', async () => {
			mockPreview.mockResolvedValue({ results: [] });

			const uiStore = useUIStore();
			const openSpy = vi.spyOn(uiStore, 'openModalWithData');

			const { runAuthoringChecksAndOpenPublishModal } = useWorkflowActivate();
			await runAuthoringChecksAndOpenPublishModal('wf-1', 'v-1');

			expect(openSpy).toHaveBeenCalledWith({
				name: WORKFLOW_PUBLISH_MODAL_KEY,
				data: {},
			});
		});

		it('opens publish modal directly when preview request fails', async () => {
			mockPreview.mockRejectedValue(new Error('network'));

			const uiStore = useUIStore();
			const openSpy = vi.spyOn(uiStore, 'openModalWithData');

			const { runAuthoringChecksAndOpenPublishModal } = useWorkflowActivate();
			await runAuthoringChecksAndOpenPublishModal('wf-1', 'v-1');

			expect(openSpy).toHaveBeenCalledWith({
				name: WORKFLOW_PUBLISH_MODAL_KEY,
				data: {},
			});
		});

		it('opens checks modal without onConfirm when a blocking violation is present', async () => {
			mockPreview.mockResolvedValue({
				results: [
					{
						checkId: 'check-1',
						title: 'Blocking issue',
						severity: 'blocking',
						violations: [{ message: 'bad' }],
					},
				],
			});

			const uiStore = useUIStore();
			const openSpy = vi.spyOn(uiStore, 'openModalWithData');

			const { runAuthoringChecksAndOpenPublishModal } = useWorkflowActivate();
			await runAuthoringChecksAndOpenPublishModal('wf-1', 'v-1');

			expect(openSpy).toHaveBeenCalledTimes(1);
			const call = openSpy.mock.calls[0][0];
			expect(call.name).toBe(WORKFLOW_AUTHORING_CHECKS_MODAL_KEY);
			expect((call.data as { onConfirm?: () => void }).onConfirm).toBeUndefined();
		});

		it('opens checks modal with onConfirm that opens publish modal with skipAuthoringChecks when only warnings exist', async () => {
			mockPreview.mockResolvedValue({
				results: [
					{
						checkId: 'check-1',
						title: 'Warning',
						severity: 'warning',
						violations: [{ message: 'heads up' }],
					},
				],
			});

			const uiStore = useUIStore();
			const openSpy = vi.spyOn(uiStore, 'openModalWithData');

			const { runAuthoringChecksAndOpenPublishModal } = useWorkflowActivate();
			await runAuthoringChecksAndOpenPublishModal('wf-1', 'v-1');

			expect(openSpy).toHaveBeenCalledTimes(1);
			const firstCall = openSpy.mock.calls[0][0];
			expect(firstCall.name).toBe(WORKFLOW_AUTHORING_CHECKS_MODAL_KEY);

			const { onConfirm } = firstCall.data as { onConfirm: () => void };
			expect(typeof onConfirm).toBe('function');

			onConfirm();

			expect(openSpy).toHaveBeenCalledTimes(2);
			expect(openSpy).toHaveBeenLastCalledWith({
				name: WORKFLOW_PUBLISH_MODAL_KEY,
				data: { skipAuthoringChecks: true },
			});
		});
	});
});
