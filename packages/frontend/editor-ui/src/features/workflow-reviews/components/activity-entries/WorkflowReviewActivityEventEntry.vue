<script setup lang="ts">
import type { WorkflowReviewActivityEntry, WorkflowReviewClosedReason } from '@n8n/api-types';
import { N8nCallout, N8nIcon, N8nText } from '@n8n/design-system';
import { type BaseTextKey, useI18n } from '@n8n/i18n';
import { computed, inject } from 'vue';
import { I18nT } from 'vue-i18n';

import TimeAgo from '@/app/components/TimeAgo.vue';
import { getVersionLabel } from '@/features/workflows/workflowHistory/utils';

import { ReviewLinkedWorkflowsKey, type ReviewLinkedWorkflowContext } from '../../constants';
import { formatActorName } from '../../workflowReviews.utils';
import WorkflowReviewActivityActorAvatar from './WorkflowReviewActivityActorAvatar.vue';
import WorkflowReviewActivityFallback from './WorkflowReviewActivityFallback.vue';
import WorkflowReviewActivityWorkflowLink from './WorkflowReviewActivityWorkflowLink.vue';

const props = defineProps<{
	entry: Extract<
		WorkflowReviewActivityEntry,
		{
			type:
				| 'review.opened'
				| 'review.changes_requested'
				| 'review.approved'
				| 'review.version_updated'
				| 'review.closed'
				| 'workflow.archived'
				| 'workflow.deleted'
				| 'workflow.moved'
				| 'workflow.published';
		}
	>;
}>();

const i18n = useI18n();

const linkedWorkflows = inject(
	ReviewLinkedWorkflowsKey,
	computed(() => new Map<string, ReviewLinkedWorkflowContext>()),
);

const closedReasonKeys: Record<WorkflowReviewClosedReason, BaseTextKey> = {
	'no-reviewable-workflows': 'workflowReviews.detail.closedCallout.noReviewableWorkflows',
};

/**
 * A lifecycle close concludes the feed, so it renders as a callout rather than one more
 * sentence. The body is a keypath, and the stored reason, so there is nothing to fall back to.
 */
const closedCallout = computed<{ title: string; bodyKey: BaseTextKey } | null>(() => {
	const entry = props.entry;
	if (entry.type !== 'review.closed' || !entry.data) return null;
	return {
		title: i18n.baseText('workflowReviews.detail.closedCallout.title'),
		bodyKey: closedReasonKeys[entry.data.reason],
	};
});

// A cause event's sentence names the actor when a user acted, or says the system did it.
const causeKeys: Record<
	'workflow.archived' | 'workflow.deleted' | 'workflow.moved',
	{
		user: BaseTextKey;
		userNamed: BaseTextKey;
		system: BaseTextKey;
		systemNamed: BaseTextKey;
		testId: string;
	}
> = {
	'workflow.archived': {
		user: 'workflowReviews.detail.activity.workflowArchived.user',
		userNamed: 'workflowReviews.detail.activity.workflowArchived.user.named',
		system: 'workflowReviews.detail.activity.workflowArchived.system',
		systemNamed: 'workflowReviews.detail.activity.workflowArchived.system.named',
		testId: 'workflow-review-activity-workflow-archived',
	},
	'workflow.deleted': {
		user: 'workflowReviews.detail.activity.workflowDeleted.user',
		userNamed: 'workflowReviews.detail.activity.workflowDeleted.user.named',
		system: 'workflowReviews.detail.activity.workflowDeleted.system',
		systemNamed: 'workflowReviews.detail.activity.workflowDeleted.system.named',
		testId: 'workflow-review-activity-workflow-deleted',
	},
	'workflow.moved': {
		user: 'workflowReviews.detail.activity.workflowMoved.user',
		userNamed: 'workflowReviews.detail.activity.workflowMoved.user.named',
		system: 'workflowReviews.detail.activity.workflowMoved.system',
		systemNamed: 'workflowReviews.detail.activity.workflowMoved.system.named',
		testId: 'workflow-review-activity-workflow-moved',
	},
};

/**
 * The sentence for one entry: an i18n key plus its placeholder values, one case per type.
 * `null` means "no sentence" — `review.closed` renders as a callout instead, and a
 * `workflow.published` entry with an unreadable payload has nothing to say. Other types
 * survive a bad payload with a reduced sentence: a decision loses its note, a cause event
 * its actor.
 *
 * `workflow` is set only when the workflow still exists. It picks the message variant that
 * names the workflow, rendered as a link.
 *
 * `namesActor` comes from the entry itself, never from `createdBy` — that is also null for
 * deleted users, whose actions must still read as a person's.
 */
const content = computed<{
	key: BaseTextKey;
	workflow?: { id: string; name: string };
	version?: string;
	note: string | null;
	testId: string;
	namesActor: boolean;
} | null>(() => {
	const entry = props.entry;
	// Read-time lookup shared by every sentence that may name a workflow
	const workflowId = entry.data && 'workflowId' in entry.data ? entry.data.workflowId : null;
	const linked = workflowId === null ? undefined : linkedWorkflows.value.get(workflowId);
	const workflow =
		workflowId !== null && linked ? { id: workflowId, name: linked.workflowName } : undefined;

	switch (entry.type) {
		case 'review.opened':
			return {
				key: 'workflowReviews.detail.activity.opened',
				note: null,
				testId: 'workflow-review-activity-opened',
				namesActor: true,
			};
		case 'review.changes_requested':
			return {
				key: 'workflowReviews.detail.activity.changesRequested',
				note: entry.data?.note ?? null,
				testId: 'workflow-review-activity-changes-requested',
				namesActor: true,
			};
		case 'review.approved':
			return {
				key: 'workflowReviews.detail.activity.approved',
				note: entry.data?.note ?? null,
				testId: 'workflow-review-activity-approved',
				namesActor: true,
			};
		case 'review.version_updated':
			return {
				key: workflow
					? 'workflowReviews.detail.activity.versionUpdated.named'
					: 'workflowReviews.detail.activity.versionUpdated',
				workflow,
				note: null,
				testId: 'workflow-review-activity-version-updated',
				namesActor: true,
			};
		case 'review.closed':
			// Rendered as {@link closedCallout}, never as a sentence.
			return null;
		case 'workflow.archived':
		case 'workflow.deleted':
		case 'workflow.moved': {
			const keys = causeKeys[entry.type];
			const namesActor = entry.data?.actorKind === 'user';
			return {
				key: namesActor
					? workflow
						? keys.userNamed
						: keys.user
					: workflow
						? keys.systemNamed
						: keys.system,
				workflow,
				note: null,
				testId: keys.testId,
				namesActor,
			};
		}
		case 'workflow.published': {
			if (!entry.data) return null;
			const versionName =
				linked?.pinnedVersionId === entry.data.workflowVersionId ? linked.pinnedVersionName : null;
			return {
				key: workflow
					? 'workflowReviews.detail.activity.workflowPublished'
					: 'workflowReviews.detail.activity.workflowPublished.unknownWorkflow',
				workflow,
				// The shared version-label convention: user-given name, id-derived fallback.
				version: getVersionLabel({
					workflowHistory: { versionId: entry.data.workflowVersionId, name: versionName },
				}),
				note: null,
				testId: 'workflow-review-activity-workflow-published',
				namesActor: true,
			};
		}
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
	<N8nCallout
		v-if="closedCallout"
		theme="secondary"
		:class="$style.closedCallout"
		data-test-id="workflow-review-activity-closed"
	>
		<div :class="$style.closedCalloutContent">
			<N8nText bold size="medium">{{ closedCallout.title }}</N8nText>
			<N8nText size="medium">
				<I18nT :keypath="closedCallout.bodyKey" scope="global">
					<template #timestamp>
						<time :datetime="entry.createdAt">
							<TimeAgo :date="entry.createdAt" />
						</time>
					</template>
				</I18nT>
			</N8nText>
		</div>
	</N8nCallout>
	<div v-else-if="content" :class="[$style.entry, content.note && $style.boxed]">
		<WorkflowReviewActivityActorAvatar v-if="content.namesActor" :actor="entry.createdBy" />
		<!-- Fills the avatar's column, so an actorless (system) sentence stays in line -->
		<div
			v-else
			:class="$style.systemIcon"
			aria-hidden="true"
			data-test-id="workflow-review-activity-system-icon"
		>
			<N8nIcon icon="info" :size="16" color="text-light" />
		</div>
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
					<I18nT :keypath="content.key" scope="global">
						<template v-if="content.workflow" #workflowName>
							<WorkflowReviewActivityWorkflowLink
								:workflow-id="content.workflow.id"
								:workflow-name="content.workflow.name"
							/>
						</template>
						<template v-if="content.version" #version>{{ content.version }}</template>
					</I18nT>
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

.systemIcon {
	@include activity-avatar;

	display: flex;
	width: var(--review-activity--avatar-size);
	height: var(--review-activity--avatar-size);
	align-items: center;
	justify-content: center;
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

/* line up the callout's edges line up with the comment cards */
.closedCallout {
	margin-inline: calc(-1 * var(--spacing--sm));
}

.closedCalloutContent {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
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
