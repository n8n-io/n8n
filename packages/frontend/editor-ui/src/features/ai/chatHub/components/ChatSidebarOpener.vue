<script setup lang="ts">
import { useChatHubSidebarState } from '@/features/ai/chatHub/composables/useChatHubSidebarState';
import { N8nIconButton } from '@n8n/design-system';

const sidebar = useChatHubSidebarState();
</script>

<template>
	<N8nIconButton
		v-if="!sidebar.isStatic.value"
		type="secondary"
		:icon="sidebar.canBeStatic.value ? 'panel-left' : 'menu'"
		text
		icon-size="large"
		@click="sidebar.toggleStatic(true)"
	/>
</template>
