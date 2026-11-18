<script setup lang="ts">
import type { TaskBoardComment } from '@n8n/api-types';
import { N8nBadge, N8nMarkdown, N8nText, N8nTimeAgo } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import TaskActor from '../../../TaskActor/TaskActor.vue';

defineProps<{ comment: TaskBoardComment }>();
const i18n = useI18n();
</script>

<template>
	<article :class="$style.comment" data-test-id="task-board-comment">
		<header :class="$style.header">
			<TaskActor :actor="comment.author" size="small" />
			<N8nBadge v-if="comment.author.type !== 'user'" variant="subtle" size="xsmall">
				{{ i18n.baseText(`taskBoard.actor.${comment.author.type}`) }}
			</N8nBadge>
			<N8nText size="xsmall" color="text-light" :class="$style.time">
				<N8nTimeAgo :date="comment.createdAt" />
			</N8nText>
		</header>
		<N8nMarkdown :content="comment.body" :class="$style.body" />
	</article>
</template>

<style lang="scss" module>
.comment {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.time {
	margin-left: auto;
	white-space: nowrap;
}

.body {
	padding-left: var(--spacing--xl);
	overflow-wrap: anywhere;
}
</style>
