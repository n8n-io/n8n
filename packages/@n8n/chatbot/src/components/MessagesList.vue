<script lang="ts" setup>
import type { PropType } from 'vue';
import { defineProps } from 'vue';
import Message from '@/components/Message.vue';
import type { ChatMessage } from '@/types';

defineProps({
	messages: {
		type: Array as PropType<ChatMessage[]>,
		required: true,
	},
});
</script>
<template>
	<div class="chat-messages-list">
		<Message v-for="message in messages" :key="message.id" :message="message" />
	</div>
</template>

<style lang="scss">
.chat-messages-list {
	margin-top: auto;
	display: block;
	padding: var(--chat--messages-list--padding, var(--chat--spacing));
}
</style>
