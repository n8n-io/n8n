<script setup lang="ts">
import Markdown from 'markdown-it';
import markdownLink from 'markdown-it-link-attributes';
import { computed, ref } from 'vue';

import { useI18n } from '../../composables/useI18n';
import type { ChatUI } from '../../types/assistant';
import AssistantAvatar from '../AskAssistantAvatar/AssistantAvatar.vue';
import AssistantIcon from '../AskAssistantIcon/AssistantIcon.vue';
import AssistantLoadingMessage from '../AskAssistantLoadingMessage/AssistantLoadingMessage.vue';
import AssistantText from '../AskAssistantText/AssistantText.vue';
import BetaTag from '../BetaTag/BetaTag.vue';
import BlinkingCursor from '../BlinkingCursor/BlinkingCursor.vue';
import CodeDiff from '../CodeDiff/CodeDiff.vue';
import InlineAskAssistantButton from '../InlineAskAssistantButton/InlineAskAssistantButton.vue';

const { t } = useI18n();

const md = new Markdown({
	breaks: true,
});
md.use(markdownLink, {
	attrs: {
		target: '_blank',
		rel: 'noopener',
	},
});
// Wrap tables in div
md.renderer.rules.table_open = function () {
	return '<div class="table-wrapper"><table>';
};

md.renderer.rules.table_close = function () {
	return '</table></div>';
};

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
}

const emit = defineEmits<{
	close: [];
	message: [string, string?, boolean?];
	codeReplace: [number];
	codeUndo: [number];
}>();

const onClose = () => emit('close');

const props = defineProps<Props>();

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

const isClipboardSupported = computed(() => {
	return navigator.clipboard?.writeText;
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

function renderMarkdown(content: string) {
	try {
		return md.render(content);
	} catch (e) {
		console.error(`Error parsing markdown content ${content}`);
		return `<p>${t('assistantChat.errorParsingMarkdown')}</p>`;
	}
}

function growInput() {
	if (!chatInput.value) return;
	chatInput.value.style.height = 'auto';
	const scrollHeight = chatInput.value.scrollHeight;
	chatInput.value.style.height = `${Math.min(scrollHeight, MAX_CHAT_INPUT_HEIGHT)}px`;
}

async function onCopyButtonClick(content: string, e: MouseEvent) {
	const button = e.target as HTMLButtonElement;
	await navigator.clipboard.writeText(content);
	button.innerText = t('assistantChat.copied');
	setTimeout(() => {
		button.innerText = t('assistantChat.copy');
	}, 2000);
}
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.header">
			<div :class="$style.chatTitle">
				<div :class="$style.headerText">
					<AssistantIcon size="large" />
					<AssistantText size="large" :text="t('assistantChat.aiAssistantLabel')" />
				</div>
				<BetaTag />
			</div>
			<div :class="$style.back" data-test-id="close-chat-button" @click="onClose">
				<n8n-icon icon="arrow-right" color="text-base" />
			</div>
		</div>
		<div :class="$style.body">
			<div v-if="messages?.length || loadingMessage" :class="$style.messages">
				<div v-if="messages?.length">
					<div
						v-for="(message, i) in messages"
						:key="i"
						:class="$style.message"
						:data-test-id="
							message.role === 'assistant' ? 'chat-message-assistant' : 'chat-message-user'
						"
					>
						<div
							v-if="
								!isEndOfSessionEvent(message) && (i === 0 || message.role !== messages[i - 1].role)
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

							<span v-if="message.role === 'assistant'">{{
								t('assistantChat.aiAssistantName')
							}}</span>
							<span v-else>{{ t('assistantChat.you') }}</span>
						</div>
						<div v-if="message.type === 'block'">
							<div :class="$style.block">
								<div :class="$style.blockTitle">
									{{ message.title }}
									<BlinkingCursor
										v-if="streaming && i === messages?.length - 1 && !message.content"
									/>
								</div>
								<div :class="$style.blockBody">
									<span
										v-n8n-html="renderMarkdown(message.content)"
										:class="$style['rendered-content']"
									></span>
									<BlinkingCursor
										v-if="
											streaming && i === messages?.length - 1 && message.title && message.content
										"
									/>
								</div>
							</div>
						</div>
						<div v-else-if="message.type === 'text'" :class="$style.textMessage">
							<span
								v-if="message.role === 'user'"
								v-n8n-html="renderMarkdown(message.content)"
								:class="$style['rendered-content']"
							></span>
							<div
								v-else
								v-n8n-html="renderMarkdown(message.content)"
								:class="[$style.assistantText, $style['rendered-content']]"
							></div>
							<div
								v-if="message?.codeSnippet"
								:class="$style['code-snippet']"
								data-test-id="assistant-code-snippet"
							>
								<header v-if="isClipboardSupported">
									<n8n-button
										type="tertiary"
										text="true"
										size="mini"
										data-test-id="assistant-copy-snippet-button"
										@click="onCopyButtonClick(message.codeSnippet, $event)"
									>
										{{ t('assistantChat.copy') }}
									</n8n-button>
								</header>
								<div
									v-n8n-html="renderMarkdown(message.codeSnippet).trim()"
									data-test-id="assistant-code-snippet-content"
									:class="[$style['snippet-content'], $style['rendered-content']]"
								></div>
							</div>
							<BlinkingCursor
								v-if="streaming && i === messages?.length - 1 && message.role === 'assistant'"
							/>
						</div>
						<div
							v-else-if="message.type === 'error'"
							:class="$style.error"
							data-test-id="chat-message-system"
						>
							<span>⚠️ {{ message.content }}</span>
							<n8n-button
								v-if="message.retry"
								type="secondary"
								size="mini"
								:class="$style.retryButton"
								data-test-id="error-retry-button"
								@click="() => message.retry?.()"
							>
								{{ t('generic.retry') }}
							</n8n-button>
						</div>
						<div v-else-if="message.type === 'code-diff'">
							<CodeDiff
								:title="message.description"
								:content="message.codeDiff"
								:replacing="message.replacing"
								:replaced="message.replaced"
								:error="message.error"
								:streaming="streaming && i === messages?.length - 1"
								@replace="() => emit('codeReplace', i)"
								@undo="() => emit('codeUndo', i)"
							/>
						</div>
						<div
							v-else-if="isEndOfSessionEvent(message)"
							:class="$style.endOfSessionText"
							data-test-id="chat-message-system"
						>
							<span>
								{{ t('assistantChat.sessionEndMessage.1') }}
							</span>
							<InlineAskAssistantButton size="small" :static="true" />
							<span>
								{{ t('assistantChat.sessionEndMessage.2') }}
							</span>
						</div>

						<div
							v-if="
								!streaming &&
								'quickReplies' in message &&
								message.quickReplies?.length &&
								i === messages?.length - 1
							"
							:class="$style.quickReplies"
						>
							<div :class="$style.quickRepliesTitle">
								{{ t('assistantChat.quickRepliesTitle') }}
							</div>
							<div v-for="opt in message.quickReplies" :key="opt.type" data-test-id="quick-replies">
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
			</div>
		</div>
		<div
			:class="{ [$style.inputWrapper]: true, [$style.disabledInput]: sessionEnded }"
			data-test-id="chat-input-wrapper"
		>
			<textarea
				ref="chatInput"
				v-model="textInputValue"
				class="ignore-key-press-node-creator ignore-key-press-canvas"
				:disabled="sessionEnded"
				:placeholder="t('assistantChat.inputPlaceholder')"
				rows="1"
				wrap="hard"
				data-test-id="chat-input"
				@keydown.enter.exact.prevent="onSendMessage"
				@input.prevent="growInput"
				@keydown.stop
			/>
			<n8n-icon-button
				:class="{ [$style.sendButton]: true }"
				icon="paper-plane"
				type="text"
				size="large"
				data-test-id="send-message-button"
				:disabled="sendDisabled"
				@click="onSendMessage"
			/>
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

p {
	line-height: var(--font-line-height-xloose);
	margin: var(--spacing-2xs) 0;
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

.roleName {
	display: flex;
	align-items: center;
	margin-bottom: var(--spacing-3xs);

	font-weight: var(--font-weight-bold);
	font-size: var(--font-size-2xs);

	> * {
		margin-right: var(--spacing-3xs);
	}
}

.userSection {
	margin-top: var(--spacing-l);
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

.textMessage {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-xs);
	font-size: var(--font-size-2xs);
	word-break: break-word;
}

code[class^='language-'] {
	display: block;
	padding: var(--spacing-4xs);
}

.code-snippet {
	position: relative;
	border: var(--border-base);
	background-color: var(--color-foreground-xlight);
	border-radius: var(--border-radius-base);
	font-family: var(--font-family-monospace);
	font-size: var(--font-size-3xs);
	max-height: 218px; // 12 lines
	overflow: auto;
	margin: var(--spacing-4s) 0;

	header {
		display: flex;
		justify-content: flex-end;
		padding: var(--spacing-4xs);
		border-bottom: var(--border-base);

		button:active,
		button:focus {
			outline: none !important;
		}
	}

	.snippet-content {
		padding: var(--spacing-2xs);
	}

	pre {
		white-space-collapse: collapse;
	}

	code {
		background-color: transparent;
		font-size: var(--font-size-3xs);
	}
}

.block {
	font-size: var(--font-size-2xs);
	background-color: var(--color-foreground-xlight);
	border: var(--border-base);
	border-radius: var(--border-radius-base);
	word-break: break-word;

	li {
		margin-left: var(--spacing-xs);
	}
}

.blockTitle {
	border-bottom: var(--border-base);
	padding: var(--spacing-2xs);
	font-weight: var(--font-weight-bold);
}

.blockBody {
	padding: var(--spacing-xs);
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

.error {
	color: var(--color-danger);
	display: flex;
	flex-direction: column;
	align-items: start;
}

.retryButton {
	margin-top: var(--spacing-3xs);
}

.assistantText {
	display: inline-flex;
	flex-direction: column;
}

.rendered-content {
	p {
		margin: 0;
		margin: var(--spacing-4xs) 0;
	}

	h1,
	h2,
	h3 {
		font-weight: var(--font-weight-bold);
		font-size: var(--font-size-xs);
		margin: var(--spacing-xs) 0 var(--spacing-4xs);
	}

	h4,
	h5,
	h6 {
		font-weight: var(--font-weight-bold);
		font-size: var(--font-size-2xs);
	}

	ul,
	ol {
		margin: var(--spacing-4xs) 0 var(--spacing-4xs) var(--spacing-l);

		ul,
		ol {
			margin-left: var(--spacing-xs);
			margin-top: var(--spacing-4xs);
		}
	}

	:global(.table-wrapper) {
		overflow-x: auto;
	}

	table {
		margin: var(--spacing-4xs) 0;

		th {
			white-space: nowrap;
			min-width: 120px;
			width: auto;
		}

		th,
		td {
			border: var(--border-base);
			padding: var(--spacing-4xs);
		}
	}
}

.endOfSessionText {
	margin-top: var(--spacing-l);
	padding-top: var(--spacing-3xs);
	border-top: var(--border-base);
	color: var(--color-text-base);

	> button,
	> span {
		margin-right: var(--spacing-3xs);
	}

	button {
		display: inline-flex;
	}
}

.disabledInput {
	cursor: not-allowed;

	* {
		cursor: not-allowed;
	}
}
</style>
