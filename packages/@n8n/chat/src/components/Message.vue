<script lang="ts" setup>
/* eslint-disable @typescript-eslint/naming-convention */
import type { PropType } from 'vue';
import { computed, toRefs } from 'vue';
import VueMarkdown from 'vue-markdown-render';
import hljs from 'highlight.js/lib/core';
import markdownLink from 'markdown-it-link-attributes';
import type MarkdownIt from 'markdown-it';
import type { ChatMessage, ChatMessageText } from '@n8n/chat/types';
import { useOptions } from '@n8n/chat/composables';

const props = defineProps({
	message: {
		type: Object as PropType<ChatMessage>,
		required: true,
	},
});

const { message } = toRefs(props);
const { options } = useOptions();

const messageText = computed(() => {
	return (message.value as ChatMessageText).text || '&lt;Empty response&gt;';
});

const classes = computed(() => {
	return {
		'chat-message-from-user': message.value.sender === 'user',
		'chat-message-from-bot': message.value.sender === 'bot',
		'chat-message-transparent': message.value.transparent === true,
	};
});

const linksNewTabPlugin = (vueMarkdownItInstance: MarkdownIt) => {
	vueMarkdownItInstance.use(markdownLink, {
		attrs: {
			target: '_blank',
			rel: 'noopener',
		},
	});
};

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

const messageComponents = options?.messageComponents ?? {};
</script>
<template>
	<div class="chat-message" :class="classes">
		<slot>
			<template v-if="message.type === 'component' && messageComponents[message.key]">
				<component :is="messageComponents[message.key]" v-bind="message.arguments" />
			</template>
			<VueMarkdown
				v-else
				class="chat-message-markdown"
				:source="messageText"
				:options="markdownOptions"
				:plugins="[linksNewTabPlugin]"
			/>
		</slot>
	</div>
</template>

<style lang="scss">
.chat-message {
	display: block;
	max-width: 80%;
	font-size: var(--chat--message--font-size, 1rem);
	padding: var(--chat--message--padding, var(--chat--spacing));
	border-radius: var(--chat--message--border-radius, var(--chat--border-radius));

	p {
		line-height: var(--chat--message-line-height, 1.8);
		word-wrap: break-word;
	}

	// Default message gap is half of the spacing
	+ .chat-message {
		margin-top: var(--chat--message--margin-bottom, calc(var(--chat--spacing) * 0.5));
	}

	// Spacing between messages from different senders is double the individual message gap
	&.chat-message-from-user + &.chat-message-from-bot,
	&.chat-message-from-bot + &.chat-message-from-user {
		margin-top: var(--chat--spacing);
	}

	&.chat-message-from-bot {
		&:not(.chat-message-transparent) {
			background-color: var(--chat--message--bot--background);
			border: var(--chat--message--bot--border, none);
		}
		color: var(--chat--message--bot--color);
		border-bottom-left-radius: 0;
	}

	&.chat-message-from-user {
		&:not(.chat-message-transparent) {
			background-color: var(--chat--message--user--background);
			border: var(--chat--message--user--border, none);
		}
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
