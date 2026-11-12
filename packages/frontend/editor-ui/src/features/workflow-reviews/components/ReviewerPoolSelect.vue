<script setup lang="ts">
import { computed } from 'vue';
import { N8nSelect2, N8nTooltip } from '@n8n/design-system';
import type { SelectOptionBase, SelectValue } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import {
	REVIEWER_POOLS,
	isReviewerPool,
	type ReviewerPool,
} from '@/features/workflow-reviews/reviewPrototype.state';

const POOL_LABEL = {
	projectAdminsOnly: 'settings.security.workflowReviews.reviewers.option.projectAdminsOnly',
	projectAdminsAndEditors:
		'settings.security.workflowReviews.reviewers.option.projectAdminsAndEditors',
} as const;

const props = withDefaults(
	defineProps<{
		modelValue: ReviewerPool;
		allowedPools?: ReviewerPool[];
		locked?: boolean;
		disabled?: boolean;
		testId: string;
	}>(),
	{
		allowedPools: () => [...REVIEWER_POOLS],
		locked: false,
		disabled: false,
	},
);

const emit = defineEmits<{
	'update:modelValue': [value: ReviewerPool];
}>();

const i18n = useI18n();

const items = computed<Array<SelectOptionBase<ReviewerPool>>>(() =>
	props.allowedPools.map((pool) => ({
		value: pool,
		label: i18n.baseText(POOL_LABEL[pool]),
	})),
);

function onUpdate(value: SelectValue | undefined) {
	if (props.locked || props.disabled || !isReviewerPool(value)) return;
	emit('update:modelValue', value);
}
</script>

<template>
	<N8nTooltip v-if="locked" placement="top">
		<template #content>
			{{ i18n.baseText('workflowReviews.enforcement.lockedByInstance') }}
		</template>
		<span :class="$style.lockedControl">
			<N8nSelect2
				:model-value="modelValue"
				:items="items"
				size="medium"
				:disabled="true"
				:data-test-id="testId"
			/>
		</span>
	</N8nTooltip>
	<N8nSelect2
		v-else
		:model-value="modelValue"
		:items="items"
		size="medium"
		:disabled="disabled"
		:data-test-id="testId"
		@update:model-value="onUpdate"
	/>
</template>

<style module>
.lockedControl {
	display: inline-flex;
}

.lockedControl > * {
	pointer-events: none;
}
</style>
