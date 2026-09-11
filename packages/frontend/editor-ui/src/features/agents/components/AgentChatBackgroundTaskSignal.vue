<script setup lang="ts">
import type { AgentBackgroundTaskSignal } from '@n8n/api-types';
import { N8nAiActivityStep, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

const props = defineProps<{ signal: AgentBackgroundTaskSignal }>();
const i18n = useI18n();

const statusLabels = {
	completed: 'agents.chat.backgroundTasks.status.completed',
	failed: 'agents.chat.backgroundTasks.status.failed',
	cancelled: 'agents.chat.backgroundTasks.status.cancelled',
} as const;
</script>

<template>
	<N8nAiActivityStep
		:label="i18n.baseText('agents.chat.backgroundTasks.resultsReceived')"
		wrap-content
		data-testid="agent-chat-background-task-signal"
	>
		<ul :class="$style.tasks">
			<li v-for="task in props.signal.tasks" :key="task.id" :class="$style.task">
				<N8nText size="small" color="text-dark" :class="$style.title">{{ task.title }}</N8nText>
				<N8nText size="small" color="text-base">{{
					i18n.baseText(statusLabels[task.status])
				}}</N8nText>
			</li>
		</ul>
	</N8nAiActivityStep>
</template>

<style module lang="scss">
.tasks {
	list-style: none;
	margin: 0;
	padding: var(--spacing--2xs);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.task {
	display: grid;
	grid-template-columns: minmax(0, 1fr) auto;
	gap: var(--spacing--sm);
}

.title {
	overflow-wrap: anywhere;
}
</style>
