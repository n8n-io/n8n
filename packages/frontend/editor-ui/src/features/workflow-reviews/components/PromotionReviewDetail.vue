<script setup lang="ts">
import type {
	PromotionReviewDetailDto,
	PromotionReviewSummary,
	PromotionReviewWorkflowChange,
	PromotionReviewWorkflowDiffDto,
} from '@n8n/api-types';
import {
	N8nAvatar,
	N8nBadge,
	N8nButton,
	N8nCallout,
	N8nCard,
	N8nIcon,
	N8nLink,
	N8nLoading,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { deepCopy } from 'n8n-workflow';
import { computed, markRaw, ref, watch } from 'vue';

import WorkflowDiffView from '@/features/workflows/workflowDiff/WorkflowDiffView.vue';
import type { IWorkflowDb } from '@/Interface';

import { formatUserDisplayName } from '../workflowReviews.utils';
import PromotionReviewStateDot from './PromotionReviewStateDot.vue';

const props = defineProps<{
	review: PromotionReviewSummary | PromotionReviewDetailDto;
	approving: boolean;
	loadDiff: (workflowId: string) => Promise<PromotionReviewWorkflowDiffDto>;
}>();

const emit = defineEmits<{
	approve: [];
}>();

const i18n = useI18n();

const detail = computed<PromotionReviewDetailDto | null>(() =>
	'workflows' in props.review ? props.review : null,
);

const canApprove = computed(
	() => detail.value?.state === 'open' && !detail.value.hasConflicts && !!detail.value.connection,
);

const stateLabel = computed(() => i18n.baseText(`promotionReviews.state.${props.review.state}`));
const shortSha = computed(() => props.review.commitSha.slice(0, 8));

// -- Diff -------------------------------------------------------------------

const selectedWorkflowId = ref<string | null>(null);
const diff = ref<PromotionReviewWorkflowDiffDto | null>(null);
const diffLoading = ref(false);
const diffError = ref<string | null>(null);

const selectedWorkflow = computed(
	() =>
		detail.value?.workflows.find((workflow) => workflow.workflowId === selectedWorkflowId.value) ??
		null,
);

// Open the first changed workflow once the detail is in.
watch(
	() => detail.value?.workflows,
	(workflows) => {
		if (!workflows?.length) {
			selectedWorkflowId.value = null;
			return;
		}
		if (!workflows.some((workflow) => workflow.workflowId === selectedWorkflowId.value)) {
			selectedWorkflowId.value = workflows[0].workflowId;
		}
	},
	{ immediate: true },
);

watch(
	selectedWorkflowId,
	async (workflowId) => {
		diff.value = null;
		diffError.value = null;
		if (!workflowId) return;
		diffLoading.value = true;
		try {
			const loaded = await props.loadDiff(workflowId);
			if (selectedWorkflowId.value === workflowId) diff.value = loaded;
		} catch (error) {
			if (selectedWorkflowId.value === workflowId) {
				diffError.value = error instanceof Error ? error.message : String(error);
			}
		} finally {
			if (selectedWorkflowId.value === workflowId) diffLoading.value = false;
		}
	},
	{ immediate: true },
);

/** A package workflow file carries the fields the diff needs; the rest is metadata. */
function toWorkflow(
	content: Record<string, unknown> | null,
	fallback: PromotionReviewWorkflowChange,
): IWorkflowDb | undefined {
	if (!content) return undefined;
	const nodes = Array.isArray(content.nodes) ? content.nodes : [];
	const connections =
		typeof content.connections === 'object' && content.connections !== null
			? content.connections
			: {};
	const nodeGroups = Array.isArray(content.nodeGroups) ? content.nodeGroups : [];
	const name = typeof content.name === 'string' ? content.name : fallback.name;
	return markRaw(
		deepCopy({
			id: fallback.workflowId,
			name,
			active: false,
			isArchived: false,
			createdAt: '',
			updatedAt: '',
			versionId: '',
			activeVersionId: null,
			nodes,
			connections,
			nodeGroups,
		}) as IWorkflowDb,
	);
}

const sourceWorkflow = computed(() =>
	diff.value && selectedWorkflow.value
		? toWorkflow(diff.value.base, selectedWorkflow.value)
		: undefined,
);
const targetWorkflow = computed(() =>
	diff.value && selectedWorkflow.value
		? toWorkflow(diff.value.head, selectedWorkflow.value)
		: undefined,
);

const sourceLabel = computed(() =>
	diff.value?.baselineCommitSha
		? i18n.baseText('promotionReviews.diff.sourceLabel', {
				interpolate: { sha: diff.value.baselineCommitSha.slice(0, 8) },
			})
		: i18n.baseText('promotionReviews.diff.sourceLabel.none'),
);
const targetLabel = computed(() =>
	i18n.baseText('promotionReviews.diff.targetLabel', { interpolate: { sha: shortSha.value } }),
);

function changeBadgeVariant(
	change: PromotionReviewWorkflowChange['change'],
): 'success' | 'danger' | 'warning' {
	if (change === 'added') return 'success';
	if (change === 'deleted') return 'danger';
	return 'warning';
}
</script>

<template>
	<div :class="$style.container" data-test-id="promotion-review-detail">
		<div :class="$style.actionRow">
			<N8nText color="text-light" size="small">
				{{ i18n.baseText('promotionReviews.detail.kind') }}
			</N8nText>
			<div :class="$style.actions">
				<N8nLink :to="review.webUrl" new-window size="small" theme="text">
					<span :class="$style.externalLink">
						<N8nIcon icon="external-link" size="small" />
						{{ i18n.baseText('promotionReviews.detail.openInGitLab') }}
					</span>
				</N8nLink>
				<N8nButton
					v-if="detail?.state === 'open'"
					:label="i18n.baseText('promotionReviews.detail.approveAndMerge')"
					:disabled="!canApprove"
					:loading="approving"
					size="small"
					data-test-id="promotion-review-approve"
					@click="emit('approve')"
				/>
			</div>
		</div>

		<N8nCallout
			v-for="warning in detail?.warnings ?? []"
			:key="warning"
			theme="warning"
			:class="$style.callout"
		>
			{{ warning }}
		</N8nCallout>
		<N8nCallout v-if="detail?.hasConflicts" theme="danger" :class="$style.callout">
			{{ i18n.baseText('promotionReviews.detail.conflicts') }}
		</N8nCallout>
		<N8nCallout v-if="review.state === 'merged'" theme="success" :class="$style.callout">
			{{
				i18n.baseText('promotionReviews.detail.merged', {
					interpolate: {
						name: review.approvedBy
							? formatUserDisplayName(review.approvedBy)
							: i18n.baseText('promotionReviews.detail.mergedOnGitLab'),
					},
				})
			}}
		</N8nCallout>

		<div :class="$style.body">
			<aside :class="$style.metadata">
				<N8nCard :class="$style.card">
					<template #header>
						<N8nText bold color="text-light" size="medium">
							{{ i18n.baseText('promotionReviews.detail.status') }}
						</N8nText>
					</template>
					<div :class="$style.status">
						<PromotionReviewStateDot :state="review.state" decorative />
						<N8nText size="medium">{{ stateLabel }}</N8nText>
					</div>
				</N8nCard>

				<N8nCard :class="$style.card">
					<div :class="$style.section">
						<N8nText bold color="text-light" size="medium">
							{{ i18n.baseText('promotionReviews.detail.promotedBy') }}
						</N8nText>
						<div v-if="review.createdBy" :class="$style.person">
							<N8nAvatar
								:first-name="review.createdBy.firstName"
								:last-name="review.createdBy.lastName"
								size="xsmall"
							/>
							<N8nText size="medium">{{ formatUserDisplayName(review.createdBy) }}</N8nText>
						</div>
						<N8nText v-else color="text-light" size="medium">
							{{ i18n.baseText('workflowReviews.detail.metadata.requesterDeleted') }}
						</N8nText>
					</div>
					<div :class="$style.section">
						<N8nText bold color="text-light" size="medium">
							{{ i18n.baseText('promotionReviews.detail.branch') }}
						</N8nText>
						<N8nText size="small" :class="$style.mono">{{ review.branchName }}</N8nText>
						<N8nText size="small" color="text-light" :class="$style.mono">{{ shortSha }}</N8nText>
					</div>
					<div v-if="detail?.mergeRequest" :class="$style.section">
						<N8nText bold color="text-light" size="medium">
							{{ i18n.baseText('promotionReviews.detail.target') }}
						</N8nText>
						<N8nText size="small" :class="$style.mono">
							{{ detail.mergeRequest.targetBranch }}
						</N8nText>
					</div>
					<div v-if="review.connection" :class="$style.section">
						<N8nText bold color="text-light" size="medium">
							{{ i18n.baseText('promotionReviews.detail.connection') }}
						</N8nText>
						<N8nText size="medium">{{ review.connection.name }}</N8nText>
					</div>
				</N8nCard>

				<N8nCard v-if="detail" :class="$style.card" data-test-id="promotion-review-workflows">
					<template #header>
						<N8nText bold color="text-light" size="medium">
							{{
								i18n.baseText('promotionReviews.detail.workflows', {
									adjustToNumber: detail.workflows.length,
									interpolate: { count: String(detail.workflows.length) },
								})
							}}
						</N8nText>
					</template>
					<N8nText v-if="detail.workflows.length === 0" color="text-light" size="small">
						{{ i18n.baseText('promotionReviews.detail.noWorkflowChanges') }}
					</N8nText>
					<div v-else :class="$style.workflows">
						<button
							v-for="workflow in detail.workflows"
							:key="workflow.workflowId"
							type="button"
							:class="[
								$style.workflow,
								{ [$style.workflowSelected]: workflow.workflowId === selectedWorkflowId },
							]"
							data-test-id="promotion-review-workflow"
							@click="selectedWorkflowId = workflow.workflowId"
						>
							<N8nIcon icon="workflow" size="small" :class="$style.workflowIcon" />
							<span :class="$style.workflowName">{{ workflow.name }}</span>
							<N8nBadge :variant="changeBadgeVariant(workflow.change)" size="small">
								{{ i18n.baseText(`promotionReviews.change.${workflow.change}`) }}
							</N8nBadge>
						</button>
					</div>
				</N8nCard>
			</aside>

			<div :class="$style.diffColumn">
				<N8nLoading v-if="!detail || diffLoading" :loading="true" :rows="3" />
				<N8nCallout v-else-if="diffError" theme="danger" :class="$style.callout">
					{{ diffError }}
				</N8nCallout>
				<N8nCallout v-else-if="!selectedWorkflow" theme="info" :class="$style.callout">
					{{ i18n.baseText('promotionReviews.detail.noWorkflowChanges') }}
				</N8nCallout>
				<div v-else-if="diff" :class="$style.diff" data-test-id="promotion-review-diff">
					<WorkflowDiffView
						:source-workflow="sourceWorkflow"
						:target-workflow="targetWorkflow"
						:source-label="sourceLabel"
						:target-label="targetLabel"
						show-fullscreen-button
					>
						<template #sourceEmptyText>
							<N8nText size="small" color="text-base">
								{{ i18n.baseText('promotionReviews.diff.sourceEmpty') }}
							</N8nText>
						</template>
					</WorkflowDiffView>
				</div>
			</div>
		</div>
	</div>
</template>

<style module lang="scss">
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	height: 100%;
	min-height: 0;
	padding-right: var(--spacing--md);
}

.actionRow {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
	min-height: var(--review-tab-bar--height, var(--height--sm));
}

.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
}

.externalLink {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.callout {
	max-width: var(--review-callout--max-width, 34rem);
}

.body {
	display: flex;
	flex: 1;
	gap: var(--spacing--md);
	min-height: 0;
}

.metadata {
	display: flex;
	flex: 0 0 min(18rem, 30%);
	flex-direction: column;
	gap: var(--spacing--2xs);
	min-width: 14rem;
	overflow-y: auto;
}

.card {
	--card--padding: var(--spacing--xs);
	--n8n--card-body--gap: var(--spacing--sm);

	align-items: stretch;
	border-color: var(--border-color);
	background-color: transparent;
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
	gap: var(--spacing--3xs);
	min-width: 0;
}

.person {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
	overflow-wrap: anywhere;
}

.mono {
	font-family: var(--font-family--monospace);
	overflow-wrap: anywhere;
}

.workflow {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	width: 100%;
	padding: var(--spacing--3xs) var(--spacing--2xs);
	border: none;
	border-radius: var(--radius);
	background: transparent;
	color: var(--color--text);
	cursor: pointer;
	text-align: left;

	&:hover {
		background-color: var(--background--hover);
	}

	&:focus-visible {
		outline: var(--border-width) solid var(--focus--border-color);
	}
}

.workflowSelected {
	background-color: var(--background--active);
}

.workflowIcon {
	flex-shrink: 0;
}

.workflowName {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-size: var(--font-size--sm);
}

.diffColumn {
	display: flex;
	flex: 1;
	flex-direction: column;
	min-width: 0;
	min-height: 0;
}

.diff {
	flex: 1;
	min-height: 24rem;
	border: var(--border);
	border-radius: var(--radius--2xs);
	overflow: hidden;
}
</style>
