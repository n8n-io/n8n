<script setup lang="ts">
import type {
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
}>();

const i18n = useI18n();

const shortVersion = (versionId: string) => versionId.slice(0, 8);

/**
 * A snapshot minus its identity and timestamp — i.e. everything the diff renders.
 * Derived by omission rather than an explicit field list to avoid drift.
 */
function contentOf(snapshot: WorkflowReviewVersionSnapshot) {
	return omit(snapshot, ['versionId', 'createdAt']);
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

const sourceLabel = computed(() =>
	props.workflow.baselineVersion
		? i18n.baseText('workflowReviews.changes.sourceLabel', {
				interpolate: { version: shortVersion(props.workflow.baselineVersion.versionId) },
			})
		: undefined,
);
const targetLabel = computed(() =>
	props.workflow.pinnedVersion
		? i18n.baseText('workflowReviews.changes.targetLabel', {
				interpolate: { version: shortVersion(props.workflow.pinnedVersion.versionId) },
			})
		: undefined,
);
</script>

<template>
	<N8nCallout
		v-if="!workflow.pinnedVersion"
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
		{{ i18n.baseText('workflowReviews.changes.noChanges') }}
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
					<span :class="[$style.statusDot, $style.statusDotPublished]" />
					<N8nText color="text-dark" size="small" compact>{{ sourceLabel }}</N8nText>
				</span>
			</template>
			<template #targetLabel>
				<span :class="$style.versionBadge" data-test-id="workflow-review-changes-target-label">
					<span :class="[$style.statusDot, $style.statusDotInReview]" />
					<N8nText color="text-dark" size="small" compact>{{ targetLabel }}</N8nText>
				</span>
			</template>
			<template #sourceEmptyText>
				{{ i18n.baseText('workflowReviews.changes.firstPublish.sourceEmpty') }}
			</template>
		</WorkflowDiffView>
	</div>
</template>

<style module lang="scss">
.callout {
	max-width: var(--review-callout--max-width, 34rem);
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

.diff {
	height: 100%;
	min-height: 0;
	border: var(--border-width) var(--border-style) var(--border-color--subtle);
	border-radius: var(--radius--md);
	overflow: hidden;
}
</style>
