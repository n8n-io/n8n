<script lang="ts" setup>
/* eslint-disable @typescript-eslint/naming-convention */
import type { PropType } from 'vue';
import { computed, toRefs } from 'vue';
import VueMarkdown from 'vue-markdown-render';
import hljs from 'highlight.js/lib/core';
import type { ChatMessage } from '@n8n/chat/types';

const props = defineProps({
	message: {
		type: Object as PropType<ChatMessage>,
		required: true,
	},
});

const { message } = toRefs(props);

const messageText = computed(() => {
	return message.value.text || '&lt;Empty response&gt;';
});

const classes = computed(() => {
	return {
		'chat-message-from-user': message.value.sender === 'user',
		'chat-message-from-bot': message.value.sender === 'bot',
	};
});

const markdownOptions = {
	highlight(str: string, lang: string) {
		if (lang && hljs.getLanguage(lang)) {
			try {
				return hljs.highlight(str, { language: lang }).value;
			} catch {}
		}

		return ''; // use external default escaping
	},
};
</script>
<template>
	<div class="chat-message" :class="classes">
		<slot>
			<VueMarkdown class="chat-message-markdown" :source="messageText" :options="markdownOptions" />
		</slot>
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
		background-color: var(--chat--message--bot--background);
		color: var(--chat--message--bot--color);
		border-bottom-left-radius: 0;
	}

	&.chat-message-from-user {
		background-color: var(--chat--message--user--background);
		color: var(--chat--message--user--color);
		margin-left: auto;
		border-bottom-right-radius: 0;
	}

	> .chat-message-markdown {
		display: block;
		box-sizing: border-box;

		> *:first-child {
			margin-top: 0;
		}

		> *:last-child {
			margin-bottom: 0;
		}

		pre {
			font-family: inherit;
			font-size: inherit;
			margin: 0;
			white-space: pre-wrap;
			box-sizing: border-box;
			padding: var(--chat--spacing);
			background: var(--chat--message--pre--background);
			border-radius: var(--chat--border-radius);
		}
	}
}
</style>
