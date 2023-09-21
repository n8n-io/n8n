<script lang="ts" setup>
/* eslint-disable @typescript-eslint/naming-convention */
import type { ChatMessage } from '@/types';
import type { PropType } from 'vue';
import { computed, toRefs } from 'vue';

const props = defineProps({
	message: {
		type: Object as PropType<ChatMessage>,
		required: true,
	},
});

const { message } = toRefs(props);

const classes = computed(() => {
	return {
		'chat-message-from-user': message.value.sender === 'user',
		'chat-message-from-bot': message.value.sender === 'bot',
	};
});
</script>
<template>
	<div class="chat-message" :class="classes">
		<pre>{{ message.text }}</pre>
	</div>
</template>

<style lang="scss">
.chat-message {
	display: block;
	max-width: 80%;
	padding: var(--chat--message--padding, var(--chat--spacing));
	border-radius: var(--chat--message--border-radius, var(--chat--border-radius));

	+ .chat-message {
		margin-top: var(--chat--message--margin-bottom, calc(var(--chat--spacing) * 0.5));
	}

	&.chat-message-from-bot {
		background-color: var(--chat--message--bot--background, var(--chat--color-medium));
		border-bottom-left-radius: 0;
	}

	&.chat-message-from-user {
		background-color: var(--chat--message--bot--background, var(--chat--color-secondary));
		margin-left: auto;
		border-bottom-right-radius: 0;
	}

	pre {
		font-family: inherit;
		font-size: inherit;
		margin: 0;
	}
}
</style>
