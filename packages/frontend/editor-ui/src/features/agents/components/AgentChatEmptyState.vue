<script setup lang="ts">
import { N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

const i18n = useI18n();
</script>

<template>
	<div :class="$style.emptyState">
		<N8nIcon icon="message-square" :size="32" color="text-light" />
		<N8nText tag="p" bold>{{ i18n.baseText('agents.chat.emptyState.title') }}</N8nText>
		<N8nText size="small" color="text-light">
			{{ i18n.baseText('agents.chat.emptyState.description') }}
		</N8nText>
	</div>
</template>

<style module>
.emptyState {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	height: 100%;
	gap: var(--spacing--3xs);
}
</style>
