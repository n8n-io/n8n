import { ResponseError, type WorkflowVersionData } from '@n8n/rest-api-client';
import { createPinia, setActivePinia } from 'pinia';
import userEvent from '@testing-library/user-event';
import { fireEvent, waitFor } from '@testing-library/vue';
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

	return { ...result, flushSave, documentStore, fetchStatusSpy };
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

	it('keeps the description intact without a link when the open review is unknown', async () => {
		const { baseElement, queryByRole } = await renderDialog({ seedOpenReview: false });

		expect(baseElement.textContent?.replace(/\s+/g, ' ')).toContain(
			'This workflow already has an open review.',
		);
		expect(queryByRole('link', { name: 'open review' })).not.toBeInTheDocument();
	});

	it('submits the flushed version to the open review and refetches the status', async () => {
		const { getByTestId, flushSave, fetchStatusSpy, emitted } = await renderDialog();

		await userEvent.click(getByTestId('workflow-update-review-submit-button'));

		await waitFor(() => {
			expect(updateWorkflowReviewRequestVersion).toHaveBeenCalledWith(
				expect.any(Object),
				'review-1',
				{
					workflowId: 'workflow-1',
					workflowVersionId: SAVED_VERSION_ID,
					workflowVersionName: GENERATED_VERSION_NAME,
				},
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

	it('discards the flushed version when the user navigates away during the save', async () => {
		let resolveSave!: (versionId: string | undefined) => void;
		const flushSave = vi.fn().mockReturnValue(
			new Promise<string | undefined>((resolve) => {
				resolveSave = resolve;
			}),
		);
		const { getByTestId, rerender, emitted } = await renderDialog({ flushSave });

		await userEvent.click(getByTestId('workflow-update-review-submit-button'));
		await waitFor(() => expect(flushSave).toHaveBeenCalledOnce());

		// Navigating swaps the prop in place; the save then resolves with the newly
		// opened workflow's version, which must not be pinned to the old review.
		await rerender({ open: true, workflowId: 'workflow-2', flushSave });
		resolveSave('version-2');

		await waitFor(() => expect(getByTestId('workflow-update-review-submit-button')).toBeEnabled());
		expect(updateWorkflowReviewRequestVersion).not.toHaveBeenCalled();
		expect(mockShowError).not.toHaveBeenCalled();
		expect(emitted('updated')).toBeUndefined();
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

	describe('version name', () => {
		it('prefills the name the current version already has', async () => {
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
		});

		it('prefills a generated label when the current version has no name', async () => {
			const { getByTestId } = await renderDialog();

			const input = getByTestId('workflow-update-review-version-name-input');
			expect(input).toHaveValue(GENERATED_VERSION_NAME);
			expect(input).toHaveAttribute('maxlength', '128');
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

		it('blocks submission while the name is empty', async () => {
			const { getByTestId } = await renderDialog();

			await userEvent.clear(getByTestId('workflow-update-review-version-name-input'));

			expect(getByTestId('workflow-update-review-submit-button')).toBeDisabled();
		});

		it('submits the trimmed name and mirrors it into the editor', async () => {
			const { getByTestId, documentStore } = await renderDialog();

			await userEvent.clear(getByTestId('workflow-update-review-version-name-input'));
			await userEvent.type(
				getByTestId('workflow-update-review-version-name-input'),
				'  Release 3  ',
			);
			await userEvent.click(getByTestId('workflow-update-review-submit-button'));

			await waitFor(() => {
				expect(updateWorkflowReviewRequestVersion).toHaveBeenCalledWith(
					expect.any(Object),
					'review-1',
					{
						workflowId: 'workflow-1',
						workflowVersionId: SAVED_VERSION_ID,
						workflowVersionName: 'Release 3',
					},
				);
			});
			expect(documentStore.versionData).toEqual({
				versionId: SAVED_VERSION_ID,
				name: 'Release 3',
				description: null,
			});
		});

		// The name is read before `flushSave()` is awaited, so a mid-save change can't
		// reach the request. `fireEvent` bypasses the disabled input the way a stray
		// programmatic write would, keeping the snapshot covered on its own.
		it('locks the name while submitting and sends the one validated at click time', async () => {
			let resolveSave!: (versionId: string | undefined) => void;
			const flushSave = vi.fn().mockReturnValue(
				new Promise<string | undefined>((resolve) => {
					resolveSave = resolve;
				}),
			);
			const { getByTestId, documentStore } = await renderDialog({ flushSave });

			const input = getByTestId('workflow-update-review-version-name-input');
			await userEvent.clear(input);
			await userEvent.type(input, 'Validated name');
			await userEvent.click(getByTestId('workflow-update-review-submit-button'));

			await waitFor(() => expect(input).toBeDisabled());
			await fireEvent.update(input, '');
			resolveSave(SAVED_VERSION_ID);

			await waitFor(() => {
				expect(updateWorkflowReviewRequestVersion).toHaveBeenCalledWith(
					expect.any(Object),
					'review-1',
					{
						workflowId: 'workflow-1',
						workflowVersionId: SAVED_VERSION_ID,
						workflowVersionName: 'Validated name',
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
		const { getByTestId, fetchStatusSpy, emitted } = await renderDialog();

		await userEvent.click(getByTestId('workflow-update-review-submit-button'));

		await waitFor(() => expect(mockShowError).toHaveBeenCalledOnce());
		expect(fetchStatusSpy).toHaveBeenCalledWith('workflow-1');
		expect(emitted('updated')).toBeUndefined();
	});
});
