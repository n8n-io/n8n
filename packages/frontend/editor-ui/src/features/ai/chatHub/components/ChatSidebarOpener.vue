<script setup lang="ts">
import { useChatHubSidebarState } from '@/features/ai/chatHub/composables/useChatHubSidebarState';
import { N8nIconButton } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

const sidebar = useChatHubSidebarState();
const i18n = useI18n();
</script>

<template>
	<N8nIconButton
		v-if="!sidebar.isStatic.value"
		type="secondary"
		:icon="sidebar.canBeStatic.value ? 'panel-left' : 'menu'"
		text
		icon-size="large"
		:aria-label="i18n.baseText('chatHub.sidebar.button.toggle')"
		@click="sidebar.toggleStatic(true)"
	/>
</template>
