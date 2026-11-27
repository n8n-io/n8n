<script setup lang="ts">
import type { AgentConfigValidationIssue } from '@n8n/api-types';
import { N8nButton, N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import AgentValidationTooltip from './AgentValidationTooltip.vue';

defineProps<{
	/** Why Preview cannot open now. Run again is disabled while it is set. */
	runAgainDisabledReason?: string;
	/** The problems that keep the agent from running, as the Test button lists them. */
	runAgainValidationIssues?: AgentConfigValidationIssue[];
}>();

const emit = defineEmits<{ 'run-again': []; chat: [] }>();
const locale = useI18n();
</script>

<template>
	<div :class="$style.notice" role="status" data-testid="agent-schedule-test-notice">
		<p :class="$style.text">
			<N8nIcon icon="calendar" size="small" aria-hidden="true" />
			{{ locale.baseText('agents.chat.scheduleTest.notice') }}
		</p>
		<div :class="$style.actions">
			<N8nButton
				variant="ghost"
				size="small"
				data-testid="agent-schedule-test-chat"
				data-attr="agent-schedule-test-chat"
				@click="emit('chat')"
			>
				{{ locale.baseText('agents.chat.scheduleTest.chat') }}
			</N8nButton>
			<AgentValidationTooltip
				:disabled="!runAgainDisabledReason"
				:fallback="runAgainDisabledReason ?? ''"
				action="preview"
				:issues="runAgainValidationIssues"
			>
				<N8nButton
					variant="outline"
					size="small"
					icon="flask-conical"
					:disabled="!!runAgainDisabledReason"
					focusable-when-disabled
					data-testid="agent-schedule-test-run-again"
					data-attr="agent-schedule-test-run-again"
					@click="emit('run-again')"
				>
					{{ locale.baseText('agents.chat.scheduleTest.runAgain') }}
				</N8nButton>
			</AgentValidationTooltip>
		</div>
	</div>
</template>

<style lang="scss" module>
.notice {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs) var(--spacing--xs);
	padding: var(--spacing--2xs) var(--spacing--xs);
	border: var(--border);
	border-radius: var(--radius--lg);
	background-color: var(--background--surface);
}

.text {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	margin: 0;
	color: var(--text-color--subtle);
	font-size: var(--font-size--sm);
}

.actions {
	display: flex;
	gap: var(--spacing--3xs);
}
</style>
