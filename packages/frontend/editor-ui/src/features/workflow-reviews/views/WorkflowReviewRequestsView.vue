<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import type { WorkflowReviewRequestState } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import {
	N8nEmptyState,
	N8nHeading,
	N8nLoading,
	N8nResizeWrapper,
	type EmptyStateIconCards,
	type IconOrEmoji,
} from '@n8n/design-system';
import { useRoute, useRouter } from 'vue-router';
import PageViewLayout from '@/app/components/layouts/PageViewLayout.vue';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useResizablePanel } from '@n8n/design-system';
import { LOCAL_STORAGE_WORKFLOW_REVIEW_SIDEBAR_WIDTH } from '@/app/constants/localStorage';
import { useToast } from '@n8n/composables/useToast';
import { hasPermission } from '@/app/utils/rbac/permissions';
import { usePromotionsEnabled } from '@/features/shared/promotions/usePromotionsEnabled';

import WorkflowReviewDetailTabs from '../components/WorkflowReviewDetailTabs.vue';
import type { WorkflowReviewDetailTab } from '../components/WorkflowReviewDetailTabs.vue';
import WorkflowReviewRequestsSidebar from '../components/WorkflowReviewRequestsSidebar.vue';
import type { ReviewInboxSidebarSection } from '../components/WorkflowReviewRequestsSidebar.vue';
import WorkflowReviewStatusDot from '../components/WorkflowReviewStatusDot.vue';
import PromotionReviewDetail from '../components/PromotionReviewDetail.vue';
import PromotionReviewStateDot from '../components/PromotionReviewStateDot.vue';
import { REVIEW_INBOX_QUERY_PARAM, WORKFLOW_REVIEW_REQUESTS_VIEW } from '../constants';
import {
	fromPromotionReviewRouteId,
	isPromotionReviewId,
	usePromotionReviewsStore,
} from '../promotionReviews.store';
import { useReviewActivityStore } from '../reviewActivity.store';
import { useReviewInboxStore, type ReviewInboxSectionKey } from '../reviewInbox.store';
import type { WorkflowReviewDecisionInput } from '../workflowReviews.api';

const store = useReviewInboxStore();
// Promotion Reviews share the inbox. They are one more task for the reviewer,
// so they sit in the same lists, sorted by creation time.
const promotionStore = usePromotionReviewsStore();
// Same gate as the Promotions settings page: module active, rollout flag on, and
// the viewer may read connections. Otherwise the inbox never asks for runs and a
// `promotion:` deep link falls through to the not-found state.
const { isEnabled: isPromotionsEnabled } = usePromotionsEnabled();
const promotionReviewsEnabled = computed(
	() =>
		isPromotionsEnabled.value && hasPermission(['rbac'], { rbac: { scope: 'gitConnection:read' } }),
);
const isPromotionRoute = (id: string | null): id is string =>
	promotionReviewsEnabled.value && isPromotionReviewId(id);
// The tab round trip destroys the feed subtree, so its lifecycle lives here; the
// feed and the composer read the store themselves.
const activityStore = useReviewActivityStore();
const {
	activeTab,
	detail,
	detailLoading,
	detailNotFound,
	isEmpty,
	isLoadingActiveTab,
	activeTabInitialLoadFailed,
	hasItemsInActiveTab,
	openCount,
	closedCount,
} = storeToRefs(store);

// `storeToRefs` does not reach into the nested `sections` object; Pinia already
// unwraps the slice refs, so read them through the store.
function toSidebarSection(key: ReviewInboxSectionKey): ReviewInboxSidebarSection {
	const slice = store.sections[key];
	// Admins see every Promotion Review under "Waiting for review" and "Closed".
	const promotionItems = !promotionReviewsEnabled.value
		? undefined
		: key === 'waiting'
			? promotionStore.items.open
			: key === 'closed'
				? promotionStore.items.closed
				: undefined;
	return {
		key,
		items: slice.items,
		promotionItems,
		loadingMore: slice.loadingMore,
		hasMore: slice.hasMore,
		error: slice.error,
	};
}

const sidebarSections = computed<ReviewInboxSidebarSection[]>(() =>
	activeTab.value === 'closed'
		? [toSidebarSection('closed')]
		: [toSidebarSection('waiting'), toSidebarSection('authored')],
);

const route = useRoute();
const router = useRouter();

const contentRef = ref<HTMLElement | null>(null);
const sidebarResizer = useResizablePanel({
	container: contentRef,
	width: {
		localStorageKey: LOCAL_STORAGE_WORKFLOW_REVIEW_SIDEBAR_WIDTH,
		defaultSize: function getDefaultWidth(size) {
			return Math.min(Math.max(size * 0.25, 240), 400);
		},
		minSize: 240,
		maxSize: function getMaxWidth(size) {
			return Math.min(size * 0.5, 640);
		},
		snap: true,
	},
});
const sidebarWidth = sidebarResizer.width;

function firstParam(value: string | string[] | undefined): string | null {
	const param = Array.isArray(value) ? value[0] : value;
	return param || null;
}

const selectedReviewId = computed(() => firstParam(route.params.reviewRequestId));
const selectedPromotionRunId = computed(() =>
	isPromotionRoute(selectedReviewId.value)
		? fromPromotionReviewRouteId(selectedReviewId.value)
		: null,
);
const selectedPromotion = computed(() =>
	selectedPromotionRunId.value
		? (promotionStore.detail ?? promotionStore.findItemById(selectedPromotionRunId.value))
		: null,
);

/**
 * Watchers and resolved requests below both reach this view after the viewer may have left it,
 * where the query params it writes mean something else entirely.
 */
function isOnInbox() {
	return route.name === WORKFLOW_REVIEW_REQUESTS_VIEW;
}

function stateFromQuery(value: unknown): WorkflowReviewRequestState {
	return value === 'closed' ? 'closed' : 'open';
}

// Clear on entry, not exit: a discarded layout-swap copy can unmount after the live
// one has started loading, and a teardown clear would invalidate those requests.
store.reset();
activityStore.reset();
promotionStore.reset();

// Hydrate the tab before loading so the first list fetch uses the URL state.
store.activeTab = stateFromQuery(route.query[REVIEW_INBOX_QUERY_PARAM.state]);

const selectedListItem = computed(() =>
	selectedReviewId.value && !selectedPromotionRunId.value
		? store.findItemById(selectedReviewId.value)
		: null,
);
const selectedItem = computed(() => detail.value ?? selectedListItem.value);

// The empty and no-selection states must count Promotion Reviews too.
const hasPromotionRowsInActiveTab = computed(
	() => promotionReviewsEnabled.value && promotionStore.items[activeTab.value].length > 0,
);
const inboxIsEmpty = computed(() => isEmpty.value && !hasPromotionRowsInActiveTab.value);
const inboxHasItems = computed(
	() => hasItemsInActiveTab.value || hasPromotionRowsInActiveTab.value,
);

const i18n = useI18n();
const documentTitle = useDocumentTitle();
const { showError, showMessage } = useToast();

documentTitle.set(i18n.baseText('workflowReviews.page.title'));

const reviewsIcon: EmptyStateIconCards = {
	type: 'cards',
	center: 'message-square-text',
	sides: ['file-diff', 'git-branch', 'circle-check', 'list', 'message-square'],
};

const alertIcon: IconOrEmoji = { type: 'icon', value: 'circle-alert' };

// Counts are optional; name the tab when its summary is unavailable.
const noSelectionHeading = computed(() => {
	const count = activeTab.value === 'closed' ? closedCount.value : openCount.value;
	if (count === null) {
		return activeTab.value === 'closed'
			? i18n.baseText('workflowReviews.closedReviews')
			: i18n.baseText('workflowReviews.openReviews');
	}

	return i18n.baseText(`workflowReviews.noSelection.title.${activeTab.value}`, {
		adjustToNumber: count,
		interpolate: { count: String(count) },
	});
});

let isMounted = false;

function handleLoadError(error: unknown) {
	if (!isMounted) return;
	showError(error, i18n.baseText('workflowReviews.error.load'));
}

watch(
	selectedReviewId,
	(id) => {
		if (!isOnInbox()) return;
		if (isPromotionRoute(id)) {
			store.clearDetail();
			activityStore.reset();
			void promotionStore.fetchDetail(fromPromotionReviewRouteId(id)).catch(handleLoadError);
			return;
		}
		promotionStore.clearDetail();
		if (id) {
			void store.fetchDetail(id).catch(handleLoadError);
			// Failures surface in the feed's own error row, never as a second toast.
			void activityStore.fetchFeed(id);
		} else {
			store.clearDetail();
			activityStore.reset();
		}
	},
	{ immediate: true },
);

watch(
	() => route.query[REVIEW_INBOX_QUERY_PARAM.state],
	(next) => {
		if (!isOnInbox()) return;
		void store.setActiveTab(stateFromQuery(next));
		if (promotionReviewsEnabled.value) void promotionStore.fetchTab(stateFromQuery(next));
	},
);

function onSelect(id: string) {
	// Switching reviews lands on Activity tab. Deep links still win.
	const query = { ...route.query };
	if (id !== selectedReviewId.value) delete query[REVIEW_INBOX_QUERY_PARAM.tab];
	void router.replace({ params: { reviewRequestId: id }, query });
}

function onClearSelection() {
	void router.replace({ params: { reviewRequestId: '' }, query: route.query });
}

function onActiveTabChange(tab: WorkflowReviewRequestState) {
	const query = { ...route.query };
	if (tab === 'closed') query[REVIEW_INBOX_QUERY_PARAM.state] = tab;
	else delete query[REVIEW_INBOX_QUERY_PARAM.state];
	void router.replace({ query });
}

const detailTab = computed<WorkflowReviewDetailTab>(() =>
	route.query[REVIEW_INBOX_QUERY_PARAM.tab] === 'changes' ? 'changes' : 'activity',
);

function onDetailTabChange(tab: WorkflowReviewDetailTab) {
	if (!isOnInbox()) return;
	const query = { ...route.query };
	if (tab === 'changes') query[REVIEW_INBOX_QUERY_PARAM.tab] = tab;
	else delete query[REVIEW_INBOX_QUERY_PARAM.tab];
	void router.replace({ query });
}

function onLoadMore(section: ReviewInboxSectionKey) {
	void store.loadMore(section);
}

function onRetrySection(section: ReviewInboxSectionKey) {
	void store.retry(section);
}

function onRetryActiveTab() {
	void store.fetchActiveTab();
}

const deciding = ref(false);

// backend activation messages are inconsistently punctuated
function asSentence(message: string) {
	const trimmed = message.trim();
	return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

/**
 * A decision that closes the review drops its card from the open list, which
 * would leave the detail on screen with nothing selected in the sidebar. Follow
 * it to the closed tab instead, keeping the selection. The `state` query watcher
 * refetches the list from here.
 */
function followClosedReview(id: string) {
	if (!isOnInbox()) return;
	if (activeTab.value === 'closed') return;
	void router.replace({
		params: { reviewRequestId: id },
		query: { ...route.query, [REVIEW_INBOX_QUERY_PARAM.state]: 'closed' },
	});
}

async function onDecide(id: string, input: WorkflowReviewDecisionInput) {
	deciding.value = true;
	try {
		const { autoPublish, state } = await store.decideOnReview(id, input);
		// The selection does not change, so the `selectedReviewId` watcher never refires and the
		// feed entry and detail this decision just wrote need an explicit refetch — the latter is
		// what makes the "approved and published" callout show up without a reload. Guarded
		// because the await above lets the viewer pick another review meanwhile: refetching the
		// old one would wipe its feed and discard the newer review's in-flight page, and following
		// it to the closed tab would yank the viewer off the review they are now typing on.
		if (selectedReviewId.value === id) {
			activityStore.clearDecisionNote(input.note ?? '');
			void activityStore.fetchFeed(id);
			if (state === 'closed') {
				void store.fetchDetail(id).catch(handleLoadError);
				followClosedReview(id);
			}
		}

		// The view can be gone by now, and a toast — the sticky publish warning above all —
		// would sit on an unrelated page.
		if (!isMounted) return;

		if (autoPublish?.status === 'published') {
			showMessage({
				type: 'success',
				title: i18n.baseText('workflowReviews.decision.approved.published.title'),
				message: i18n.baseText('workflowReviews.decision.approved.published.message'),
			});
		} else if (autoPublish?.status === 'failed') {
			// The approval itself succeeded and is not reverted; the workflow can
			// be published through the regular publish flow, which is the retry.
			showMessage({
				type: 'warning',
				duration: 0,
				title: i18n.baseText('workflowReviews.decision.approved.publishFailed.title'),
				message: i18n.baseText('workflowReviews.decision.approved.publishFailed.message', {
					interpolate: { message: asSentence(autoPublish.message) },
				}),
			});
		}
	} catch (error) {
		// `onUnmounted` has already reset both stores, so there is nothing left to refresh and
		// nowhere for the toast to land but an unrelated page.
		if (!isMounted) return;
		showError(error, i18n.baseText('workflowReviews.decision.error.title'));
		// The decision failed because someone else already decided (409), so
		// refetch. Otherwise the item keeps showing as open and every retry
		// re-fails.
		try {
			await Promise.all([
				store.fetchActiveTab(),
				selectedReviewId.value ? store.fetchDetail(selectedReviewId.value) : undefined,
			]);
		} catch (refetchError) {
			handleLoadError(refetchError);
		}
		// The feed too, or the panel keeps one missing the decision that beat this one. The
		// note stays: the reviewer may want to retry with it.
		if (selectedReviewId.value === id) void activityStore.fetchFeed(id);
	} finally {
		deciding.value = false;
	}
}

const approving = ref(false);

/**
 * Approve merges on GitLab, which removes the row from the open list. Follow it
 * to the closed tab like a decided Workflow Review, so the detail stays selected.
 */
async function onApprovePromotion(runId: string) {
	approving.value = true;
	try {
		await promotionStore.approve(runId);
		if (!isMounted) return;
		showMessage({
			type: 'success',
			title: i18n.baseText('promotionReviews.approve.success.title'),
			message: i18n.baseText('promotionReviews.approve.success.message'),
		});
		if (selectedPromotionRunId.value === runId) followClosedReview(selectedReviewId.value ?? '');
		void promotionStore.fetchTab('closed');
	} catch (error) {
		if (!isMounted) return;
		showError(error, i18n.baseText('promotionReviews.approve.error.title'));
		// A 409 means the state moved on GitLab. Refetch, so the button reflects it.
		void promotionStore.fetchDetail(runId).catch(handleLoadError);
		void promotionStore.fetchTab(activeTab.value);
	} finally {
		approving.value = false;
	}
}

async function loadPromotionDiff(workflowId: string) {
	if (!selectedPromotionRunId.value) throw new Error('No promotion review selected');
	return await promotionStore.fetchWorkflowDiff(selectedPromotionRunId.value, workflowId);
}

onMounted(() => {
	isMounted = true;
	void store.fetchSummary();
	void store.fetchActiveTab();
	if (promotionReviewsEnabled.value) void promotionStore.fetchTab(activeTab.value);
});

onUnmounted(() => {
	isMounted = false;
});
</script>

<template>
	<PageViewLayout :class="$style.layout" full-width data-test-id="workflow-review-requests-view">
		<div ref="contentRef" :class="$style.content">
			<N8nResizeWrapper
				:class="$style.sidebarResizer"
				:style="{ width: `${sidebarWidth}px` }"
				:resizer="sidebarResizer"
				:supported-directions="['right']"
				data-test-id="workflow-reviews-sidebar-resizer"
			>
				<WorkflowReviewRequestsSidebar
					:class="$style.sidebar"
					:sections="sidebarSections"
					:loading="isLoadingActiveTab"
					:initial-load-failed="activeTabInitialLoadFailed"
					:active-tab="activeTab"
					:open-count="openCount"
					:closed-count="closedCount"
					:selected-id="selectedReviewId"
					@select="onSelect"
					@clear="onClearSelection"
					@update:active-tab="onActiveTabChange"
					@load-more="onLoadMore"
					@retry="onRetrySection"
					@retry-active-tab="onRetryActiveTab"
				/>
			</N8nResizeWrapper>

			<div :class="$style.main">
				<div :class="$style.columnTitle">
					<div
						v-if="selectedPromotion"
						:class="$style.reviewTitle"
						data-test-id="promotion-review-title-row"
					>
						<PromotionReviewStateDot :state="selectedPromotion.state" />
						<N8nHeading bold tag="h2" size="xlarge" data-test-id="promotion-review-title">
							{{ selectedPromotion.title }}
						</N8nHeading>
					</div>
					<div
						v-else-if="selectedItem"
						:class="$style.reviewTitle"
						data-test-id="workflow-review-request-title-row"
					>
						<WorkflowReviewStatusDot
							:state="selectedItem.state"
							:decision="selectedItem.decision"
						/>
						<N8nHeading bold tag="h2" size="xlarge" data-test-id="workflow-review-request-title">
							{{ selectedItem.title }}
						</N8nHeading>
					</div>
				</div>

				<div :class="$style.mainBody">
					<div
						v-if="selectedPromotionRunId && promotionStore.detailNotFound"
						:class="$style.emptyStateWrapper"
						data-test-id="promotion-review-detail-not-found"
					>
						<N8nEmptyState
							:class="$style.emptyState"
							:icon="alertIcon"
							:heading="i18n.baseText('workflowReviews.detail.notFound.title')"
							:description="i18n.baseText('promotionReviews.detail.notFound.body')"
						/>
					</div>
					<div
						v-else-if="selectedPromotionRunId && promotionStore.detailLoading && !selectedPromotion"
						:class="$style.detailSkeleton"
					>
						<N8nLoading :loading="true" :rows="3" />
					</div>
					<PromotionReviewDetail
						v-else-if="selectedPromotionRunId && selectedPromotion"
						:review="selectedPromotion"
						:approving="approving"
						:load-diff="loadPromotionDiff"
						@approve="onApprovePromotion(selectedPromotionRunId)"
					/>
					<div
						v-else-if="selectedReviewId && detailNotFound"
						:class="$style.emptyStateWrapper"
						data-test-id="workflow-review-detail-not-found"
					>
						<N8nEmptyState
							:class="$style.emptyState"
							:icon="alertIcon"
							:heading="i18n.baseText('workflowReviews.detail.notFound.title')"
							:description="i18n.baseText('workflowReviews.detail.notFound.body')"
						/>
					</div>
					<!-- Must precede the selectedItem branch: on a deep link the review is not
						in the list yet, so selectedItem is null while the detail loads. -->
					<div v-else-if="selectedReviewId && detailLoading" :class="$style.detailSkeleton">
						<N8nLoading :loading="true" :rows="3" />
					</div>
					<WorkflowReviewDetailTabs
						v-else-if="selectedItem"
						:review="selectedItem"
						:tab="detailTab"
						:deciding="deciding"
						@update:tab="onDetailTabChange"
						@decide="onDecide(selectedItem.id, $event)"
					/>
					<N8nLoading v-else-if="isLoadingActiveTab" :loading="true" :rows="3" />
					<div
						v-else-if="activeTabInitialLoadFailed && !inboxHasItems"
						:class="$style.emptyStateWrapper"
						data-test-id="workflow-reviews-load-error"
					>
						<N8nEmptyState
							:class="$style.emptyState"
							:icon="alertIcon"
							:heading="i18n.baseText('workflowReviews.error.load')"
							:button-text="i18n.baseText('generic.retry')"
							@click:button="onRetryActiveTab"
						/>
					</div>
					<div
						v-else-if="inboxIsEmpty"
						:class="$style.emptyStateWrapper"
						data-test-id="workflow-reviews-empty-state"
					>
						<N8nEmptyState
							:class="$style.emptyState"
							:icon="reviewsIcon"
							:heading="i18n.baseText(`workflowReviews.emptyState.title.${activeTab}`)"
							:description="i18n.baseText(`workflowReviews.emptyState.body.${activeTab}`)"
						/>
					</div>
					<div
						v-else-if="inboxHasItems"
						:class="$style.emptyStateWrapper"
						data-test-id="workflow-reviews-no-selection"
					>
						<N8nEmptyState
							:class="$style.emptyState"
							:icon="reviewsIcon"
							:heading="noSelectionHeading"
							:description="i18n.baseText('workflowReviews.noSelection.body')"
						/>
					</div>
				</div>
			</div>
		</div>
	</PageViewLayout>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/breakpoints';

.layout {
	padding-top: 0;
}

.content {
	--review-tab-bar--height: var(--height--sm);
	--review-tab-bar--indicator-overhang: 15px;
	--review-tab-bar--gap: calc(var(--spacing--sm) + var(--review-tab-bar--indicator-overhang));

	--review-callout--max-width: 34rem;
	--review-activity--max-width: 45rem;

	display: flex;
	width: 100%;
	min-height: 0;
	height: 100%;
	overflow: hidden;
}

.sidebarResizer {
	flex: 0 0 auto;
}

.main {
	display: flex;
	flex: 1;
	flex-direction: column;
	min-width: 0;
	min-height: 0;
	overflow: hidden;
	padding: 0 0 var(--spacing--md) var(--spacing--md);
}

.sidebar,
.main {
	padding-top: var(--spacing--lg);

	@include breakpoints.breakpoint('sm-and-down') {
		padding-top: var(--spacing--sm);
	}
}

.columnTitle {
	display: flex;
	align-items: center;
	min-height: var(--spacing--2xl);
	padding-bottom: var(--spacing--sm);
}

.reviewTitle {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.mainBody {
	flex: 1;
	min-height: 0;
	overflow: auto;
}

.detailSkeleton {
	max-width: var(--review-activity--max-width);
}

.emptyStateWrapper {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 100%;
}

.emptyStateWrapper .emptyState {
	border: none;
	padding: 0;
}
</style>
