<script setup lang="ts">
import type { WorkflowReviewInboxItem, WorkflowReviewRequestDetail } from '@n8n/api-types';
import { N8nAvatar, N8nCard, N8nIcon, N8nLink, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import { VIEWS } from '@/app/constants';
import { formatUserDisplayName } from '../workflowReviews.utils';
import { getWorkflowReviewStatusDisplay } from '../workflowReviewStatus.utils';
import WorkflowReviewStatusDot from './WorkflowReviewStatusDot.vue';

const props = defineProps<{
	review: WorkflowReviewInboxItem | WorkflowReviewRequestDetail;
}>();

const i18n = useI18n();

const detail = computed<WorkflowReviewRequestDetail | null>(() =>
	'workflows' in props.review ? props.review : null,
);

// Authors include the requester, who already has their own section above.
const otherAuthors = computed(() =>
	props.review.authors.filter((author) => author.id !== props.review.requester?.id),
);

const statusSummary = computed(
	() => getWorkflowReviewStatusDisplay(i18n, props.review.state, props.review.decision).label,
);
</script>

<template>
	<aside :class="$style.metadata" data-test-id="workflow-review-detail-metadata">
		<N8nCard :class="$style.card" data-test-id="workflow-review-detail-status-card">
			<template #header>
				<N8nText bold color="text-light" size="medium">
					{{ i18n.baseText('workflowReviews.detail.metadata.status') }}
				</N8nText>
			</template>
			<div :class="$style.status">
				<WorkflowReviewStatusDot :state="review.state" :decision="review.decision" decorative />
				<N8nText size="medium">{{ statusSummary }}</N8nText>
			</div>
		</N8nCard>

		<N8nCard
			:class="[$style.card, $style.peopleCard]"
			data-test-id="workflow-review-detail-people-card"
		>
			<div :class="$style.section">
				<N8nText bold color="text-light" size="medium">
					{{ i18n.baseText('workflowReviews.detail.metadata.requestedBy') }}
				</N8nText>
				<div v-if="review.requester" :class="$style.person">
					<N8nAvatar
						:first-name="review.requester.firstName"
						:last-name="review.requester.lastName"
						size="xsmall"
					/>
					<N8nText size="medium">{{ formatUserDisplayName(review.requester) }}</N8nText>
				</div>
				<N8nText
					v-else
					color="text-light"
					size="medium"
					data-test-id="workflow-review-detail-requester-deleted"
				>
					{{ i18n.baseText('workflowReviews.detail.metadata.requesterDeleted') }}
				</N8nText>
			</div>

			<div
				v-if="otherAuthors.length > 0"
				:class="$style.section"
				data-test-id="workflow-review-detail-other-authors"
			>
				<N8nText bold color="text-light" size="medium">
					{{ i18n.baseText('workflowReviews.detail.metadata.otherAuthors') }}
				</N8nText>
				<div v-for="author in otherAuthors" :key="author.id" :class="$style.person">
					<N8nAvatar :first-name="author.firstName" :last-name="author.lastName" size="xsmall" />
					<N8nText size="medium">{{ formatUserDisplayName(author) }}</N8nText>
				</div>
			</div>

			<div :class="$style.section">
				<N8nText bold color="text-light" size="medium">
					{{ i18n.baseText('workflowReviews.detail.metadata.reviewers') }}
				</N8nText>
				<div v-for="reviewer in review.reviewers" :key="reviewer.id" :class="$style.person">
					<N8nAvatar
						:first-name="reviewer.firstName"
						:last-name="reviewer.lastName"
						size="xsmall"
					/>
					<N8nText size="medium">{{ formatUserDisplayName(reviewer) }}</N8nText>
				</div>
				<N8nText
					v-if="review.reviewers.length === 0"
					color="text-light"
					size="medium"
					data-test-id="workflow-review-detail-no-reviewers"
				>
					{{ i18n.baseText('workflowReviews.detail.metadata.noReviewers') }}
				</N8nText>
			</div>
		</N8nCard>

		<N8nCard
			v-if="detail?.workflows.length"
			:class="$style.card"
			data-test-id="workflow-review-detail-changes-card"
		>
			<template #header>
				<N8nText bold color="text-light" size="medium">
					{{ i18n.baseText('workflowReviews.detail.metadata.workflow') }}
				</N8nText>
			</template>
			<div :class="$style.workflows">
				<N8nLink
					v-for="workflow in detail.workflows"
					:key="workflow.workflowId"
					:to="{ name: VIEWS.WORKFLOW, params: { workflowId: workflow.workflowId } }"
					theme="text"
					size="medium"
					:class="$style.workflow"
					data-test-id="workflow-review-detail-workflow-link"
				>
					<N8nIcon icon="workflow" size="medium" :class="$style.workflowIcon" />
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
	padding-top: var(--spacing--5xs);
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

.section,
.workflows {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.peopleCard {
	--n8n--card-body--gap: var(--spacing--sm);
}

.person {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.workflow {
	display: flex;
	width: 100%;
	min-width: 0;

	> span,
	> span > span {
		display: flex;
		flex: 1;
		align-items: flex-start;
		min-width: 0;
	}
}

.workflowName {
	flex: 1;
	min-width: 0;
	/* A name with no spaces still has to break somewhere. */
	overflow-wrap: anywhere;
}

.workflowIcon {
	flex-shrink: 0;
	margin-right: var(--spacing--4xs);
	/* Optically centre the icon on the first line of text. */
	margin-top: calc((1lh - 1em) / 2);
}

@media (max-width: 75rem) {
	.metadata {
		flex-basis: 15rem;
		min-width: 12rem;
	}
}

@container review-detail (max-width: 44rem) {
	.metadata {
		flex-basis: auto;
		width: 100%;
		min-width: 0;
		padding-inline-end: var(--spacing--2xs);
	}
}
</style>
