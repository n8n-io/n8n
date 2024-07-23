<script setup lang="ts">
import { useAssistantStore } from '@/stores/assistant.store';
import { computed } from 'vue';

const assistantStore = useAssistantStore();

const lastUnread = computed(() => {
	const msg = assistantStore.lastUnread;
	if (msg?.type === 'block') {
		return msg.title;
	}
	if (msg?.type === 'text') {
		return msg.content;
	}
	if (msg?.type === 'code-diff') {
		return msg.description;
	}

	return;
});
</script>

<template>
	<div
		v-if="assistantStore.canShowAssistantButtons && !assistantStore.isAssistantOpen"
		:class="$style.container"
	>
		<n8n-tooltip placement="top" :visible="!!lastUnread">
			<template #content> {{ lastUnread }} </template>
			<n8n-a-i-assistant-button
				:unread-count="assistantStore.unreadCount"
				@click="assistantStore.openChat"
			/>
		</n8n-tooltip>
	</div>
</template>

<style lang="scss" module>
.container {
	position: absolute;
	bottom: var(--spacing-s);
	right: var(--spacing-s);
	z-index: 3000;
}
</style>
