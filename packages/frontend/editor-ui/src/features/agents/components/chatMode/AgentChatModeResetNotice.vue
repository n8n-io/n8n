<script setup lang="ts">
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

const i18n = useI18n();
</script>

<template>
	<div
		:class="$style.notice"
		role="status"
		aria-live="polite"
		data-testid="agent-chat-mode-reset-notice"
	>
		<N8nIcon icon="flask-conical" size="small" :class="$style.icon" aria-hidden="true" />
		<span>{{ i18n.baseText('agents.testRun.mode.reset.notice') }}</span>
	</div>
</template>

<style lang="scss" module>
.notice {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--3xs);
	color: var(--text-color--subtle);
	font-size: var(--font-size--xs);
	text-align: center;
}

.icon {
	flex-shrink: 0;
	color: light-dark(var(--color--purple-500), var(--color--purple-300));
}
</style>
