<script setup lang="ts">
import type { WorkflowReviewActivityEntry, WorkflowReviewActivityMessage } from '@n8n/api-types';
import { N8nAvatar, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import TimeAgo from '@/app/components/TimeAgo.vue';

import { formatUserDisplayName } from '../../formatUserDisplayName';

defineProps<{
	entry: Extract<WorkflowReviewActivityEntry, { type: 'comment.created' }>;
}>();

const i18n = useI18n();

function authorName(message: WorkflowReviewActivityMessage): string {
	return message.createdBy
		? formatUserDisplayName(message.createdBy)
		: i18n.baseText('workflowReviews.detail.activity.unknownAuthor');
}
</script>

<template>
	<div :class="$style.entry">
		<div v-for="message in entry.messages" :key="message.id" :class="$style.message">
			<N8nAvatar
				size="xxsmall"
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
/* A comment is prose, so it gets the same card as a decision that carries a note. Keep in
	step with `.boxed` in WorkflowReviewActivitySystemEntry.vue. The negative margin cancels
	the list's inset so the avatars stay in one column with the unboxed entries. */
.entry {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	margin-inline: calc(-1 * var(--spacing--sm));
	padding: var(--spacing--xs) var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius);
}

.message {
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

.header {
	display: flex;
	align-items: baseline;
	gap: var(--spacing--2xs);
}

/* Figma asks for 20px on 14px text; no line-height token gives that ratio. */
.line {
	line-height: 20px;
}

.body {
	white-space: pre-wrap;
	overflow-wrap: anywhere;
}

.deleted {
	font-style: italic;
}
</style>
