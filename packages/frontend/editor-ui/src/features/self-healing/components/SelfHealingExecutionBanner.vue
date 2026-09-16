<script setup lang="ts">
import {
	N8nAssistantAvatar,
	N8nButton,
	N8nCallout,
	N8nLink,
	N8nSpinner,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { ExecutionSummary } from 'n8n-workflow';
import { computed } from 'vue';

import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { WORKFLOW_REVIEW_REQUESTS_VIEW } from '@/features/workflow-reviews/constants';

import { useSelfHealingStore } from '../selfHealing.store';

/**
 * Sits in the execution preview header of a failed execution and offers a
 * one-click fix. The fix itself is faked by the store: after a short delay a
 * review appears in the inbox and the banner links to it.
 */
const props = defineProps<{
	execution: ExecutionSummary;
}>();

const i18n = useI18n();
const store = useSelfHealingStore();
const workflowsListStore = useWorkflowsListStore();

const workflow = computed(() => workflowsListStore.getWorkflowById(props.execution.workflowId));
const projectId = computed(() => workflow.value?.homeProject?.id ?? null);

const isFailed = computed(
	() => props.execution.status === 'error' || props.execution.status === 'crashed',
);
const isVisible = computed(() => store.isEnabled && isFailed.value);

const healingStatus = computed(() =>
	store.getWorkflowStatus(props.execution.workflowId, projectId.value),
);
const job = computed(() => store.getFixJob(props.execution.id));

/** Under auto-deploy the created review is already closed, so the copy says "deployed". */
const isDeployed = computed(
	() =>
		job.value?.status === 'submitted' &&
		store.findReview(job.value.reviewId)?.item.state === 'closed',
);

const autonomy = computed(() =>
	healingStatus.value.enrolled ? healingStatus.value.config.autonomy : 'review',
);

const idleBody = computed(() => {
	if (!healingStatus.value.enrolled) {
		return i18n.baseText('selfHealing.executionBanner.notEnrolled');
	}
	switch (autonomy.value) {
		case 'diagnose':
			return i18n.baseText('selfHealing.executionBanner.bodyDiagnose');
		case 'deploy':
			return i18n.baseText('selfHealing.executionBanner.bodyAutoDeploy');
		default:
			return i18n.baseText('selfHealing.executionBanner.body');
	}
});

const ctaLabel = computed(() =>
	i18n.baseText(
		autonomy.value === 'diagnose'
			? 'selfHealing.executionBanner.ctaDiagnose'
			: 'selfHealing.executionBanner.cta',
	),
);

const runningLabel = computed(() =>
	i18n.baseText(
		autonomy.value === 'diagnose'
			? 'selfHealing.executionBanner.runningDiagnose'
			: 'selfHealing.executionBanner.running',
	),
);

const reviewRoute = computed(() =>
	job.value?.status === 'submitted'
		? { name: WORKFLOW_REVIEW_REQUESTS_VIEW, params: { reviewRequestId: job.value.reviewId } }
		: null,
);

async function onFix() {
	await store.startFix(props.execution, {
		workflowName: workflow.value?.name ?? props.execution.workflowName ?? '',
		projectId: projectId.value,
		nodes: workflow.value?.nodes,
		connections: workflow.value?.connections,
	});
}
</script>

<template>
	<N8nCallout
		v-if="isVisible"
		theme="secondary"
		iconless
		:class="$style.banner"
		data-test-id="self-healing-execution-banner"
	>
		<div :class="$style.content">
			<N8nAssistantAvatar size="small" :class="$style.avatar" />

			<div v-if="!job" :class="$style.text">
				<N8nText size="small" bold color="text-dark">
					{{ i18n.baseText('selfHealing.executionBanner.title') }}
				</N8nText>
				<N8nText size="small" color="text-base">{{ idleBody }}</N8nText>
			</div>
			<div
				v-else-if="job.status === 'running'"
				:class="[$style.text, $style.running]"
				data-test-id="self-healing-execution-banner-running"
			>
				<N8nSpinner size="small" />
				<N8nText size="small" color="text-base">{{ runningLabel }}</N8nText>
			</div>
			<div
				v-else-if="job.status === 'diagnosed'"
				:class="$style.text"
				data-test-id="self-healing-execution-banner-diagnosed"
			>
				<N8nText size="small" bold color="text-dark">
					{{ i18n.baseText('selfHealing.executionBanner.diagnosed.title') }}
				</N8nText>
				<N8nText size="small" color="text-base">{{ job.summary }}</N8nText>
				<N8nText size="small" color="text-dark">
					{{
						i18n.baseText('selfHealing.executionBanner.diagnosed.suggestedFix', {
							interpolate: { fix: job.suggestedFix },
						})
					}}
				</N8nText>
			</div>
			<div v-else :class="$style.text" data-test-id="self-healing-execution-banner-submitted">
				<N8nText size="small" bold color="text-dark">
					{{
						i18n.baseText(
							isDeployed
								? 'selfHealing.executionBanner.deployed.title'
								: 'selfHealing.executionBanner.submitted.title',
						)
					}}
				</N8nText>
				<N8nText size="small" color="text-base">
					{{
						i18n.baseText(
							isDeployed
								? 'selfHealing.executionBanner.deployed.body'
								: 'selfHealing.executionBanner.submitted.body',
							{ interpolate: { node: job.changedNode } },
						)
					}}
				</N8nText>
			</div>

			<N8nButton
				v-if="!job"
				size="small"
				icon="sparkles"
				:label="ctaLabel"
				:class="$style.action"
				data-test-id="self-healing-fix-button"
				@click="onFix"
			/>
			<N8nLink
				v-else-if="reviewRoute"
				:to="reviewRoute"
				size="small"
				bold
				:class="$style.action"
				data-test-id="self-healing-view-review-link"
			>
				{{ i18n.baseText('selfHealing.executionBanner.viewReview') }}
			</N8nLink>
		</div>
	</N8nCallout>
</template>

<style lang="scss" module>
.banner {
	margin-top: var(--spacing--xs);
	max-width: 620px;
}

.content {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	width: 100%;
}

.avatar {
	flex-shrink: 0;
}

.text {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
	flex: 1;
}

.running {
	flex-direction: row;
	align-items: center;
	gap: var(--spacing--2xs);
}

.action {
	flex-shrink: 0;
	white-space: nowrap;
}
</style>
