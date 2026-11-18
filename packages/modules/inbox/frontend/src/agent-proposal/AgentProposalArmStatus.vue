<script setup lang="ts">
import { N8nIcon, N8nText, type IconName } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import type { AgentProposalArmStatus } from './agentProposalEvalCases';

const props = defineProps<{ status: AgentProposalArmStatus }>();

const i18n = useI18n();

/* The icons and tones of the Agent Evals screen: a failed check is a warning, a failed run is an error. */
const icons: Record<AgentProposalArmStatus, IconName> = {
	pass: 'bot-pass',
	fail: 'bot-warning',
	error: 'bot-fail',
	skipped: 'bot-idle',
};

const label = computed(() => i18n.baseText(`inbox.agentProposal.evals.status.${props.status}`));
</script>

<template>
	<span :class="$style.status" :data-status="status" data-test-id="agent-proposal-arm-status">
		<span :class="[$style.avatar, $style[status]]">
			<N8nIcon :icon="icons[status]" size="small" />
		</span>
		<N8nText step="xs" color="text-dark">{{ label }}</N8nText>
	</span>
</template>

<style module lang="scss">
.status {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
	min-width: 0;
	white-space: nowrap;
}

.avatar {
	display: inline-flex;
	flex-shrink: 0;
	align-items: center;
	justify-content: center;
	width: var(--spacing--md);
	height: var(--spacing--md);
	border-radius: var(--radius--xs);
}

.pass {
	background-color: var(--color--success--tint-4);
	color: var(--color--success);
}

.fail {
	background-color: var(--callout--color--background--secondary);
	color: var(--callout--color--text--secondary);
}

.error {
	background-color: var(--color--danger--tint-4);
	color: var(--color--danger);
}

.skipped {
	background-color: var(--background--subtle);
	color: var(--text-color--subtle);
}
</style>
