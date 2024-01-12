<script lang="ts" setup>
import type { PropType } from 'vue';
import { computed } from 'vue';
import { Message } from './index';
import type { ChatMessage } from '@n8n/chat/types';

const props = defineProps({
	animation: {
		type: String as PropType<'bouncing' | 'scaling'>,
		default: 'bouncing',
	},
});

const message: ChatMessage = {
	id: 'typing',
	text: '',
	sender: 'bot',
	createdAt: '',
};

const classes = computed(() => {
	return {
		// eslint-disable-next-line @typescript-eslint/naming-convention
		'chat-message-typing': true,
		[`chat-message-typing-animation-${props.animation}`]: true,
	};
});
</script>
<template>
	<Message :class="classes" :message="message">
		<div class="chat-message-typing-body">
			<span class="chat-message-typing-circle"></span>
			<span class="chat-message-typing-circle"></span>
			<span class="chat-message-typing-circle"></span>
		</div>
	</Message>
</template>
<style lang="scss">
.chat-message-typing {
	max-width: 80px;

	&.chat-message-typing-animation-scaling .chat-message-typing-circle {
		animation: chat-message-typing-animation-scaling 800ms ease-in-out infinite;
		animation-delay: 3600ms;
	}

	&.chat-message-typing-animation-bouncing .chat-message-typing-circle {
		animation: chat-message-typing-animation-bouncing 800ms ease-in-out infinite;
		animation-delay: 3600ms;
	}

	.chat-message-typing-body {
		display: flex;
		justify-content: center;
		align-items: center;
	}

	.chat-message-typing-circle {
		display: block;
		height: 10px;
		width: 10px;
		border-radius: 50%;
		background-color: var(--chat--color-typing);
		margin: 3px;

		&:nth-child(1) {
			animation-delay: 0ms;
		}

		&:nth-child(2) {
			animation-delay: 333ms;
		}

		&:nth-child(3) {
			animation-delay: 666ms;
		}
	}
}

@keyframes chat-message-typing-animation-scaling {
	0% {
		transform: scale(1);
	}
	33% {
		transform: scale(1);
	}
	50% {
		transform: scale(1.4);
	}
	100% {
		transform: scale(1);
	}
}

@keyframes chat-message-typing-animation-bouncing {
	0% {
		transform: translateY(0);
	}
	33% {
		transform: translateY(0);
	}
	50% {
		transform: translateY(-10px);
	}
	100% {
		transform: translateY(0);
	}
}
</style>
