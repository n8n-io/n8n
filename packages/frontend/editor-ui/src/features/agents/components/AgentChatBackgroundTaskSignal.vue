<script setup lang="ts">
import type { AgentBackgroundTaskSignal } from '@n8n/api-types';
import { N8nAiActivityStep, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { BACKGROUND_TASK_STATUS_LABEL_KEYS } from '../utils/background-task-labels';

const props = defineProps<{ signal: AgentBackgroundTaskSignal }>();
const i18n = useI18n();
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
				<span :class="$style.outcome">
					<N8nIcon
						:icon="task.status === 'completed' ? 'circle-check' : 'circle-x'"
						:class="$style.statusIcon"
						:data-status="task.status"
						size="small"
					/>
					<N8nText size="small" color="text-base">{{
						i18n.baseText(BACKGROUND_TASK_STATUS_LABEL_KEYS[task.status])
					}}</N8nText>
				</span>
			</li>
		</ul>
	</N8nAiActivityStep>
</template>

<style module lang="scss">
@use '@n8n/design-system/css/mixins/motion';

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

.outcome {
	display: inline-flex;
	align-items: center;
	align-self: start;
	gap: var(--spacing--3xs);
}

.statusIcon {
	flex-shrink: 0;
	color: var(--color--foreground--shade-2);

	&[data-status='completed'] {
		color: var(--color--success);
		@include motion.fade-in;
	}

	&[data-status='failed'] {
		color: var(--color--danger);
	}
}
</style>
