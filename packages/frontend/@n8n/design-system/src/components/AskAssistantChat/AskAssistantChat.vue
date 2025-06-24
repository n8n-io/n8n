<script setup lang="ts">
import { computed, ref } from 'vue';

import BlockMessage from './messages/BlockMessage.vue';
import CodeDiffMessage from './messages/CodeDiffMessage.vue';
import ErrorMessage from './messages/ErrorMessage.vue';
import EventMessage from './messages/EventMessage.vue';
import TextMessage from './messages/TextMessage.vue';
import ComposedNodesMessage from './messages/workflow/ComposedNodesMessage.vue';
import RateWorkflowMessage from './messages/workflow/RateWorkflowMessage.vue';
import WorkflowGeneratedMessage from './messages/workflow/WorkflowGeneratedMessage.vue';
import WorkflowNodesMessage from './messages/workflow/WorkflowNodesMessage.vue';
import WorkflowStepsMessage from './messages/workflow/WorkflowStepsMessage.vue';
import { useI18n } from '../../composables/useI18n';
import type { ChatUI } from '../../types/assistant';
import AssistantIcon from '../AskAssistantIcon/AssistantIcon.vue';
import AssistantLoadingMessage from '../AskAssistantLoadingMessage/AssistantLoadingMessage.vue';
import AssistantText from '../AskAssistantText/AssistantText.vue';
import BetaTag from '../BetaTag/BetaTag.vue';
import InlineAskAssistantButton from '../InlineAskAssistantButton/InlineAskAssistantButton.vue';
import N8nButton from '../N8nButton';
import N8nIcon from '../N8nIcon';
import N8nIconButton from '../N8nIconButton';

const { t } = useI18n();

const MAX_CHAT_INPUT_HEIGHT = 100;

interface Props {
	user?: {
		firstName: string;
		lastName: string;
	};
	messages?: ChatUI.AssistantMessage[];
	streaming?: boolean;
	loadingMessage?: string;
	sessionId?: string;
	title?: string;
	placeholder?: string;
}

const emit = defineEmits<{
	close: [];
	message: [string, string?, boolean?];
	codeReplace: [number];
	codeUndo: [number];
	thumbsUp: [];
	thumbsDown: [];
	submitFeedback: [string];
}>();

const onClose = () => emit('close');

const props = withDefaults(defineProps<Props>(), {
	title: () => useI18n().t('assistantChat.aiAssistantLabel'),
	user: () => ({
		firstName: '',
		lastName: '',
	}),
	messages: () => [],
	loadingMessage: undefined,
	sessionId: undefined,
});

const textInputValue = ref<string>('');

const chatInput = ref<HTMLTextAreaElement | null>(null);

const sessionEnded = computed(() => {
	return isEndOfSessionEvent(props.messages?.[props.messages.length - 1]);
});

const sendDisabled = computed(() => {
	return !textInputValue.value || props.streaming || sessionEnded.value;
});

const showPlaceholder = computed(() => {
	return !props.messages?.length && !props.loadingMessage && !props.sessionId;
});

function isEndOfSessionEvent(event?: ChatUI.AssistantMessage) {
	return event?.type === 'event' && event?.eventName === 'end-session';
}

function onQuickReply(opt: ChatUI.QuickReply) {
	emit('message', opt.text, opt.type, opt.isFeedback);
}

function onSendMessage() {
	if (sendDisabled.value) return;
	emit('message', textInputValue.value);
	textInputValue.value = '';
	if (chatInput.value) {
		chatInput.value.style.height = 'auto';
	}
}

function growInput() {
	if (!chatInput.value) return;
	chatInput.value.style.height = 'auto';
	const scrollHeight = chatInput.value.scrollHeight;
	chatInput.value.style.height = `${Math.min(scrollHeight, MAX_CHAT_INPUT_HEIGHT)}px`;
}

function onThumbsUp() {
	emit('thumbsUp');
}

function onThumbsDown() {
	emit('thumbsDown');
}

function onSubmitFeedback(feedback: string) {
	emit('submitFeedback', feedback);
}
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.header">
			<div :class="$style.chatTitle">
				<div :class="$style.headerText">
					<AssistantIcon size="large" />
					<AssistantText size="large" :text="title" />
				</div>
				<BetaTag />
				<slot name="header" />
			</div>
			<div :class="$style.back" data-test-id="close-chat-button" @click="onClose">
				<N8nIcon icon="arrow-right" color="text-base" />
			</div>
		</div>
		<div :class="$style.body">
			<div v-if="messages?.length || loadingMessage" :class="$style.messages">
				<div v-if="messages?.length">
					<data
						v-for="(message, i) in messages"
						:key="i"
						:data-test-id="
							message.role === 'assistant' ? 'chat-message-assistant' : 'chat-message-user'
						"
					>
						<TextMessage
							v-if="message.type === 'text'"
							:message="message"
							:is-first-of-role="i === 0 || message.role !== messages[i - 1].role"
							:user="user"
							:streaming="streaming"
							:is-last-message="i === messages.length - 1"
						/>
						<BlockMessage
							v-else-if="message.type === 'block'"
							:message="message"
							:is-first-of-role="i === 0 || message.role !== messages[i - 1].role"
							:user="user"
							:streaming="streaming"
							:is-last-message="i === messages.length - 1"
						/>
						<ErrorMessage
							v-else-if="message.type === 'error'"
							:message="message"
							:is-first-of-role="i === 0 || message.role !== messages[i - 1].role"
							:user="user"
						/>
						<EventMessage
							v-else-if="message.type === 'event'"
							:message="message"
							:is-first-of-role="i === 0 || message.role !== messages[i - 1].role"
							:user="user"
						/>
						<CodeDiffMessage
							v-else-if="message.type === 'code-diff'"
							:message="message"
							:is-first-of-role="i === 0 || message.role !== messages[i - 1].role"
							:user="user"
							:streaming="streaming"
							:is-last-message="i === messages.length - 1"
							@code-replace="() => emit('codeReplace', i)"
							@code-undo="() => emit('codeUndo', i)"
						/>
						<WorkflowStepsMessage
							v-else-if="message.type === 'workflow-step'"
							:message="message"
							:is-first-of-role="i === 0 || message.role !== messages[i - 1].role"
							:user="user"
						/>
						<WorkflowNodesMessage
							v-else-if="message.type === 'workflow-node'"
							:message="message"
							:is-first-of-role="i === 0 || message.role !== messages[i - 1].role"
							:user="user"
						/>
						<ComposedNodesMessage
							v-else-if="message.type === 'workflow-composed'"
							:message="message"
							:is-first-of-role="i === 0 || message.role !== messages[i - 1].role"
							:user="user"
						/>
						<WorkflowGeneratedMessage
							v-else-if="message.type === 'workflow-generated'"
							:message="message"
							:is-first-of-role="i === 0 || message.role !== messages[i - 1].role"
							:user="user"
						/>
						<RateWorkflowMessage
							v-else-if="message.type === 'rate-workflow'"
							:message="message"
							:is-first-of-role="i === 0 || message.role !== messages[i - 1].role"
							:user="user"
							@thumbs-up="onThumbsUp"
							@thumbs-down="onThumbsDown"
							@submit-feedback="onSubmitFeedback"
						/>

						<div
							v-if="
								!streaming &&
								'quickReplies' in message &&
								message.quickReplies?.length &&
								i === messages.length - 1
							"
							:class="$style.quickReplies"
						>
							<div :class="$style.quickRepliesTitle">
								{{ t('assistantChat.quickRepliesTitle') }}
							</div>
							<div v-for="opt in message.quickReplies" :key="opt.type" data-test-id="quick-replies">
								<N8nButton
									v-if="opt.text"
									type="secondary"
									size="mini"
									@click="() => onQuickReply(opt)"
								>
									{{ opt.text }}
								</N8nButton>
							</div>
						</div>
					</data>
				</div>
				<div
					v-if="loadingMessage"
					:class="{ [$style.message]: true, [$style.loading]: messages?.length }"
				>
					<AssistantLoadingMessage :message="loadingMessage" />
				</div>
			</div>
			<div
				v-else-if="showPlaceholder"
				:class="$style.placeholder"
				data-test-id="placeholder-message"
			>
				<div v-if="$slots.placeholder" :class="$style.info">
					<slot name="placeholder" />
				</div>
				<template v-else>
					<div :class="$style.greeting">Hi {{ user?.firstName }} 👋</div>
					<div :class="$style.info">
						<p>
							{{ t('assistantChat.placeholder.1') }}
						</p>
						<p>
							{{ t('assistantChat.placeholder.2') }}
							<InlineAskAssistantButton size="small" :static="true" />
							{{ t('assistantChat.placeholder.3') }}
						</p>
						<p>
							{{ t('assistantChat.placeholder.4') }}
						</p>
					</div>
				</template>
			</div>
		</div>
		<div
			:class="{ [$style.inputWrapper]: true, [$style.disabledInput]: sessionEnded }"
			data-test-id="chat-input-wrapper"
		>
			<div v-if="$slots.inputPlaceholder" :class="$style.inputPlaceholder">
				<slot name="inputPlaceholder" />
			</div>
			<template v-else>
				<textarea
					ref="chatInput"
					v-model="textInputValue"
					class="ignore-key-press-node-creator ignore-key-press-canvas"
					:class="{ [$style.disabled]: sessionEnded || streaming }"
					:disabled="sessionEnded || streaming"
					:placeholder="placeholder ?? t('assistantChat.inputPlaceholder')"
					rows="1"
					wrap="hard"
					data-test-id="chat-input"
					@keydown.enter.exact.prevent="onSendMessage"
					@input.prevent="growInput"
					@keydown.stop
				/>
				<N8nIconButton
					:class="{ [$style.sendButton]: true }"
					icon="paper-plane"
					:text="true"
					size="large"
					data-test-id="send-message-button"
					:disabled="sendDisabled"
					@click="onSendMessage"
				/>
			</template>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	height: 100%;
	position: relative;
	display: grid;
	grid-template-rows: auto 1fr auto;
}

.header {
	height: 65px; // same as header height in editor
	padding: 0 var(--spacing-l);
	background-color: var(--color-background-xlight);
	border: var(--border-base);
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
	border-top: 0;
	position: relative;

	pre,
	code {
		text-wrap: wrap;
	}
}

.placeholder {
	padding: var(--spacing-s);
}

.messages {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	padding: var(--spacing-xs);
	overflow-y: auto;

	& + & {
		padding-top: 0;
	}
}

.message {
	margin-bottom: var(--spacing-xs);
	font-size: var(--font-size-2xs);
	line-height: var(--font-line-height-xloose);

	&.loading {
		margin-top: var(--spacing-m);
	}
}

.chatTitle {
	display: flex;
	gap: var(--spacing-3xs);
}

.headerText {
	gap: var(--spacing-xs);
}

.greeting {
	color: var(--color-text-dark);
	font-size: var(--font-size-m);
	margin-bottom: var(--spacing-s);
}

.info {
	font-size: var(--font-size-s);
	color: var(--color-text-base);

	button {
		display: inline-flex;
	}
}

.back:hover {
	cursor: pointer;
}

.quickReplies {
	margin-top: var(--spacing-s);
	> * {
		margin-bottom: var(--spacing-3xs);
	}
}

.quickRepliesTitle {
	font-size: var(--font-size-3xs);
	color: var(--color-text-base);
}

.inputWrapper {
	display: flex;
	background-color: var(--color-foreground-xlight);
	border: var(--border-base);
	width: 100%;
	border-top: 0;

	textarea {
		border: none;
		background-color: transparent;
		width: 100%;
		font-size: var(--spacing-xs);
		padding: var(--spacing-xs);
		outline: none;
		color: var(--color-text-dark);
		resize: none;
		font-family: inherit;
	}
}

.sendButton {
	color: var(--color-text-base) !important;

	&[disabled] {
		color: var(--color-text-light) !important;
	}
}

.disabledInput {
	cursor: not-allowed;

	* {
		cursor: not-allowed;
	}
}

textarea.disabled {
	background-color: var(--color-foreground-base);
	cursor: not-allowed;
}

.inputPlaceholder {
	width: 100%;
}
</style>
