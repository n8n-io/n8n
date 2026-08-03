<script lang="ts" setup>
import type { PushMessage } from '@n8n/api-types';
import { N8nHeading, N8nLoading, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { storeToRefs } from 'pinia';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

import PageViewLayout from '@/app/components/layouts/PageViewLayout.vue';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useToast } from '@/app/composables/useToast';
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';
import GithubReviewDetail from '@/features/promotions/components/GithubReviewDetail.vue';
import NewPromotionDialog from '@/features/promotions/components/NewPromotionDialog.vue';
import PromotionDetailGeneric from '@/features/promotions/components/PromotionDetailGeneric.vue';
import PromotionsSidebar from '@/features/promotions/components/PromotionsSidebar.vue';
import { GITHUB_REVIEW_MODEL } from '@/features/promotions/constants';
import { usePromotionsStore } from '@/features/promotions/promotions.store';

const i18n = useI18n();
const toast = useToast();
const documentTitle = useDocumentTitle();
const pushStore = usePushConnectionStore();
const store = usePromotionsStore();

const { items, selectedId, selected, loading, initialized } = storeToRefs(store);

const showNewDialog = ref(false);

/** Journey UIs by model; anything unregistered falls back to the generic one. */
const detailComponent = computed(() =>
	selected.value?.model === GITHUB_REVIEW_MODEL ? GithubReviewDetail : PromotionDetailGeneric,
);

const detailTitle = computed(() =>
	selected.value
		? i18n.baseText('promotions.card.title', {
				interpolate: {
					type: selected.value.unitOfWork.type,
					id: selected.value.unitOfWork.id,
				},
			})
		: i18n.baseText('promotions.page.title'),
);

documentTitle.set(i18n.baseText('promotions.page.title'));

async function refetchAll() {
	try {
		await store.fetchAll();
	} catch (error) {
		toast.showError(error, i18n.baseText('promotions.error.load'));
	}
}

/**
 * Invalidation-only pushes: promotion state also moves without user action
 * (tracked review approvals, the PR poller), so refetch the affected row.
 */
function onPushMessage(event: PushMessage) {
	if (event.type !== 'promotionsUpdated') return;
	void store.refetchOne(event.data.promotionId).catch(() => refetchAll());
}

const removePushListener = pushStore.addEventListener(onPushMessage);

onMounted(async () => {
	await Promise.all([
		refetchAll(),
		store.fetchConfig().catch(() => {
			// Config is contextual chrome; the list works without it
		}),
	]);
});

onBeforeUnmount(() => removePushListener());
</script>

<template>
	<PageViewLayout data-test-id="promotions-view">
		<div :class="$style.content">
			<PromotionsSidebar
				:items="items"
				:selected-id="selectedId"
				:loading="loading"
				@select="store.select"
				@new="showNewDialog = true"
			/>

			<div :class="$style.main">
				<div :class="$style.columnTitle">
					<N8nHeading bold tag="h2" size="xlarge" data-test-id="promotion-detail-title">
						{{ detailTitle }}
					</N8nHeading>
				</div>

				<div :class="$style.mainBody">
					<N8nLoading v-if="!initialized" :loading="true" :rows="3" />
					<component :is="detailComponent" v-else-if="selected" :promotion="selected" />
					<N8nText v-else color="text-light" size="medium" data-test-id="promotions-no-selection">
						{{
							items.length === 0
								? i18n.baseText('promotions.emptyState.body')
								: i18n.baseText('promotions.noSelection.body')
						}}
					</N8nText>
				</div>
			</div>
		</div>

		<NewPromotionDialog v-model:open="showNewDialog" />
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
