<script setup lang="ts">
import type { WorkflowReviewActivityEntry, WorkflowReviewClosedReason } from '@n8n/api-types';
import { N8nAvatar, N8nText } from '@n8n/design-system';
import { type BaseTextKey, useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import TimeAgo from '@/app/components/TimeAgo.vue';

import { formatActorName } from '../../workflowReviews.utils';
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
 * Everything that varies by type, so a new type is one case rather than several. `null` only for
 * `review.closed`, whose sentence *is* the stored reason and so has nothing to fall back to. The
 * rest say what happened from the type alone, and an unreadable payload costs them only the note.
 *
 * `namesActor` follows the type, not a missing `createdBy`: that is also null for a decision
 * whose author was deleted, which must still read as that person's decision.
 */
const content = computed<{
	text: string;
	note: string | null;
	testId: string;
	namesActor: boolean;
} | null>(() => {
	const entry = props.entry;
	switch (entry.type) {
		case 'review.opened':
			return {
				text: i18n.baseText('workflowReviews.detail.activity.opened'),
				note: null,
				testId: 'workflow-review-activity-opened',
				namesActor: true,
			};
		case 'review.changes_requested':
			return {
				text: i18n.baseText('workflowReviews.detail.activity.changesRequested'),
				note: entry.data?.note ?? null,
				testId: 'workflow-review-activity-changes-requested',
				namesActor: true,
			};
		case 'review.approved':
			return {
				text: i18n.baseText('workflowReviews.detail.activity.approved'),
				note: entry.data?.note ?? null,
				testId: 'workflow-review-activity-approved',
				namesActor: true,
			};
		case 'review.version_updated':
			return {
				text: i18n.baseText('workflowReviews.detail.activity.versionUpdated'),
				note: null,
				testId: 'workflow-review-activity-version-updated',
				namesActor: true,
			};
		case 'review.closed':
			if (!entry.data) return null;
			return {
				text: i18n.baseText(closedReasonKeys[entry.data.reason]),
				note: null,
				testId: 'workflow-review-activity-closed',
				namesActor: false,
			};
	}
});

const actorName = computed(() =>
	formatActorName(
		props.entry.createdBy,
		i18n.baseText('workflowReviews.detail.activity.unknownAuthor'),
	),
);
</script>

<template>
	<div v-if="content" :class="[$style.entry, content.note && $style.boxed]">
		<N8nAvatar
			v-if="content.namesActor"
			size="xxsmall"
			:class="$style.avatar"
			:first-name="entry.createdBy?.firstName"
			:last-name="entry.createdBy?.lastName"
		/>
		<!-- Holds the avatar's column open, so an actorless sentence stays in line with its
			neighbours and the timeline above it does not end over its first word. -->
		<div v-else :class="$style.avatarSpacer" />
		<!-- Column beside the avatar, as in the comment entry, so a note lines up with the
			sentence above it instead of starting back at the avatar. -->
		<div :class="$style.content">
			<div :class="$style.headline">
				<N8nText
					v-if="content.namesActor"
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
				<N8nText
					size="medium"
					color="text-base"
					:class="$style.line"
					:data-test-id="content.testId"
				>
					{{ content.text }}
				</N8nText>
				<N8nText size="small" color="text-light" :class="[$style.line, $style.timeStamp]">
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
@use '../activity-card' as *;

.entry {
	@include activity-row;
}

.avatar {
	@include activity-avatar;
}

.avatarSpacer {
	flex-shrink: 0;
	width: var(--review-activity--avatar-size);
}

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	min-width: 0;
}

/* The separator carries its own wider spacing. */
.headline {
	@include activity-headline;
}

.separator {
	margin-inline: var(--spacing--3xs);
}

.timeStamp {
	padding-left: var(--spacing--3xs);
}

/* A decision that carries a note sits in a card, as a comment always does. */
.boxed {
	@include activity-card;
}

/* The same line the avatar beside it is centred on, so the two cannot drift apart. */
.line {
	line-height: var(--review-activity--line-height);
}

.body {
	white-space: pre-wrap;
	overflow-wrap: anywhere;
}
</style>
