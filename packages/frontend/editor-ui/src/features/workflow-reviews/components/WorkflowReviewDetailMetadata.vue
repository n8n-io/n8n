<script setup lang="ts">
import type { WorkflowReviewInboxItem, WorkflowReviewRequestDetail } from '@n8n/api-types';
import { N8nAvatar, N8nButton, N8nCard, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import { resolveWorkflowReviewStatus } from '../workflowReviewStatus';
import WorkflowReviewStatusDot from './WorkflowReviewStatusDot.vue';

const props = defineProps<{
	review: WorkflowReviewInboxItem | WorkflowReviewRequestDetail;
}>();

const emit = defineEmits<{
	'select-workflow': [workflowId: string];
}>();

const i18n = useI18n();

const detail = computed<WorkflowReviewRequestDetail | null>(() =>
	'workflows' in props.review ? props.review : null,
);

const statusSummary = computed(() => {
	const label = i18n.baseText(
		resolveWorkflowReviewStatus(props.review.state, props.review.decision).labelKey,
	);
	if (props.review.state === 'closed') return label;
	return `${i18n.baseText('workflowReviews.detail.metadata.state.open')} · ${label}`;
});

function reviewerName(reviewer: WorkflowReviewInboxItem['reviewers'][number]) {
	return [reviewer.firstName, reviewer.lastName].filter(Boolean).join(' ') || reviewer.email;
}
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
					<N8nText size="small">{{ reviewerName(reviewer) }}</N8nText>
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

		<N8nCard :class="$style.card" data-test-id="workflow-review-detail-changes-card">
			<template #header>
				<N8nText bold color="text-light" size="small">
					{{ i18n.baseText('workflowReviews.detail.metadata.changes') }}
				</N8nText>
			</template>
			<div v-if="detail?.workflows.length" :class="$style.workflows">
				<N8nButton
					v-for="workflow in detail.workflows"
					:key="workflow.workflowId"
					variant="ghost"
					size="small"
					:class="$style.workflow"
					data-test-id="workflow-review-detail-workflow-link"
					@click="emit('select-workflow', workflow.workflowId)"
				>
					<N8nIcon icon="workflow" size="small" />
					<span :class="$style.workflowName">{{ workflow.workflowName }}</span>
				</N8nButton>
			</div>
			<N8nText
				v-else
				color="text-light"
				size="small"
				data-test-id="workflow-review-detail-no-workflows"
			>
				{{ i18n.baseText('workflowReviews.detail.metadata.noWorkflows') }}
			</N8nText>
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
	border-color: var(--border-color--subtle);
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
	justify-content: flex-start;
	width: 100%;
	min-width: 0;
	overflow: hidden;

	> div {
		justify-content: flex-start;
		min-width: 0;
	}
}

.workflowName {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
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
