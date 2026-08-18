<script setup lang="ts">
import type { WorkflowReviewActivityEntry, WorkflowReviewActivityMessage } from '@n8n/api-types';
import { N8nAvatar, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import TimeAgo from '@/app/components/TimeAgo.vue';

import { formatActorName } from '../../workflowReviews.utils';

defineProps<{
	entry: Extract<WorkflowReviewActivityEntry, { type: 'comment.created' }>;
}>();

const i18n = useI18n();

function authorName(message: WorkflowReviewActivityMessage): string {
	return formatActorName(
		message.createdBy,
		i18n.baseText('workflowReviews.detail.activity.unknownAuthor'),
	);
}
</script>

<template>
	<div :class="$style.entry">
		<div v-for="message in entry.messages" :key="message.id" :class="$style.message">
			<N8nAvatar
				size="xxsmall"
				:class="$style.avatar"
				:first-name="message.createdBy?.firstName"
				:last-name="message.createdBy?.lastName"
			/>
			<div :class="$style.content">
				<div :class="$style.header">
					<N8nText
						size="medium"
						color="text-base"
						:class="$style.line"
						data-test-id="workflow-review-activity-comment-author"
					>
						{{ authorName(message) }}
					</N8nText>
					<N8nText size="small" color="text-light">
						<time
							:datetime="message.createdAt"
							data-test-id="workflow-review-activity-comment-time"
							:class="$style.timeStamp"
						>
							<TimeAgo :date="message.createdAt" />
						</time>
					</N8nText>
				</div>
				<N8nText
					v-if="message.deletedAt"
					size="small"
					color="text-light"
					:class="$style.deleted"
					data-test-id="workflow-review-activity-comment-deleted"
				>
					{{ i18n.baseText('workflowReviews.detail.activity.comment.deleted') }}
				</N8nText>
				<N8nText
					v-else
					size="medium"
					color="text-light"
					:class="[$style.body, $style.line]"
					data-test-id="workflow-review-activity-comment-body"
				>
					{{ message.body }}
				</N8nText>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
@use '../activity-card' as *;

/* A comment is prose, so it gets the same card as a decision that carries a note. */
.entry {
	@include activity-card;

	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.message {
	@include activity-row;
}

.avatar {
	@include activity-avatar;
}

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	min-width: 0;
}

.header {
	@include activity-headline;
}

.line {
	line-height: var(--review-activity--line-height);
}

.timeStamp {
	padding-left: var(--spacing--3xs);
}

.body {
	white-space: pre-wrap;
	overflow-wrap: anywhere;
}

.deleted {
	font-style: italic;
}
</style>
