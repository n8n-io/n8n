<script setup lang="ts">
import type { WorkflowReviewInboxItem, WorkflowReviewRequestDetail } from '@n8n/api-types';
import { N8nButton, N8nCallout, N8nTabs, N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, nextTick, ref, watch } from 'vue';

import type { WorkflowReviewDecisionInput } from '../workflowReviews.api';
import WorkflowReviewChangesSection from './WorkflowReviewChangesSection.vue';
import WorkflowReviewDetailMetadata from './WorkflowReviewDetailMetadata.vue';

export type WorkflowReviewDetailTab = 'activity' | 'changes';

const props = defineProps<{
	review: WorkflowReviewInboxItem | WorkflowReviewRequestDetail;
	tab: WorkflowReviewDetailTab;
	deciding: boolean;
}>();

const emit = defineEmits<{
	'update:tab': [tab: WorkflowReviewDetailTab];
	decide: [decision: WorkflowReviewDecisionInput];
}>();

const i18n = useI18n();
const pendingWorkflowId = ref<string | null>(null);

const detail = computed<WorkflowReviewRequestDetail | null>(() =>
	'workflows' in props.review ? props.review : null,
);

const viewerCanDecide = computed(() => detail.value?.viewerCanDecide ?? false);

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

function scrollToWorkflow(workflowId: string) {
	document
		.getElementById(`workflow-review-changes-${workflowId}`)
		?.scrollIntoView({ block: 'start' });
}

function onSelectWorkflow(workflowId: string) {
	if (props.tab === 'changes') {
		scrollToWorkflow(workflowId);
		return;
	}

	pendingWorkflowId.value = workflowId;
	emit('update:tab', 'changes');
}

watch(
	() => props.tab,
	async (tab) => {
		if (tab !== 'changes' || !pendingWorkflowId.value) return;
		const workflowId = pendingWorkflowId.value;
		pendingWorkflowId.value = null;
		await nextTick();
		scrollToWorkflow(workflowId);
	},
	{ flush: 'post' },
);
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
				<N8nTooltip :disabled="!ineligibilityHint" :content="ineligibilityHint" :show-after="300">
					<N8nButton
						size="small"
						:disabled="deciding || !viewerCanDecide"
						data-test-id="workflow-review-approve-button"
						@click="emit('decide', 'approved')"
					>
						{{ i18n.baseText('workflowReviews.detail.decision.approve') }}
					</N8nButton>
				</N8nTooltip>
				<N8nTooltip :disabled="!ineligibilityHint" :content="ineligibilityHint" :show-after="300">
					<N8nButton
						size="small"
						type="secondary"
						:disabled="deciding || !viewerCanDecide"
						data-test-id="workflow-review-request-changes-button"
						@click="emit('decide', 'changes_requested')"
					>
						{{ i18n.baseText('workflowReviews.detail.decision.requestChanges') }}
					</N8nButton>
				</N8nTooltip>
			</div>
		</div>

		<div :class="$style.detailBody">
			<div
				v-if="tab === 'activity'"
				:class="$style.panel"
				data-test-id="workflow-review-activity-panel"
			>
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
					<section
						v-for="workflow in detail.workflows"
						:id="`workflow-review-changes-${workflow.workflowId}`"
						:key="workflow.workflowId"
						:class="$style.workflowSection"
					>
						<WorkflowReviewChangesSection :workflow="workflow" />
					</section>
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

			<WorkflowReviewDetailMetadata :review="review" @select-workflow="onSelectWorkflow" />
		</div>
	</div>
</template>

<style module lang="scss">
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

.workflowSection {
	height: 100%;
	min-height: 0;
	scroll-margin-top: var(--spacing--sm);
}

.callout {
	max-width: var(--review-callout--max-width, 34rem);
}

.description {
	white-space: pre-wrap;
}

.decisionActions {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
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
}
</style>
