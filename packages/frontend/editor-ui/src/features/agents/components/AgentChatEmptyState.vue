<script setup lang="ts">
import { computed } from 'vue';
import { N8nIcon, N8nText } from '@n8n/design-system';

const props = defineProps<{
	endpoint: 'build' | 'chat';
}>();

const icon = computed(() => (props.endpoint === 'build' ? 'wand-sparkles' : 'message-square'));
const title = computed(() =>
	props.endpoint === 'build' ? 'Build your agent' : 'Chat with your agent',
);
const subtitle = computed(() =>
	props.endpoint === 'build'
		? 'Describe what you want your agent to do'
		: 'Send a message to start a conversation',
);
</script>

<template>
	<div :class="[$style.emptyState, endpoint === 'build' && $style.buildEmptyState]">
		<N8nIcon :icon="icon" :size="32" color="text-light" />
		<N8nText tag="p" bold>{{ title }}</N8nText>
		<N8nText size="small" color="text-light">{{ subtitle }}</N8nText>
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
