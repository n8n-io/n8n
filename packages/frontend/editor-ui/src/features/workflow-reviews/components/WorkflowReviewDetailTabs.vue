<script setup lang="ts">
import type { WorkflowReviewInboxItem, WorkflowReviewRequestDetail } from '@n8n/api-types';
import { N8nCallout, N8nTabs, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, provide, ref } from 'vue';

import { ReviewDetailScrollContainerKey, ReviewLinkedWorkflowsKey } from '../constants';
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
const detailBodyRef = ref<HTMLElement | null>(null);
provide(ReviewDetailScrollContainerKey, detailBodyRef);

const detail = computed<WorkflowReviewRequestDetail | null>(() =>
	'workflows' in props.review ? props.review : null,
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

		<div
			ref="detailBodyRef"
			:class="$style.detailBody"
			data-test-id="workflow-review-detail-scroll"
		>
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
				<template v-else-if="detail.workflows.length > 0">
					<WorkflowReviewChangesSection
						v-for="workflow in detail.workflows"
						:key="workflow.workflowId"
						:workflow="workflow"
						:state="detail.state"
						:decision="detail.decision"
					/>
				</template>
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
	/* Match the application page background in both themes. This is the token
		used by the global body, rather than the white card/surface token. */
	--review-detail--background: var(--color--background--light-2);

	display: flex;
	flex-direction: column;
	height: 100%;
	min-height: 0;
	background-color: var(--review-detail--background);
	container-name: review-detail;
	container-type: inline-size;
}

.tabRow {
	position: relative;
	z-index: 1;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
	background-color: var(--review-detail--background);

	/* The scrollport starts at the row's normal bottom edge, while the divider is
		lower because the active-tab indicator overhangs the row. Cover that entire
		strip with the same surface as the header so scrolled cards cannot show
		through behind the tabs or divider. */
	&::before {
		content: '';
		position: absolute;
		z-index: 0;
		inset: 0 0 calc(-1 * var(--review-tab-bar--indicator-overhang, 11px) - var(--border-width));
		background-color: var(--review-detail--background);
	}

	> :global(.n8n-tabs) {
		position: relative;
		z-index: 1;
		transform: translateY(var(--spacing--xs));
	}

	/* Full-width baseline under the tab bar, separating the tab/action row from
		the detail body; the active tab's indicator sits on top of it. Same
		geometry as the sidebar's tab bar (see the view's `--review-tab-bar--*`). */
	&::after {
		content: '';
		position: absolute;
		z-index: 2;
		left: 0;
		right: 0;
		bottom: calc(-1 * var(--review-tab-bar--indicator-overhang, 11px) - var(--border-width));
		height: var(--border-width);
		background-color: var(--border-color);
	}
}

.detailBody {
	display: flex;
	flex: 1;
	align-items: flex-start;
	gap: var(--spacing--sm);
	min-height: 0;
	overflow: auto;
	padding-top: var(--review-tab-bar--gap, calc(var(--spacing--sm) + 11px));
}

.panel {
	align-self: stretch;
	flex: 1;
	min-height: 100%;
	overflow: visible;
}

/* The detail body owns scrolling so activity and metadata move as one surface. */
.activityPanel {
	display: flex;
	flex-direction: column;
	flex: 1;
	min-height: 100%;
	overflow: visible;
	max-width: var(--review-activity--max-width, 45rem);
	/* Symmetric auto margins center the column in the space beside the metadata rail. */
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

.noDescription {
	font-style: italic;
}

.decisionActions {
	position: relative;
	z-index: 1;
	flex-shrink: 0;
}

@container review-detail (max-width: 44rem) {
	.detailBody {
		flex-direction: column;
	}

	.panel {
		flex: 1 0 auto;
		overflow: visible;
	}

	.activityPanel {
		flex: 1 1 0%;
		overflow: visible;
		max-width: none;
		margin-inline: 0;
	}
}
</style>
