<script setup lang="ts">
import type { WorkflowReviewRequirementLevel } from '@n8n/api-types';
import { computed } from 'vue';
import { N8nDropdownMenuItem, N8nIcon, N8nSwitch, N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import { useReviewRequiredStore } from '@/features/workflow-reviews/reviewRequired.store';
import { useWorkflowReviewStatusStore } from '@/features/workflow-reviews/reviewStatus.store';

const props = defineProps<{
	workflowId: string;
	lockedBy?: WorkflowReviewRequirementLevel | null;
}>();

const i18n = useI18n();
const reviewRequiredStore = useReviewRequiredStore();
const reviewStatusStore = useWorkflowReviewStatusStore();

const hasOpenReview = computed(() => reviewStatusStore.hasOpenReview(props.workflowId));
const isLocked = computed(() => !!props.lockedBy || hasOpenReview.value);

const lockTooltip = computed(() => {
	if (props.lockedBy === 'instance')
		return i18n.baseText('workflowReviews.enforcement.lockedByInstance');
	if (props.lockedBy === 'project')
		return i18n.baseText('workflowReviews.enforcement.lockedByProject');
	return '';
});

const description = computed(() => {
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
		<N8nTooltip :disabled="!lockTooltip" placement="left">
			<template #content>{{ lockTooltip }}</template>
			<!-- A disabled item gets no hover events, so the wrapper takes them. -->
			<span :class="[$style.item, { [$style.lockedControl]: !!lockTooltip }]">
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
						<span :class="$style.trailing">
							<N8nIcon v-if="lockTooltip" icon="lock" size="small" />
							<N8nSwitch
								:model-value="reviewRequired"
								:disabled="isLocked"
								aria-hidden="true"
								tabindex="-1"
								data-test-id="workflow-review-required-switch"
								:class="[ui.class, $style.switch]"
							/>
						</span>
					</template>
				</N8nDropdownMenuItem>
			</span>
		</N8nTooltip>
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

.item {
	display: block;
}

.lockedControl > * {
	pointer-events: none;
}

.trailing {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
}
</style>
