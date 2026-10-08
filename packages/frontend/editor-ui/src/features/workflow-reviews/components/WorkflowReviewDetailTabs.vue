<script setup lang="ts">
import type { WorkflowReviewInboxItem, WorkflowReviewRequestDetail } from '@n8n/api-types';
import { N8nCallout, N8nTabs, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, provide, ref, useTemplateRef, watch } from 'vue';

import { ReviewDetailScrollContainerKey, ReviewLinkedWorkflowsKey } from '../constants';
import type { WorkflowReviewDecisionInput } from '../workflowReviews.api';
import WorkflowReviewActivityFeed from './WorkflowReviewActivityFeed.vue';
import WorkflowReviewChangesList from './WorkflowReviewChangesList.vue';
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

provide(ReviewDetailScrollContainerKey, useTemplateRef<HTMLElement>('detailBody'));

const detail = computed<WorkflowReviewRequestDetail | null>(() =>
	'workflows' in props.review ? props.review : null,
);

// Held here, not in the list: the detail body remounts on every tab switch.
const expandedWorkflowId = ref<string>();
const firstWorkflowId = computed(() => detail.value?.workflows[0]?.workflowId);

// Open the first workflow for each new review. A refetch of the same review keeps the choice.
watch(
	() => `${props.review.id}:${firstWorkflowId.value ?? ''}`,
	() => {
		expandedWorkflowId.value = firstWorkflowId.value;
	},
	{ immediate: true },
);

const viewerCanDecide = computed(() => detail.value?.viewerCanDecide ?? false);
const viewerCanComment = computed(() => detail.value?.viewerCanComment ?? false);

// See the key's doc: read-time names for feed entries, never snapshotted into payloads.
provide(
	ReviewLinkedWorkflowsKey,
	computed(
		() =>
			new Map(
				(detail.value?.workflows ?? []).map((workflow) => [
					workflow.workflowId,
					{
						workflowName: workflow.workflowName,
						pinnedVersionId: workflow.workflowVersionId,
						pinnedVersionName: workflow.pinnedVersion?.name ?? null,
					},
				]),
			),
	),
);

const ineligibilityHint = computed(() => {
	if (!detail.value || detail.value.viewerCanDecide) return '';
	// Any reason other than 'author' gets the generic permission hint, so new
	// backend reasons degrade gracefully instead of breaking the UI.
	return detail.value.viewerDecisionIneligibilityReason === 'author'
		? i18n.baseText('workflowReviews.detail.decision.ineligible.author')
		: i18n.baseText('generic.missing.permissions');
});

/**
 * Whether to append the approved-and-published summary below the feed. Derived at read
 * time from the live published pointer, not from a `workflow.published` entry: an entry
 * can sit on an unfetched feed page, and it would keep the summary up after a newer
 * version replaced this one. The pointer cannot claim a publication that isn't live —
 * a failed publish either left the pin unpublished (no summary) or never touched a pin
 * that was already live (summary true) — and it is the signal the canvas banner trusts,
 * so the two cannot disagree. A lifecycle close needs no summary here: its
 * `review.closed` entry renders as a callout.
 */
const showApprovedAndPublished = computed(() => {
	const review = detail.value;
	if (!review || review.state !== 'closed' || review.decision !== 'approved') return false;

	return (
		review.workflows.length > 0 &&
		review.workflows.every(
			(workflow) =>
				workflow.workflowVersionId !== null &&
				workflow.publishedVersionId === workflow.workflowVersionId,
		)
	);
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

		<!-- Keyed so another review or tab starts at the top. -->
		<div :key="`${review.id}:${tab}`" ref="detailBody" :class="$style.detailBody">
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
								data-test-id="workflow-review-no-description"
							>
								{{ i18n.baseText('workflowReviews.detail.activity.noDescription') }}
							</N8nText>
						</div>
					</template>
					<template v-if="showApprovedAndPublished" #footer>
						<N8nCallout
							theme="success"
							:class="$style.closedCallout"
							data-test-id="workflow-review-closed-callout"
						>
							<div :class="$style.closedCalloutContent">
								<N8nText bold size="medium">
									{{ i18n.baseText('workflowReviews.detail.closedCallout.title') }}
								</N8nText>
								<N8nText size="medium">
									{{ i18n.baseText('workflowReviews.detail.closedCallout.approvedAndPublished') }}
								</N8nText>
							</div>
						</N8nCallout>
					</template>
					<!-- Closed reviews take no new comments (the backend 409s) -->
					<template v-if="review.state === 'open'" #composer>
						<WorkflowReviewCommentComposer :can-comment="viewerCanComment" />
					</template>
				</WorkflowReviewActivityFeed>
			</div>

			<div v-else :class="$style.panel" data-test-id="workflow-review-changes-panel">
				<N8nCallout
					v-if="!detail"
					theme="warning"
					:class="$style.callout"
					data-test-id="workflow-review-changes-unavailable"
				>
					{{ i18n.baseText('workflowReviews.changes.unavailable') }}
				</N8nCallout>
				<WorkflowReviewChangesList
					v-else-if="detail.workflows.length > 0"
					v-model:expanded="expandedWorkflowId"
					:workflows="detail.workflows"
					:state="detail.state"
					:decision="detail.decision"
				/>
				<!-- No rows left: the workflow was deleted, or the requester lost access to it. -->
				<N8nCallout
					v-else
					theme="warning"
					:class="$style.callout"
					data-test-id="workflow-review-changes-workflow-unavailable"
				>
					{{ i18n.baseText('workflowReviews.changes.workflowUnavailable') }}
				</N8nCallout>
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
	container-name: review-detail;
	container-type: inline-size;
}

.tabRow {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
	margin-right: var(--spacing--md);
	/* Holds the active-tab indicator, so the border sits under it. */
	padding-bottom: var(--review-tab-bar--indicator-overhang);
	border-bottom: var(--border);

	> :global(.n8n-tabs) {
		transform: translateY(var(--spacing--sm));
	}
}

.detailBody {
	display: flex;
	flex: 1;
	gap: var(--spacing--sm);
	min-height: 0;
	overflow: auto;
	/* Inside the scroll area, so the content keeps clear of the scrollbar. */
	padding: var(--spacing--sm) var(--spacing--md) 0 0;
}

.panel {
	flex: 1;
	min-width: 0;
}

.activityPanel {
	flex: 1;
	min-width: 0;
	max-width: var(--review-activity--max-width, 45rem);
	margin-inline: auto;
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

/* line up the summary's edges with the entry cards above it. */
.closedCallout {
	margin-inline: calc(-1 * var(--spacing--sm));
}

.closedCalloutContent {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
}

/* `pre-wrap` alone does not break a pasted URL, which is the one thing that could scroll the
	card sideways. */
.description {
	white-space: pre-wrap;
	overflow-wrap: anywhere;
}

.decisionActions {
	flex-shrink: 0;
}

@container review-detail (max-width: 44rem) {
	.detailBody {
		flex-direction: column;
	}

	/* Auto margins would stop the stacked column from stretching. */
	.activityPanel {
		margin-inline: 0;
	}
}
</style>
