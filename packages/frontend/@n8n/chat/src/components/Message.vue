<script lang="ts" setup>
/* eslint-disable @typescript-eslint/naming-convention */
import markdownIt from 'markdown-it';
import mathjax3 from 'markdown-it-mathjax3';
const md = markdownIt({
	html: true,
	breaks: true,
	linkify: true,
	typographer: true,
});
md.use(mathjax3);
import { computed, ref, toRefs, onMounted } from 'vue';

import { useOptions } from '@n8n/chat/composables';
import type { ChatMessage, ChatMessageText } from '@n8n/chat/types';
import Bubble from './Bubble/bubble.vue';
import HtmlParse from './Bubble/htmlParse.vue';
import ChatFile from './ChatFile.vue';

const props = defineProps<{
	message: ChatMessage;
}>();

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
const isUserMessage = computed(() => {
	return message.value.sender === 'user';
});

const messagePlacement = computed(() => {
	return isUserMessage.value ? 'end' : 'start';
});
const messageStyle = computed(() => {
	return {
		backgroundColor: isUserMessage.value
			? 'var(--chat--message--user--background)'
			: 'var(--chat--message--bot--background)',
		padding: isUserMessage.value ? '' : '0',
	};
});

const scrollToView = () => {
	if (messageContainer.value?.scrollIntoView) {
		messageContainer.value.scrollIntoView({
			block: 'start',
		});
	}
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

const onMessageRender = (value: string) => {
	return md.render(value);
};
</script>

<template>
	<div ref="messageContainer" :class="classes">
		<slot>
			<template v-if="message.type === 'component' && messageComponents[message.key]">
				<component :is="messageComponents[message.key]" v-bind="message.arguments" />
			</template>
			<Bubble
				v-else
				shape="corner"
				:content="messageText"
				:message-render="onMessageRender"
				:placement="messagePlacement"
				:content-style="messageStyle"
			>
				<template #content="{ content }">
					<HtmlParse :html="content" />
					<div v-if="(message.files ?? []).length > 0">
						<div v-for="file in message.files ?? []" :key="file.name">
							<ChatFile :file="file" :is-removable="false" :is-previewable="true" />
						</div>
					</div>
				</template>
				<template #footer v-if="!!$slots.beforeMessage">
					<slot name="beforeMessage" v-bind="{ message }" />
				</template>
			</Bubble>
		</slot>
	</div>
</template>
