import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { action } from 'storybook/actions';
import { onBeforeUnmount, ref } from 'vue';

import type { ChatScrollAreaExposed } from './ChatScrollArea.types';

import N8nChatInput from '../N8nChatInput';
import N8nChatScrollArea from './ChatScrollArea.vue';

const meta = {
	title: 'Areas/Assistant/ChatScrollArea',
	component: N8nChatScrollArea,
	argTypes: {
		follow: { control: 'boolean' },
		loadingOlder: { control: 'boolean' },
	},
	parameters: {
		docs: {
			description: {
				component:
					'Shows a chat conversation in a scroll area with an input overlay at the bottom. Keeps the newest content in view while the user is at the bottom.',
			},
		},
	},
} satisfies Meta<typeof N8nChatScrollArea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: function render(args) {
		return {
			components: { N8nChatInput, N8nChatScrollArea },
			setup: function setup() {
				const messages = ref(
					Array.from({ length: 30 }, function createMessage(_, index) {
						return `Message ${index + 1}`;
					}),
				);
				const scrollArea = ref<ChatScrollAreaExposed>();
				const inputValue = ref('');
				const isStreaming = ref(false);
				let streamTimer: ReturnType<typeof setInterval> | undefined;

				function stopStreaming() {
					clearInterval(streamTimer);
					streamTimer = undefined;
					isStreaming.value = false;
				}

				function toggleStreaming() {
					if (isStreaming.value) {
						stopStreaming();
						return;
					}
					isStreaming.value = true;
					streamTimer = setInterval(function addMessage() {
						messages.value.push(`Message ${messages.value.length + 1}`);
					}, 2000);
				}

				function sendMessage() {
					const text = inputValue.value.trim();
					if (!text) return;
					messages.value.push(text);
					inputValue.value = '';
				}

				/** Ctrl+End (Cmd+End on macOS) in the input jumps to the newest message. */
				function onInputKeydown(event: KeyboardEvent) {
					if (event.key !== 'End' || !(event.ctrlKey || event.metaKey)) return;
					event.preventDefault();
					scrollArea.value?.scrollToBottom();
				}

				onBeforeUnmount(stopStreaming);

				return {
					args,
					messages,
					scrollArea,
					inputValue,
					onInputKeydown,
					sendMessage,
					isStreaming,
					toggleStreaming,
					onLoadOlder: action('load-older'),
					onAtBottom: action('update:atBottom'),
				};
			},
			template: `
				<button type="button" style="margin-bottom: var(--spacing--xs);" @click="toggleStreaming">
					{{ isStreaming ? 'Stop streaming' : 'Start streaming' }}
				</button>
				<div style="height: 400px; border: var(--border);">
					<N8nChatScrollArea ref="scrollArea" v-bind="args" @load-older="onLoadOlder" @update:at-bottom="onAtBottom">
						<p v-for="message in messages" :key="message" style="padding: var(--spacing--2xs) var(--spacing--sm);">
							{{ message }}
						</p>
						<template #input>
							<div style="width: 100%; padding: var(--spacing--sm);" @keydown.capture="onInputKeydown">
								<N8nChatInput v-model="inputValue" placeholder="Type a message" @submit="sendMessage" />
							</div>
						</template>
					</N8nChatScrollArea>
				</div>
			`,
		};
	},
	args: {
		follow: true,
		loadingOlder: false,
	},
};
