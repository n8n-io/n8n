<script setup lang="ts">
import type { WorkflowReviewCheck, WorkflowReviewRequestDetail } from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import { N8nButton, N8nIcon, N8nLink, N8nText, type IconColor } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useIntervalFn } from '@vueuse/core';
import { computed, ref, watch } from 'vue';

import { VIEWS } from '@n8n/frontend-constants/views';
import { useRootStore } from '@n8n/stores/useRootStore';

import { useReviewActivityStore } from '../reviewActivity.store';
import { useReviewDetailStore } from '../reviewDetail.store';
import { runWorkflowReviewTests } from '../workflowReviews.api';

const props = defineProps<{ review: WorkflowReviewRequestDetail }>();

const POLL_INTERVAL_MS = 3000;

const i18n = useI18n();
const { showError } = useToast();
const rootStore = useRootStore();
const detailStore = useReviewDetailStore();
const activityStore = useReviewActivityStore();

const starting = ref(false);

const STATUS_ICON: Record<
	WorkflowReviewCheck['status'],
	{ icon: 'circle-check' | 'circle-x' | 'circle-alert' | 'loader-circle' | 'circle-pause'; color: IconColor }
> = {
	passed: { icon: 'circle-check', color: 'success' },
	failed: { icon: 'circle-x', color: 'danger' },
	error: { icon: 'circle-alert', color: 'warning' },
	running: { icon: 'loader-circle', color: 'text-light' },
	pending: { icon: 'circle-pause', color: 'text-light' },
};

const isOpen = computed(() => props.review.state === 'open');

/** A run starts in the background after a submit, so a pending check can turn into a running one. */
const isUnsettled = computed(() =>
	props.review.checks.some((check) => check.status === 'running' || check.status === 'pending'),
);

function describe(check: WorkflowReviewCheck) {
	const counts = {
		passed: String(check.counts?.passed ?? 0),
		failed: String(check.counts?.failed ?? 0),
		total: String(check.counts?.total ?? 0),
	};
	switch (check.status) {
		case 'passed':
			return i18n.baseText('workflowReviews.checks.tests.passed', { interpolate: counts });
		case 'failed':
			return i18n.baseText('workflowReviews.checks.tests.failed', { interpolate: counts });
		case 'error':
			return i18n.baseText('workflowReviews.checks.tests.error', {
				interpolate: { message: check.message ?? '' },
			});
		case 'running':
			return i18n.baseText('workflowReviews.checks.tests.running');
		case 'pending':
			return check.viewerCanRun
				? i18n.baseText('workflowReviews.checks.tests.pending')
				: i18n.baseText('workflowReviews.checks.tests.pending.waiting');
	}
}

function canRun(check: WorkflowReviewCheck) {
	return isOpen.value && check.viewerCanRun && check.status !== 'running';
}

async function refresh() {
	await detailStore.fetchDetail(props.review.id);
}

const { pause, resume } = useIntervalFn(
	() => {
		void refresh();
	},
	POLL_INTERVAL_MS,
	{ immediate: false },
);

watch(
	() => isOpen.value && isUnsettled.value,
	(poll) => (poll ? resume() : pause()),
	{ immediate: true },
);

// A finished run writes a feed entry, so the feed reloads when a check settles.
watch(isUnsettled, (unsettled, wasUnsettled) => {
	if (wasUnsettled && !unsettled) void activityStore.fetchFeed(props.review.id);
});

async function runTests() {
	starting.value = true;
	try {
		await runWorkflowReviewTests(rootStore.restApiContext, props.review.id);
		await refresh();
	} catch (error) {
		showError(error, i18n.baseText('workflowReviews.checks.tests.run.error'));
	} finally {
		starting.value = false;
	}
}
</script>

<template>
	<div v-if="review.checks.length > 0" :class="$style.card" data-test-id="workflow-review-checks">
		<div
			v-for="check in review.checks"
			:key="`${check.id}:${check.workflowId}`"
			:class="$style.check"
			:data-test-id="`workflow-review-check-${check.status}`"
		>
			<N8nIcon
				:icon="STATUS_ICON[check.status].icon"
				:color="STATUS_ICON[check.status].color"
				:spin="check.status === 'running'"
				:size="16"
			/>
			<div :class="$style.text">
				<N8nText tag="h3" bold color="text-dark" size="medium">
					{{ i18n.baseText('workflowReviews.checks.tests.title') }}
				</N8nText>
				<N8nText color="text-base" size="medium" :class="$style.description">
					{{ describe(check) }}
				</N8nText>
			</div>
			<div :class="$style.actions">
				<N8nLink
					:to="{ name: VIEWS.WORKFLOW_TESTS, params: { workflowId: check.workflowId } }"
					theme="text"
					size="medium"
					data-test-id="workflow-review-check-open-tests"
				>
					{{ i18n.baseText('workflowReviews.checks.tests.open') }}
				</N8nLink>
				<N8nButton
					v-if="canRun(check)"
					variant="outline"
					size="small"
					:loading="starting"
					data-test-id="workflow-review-check-run"
					@click="runTests"
				>
					<template #icon>
						<N8nIcon icon="refresh-cw" />
					</template>
					{{
						check.status === 'pending'
							? i18n.baseText('workflowReviews.checks.tests.run')
							: i18n.baseText('workflowReviews.checks.tests.runAgain')
					}}
				</N8nButton>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
@use './activity-card' as *;

.card {
	@include activity-card;

	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	margin-top: var(--spacing--sm);
}

.check {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--2xs);
}

.text {
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
}

.description {
	overflow-wrap: anywhere;
}

.actions {
	display: flex;
	flex-shrink: 0;
	align-items: center;
	gap: var(--spacing--xs);
}
</style>
