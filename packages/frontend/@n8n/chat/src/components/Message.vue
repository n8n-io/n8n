<script lang="ts" setup>
/* eslint-disable @typescript-eslint/naming-convention */
import hljs from 'highlight.js/lib/core';
import bash from 'highlight.js/lib/languages/bash';
import javascript from 'highlight.js/lib/languages/javascript';
import python from 'highlight.js/lib/languages/python';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import type MarkdownIt from 'markdown-it';
import markdownLink from 'markdown-it-link-attributes';
import { computed, ref, toRefs, onMounted } from 'vue';
import VueMarkdown from 'vue-markdown-render';

import { useOptions } from '@n8n/chat/composables';
import type { ChatMessage, ChatMessageText } from '@n8n/chat/types';

import ChatFile from './ChatFile.vue';

const props = defineProps<{
	message: ChatMessage;
}>();

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('python', python);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('bash', bash);

defineSlots<{
	beforeMessage(props: { message: ChatMessage }): ChatMessage;
	default: { message: ChatMessage };
}>();

const { message } = toRefs(props);
const { options } = useOptions();
const messageContainer = ref<HTMLElement | null>(null);
const fileSources = ref<Record<string, string>>({});

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

const scrollToView = () => {
	if (messageContainer.value?.scrollIntoView) {
		messageContainer.value.scrollIntoView({
			block: 'start',
		});
	}
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

const messageComponents = { ...(options?.messageComponents ?? {}) };

defineExpose({ scrollToView });

const readFileAsDataURL = async (file: File): Promise<string> =>
	await new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = reject;
		reader.readAsDataURL(file);
	});

onMounted(async () => {
	if (message.value.files) {
		for (const file of message.value.files) {
			try {
				const dataURL = await readFileAsDataURL(file);
				fileSources.value[file.name] = dataURL;
			} catch (error) {
				console.error('Error reading file:', error);
			}
		}
	}
});
</script>

<template>
	<div ref="messageContainer" class="chat-message" :class="classes">
		<div v-if="!!$slots.beforeMessage" class="chat-message-actions">
			<slot name="beforeMessage" v-bind="{ message }" />
		</div>
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
			<div v-if="(message.files ?? []).length > 0" class="chat-message-files">
				<div v-for="file in message.files ?? []" :key="file.name" class="chat-message-file">
					<ChatFile :file="file" :is-removable="false" :is-previewable="true" />
				</div>
			</div>
		</slot>
	</div>
</template>

<style lang="scss">
.chat-message {
	display: block;
	position: relative;
	max-width: fit-content;
	font-size: var(--chat--message--font-size);
	padding: var(--chat--message--padding);
	border-radius: var(--chat--message--border-radius);
	scroll-margin: 3rem;

	.chat-message-actions {
		position: absolute;
		bottom: calc(100% - 0.5rem);
		left: 0;
		opacity: 0;
		transform: translateY(-0.25rem);
		display: flex;
		gap: 1rem;
	}

	&.chat-message-from-user .chat-message-actions {
		left: auto;
		right: 0;
	}

	&:hover {
		.chat-message-actions {
			opacity: 1;
		}
	}

	p {
		line-height: var(--chat--message-line-height);
		word-wrap: break-word;
	}

	// Default message gap is half of the spacing
	+ .chat-message {
		margin-top: var(--chat--message--margin-bottom);
	}

	// Spacing between messages from different senders is double the individual message gap
	&.chat-message-from-user + &.chat-message-from-bot,
	&.chat-message-from-bot + &.chat-message-from-user {
		margin-top: var(--chat--spacing);
	}

	&.chat-message-from-bot {
		&:not(.chat-message-transparent) {
			background-color: var(--chat--message--bot--background);
			border: var(--chat--message--bot--border);
		}
		color: var(--chat--message--bot--color);
		border-bottom-left-radius: 0;
	}

	&.chat-message-from-user {
		&:not(.chat-message-transparent) {
			background-color: var(--chat--message--user--background);
			border: var(--chat--message--user--border);
		}
		color: var(--chat--message--user--color);
		margin-left: auto;
		border-bottom-right-radius: 0;
	}

	> .chat-message-markdown {
		display: block;
		box-sizing: border-box;
		font-size: inherit;

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
	.chat-message-files {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
		padding-top: 0.5rem;
	}
}
</style>
