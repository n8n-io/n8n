<script setup lang="ts">
import type { WorkflowReviewRequestForWorkflow } from '@n8n/api-types';
import { N8nButton, N8nHeading, N8nPopover, N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';

import { formatUserDisplayName } from '../formatUserDisplayName';

type BannerAction = 'submit-changes' | 'retry-publish';

/**
 * `info` while the review is simply in progress, `warning` once the author has
 * something to do, `success` for an approved version — matching how the design
 * system uses these semantic colors elsewhere.
 */
type BannerTone = 'info' | 'warning' | 'success';

type BannerStatus = {
	pill: string;
	title: string;
	body: string;
	support: string;
	tone: BannerTone;
	action: BannerAction | null;
};

const props = defineProps<{
	/** Latest review of this workflow, from the review status store. */
	review: WorkflowReviewRequestForWorkflow | null;
	/** Saved version of the working copy — version divergence is derived from it. */
	savedVersionId?: string;
	/** Whether the user may push the latest version into the open review. */
	canSubmitChanges: boolean;
	/**
	 * Whether the user may open the review detail.
	 */
	canOpenReview: boolean;
	/** Whether the user may publish the approved pinned version. */
	canRetryPublish: boolean;
	/** A retry publish is in flight. */
	isPublishing?: boolean;
}>();

const emit = defineEmits<{
	'open-review': [];
	'submit-changes': [];
	'retry-publish': [];
}>();

const i18n = useI18n();

const isOpen = ref(false);

/** Matches the workflow-version labels used elsewhere in the editor. */
const pinnedVersionLabel = computed(() => props.review?.workflowVersionId?.slice(0, 8) ?? '');

const actorName = computed(() => {
	const actor = props.review?.decisionBy;
	if (!actor) return null;
	return formatUserDisplayName(actor);
});

/**
 * Whether the working copy has moved past the reviewed version. An unknown saved
 * version reads as "in sync": submitting a version we cannot identify would be
 * worse than waiting for the next status sync.
 */
const hasDivergentVersion = computed(() => {
	const pinned = props.review?.workflowVersionId;
	if (!pinned || !props.savedVersionId) return false;
	return props.savedVersionId !== pinned;
});

const status = computed<BannerStatus | null>(() => {
	const review = props.review;
	// A pruned pin (LIGO-879) leaves nothing to name or publish, so stay silent
	// rather than render copy about a version that no longer exists.
	if (!review?.workflowVersionId) return null;

	const version = pinnedVersionLabel.value;

	if (review.state === 'open') {
		if (review.decision === 'changes_requested') {
			const actor = actorName.value;
			return {
				pill: i18n.baseText('workflowReviews.editorBanner.changesRequested.pill'),
				title: i18n.baseText('workflowReviews.editorBanner.changesRequested.title'),
				body: actor
					? i18n.baseText('workflowReviews.editorBanner.changesRequested.body', {
							interpolate: { actor, version },
						})
					: i18n.baseText('workflowReviews.editorBanner.changesRequested.bodyWithoutActor', {
							interpolate: { version },
						}),
				support: i18n.baseText('workflowReviews.editorBanner.changesRequested.support'),
				tone: 'warning',
				action: 'submit-changes',
			};
		}

		if (hasDivergentVersion.value) {
			return {
				pill: i18n.baseText('workflowReviews.editorBanner.pendingStale.pill'),
				title: i18n.baseText('workflowReviews.editorBanner.pendingStale.title'),
				body: i18n.baseText('workflowReviews.editorBanner.pendingStale.body'),
				support: i18n.baseText('workflowReviews.editorBanner.pendingStale.support'),
				tone: 'warning',
				action: 'submit-changes',
			};
		}

		return {
			pill: i18n.baseText('workflowReviews.editorBanner.pending.pill'),
			title: i18n.baseText('workflowReviews.editorBanner.pending.title'),
			body: i18n.baseText('workflowReviews.editorBanner.pending.body', {
				interpolate: { version },
			}),
			support: i18n.baseText('workflowReviews.editorBanner.pending.support'),
			// Nothing is wrong and nothing is expected of the author yet
			tone: 'info',
			// The review already covers the saved version, so there is nothing to submit
			action: null,
		};
	}

	// Closed: only an approved version that never made it to production is
	// actionable. `published`, `superseded` and `unknown` all stay hidden.
	if (
		review.decision === 'approved' &&
		review.approvedVersionPublicationState === 'not_published'
	) {
		return {
			pill: i18n.baseText('workflowReviews.editorBanner.approvedNotPublished.pill'),
			title: i18n.baseText('workflowReviews.editorBanner.approvedNotPublished.title'),
			body: i18n.baseText('workflowReviews.editorBanner.approvedNotPublished.body', {
				interpolate: { version },
			}),
			support: i18n.baseText('workflowReviews.editorBanner.approvedNotPublished.support'),
			tone: 'success',
			action: 'retry-publish',
		};
	}

	return null;
});

/** Nothing to submit while the review already covers the saved version. */
const isSubmitChangesEnabled = computed(() => props.canSubmitChanges && hasDivergentVersion.value);

/**
 * Changes-requested keeps its Submit changes button even in sync, so say why it is
 * disabled — the support copy tells the author to submit. R2 (P3), see LIGO-607_review.md.
 */
const submitChangesHint = computed(() =>
	props.canSubmitChanges && !hasDivergentVersion.value
		? i18n.baseText('workflowReviews.editorBanner.submitChanges.savedVersionHint')
		: '',
);

const isRetryPublishEnabled = computed(() => props.canRetryPublish && !props.isPublishing);

/** A popover with no action left is still worth showing for its copy. */
const hasActions = computed(() => props.canOpenReview || !!status.value?.action);

/** Acting on the review always dismisses the popover first. */
const onOpenReview = () => {
	isOpen.value = false;
	emit('open-review');
};

const onSubmitChanges = () => {
	isOpen.value = false;
	emit('submit-changes');
};

const onRetryPublish = () => {
	isOpen.value = false;
	emit('retry-publish');
};
</script>

<template>
	<N8nPopover
		v-if="status"
		v-model:open="isOpen"
		side="bottom"
		align="end"
		width="360px"
		:enable-scrolling="false"
		:content-class="$style.popover"
	>
		<template #trigger>
			<button
				type="button"
				:class="[$style.pill, $style[status.tone]]"
				data-test-id="workflow-review-status-pill"
			>
				{{ status.pill }}
			</button>
		</template>
		<template #content>
			<div :class="$style.content" data-test-id="workflow-review-status-popover">
				<N8nHeading tag="h3" size="small" bold>{{ status.title }}</N8nHeading>
				<N8nText tag="p" size="small">{{ status.body }}</N8nText>
				<N8nText tag="p" size="small">{{ status.support }}</N8nText>
				<div v-if="hasActions" :class="$style.actions">
					<N8nButton
						v-if="canOpenReview"
						variant="outline"
						size="small"
						data-test-id="workflow-review-open-review-button"
						@click="onOpenReview"
					>
						{{ i18n.baseText('workflowReviews.editorBanner.openReview') }}
					</N8nButton>
					<N8nTooltip
						v-if="status.action === 'submit-changes'"
						:disabled="!submitChangesHint"
						:content="submitChangesHint"
						:show-after="300"
					>
						<N8nButton
							size="small"
							:disabled="!isSubmitChangesEnabled"
							data-test-id="workflow-review-submit-changes-button"
							@click="onSubmitChanges"
						>
							{{ i18n.baseText('workflowReviews.editorBanner.submitChanges') }}
						</N8nButton>
					</N8nTooltip>
					<N8nButton
						v-else-if="status.action === 'retry-publish'"
						size="small"
						:loading="isPublishing"
						:disabled="!isRetryPublishEnabled"
						data-test-id="workflow-review-retry-publish-button"
						@click="onRetryPublish"
					>
						{{ i18n.baseText('workflowReviews.editorBanner.retryPublish') }}
					</N8nButton>
				</div>
			</div>
		</template>
	</N8nPopover>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/focus';

.pill {
	display: inline-flex;
	align-items: center;
	padding: var(--spacing--5xs) var(--spacing--3xs);
	// Transparent at rest to match the design, revealed on hover as the affordance
	border: var(--border-width, 1px) var(--border-style, solid) transparent;
	border-radius: var(--radius--3xs);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--medium);
	line-height: var(--line-height--md);
	white-space: nowrap;
	cursor: pointer;

	&:focus-visible {
		@include focus.focus-ring;
	}
}

.info {
	background-color: var(--background--info);
	color: var(--text-color--info);

	&:hover {
		border-color: var(--border-color--info);
	}
}

.warning {
	background-color: var(--background--warning);
	color: var(--text-color--warning);

	&:hover {
		border-color: var(--border-color--warning);
	}
}

.success {
	background-color: var(--background--success);
	color: var(--text-color--success);

	&:hover {
		border-color: var(--border-color--success);
	}
}

.popover {
	padding: var(--spacing--xs);
}

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.actions {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
}
</style>
