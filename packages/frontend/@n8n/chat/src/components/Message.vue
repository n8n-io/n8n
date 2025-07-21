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
import mathjax3 from 'markdown-it-mathjax3';
import { computed, ref, toRefs, onMounted, onBeforeUnmount } from 'vue';
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
// Store timer IDs for each code block to clear duplicate click timers
const copyTimers = ref<Map<string, number>>(new Map());

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

const mathPlugin = (vueMarkdownItInstance: MarkdownIt) => {
	vueMarkdownItInstance.use(mathjax3);
};

// Custom code block plugin
const codeBlockPlugin = (vueMarkdownItInstance: MarkdownIt) => {
	// Override fence rules to directly output our custom structure
	vueMarkdownItInstance.renderer.rules.fence = (tokens, idx, _options, _env, _renderer) => {
		const token = tokens[idx];
		const info = token.info ? vueMarkdownItInstance.utils.unescapeAll(token.info).trim() : '';
		const langName = info ? info.split(/\s+/g)[0] : '';
		const content = token.content;

		const blockId = `code-block-${Date.now()}-${++codeBlockCounter}`;

		let highlighted = content;
		if (hljs.getLanguage(langName)) {
			highlighted = hljs.highlight(content, { language: langName }).value;
		} else {
			highlighted = hljs.highlightAuto(content).value;
		}

		return `<div class="highlight" data-block-id="${blockId}" data-code="${encodeURIComponent(content)}">
			<div class="highlight-tool-bar">
				<span class="highlight-language">${langName || 'text'}</span>
				<button class="highlight-copy-btn" type="button">
					<span class="highlight-copy-text">Copy</span>
					<span class="highlight-copied-text">Copy Successfully</span>
				</button>
			</div>
			<pre><code class="highlight-code-box hljs${langName ? ` language-${langName}` : ''}">${highlighted}</code></pre>
		</div>`;
	};
};

const markdownPlugins = computed(() => [linksNewTabPlugin, mathPlugin, codeBlockPlugin]);

const scrollToView = () => {
	if (messageContainer.value?.scrollIntoView) {
		messageContainer.value.scrollIntoView({
			block: 'start',
		});
	}
};

// Generate unique code block ID
let codeBlockCounter = 0;

const markdownOptions = {
	// Remove highlight function as we now use custom plugin
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
	// Use event delegation to handle copy button clicks
	if (messageContainer.value) {
		messageContainer.value.addEventListener('click', async (event) => {
			const button = (event.target as HTMLElement)?.closest('.highlight-copy-btn');
			if (button) {
				const wrapper = button.closest('.highlight');
				if (wrapper) {
					const blockId = wrapper.getAttribute('data-block-id') || '';
					const code = decodeURIComponent(wrapper.getAttribute('data-code') || '');

					// Prevent duplicate clicks: return if button is already in copied state
					if (wrapper.classList.contains('copied')) {
						return;
					}

					try {
						await navigator.clipboard.writeText(code);

						// Clear previous timer for this code block (if exists)
						const existingTimer = copyTimers.value.get(blockId);
						if (existingTimer) {
							clearTimeout(existingTimer);
						}

						// Update container state (add copied class to .highlight, not the button)
						wrapper.classList.add('copied');

						// Set new timer to restore after 1500ms
						const timerId = window.setTimeout(() => {
							wrapper.classList.remove('copied');
							// Clear completed timer reference
							copyTimers.value.delete(blockId);
						}, 1500);

						// Store timer ID
						copyTimers.value.set(blockId, timerId);
					} catch (err) {
						console.error('Failed to copy code:', err);
					}
				}
			}
		});
	}

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

// Clean up all timers when component unmounts
onBeforeUnmount(() => {
	copyTimers.value.forEach((timerId) => clearTimeout(timerId));
	copyTimers.value.clear();
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
				:plugins="markdownPlugins"
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
	}
	.chat-message-files {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
		padding-top: 0.5rem;
	}
}
</style>
