import { ResponseError } from '@n8n/rest-api-client';
import { createPinia } from 'pinia';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';

import { createComponentRenderer } from '@/__tests__/render';
import { useWorkflowReviewStatusStore } from '@/features/workflow-reviews/reviewStatus.store';
import {
	fetchWorkflowReviewRequests,
	updateWorkflowReviewRequestVersion,
} from '@/features/workflow-reviews/workflowReviews.api';
import WorkflowUpdateReviewDialog from './WorkflowUpdateReviewDialog.vue';

const mockShowError = vi.fn();

vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({ showError: mockShowError }),
}));

vi.mock('@/features/workflow-reviews/workflowReviews.api', () => ({
	updateWorkflowReviewRequestVersion: vi.fn(),
	fetchWorkflowReviewRequests: vi.fn(),
}));

const openReview = {
	id: 'review-1',
	state: 'open' as const,
	decision: 'pending' as const,
	workflowVersionId: 'version-1',
	createdAt: '2024-01-01T00:00:00.000Z',
	updatedAt: '2024-01-01T00:00:00.000Z',
};

const renderComponent = createComponentRenderer(WorkflowUpdateReviewDialog);

const renderDialog = async ({
	flushSave = vi.fn().mockResolvedValue('version-2'),
	seedOpenReview = true,
} = {}) => {
	const pinia = createPinia();
	const reviewStatusStore = useWorkflowReviewStatusStore(pinia);
	if (seedOpenReview) {
		vi.mocked(fetchWorkflowReviewRequests).mockResolvedValue({ count: 1, data: [openReview] });
		await reviewStatusStore.fetchStatus('workflow-1');
	} else {
		vi.mocked(fetchWorkflowReviewRequests).mockResolvedValue({ count: 0, data: [] });
	}
	const fetchStatusSpy = vi.spyOn(reviewStatusStore, 'fetchStatus');

	const props = {
		open: false,
		workflowId: 'workflow-1',
		flushSave,
	};
	const result = renderComponent({ pinia, props });
	await result.rerender({ ...props, open: true });

	return { ...result, flushSave, fetchStatusSpy };
};

describe('WorkflowUpdateReviewDialog', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(updateWorkflowReviewRequestVersion).mockResolvedValue({
			...openReview,
			workflowVersionId: 'version-2',
		});
	});

	it('cancel closes the dialog without calling the API', async () => {
		const { getByTestId, getByText, emitted } = await renderDialog();

		expect(getByText('Submit latest changes to existing review')).toBeInTheDocument();
		await userEvent.click(getByTestId('workflow-update-review-cancel-button'));

		expect(updateWorkflowReviewRequestVersion).not.toHaveBeenCalled();
		expect(emitted('update:open')).toContainEqual([false]);
	});

	it('submits the flushed version to the open review and refetches the status', async () => {
		const { getByTestId, flushSave, fetchStatusSpy, emitted } = await renderDialog();

		await userEvent.click(getByTestId('workflow-update-review-submit-button'));

		await waitFor(() => {
			expect(updateWorkflowReviewRequestVersion).toHaveBeenCalledWith(
				expect.any(Object),
				'review-1',
				{ workflowId: 'workflow-1', workflowVersionId: 'version-2' },
			);
		});
		expect(flushSave).toHaveBeenCalledOnce();
		expect(fetchStatusSpy).toHaveBeenCalledWith('workflow-1');
		expect(emitted('updated')).toHaveLength(1);
		expect(emitted('update:open')).toContainEqual([false]);
		expect(mockShowError).not.toHaveBeenCalled();
	});

	it('shows an error and keeps the dialog open when saving fails', async () => {
		const flushSave = vi.fn().mockResolvedValue(undefined);
		const { getByTestId, emitted } = await renderDialog({ flushSave });

		await userEvent.click(getByTestId('workflow-update-review-submit-button'));

		await waitFor(() => expect(mockShowError).toHaveBeenCalledOnce());
		expect(updateWorkflowReviewRequestVersion).not.toHaveBeenCalled();
		expect(emitted('updated')).toBeUndefined();
		expect(emitted('update:open')).toBeUndefined();
	});

	it('shows an error and closes when no open review is found after a refetch', async () => {
		const { getByTestId, fetchStatusSpy, emitted } = await renderDialog({
			seedOpenReview: false,
		});

		await userEvent.click(getByTestId('workflow-update-review-submit-button'));

		await waitFor(() => expect(mockShowError).toHaveBeenCalledOnce());
		// One refetch attempt before giving up.
		expect(fetchStatusSpy).toHaveBeenCalledWith('workflow-1');
		expect(updateWorkflowReviewRequestVersion).not.toHaveBeenCalled();
		expect(emitted('updated')).toBeUndefined();
		expect(emitted('update:open')).toContainEqual([false]);
	});

	it('shows an error and refetches the status when the update conflicts', async () => {
		vi.mocked(updateWorkflowReviewRequestVersion).mockRejectedValue(
			new ResponseError('Conflict', { httpStatusCode: 409 }),
		);
		const { getByTestId, fetchStatusSpy, emitted } = await renderDialog();

		await userEvent.click(getByTestId('workflow-update-review-submit-button'));

		await waitFor(() => expect(mockShowError).toHaveBeenCalledOnce());
		expect(fetchStatusSpy).toHaveBeenCalledWith('workflow-1');
		expect(emitted('updated')).toBeUndefined();
	});
});
