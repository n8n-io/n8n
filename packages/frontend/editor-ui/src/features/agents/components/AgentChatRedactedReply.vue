<script setup lang="ts">
import { N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

/** Stands in for the text of an agent reply that is redacted for the reader. */
const i18n = useI18n();
</script>

<template>
	<div :class="$style.redacted" data-test-id="agent-chat-redacted-reply">
		<N8nIcon icon="lock" size="small" />
		<N8nText size="small" color="text-light">
			{{ i18n.baseText('agentSessions.timeline.replyRedacted') }}
		</N8nText>
	</div>
</template>

<style module lang="scss">
.redacted {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	color: var(--text-color--subtler);
}
</style>
