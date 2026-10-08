<script setup lang="ts">
/**
 * A fix the judge proposed for a failed check: one instruction to add to the
 * agent. "Apply suggestion" hands it to the parent, which rewrites the agent's
 * instructions and reruns the check. "Keep as is" only hides the card.
 */
import { N8nButton, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

defineProps<{
	suggestion: string;
	/** True from "Apply suggestion" until the rewrite and rerun settle. */
	applying?: boolean;
	disabled?: boolean;
	testId?: string;
}>();

const emit = defineEmits<{
	apply: [];
	dismiss: [];
}>();

const i18n = useI18n();
</script>

<template>
	<div :class="$style.card" :data-test-id="testId">
		<N8nText bold color="text-dark" size="medium">
			{{ i18n.baseText('agents.builder.agentEvals.suggestion.title') }}
		</N8nText>
		<N8nText color="text-dark" size="medium" :class="$style.text">{{ suggestion }}</N8nText>
		<div :class="$style.actions">
			<N8nButton
				variant="solid"
				size="small"
				:disabled="disabled"
				:loading="applying"
				:data-test-id="testId && `${testId}-apply`"
				@click="emit('apply')"
			>
				{{ i18n.baseText('agents.builder.agentEvals.suggestion.apply') }}
			</N8nButton>
			<N8nButton
				variant="ghost"
				size="small"
				:disabled="disabled || applying"
				:data-test-id="testId && `${testId}-dismiss`"
				@click="emit('dismiss')"
			>
				{{ i18n.baseText('agents.builder.agentEvals.suggestion.keep') }}
			</N8nButton>
		</div>
	</div>
</template>

<style module lang="scss">
.card {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	padding: var(--spacing--xs);
	border: var(--border);
	border-radius: var(--radius--lg);
	background-color: var(--background--surface);
}

.text {
	white-space: pre-wrap;
	overflow-wrap: anywhere;
}

.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	margin-top: var(--spacing--2xs);
}
</style>
