<script setup lang="ts">
import { N8nIcon, N8nText } from '@n8n/design-system';
</script>

<template>
	<div :class="$style.emptyState">
		<N8nIcon icon="message-square" :size="32" color="text-light" />
		<N8nText tag="p" bold>Chat with your agent</N8nText>
		<N8nText size="small" color="text-light">Send a message to start a conversation</N8nText>
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
