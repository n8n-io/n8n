<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import type { WorkflowReviewRequestState } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { N8nHeading, N8nLoading, N8nText } from '@n8n/design-system';
import { useRoute, useRouter } from 'vue-router';
import PageViewLayout from '@/app/components/layouts/PageViewLayout.vue';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useToast } from '@n8n/composables/useToast';

import WorkflowReviewDetailTabs from '../components/WorkflowReviewDetailTabs.vue';
import type { WorkflowReviewDetailTab } from '../components/WorkflowReviewDetailTabs.vue';
import WorkflowReviewRequestsSidebar from '../components/WorkflowReviewRequestsSidebar.vue';
import type { ReviewInboxSidebarSection } from '../components/WorkflowReviewRequestsSidebar.vue';
import WorkflowReviewStatusDot from '../components/WorkflowReviewStatusDot.vue';
import { REVIEW_INBOX_QUERY_PARAM, WORKFLOW_REVIEW_REQUESTS_VIEW } from '../constants';
import { useReviewActivityStore } from '../reviewActivity.store';
import { useReviewInboxStore, type ReviewInboxSectionKey } from '../reviewInbox.store';
import type { WorkflowReviewDecisionInput } from '../workflowReviews.api';

const store = useReviewInboxStore();
// The tab round trip destroys the feed subtree, so its lifecycle lives here; the
// feed and the composer read the store themselves.
const activityStore = useReviewActivityStore();
const {
	probeSettled,
	showSidebar,
	activeTab,
	detail,
	detailLoading,
	detailNotFound,
	isEmpty,
	openCount,
	closedCount,
} = storeToRefs(store);

// `storeToRefs` does not reach into the nested `sections` object; Pinia already
// unwraps the slice refs, so read them through the store.
function toSidebarSection(key: ReviewInboxSectionKey): ReviewInboxSidebarSection {
	const slice = store.sections[key];
	return {
		key,
		items: slice.items,
		loading: slice.loading,
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

function firstParam(value: string | string[] | undefined): string | null {
	const param = Array.isArray(value) ? value[0] : value;
	return param || null;
}

const selectedReviewId = computed(() => firstParam(route.params.reviewRequestId));

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

// Hydrate the tab before probing so the first list fetch uses the URL state.
store.activeTab = stateFromQuery(route.query[REVIEW_INBOX_QUERY_PARAM.state]);

const selectedListItem = computed(() =>
	selectedReviewId.value ? store.findItemById(selectedReviewId.value) : null,
);
const selectedItem = computed(() => detail.value ?? selectedListItem.value);

const i18n = useI18n();
const documentTitle = useDocumentTitle();
const { showError, showMessage } = useToast();

documentTitle.set(i18n.baseText('workflowReviews.page.title'));

let isMounted = false;

function handleListError(error: unknown) {
	if (!isMounted) return;
	showError(error, i18n.baseText('workflowReviews.error.load'));
}

watch(
	selectedReviewId,
	(id) => {
		if (!isOnInbox()) return;
		if (id) {
			void store.fetchDetail(id).catch(handleListError);
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
		void store.setActiveTab(stateFromQuery(next)).catch(handleListError);
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

async function onLoadMore(section: ReviewInboxSectionKey) {
	try {
		await store.loadMore(section);
	} catch (error) {
		handleListError(error);
	}
}

async function onRetrySection(section: ReviewInboxSectionKey) {
	try {
		await store.retry(section);
	} catch (error) {
		handleListError(error);
	}
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
		// entry this decision just wrote needs an explicit refetch. Guarded because the await
		// above lets the viewer pick another review meanwhile: refetching the old one would wipe
		// its feed and discard the newer review's in-flight page, and following it to the closed
		// tab would yank the viewer off the review they are now typing on.
		if (selectedReviewId.value === id) {
			activityStore.clearDecisionNote(input.note ?? '');
			void activityStore.fetchFeed(id);
			if (state === 'closed') {
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
			handleListError(refetchError);
		}
		// The feed too, or the panel keeps one missing the decision that beat this one. The
		// note stays: the reviewer may want to retry with it.
		if (selectedReviewId.value === id) void activityStore.fetchFeed(id);
	} finally {
		deciding.value = false;
	}
}

onMounted(async () => {
	isMounted = true;
	try {
		await store.probeInbox();
	} catch (error) {
		await handleListError(error);
	}
});

onUnmounted(() => {
	isMounted = false;
	store.reset();
	activityStore.reset();
});
</script>

<template>
	<PageViewLayout full-width data-test-id="workflow-review-requests-view">
		<div :class="$style.content">
			<WorkflowReviewRequestsSidebar
				v-if="showSidebar"
				:sections="sidebarSections"
				:active-tab="activeTab"
				:open-count="openCount"
				:closed-count="closedCount"
				:selected-id="selectedReviewId"
				@select="onSelect"
				@clear="onClearSelection"
				@update:active-tab="onActiveTabChange"
				@load-more="onLoadMore"
				@retry="onRetrySection"
			/>

			<div :class="$style.main">
				<div :class="$style.columnTitle">
					<div
						v-if="showSidebar && selectedItem"
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
					<N8nHeading
						v-else-if="!showSidebar"
						bold
						tag="h2"
						size="xlarge"
						data-test-id="workflow-reviews-page-title"
					>
						{{ i18n.baseText('workflowReviews.page.title') }}
					</N8nHeading>
				</div>

				<div :class="$style.mainBody">
					<N8nLoading v-if="!probeSettled" :loading="true" :rows="3" />
					<div
						v-else-if="selectedReviewId && detailNotFound"
						data-test-id="workflow-review-detail-not-found"
					>
						<N8nHeading bold tag="h3" size="large">
							{{ i18n.baseText('workflowReviews.detail.notFound.title') }}
						</N8nHeading>
						<N8nText color="text-light" size="medium">
							{{ i18n.baseText('workflowReviews.detail.notFound.body') }}
						</N8nText>
					</div>
					<!-- Must precede the selectedItem branch: on a deep link the review is not
						in the list yet, so selectedItem is null while the detail loads. -->
					<N8nLoading v-else-if="selectedReviewId && detailLoading" :loading="true" :rows="3" />
					<WorkflowReviewDetailTabs
						v-else-if="selectedItem"
						:review="selectedItem"
						:tab="detailTab"
						:deciding="deciding"
						@update:tab="onDetailTabChange"
						@decide="onDecide(selectedItem.id, $event)"
					/>
					<N8nText
						v-else-if="!showSidebar"
						color="text-light"
						size="medium"
						data-test-id="workflow-reviews-disclaimer"
					>
						{{ i18n.baseText('workflowReviews.disclaimer.body') }}
					</N8nText>
					<N8nText
						v-else-if="isEmpty"
						color="text-light"
						size="medium"
						data-test-id="workflow-reviews-empty-state"
					>
						{{ i18n.baseText(`workflowReviews.emptyState.body.${activeTab}`) }}
					</N8nText>
					<N8nText
						v-else
						color="text-light"
						size="medium"
						data-test-id="workflow-reviews-no-selection"
					>
						{{ i18n.baseText('workflowReviews.noSelection.body') }}
					</N8nText>
				</div>
			</div>
		</div>
	</PageViewLayout>
</template>

<style lang="scss" module>
.content {
	--review-tab-bar--height: var(--height--sm);
	--review-tab-bar--indicator-overhang: 11px;
	--review-tab-bar--gap: calc(var(--spacing--sm) + var(--review-tab-bar--indicator-overhang));

	--review-callout--max-width: 34rem;

	display: flex;
	width: 100%;
	min-height: 0;
	height: 100%;
	overflow: hidden;
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
</style>
