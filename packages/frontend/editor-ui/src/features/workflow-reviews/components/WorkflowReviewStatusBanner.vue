<script setup lang="ts">
import type { WorkflowReviewRequestForWorkflow } from '@n8n/api-types';
import { N8nButton, N8nHeading, N8nPopover, N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';

import { getVersionLabel } from '@/features/workflows/workflowHistory/utils';

import { formatUserDisplayName } from '../workflowReviews.utils';

type BannerAction = 'submit-changes';

/**
 * `info` while the review is simply in progress, `warning` once the author has
 * something to do — matching how the design system uses these semantic colors
 * elsewhere.
 */
type BannerTone = 'info' | 'warning';

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
	/** Why publishing is blocked, or '' when it is not. Mirrors the Publish tooltip. */
	submitBlockedReason?: string;
	/**
	 * Whether the user may open the review detail — the backend-computed
	 * `viewerCanOpen`, never a permission approximation.
	 */
	canOpenReview: boolean;
}>();

const emit = defineEmits<{
	'open-review': [];
	'submit-changes': [];
}>();

const i18n = useI18n();

const isOpen = ref(false);

const pinnedVersionLabel = computed(() => {
	const review = props.review;
	if (!review?.workflowVersionId) return '';

	return getVersionLabel({
		workflowHistory: { versionId: review.workflowVersionId, name: review.workflowVersionName },
	});
});

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
	if (!review?.workflowVersionId) return null;

	const version = pinnedVersionLabel.value;

	if (review.state === 'open') {
		if (review.decision === 'changes_requested') {
			const actor = actorName.value;
			return {
				pill: hasDivergentVersion.value
					? i18n.baseText('workflowReviews.editorBanner.pendingStale.pill')
					: i18n.baseText('workflowReviews.editorBanner.changesRequested.pill'),
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

	// Closed reviews render nothing: approval hands recovery to the regular
	// Publish button, and any other close needs no canvas presence.
	return null;
});

/** Nothing to submit while the review already covers the saved version. */
const isSubmitChangesEnabled = computed(() => props.canSubmitChanges && hasDivergentVersion.value);

const submitChangesHint = computed(() => {
	if (props.submitBlockedReason) return props.submitBlockedReason;

	return props.canSubmitChanges && !hasDivergentVersion.value
		? i18n.baseText('workflowReviews.editorBanner.submitChanges.savedVersionHint')
		: '';
});

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
