<script setup lang="ts">
import { computed } from 'vue';
import { N8nDropdownMenuItem, N8nSwitch, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import { useReviewRequiredStore } from '@/features/workflow-reviews/reviewRequired.store';
import { useWorkflowReviewStatusStore } from '@/features/workflow-reviews/reviewStatus.store';

const props = defineProps<{
	workflowId: string;
	lockedByInstance?: boolean;
}>();

const i18n = useI18n();
const reviewRequiredStore = useReviewRequiredStore();
const reviewStatusStore = useWorkflowReviewStatusStore();

const hasOpenReview = computed(() => reviewStatusStore.hasOpenReview(props.workflowId));
const isLocked = computed(() => props.lockedByInstance === true || hasOpenReview.value);

const description = computed(() => {
	if (props.lockedByInstance) {
		return i18n.baseText('workflowReviews.reviewRequired.enforcedDescription');
	}
	return hasOpenReview.value
		? i18n.baseText('workflowReviews.reviewRequired.lockedDescription')
		: i18n.baseText('workflowReviews.reviewRequired.description');
});

const reviewRequired = computed({
	get: () => isLocked.value || reviewRequiredStore.isReviewRequired(props.workflowId),
	set: (value: boolean) => {
		if (isLocked.value) return;
		reviewRequiredStore.setReviewRequired(props.workflowId, value);
	},
});
</script>

<template>
	<div :class="$style.footer">
		<N8nDropdownMenuItem
			id="review-required"
			:label="i18n.baseText('workflowReviews.reviewRequired.title')"
			:checked="reviewRequired"
			checkbox
			:close-on-select="false"
			:disabled="isLocked"
			divided
			test-id="workflow-review-required-toggle"
			@select="reviewRequired = !reviewRequired"
		>
			<template #item-label="{ ui }">
				<N8nText size="small" :class="ui.class">
					{{ i18n.baseText('workflowReviews.reviewRequired.title') }}
				</N8nText>
			</template>
			<template #item-trailing="{ ui }">
				<N8nSwitch
					:model-value="reviewRequired"
					:disabled="isLocked"
					aria-hidden="true"
					tabindex="-1"
					data-test-id="workflow-review-required-switch"
					:class="[ui.class, $style.switch]"
				/>
			</template>
		</N8nDropdownMenuItem>
		<N8nText tag="p" size="xsmall" color="text-base" :class="$style.description">
			{{ description }}
		</N8nText>
	</div>
</template>

<style module>
.footer {
	padding: 0 var(--spacing--4xs) var(--spacing--4xs);
}

.description {
	padding: 0 var(--spacing--2xs) var(--spacing--4xs);
}

.switch {
	pointer-events: none;
}
</style>
