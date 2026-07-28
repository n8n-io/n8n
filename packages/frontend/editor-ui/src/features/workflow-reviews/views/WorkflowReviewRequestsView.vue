<script lang="ts" setup>
import { onMounted, onUnmounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import type { WorkflowReviewRequestState } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { N8nButton, N8nHeading, N8nLoading, N8nText } from '@n8n/design-system';
import PageViewLayout from '@/app/components/layouts/PageViewLayout.vue';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useToast } from '@/app/composables/useToast';

import WorkflowReviewRequestsSidebar from '../components/WorkflowReviewRequestsSidebar.vue';
import { useReviewInboxStore } from '../reviewInbox.store';
import type { WorkflowReviewDecisionInput } from '../workflowReviews.api';

const store = useReviewInboxStore();
const {
	probeSettled,
	showSidebar,
	selectedItem,
	items,
	activeTab,
	selectedId,
	loading,
	loadingMore,
	hasMore,
	isEmpty,
	openCount,
	closedCount,
} = storeToRefs(store);

const i18n = useI18n();
const documentTitle = useDocumentTitle();
const { showError } = useToast();

documentTitle.set(i18n.baseText('workflowReviews.page.title'));

let isMounted = false;

function handleListError(error: unknown) {
	if (!isMounted) return;
	showError(error, i18n.baseText('workflowReviews.error.load'));
}

async function onActiveTabChange(tab: WorkflowReviewRequestState) {
	try {
		await store.setActiveTab(tab);
	} catch (error) {
		await handleListError(error);
	}
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
		// The decision failed because someone else already decided (409), so refetch.
		// Otherwise the item keeps showing as open and every retry re-fails.
		try {
			await store.fetchList({ reset: true });
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
				:selected-id="selectedId"
				:loading="loading"
				:loading-more="loadingMore"
				:has-more="hasMore"
				:is-empty="isEmpty"
				@select="store.selectItem"
				@clear="store.clearSelection"
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
