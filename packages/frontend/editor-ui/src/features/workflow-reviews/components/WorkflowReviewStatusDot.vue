<script lang="ts" setup>
import type { WorkflowReviewRequestDecision, WorkflowReviewRequestState } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import { getWorkflowReviewStatusDisplay } from '../workflowReviewStatus.utils';

const props = withDefaults(
	defineProps<{
		state: WorkflowReviewRequestState;
		decision: WorkflowReviewRequestDecision;
		size?: 'small' | 'medium';
	}>(),
	{ size: 'medium' },
);

const i18n = useI18n();

const status = computed(() => getWorkflowReviewStatusDisplay(i18n, props.state, props.decision));
</script>

<template>
	<div
		role="img"
		:class="[$style.dot, $style[status.colorClass], size === 'small' && $style.small]"
		data-test-id="workflow-review-request-status-dot"
		:aria-label="status.label"
	/>
</template>

<style module lang="scss">
.dot {
	flex-shrink: 0;
	width: var(--font-size--3xs);
	height: var(--font-size--3xs);
	border-radius: 50%;
}

.small {
	width: var(--spacing--2xs);
	height: var(--spacing--2xs);
}

.pending {
	background-color: var(--color--blue-500);
}

.changesRequested {
	background-color: var(--color--yellow-500);
}

.approved {
	background-color: var(--color--green-500);
}

.closed {
	background-color: var(--color--neutral-500);
}
</style>
