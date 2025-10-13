<script setup lang="ts">
import type { ChatMessage } from '@/features/chatHub/chat.types';
import { N8nIcon } from '@n8n/design-system';
import VueMarkdown from 'vue-markdown-render';
import hljs from 'highlight.js/lib/core';
import markdownLink from 'markdown-it-link-attributes';
import type MarkdownIt from 'markdown-it';

const { message, compact } = defineProps<{ message: ChatMessage; compact: boolean }>();

function messageText(msg: ChatMessage) {
	return msg.type === 'message' ? msg.text : `**Error:** ${msg.content}`;
}

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

const linksNewTabPlugin = (vueMarkdownItInstance: MarkdownIt) => {
	vueMarkdownItInstance.use(markdownLink, {
		attrs: {
			target: '_blank',
			rel: 'noopener',
		},
	});
};
</script>

<template>
	<div
		:class="[
			$style.message,
			message.role === 'user' ? $style.user : $style.assistant,
			{
				[$style.compact]: compact,
			},
		]"
	>
		<div :class="$style.avatar">
			<N8nIcon :icon="message.role === 'user' ? 'user' : 'sparkles'" width="20" height="20" />
		</div>
		<div :class="$style.chatMessage">
			<VueMarkdown
				:class="[$style.chatMessageMarkdown, 'chat-message-markdown']"
				:source="messageText(message)"
				:options="markdownOptions"
				:plugins="[linksNewTabPlugin]"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.message {
	position: relative;
}

.avatar {
	position: absolute;
	right: 100%;
	margin-right: var(--spacing--xs);
	top: 0;
	display: grid;
	place-items: center;
	width: 28px;
	height: 28px;
	border-radius: 50%;
	background: var(--color--background--light-3);
	color: var(--color--text--tint-1);

	.compact & {
		position: static;
		margin-bottom: var(--spacing--xs);
	}
}

.chatMessage {
	display: block;
	position: relative;
	max-width: fit-content;

	.user & {
		padding: var(--spacing--md);
		border-radius: var(--radius--lg);
		background-color: var(--color--background);
	}

	> .chatMessageMarkdown {
		display: block;
		box-sizing: border-box;
		font-size: inherit;

		> *:first-child {
			margin-top: 0;
		}

		> *:last-child {
			margin-bottom: 0;
		}

		p {
			margin: var(--spacing--xs) 0;
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
