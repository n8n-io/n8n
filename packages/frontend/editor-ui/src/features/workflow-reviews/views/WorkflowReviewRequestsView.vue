<script lang="ts" setup>
import { onMounted, onUnmounted } from 'vue';
import { storeToRefs } from 'pinia';
import type { WorkflowReviewRequestState } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { N8nHeading, N8nLoading, N8nText } from '@n8n/design-system';
import PageViewLayout from '@/app/components/layouts/PageViewLayout.vue';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useToast } from '@/app/composables/useToast';

import WorkflowReviewRequestsSidebar from '../components/WorkflowReviewRequestsSidebar.vue';
import { useReviewInboxStore } from '../reviewInbox.store';

const store = useReviewInboxStore();
const {
	probeSettled,
	showSidebar,
	selectedItem,
	items,
	activeState,
	selectedId,
	loading,
	loadingMore,
	hasMore,
	isEmpty,
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

async function onActiveStateChange(state: WorkflowReviewRequestState) {
	try {
		await store.setActiveState(state);
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
				:active-state="activeState"
				:selected-id="selectedId"
				:loading="loading"
				:loading-more="loadingMore"
				:has-more="hasMore"
				:is-empty="isEmpty"
				@select="store.selectItem"
				@clear="store.clearSelection"
				@update:active-state="onActiveStateChange"
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
					<N8nText
						v-else-if="selectedItem"
						color="text-light"
						size="medium"
						data-test-id="workflow-review-request-detail-stub"
					>
						{{ i18n.baseText('workflowReviews.detail.placeholder') }}
					</N8nText>
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
						{{ i18n.baseText('workflowReviews.emptyState.body') }}
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
</style>
