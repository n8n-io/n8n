<script lang="ts" setup>
import type { WorkflowReviewStatus } from '@n8n/api-types';
import { N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';
import { RouterLink } from 'vue-router';

import { WORKFLOW_REVIEW_REQUESTS_VIEW } from '../constants';
import { getWorkflowReviewStatusDisplay } from '../workflowReviewStatus.utils';
import WorkflowReviewStatusDot from './WorkflowReviewStatusDot.vue';

const props = defineProps<{
	status: WorkflowReviewStatus;
}>();

const i18n = useI18n();

// The badge only ever shows open reviews, so the state prefix would be noise;
// the tooltip supplies the review context the bare decision lacks.
const label = computed(
	() =>
		getWorkflowReviewStatusDisplay(i18n, props.status.summary.state, props.status.summary.decision)
			.decisionLabel,
);

const tooltip = computed(() =>
	props.status.viewerCanOpen
		? i18n.baseText('workflowReviews.statusBadge.tooltipOpenable')
		: i18n.baseText('workflowReviews.statusBadge.tooltip'),
);

/**
 * Open reviews live on the inbox's default tab, so the id param is all the
 * deep link needs. Rendered only when the backend says opening cannot 404.
 */
const reviewRoute = computed(() => ({
	name: WORKFLOW_REVIEW_REQUESTS_VIEW,
	params: { reviewRequestId: props.status.summary.id },
}));
</script>

<template>
	<N8nTooltip :content="tooltip" placement="top" :show-after="300">
		<component
			:is="status.viewerCanOpen ? RouterLink : 'span'"
			v-bind="status.viewerCanOpen ? { to: reviewRoute } : {}"
			:class="[$style.badge, status.viewerCanOpen && $style.link]"
			data-test-id="workflow-review-status-badge"
		>
			<WorkflowReviewStatusDot
				:state="status.summary.state"
				:decision="status.summary.decision"
				size="small"
				decorative
			/>
			<N8nText size="small" color="text-base">{{ label }}</N8nText>
		</component>
	</N8nTooltip>
</template>

<style lang="scss" module>
/* Same treatment as the neighboring publish indicator and ownership badge. */
.badge {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border-radius: var(--radius);
	border: var(--border);
	text-decoration: none;
	white-space: nowrap;

	* {
		// This is needed to line height up with ownership badge
		line-height: calc(var(--font-size--sm) + 1px);
	}
}

.link:hover {
	background-color: var(--background--hover);
}
</style>
