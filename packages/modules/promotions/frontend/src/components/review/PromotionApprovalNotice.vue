<script setup lang="ts">
import { useRootStore } from '@n8n/stores/useRootStore';
import { ref, watch } from 'vue';

import { getPromotionReviewChanges } from '../../promotions.api';
import type { PromotionOutsideAccessDependency } from '../../promotions.types';
import PromotionUnresolvedSummary from '../PromotionUnresolvedSummary.vue';

/**
 * The warning in the approval dialog of a promotion review: the workflows that cannot be
 * published, because the promotion did not carry their dependencies. It renders nothing when
 * there are none, or when the load fails, so it never blocks the approval.
 */
// Written out, like the other slots: the Vue compiler cannot resolve an imported alias here.
const props = defineProps<{ reviewId: string }>();

const rootStore = useRootStore();
const dependencies = ref<PromotionOutsideAccessDependency[]>([]);

watch(
	() => props.reviewId,
	async (reviewId) => {
		try {
			const changes = await getPromotionReviewChanges(rootStore.restApiContext, reviewId);
			dependencies.value = changes.outsideAccess ?? [];
		} catch {
			dependencies.value = [];
		}
	},
	{ immediate: true },
);
</script>

<template>
	<div v-if="dependencies.length > 0" data-test-id="promotion-approval-notice">
		<PromotionUnresolvedSummary :dependencies="dependencies" direction="promote" />
	</div>
</template>
