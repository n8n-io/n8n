<script setup lang="ts">
import type { WorkflowReviewInboxItem, WorkflowReviewRequestDetail } from '@n8n/api-types';
import { N8nCallout, N8nTabs, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import type { WorkflowReviewDecisionInput } from '../workflowReviews.api';
import WorkflowReviewActivityFeed from './WorkflowReviewActivityFeed.vue';
import WorkflowReviewChangesSection from './WorkflowReviewChangesSection.vue';
import WorkflowReviewCommentComposer from './WorkflowReviewCommentComposer.vue';
import WorkflowReviewDecisionPopover from './WorkflowReviewDecisionPopover.vue';
import WorkflowReviewDetailMetadata from './WorkflowReviewDetailMetadata.vue';

export type WorkflowReviewDetailTab = 'activity' | 'changes';

const props = defineProps<{
	review: WorkflowReviewInboxItem | WorkflowReviewRequestDetail;
	tab: WorkflowReviewDetailTab;
	deciding: boolean;
}>();

const emit = defineEmits<{
	'update:tab': [tab: WorkflowReviewDetailTab];
	decide: [input: WorkflowReviewDecisionInput];
}>();

const i18n = useI18n();

const detail = computed<WorkflowReviewRequestDetail | null>(() =>
	'workflows' in props.review ? props.review : null,
);

const viewerCanDecide = computed(() => detail.value?.viewerCanDecide ?? false);
const viewerCanComment = computed(() => detail.value?.viewerCanComment ?? false);

const ineligibilityHint = computed(() => {
	if (!detail.value || detail.value.viewerCanDecide) return '';
	// Any reason other than 'author' gets the generic permission hint, so new
	// backend reasons degrade gracefully instead of breaking the UI.
	return detail.value.viewerDecisionIneligibilityReason === 'author'
		? i18n.baseText('workflowReviews.detail.decision.ineligible.author')
		: i18n.baseText('generic.missing.permissions');
});

const tabOptions = computed(() => [
	{
		label: i18n.baseText('workflowReviews.detail.tabs.activity'),
		value: 'activity' as const,
	},
	{
		label: i18n.baseText('workflowReviews.detail.tabs.changes'),
		value: 'changes' as const,
	},
]);
</script>

<template>
	<div :class="$style.container" data-test-id="workflow-review-detail-tabs">
		<div :class="$style.tabRow">
			<N8nTabs
				:model-value="tab"
				:options="tabOptions"
				variant="modern"
				data-test-id="workflow-review-detail-tab-bar"
				@update:model-value="emit('update:tab', $event)"
			/>

			<!-- Gated on `detail`, not `review`: eligibility only arrives with the
				detail payload, so the list item alone can't say who may decide. -->
			<div v-if="detail?.state === 'open'" :class="$style.decisionActions">
				<WorkflowReviewDecisionPopover
					:deciding="deciding"
					:viewer-can-decide="viewerCanDecide"
					:viewer-can-comment="viewerCanComment"
					:ineligibility-hint="ineligibilityHint"
					@decide="emit('decide', $event)"
					@comment-posted="emit('update:tab', 'activity')"
				/>
			</div>
		</div>

		<div :class="$style.detailBody">
			<div
				v-if="tab === 'activity'"
				:class="$style.activityPanel"
				data-test-id="workflow-review-activity-panel"
			>
				<WorkflowReviewActivityFeed :key="review.id">
					<template #header>
						<!-- Carded and labelled so the review's own words are not mistaken for the
							first entry of the feed below it. -->
						<div :class="$style.descriptionCard">
							<N8nText tag="h3" bold color="text-light" size="medium">
								{{ i18n.baseText('workflowReviews.detail.activity.description') }}
							</N8nText>
							<N8nText
								v-if="detail?.description"
								color="text-base"
								size="medium"
								:class="$style.description"
								data-test-id="workflow-review-description"
							>
								{{ detail.description }}
							</N8nText>
							<N8nText
								v-else
								color="text-light"
								size="medium"
								:class="$style.noDescription"
								data-test-id="workflow-review-no-description"
							>
								{{ i18n.baseText('workflowReviews.detail.activity.noDescription') }}
							</N8nText>
						</div>
					</template>
				</WorkflowReviewActivityFeed>

				<WorkflowReviewCommentComposer :can-comment="viewerCanComment" />
			</div>

			<div v-else :class="$style.panel" data-test-id="workflow-review-changes-panel">
				<N8nCallout
					v-if="review.state === 'closed'"
					theme="info"
					:class="$style.callout"
					data-test-id="workflow-review-changes-closed"
				>
					{{ i18n.baseText('workflowReviews.changes.closed.body') }}
				</N8nCallout>
				<N8nCallout
					v-else-if="!detail"
					theme="warning"
					:class="$style.callout"
					data-test-id="workflow-review-changes-unavailable"
				>
					{{ i18n.baseText('workflowReviews.changes.unavailable') }}
				</N8nCallout>
				<template v-else-if="detail.workflows.length > 0">
					<WorkflowReviewChangesSection
						v-for="workflow in detail.workflows"
						:key="workflow.workflowId"
						:workflow="workflow"
					/>
				</template>
				<N8nText
					v-else
					color="text-light"
					size="medium"
					data-test-id="workflow-review-changes-empty"
				>
					{{ i18n.baseText('workflowReviews.changes.empty') }}
				</N8nText>
			</div>

			<WorkflowReviewDetailMetadata :review="review" />
		</div>
	</div>
</template>

<style module lang="scss">
@use './activity-card' as *;

.container {
	display: flex;
	flex-direction: column;
	height: 100%;
	min-height: 0;
}

.tabRow {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

.detailBody {
	display: flex;
	flex: 1;
	gap: var(--spacing--sm);
	min-height: 0;
	padding-top: var(--review-tab-bar--gap, calc(var(--spacing--sm) + 11px));
}

.panel {
	flex: 1;
	min-height: 0;
	overflow: auto;
}

/* Separate from `.panel`: the feed brings its own scroll container, and the
	composer must stay out of it. */
.activityPanel {
	display: flex;
	flex-direction: column;
	flex: 1;
	min-height: 0;
	overflow: hidden;
	max-width: var(--review-activity--max-width, 48rem);
	margin-inline-end: auto;
}

.descriptionCard {
	@include activity-card;

	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.callout {
	max-width: var(--review-callout--max-width, 34rem);
}

/* `pre-wrap` alone does not break a pasted URL, which is the one thing that could scroll the
	card sideways. */
.description {
	white-space: pre-wrap;
	overflow-wrap: anywhere;
}

.noDescription {
	font-style: italic;
}

.decisionActions {
	flex-shrink: 0;
}

@media (max-width: 60rem) {
	.detailBody {
		flex-direction: column;
		overflow: auto;
	}

	.panel {
		flex: 0 0 auto;
		overflow: visible;
	}

	.activityPanel {
		flex: 0 0 auto;
		overflow: visible;
		max-width: none;
		margin-inline-end: 0;
	}
}
</style>
