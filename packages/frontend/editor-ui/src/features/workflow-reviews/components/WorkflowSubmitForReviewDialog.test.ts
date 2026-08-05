import { ResponseError, type WorkflowVersionData } from '@n8n/rest-api-client';
import { createPinia, setActivePinia } from 'pinia';
import userEvent from '@testing-library/user-event';
import { fireEvent, waitFor } from '@testing-library/vue';

import { createComponentRenderer } from '@/__tests__/render';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { useReviewRequiredStore } from '@/features/workflow-reviews/reviewRequired.store';
import { useWorkflowReviewStatusStore } from '@/features/workflow-reviews/reviewStatus.store';
import {
	createWorkflowReviewRequest,
	fetchEligibleReviewers,
} from '@/features/workflow-reviews/workflowReviews.api';
import WorkflowSubmitForReviewDialog from './WorkflowSubmitForReviewDialog.vue';

/** What `flushSave()` returns: the version the review gets pinned to. */
const SAVED_VERSION_ID = '3f2a9c17-8b4d-4e6a-9f01-2c7d5e8a1b34';
const GENERATED_VERSION_NAME = 'Version 3f2a9c17';

const mockShowError = vi.fn();

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError: mockShowError }),
}));

vi.mock('@/features/workflow-reviews/workflowReviews.api', () => ({
	createWorkflowReviewRequest: vi.fn(),
	fetchEligibleReviewers: vi.fn(),
	fetchWorkflowReviewRequests: vi.fn().mockResolvedValue({ count: 0, data: [] }),
}));

const renderComponent = createComponentRenderer(WorkflowSubmitForReviewDialog);

const renderDialog = async (
	flushSave = vi.fn().mockResolvedValue(SAVED_VERSION_ID),
	versionData: WorkflowVersionData = {
		versionId: SAVED_VERSION_ID,
		name: null,
		description: null,
	},
) => {
	const pinia = createPinia();
	setActivePinia(pinia);
	// The dialog reads the version to name from the current workflow's document.
	useWorkflowsStore().setWorkflowId('workflow-1');
	const documentStore = useWorkflowDocumentStore(createWorkflowDocumentId('workflow-1'));
	documentStore.setVersionData(versionData);
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
		documentStore,
		reviewRequiredStore,
		reviewStatusStore,
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
			workflowVersionId: SAVED_VERSION_ID,
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
		const { getByTestId, flushSave, reviewRequiredStore, reviewStatusStore, emitted } =
			await renderDialog();

		await userEvent.type(getByTestId('workflow-review-title-input'), '  Review payments  ');
		await userEvent.type(getByTestId('workflow-review-description-input'), '  Check retries  ');
		await userEvent.click(getByTestId('workflow-review-submit-button'));

		await waitFor(() => {
			expect(createWorkflowReviewRequest).toHaveBeenCalledWith(expect.any(Object), {
				title: 'Review payments',
				description: 'Check retries',
				workflows: [
					{
						workflowId: 'workflow-1',
						workflowVersionId: SAVED_VERSION_ID,
						workflowVersionName: GENERATED_VERSION_NAME,
					},
				],
			});
		});
		expect(flushSave).toHaveBeenCalledOnce();
		expect(reviewRequiredStore.isReviewRequired('workflow-1')).toBe(false);
		expect(reviewStatusStore.hasOpenReview('workflow-1')).toBe(true);
		expect(reviewStatusStore.openReviewRequest('workflow-1')?.id).toBe('review-1');
		expect(emitted('submitted')).toEqual([['review-1']]);
		expect(emitted('update:open')).toContainEqual([false]);
	});

	describe('version name', () => {
		it('prefills the name the current version already has', async () => {
			const { getByTestId } = await renderDialog(undefined, {
				versionId: SAVED_VERSION_ID,
				name: 'Release candidate',
				description: 'Existing description',
			});

			expect(getByTestId('workflow-review-version-name-input')).toHaveValue('Release candidate');
		});

		it('prefills a generated label when the current version has no name', async () => {
			const { getByTestId } = await renderDialog();

			const input = getByTestId('workflow-review-version-name-input');
			expect(input).toHaveValue(GENERATED_VERSION_NAME);
			expect(input).toHaveAttribute('maxlength', '128');
		});

		// The publish endpoints accept an empty name, so '' must not leave the
		// required field blank with submission blocked.
		it('prefills a generated label when the current version name is empty', async () => {
			const { getByTestId } = await renderDialog(undefined, {
				versionId: SAVED_VERSION_ID,
				name: '',
				description: null,
			});

			expect(getByTestId('workflow-review-version-name-input')).toHaveValue(GENERATED_VERSION_NAME);
		});

		it('blocks submission while the name is empty', async () => {
			const { getByTestId } = await renderDialog();

			await userEvent.type(getByTestId('workflow-review-title-input'), 'Review payments');
			await userEvent.clear(getByTestId('workflow-review-version-name-input'));

			expect(getByTestId('workflow-review-submit-button')).toBeDisabled();
		});

		it('submits the trimmed name and mirrors it into the editor', async () => {
			const { getByTestId, documentStore } = await renderDialog();

			await userEvent.type(getByTestId('workflow-review-title-input'), 'Review payments');
			await userEvent.clear(getByTestId('workflow-review-version-name-input'));
			await userEvent.type(getByTestId('workflow-review-version-name-input'), '  Release 3  ');
			await userEvent.click(getByTestId('workflow-review-submit-button'));

			await waitFor(() => {
				expect(createWorkflowReviewRequest).toHaveBeenCalledWith(
					expect.any(Object),
					expect.objectContaining({
						workflows: [
							{
								workflowId: 'workflow-1',
								workflowVersionId: SAVED_VERSION_ID,
								workflowVersionName: 'Release 3',
							},
						],
					}),
				);
			});
			expect(documentStore.versionData).toEqual({
				versionId: SAVED_VERSION_ID,
				name: 'Release 3',
				description: null,
			});
		});

		// The fields are read before `flushSave()` is awaited, so a mid-save change can't
		// reach the request. `fireEvent` bypasses the disabled inputs the way a stray
		// programmatic write would, keeping the snapshot covered on its own.
		it('locks the fields while submitting and sends the values validated at click time', async () => {
			let resolveSave!: (versionId: string | undefined) => void;
			const flushSave = vi.fn().mockReturnValue(
				new Promise<string | undefined>((resolve) => {
					resolveSave = resolve;
				}),
			);
			const { getByTestId } = await renderDialog(flushSave);

			const versionNameInput = getByTestId('workflow-review-version-name-input');
			const titleInput = getByTestId('workflow-review-title-input');
			await userEvent.type(titleInput, 'Review payments');
			await userEvent.clear(versionNameInput);
			await userEvent.type(versionNameInput, 'Validated name');
			await userEvent.click(getByTestId('workflow-review-submit-button'));

			await waitFor(() => expect(versionNameInput).toBeDisabled());
			expect(titleInput).toBeDisabled();
			await fireEvent.update(versionNameInput, '');
			await fireEvent.update(titleInput, 'Edited late');
			resolveSave(SAVED_VERSION_ID);

			await waitFor(() => {
				expect(createWorkflowReviewRequest).toHaveBeenCalledWith(
					expect.any(Object),
					expect.objectContaining({
						title: 'Review payments',
						workflows: [
							{
								workflowId: 'workflow-1',
								workflowVersionId: SAVED_VERSION_ID,
								workflowVersionName: 'Validated name',
							},
						],
					}),
				);
			});
		});

		it('leaves the editor version untouched when the canvas moved on to another version', async () => {
			const { getByTestId, documentStore } = await renderDialog();
			// A save landed while the review was in flight, so the named version is
			// no longer the one on the canvas.
			documentStore.setVersionData({ versionId: 'later-version', name: null, description: null });

			await userEvent.type(getByTestId('workflow-review-title-input'), 'Review payments');
			await userEvent.click(getByTestId('workflow-review-submit-button'));

			await waitFor(() => expect(createWorkflowReviewRequest).toHaveBeenCalledOnce());
			expect(documentStore.versionData).toEqual({
				versionId: 'later-version',
				name: null,
				description: null,
			});
		});
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

	it('closes and hands off to the update-review flow when an open review conflicts', async () => {
		vi.mocked(createWorkflowReviewRequest).mockRejectedValue(
			new ResponseError('Conflict', {
				httpStatusCode: 409,
				meta: { workflowReviewRequestId: 'existing-review' },
			}),
		);
		const { getByTestId, reviewRequiredStore, fetchStatusSpy, emitted } = await renderDialog();

		await userEvent.type(getByTestId('workflow-review-title-input'), 'Review payments');
		await userEvent.click(getByTestId('workflow-review-submit-button'));

		await waitFor(() => expect(emitted('conflict')).toHaveLength(1));
		expect(emitted('update:open')).toContainEqual([false]);
		// The conflict proves an open review — refetch so the toggle locks immediately.
		expect(fetchStatusSpy).toHaveBeenCalledWith('workflow-1');
		expect(reviewRequiredStore.isReviewRequired('workflow-1')).toBe(true);
		expect(emitted('submitted')).toBeUndefined();
		expect(mockShowError).not.toHaveBeenCalled();
	});

	it('discards the flushed version when the user navigates away during the save', async () => {
		let resolveSave!: (versionId: string | undefined) => void;
		const flushSave = vi.fn().mockReturnValue(
			new Promise<string | undefined>((resolve) => {
				resolveSave = resolve;
			}),
		);
		const { getByTestId, rerender, emitted } = await renderDialog(flushSave);

		await userEvent.type(getByTestId('workflow-review-title-input'), 'Review payments');
		await userEvent.click(getByTestId('workflow-review-submit-button'));
		await waitFor(() => expect(flushSave).toHaveBeenCalledOnce());

		// Navigating swaps the prop in place; the save then resolves with the newly
		// opened workflow's version, which must not be submitted for the pinned one.
		await rerender({ open: true, workflowId: 'workflow-2', flushSave });
		resolveSave('version-2');

		await waitFor(() => expect(getByTestId('workflow-review-submit-button')).toBeEnabled());
		expect(createWorkflowReviewRequest).not.toHaveBeenCalled();
		expect(mockShowError).not.toHaveBeenCalled();
		expect(emitted('submitted')).toBeUndefined();
	});

	it('ignores a stale conflict after navigating to another workflow', async () => {
		let rejectCreate!: (error: unknown) => void;
		vi.mocked(createWorkflowReviewRequest).mockImplementation(
			async () =>
				await new Promise((_resolve, reject) => {
					rejectCreate = reject;
				}),
		);
		const flushSave = vi.fn().mockResolvedValue('version-1');
		const { getByTestId, rerender, fetchStatusSpy, emitted } = await renderDialog(flushSave);

		await userEvent.type(getByTestId('workflow-review-title-input'), 'Review payments');
		await userEvent.click(getByTestId('workflow-review-submit-button'));
		await waitFor(() => expect(createWorkflowReviewRequest).toHaveBeenCalledOnce());

		await rerender({ open: true, workflowId: 'workflow-2', flushSave });
		rejectCreate(
			new ResponseError('Conflict', {
				httpStatusCode: 409,
				meta: { workflowReviewRequestId: 'existing-review' },
			}),
		);

		// The conflict is still real info about the pinned workflow, so its status is
		// refetched — but the update-review dialog must not open for the current one.
		await waitFor(() => expect(fetchStatusSpy).toHaveBeenCalledWith('workflow-1'));
		expect(emitted('conflict')).toBeUndefined();
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
