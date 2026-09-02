<script setup lang="ts">
import type { WorkflowReviewInboxItem, WorkflowReviewRequestDetail } from '@n8n/api-types';
import { N8nAvatar, N8nCard, N8nIcon, N8nLink, N8nText } from '@n8n/design-system';
import { type BaseTextKey, useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import { VIEWS } from '@/app/constants';
import { formatUserDisplayName } from '../formatUserDisplayName';
import WorkflowReviewStatusDot from './WorkflowReviewStatusDot.vue';

const props = defineProps<{
	review: WorkflowReviewInboxItem | WorkflowReviewRequestDetail;
}>();

const i18n = useI18n();

const detail = computed<WorkflowReviewRequestDetail | null>(() =>
	'workflows' in props.review ? props.review : null,
);

const statusSummary = computed(() => {
	const { state, decision } = props.review;
	return i18n.baseText('workflowReviews.detail.metadata.state.combinedLabel', {
		interpolate: {
			state: i18n.baseText(`workflowReviews.status.${state}` as BaseTextKey),
			status: i18n.baseText(`workflowReviews.decision.${decision}` as BaseTextKey),
		},
	});
});
</script>

<template>
	<aside :class="$style.metadata" data-test-id="workflow-review-detail-metadata">
		<N8nCard :class="$style.card" data-test-id="workflow-review-detail-status-card">
			<template #header>
				<N8nText bold color="text-light" size="small">
					{{ i18n.baseText('workflowReviews.detail.metadata.status') }}
				</N8nText>
			</template>
			<div :class="$style.status">
				<WorkflowReviewStatusDot :state="review.state" :decision="review.decision" />
				<N8nText size="small">{{ statusSummary }}</N8nText>
			</div>
		</N8nCard>

		<N8nCard :class="$style.card" data-test-id="workflow-review-detail-reviewers-card">
			<template #header>
				<N8nText bold color="text-light" size="small">
					{{ i18n.baseText('workflowReviews.detail.metadata.reviewers') }}
				</N8nText>
			</template>
			<div v-if="review.reviewers.length > 0" :class="$style.people">
				<div v-for="reviewer in review.reviewers" :key="reviewer.id" :class="$style.reviewer">
					<N8nAvatar
						:first-name="reviewer.firstName"
						:last-name="reviewer.lastName"
						size="xsmall"
					/>
					<N8nText size="small">{{ formatUserDisplayName(reviewer) }}</N8nText>
				</div>
			</div>
			<N8nText
				v-else
				color="text-light"
				size="small"
				data-test-id="workflow-review-detail-no-reviewers"
			>
				{{ i18n.baseText('workflowReviews.detail.metadata.noReviewers') }}
			</N8nText>
		</N8nCard>

		<N8nCard
			v-if="detail?.workflows.length"
			:class="$style.card"
			data-test-id="workflow-review-detail-changes-card"
		>
			<template #header>
				<N8nText bold color="text-light" size="small">
					{{ i18n.baseText('workflowReviews.detail.metadata.workflow') }}
				</N8nText>
			</template>
			<div :class="$style.workflows">
				<N8nLink
					v-for="workflow in detail.workflows"
					:key="workflow.workflowId"
					:to="{ name: VIEWS.WORKFLOW, params: { workflowId: workflow.workflowId } }"
					theme="text"
					size="small"
					:class="$style.workflow"
					data-test-id="workflow-review-detail-workflow-link"
				>
					<N8nIcon icon="workflow" size="small" :class="$style.workflowIcon" />
					<span :class="$style.workflowName">{{ workflow.workflowName }}</span>
				</N8nLink>
			</div>
		</N8nCard>
	</aside>
</template>

<style module lang="scss">
.metadata {
	display: flex;
	flex: 0 0 min(18rem, 30%);
	flex-direction: column;
	gap: var(--spacing--2xs);
	min-width: 14rem;
}

.card {
	--card--padding: var(--spacing--xs);
	--n8n--card-body--gap: var(--spacing--2xs);

	align-items: stretch;
	border-color: var(--border-color);
	background-color: transparent;

	> div {
		gap: var(--spacing--4xs);
	}
}

.status {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.people,
.workflows {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.reviewer {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.workflow {
	display: flex;
	width: 100%;
	min-width: 0;
	overflow: hidden;
	white-space: nowrap;

	> span,
	> span > span {
		display: flex;
		flex: 1;
		align-items: center;
		min-width: 0;
		overflow: hidden;
	}
}

.workflowName {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.workflowIcon {
	flex-shrink: 0;
	margin-right: var(--spacing--4xs);
}

@media (max-width: 75rem) {
	.metadata {
		flex-basis: 15rem;
		min-width: 12rem;
	}
}

@media (max-width: 60rem) {
	.metadata {
		flex-basis: auto;
		width: 100%;
		min-width: 0;
	}
}
</style>
