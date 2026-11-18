<script setup lang="ts">
import type { WorkflowReviewActivityEntry } from '@n8n/api-types';
import { N8nIcon, N8nLink, N8nText, N8nTimeAgo, type IconColor } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, inject } from 'vue';

import { getVersionLabel } from '@n8n/composables/useWorkflowVersionLabel';
import { VIEWS } from '@n8n/frontend-constants/views';
import { useRootStore } from '@n8n/stores/useRootStore';

import { ReviewLinkedWorkflowsKey, type ReviewLinkedWorkflowContext } from '../../constants';
import WorkflowReviewActivityFallback from './WorkflowReviewActivityFallback.vue';

const props = defineProps<{
	entry: Extract<WorkflowReviewActivityEntry, { type: 'tests.completed' }>;
}>();

const i18n = useI18n();
const rootStore = useRootStore();

const linkedWorkflows = inject(
	ReviewLinkedWorkflowsKey,
	computed(() => new Map<string, ReviewLinkedWorkflowContext>()),
);

const STATUS_ICON = {
	passed: { icon: 'circle-check', color: 'success' },
	failed: { icon: 'circle-x', color: 'danger' },
	error: { icon: 'circle-alert', color: 'warning' },
} as const satisfies Record<string, { icon: string; color: IconColor }>;

const content = computed(() => {
	const data = props.entry.data;
	if (!data) return null;

	const linked = linkedWorkflows.value.get(data.workflowId);
	const versionName =
		linked?.pinnedVersionId === data.workflowVersionId ? linked.pinnedVersionName : null;
	const headline =
		data.status === 'error'
			? i18n.baseText('workflowReviews.detail.activity.testsCompleted.error')
			: i18n.baseText(`workflowReviews.detail.activity.testsCompleted.${data.status}`, {
					interpolate: {
						passed: String(data.passed),
						failed: String(data.failed),
						total: String(data.total),
					},
				});

	return {
		headline,
		version: i18n.baseText('workflowReviews.detail.activity.testsCompleted.version', {
			interpolate: {
				version: getVersionLabel({
					workflowHistory: { versionId: data.workflowVersionId, name: versionName },
				}),
			},
		}),
		caller: data.caller
			? i18n.baseText('workflowReviews.detail.activity.testsCompleted.caller', {
					interpolate: { workflowName: data.caller.name },
				})
			: null,
		status: STATUS_ICON[data.status],
		failures: data.failures,
		hiddenFailures: Math.max(0, data.failed - data.failures.length),
		errors: data.errors,
		// A caller's entry opens the caller. Otherwise only a workflow that the review
		// still covers has a Tests tab to open.
		testsLink: data.caller
			? { name: VIEWS.WORKFLOW_TESTS, params: { workflowId: data.caller.workflowId } }
			: linked
				? { name: VIEWS.WORKFLOW_TESTS, params: { workflowId: data.workflowId } }
				: null,
	};
});

const hasDetails = computed(
	() => !!content.value && (content.value.failures.length > 0 || content.value.errors.length > 0),
);
</script>

<template>
	<div
		v-if="content"
		:class="[$style.entry, hasDetails && $style.boxed]"
		data-test-id="workflow-review-activity-tests-completed"
	>
		<div :class="$style.statusIcon" aria-hidden="true">
			<N8nIcon :icon="content.status.icon" :size="16" :color="content.status.color" />
		</div>
		<div :class="$style.content">
			<div :class="$style.headline">
				<N8nText size="medium" color="text-dark" :class="$style.line">
					{{ content.headline }}
				</N8nText>
				<N8nText
					v-if="content.caller"
					size="medium"
					color="text-light"
					:class="$style.line"
					data-test-id="workflow-review-activity-tests-caller"
				>
					{{ content.caller }}
				</N8nText>
				<N8nText size="medium" color="text-light" :class="$style.line">
					{{ content.version }}
				</N8nText>
				<N8nText size="medium" color="text-light" :class="$style.line">
					<time :datetime="entry.createdAt">
						<N8nTimeAgo :date="entry.createdAt" :locale="rootStore.defaultLocale" />
					</time>
				</N8nText>
				<N8nLink
					v-if="content.testsLink"
					:to="content.testsLink"
					theme="text"
					size="medium"
					:class="$style.link"
					data-test-id="workflow-review-activity-tests-link"
				>
					{{ i18n.baseText('workflowReviews.checks.tests.open') }}
				</N8nLink>
			</div>
			<ul v-if="hasDetails" :class="$style.details">
				<li
					v-for="failure in content.failures"
					:key="failure.name"
					:class="$style.failure"
					data-test-id="workflow-review-activity-tests-failure"
				>
					<N8nText size="small" bold color="text-dark">{{ failure.name }}</N8nText>
					<N8nText v-if="failure.message" size="small" color="text-base" :class="$style.message">
						{{ failure.message }}
					</N8nText>
				</li>
				<li v-for="error in content.errors" :key="error" :class="$style.failure">
					<N8nText size="small" color="text-base" :class="$style.message">{{ error }}</N8nText>
				</li>
				<li v-if="content.hiddenFailures > 0">
					<N8nText size="small" color="text-light">
						{{
							i18n.baseText('workflowReviews.detail.activity.testsCompleted.moreFailures', {
								interpolate: { count: String(content.hiddenFailures) },
							})
						}}
					</N8nText>
				</li>
			</ul>
		</div>
	</div>
	<WorkflowReviewActivityFallback v-else />
</template>

<style lang="scss" module>
@use '../activity-card' as *;

.entry {
	@include activity-row;
}

.boxed {
	@include activity-card;
}

.statusIcon {
	@include activity-avatar;

	display: flex;
	width: var(--review-activity--avatar-size);
	height: var(--review-activity--avatar-size);
	align-items: center;
	justify-content: center;
}

.content {
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.headline {
	@include activity-headline;
}

.line {
	line-height: var(--review-activity--line-height);
}

.link {
	margin-left: auto;
}

.details {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	margin: 0;
	padding: 0;
	list-style: none;
}

.failure {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	padding-left: var(--spacing--2xs);
	border-left: var(--border-width) var(--border-style) var(--color--danger);
}

.message {
	white-space: pre-wrap;
	overflow-wrap: anywhere;
	font-family: var(--font-family--monospace);
}
</style>
