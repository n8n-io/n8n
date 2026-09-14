<script setup lang="ts">
import type { AgentBackgroundJobSignal } from '@n8n/api-types';
import { N8nAiActivityStep, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { BACKGROUND_JOB_STATUS_LABEL_KEYS } from '../utils/background-job-labels';

const props = defineProps<{ signal: AgentBackgroundJobSignal }>();
const i18n = useI18n();
</script>

<template>
	<N8nAiActivityStep
		:label="i18n.baseText('agents.chat.backgroundTasks.resultsReceived')"
		wrap-content
		data-testid="agent-chat-background-job-signal"
	>
		<ul :class="$style.jobs">
			<li v-for="job in props.signal.tasks" :key="job.id" :class="$style.job">
				<N8nText size="small" color="text-dark" :class="$style.title">{{ job.title }}</N8nText>
				<span :class="$style.outcome">
					<N8nIcon
						:icon="job.status === 'completed' ? 'circle-check' : 'circle-x'"
						:class="$style.statusIcon"
						:data-status="job.status"
						size="small"
					/>
					<N8nText size="small" color="text-base">{{
						i18n.baseText(BACKGROUND_JOB_STATUS_LABEL_KEYS[job.status])
					}}</N8nText>
				</span>
			</li>
		</ul>
	</N8nAiActivityStep>
</template>

<style module lang="scss">
@use '@n8n/design-system/css/mixins/motion';

.jobs {
	list-style: none;
	margin: 0;
	padding: var(--spacing--2xs);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.job {
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
