<script setup lang="ts">
import { computed, ref } from 'vue';
import AssistantIcon from '../AskAssistantIcon/AssistantIcon.vue';
import AssistantText from '../AskAssistantText/AssistantText.vue';
import AssistantAvatar from '../AskAssistantAvatar/AssistantAvatar.vue';
import CodeDiff from '../CodeDiff/CodeDiff.vue';
import type { ChatUI } from '../../types/assistant';
import BlinkingCursor from '../BlinkingCursor/BlinkingCursor.vue';

import Markdown from 'markdown-it';
import InlineAskAssistantButton from '../InlineAskAssistantButton/InlineAskAssistantButton.vue';
import BetaTag from '../BetaTag/BetaTag.vue';

const md = new Markdown({
	breaks: true,
});

interface Props {
	user?: {
		firstName: string;
		lastName: string;
	};
	messages?: ChatUI.AssistantMessage[];
	streaming?: boolean;
}

const emit = defineEmits<{
	close: [];
	message: [string, string | undefined];
	codeReplace: [number];
	codeUndo: [number];
}>();

const onClose = () => emit('close');

const props = defineProps<Props>();

const textInputValue = ref<string>('');

const sessionEnded = computed(() => {
	return isEndOfSessionEvent(props.messages?.[props.messages.length - 1]);
});

function isEndOfSessionEvent(event?: ChatUI.AssistantMessage) {
	return event && event.type === 'event' && event.eventName === 'end-session';
}

function onQuickReply(opt: ChatUI.QuickReply) {
	emit('message', opt.text, opt.type);
}

function onSendMessage() {
	if (textInputValue.value && !props.streaming) {
		emit('message', textInputValue.value, undefined);
		textInputValue.value = '';
	}
}

function renderMarkdown(content: string) {
	try {
		return md.render(content);
	} catch (e) {
		return '<p>Error parsing markdown content</p>';
	}
}
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.header">
			<div :class="$style.chatTitle">
				<AssistantIcon size="large" />
				<AssistantText size="large" text="AI Assistant" />
				<BetaTag />
			</div>
			<div :class="$style.back" @click="onClose">
				<n8n-icon icon="arrow-right" color="text-base" />
			</div>
		</div>
		<div :class="$style.body">
			<div v-if="props.messages?.length" :class="$style.messages">
				<div v-for="(message, i) in props.messages" :key="i" :class="$style.message">
					<div
						v-if="
							!isEndOfSessionEvent(message) &&
							(i === 0 || message.role !== props.messages[i - 1].role)
						"
						:class="{ [$style.roleName]: true, [$style.userSection]: i > 0 }"
					>
						<AssistantAvatar v-if="message.role === 'assistant'" />
						<n8n-avatar
							v-else
							:first-name="user?.firstName"
							:last-name="user?.lastName"
							size="xsmall"
						/>

						<span v-if="message.role === 'assistant'">AI Assistant</span>
						<span v-else>You</span>
					</div>
					<div v-if="message.type === 'block'">
						<div :class="$style.block">
							<div :class="$style.blockTitle">
								{{ message.title }}
								<BlinkingCursor v-if="streaming && !message.content" />
							</div>
							<div :class="$style.blockBody">
								<span v-html="renderMarkdown(message.content)"></span>
								<BlinkingCursor v-if="streaming && message.title && message.content" />
							</div>
						</div>
					</div>
					<div v-else-if="message.type === 'text'" :class="$style.textMessage">
						<span v-if="message.role === 'user'">{{ message.content }}</span>
						<!-- eslint-disable-next-line vue/no-v-html -->
						<span
							v-else
							:class="$style.assistantText"
							v-html="renderMarkdown(message.content)"
						></span>
						<BlinkingCursor
							v-if="streaming && i === props.messages?.length - 1 && message.role === 'assistant'"
						/>
					</div>
					<div v-else-if="message.type === 'error'" :class="$style.error">
						<span>⚠️ {{ message.content }}</span>
					</div>
					<div v-else-if="message.type === 'code-diff'">
						<CodeDiff
							:title="message.description"
							:content="message.codeDiff"
							:replacing="message.replacing"
							:replaced="message.replaced"
							:error="message.error"
							:streaming="streaming && i === props.messages?.length - 1"
							@replace="() => emit('codeReplace', i)"
							@undo="() => emit('codeUndo', i)"
						/>
					</div>
					<div v-else-if="isEndOfSessionEvent(message)" :class="$style.endOfSessionText">
						<span>
							This Assistant session has ended. To start a new session with the Assistant, click an
						</span>
						<InlineAskAssistantButton size="small" :static="true" />
						<span>button in n8n</span>
					</div>

					<div
						v-if="
							!streaming &&
							'quickReplies' in message &&
							message.quickReplies?.length &&
							i === props.messages?.length - 1
						"
						:class="$style.quickReplies"
					>
						<div :class="$style.quickRepliesTitle">Quick reply 👇</div>
						<div v-for="opt in message.quickReplies" :key="opt.type">
							<n8n-button
								v-if="opt.text"
								type="secondary"
								size="mini"
								@click="() => onQuickReply(opt)"
							>
								{{ opt.text }}
							</n8n-button>
						</div>
					</div>
				</div>
			</div>

			<div v-else :class="$style.placeholder">
				<div :class="$style.greeting">Hi {{ user?.firstName }} 👋</div>
				<div :class="$style.info">
					<p>I'm here to assist you with building workflows.</p>
					<p>
						Whenever you encounter a task that I can help with, you'll see the
						<InlineAskAssistantButton size="small" :static="true" /> button.
					</p>
					<p>Clicking it starts a chat session with me.</p>
				</div>
			</div>
		</div>
		<div
			v-if="props.messages?.length"
			:class="{ [$style.inputWrapper]: true, [$style.disabledInput]: sessionEnded }"
		>
			<input
				v-model="textInputValue"
				:disabled="sessionEnded"
				placeholder="Enter your response..."
				@keydown.enter="onSendMessage"
			/>
			<n8n-icon
				:class="{ [$style.sendButton]: true, [$style.disabledInput]: props.streaming }"
				icon="paper-plane"
				size="large"
				@click="onSendMessage"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	height: 100%;
	position: relative;
}

.header {
	padding: 23px 23px;
	background-color: var(--color-background-xlight);
	border: var(--border-base);
	// todo
	border-top: 0;
	display: flex;

	div {
		display: flex;
		align-items: center;
	}

	> div:first-of-type {
		width: 100%;
	}
}

.body {
	background-color: var(--color-background-light);
	border: var(--border-base);
	border-top: 0; // todo
	height: 100%;
	overflow: scroll;
	padding-bottom: 250px; // make scrollable at the end
	position: relative;
}

.placeholder {
	padding: 16px;
}

.messages {
	padding: 12px;
}

.message {
	margin-bottom: 12px;
	font-size: 12px;
	line-height: 19px;
}

.roleName {
	display: flex;
	align-items: center;
	margin-bottom: 6px;

	font-weight: 600;
	font-size: 12px;

	> * {
		margin-right: 6px;
	}
}

.userSection {
	margin-top: 28px;
}

.chatTitle > * {
	margin-right: var(--spacing-xs);
}

.greeting {
	color: var(--color-text-dark);
	font-size: var(--font-size-m);
	line-height: 24px;
	margin-bottom: 16px;
}

.info {
	font-size: var(--font-size-s);
	color: var(--color-text-base);
}

.back:hover {
	cursor: pointer;
}

.quickReplies {
	margin-top: 16px;
	> * {
		margin-bottom: 8px;
	}
}

.quickRepliesTitle {
	font-size: var(--font-size-3xs);
	color: var(--color-text-base);
}

.textMessage {
	font-size: var(--font-size-2xs);
}

.block {
	font-size: var(--font-size-2xs);
	background-color: var(--color-foreground-xlight);
	border: var(--border-base);
	border-radius: 4px;

	li {
		margin-left: 12px;
	}
}

.blockTitle {
	border-bottom: var(--border-base);
	padding: 8px 8px 12px 8px;
	font-weight: 600;
}

.blockBody {
	padding: 12px;
}

.inputWrapper {
	position: absolute;
	bottom: 0;
	height: 48px;
	background-color: var(--color-foreground-xlight);
	border: var(--border-base);
	width: 100%;

	display: flex;
	align-items: center;
	padding: 12px;

	input {
		border: none;
		background-color: transparent;
		width: 100%;
		font-size: 12px;
		outline: none;
		color: var(--color-text-dark);
	}
}

.sendButton {
	// todo
	color: #d9dee8;
	cursor: pointer;
}

.error {
	color: var(--color-danger);
}

.assistantText {
	display: inline;

	p {
		display: inline;
	}
}

.endOfSessionText {
	margin-top: 24px;
	padding-top: 6px;
	border-top: var(--border-base);
	color: var(--color-text-base);

	> button,
	> span {
		margin-right: 6px;
	}
}

.disabledInput {
	cursor: not-allowed;

	* {
		cursor: not-allowed;
	}
}
</style>
