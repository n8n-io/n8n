<script lang="ts" setup>
import type { WorkflowReviewRequestDecision, WorkflowReviewRequestState } from '@n8n/api-types';
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nTooltip } from '@n8n/design-system';

const props = defineProps<{
	state: WorkflowReviewRequestState;
	decision: WorkflowReviewRequestDecision;
}>();

const i18n = useI18n();

const status = computed(() => {
	if (props.state === 'open') {
		return props.decision === 'changes_requested'
			? {
					variant: 'changesRequested',
					label: i18n.baseText('workflowReviews.status.changesRequested'),
				}
			: { variant: 'pending', label: i18n.baseText('workflowReviews.status.pending') };
	}
	return props.decision === 'approved'
		? { variant: 'approved', label: i18n.baseText('workflowReviews.status.approved') }
		: { variant: 'closed', label: i18n.baseText('workflowReviews.status.closed') };
});
</script>

<template>
	<N8nTooltip :content="status.label" placement="top">
		<div
			:class="[$style.dot, $style[status.variant]]"
			data-test-id="workflow-review-request-status-dot"
			:aria-label="status.label"
		/>
	</N8nTooltip>
</template>

<style lang="scss" module>
.dot {
	flex-shrink: 0;
	width: var(--font-size--3xs);
	height: var(--font-size--3xs);
	border-radius: 50%;
}

.pending {
	background-color: var(--color--yellow-500);
}

.changesRequested {
	background-color: var(--color--red-500);
}

.approved {
	background-color: var(--color--green-500);
}

.closed {
	background-color: var(--color--neutral-500);
}
</style>
