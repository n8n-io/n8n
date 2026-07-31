<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import type { WorkflowReviewRequestState } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { N8nButton, N8nHeading, N8nLoading, N8nText } from '@n8n/design-system';
import { useRoute, useRouter } from 'vue-router';
import PageViewLayout from '@/app/components/layouts/PageViewLayout.vue';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useToast } from '@/app/composables/useToast';

import WorkflowReviewRequestsSidebar from '../components/WorkflowReviewRequestsSidebar.vue';
import { REVIEW_INBOX_QUERY_PARAM, WORKFLOW_REVIEW_REQUESTS_VIEW } from '../constants';
import { useReviewInboxStore } from '../reviewInbox.store';
import type { WorkflowReviewDecisionInput } from '../workflowReviews.api';

const store = useReviewInboxStore();
const {
	probeSettled,
	showSidebar,
	items,
	activeTab,
	detail,
	detailLoading,
	detailNotFound,
	loading,
	loadingMore,
	hasMore,
	isEmpty,
	openCount,
	closedCount,
} = storeToRefs(store);

const route = useRoute();
const router = useRouter();

function firstParam(value: string | string[] | undefined): string | null {
	const param = Array.isArray(value) ? value[0] : value;
	return param || null;
}

const selectedReviewId = computed(() => firstParam(route.params.reviewRequestId));

function stateFromQuery(value: unknown): WorkflowReviewRequestState {
	return value === 'closed' ? 'closed' : 'open';
}

// Hydrate the tab before probing so the first list fetch uses the URL state.
store.activeTab = stateFromQuery(route.query[REVIEW_INBOX_QUERY_PARAM.state]);

const selectedListItem = computed(
	() => items.value.find((item) => item.id === selectedReviewId.value) ?? null,
);
const selectedItem = computed(() => detail.value ?? selectedListItem.value);

const i18n = useI18n();
const documentTitle = useDocumentTitle();
const { showError } = useToast();

documentTitle.set(i18n.baseText('workflowReviews.page.title'));

let isMounted = false;

function handleListError(error: unknown) {
	if (!isMounted) return;
	showError(error, i18n.baseText('workflowReviews.error.load'));
}

watch(
	selectedReviewId,
	(id) => {
		if (route.name !== WORKFLOW_REVIEW_REQUESTS_VIEW) return;
		if (id) void store.fetchDetail(id).catch(handleListError);
		else store.clearDetail();
	},
	{ immediate: true },
);

watch(
	() => route.query[REVIEW_INBOX_QUERY_PARAM.state],
	(next) => {
		if (route.name !== WORKFLOW_REVIEW_REQUESTS_VIEW) return;
		void store.setActiveTab(stateFromQuery(next)).catch(handleListError);
	},
);

function onSelect(id: string) {
	void router.replace({ params: { reviewRequestId: id }, query: route.query });
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

async function onLoadMore() {
	try {
		await store.loadMore();
	} catch (error) {
		await handleListError(error);
	}
}

const deciding = ref(false);

async function onDecide(id: string, decision: WorkflowReviewDecisionInput) {
	deciding.value = true;
	try {
		await store.decideOnReview(id, decision);
	} catch (error) {
		showError(error, 'Could not submit review decision');
		// The decision failed because someone else already decided (409), so
		// refetch. Otherwise the item keeps showing as open and every retry
		// re-fails.
		try {
			await Promise.all([
				store.fetchList({ reset: true }),
				selectedReviewId.value ? store.fetchDetail(selectedReviewId.value) : undefined,
			]);
		} catch (refetchError) {
			handleListError(refetchError);
		}
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
});
</script>

<template>
	<PageViewLayout data-test-id="workflow-review-requests-view">
		<div :class="$style.content">
			<WorkflowReviewRequestsSidebar
				v-if="showSidebar"
				:items="items"
				:active-tab="activeTab"
				:open-count="openCount"
				:closed-count="closedCount"
				:selected-id="selectedReviewId"
				:loading="loading"
				:loading-more="loadingMore"
				:has-more="hasMore"
				:is-empty="isEmpty"
				@select="onSelect"
				@clear="onClearSelection"
				@update:active-tab="onActiveTabChange"
				@load-more="onLoadMore"
			/>

			<div :class="$style.main">
				<div :class="$style.columnTitle">
					<N8nHeading
						v-if="showSidebar && selectedItem"
						bold
						tag="h2"
						size="xlarge"
						data-test-id="workflow-review-request-title"
					>
						{{ selectedItem.title }}
					</N8nHeading>
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
					<div v-else-if="selectedItem">
						<N8nText
							color="text-light"
							size="medium"
							data-test-id="workflow-review-request-detail-stub"
						>
							{{ i18n.baseText('workflowReviews.detail.placeholder') }}
						</N8nText>
						<!-- TODO(LIGO-892): placeholder actions with intentionally hardcoded copy.
							Real design: disabled-with-explanation for non-admin authors ("you
							contributed a version to this review"), i18n, and a `viewerCanDecide`
							capability field from the backend. -->
						<div v-if="selectedItem.state === 'open'" :class="$style.decisionActions">
							<N8nButton
								:disabled="deciding"
								data-test-id="workflow-review-approve-button"
								@click="onDecide(selectedItem.id, 'approved')"
							>
								Approve
							</N8nButton>
							<N8nButton
								type="secondary"
								:disabled="deciding"
								data-test-id="workflow-review-request-changes-button"
								@click="onDecide(selectedItem.id, 'changes_requested')"
							>
								Request changes
							</N8nButton>
						</div>
					</div>
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

.mainBody {
	flex: 1;
	min-height: 0;
	overflow: auto;
}

.decisionActions {
	display: flex;
	gap: var(--spacing--2xs);
	margin-top: var(--spacing--sm);
}
</style>
