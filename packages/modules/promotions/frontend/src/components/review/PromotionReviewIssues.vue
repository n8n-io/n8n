<script setup lang="ts">
import type { PromotionMissingDependency } from '@n8n/api-types';
import { N8nEmptyState, N8nLoading } from '@n8n/design-system';
import type { SlotPromotionIssuesProps } from '@n8n/frontend-module-sdk';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, ref, shallowRef, watch } from 'vue';

import { getLoadedReviewChanges } from '../../promotionReviewChanges';
import { getPromotionReviewChanges } from '../../promotions.api';
import PromotionBlockers from '../preview/PromotionBlockers.vue';

/**
 * The dependencies that a promotion review leaves out. The author confirmed them at Promote. The
 * reviewer cannot act on them here, so each action is disabled and says why.
 */
const props = defineProps<SlotPromotionIssuesProps>();

const i18n = useI18n();
const rootStore = useRootStore();

const state = ref<'loading' | 'error' | 'ready'>('loading');
const missingDependencies = shallowRef<PromotionMissingDependency[]>([]);
// A review shows no project of a dependency. The reviewer does not promote from that project.
const listed = computed(() => missingDependencies.value.map(({ project, ...entry }) => entry));
// Each load counts up, so the answer for a review that is no longer shown is dropped.
let generation = 0;

watch(
	() => props.reviewId,
	async (reviewId) => {
		const current = ++generation;
		// The Changes tab loaded this review. A second request costs time, and its answer can
		// differ from the count of the tab and from the head commit that the reviewer approves.
		const loaded = getLoadedReviewChanges(reviewId);
		if (loaded) {
			missingDependencies.value = loaded.missingDependencies;
			state.value = 'ready';
			return;
		}
		state.value = 'loading';
		try {
			const changes = await getPromotionReviewChanges(rootStore.restApiContext, reviewId);
			if (current !== generation) return;
			missingDependencies.value = changes.missingDependencies;
			state.value = 'ready';
		} catch {
			if (current === generation) state.value = 'error';
		}
	},
	{ immediate: true },
);
</script>

<template>
	<N8nLoading v-if="state === 'loading'" :rows="6" data-test-id="promotion-review-issues-loading" />
	<N8nEmptyState
		v-else-if="state === 'error'"
		:icon="{ type: 'icon', value: 'circle-alert' }"
		:heading="i18n.baseText('promotions.review.issues.error')"
		data-test-id="promotion-review-issues-error"
	/>
	<!-- A review has no Apply check, so the list shows as on Promote. -->
	<PromotionBlockers
		v-else
		:check="null"
		:missing-dependencies="listed"
		:busy="false"
		:intro="i18n.baseText('promotions.review.issues.intro')"
		:outside-description="i18n.baseText('promotions.review.issues.outsideDescription')"
		plain-workflow-names
		data-test-id="promotion-review-issues"
	/>
</template>
