import { ResponseError } from '@n8n/rest-api-client';
import { createPinia } from 'pinia';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';

import { createComponentRenderer } from '@/__tests__/render';
import { useReviewRequiredStore } from '@/features/workflow-reviews/reviewRequired.store';
import { useWorkflowReviewStatusStore } from '@/features/workflow-reviews/reviewStatus.store';
import {
	createWorkflowReviewRequest,
	fetchEligibleReviewers,
} from '@/features/workflow-reviews/workflowReviews.api';
import WorkflowSubmitForReviewDialog from './WorkflowSubmitForReviewDialog.vue';

const mockShowError = vi.fn();

vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({ showError: mockShowError }),
}));

vi.mock('@/features/workflow-reviews/workflowReviews.api', () => ({
	createWorkflowReviewRequest: vi.fn(),
	fetchEligibleReviewers: vi.fn(),
	fetchWorkflowReviewRequests: vi.fn().mockResolvedValue({ count: 0, data: [] }),
}));

const renderComponent = createComponentRenderer(WorkflowSubmitForReviewDialog);

const renderDialog = async (flushSave = vi.fn().mockResolvedValue('version-1')) => {
	const pinia = createPinia();
	const reviewRequiredStore = useReviewRequiredStore(pinia);
	reviewRequiredStore.setReviewRequired('workflow-1', true);
	const reviewStatusStore = useWorkflowReviewStatusStore(pinia);
	const fetchStatusSpy = vi.spyOn(reviewStatusStore, 'fetchStatus').mockResolvedValue(undefined);
	const props = {
		open: false,
		workflowId: 'workflow-1',
		flushSave,
	};
	const result = renderComponent({ pinia, props });
	await result.rerender({ ...props, open: true });

	return {
		...result,
		flushSave,
		reviewRequiredStore,
		fetchStatusSpy,
	};
};

describe('WorkflowSubmitForReviewDialog', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(createWorkflowReviewRequest).mockResolvedValue({
			id: 'review-1',
			state: 'open',
			decision: 'pending',
			createdAt: '2024-01-01T00:00:00.000Z',
			updatedAt: '2024-01-01T00:00:00.000Z',
		});
		vi.mocked(fetchEligibleReviewers).mockResolvedValue({
			count: 1,
			data: [{ id: 'reviewer-1', email: 'reviewer@n8n.io', firstName: 'Rae', lastName: 'Viewer' }],
		});
	});

	it('requires a non-empty title and cancel creates nothing', async () => {
		const { getByTestId, getByRole, emitted } = await renderDialog();
		const titleInput = getByTestId('workflow-review-title-input');
		const submitButton = getByTestId('workflow-review-submit-button');
		expect(getByRole('dialog')).toHaveAttribute('aria-describedby');

		await waitFor(() => expect(titleInput).toHaveFocus());
		expect(titleInput).toHaveAttribute('maxlength', '128');
		expect(getByTestId('workflow-review-description-input')).toHaveAttribute('maxlength', '512');
		expect(submitButton).toBeDisabled();
		await userEvent.type(titleInput, '   ');
		expect(submitButton).toBeDisabled();

		await userEvent.click(getByTestId('workflow-review-cancel-button'));

		expect(createWorkflowReviewRequest).not.toHaveBeenCalled();
		expect(emitted('update:open')).toContainEqual([false]);
	});

	it('submits the flushed version and resets review required after success', async () => {
		const { getByTestId, flushSave, reviewRequiredStore, fetchStatusSpy, emitted } =
			await renderDialog();

		await userEvent.type(getByTestId('workflow-review-title-input'), '  Review payments  ');
		await userEvent.type(getByTestId('workflow-review-description-input'), '  Check retries  ');
		await userEvent.click(getByTestId('workflow-review-submit-button'));

		await waitFor(() => {
			expect(createWorkflowReviewRequest).toHaveBeenCalledWith(expect.any(Object), {
				title: 'Review payments',
				description: 'Check retries',
				workflows: [{ workflowId: 'workflow-1', workflowVersionId: 'version-1' }],
			});
		});
		expect(flushSave).toHaveBeenCalledOnce();
		expect(reviewRequiredStore.isReviewRequired('workflow-1')).toBe(false);
		expect(fetchStatusSpy).toHaveBeenCalledWith('workflow-1');
		expect(emitted('submitted')).toHaveLength(1);
		expect(emitted('update:open')).toContainEqual([false]);
	});

	it('loads the eligible reviewers when the dialog opens', async () => {
		await renderDialog();

		expect(fetchEligibleReviewers).toHaveBeenCalledWith(expect.any(Object), {
			workflowId: 'workflow-1',
		});
	});

	it('sends the selected reviewer with the submission', async () => {
		const { getByTestId, getByRole, baseElement } = await renderDialog();

		await userEvent.click(getByRole('combobox'));
		await waitFor(() => expect(getByRole('listbox')).toBeInTheDocument());
		const option = baseElement.querySelector('#user-select-option-id-reviewer-1');
		expect(option).not.toBeNull();
		await userEvent.click(option as HTMLElement);

		await userEvent.type(getByTestId('workflow-review-title-input'), 'Review payments');
		await userEvent.click(getByTestId('workflow-review-submit-button'));

		await waitFor(() => {
			expect(createWorkflowReviewRequest).toHaveBeenCalledWith(
				expect.any(Object),
				expect.objectContaining({ reviewerUserIds: ['reviewer-1'] }),
			);
		});
	});

	it('omits the reviewer list from the submission when none is selected', async () => {
		const { getByTestId } = await renderDialog();

		await userEvent.type(getByTestId('workflow-review-title-input'), 'Review payments');
		await userEvent.click(getByTestId('workflow-review-submit-button'));

		await waitFor(() => expect(createWorkflowReviewRequest).toHaveBeenCalledOnce());
		expect(vi.mocked(createWorkflowReviewRequest).mock.calls[0][1].reviewerUserIds).toBeUndefined();
	});

	it('still allows submission when loading the reviewers fails', async () => {
		vi.mocked(fetchEligibleReviewers).mockRejectedValue(new Error('nope'));
		const { getByTestId, emitted } = await renderDialog();

		await userEvent.type(getByTestId('workflow-review-title-input'), 'Review payments');
		await userEvent.click(getByTestId('workflow-review-submit-button'));

		await waitFor(() => expect(createWorkflowReviewRequest).toHaveBeenCalledOnce());
		expect(emitted('submitted')).toHaveLength(1);
		expect(mockShowError).not.toHaveBeenCalled();
	});

	it('keeps the dialog open and preference enabled when an open review conflicts', async () => {
		vi.mocked(createWorkflowReviewRequest).mockRejectedValue(
			new ResponseError('Conflict', {
				httpStatusCode: 409,
				meta: { workflowReviewRequestId: 'existing-review' },
			}),
		);
		const { getByTestId, findByTestId, reviewRequiredStore, fetchStatusSpy, emitted } =
			await renderDialog();

		await userEvent.type(getByTestId('workflow-review-title-input'), 'Review payments');
		await userEvent.click(getByTestId('workflow-review-submit-button'));

		expect(await findByTestId('workflow-review-conflict-error')).toHaveTextContent(
			'This workflow already has an open review.',
		);
		// The conflict proves an open review — refetch so the toggle locks immediately.
		expect(fetchStatusSpy).toHaveBeenCalledWith('workflow-1');
		expect(reviewRequiredStore.isReviewRequired('workflow-1')).toBe(true);
		expect(emitted('submitted')).toBeUndefined();
		expect(emitted('update:open')).toBeUndefined();
		expect(mockShowError).not.toHaveBeenCalled();
	});

	it('shows an error and preserves the preference when saving fails', async () => {
		const flushSave = vi.fn().mockResolvedValue(undefined);
		const { getByTestId, reviewRequiredStore, emitted } = await renderDialog(flushSave);

		await userEvent.type(getByTestId('workflow-review-title-input'), 'Review payments');
		await userEvent.click(getByTestId('workflow-review-submit-button'));

		await waitFor(() => expect(mockShowError).toHaveBeenCalledOnce());
		expect(createWorkflowReviewRequest).not.toHaveBeenCalled();
		expect(reviewRequiredStore.isReviewRequired('workflow-1')).toBe(true);
		expect(emitted('submitted')).toBeUndefined();
	});

	it('shows unexpected API errors and preserves the preference', async () => {
		const error = new Error('Request failed');
		vi.mocked(createWorkflowReviewRequest).mockRejectedValue(error);
		const { getByTestId, reviewRequiredStore, emitted } = await renderDialog();

		await userEvent.type(getByTestId('workflow-review-title-input'), 'Review payments');
		await userEvent.click(getByTestId('workflow-review-submit-button'));

		await waitFor(() => expect(mockShowError).toHaveBeenCalledWith(error, expect.any(String)));
		expect(reviewRequiredStore.isReviewRequired('workflow-1')).toBe(true);
		expect(emitted('submitted')).toBeUndefined();
	});
});
