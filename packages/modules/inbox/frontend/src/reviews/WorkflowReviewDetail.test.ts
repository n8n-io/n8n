import type {
	DecideWorkflowReviewRequestResponse,
	InboxWorkflowReviewItem,
	WorkflowReviewRequestDetail,
} from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import { createComponentRenderer, mockedStore, waitAllPromises } from '@n8n/frontend-test-utils';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';

import { useReviewActivityStore } from './reviewActivity.store';
import { useReviewDetailStore } from './reviewDetail.store';
import WorkflowReviewDetail from './WorkflowReviewDetail.vue';
import * as api from './workflowReviews.api';

vi.mock('./workflowReviews.api');
vi.mock('@n8n/composables/useToast', () => ({ useToast: vi.fn() }));
vi.mock('./components/WorkflowReviewChangesSection.vue', () => ({
	default: { template: '<div data-test-id="workflow-review-changes-section" />' },
}));
const showError = vi.fn();
const showMessage = vi.fn();
const onItemChange = vi.fn();
let isInboxActive = true;
let selectedReviewId: string | null = 'req-1';
const renderComponent = createComponentRenderer(WorkflowReviewDetail, {
	props: {
		reviewId: 'req-1',
		onItemChange,
		isActive: () => isInboxActive,
		isSelected: (id: string) => selectedReviewId === id,
	},
	global: {
		stubs: {
			WorkflowReviewDecisionPopover: {
				props: ['deciding', 'viewerCanDecide', 'viewerCanComment', 'ineligibilityHint'],
				template: `<div data-test-id="workflow-review-decision-popover" :data-deciding="deciding">
    <button data-test-id="approve-review" @click="$emit('decide', { decision: 'approved' })" />
    <button data-test-id="request-changes" @click="$emit('decide', { decision: 'changes_requested', note: 'needs work' })" />
    <button data-test-id="comment-posted" @click="$emit('comment-posted')" />
   </div>`,
			},
		},
	},
});

const decisionResponse = (
	overrides: Partial<DecideWorkflowReviewRequestResponse> = {},
): DecideWorkflowReviewRequestResponse => ({
	id: 'req-1',
	state: 'closed',
	decision: 'approved',
	workflowVersionId: null,
	createdAt: '2024-01-01T00:00:00.000Z',
	updatedAt: '2024-01-02T00:00:00.000Z',
	...overrides,
});

let reviewStore: ReturnType<typeof mockedStore<typeof useReviewDetailStore>>;
let activityStore: ReturnType<typeof mockedStore<typeof useReviewActivityStore>>;
beforeEach(() => {
	createTestingPinia();
	isInboxActive = true;
	selectedReviewId = 'req-1';
	vi.clearAllMocks();
	vi.mocked(useToast).mockReturnValue({ showError, showMessage } as unknown as ReturnType<
		typeof useToast
	>);
	reviewStore = mockedStore(useReviewDetailStore);
	reviewStore.fetchDetail.mockResolvedValue(undefined);
	reviewStore.detail = createDetail();
	reviewStore.decideOnReview.mockResolvedValue(decisionResponse());
	activityStore = mockedStore(useReviewActivityStore);
	activityStore.currentReviewId = 'req-1';
	activityStore.fetchFeed.mockResolvedValue(undefined);
});

describe('review decisions', () => {
	it('offers no decision actions for a closed review', async () => {
		reviewStore.detail = createDetail({ state: 'closed', decision: 'approved' });

		const { queryByTestId } = renderComponent();
		await waitAllPromises();

		expect(queryByTestId('workflow-review-decision-popover')).not.toBeInTheDocument();
	});
	it('submits an approval for the selected review', async () => {
		const { getByTestId } = renderComponent();
		await waitAllPromises();

		getByTestId('approve-review').click();
		await waitAllPromises();

		expect(reviewStore.decideOnReview).toHaveBeenCalledWith('req-1', { decision: 'approved' });
		expect(showError).not.toHaveBeenCalled();
	});
	it('refetches the detail after a decision on the selected review', async () => {
		const { getByTestId } = renderComponent();
		await waitAllPromises();
		reviewStore.fetchDetail.mockClear();

		getByTestId('approve-review').click();
		await waitAllPromises();

		expect(reviewStore.fetchDetail).toHaveBeenCalledWith('req-1');
	});
	it('submits a change request for the selected review', async () => {
		const { getByTestId } = renderComponent();
		await waitAllPromises();

		getByTestId('request-changes').click();
		await waitAllPromises();

		expect(reviewStore.decideOnReview).toHaveBeenCalledWith('req-1', {
			decision: 'changes_requested',
			note: 'needs work',
		});
	});
	it('shows a success toast when the approval published the workflow', async () => {
		reviewStore.decideOnReview.mockResolvedValueOnce(
			decisionResponse({ autoPublish: { status: 'published' } }),
		);

		const { getByTestId } = renderComponent();
		await waitAllPromises();

		getByTestId('approve-review').click();
		await waitAllPromises();

		expect(showMessage).toHaveBeenCalledWith({
			type: 'success',
			title: 'Review approved',
			message: 'The reviewed workflow version has been published.',
		});
		expect(showError).not.toHaveBeenCalled();
	});
	it('shows a warning toast with the reason when the auto-publish failed', async () => {
		reviewStore.decideOnReview.mockResolvedValueOnce(
			decisionResponse({ autoPublish: { status: 'failed', message: 'Version not found' } }),
		);

		const { getByTestId } = renderComponent();
		await waitAllPromises();

		getByTestId('approve-review').click();
		await waitAllPromises();

		expect(showMessage).toHaveBeenCalledWith({
			type: 'warning',
			duration: 0,
			title: 'Review approved, but the workflow is not published',
			message: 'Version not found. Publish the workflow manually to retry.',
		});
		expect(showError).not.toHaveBeenCalled();
	});
	it('does not double up punctuation on an already-terminated message', async () => {
		reviewStore.decideOnReview.mockResolvedValueOnce(
			decisionResponse({
				autoPublish: { status: 'failed', message: 'Cannot activate an archived workflow.' },
			}),
		);

		const { getByTestId } = renderComponent();
		await waitAllPromises();

		getByTestId('approve-review').click();
		await waitAllPromises();

		expect(showMessage).toHaveBeenCalledWith(
			expect.objectContaining({
				message: 'Cannot activate an archived workflow. Publish the workflow manually to retry.',
			}),
		);
	});
	it('shows no publish toast when requesting changes', async () => {
		reviewStore.decideOnReview.mockResolvedValueOnce(
			decisionResponse({ state: 'open', decision: 'changes_requested' }),
		);

		const { getByTestId } = renderComponent();
		await waitAllPromises();
		reviewStore.fetchDetail.mockClear();

		getByTestId('request-changes').click();
		await waitAllPromises();

		expect(showMessage).not.toHaveBeenCalled();
		expect(reviewStore.fetchDetail).not.toHaveBeenCalled();
	});
	it('shows an error toast when the decision fails', async () => {
		const error = new Error('forbidden');
		reviewStore.decideOnReview.mockRejectedValueOnce(error);

		const { getByTestId } = renderComponent();
		await waitAllPromises();
		getByTestId('approve-review').click();
		await waitAllPromises();

		expect(showError).toHaveBeenCalledWith(error, 'Could not submit review decision');
	});
	it('refreshes detail and activity and reports a failed decision', async () => {
		reviewStore.decideOnReview.mockRejectedValueOnce(new Error('conflict'));

		const { getByTestId } = renderComponent();
		await waitAllPromises();
		reviewStore.fetchDetail.mockClear();
		activityStore.fetchFeed.mockClear();
		getByTestId('approve-review').click();
		await waitAllPromises();

		expect(onItemChange).toHaveBeenCalledWith({ type: 'workflow_review', id: 'req-1' });
		expect(reviewStore.fetchDetail).toHaveBeenCalledWith('req-1');
		// The other reviewer's decision entry is in the feed, not in the detail payload.
		expect(activityStore.fetchFeed).toHaveBeenCalledWith('req-1');
		// The note stays, so the reviewer can retry with it.
		expect(activityStore.clearDecisionNote).not.toHaveBeenCalled();
	});
	it('shows the submitted decision in the feed and drops the note behind it', async () => {
		reviewStore.decideOnReview.mockResolvedValueOnce(
			decisionResponse({ state: 'open', decision: 'changes_requested' }),
		);

		const { getByTestId } = renderComponent();
		await waitAllPromises();
		activityStore.fetchFeed.mockClear();

		getByTestId('request-changes').click();
		await waitAllPromises();

		expect(activityStore.fetchFeed).toHaveBeenCalledWith('req-1');
		// The note it submitted, so a note typed while the decision was in flight survives.
		expect(activityStore.clearDecisionNote).toHaveBeenCalledWith('needs work');
	});
	it('leaves the feed alone when the decision lands after the viewer moved on', async () => {
		let resolveDecision!: () => void;
		reviewStore.decideOnReview.mockImplementationOnce(
			async () =>
				await new Promise<DecideWorkflowReviewRequestResponse>((resolve) => {
					resolveDecision = () =>
						resolve(decisionResponse({ state: 'open', decision: 'changes_requested' }));
				}),
		);

		const { getByTestId, rerender } = renderComponent();
		await waitAllPromises();
		getByTestId('approve-review').click();
		selectedReviewId = 'req-2';
		await rerender({ reviewId: 'req-2' });
		await waitAllPromises();
		activityStore.fetchFeed.mockClear();

		resolveDecision();
		await waitAllPromises();

		expect(activityStore.fetchFeed).not.toHaveBeenCalled();
		expect(activityStore.clearDecisionNote).not.toHaveBeenCalled();
	});
	it('shows no publish toast once the viewer has left the page', async () => {
		let resolveDecision!: () => void;
		reviewStore.decideOnReview.mockImplementationOnce(
			async () =>
				await new Promise<DecideWorkflowReviewRequestResponse>((resolve) => {
					resolveDecision = () =>
						resolve(
							decisionResponse({
								autoPublish: { status: 'failed', message: 'Version not found' },
							}),
						);
				}),
		);

		const { getByTestId, unmount } = renderComponent();
		await waitAllPromises();
		getByTestId('approve-review').click();
		isInboxActive = false;
		unmount();

		resolveDecision();
		await waitAllPromises();

		expect(showMessage).not.toHaveBeenCalled();
	});
	it.each(['another review', 'no review'])(
		'reports a publication failure after the viewer selects %s',
		async (selection) => {
			const pending = createDeferredPromise<DecideWorkflowReviewRequestResponse>();
			reviewStore.decideOnReview.mockReturnValueOnce(pending.promise);
			const { getByTestId, rerender, unmount } = renderComponent();
			await waitAllPromises();
			getByTestId('approve-review').click();
			if (selection === 'another review') {
				selectedReviewId = 'req-2';
				await rerender({ reviewId: 'req-2' });
			} else {
				selectedReviewId = null;
				unmount();
			}
			await waitAllPromises();
			activityStore.fetchFeed.mockClear();
			pending.resolve(
				decisionResponse({ autoPublish: { status: 'failed', message: 'Version not found' } }),
			);
			await waitAllPromises();

			expect(showMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'warning',
					duration: 0,
					message: 'Version not found. Publish the workflow manually to retry.',
				}),
			);
			expect(activityStore.fetchFeed).not.toHaveBeenCalled();
		},
	);
	it('reports a failed decision after the viewer selects another review', async () => {
		const pending = createDeferredPromise<DecideWorkflowReviewRequestResponse>();
		reviewStore.decideOnReview.mockReturnValueOnce(pending.promise);
		const { getByTestId, rerender } = renderComponent();
		await waitAllPromises();
		getByTestId('approve-review').click();
		selectedReviewId = 'req-2';
		activityStore.currentReviewId = 'req-2';
		await rerender({ reviewId: 'req-2' });
		await waitAllPromises();
		activityStore.fetchFeed.mockClear();
		reviewStore.fetchDetail.mockClear();
		const error = new Error('conflict');
		pending.reject(error);
		await waitAllPromises();

		expect(showError).toHaveBeenCalledWith(error, 'Could not submit review decision');
		expect(reviewStore.fetchDetail).toHaveBeenCalledWith('req-2');
		expect(activityStore.fetchFeed).not.toHaveBeenCalled();
	});
	it('shows no failure toast once the viewer has left the page', async () => {
		let rejectDecision!: (error: Error) => void;
		reviewStore.decideOnReview.mockImplementationOnce(
			async () =>
				await new Promise<DecideWorkflowReviewRequestResponse>((_resolve, reject) => {
					rejectDecision = reject;
				}),
		);

		const { getByTestId, unmount } = renderComponent();
		await waitAllPromises();
		getByTestId('approve-review').click();
		isInboxActive = false;
		unmount();

		rejectDecision(new Error('conflict'));
		await waitAllPromises();

		expect(showError).not.toHaveBeenCalled();
		expect(onItemChange).toHaveBeenCalledWith({ type: 'workflow_review', id: 'req-1' });
	});
	it('locks the decision actions while a decision is in flight', async () => {
		let resolveDecision!: () => void;
		reviewStore.decideOnReview.mockImplementationOnce(
			async () =>
				await new Promise<DecideWorkflowReviewRequestResponse>((resolve) => {
					resolveDecision = () => resolve(decisionResponse());
				}),
		);

		const { getByTestId } = renderComponent();
		await waitAllPromises();

		getByTestId('approve-review').click();
		await vi.waitFor(() => {
			expect(getByTestId('workflow-review-decision-popover')).toHaveAttribute(
				'data-deciding',
				'true',
			);
		});

		resolveDecision();
		await waitAllPromises();

		expect(getByTestId('workflow-review-decision-popover')).toHaveAttribute(
			'data-deciding',
			'false',
		);
	});
	it('keeps decisions locked after selection changes until the submitted action completes', async () => {
		const pending = createDeferredPromise<DecideWorkflowReviewRequestResponse>();
		reviewStore.decideOnReview.mockReturnValueOnce(pending.promise);
		const { getByTestId, rerender } = renderComponent();
		await waitAllPromises();
		getByTestId('approve-review').click();
		reviewStore.detail = createDetail({ id: 'req-2' });
		selectedReviewId = 'req-2';
		await rerender({ reviewId: 'req-2' });
		await waitAllPromises();

		expect(getByTestId('workflow-review-decision-popover')).toHaveAttribute(
			'data-deciding',
			'true',
		);
		getByTestId('approve-review').click();
		expect(reviewStore.decideOnReview).toHaveBeenCalledOnce();
		pending.resolve(decisionResponse());
		await waitAllPromises();
		expect(getByTestId('workflow-review-decision-popover')).toHaveAttribute(
			'data-deciding',
			'false',
		);
	});
});

describe('review detail ownership', () => {
	it('loads the selected review and activity on entry', async () => {
		renderComponent();
		await waitAllPromises();
		expect(reviewStore.clearDetail).toHaveBeenCalledOnce();
		expect(activityStore.reset).toHaveBeenCalledOnce();
		expect(reviewStore.fetchDetail).toHaveBeenCalledWith('req-1');
		expect(activityStore.fetchFeed).toHaveBeenCalledWith('req-1');
	});

	it('uses the list title while detail is loading', () => {
		reviewStore.detail = null;
		reviewStore.detailLoading = true;
		const { getByTestId } = renderComponent({ props: { listItem: createInboxItem() } });
		expect(getByTestId('workflow-review-request-title')).toHaveTextContent('List review');
	});

	it('keeps the list title and row when detail reports a missing review', async () => {
		const { getByTestId } = renderComponent();
		reviewStore.detailNotFound = true;
		await waitAllPromises();
		expect(onItemChange).not.toHaveBeenCalled();
		expect(getByTestId('workflow-review-detail-not-found')).toBeInTheDocument();
		expect(getByTestId('workflow-review-request-title')).toBeInTheDocument();
	});

	it('shows the Inbox fallback after a failed detail load without a list item', async () => {
		reviewStore.detail = null;
		const error = new Error('timeout');
		reviewStore.fetchDetail.mockRejectedValueOnce(error);
		const { getByTestId } = renderComponent({
			slots: { default: '<div data-test-id="inbox-fallback">Select an item</div>' },
		});
		await waitAllPromises();
		expect(getByTestId('inbox-fallback')).toBeInTheDocument();
		expect(showError).toHaveBeenCalledWith(error, 'Could not load workflow reviews');
	});

	it('refreshes the current review after returning to it and keeps its new note', async () => {
		const pending = createDeferredPromise<DecideWorkflowReviewRequestResponse>();
		reviewStore.clearDetail.mockImplementation(() => {
			reviewStore.selectionRevision++;
		});
		reviewStore.decideOnReview.mockReturnValueOnce(pending.promise);
		const { getByTestId, rerender } = renderComponent();
		await waitAllPromises();
		getByTestId('approve-review').click();
		selectedReviewId = 'req-2';
		await rerender({ reviewId: 'req-2' });
		selectedReviewId = 'req-1';
		await rerender({ reviewId: 'req-1' });
		activityStore.decisionNote = 'New note';
		activityStore.fetchFeed.mockClear();
		pending.resolve(decisionResponse({ autoPublish: { status: 'published' } }));
		await waitAllPromises();
		expect(activityStore.clearDecisionNote).not.toHaveBeenCalled();
		expect(activityStore.fetchFeed).toHaveBeenCalledWith('req-1');
		expect(showMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
		expect(activityStore.decisionNote).toBe('New note');
		expect(onItemChange).toHaveBeenCalledWith({
			type: 'workflow_review',
			id: 'req-1',
			state: 'closed',
			decision: 'approved',
			updatedAt: '2024-01-02T00:00:00.000Z',
		});
	});
	it.each(['loaded', 'loading'])(
		'shows closed detail and saved activity after returning while approval is pending and detail is %s',
		async (detailState) => {
			createTestingPinia({ stubActions: false });
			reviewStore = mockedStore(useReviewDetailStore);
			activityStore = mockedStore(useReviewActivityStore);
			const pending = createDeferredPromise<DecideWorkflowReviewRequestResponse>();
			const detailRequest = createDeferredPromise<WorkflowReviewRequestDetail>();
			vi.mocked(api.decideWorkflowReviewRequest).mockReturnValueOnce(pending.promise);
			vi.mocked(api.fetchWorkflowReviewRequestDetail).mockImplementation(async (_context, id) =>
				createDetail({ id }),
			);
			vi.mocked(api.fetchWorkflowReviewActivity).mockResolvedValue({
				data: [],
				nextCursor: null,
				hasMore: false,
			});
			const { getByTestId, queryByTestId, rerender } = renderComponent();
			await waitAllPromises();
			getByTestId('approve-review').click();
			selectedReviewId = 'req-2';
			await rerender({ reviewId: 'req-2' });
			await waitAllPromises();
			if (detailState === 'loading') {
				vi.mocked(api.fetchWorkflowReviewRequestDetail).mockReturnValueOnce(detailRequest.promise);
			}
			selectedReviewId = 'req-1';
			await rerender({ reviewId: 'req-1' });
			await waitAllPromises();
			activityStore.decisionNote = 'New note';
			vi.mocked(api.fetchWorkflowReviewRequestDetail).mockResolvedValue(
				createDetail({ state: 'closed', decision: 'approved' }),
			);
			vi.mocked(api.fetchWorkflowReviewActivity).mockResolvedValue({
				data: [
					{
						id: '2',
						type: 'review.approved',
						typeVersion: 1,
						data: null,
						createdBy: null,
						createdAt: '2024-01-02T00:00:00.000Z',
					},
				],
				nextCursor: null,
				hasMore: false,
			});
			pending.resolve(decisionResponse());
			await waitAllPromises();
			detailRequest.resolve(createDetail());
			await waitAllPromises();

			expect(reviewStore.detail?.state).toBe('closed');
			expect(activityStore.entries).toEqual([expect.objectContaining({ type: 'review.approved' })]);
			expect(queryByTestId('workflow-review-decision-popover')).not.toBeInTheDocument();
			expect(activityStore.decisionNote).toBe('New note');
		},
	);
	it('reports a failed comment after the viewer switches from Activity to Changes', async () => {
		const pending = createDeferredPromise<boolean>();
		activityStore.postComment.mockReturnValueOnce(pending.promise);
		activityStore.draft = 'Sent comment';
		const { getByTestId, queryByTestId, rerender } = renderComponent();
		await waitAllPromises();
		await userEvent.click(getByTestId('send-message-button'));
		await rerender({ tab: 'changes' });
		expect(queryByTestId('workflow-review-comment-composer')).not.toBeInTheDocument();
		const error = new Error('timeout');
		pending.reject(error);
		await waitAllPromises();

		expect(showError).toHaveBeenCalledWith(error, 'Could not post comment');
		expect(activityStore.draft).toBe('Sent comment');
	});

	it('refreshes a reselected review after its prior detail entry unmounts', async () => {
		const pending = createDeferredPromise<DecideWorkflowReviewRequestResponse>();
		reviewStore.clearDetail.mockImplementation(() => {
			reviewStore.selectionRevision++;
		});
		reviewStore.decideOnReview.mockReturnValueOnce(pending.promise);
		const first = renderComponent();
		await waitAllPromises();
		first.getByTestId('approve-review').click();
		first.unmount();
		renderComponent();
		await waitAllPromises();
		activityStore.decisionNote = 'New note';
		activityStore.fetchFeed.mockClear();
		reviewStore.fetchDetail.mockClear();
		pending.resolve(
			decisionResponse({ autoPublish: { status: 'failed', message: 'Not published' } }),
		);
		await waitAllPromises();
		expect(onItemChange).toHaveBeenCalledWith({
			type: 'workflow_review',
			id: 'req-1',
			state: 'closed',
			decision: 'approved',
			updatedAt: '2024-01-02T00:00:00.000Z',
		});
		expect(activityStore.clearDecisionNote).not.toHaveBeenCalled();
		expect(activityStore.fetchFeed).toHaveBeenCalledWith('req-1');
		expect(reviewStore.fetchDetail).toHaveBeenCalledWith('req-1');
		expect(showMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'warning' }));
		expect(activityStore.decisionNote).toBe('New note');
	});

	it('does not reset shared stores when an older layout unmounts', async () => {
		reviewStore.clearDetail.mockImplementation(() => {
			reviewStore.selectionRevision++;
		});
		const first = renderComponent();
		renderComponent();
		await waitAllPromises();
		activityStore.draft = 'Current draft';
		reviewStore.clearDetail.mockClear();
		activityStore.reset.mockClear();
		first.unmount();
		expect(reviewStore.clearDetail).not.toHaveBeenCalled();
		expect(activityStore.reset).not.toHaveBeenCalled();
		expect(activityStore.draft).toBe('Current draft');
	});

	it('ignores an old detail failure after a new layout claims the same review', async () => {
		const pending = createDeferredPromise<undefined>();
		reviewStore.clearDetail.mockImplementation(() => {
			reviewStore.selectionRevision++;
		});
		reviewStore.fetchDetail.mockReturnValueOnce(pending.promise);
		renderComponent();
		renderComponent();
		await waitAllPromises();
		pending.reject(new Error('timeout'));
		await waitAllPromises();
		expect(showError).not.toHaveBeenCalled();
	});
});

function createInboxItem(): InboxWorkflowReviewItem {
	return {
		type: 'workflow_review',
		id: 'req-1',
		projectId: 'proj-1',
		title: 'List review',
		workflowName: 'My workflow',
		workflowVersionId: null,
		requester: null,
		authors: [],
		reviewers: [],
		decision: 'pending',
		state: 'open',
		createdAt: '2024-01-01T00:00:00.000Z',
		updatedAt: '2024-01-01T00:00:00.000Z',
	};
}

function createDetail(
	overrides: Partial<WorkflowReviewRequestDetail> = {},
): WorkflowReviewRequestDetail {
	return {
		...createInboxItem(),
		description: null,
		workflows: [],
		viewerCanDecide: true,
		viewerDecisionIneligibilityReason: null,
		viewerCanComment: true,
		...overrides,
	};
}
