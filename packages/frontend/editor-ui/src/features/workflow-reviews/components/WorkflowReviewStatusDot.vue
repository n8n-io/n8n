<script lang="ts" setup>
import type { WorkflowReviewRequestDecision, WorkflowReviewRequestState } from '@n8n/api-types';
import { N8nTooltip } from '@n8n/design-system';
import { type BaseTextKey, useI18n } from '@n8n/i18n';
import { computed } from 'vue';

const props = defineProps<{
	state: WorkflowReviewRequestState;
	decision: WorkflowReviewRequestDecision;
}>();

const i18n = useI18n();

const status = computed(() => {
	const variant =
		props.state === 'open' ? props.decision : props.decision === 'approved' ? 'approved' : 'closed';

	const label =
		variant === 'closed'
			? i18n.baseText('workflowReviews.status.closed')
			: i18n.baseText(`workflowReviews.decision.${variant}` as BaseTextKey);

	const colorClass = variant === 'changes_requested' ? 'changesRequested' : variant;

	return { colorClass, label };
});
</script>

<template>
	<N8nTooltip :content="status.label" placement="top">
		<div
			:class="[$style.dot, $style[status.colorClass]]"
			data-test-id="workflow-review-request-status-dot"
			:aria-label="status.label"
		/>
	</N8nTooltip>
</template>

<style module lang="scss">
.dot {
	flex-shrink: 0;
	width: var(--font-size--3xs);
	height: var(--font-size--3xs);
	border-radius: 50%;
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
