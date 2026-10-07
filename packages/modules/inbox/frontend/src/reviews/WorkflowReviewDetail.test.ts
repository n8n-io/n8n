import type {
	DecideWorkflowReviewRequestResponse,
	InboxWorkflowReviewItem,
	WorkflowReviewRequestDetail,
} from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import { createComponentRenderer, mockedStore, waitAllPromises } from '@n8n/frontend-test-utils';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { createTestingPinia } from '@pinia/testing';
import { defineComponent, ref } from 'vue';

import { useReviewActivityStore } from './reviewActivity.store';
import { useReviewDetailStore } from './reviewDetail.store';
import WorkflowReviewDetail from './WorkflowReviewDetail.vue';

vi.mock('@n8n/composables/useToast', () => ({ useToast: vi.fn() }));
vi.mock('./components/WorkflowReviewChangesSection.vue', () => ({
	default: { template: '<div data-test-id="workflow-review-changes-section" />' },
}));
const showError = vi.fn();
const showMessage = vi.fn();
const onItemChange = vi.fn();
const renderComponent = createComponentRenderer(WorkflowReviewDetail, {
	props: { reviewId: 'req-1', onItemChange },
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
	activityStore.refreshFeedIfIdle.mockResolvedValue(undefined);
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
		unmount();

		resolveDecision();
		await waitAllPromises();

		expect(showMessage).not.toHaveBeenCalled();
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
});

function renderRefreshable() {
	const entry = ref<{ refresh: () => Promise<void> } | null>(null);
	const Host = defineComponent({
		components: { WorkflowReviewDetail },
		setup: () => ({ entry, onItemChange }),
		template:
			'<WorkflowReviewDetail ref="entry" review-id="req-1" :on-item-change="onItemChange" />',
	});
	const rendered = createComponentRenderer(Host, {
		global: {
			stubs: {
				WorkflowReviewActivityFeed: true,
				WorkflowReviewDecisionPopover: true,
				WorkflowReviewCommentComposer: true,
			},
		},
	})();
	return { ...rendered, refresh: async () => await entry.value?.refresh() };
}

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

	it('reports a confirmed unavailable review and owns its empty state', async () => {
		const { getByTestId } = renderComponent();
		reviewStore.detailNotFound = true;
		await waitAllPromises();
		expect(onItemChange).toHaveBeenCalledWith({
			type: 'workflow_review',
			id: 'req-1',
			unavailable: true,
		});
		expect(getByTestId('workflow-review-detail-not-found')).toBeInTheDocument();
		expect(activityStore.reset).toHaveBeenCalledTimes(2);
	});

	it('offers retry when a deep-linked detail fails before any data is available', async () => {
		reviewStore.detail = null;
		reviewStore.fetchDetail.mockRejectedValueOnce(new Error('timeout'));
		const { getByTestId, getByRole, queryByTestId } = renderComponent();
		await waitAllPromises();
		expect(getByTestId('workflow-review-detail-load-error')).toBeInTheDocument();
		reviewStore.fetchDetail.mockImplementationOnce(async () => {
			reviewStore.detail = createDetail();
		});
		getByRole('button', { name: 'Retry' }).click();
		await waitAllPromises();
		expect(queryByTestId('workflow-review-detail-load-error')).not.toBeInTheDocument();
		expect(getByTestId('workflow-review-request-title')).toBeInTheDocument();
	});

	it('keeps cached detail visible when a background request fails', async () => {
		const { refresh, getByTestId, queryByTestId } = renderRefreshable();
		await waitAllPromises();
		reviewStore.fetchDetail.mockRejectedValueOnce(new Error('timeout'));
		await refresh();
		expect(getByTestId('workflow-review-request-title')).toBeInTheDocument();
		expect(queryByTestId('workflow-review-detail-load-error')).not.toBeInTheDocument();
		expect(onItemChange).not.toHaveBeenCalled();
	});

	it('restores activity when a previously unavailable review becomes readable', async () => {
		const { refresh } = renderRefreshable();
		await waitAllPromises();
		reviewStore.detail = null;
		reviewStore.detailNotFound = true;
		await waitAllPromises();
		activityStore.currentReviewId = null;
		activityStore.fetchFeed.mockClear();
		reviewStore.fetchDetail.mockImplementationOnce(async () => {
			reviewStore.detail = createDetail();
			reviewStore.detailNotFound = false;
		});
		await refresh();
		expect(activityStore.fetchFeed).toHaveBeenCalledWith('req-1');
	});

	it('refreshes detail and delegates activity scroll protection to the activity store', async () => {
		const { refresh } = renderRefreshable();
		await waitAllPromises();
		reviewStore.fetchDetail.mockClear();
		activityStore.fetchFeed.mockClear();
		await refresh();
		expect(reviewStore.fetchDetail).toHaveBeenCalledWith('req-1');
		expect(activityStore.refreshFeedIfIdle).toHaveBeenCalledWith('req-1');
		expect(activityStore.fetchFeed).not.toHaveBeenCalled();
	});

	it.each(['posting', 'loading', 'loadingMore'] as const)(
		'skips background refresh while activity is %s',
		async (busy) => {
			const { refresh } = renderRefreshable();
			await waitAllPromises();
			reviewStore.fetchDetail.mockClear();
			activityStore[busy] = true;
			await refresh();
			expect(reviewStore.fetchDetail).not.toHaveBeenCalled();
		},
	);

	it('does not overlap background detail refreshes', async () => {
		const pending = createDeferredPromise<undefined>();
		const { refresh } = renderRefreshable();
		await waitAllPromises();
		reviewStore.fetchDetail.mockClear();
		reviewStore.fetchDetail.mockReturnValueOnce(pending.promise);
		const first = refresh();
		await refresh();
		expect(reviewStore.fetchDetail).toHaveBeenCalledOnce();
		pending.resolve(undefined);
		await first;
	});

	it('keeps the new selection and its note when an old selection completes', async () => {
		const pending = createDeferredPromise<DecideWorkflowReviewRequestResponse>();
		reviewStore.clearDetail.mockImplementation(() => {
			reviewStore.selectionRevision++;
		});
		reviewStore.decideOnReview.mockReturnValueOnce(pending.promise);
		const { getByTestId, rerender } = renderComponent();
		await waitAllPromises();
		getByTestId('approve-review').click();
		await rerender({ reviewId: 'req-2' });
		await rerender({ reviewId: 'req-1' });
		activityStore.decisionNote = 'New note';
		activityStore.fetchFeed.mockClear();
		pending.resolve(decisionResponse({ autoPublish: { status: 'published' } }));
		await waitAllPromises();
		expect(activityStore.clearDecisionNote).not.toHaveBeenCalled();
		expect(activityStore.fetchFeed).not.toHaveBeenCalled();
		expect(showMessage).not.toHaveBeenCalled();
		expect(activityStore.decisionNote).toBe('New note');
		expect(onItemChange).toHaveBeenCalledWith({
			type: 'workflow_review',
			id: 'req-1',
			state: 'closed',
		});
	});

	it('reconciles a late action after unmount without touching a new entry for the same review', async () => {
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
		});
		expect(activityStore.clearDecisionNote).not.toHaveBeenCalled();
		expect(activityStore.fetchFeed).not.toHaveBeenCalled();
		expect(reviewStore.fetchDetail).not.toHaveBeenCalled();
		expect(showMessage).not.toHaveBeenCalled();
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
