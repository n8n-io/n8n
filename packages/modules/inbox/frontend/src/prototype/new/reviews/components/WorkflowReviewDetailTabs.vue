<script setup lang="ts">
import type { WorkflowReviewInboxItem, WorkflowReviewRequestDetail } from '@n8n/api-types';
import { N8nCallout, N8nTabs, N8nText } from '@n8n/design-system';
import { componentRegistry } from '@n8n/frontend-module-sdk';
import { useI18n } from '@n8n/i18n';
import { computed, provide, ref, useTemplateRef, watch } from 'vue';

import PrototypeEditableBody from '../../../PrototypeEditableBody.vue';
import { prototypeDescription, prototypeSession } from '../../../prototype.session';
import {
	ReviewDetailScrollContainerKey,
	ReviewLinkedWorkflowsKey,
} from '../../../../reviews/constants';
import WorkflowReviewActivityFeed from './WorkflowReviewActivityFeed.vue';
import WorkflowReviewChangesList from '../../../../reviews/components/WorkflowReviewChangesList.vue';
import WorkflowReviewCommentComposer from '../../../../reviews/components/WorkflowReviewCommentComposer.vue';
import WorkflowReviewDetailMetadata from './WorkflowReviewDetailMetadata.vue';

export type WorkflowReviewDetailTab = 'activity' | 'changes';

const props = defineProps<{
	review: WorkflowReviewInboxItem | WorkflowReviewRequestDetail;
	tab: WorkflowReviewDetailTab;
	/** Prototype only. Changes is a resource list and a scrolling diff, with no metadata rail. */
	splitChanges?: boolean;
}>();

const emit = defineEmits<{
	'update:tab': [tab: WorkflowReviewDetailTab];
}>();

const i18n = useI18n();

provide(ReviewDetailScrollContainerKey, useTemplateRef<HTMLElement>('detailBody'));

const detail = computed<WorkflowReviewRequestDetail | null>(() =>
	'workflows' in props.review ? props.review : null,
);

const descriptionText = computed(() =>
	prototypeDescription(props.review.id, detail.value?.description ?? ''),
);

// Held here, not in the list: the detail body remounts on every tab switch.
const expandedWorkflowId = ref<string>();
// The review that `expandedWorkflowId` belongs to.
let expandedReviewId: string | undefined;

// Open the first workflow for each new review. A refetch keeps the choice while the
// open workflow is still listed. The detail lists only readable workflows, so it can drop one.
watch(
	detail,
	(value) => {
		if (!value?.workflows.length) return;
		const open = expandedWorkflowId.value;
		const isListed = value.workflows.some(({ workflowId }) => workflowId === open);
		if (value.id === expandedReviewId && (open === undefined || isListed)) return;
		expandedReviewId = value.id;
		expandedWorkflowId.value = value.workflows[0].workflowId;
	},
	{ immediate: true },
);

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
	if (review?.state !== 'closed' || review.decision !== 'approved') return false;

	return (
		review.workflows.length > 0 &&
		review.workflows.every(
			(workflow) =>
				workflow.workflowVersionId !== null &&
				workflow.publishedVersionId === workflow.workflowVersionId,
		)
	);
});

const PromotionChanges = computed(() => componentRegistry.get('promotion-changes-prototype'));

const tabOptions = computed(() => [
	{
		label: i18n.baseText('workflowReviews.detail.tabs.activity'),
		value: 'activity' as const,
	},
	{
		label: i18n.baseText('workflowReviews.detail.tabs.changes'),
		value: 'changes' as const,
		tag: detail.value ? String(detail.value.workflows.length) : undefined,
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
		</div>

		<!-- Keyed so another review or tab starts at the top. -->
		<div
			:key="`${review.id}:${tab}`"
			ref="detailBody"
			:class="[$style.detailBody, { [$style.splitBody]: splitChanges && tab === 'changes' }]"
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
							<PrototypeEditableBody :item-id="review.id" :text="descriptionText">
								<N8nText
									v-if="descriptionText"
									color="text-base"
									size="medium"
									:class="$style.description"
									data-test-id="workflow-review-description"
								>
									{{ descriptionText }}
								</N8nText>
								<N8nText
									v-else
									color="text-light"
									size="medium"
									data-test-id="workflow-review-no-description"
								>
									{{ i18n.baseText('workflowReviews.detail.activity.noDescription') }}
								</N8nText>
							</PrototypeEditableBody>
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
					<!-- A real close still refuses new comments. The prototype keeps the box. -->
					<template v-if="prototypeSession.active || review.state === 'open'" #composer>
						<WorkflowReviewCommentComposer :can-comment="viewerCanComment" />
					</template>
				</WorkflowReviewActivityFeed>
			</div>

			<div
				v-else
				:class="[$style.panel, { [$style.splitPanel]: splitChanges }]"
				data-test-id="workflow-review-changes-panel"
			>
				<div v-if="splitChanges" :class="$style.splitHost">
					<component :is="PromotionChanges" :review-id="review.id" />
				</div>
				<template v-else>
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
				</template>
			</div>

			<WorkflowReviewDetailMetadata
				v-if="!(splitChanges && tab === 'changes')"
				:review="review"
				:hover-links="prototypeSession.active"
			/>
		</div>
	</div>
</template>

<style module lang="scss">
@use '../../../../reviews/components/activity-card' as *;

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
	border-bottom: var(--border);

	> :global(.n8n-tabs) {
		align-self: flex-end;
		/* The active-tab indicator covers the divider, as on Open and Closed. */
		margin-bottom: calc(-1 * var(--border-width));

		/* Same height for every tab, so a label without a badge lines up with one that has one.
		   The active border stays on the divider. */
		:global([role='tablist']) {
			align-items: stretch;
		}

		:global([role='tablist']) > * {
			display: flex;
			align-items: stretch;
		}

		:global([role='tablist']) > * > * {
			display: flex;
			flex: 1;
			align-items: stretch;
		}

		:global([role='tab']) {
			flex: 1;
			box-sizing: border-box;
		}
	}
}

.detailBody {
	display: flex;
	flex: 1;
	gap: var(--spacing--md);
	min-height: 0;
	overflow: auto;
	padding-top: var(--spacing--sm);
}

.panel {
	flex: 1;
	min-width: 0;
}

.splitBody {
	overflow: hidden;
	gap: 0;
	padding: 0;
}

.splitPanel {
	display: flex;
	min-height: 0;
}

.splitHost {
	display: flex;
	flex: 1;
	min-width: 0;
	min-height: 0;

	> * {
		flex: 1;
		min-height: 0;
	}
}

.activityPanel {
	flex: 1;
	min-width: 0;
	max-width: var(--review-activity--max-width, 45rem);
	/* End margin only, so the column starts on the tab edge. */
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
