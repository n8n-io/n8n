<script setup lang="ts">
import { N8nEmptyState, N8nLoading } from '@n8n/design-system';
import type { SlotPromotionIssuesProps } from '@n8n/frontend-module-sdk';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, ref, watch } from 'vue';

import { getPromotionReviewChanges } from '../../promotions.api';
import type { ApplyCheckResult, PromotionReviewChangesWithIssues } from '../../promotions.types';
import PromotionBlockers from '../preview/PromotionBlockers.vue';

/**
 * What a promotion review leaves out: the dependencies that the promotion does not carry. The
 * reviewer cannot act on them, so each action is disabled and says why.
 */
const props = defineProps<SlotPromotionIssuesProps>();

const i18n = useI18n();
const rootStore = useRootStore();

const state = ref<'loading' | 'error' | 'ready'>('loading');
const changes = ref<PromotionReviewChangesWithIssues>();
// Each load counts up, so the answer for a review that is no longer shown is dropped.
let generation = 0;

watch(
	() => props.reviewId,
	async (reviewId) => {
		const current = ++generation;
		state.value = 'loading';
		try {
			const result = await getPromotionReviewChanges(rootStore.restApiContext, reviewId);
			if (current !== generation) return;
			changes.value = result;
			state.value = 'ready';
		} catch {
			if (current === generation) state.value = 'error';
		}
	},
	{ immediate: true },
);

// The table takes the check of an Apply. A review has only the part that this slot shows.
const check = computed<ApplyCheckResult | undefined>(() =>
	changes.value
		? {
				environmentId: props.reviewId,
				git: { commitSha: changes.value.headCommitSha, branchName: '' },
				missingProjects: [],
				missingBindings: [],
				accessRequirements: [],
				conflicts: [],
				warnings: [],
				movedWorkflows: [],
				movedFolders: [],
				outsideAccess: changes.value.outsideAccess ?? [],
			}
		: undefined,
);
</script>

<template>
	<N8nLoading v-if="state === 'loading'" :rows="6" data-test-id="promotion-review-issues-loading" />
	<N8nEmptyState
		v-else-if="state === 'error' || !check"
		:icon="{ type: 'icon', value: 'circle-alert' }"
		:heading="i18n.baseText('promotions.review.issues.error')"
		data-test-id="promotion-review-issues-error"
	/>
	<PromotionBlockers
		v-else
		:check="check"
		:busy="false"
		direction="promote"
		:intro="i18n.baseText('promotions.review.issues.intro')"
		data-test-id="promotion-review-issues"
	/>
</template>
