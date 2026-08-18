import { ResponseError, type WorkflowVersionData } from '@n8n/rest-api-client';
import { createPinia, setActivePinia } from 'pinia';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';
import { createMemoryHistory, createRouter } from 'vue-router';

import { createComponentRenderer } from '@/__tests__/render';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { useWorkflowReviewStatusStore } from '@/features/workflow-reviews/reviewStatus.store';
import {
	fetchWorkflowReviewRequests,
	updateWorkflowReviewRequestVersion,
} from '@/features/workflow-reviews/workflowReviews.api';
import { WORKFLOW_REVIEW_REQUESTS_VIEW } from '../constants';
import WorkflowUpdateReviewDialog from './WorkflowUpdateReviewDialog.vue';

/** What `flushSave()` returns: the version the review gets re-pinned to. */
const SAVED_VERSION_ID = '3f2a9c17-8b4d-4e6a-9f01-2c7d5e8a1b34';
const GENERATED_VERSION_NAME = 'Version 3f2a9c17';

const mockShowError = vi.fn();

vi.mock('@n8n/composables/useToast', () => ({
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
	description: 'Original review description' as string | null,
	createdAt: '2024-01-01T00:00:00.000Z',
	updatedAt: '2024-01-01T00:00:00.000Z',
	decisionBy: null,
	approvedVersionPublicationState: null,
};

const router = createRouter({
	history: createMemoryHistory(),
	routes: [
		{
			path: '/workflow-review-requests/:reviewRequestId?',
			name: WORKFLOW_REVIEW_REQUESTS_VIEW,
			component: { template: '<div />' },
		},
	],
});

const renderComponent = createComponentRenderer(WorkflowUpdateReviewDialog, {
	// The real RouterLink resolves the named route, so the test asserts the URL
	// the user actually lands on rather than the raw `to` object.
	global: { plugins: [router], stubs: { RouterLink: false } },
});

const renderDialog = async ({
	flushSave = vi.fn().mockResolvedValue(SAVED_VERSION_ID),
	seedOpenReview = true,
	reviewData = openReview,
	canSubmit = true,
	versionData = {
		versionId: SAVED_VERSION_ID,
		name: null,
		description: null,
	} as WorkflowVersionData,
} = {}) => {
	const pinia = createPinia();
	setActivePinia(pinia);
	// The dialog reads the version to name from the current workflow's document.
	useWorkflowsStore().setWorkflowId('workflow-1');
	const documentStore = useWorkflowDocumentStore(createWorkflowDocumentId('workflow-1'));
	documentStore.setVersionData(versionData);
	const reviewStatusStore = useWorkflowReviewStatusStore(pinia);
	if (seedOpenReview) {
		vi.mocked(fetchWorkflowReviewRequests).mockResolvedValue({ count: 1, data: [reviewData] });
		await reviewStatusStore.fetchStatus('workflow-1');
	} else {
		vi.mocked(fetchWorkflowReviewRequests).mockResolvedValue({ count: 0, data: [] });
	}
	const fetchStatusSpy = vi.spyOn(reviewStatusStore, 'fetchStatus');

	const props = {
		open: false,
		workflowId: 'workflow-1',
		flushSave,
		canSubmit,
	};
	const result = renderComponent({ pinia, props });
	await result.rerender({ ...props, open: true });
	const goToStep2 = async () => {
		await waitFor(() =>
			expect(result.getByTestId('workflow-update-review-next-button')).toBeEnabled(),
		);
		await userEvent.click(result.getByTestId('workflow-update-review-next-button'));
	};

	return { ...result, flushSave, documentStore, fetchStatusSpy, goToStep2 };
};

describe('WorkflowUpdateReviewDialog', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(updateWorkflowReviewRequestVersion).mockResolvedValue({
			...openReview,
			workflowVersionId: SAVED_VERSION_ID,
		});
	});

	it('cancel closes the dialog without calling the API', async () => {
		const { getByTestId, getByText, emitted } = await renderDialog();

		expect(getByText('Submit latest changes to existing review')).toBeInTheDocument();
		await userEvent.click(getByTestId('workflow-update-review-cancel-button'));

		expect(updateWorkflowReviewRequestVersion).not.toHaveBeenCalled();
		expect(emitted('update:open')).toContainEqual([false]);
	});

	it('links to the open review', async () => {
		const { getByRole } = await renderDialog();

		expect(getByRole('link', { name: 'open review' })).toHaveAttribute(
			'href',
			'/workflow-review-requests/review-1',
		);
	});

	it('stays open without prefilling when no open review is known yet', async () => {
		const { queryByRole, emitted, fetchStatusSpy, getByTestId } = await renderDialog({
			seedOpenReview: false,
		});

		await waitFor(() => expect(fetchStatusSpy).toHaveBeenCalledWith('workflow-1'));
		expect(queryByRole('link', { name: 'open review' })).not.toBeInTheDocument();
		expect(mockShowError).not.toHaveBeenCalled();
		expect(emitted('update:open')).toBeUndefined();
		await waitFor(() => expect(getByTestId('workflow-update-review-next-button')).toBeEnabled());
	});

	it('reports a review that no longer exists at submit time', async () => {
		const { getByTestId, emitted, goToStep2 } = await renderDialog({ seedOpenReview: false });
		await goToStep2();

		await userEvent.click(getByTestId('workflow-update-review-submit-button'));

		await waitFor(() => expect(mockShowError).toHaveBeenCalledOnce());
		expect(updateWorkflowReviewRequestVersion).not.toHaveBeenCalled();
		expect(emitted('update:open')).toContainEqual([false]);
	});

	it('submits the flushed version to the open review and refetches the status', async () => {
		const { getByTestId, flushSave, fetchStatusSpy, emitted, goToStep2 } = await renderDialog();
		await goToStep2();

		await userEvent.click(getByTestId('workflow-update-review-submit-button'));

		await waitFor(() => {
			expect(updateWorkflowReviewRequestVersion).toHaveBeenCalledWith(
				expect.any(Object),
				'review-1',
				{
					workflowId: 'workflow-1',
					workflowVersionId: SAVED_VERSION_ID,
					workflowVersionName: GENERATED_VERSION_NAME,
					workflowVersionDescription: undefined,
					description: undefined,
				},
			);
		});
		expect(flushSave).toHaveBeenCalledOnce();
		expect(fetchStatusSpy).toHaveBeenCalledWith('workflow-1');
		expect(emitted('updated')).toEqual([['review-1']]);
		expect(emitted('update:open')).toContainEqual([false]);
		expect(mockShowError).not.toHaveBeenCalled();
	});

	it('disables submission when the caller knows the review is up to date', async () => {
		const { getByTestId, flushSave } = await renderDialog({ canSubmit: false });

		expect(getByTestId('workflow-update-review-next-button')).toBeDisabled();
		expect(flushSave).not.toHaveBeenCalled();
	});

	it('closes without updating when saving resolves to the reviewed version', async () => {
		const { getByTestId, flushSave, emitted, goToStep2 } = await renderDialog({
			reviewData: { ...openReview, workflowVersionId: SAVED_VERSION_ID },
		});
		await goToStep2();

		await userEvent.click(getByTestId('workflow-update-review-submit-button'));

		await waitFor(() => expect(emitted('update:open')).toContainEqual([false]));
		expect(flushSave).toHaveBeenCalledOnce();
		expect(updateWorkflowReviewRequestVersion).not.toHaveBeenCalled();
		expect(emitted('updated')).toBeUndefined();
		expect(mockShowError).not.toHaveBeenCalled();
	});

	it('shows an error and keeps the dialog open when saving fails', async () => {
		const flushSave = vi.fn().mockResolvedValue(undefined);
		const { getByTestId, emitted, goToStep2 } = await renderDialog({ flushSave });
		await goToStep2();

		await userEvent.click(getByTestId('workflow-update-review-submit-button'));

		await waitFor(() => expect(mockShowError).toHaveBeenCalledOnce());
		expect(updateWorkflowReviewRequestVersion).not.toHaveBeenCalled();
		expect(emitted('updated')).toBeUndefined();
		expect(emitted('update:open')).toBeUndefined();
	});

	it('discards the flushed version when the user navigates away during the save', async () => {
		let resolveSave!: (versionId: string | undefined) => void;
		const flushSave = vi.fn().mockReturnValue(
			new Promise<string | undefined>((resolve) => {
				resolveSave = resolve;
			}),
		);
		const { getByTestId, rerender, emitted, goToStep2 } = await renderDialog({ flushSave });
		await goToStep2();

		await userEvent.click(getByTestId('workflow-update-review-submit-button'));
		await waitFor(() => expect(flushSave).toHaveBeenCalledOnce());

		// Navigating swaps the prop in place; the save then resolves with the newly
		// opened workflow's version, which must not be pinned to the old review.
		await rerender({ open: true, workflowId: 'workflow-2', flushSave });
		resolveSave('version-2');

		await waitFor(() => expect(getByTestId('workflow-update-review-next-button')).toBeEnabled());
		expect(updateWorkflowReviewRequestVersion).not.toHaveBeenCalled();
		expect(mockShowError).not.toHaveBeenCalled();
		expect(emitted('updated')).toBeUndefined();
	});

	describe('review description', () => {
		it('uses the same two-step flow as review creation and prefills the description', async () => {
			const { getByTestId, goToStep2 } = await renderDialog();

			expect(getByTestId('workflow-update-review-dialog-step')).toHaveTextContent('Step 1 of 2');

			await goToStep2();

			expect(getByTestId('workflow-update-review-dialog-step')).toHaveTextContent('Step 2 of 2');
			expect(getByTestId('workflow-update-review-description-input')).toHaveValue(
				'Original review description',
			);
			expect(getByTestId('workflow-update-review-description-input')).toHaveAttribute(
				'maxlength',
				'512',
			);
			expect(getByTestId('workflow-update-review-description-character-count')).toHaveTextContent(
				'27/512',
			);
		});

		it('returns to the version step without losing the review description', async () => {
			const { getByTestId, goToStep2 } = await renderDialog();
			await goToStep2();
			await userEvent.clear(getByTestId('workflow-update-review-description-input'));
			await userEvent.type(
				getByTestId('workflow-update-review-description-input'),
				'Updated context',
			);

			await userEvent.click(getByTestId('workflow-update-review-back-button'));
			expect(getByTestId('workflow-update-review-version-name-input')).toBeInTheDocument();
			await userEvent.click(getByTestId('workflow-update-review-next-button'));

			expect(getByTestId('workflow-update-review-description-input')).toHaveValue(
				'Updated context',
			);
		});

		it('submits a changed review description', async () => {
			const { getByTestId, goToStep2 } = await renderDialog();
			await goToStep2();
			await userEvent.clear(getByTestId('workflow-update-review-description-input'));
			await userEvent.type(
				getByTestId('workflow-update-review-description-input'),
				'  Updated review context  ',
			);

			await userEvent.click(getByTestId('workflow-update-review-submit-button'));

			await waitFor(() =>
				expect(updateWorkflowReviewRequestVersion).toHaveBeenCalledWith(
					expect.any(Object),
					'review-1',
					expect.objectContaining({ description: 'Updated review context' }),
				),
			);
		});

		it('omits an unchanged review description', async () => {
			const { getByTestId, goToStep2 } = await renderDialog();
			await goToStep2();

			await userEvent.click(getByTestId('workflow-update-review-submit-button'));

			await waitFor(() =>
				expect(updateWorkflowReviewRequestVersion).toHaveBeenCalledWith(
					expect.any(Object),
					'review-1',
					expect.objectContaining({ description: undefined }),
				),
			);
		});

		it('sends an empty review description when the prefilled value is cleared', async () => {
			const { getByTestId, queryByTestId, goToStep2 } = await renderDialog();
			await goToStep2();
			await userEvent.clear(getByTestId('workflow-update-review-description-input'));
			expect(
				queryByTestId('workflow-update-review-description-character-count'),
			).not.toBeInTheDocument();

			await userEvent.click(getByTestId('workflow-update-review-submit-button'));

			await waitFor(() =>
				expect(updateWorkflowReviewRequestVersion).toHaveBeenCalledWith(
					expect.any(Object),
					'review-1',
					expect.objectContaining({ description: '' }),
				),
			);
		});
	});

	describe('version name and description', () => {
		it('prefills the name and description the current version already has', async () => {
			const { getByTestId } = await renderDialog({
				versionData: {
					versionId: SAVED_VERSION_ID,
					name: 'Release candidate',
					description: 'Existing description',
				},
			});

			expect(getByTestId('workflow-update-review-version-name-input')).toHaveValue(
				'Release candidate',
			);
			expect(getByTestId('workflow-update-review-version-description-input')).toHaveValue(
				'Existing description',
			);
		});

		it('prefills a generated label when the current version has no name', async () => {
			const { getByTestId } = await renderDialog();

			const input = getByTestId('workflow-update-review-version-name-input');
			expect(input).toHaveValue(GENERATED_VERSION_NAME);
			expect(input).toHaveAttribute('maxlength', '128');
			const descriptionInput = getByTestId('workflow-update-review-version-description-input');
			expect(descriptionInput).toHaveValue('');
			expect(descriptionInput).toHaveAttribute('maxlength', '2048');
		});

		// The publish endpoints accept an empty name, so '' must not leave the
		// required field blank with submission blocked.
		it('prefills a generated label when the current version name is empty', async () => {
			const { getByTestId } = await renderDialog({
				versionData: { versionId: SAVED_VERSION_ID, name: '', description: null },
			});

			expect(getByTestId('workflow-update-review-version-name-input')).toHaveValue(
				GENERATED_VERSION_NAME,
			);
		});

		it('blocks advancing while the name is empty', async () => {
			const { getByTestId } = await renderDialog();

			await userEvent.clear(getByTestId('workflow-update-review-version-name-input'));

			expect(getByTestId('workflow-update-review-next-button')).toBeDisabled();
		});

		it('submits the trimmed name and mirrors it into the editor', async () => {
			const { getByTestId, documentStore, goToStep2 } = await renderDialog();

			await userEvent.clear(getByTestId('workflow-update-review-version-name-input'));
			await userEvent.type(
				getByTestId('workflow-update-review-version-name-input'),
				'  Release 3  ',
			);
			await goToStep2();
			await userEvent.click(getByTestId('workflow-update-review-submit-button'));

			await waitFor(() => {
				expect(updateWorkflowReviewRequestVersion).toHaveBeenCalledWith(
					expect.any(Object),
					'review-1',
					{
						workflowId: 'workflow-1',
						workflowVersionId: SAVED_VERSION_ID,
						workflowVersionName: 'Release 3',
						workflowVersionDescription: undefined,
						description: undefined,
					},
				);
			});
			expect(documentStore.versionData).toEqual({
				versionId: SAVED_VERSION_ID,
				name: 'Release 3',
				description: null,
			});
		});

		it('submits the trimmed description and mirrors it into the editor', async () => {
			const { getByTestId, documentStore, goToStep2 } = await renderDialog();

			await userEvent.type(
				getByTestId('workflow-update-review-version-description-input'),
				'  What changed  ',
			);
			await goToStep2();
			await userEvent.click(getByTestId('workflow-update-review-submit-button'));

			await waitFor(() => {
				expect(updateWorkflowReviewRequestVersion).toHaveBeenCalledWith(
					expect.any(Object),
					'review-1',
					expect.objectContaining({ workflowVersionDescription: 'What changed' }),
				);
			});
			expect(documentStore.versionData).toMatchObject({ description: 'What changed' });
		});

		it('sends an empty description when the prefilled one is cleared', async () => {
			const { getByTestId, documentStore, goToStep2 } = await renderDialog({
				versionData: {
					versionId: SAVED_VERSION_ID,
					name: 'Release candidate',
					description: 'Existing description',
				},
			});

			await userEvent.clear(getByTestId('workflow-update-review-version-description-input'));
			await goToStep2();
			await userEvent.click(getByTestId('workflow-update-review-submit-button'));

			await waitFor(() => {
				expect(updateWorkflowReviewRequestVersion).toHaveBeenCalledWith(
					expect.any(Object),
					'review-1',
					expect.objectContaining({ workflowVersionDescription: '' }),
				);
			});
			expect(documentStore.versionData).toMatchObject({ description: null });
		});

		it('sends the name validated before advancing to the review step', async () => {
			let resolveSave!: (versionId: string | undefined) => void;
			const flushSave = vi.fn().mockReturnValue(
				new Promise<string | undefined>((resolve) => {
					resolveSave = resolve;
				}),
			);
			const { getByTestId, documentStore, goToStep2 } = await renderDialog({ flushSave });

			const input = getByTestId('workflow-update-review-version-name-input');
			await userEvent.clear(input);
			await userEvent.type(input, 'Validated name');
			await goToStep2();
			await userEvent.click(getByTestId('workflow-update-review-submit-button'));

			await waitFor(() => expect(getByTestId('workflow-update-review-back-button')).toBeDisabled());
			resolveSave(SAVED_VERSION_ID);

			await waitFor(() => {
				expect(updateWorkflowReviewRequestVersion).toHaveBeenCalledWith(
					expect.any(Object),
					'review-1',
					{
						workflowId: 'workflow-1',
						workflowVersionId: SAVED_VERSION_ID,
						workflowVersionName: 'Validated name',
						workflowVersionDescription: undefined,
						description: undefined,
					},
				);
			});
			expect(documentStore.versionData).toMatchObject({ name: 'Validated name' });
		});
	});

	it('shows an error and refetches the status when the update conflicts', async () => {
		vi.mocked(updateWorkflowReviewRequestVersion).mockRejectedValue(
			new ResponseError('Conflict', { httpStatusCode: 409 }),
		);
		const { getByTestId, fetchStatusSpy, emitted, goToStep2 } = await renderDialog();
		await goToStep2();

		await userEvent.click(getByTestId('workflow-update-review-submit-button'));

		await waitFor(() => expect(mockShowError).toHaveBeenCalledOnce());
		expect(fetchStatusSpy).toHaveBeenCalledWith('workflow-1');
		expect(emitted('updated')).toBeUndefined();
	});

	it('retries against the review that replaced the one open when the dialog was opened', async () => {
		vi.mocked(updateWorkflowReviewRequestVersion).mockRejectedValueOnce(
			new ResponseError('Conflict', { httpStatusCode: 409 }),
		);
		const { getByTestId, goToStep2 } = await renderDialog();
		await goToStep2();

		// The first attempt conflicts, and the status refetch reports a new review.
		vi.mocked(fetchWorkflowReviewRequests).mockResolvedValue({
			count: 1,
			data: [{ ...openReview, id: 'review-2' }],
		});
		await userEvent.click(getByTestId('workflow-update-review-submit-button'));
		await waitFor(() => expect(mockShowError).toHaveBeenCalledOnce());

		vi.mocked(updateWorkflowReviewRequestVersion).mockResolvedValue({
			...openReview,
			id: 'review-2',
			workflowVersionId: SAVED_VERSION_ID,
		});
		await userEvent.click(getByTestId('workflow-update-review-submit-button'));

		await waitFor(() =>
			expect(updateWorkflowReviewRequestVersion).toHaveBeenLastCalledWith(
				expect.any(Object),
				'review-2',
				expect.any(Object),
			),
		);
	});
});
