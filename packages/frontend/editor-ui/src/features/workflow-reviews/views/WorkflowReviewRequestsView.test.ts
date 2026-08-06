import type {
	DecideWorkflowReviewRequestResponse,
	WorkflowReviewInboxItem,
	WorkflowReviewRequestDetail,
} from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import { within } from '@testing-library/vue';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore, waitAllPromises } from '@/__tests__/utils';
import { useToast } from '@n8n/composables/useToast';
import { createMemoryHistory, createRouter } from 'vue-router';

import { WORKFLOW_REVIEW_REQUESTS_VIEW } from '../constants';
import { useReviewActivityStore } from '../reviewActivity.store';
import { useReviewInboxStore } from '../reviewInbox.store';
import WorkflowReviewRequestsView from './WorkflowReviewRequestsView.vue';

vi.mock('@n8n/composables/useToast', () => ({
	useToast: vi.fn(),
}));

vi.mock('@/app/composables/useDocumentTitle', () => ({
	useDocumentTitle: () => ({
		set: vi.fn(),
	}),
}));

// The changes sections pull in the whole workflow-diff canvas machinery, which
// is far too heavy for these routing/wiring tests.
vi.mock('@/features/workflow-reviews/components/WorkflowReviewChangesSection.vue', () => ({
	default: {
		name: 'WorkflowReviewChangesSection',
		props: ['workflow'],
		template: '<div data-test-id="workflow-review-changes-section" />',
	},
}));

const showError = vi.fn();
const showMessage = vi.fn();

const router = createRouter({
	history: createMemoryHistory(),
	routes: [
		{
			path: '/workflow-review-requests/:reviewRequestId?',
			name: WORKFLOW_REVIEW_REQUESTS_VIEW,
			component: { template: '<div />' },
		},
		{
			path: '/:pathMatch(.*)*',
			name: 'not-found',
			component: { template: '<div />' },
		},
	],
});

const renderComponent = createComponentRenderer(WorkflowReviewRequestsView, {
	global: {
		plugins: [router],
		stubs: {
			PageViewLayout: {
				template: '<div data-test-id="workflow-review-requests-view"><slot /></div>',
			},
			WorkflowReviewRequestsSidebar: {
				template: `
					<div data-test-id="workflow-review-requests-sidebar">
						<button data-test-id="select-review" @click="$emit('select', 'req-1')" />
						<button data-test-id="select-other-review" @click="$emit('select', 'req-2')" />
						<button data-test-id="clear-review" @click="$emit('clear')" />
						<button data-test-id="select-closed-tab" @click="$emit('update:active-tab', 'closed')" />
						<button data-test-id="select-open-tab" @click="$emit('update:active-tab', 'open')" />
					</div>`,
			},
			// The real tooltip renders its content in a popper on hover, which jsdom
			// cannot exercise; expose the bindings as attributes instead.
			N8nTooltip: {
				props: ['disabled', 'content'],
				template: `
					<div data-test-id="workflow-review-decision-tooltip" :data-disabled="disabled" :data-content="content">
						<slot />
					</div>`,
			},
		},
	},
});

describe('WorkflowReviewRequestsView', () => {
	let store: ReturnType<typeof mockedStore<typeof useReviewInboxStore>>;
	let activityStore: ReturnType<typeof mockedStore<typeof useReviewActivityStore>>;

	beforeEach(async () => {
		createTestingPinia();
		showError.mockReset();
		showMessage.mockReset();
		vi.mocked(useToast).mockReturnValue({ showError, showMessage } as unknown as ReturnType<
			typeof useToast
		>);
		await router.push('/workflow-review-requests');
		await router.isReady();

		store = mockedStore(useReviewInboxStore);
		store.probeSettled = false;
		store.showSidebar = false;
		store.items = [];
		store.detail = null;
		store.detailLoading = false;
		store.detailNotFound = false;
		store.activeTab = 'open';
		store.loading = false;
		store.loadingMore = false;
		store.hasMore = false;
		store.isEmpty = false;
		store.probeInbox.mockResolvedValue(undefined);
		store.fetchDetail.mockResolvedValue(undefined);
		store.setActiveTab.mockResolvedValue(undefined);
		store.loadMore.mockResolvedValue(undefined);
		store.reset.mockClear();

		activityStore = mockedStore(useReviewActivityStore);
		activityStore.fetchFeed.mockResolvedValue(undefined);
	});

	it('probes the inbox on mount', async () => {
		renderComponent();
		await waitAllPromises();

		expect(store.probeInbox).toHaveBeenCalledTimes(1);
	});

	it('shows loading while the inbox probe has not settled', async () => {
		const { container, queryByTestId } = renderComponent();
		await waitAllPromises();

		expect(container.querySelector('.n8n-loading')).toBeInTheDocument();
		expect(queryByTestId('workflow-reviews-disclaimer')).not.toBeInTheDocument();
	});

	it('shows the disclaimer when settled with no reviews', async () => {
		store.probeSettled = true;

		const { container, getByTestId, queryByTestId } = renderComponent();
		await waitAllPromises();

		expect(getByTestId('workflow-reviews-disclaimer')).toBeInTheDocument();
		expect(container.querySelector('.n8n-loading')).not.toBeInTheDocument();
		expect(queryByTestId('workflow-review-requests-sidebar')).not.toBeInTheDocument();
	});

	it('does not fetch or select a review on the bare inbox path', async () => {
		store.probeSettled = true;
		store.showSidebar = true;

		const { getByTestId } = renderComponent();
		await waitAllPromises();

		expect(store.fetchDetail).not.toHaveBeenCalled();
		expect(getByTestId('workflow-reviews-no-selection')).toBeInTheDocument();
	});

	it('fetches the route review detail on mount', async () => {
		await router.replace('/workflow-review-requests/req-1');
		store.probeSettled = true;
		store.showSidebar = true;

		renderComponent();
		await waitAllPromises();

		expect(store.fetchDetail).toHaveBeenCalledWith('req-1');
	});

	it('opens a review with its activity already loading', async () => {
		await router.replace('/workflow-review-requests/req-1');
		store.probeSettled = true;
		store.showSidebar = true;

		renderComponent();
		await waitAllPromises();

		expect(activityStore.fetchFeed).toHaveBeenCalledWith('req-1');
	});

	it('swaps in the activity of the next review the viewer picks', async () => {
		await router.replace('/workflow-review-requests/req-1');
		store.probeSettled = true;
		store.showSidebar = true;

		const { getByTestId } = renderComponent();
		await waitAllPromises();
		getByTestId('select-other-review').click();
		await waitAllPromises();

		expect(activityStore.fetchFeed).toHaveBeenLastCalledWith('req-2');
	});

	it('selects a review with replace and preserves the query', async () => {
		await router.replace('/workflow-review-requests?state=closed');
		store.probeSettled = true;
		store.showSidebar = true;
		const replaceSpy = vi.spyOn(router, 'replace');
		const pushSpy = vi.spyOn(router, 'push');

		const { getByTestId } = renderComponent();
		getByTestId('select-review').click();
		await waitAllPromises();

		expect(replaceSpy).toHaveBeenCalledWith({
			params: { reviewRequestId: 'req-1' },
			query: { state: 'closed' },
		});
		expect(pushSpy).not.toHaveBeenCalled();
	});

	it('drops the tab when selecting a different review, so it lands on Activity', async () => {
		await router.replace('/workflow-review-requests/req-2?state=closed&tab=changes');
		store.probeSettled = true;
		store.showSidebar = true;
		const replaceSpy = vi.spyOn(router, 'replace');

		const { getByTestId } = renderComponent();
		getByTestId('select-review').click();
		await waitAllPromises();

		expect(replaceSpy).toHaveBeenCalledWith({
			params: { reviewRequestId: 'req-1' },
			query: { state: 'closed' },
		});
	});

	it('keeps the tab when re-selecting the review already open', async () => {
		await router.replace('/workflow-review-requests/req-1?tab=changes');
		store.probeSettled = true;
		store.showSidebar = true;
		const replaceSpy = vi.spyOn(router, 'replace');

		const { getByTestId } = renderComponent();
		getByTestId('select-review').click();
		await waitAllPromises();

		expect(replaceSpy).toHaveBeenCalledWith({
			params: { reviewRequestId: 'req-1' },
			query: { tab: 'changes' },
		});
	});

	it('clears the selection back to the bare inbox path', async () => {
		await router.replace('/workflow-review-requests/req-1?state=closed');
		store.probeSettled = true;
		store.showSidebar = true;

		const { getByTestId } = renderComponent();
		await waitAllPromises();

		getByTestId('clear-review').click();
		await waitAllPromises();

		expect(router.currentRoute.value.fullPath).toBe('/workflow-review-requests?state=closed');
		expect(router.currentRoute.value.params.reviewRequestId).toBe('');
		expect(store.clearDetail).toHaveBeenCalled();
	});

	it('shows the detail skeleton while deep-linked detail is loading', async () => {
		await router.replace('/workflow-review-requests/req-1');
		store.probeSettled = true;
		store.showSidebar = true;
		store.detailLoading = true;
		store.detail = null;
		store.items = [];

		const { container, queryByTestId } = renderComponent();
		await waitAllPromises();

		expect(container.querySelector('.n8n-loading')).toBeInTheDocument();
		expect(queryByTestId('workflow-reviews-no-selection')).not.toBeInTheDocument();
	});

	it('renders an inline not-found state without redirecting', async () => {
		await router.replace('/workflow-review-requests/missing');
		store.probeSettled = true;
		store.showSidebar = true;
		store.detailNotFound = true;
		const replaceSpy = vi.spyOn(router, 'replace');

		const { getByTestId } = renderComponent();
		await waitAllPromises();

		expect(getByTestId('workflow-review-detail-not-found')).toBeInTheDocument();
		expect(replaceSpy).not.toHaveBeenCalled();
		expect(router.currentRoute.value.fullPath).toBe('/workflow-review-requests/missing');
	});

	it('uses the list item until loaded detail is available', async () => {
		await router.replace('/workflow-review-requests/req-1');
		store.probeSettled = true;
		store.showSidebar = true;
		store.items = [createInboxItem()];

		const { getByTestId, queryByTestId } = renderComponent();
		await waitAllPromises();
		expect(getByTestId('workflow-review-request-title')).toHaveTextContent('List review');
		expect(
			within(getByTestId('workflow-review-request-title-row')).getByTestId(
				'workflow-review-request-status-dot',
			),
		).toBeInTheDocument();
		// The list item carries no eligibility data, so no decision actions yet
		expect(queryByTestId('workflow-review-approve-button')).not.toBeInTheDocument();

		store.detail = createDetail({ title: 'Detail review' });
		await waitAllPromises();
		expect(getByTestId('workflow-review-request-title')).toHaveTextContent('Detail review');
		expect(getByTestId('workflow-review-approve-button')).toBeInTheDocument();
	});

	it('hydrates the tab from the query before probing', async () => {
		await router.replace('/workflow-review-requests?state=closed');
		renderComponent();
		await waitAllPromises();

		expect(store.activeTab).toBe('closed');
		expect(store.probeInbox).toHaveBeenCalledTimes(1);
	});

	it('uses the open tab for an invalid state query', async () => {
		await router.replace('/workflow-review-requests?state=bogus');
		renderComponent();
		await waitAllPromises();

		expect(store.activeTab).toBe('open');
	});

	it('writes tab changes to the query and preserves the selected review', async () => {
		await router.replace('/workflow-review-requests/req-1');
		store.probeSettled = true;
		store.showSidebar = true;

		const { getByTestId } = renderComponent();
		getByTestId('select-closed-tab').click();
		await waitAllPromises();

		expect(router.currentRoute.value.query).toEqual({ state: 'closed' });
		expect(router.currentRoute.value.params.reviewRequestId).toBe('req-1');

		getByTestId('select-open-tab').click();
		await waitAllPromises();

		expect(router.currentRoute.value.query).toEqual({});
		expect(router.currentRoute.value.params.reviewRequestId).toBe('req-1');
	});

	it('updates the active tab when navigation changes the state query', async () => {
		store.probeSettled = true;
		store.showSidebar = true;
		renderComponent();
		await waitAllPromises();
		store.setActiveTab.mockClear();

		await router.replace('/workflow-review-requests?state=closed');
		await waitAllPromises();

		expect(store.setActiveTab).toHaveBeenCalledWith('closed');
	});

	describe('detail tabs', () => {
		beforeEach(async () => {
			await router.replace('/workflow-review-requests/req-1');
			store.probeSettled = true;
			store.showSidebar = true;
			store.detail = createDetail();
		});

		it('defaults to the activity tab', async () => {
			const { getByTestId, queryByTestId } = renderComponent();
			await waitAllPromises();

			expect(getByTestId('workflow-review-activity-panel')).toBeInTheDocument();
			expect(queryByTestId('workflow-review-changes-panel')).not.toBeInTheDocument();
		});

		it('hydrates the changes tab from the query', async () => {
			await router.replace('/workflow-review-requests/req-1?tab=changes');

			const { getByTestId, queryByTestId } = renderComponent();
			await waitAllPromises();

			expect(getByTestId('workflow-review-changes-panel')).toBeInTheDocument();
			expect(queryByTestId('workflow-review-activity-panel')).not.toBeInTheDocument();
		});

		it('falls back to the activity tab for an invalid tab query', async () => {
			await router.replace('/workflow-review-requests/req-1?tab=bogus');

			const { getByTestId } = renderComponent();
			await waitAllPromises();

			expect(getByTestId('workflow-review-activity-panel')).toBeInTheDocument();
		});

		it('writes the tab to the query preserving selection and state', async () => {
			await router.replace('/workflow-review-requests/req-1?state=closed');

			const { getByRole } = renderComponent();
			await waitAllPromises();

			getByRole('tab', { name: 'Changes' }).click();
			await waitAllPromises();

			expect(router.currentRoute.value.query).toEqual({ state: 'closed', tab: 'changes' });
			expect(router.currentRoute.value.params.reviewRequestId).toBe('req-1');

			getByRole('tab', { name: 'Activity' }).click();
			await waitAllPromises();

			expect(router.currentRoute.value.query).toEqual({ state: 'closed' });
			expect(router.currentRoute.value.params.reviewRequestId).toBe('req-1');
		});
	});

	describe('decision actions', () => {
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

		beforeEach(async () => {
			await router.replace('/workflow-review-requests/req-1');
			store.probeSettled = true;
			store.showSidebar = true;
			store.detail = createDetail();
			store.decideOnReview.mockResolvedValue(decisionResponse());
		});

		it('renders both action buttons for an open review', async () => {
			const { getByTestId } = renderComponent();
			await waitAllPromises();

			expect(getByTestId('workflow-review-approve-button')).toBeInTheDocument();
			expect(getByTestId('workflow-review-request-changes-button')).toBeInTheDocument();
		});

		it('hides the action buttons for a closed review', async () => {
			store.detail = createDetail({ state: 'closed', decision: 'approved' });

			const { queryByTestId } = renderComponent();
			await waitAllPromises();

			expect(queryByTestId('workflow-review-approve-button')).not.toBeInTheDocument();
			expect(queryByTestId('workflow-review-request-changes-button')).not.toBeInTheDocument();
		});

		it('submits an approval for the selected review', async () => {
			const { getByTestId } = renderComponent();
			await waitAllPromises();

			getByTestId('workflow-review-approve-button').click();
			await waitAllPromises();

			expect(store.decideOnReview).toHaveBeenCalledWith('req-1', 'approved');
			expect(showError).not.toHaveBeenCalled();
		});

		it('submits a change request for the selected review', async () => {
			const { getByTestId } = renderComponent();
			await waitAllPromises();

			getByTestId('workflow-review-request-changes-button').click();
			await waitAllPromises();

			expect(store.decideOnReview).toHaveBeenCalledWith('req-1', 'changes_requested');
		});

		it('shows a success toast when the approval published the workflow', async () => {
			store.decideOnReview.mockResolvedValueOnce(
				decisionResponse({ autoPublish: { status: 'published' } }),
			);

			const { getByTestId } = renderComponent();
			await waitAllPromises();

			getByTestId('workflow-review-approve-button').click();
			await waitAllPromises();

			expect(showMessage).toHaveBeenCalledWith({
				type: 'success',
				title: 'Review approved',
				message: 'The reviewed workflow version has been published.',
			});
			expect(showError).not.toHaveBeenCalled();
		});

		it('shows a warning toast with the reason when the auto-publish failed', async () => {
			store.decideOnReview.mockResolvedValueOnce(
				decisionResponse({ autoPublish: { status: 'failed', message: 'Version not found' } }),
			);

			const { getByTestId } = renderComponent();
			await waitAllPromises();

			getByTestId('workflow-review-approve-button').click();
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
			store.decideOnReview.mockResolvedValueOnce(
				decisionResponse({
					autoPublish: { status: 'failed', message: 'Cannot activate an archived workflow.' },
				}),
			);

			const { getByTestId } = renderComponent();
			await waitAllPromises();

			getByTestId('workflow-review-approve-button').click();
			await waitAllPromises();

			expect(showMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					message: 'Cannot activate an archived workflow. Publish the workflow manually to retry.',
				}),
			);
		});

		it('shows no publish toast when requesting changes', async () => {
			store.decideOnReview.mockResolvedValueOnce(
				decisionResponse({ state: 'open', decision: 'changes_requested' }),
			);

			const { getByTestId } = renderComponent();
			await waitAllPromises();

			getByTestId('workflow-review-request-changes-button').click();
			await waitAllPromises();

			expect(showMessage).not.toHaveBeenCalled();
		});

		it('follows a closed review to the closed tab, keeping it selected', async () => {
			store.decideOnReview.mockResolvedValueOnce(
				decisionResponse({ autoPublish: { status: 'published' } }),
			);

			const { getByTestId } = renderComponent();
			await waitAllPromises();

			getByTestId('workflow-review-approve-button').click();
			await waitAllPromises();

			expect(router.currentRoute.value.fullPath).toBe(
				'/workflow-review-requests/req-1?state=closed',
			);
			expect(router.currentRoute.value.params.reviewRequestId).toBe('req-1');
		});

		// The review closes on approval whether or not the publish succeeded, and a
		// failure is exactly when the card is needed to retry from.
		it('follows the review to the closed tab even when the auto-publish failed', async () => {
			store.decideOnReview.mockResolvedValueOnce(
				decisionResponse({ autoPublish: { status: 'failed', message: 'Version not found' } }),
			);

			const { getByTestId } = renderComponent();
			await waitAllPromises();

			getByTestId('workflow-review-approve-button').click();
			await waitAllPromises();

			expect(router.currentRoute.value.fullPath).toBe(
				'/workflow-review-requests/req-1?state=closed',
			);
		});

		it('stays on the open tab when the review stays open', async () => {
			store.decideOnReview.mockResolvedValueOnce(
				decisionResponse({ state: 'open', decision: 'changes_requested' }),
			);

			const { getByTestId } = renderComponent();
			await waitAllPromises();

			getByTestId('workflow-review-request-changes-button').click();
			await waitAllPromises();

			expect(router.currentRoute.value.fullPath).toBe('/workflow-review-requests/req-1');
		});

		it('does not renavigate when already on the closed tab', async () => {
			await router.replace('/workflow-review-requests/req-1?state=closed');
			store.activeTab = 'closed';

			const { getByTestId } = renderComponent();
			await waitAllPromises();
			const replaceSpy = vi.spyOn(router, 'replace');

			getByTestId('workflow-review-approve-button').click();
			await waitAllPromises();

			expect(replaceSpy).not.toHaveBeenCalled();
			expect(router.currentRoute.value.fullPath).toBe(
				'/workflow-review-requests/req-1?state=closed',
			);
		});

		it('shows an error toast when the decision fails', async () => {
			const error = new Error('forbidden');
			store.decideOnReview.mockRejectedValueOnce(error);

			const { getByTestId } = renderComponent();
			await waitAllPromises();
			getByTestId('workflow-review-approve-button').click();
			await waitAllPromises();

			expect(showError).toHaveBeenCalledWith(error, 'Could not submit review decision');
		});

		// The detail pane wins over the list item, so a failed decision must refresh it
		// too — otherwise the pane stays open and actionable and every retry re-fails.
		it('refreshes the detail as well as the list when the decision fails', async () => {
			store.decideOnReview.mockRejectedValueOnce(new Error('conflict'));
			store.fetchList.mockResolvedValue(undefined);

			const { getByTestId } = renderComponent();
			await waitAllPromises();
			store.fetchDetail.mockClear();
			getByTestId('workflow-review-approve-button').click();
			await waitAllPromises();

			expect(store.fetchList).toHaveBeenCalledWith({ reset: true });
			expect(store.fetchDetail).toHaveBeenCalledWith('req-1');
		});

		// Each button carries its own tooltip, so both must agree.
		it('keeps the buttons enabled and the tooltips off when the viewer can decide', async () => {
			const { getByTestId } = renderComponent();
			await waitAllPromises();

			for (const button of decisionButtons(getByTestId)) {
				expect(button).not.toBeDisabled();
				expect(decisionTooltip(button)).toHaveAttribute('data-disabled', 'true');
			}
		});

		it('disables the buttons and says why when the viewer contributed a version', async () => {
			store.detail = createDetail({
				viewerCanDecide: false,
				viewerDecisionIneligibilityReason: 'author',
			});

			const { getByTestId } = renderComponent();
			await waitAllPromises();

			for (const button of decisionButtons(getByTestId)) {
				expect(button).toBeDisabled();
				expect(decisionTooltip(button)).toHaveAttribute('data-disabled', 'false');
				expect(decisionTooltip(button)).toHaveAttribute(
					'data-content',
					'You contributed a version to this review.',
				);
			}
		});

		it('falls back to the generic permission hint for any other reason', async () => {
			store.detail = createDetail({
				viewerCanDecide: false,
				viewerDecisionIneligibilityReason: 'missing_publish_permission',
			});

			const { getByTestId } = renderComponent();
			await waitAllPromises();

			for (const button of decisionButtons(getByTestId)) {
				expect(button).toBeDisabled();
				expect(decisionTooltip(button)).toHaveAttribute(
					'data-content',
					'Missing permissions to perform this action',
				);
			}
		});

		it('does not submit a decision for an ineligible viewer', async () => {
			store.detail = createDetail({
				viewerCanDecide: false,
				viewerDecisionIneligibilityReason: 'author',
			});

			const { getByTestId } = renderComponent();
			await waitAllPromises();
			getByTestId('workflow-review-approve-button').click();
			await waitAllPromises();

			expect(store.decideOnReview).not.toHaveBeenCalled();
		});

		it('disables both buttons while a decision is in flight', async () => {
			let resolveDecision!: () => void;
			store.decideOnReview.mockImplementationOnce(
				async () =>
					await new Promise<DecideWorkflowReviewRequestResponse>((resolve) => {
						resolveDecision = () => resolve(decisionResponse());
					}),
			);

			const { getByTestId } = renderComponent();
			await waitAllPromises();

			getByTestId('workflow-review-approve-button').click();
			await vi.waitFor(() => {
				expect(getByTestId('workflow-review-approve-button')).toBeDisabled();
			});
			expect(getByTestId('workflow-review-request-changes-button')).toBeDisabled();

			resolveDecision();
			await waitAllPromises();

			expect(getByTestId('workflow-review-approve-button')).not.toBeDisabled();
			expect(getByTestId('workflow-review-request-changes-button')).not.toBeDisabled();
		});
	});

	it('shows an error toast when probing the inbox fails', async () => {
		const error = new Error('network');
		store.probeInbox.mockRejectedValueOnce(error);

		renderComponent();
		await waitAllPromises();

		expect(showError).toHaveBeenCalledWith(error, 'Could not load workflow reviews');
	});

	it('does not toast probe errors after unmount', async () => {
		let rejectProbe!: (error: Error) => void;
		store.probeInbox.mockImplementationOnce(
			async () =>
				await new Promise<void>((_resolve, reject) => {
					rejectProbe = reject;
				}),
		);

		const { unmount } = renderComponent();
		unmount();
		rejectProbe(new Error('network'));
		await waitAllPromises();

		expect(showError).not.toHaveBeenCalled();
	});

	it('resets the store on unmount', async () => {
		const { unmount } = renderComponent();
		await waitAllPromises();
		unmount();

		expect(store.reset).toHaveBeenCalledTimes(1);
	});
});

function decisionButtons(getByTestId: (id: string) => HTMLElement) {
	return [
		getByTestId('workflow-review-approve-button'),
		getByTestId('workflow-review-request-changes-button'),
	];
}

/**
 * The tab bar renders a tooltip per tab, which the N8nTooltip stub matches too,
 * so walk up from the button rather than querying the test id globally.
 */
function decisionTooltip(button: HTMLElement) {
	const tooltip = button.closest('[data-test-id="workflow-review-decision-tooltip"]');
	if (!tooltip) throw new Error('decision button is not wrapped in a tooltip');
	return tooltip;
}

function createInboxItem(): WorkflowReviewInboxItem {
	return {
		id: 'req-1',
		projectId: 'proj-1',
		title: 'List review',
		workflowName: 'My workflow',
		workflowVersionId: null,
		requester: null,
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
