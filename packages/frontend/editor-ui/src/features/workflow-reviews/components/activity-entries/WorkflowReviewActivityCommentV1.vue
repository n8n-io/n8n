<script setup lang="ts">
import type { WorkflowReviewActivityEntry, WorkflowReviewActivityMessage } from '@n8n/api-types';
import { N8nAvatar, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import TimeAgo from '@/app/components/TimeAgo.vue';

defineProps<{
	entry: Extract<WorkflowReviewActivityEntry, { type: 'comment.created' }>;
}>();

const i18n = useI18n();

function authorName(message: WorkflowReviewActivityMessage): string {
	if (!message.createdBy) {
		return i18n.baseText('workflowReviews.detail.activity.unknownAuthor');
	}
	const { firstName, lastName, email } = message.createdBy;
	return [firstName, lastName].filter(Boolean).join(' ') || email;
}
</script>

<template>
	<div :class="$style.entry">
		<div v-for="message in entry.messages" :key="message.id" :class="$style.message">
			<N8nAvatar
				size="small"
				:first-name="message.createdBy?.firstName"
				:last-name="message.createdBy?.lastName"
			/>
			<div :class="$style.content">
				<div :class="$style.header">
					<N8nText bold size="small" data-test-id="workflow-review-activity-comment-author">
						{{ authorName(message) }}
					</N8nText>
					<N8nText size="xsmall" color="text-light">
						<time
							:datetime="message.createdAt"
							data-test-id="workflow-review-activity-comment-time"
						>
							<TimeAgo :date="message.createdAt" />
						</time>
					</N8nText>
				</div>
				<!-- Keys on `deletedAt`, not on a null body: only a deletion is a tombstone. -->
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
					size="small"
					:class="$style.body"
					data-test-id="workflow-review-activity-comment-body"
				>
					{{ message.body }}
				</N8nText>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.entry {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.message {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--2xs);
}

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	min-width: 0;
}

.header {
	display: flex;
	align-items: baseline;
	gap: var(--spacing--2xs);
}

.body {
	white-space: pre-wrap;
	overflow-wrap: anywhere;
}

.deleted {
	font-style: italic;
}
</style>
