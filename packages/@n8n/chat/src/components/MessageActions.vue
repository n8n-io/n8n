<template>
	<ul class="chat-message-actions">
		<li v-for="action in messageActions" :key="action.label" class="chat-message-action">
			<Tooltip class="chat-message-action-tooltip" :placement="placement">
				<p class="chat-message-action-icon">
					<Component :is="action.icon" height="1rem" width="1rem" color="white" />
				</p>
				<template #popper>
					<div class="chat-action-tooltip-label">{{ action.label }}</div>
				</template>
			</Tooltip>
		</li>
	</ul>
</template>

<script setup lang="ts">
import { Tooltip } from 'floating-vue';
import type { MessageAction } from '@n8n/chat/types';
import 'floating-vue/dist/style.css';

defineProps<{
	messageActions: MessageAction[];
	placement: 'left' | 'right';
}>();
</script>

<style scoped lang="scss">
.chat-message-actions {
	display: flex;
	gap: 0.5rem;
	cursor: pointer;
	li {
		list-style: none;
	}
}
.chat-action-tooltip-label {
	font-size: 1rem;
}
</style>
