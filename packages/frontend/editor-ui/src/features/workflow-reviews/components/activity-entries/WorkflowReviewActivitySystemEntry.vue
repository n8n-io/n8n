<script setup lang="ts">
import type { WorkflowReviewActivityEntry, WorkflowReviewClosedReason } from '@n8n/api-types';
import { N8nAvatar, N8nText } from '@n8n/design-system';
import { type BaseTextKey, useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import TimeAgo from '@/app/components/TimeAgo.vue';

import { formatUserDisplayName } from '../../formatUserDisplayName';
import WorkflowReviewActivityFallback from './WorkflowReviewActivityFallback.vue';

const props = defineProps<{
	entry: Extract<
		WorkflowReviewActivityEntry,
		{
			type:
				| 'review.opened'
				| 'review.changes_requested'
				| 'review.approved'
				| 'review.version_updated'
				| 'review.closed';
		}
	>;
}>();

const i18n = useI18n();

const closedReasonKeys: Record<WorkflowReviewClosedReason, BaseTextKey> = {
	'workflow-archived': 'workflowReviews.detail.activity.closed.archived',
	'workflow-moved': 'workflowReviews.detail.activity.closed.moved',
	'workflow-deleted': 'workflowReviews.detail.activity.closed.deleted',
};

/**
 * `null` for the two types whose payload the sentence cannot do without: `review.closed`,
 * whose sentence *is* the stored reason, and `review.changes_requested`, where a note is
 * required on the way in, so a missing one means the payload did not parse. The rest say
 * what happened from the type alone.
 */
const content = computed<{ text: string; note: string | null; testId: string } | null>(() => {
	const entry = props.entry;
	switch (entry.type) {
		case 'review.opened':
			return {
				text: i18n.baseText('workflowReviews.detail.activity.opened'),
				note: null,
				testId: 'workflow-review-activity-opened',
			};
		case 'review.changes_requested':
			if (!entry.data) return null;
			return {
				text: i18n.baseText('workflowReviews.detail.activity.changesRequested'),
				note: entry.data.note,
				testId: 'workflow-review-activity-changes-requested',
			};
		case 'review.approved':
			return {
				text: i18n.baseText('workflowReviews.detail.activity.approved'),
				note: entry.data?.note ?? null,
				testId: 'workflow-review-activity-approved',
			};
		case 'review.version_updated':
			return {
				text: i18n.baseText('workflowReviews.detail.activity.versionUpdated'),
				note: null,
				testId: 'workflow-review-activity-version-updated',
			};
		case 'review.closed':
			if (!entry.data) return null;
			return {
				text: i18n.baseText(closedReasonKeys[entry.data.reason]),
				note: null,
				testId: 'workflow-review-activity-closed',
			};
	}
});

// Branches on the type, not on a missing actor: `createdBy` is also null for a decision
// whose author was deleted, which must still read as that person's decision.
const hasActor = computed(() => props.entry.type !== 'review.closed');

const actorName = computed(() =>
	props.entry.createdBy
		? formatUserDisplayName(props.entry.createdBy)
		: i18n.baseText('workflowReviews.detail.activity.unknownAuthor'),
);
</script>

<template>
	<div v-if="content" :class="[$style.entry, content.note && $style.boxed]">
		<N8nAvatar
			v-if="hasActor"
			size="xxsmall"
			:first-name="entry.createdBy?.firstName"
			:last-name="entry.createdBy?.lastName"
		/>
		<!-- Column beside the avatar, as in the comment entry, so a note lines up with the
			sentence above it instead of starting back at the avatar. -->
		<div :class="$style.content">
			<div :class="$style.headline">
				<N8nText
					v-if="hasActor"
					size="medium"
					color="text-base"
					:class="$style.line"
					data-test-id="workflow-review-activity-actor"
				>
					{{ actorName }}
					<!-- Inside the name so it disappears with it, rather than leaving a dangling
						separator on the actorless entries. -->
					<span aria-hidden="true" :class="$style.separator">|</span>
				</N8nText>
				<!-- One phrase in one colour ("Requested changes 2 hours ago"). The design sets the
					time at body size; we render it a step down by preference, colour unchanged. -->
				<N8nText
					size="medium"
					color="text-base"
					:class="$style.line"
					:data-test-id="content.testId"
				>
					{{ content.text }}
				</N8nText>
				<N8nText size="small" color="text-base" :class="$style.line">
					<time :datetime="entry.createdAt">
						<TimeAgo :date="entry.createdAt" />
					</time>
				</N8nText>
			</div>
			<N8nText
				v-if="content.note"
				size="medium"
				color="text-light"
				:class="[$style.body, $style.line]"
				data-test-id="workflow-review-activity-note"
			>
				{{ content.note }}
			</N8nText>
		</div>
	</div>
	<WorkflowReviewActivityFallback v-else />
</template>

<style lang="scss" module>
.entry {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--2xs);
}

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	min-width: 0;
}

/* A word's worth of gap, so the sentence and its timestamp read as one phrase. The
	separator carries its own wider spacing. */
.headline {
	display: flex;
	align-items: baseline;
	gap: var(--spacing--4xs);
	flex-wrap: wrap;
}

.separator {
	margin-inline: var(--spacing--3xs);
}

/* A decision that carries a note sits in a card, as a comment always does. Keep in step with
	`.entry` in WorkflowReviewActivityComment.vue. Pulled out by the list's own inset so the
	avatars stay in one column with the unboxed entries above and below. */
.boxed {
	margin-inline: calc(-1 * var(--spacing--sm));
	padding: var(--spacing--xs) var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius--2xs);
}

/* Figma asks for 20px on 14px text; no line-height token gives that ratio. */
.line {
	line-height: 20px;
}

.body {
	white-space: pre-wrap;
	overflow-wrap: anywhere;
}
</style>
