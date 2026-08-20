<script setup lang="ts">
import type {
	WorkflowReviewRequestDecision,
	WorkflowReviewRequestState,
	WorkflowReviewRequestWorkflowDetail,
	WorkflowReviewVersionSnapshot,
} from '@n8n/api-types';
import { N8nCallout, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { deepCopy } from 'n8n-workflow';
import isEqual from 'lodash/isEqual';
import omit from 'lodash/omit';
import { computed, markRaw } from 'vue';

import WorkflowDiffView from '@/features/workflows/workflowDiff/WorkflowDiffView.vue';
import type { IWorkflowDb } from '@/Interface';

const props = defineProps<{
	workflow: WorkflowReviewRequestWorkflowDetail;
	state: WorkflowReviewRequestState;
	decision: WorkflowReviewRequestDecision;
}>();

const i18n = useI18n();

// Only approval freezes a baseline, so an approved review diffs against what was
// published back then; a review closed any other way has nothing to diff against.
const isApproved = computed(() => props.state === 'closed' && props.decision === 'approved');
const isClosedWithoutApproval = computed(
	() => props.state === 'closed' && props.decision !== 'approved',
);

/**
 * Label each side the way version history does, falling back to a short id.
 * Falsy rather than nullish: the publish endpoints accept `name: ""`.
 */
const versionLabel = (snapshot: WorkflowReviewVersionSnapshot) =>
	snapshot.name || snapshot.versionId.slice(0, 8);

/**
 * A snapshot minus its identity and metadata — i.e. everything the diff renders.
 * Derived by omission rather than an explicit field list to avoid drift; renaming
 * a version must not read as a change.
 */
function contentOf(snapshot: WorkflowReviewVersionSnapshot) {
	return omit(snapshot, ['versionId', 'name', 'createdAt']);
}

const hasChanges = computed(() => {
	const { pinnedVersion, baselineVersion } = props.workflow;

	if (!pinnedVersion) return false;
	// No baseline means first publish: everything is a change.
	if (!baselineVersion) return true;
	if (pinnedVersion.versionId === baselineVersion.versionId) return false;

	return !isEqual(contentOf(baselineVersion), contentOf(pinnedVersion));
});

// Hand the diff a fully-detached, non-reactive copy.
function snapshotToWorkflow(snapshot: WorkflowReviewVersionSnapshot): IWorkflowDb {
	return markRaw(
		deepCopy({
			id: props.workflow.workflowId,
			name: props.workflow.workflowName,
			active: false,
			isArchived: false,
			createdAt: snapshot.createdAt,
			updatedAt: snapshot.createdAt,
			versionId: snapshot.versionId,
			activeVersionId: null,
			nodes: snapshot.nodes,
			connections: snapshot.connections,
			nodeGroups: snapshot.nodeGroups,
		}),
	);
}

const sourceWorkflow = computed(() =>
	props.workflow.baselineVersion ? snapshotToWorkflow(props.workflow.baselineVersion) : undefined,
);
const targetWorkflow = computed(() =>
	props.workflow.pinnedVersion ? snapshotToWorkflow(props.workflow.pinnedVersion) : undefined,
);

// The dots track publish status, which approval flips: the approved version is
// the published one now, and the baseline it replaced no longer is.
const sourceDotClass = computed(() =>
	isApproved.value ? 'statusDotSuperseded' : 'statusDotPublished',
);
const targetDotClass = computed(() =>
	isApproved.value ? 'statusDotPublished' : 'statusDotInReview',
);

const noChangesText = computed(() =>
	i18n.baseText(
		isApproved.value
			? 'workflowReviews.changes.closed.noChanges'
			: 'workflowReviews.changes.noChanges',
	),
);
const sourceEmptyText = computed(() =>
	i18n.baseText(
		isApproved.value
			? 'workflowReviews.changes.closed.firstPublish.sourceEmpty'
			: 'workflowReviews.changes.firstPublish.sourceEmpty',
	),
);

const sourceLabel = computed(() =>
	props.workflow.baselineVersion
		? i18n.baseText(
				isApproved.value
					? 'workflowReviews.changes.closed.sourceLabel'
					: 'workflowReviews.changes.sourceLabel',
				{ interpolate: { version: versionLabel(props.workflow.baselineVersion) } },
			)
		: undefined,
);
const targetLabel = computed(() =>
	props.workflow.pinnedVersion
		? i18n.baseText(
				isApproved.value
					? 'workflowReviews.changes.closed.targetLabel'
					: 'workflowReviews.changes.targetLabel',
				{ interpolate: { version: versionLabel(props.workflow.pinnedVersion) } },
			)
		: undefined,
);
</script>

<template>
	<N8nCallout
		v-if="isClosedWithoutApproval"
		theme="info"
		:class="$style.callout"
		data-test-id="workflow-review-changes-closed-without-approval"
	>
		{{ i18n.baseText('workflowReviews.changes.closedWithoutApproval') }}
	</N8nCallout>
	<N8nCallout
		v-else-if="!workflow.pinnedVersion"
		theme="warning"
		:class="$style.callout"
		data-test-id="workflow-review-changes-version-unavailable"
	>
		{{ i18n.baseText('workflowReviews.changes.versionUnavailable.body') }}
	</N8nCallout>
	<N8nCallout
		v-else-if="!hasChanges"
		theme="info"
		:class="$style.callout"
		data-test-id="workflow-review-changes-no-changes"
	>
		{{ noChangesText }}
	</N8nCallout>
	<div v-else :class="$style.diff" data-test-id="workflow-review-changes-diff">
		<WorkflowDiffView
			:source-workflow="sourceWorkflow"
			:target-workflow="targetWorkflow"
			:source-label="sourceLabel"
			:target-label="targetLabel"
		>
			<!-- Only when a baseline exists: with no prior published version there is
				no publish status to represent. -->
			<template v-if="workflow.baselineVersion" #sourceLabel>
				<span :class="$style.versionBadge" data-test-id="workflow-review-changes-source-label">
					<span :class="[$style.statusDot, $style[sourceDotClass]]" />
					<N8nText color="text-dark" size="small" compact>{{ sourceLabel }}</N8nText>
				</span>
			</template>
			<template #targetLabel>
				<span :class="$style.versionBadge" data-test-id="workflow-review-changes-target-label">
					<span :class="[$style.statusDot, $style[targetDotClass]]" />
					<N8nText color="text-dark" size="small" compact>{{ targetLabel }}</N8nText>
				</span>
			</template>
			<template #sourceEmptyText>
				{{ sourceEmptyText }}
			</template>
		</WorkflowDiffView>
	</div>
</template>

<style module lang="scss">
.callout {
	max-width: var(--review-callout--max-width, 34rem);
	margin-top: var(--spacing--5xs);
}

.versionBadge {
	composes: sourceBadge from '../../workflows/workflowDiff/workflowDiff.module.scss';
}

.statusDot {
	height: var(--spacing--2xs);
	width: var(--spacing--2xs);
	border-radius: 50%;
	display: inline-block;
	flex-shrink: 0;
}

.statusDotPublished {
	background-color: var(--color--mint-600);
}

.statusDotInReview {
	background-color: var(--color--yellow-500);
}

.statusDotSuperseded {
	background-color: var(--color--text--tint-1);
}

.diff {
	height: 100%;
	min-height: 0;
	border: var(--border-width) var(--border-style) var(--border-color--subtle);
	border-radius: var(--radius--md);
	overflow: hidden;
}
</style>
