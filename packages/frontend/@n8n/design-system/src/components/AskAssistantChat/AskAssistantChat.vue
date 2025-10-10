<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, useCssModule, watch } from 'vue';

import MessageWrapper from './messages/MessageWrapper.vue';
import { useI18n } from '../../composables/useI18n';
import type { ChatUI, RatingFeedback, WorkflowSuggestion } from '../../types/assistant';
import { isToolMessage } from '../../types/assistant';
import AssistantIcon from '../AskAssistantIcon/AssistantIcon.vue';
import AssistantLoadingMessage from '../AskAssistantLoadingMessage/AssistantLoadingMessage.vue';
import AssistantText from '../AskAssistantText/AssistantText.vue';
import InlineAskAssistantButton from '../InlineAskAssistantButton/InlineAskAssistantButton.vue';
import N8nButton from '../N8nButton';
import N8nIcon from '../N8nIcon';
import N8nPromptInput from '../N8nPromptInput';
import N8nPromptInputSuggestions from '../N8nPromptInputSuggestions';
import N8nScrollArea from '../N8nScrollArea/N8nScrollArea.vue';
import { getSupportedMessageComponent } from './messages/helpers';

const { t } = useI18n();

interface Props {
	user?: {
		firstName: string;
		lastName: string;
	};
	messages?: ChatUI.AssistantMessage[];
	streaming?: boolean;
	disabled?: boolean;
	loadingMessage?: string;
	sessionId?: string;
	inputPlaceholder?: string;
	scrollOnNewMessage?: boolean;
	showStop?: boolean;
	creditsQuota?: number;
	creditsRemaining?: number;
	showAskOwnerTooltip?: boolean;
	maxCharacterLength?: number;
	suggestions?: WorkflowSuggestion[];
}

const emit = defineEmits<{
	close: [];
	stop: [];
	message: [string, string?, boolean?];
	codeReplace: [number];
	codeUndo: [number];
	feedback: [RatingFeedback];
	'upgrade-click': [];
}>();

const onClose = () => emit('close');

const props = withDefaults(defineProps<Props>(), {
	user: () => ({
		firstName: '',
		lastName: '',
	}),
	messages: () => [],
	loadingMessage: undefined,
	sessionId: undefined,
	scrollOnNewMessage: false,
	maxCharacterLength: undefined,
	inputPlaceholder: undefined,
});

function normalizeMessages(messages: ChatUI.AssistantMessage[]): ChatUI.AssistantMessage[] {
	return messages.map((msg, index) => ({
		...msg,
		id: msg.id || `msg-${index}`,
		read: msg.read ?? true,
	}));
}

// filter out these messages so that tool collapsing works correctly
function filterOutHiddenMessages(messages: ChatUI.AssistantMessage[]): ChatUI.AssistantMessage[] {
	return messages.filter(
		(message) => Boolean(getSupportedMessageComponent(message.type)) || message.type === 'custom',
	);
}

function collapseToolMessages(messages: ChatUI.AssistantMessage[]): ChatUI.AssistantMessage[] {
	const result: ChatUI.AssistantMessage[] = [];
	let i = 0;

	while (i < messages.length) {
		const currentMsg = messages[i];

		// If it's not a tool message, add it as-is and continue
		if (!isToolMessage(currentMsg)) {
			result.push(currentMsg);
			i++;
			continue;
		}

		// Collect consecutive tool messages with the same toolName
		const toolMessagesGroup = [currentMsg];
		let j = i + 1;

		while (j < messages.length) {
			const nextMsg = messages[j];
			if (isToolMessage(nextMsg) && nextMsg.toolName === currentMsg.toolName) {
				toolMessagesGroup.push(nextMsg);
				j++;
			} else {
				break;
			}
		}

		// If we have multiple tool messages with the same toolName, collapse them
		if (toolMessagesGroup.length > 1) {
			// Determine the status to show based on priority rules
			const lastMessage = toolMessagesGroup[toolMessagesGroup.length - 1];
			let titleSource = lastMessage;

			// Check if we have running messages - if so, show the last running one and use its titles
			const runningMessages = toolMessagesGroup.filter((msg) => msg.status === 'running');
			const errorMessage = toolMessagesGroup.find((msg) => msg.status === 'error');
			if (runningMessages.length > 0) {
				const lastRunning = runningMessages[runningMessages.length - 1];
				titleSource = lastRunning;
			} else if (errorMessage) {
				titleSource = errorMessage;
			}

			// Combine all updates from all messages in the group
			const combinedUpdates = toolMessagesGroup.flatMap((msg) => msg.updates || []);

			// Create collapsed message using last message as base, but with titles from titleSource
			const collapsedMessage: ChatUI.ToolMessage = {
				...lastMessage,
				displayTitle: titleSource.displayTitle,
				customDisplayTitle:
					titleSource.status === 'running' ? titleSource.customDisplayTitle : undefined,
				status: titleSource.status,
				updates: combinedUpdates,
			};

			result.push(collapsedMessage);
		} else {
			// Single tool message, add as-is
			result.push(currentMsg);
		}

		i = j;
	}

	return result;
}

// Ensure all messages have required id and read properties, and collapse tool messages
const normalizedMessages = computed(() => {
	const normalized = normalizeMessages(props.messages);
	return collapseToolMessages(filterOutHiddenMessages(normalized));
});

// Get quickReplies from the last message in the original messages (before filtering)
const lastMessageQuickReplies = computed(() => {
	if (!props.messages?.length || props.streaming) return [];

	const lastMessage = props.messages[props.messages.length - 1];
	return 'quickReplies' in lastMessage && lastMessage.quickReplies?.length
		? lastMessage.quickReplies
		: [];
});

const textInputValue = ref<string>('');
const promptInputRef = ref<InstanceType<typeof N8nPromptInput>>();
const scrollAreaRef = ref<InstanceType<typeof N8nScrollArea>>();

const messagesRef = ref<HTMLDivElement | null>(null);
const inputWrapperRef = ref<HTMLDivElement | null>(null);

const sessionEnded = computed(() => {
	return isEndOfSessionEvent(props.messages?.[props.messages.length - 1]);
});

const sendDisabled = computed(() => {
	return !textInputValue.value || props.streaming || sessionEnded.value || props.disabled;
});

const showPlaceholder = computed(() => {
	return !props.messages?.length && !props.loadingMessage && !props.sessionId;
});

const showSuggestions = computed(() => {
	return showPlaceholder.value && props.suggestions && props.suggestions.length > 0;
});

const showBottomInput = computed(() => {
	// Hide bottom input when showing suggestions (blank state with suggestions)
	return !showSuggestions.value;
});

function isEndOfSessionEvent(event?: ChatUI.AssistantMessage) {
	return event?.type === 'event' && event?.eventName === 'end-session';
}

async function onSuggestionClick(suggestion: WorkflowSuggestion) {
	// Populate the input field with the suggestion so user can edit before submitting
	textInputValue.value = suggestion.prompt;
	// Wait for the input to update its height before focusing
	await nextTick();
	// Wait one more frame to ensure DOM is fully updated
	await new Promise(requestAnimationFrame);
	// Focus the input so user can edit it
	promptInputRef.value?.focusInput();
}

function onQuickReply(opt: ChatUI.QuickReply) {
	emit('message', opt.text, opt.type, opt.isFeedback);
}

function onSendMessage() {
	emit('message', textInputValue.value);
	textInputValue.value = '';
}

function onRateMessage(feedback: RatingFeedback) {
	emit('feedback', feedback);
}

function scrollToBottom() {
	scrollAreaRef.value?.scrollToBottom({ smooth: true });
}

function isScrolledToBottom(): boolean {
	const position = scrollAreaRef.value?.getScrollPosition();
	if (!position) return false;

	const threshold = 10; // Allow for small rounding errors
	const isAtBottom =
		Math.abs(
			position.height - position.top - (messagesRef.value?.parentElement?.clientHeight || 0),
		) <= threshold;

	return isAtBottom;
}

function scrollToBottomImmediate() {
	scrollAreaRef.value?.scrollToBottom({ smooth: false });
}

watch(sendDisabled, () => {
	promptInputRef.value?.focusInput();
});

watch(
	() => props.messages,
	async (messages) => {
		// Check if the last message is user and scroll to bottom of the chat
		if (props.scrollOnNewMessage && messages.length > 0) {
			// Wait for DOM updates before scrolling
			await nextTick();
			scrollToBottom();
		}
	},
	{ immediate: true, deep: true },
);

// Setup ResizeObserver to maintain scroll position when input height changes
let resizeObserver: ResizeObserver | null = null;
let scrollLockActive = false;
let scrollHandler: (() => void) | null = null;
let userIsAtBottom = true;
let isMounted = true;

function setupInputObservers() {
	if (!isMounted) {
		return;
	}

	if (!inputWrapperRef.value || !scrollAreaRef.value || !('ResizeObserver' in window)) {
		return;
	}

	// Clean up any existing observers first
	cleanupInputObservers();

	// Reset state
	userIsAtBottom = true;

	// Get the viewport element to attach scroll listener
	const viewport = messagesRef.value?.parentElement;
	if (!viewport) return;

	// Create scroll handler function so we can remove it later
	scrollHandler = () => {
		if (!scrollLockActive) {
			userIsAtBottom = isScrolledToBottom();
		}
	};

	// Monitor user scrolling
	viewport.addEventListener('scroll', scrollHandler);

	// Monitor input size changes
	resizeObserver = new ResizeObserver(() => {
		if (!isMounted) {
			return;
		}

		// Only maintain scroll if user was at bottom
		if (userIsAtBottom) {
			scrollLockActive = true;
			// Double RAF for layout stability
			requestAnimationFrame(() => {
				if (!isMounted) {
					return;
				}
				requestAnimationFrame(() => {
					if (!isMounted) {
						return;
					}
					scrollToBottomImmediate();
					// Check if we're still at bottom after auto-scroll
					userIsAtBottom = isScrolledToBottom();
					scrollLockActive = false;
				});
			});
		}
	});

	resizeObserver.observe(inputWrapperRef.value);

	// Start at bottom
	scrollToBottomImmediate();
}

function cleanupInputObservers() {
	const viewport = messagesRef.value?.parentElement;
	if (scrollHandler && viewport) {
		viewport.removeEventListener('scroll', scrollHandler);
		scrollHandler = null;
	}
	if (resizeObserver) {
		resizeObserver.disconnect();
		resizeObserver = null;
	}
}

// Watch for when the input becomes available and set up observers
watch(
	showBottomInput,
	async (isShown) => {
		if (isShown) {
			// Wait for the input to be mounted in the DOM
			await nextTick();
			setupInputObservers();
		} else {
			// Clean up when input is hidden
			cleanupInputObservers();
		}
	},
	{ immediate: true },
);

onUnmounted(() => {
	isMounted = false;
	cleanupInputObservers();
});

function getMessageStyles(message: ChatUI.AssistantMessage, messageCount: number) {
	const $style = useCssModule();
	return {
		[$style.firstToolMessage]:
			message.type === 'tool' &&
			(messageCount === 0 || normalizedMessages.value[messageCount - 1].type !== 'tool'),
		[$style.lastToolMessage]:
			message.type === 'tool' &&
			((messageCount === normalizedMessages.value.length - 1 && !props.loadingMessage) ||
				(messageCount < normalizedMessages.value.length - 1 &&
					normalizedMessages.value[messageCount + 1]?.type !== 'tool')),
	};
}

function getMessageColor(message: ChatUI.AssistantMessage): string | undefined {
	if (message.type === 'text' && message.role === 'assistant') {
		const isTaskAbortedMessage = message.content === t('aiAssistant.builder.streamAbortedMessage');
		if (isTaskAbortedMessage) {
			return 'var(--color--text)';
		}
	}
	return undefined;
}

defineExpose({
	focusInput: () => {
		promptInputRef.value?.focusInput();
	},
});
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.header">
			<div :class="$style.chatTitle">
				<div :class="$style.headerText">
					<div :class="$style.assistantTitle">
						<AssistantIcon size="large" />
						<AssistantText size="large" :text="t('assistantChat.aiAssistantLabel')" />
					</div>
					<span :class="$style.betaTag">{{ t('assistantChat.aiAssistantBetaLabel') }}</span>
				</div>
				<slot name="header" />
			</div>
			<div :class="$style.back" data-test-id="close-chat-button" @click="onClose">
				<N8nIcon icon="arrow-right" color="text-base" />
			</div>
		</div>
		<div :class="$style.body">
			<div v-if="normalizedMessages?.length || loadingMessage" :class="$style.messages">
				<N8nScrollArea
					ref="scrollAreaRef"
					type="hover"
					:enable-vertical-scroll="true"
					:enable-horizontal-scroll="false"
				>
					<div ref="messagesRef" :class="$style.messagesContent">
						<div v-if="normalizedMessages?.length">
							<data
								v-for="(message, i) in normalizedMessages"
								:key="message.id"
								:data-test-id="
									message.role === 'assistant' ? 'chat-message-assistant' : 'chat-message-user'
								"
							>
								<MessageWrapper
									:message="message"
									:is-first-of-role="i === 0 || message.role !== normalizedMessages[i - 1].role"
									:user="user"
									:streaming="streaming"
									:is-last-message="i === normalizedMessages.length - 1"
									:class="getMessageStyles(message, i)"
									:color="getMessageColor(message)"
									@code-replace="() => emit('codeReplace', i)"
									@code-undo="() => emit('codeUndo', i)"
									@feedback="onRateMessage"
								>
									<template v-if="$slots['custom-message']" #custom-message="customMessageProps">
										<slot name="custom-message" v-bind="customMessageProps" />
									</template>
								</MessageWrapper>

								<div
									v-if="lastMessageQuickReplies.length && i === normalizedMessages.length - 1"
									:class="$style.quickReplies"
								>
									<div :class="$style.quickRepliesTitle">
										{{ t('assistantChat.quickRepliesTitle') }}
									</div>
									<div
										v-for="opt in lastMessageQuickReplies"
										:key="opt.type"
										data-test-id="quick-replies"
									>
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
							<slot name="messagesFooter" />
						</div>
						<div
							v-if="loadingMessage"
							:class="{
								[$style.message]: true,
								[$style.loading]: normalizedMessages?.length,
								[$style.firstToolMessage]:
									normalizedMessages?.length === 0 ||
									normalizedMessages[normalizedMessages.length - 1].type !== 'tool',
								[$style.lastToolMessage]: true,
							}"
						>
							<AssistantLoadingMessage :message="loadingMessage" />
						</div>
					</div>
				</N8nScrollArea>
			</div>
			<div
				v-else-if="showPlaceholder"
				:class="$style.placeholder"
				data-test-id="placeholder-message"
			>
				<div v-if="showSuggestions" :class="$style.suggestionsContainer">
					<N8nPromptInputSuggestions
						:suggestions="suggestions"
						:disabled="disabled"
						:streaming="streaming"
						@suggestion-click="onSuggestionClick"
					>
						<template #prompt-input>
							<N8nPromptInput
								ref="promptInputRef"
								v-model="textInputValue"
								:placeholder="t('assistantChat.blankStateInputPlaceholder')"
								:disabled="disabled"
								:streaming="streaming"
								:credits-quota="creditsQuota"
								:credits-remaining="creditsRemaining"
								:show-ask-owner-tooltip="showAskOwnerTooltip"
								:max-length="maxCharacterLength"
								:min-lines="2"
								data-test-id="chat-suggestions-input"
								@upgrade-click="emit('upgrade-click')"
								@submit="onSendMessage"
								@stop="emit('stop')"
							/>
						</template>
					</N8nPromptInputSuggestions>
				</div>
				<div v-else-if="$slots.placeholder" :class="$style.info">
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
			v-if="showBottomInput"
			ref="inputWrapperRef"
			:class="{ [$style.inputWrapper]: true, [$style.disabledInput]: sessionEnded }"
			data-test-id="chat-input-wrapper"
		>
			<div v-if="$slots.inputPlaceholder" :class="$style.inputPlaceholder">
				<slot name="inputPlaceholder" />
			</div>
			<N8nPromptInput
				v-else
				ref="promptInputRef"
				v-model="textInputValue"
				:placeholder="inputPlaceholder || t('assistantChat.inputPlaceholder')"
				:disabled="sessionEnded || disabled"
				:streaming="streaming"
				:credits-quota="creditsQuota"
				:credits-remaining="creditsRemaining"
				:show-ask-owner-tooltip="showAskOwnerTooltip"
				:max-length="maxCharacterLength"
				:refocus-after-send="true"
				data-test-id="chat-input"
				@upgrade-click="emit('upgrade-click')"
				@submit="onSendMessage"
				@stop="emit('stop')"
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
	background-color: var(--color--background--light-2);
}

.header {
	height: 65px; // same as header height in editor
	padding: 0 var(--spacing--lg);
	background-color: var(--color--background--light-3);
	border: var(--border);
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

.betaTag {
	color: var(--color--text);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
}

.body {
	background-color: var(--color--background--light-2);
	border: var(--border);
	border-top: 0;
	border-bottom: 0;
	position: relative;

	pre,
	code {
		text-wrap: wrap;
	}
}

.placeholder {
	padding: var(--spacing--sm);
	height: 100%;
	display: flex;
	flex-direction: column;
	justify-content: center;
}

.suggestionsContainer {
	display: flex;
	justify-content: center;
	align-items: center;
	width: 100%;
	height: 100%;
	padding: 0;
}

.messages {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
}

.messagesContent {
	padding: var(--spacing--xs);
	padding-bottom: var(--spacing--xl); // Extra padding for fade area
}

.message {
	margin-bottom: var(--spacing--sm);
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--xl);
}

.firstToolMessage {
	margin-top: var(--spacing--md);
}

.lastToolMessage {
	margin-bottom: var(--spacing--lg);
}

.chatTitle {
	display: flex;
	gap: var(--spacing--xs);
}

.headerText {
	gap: var(--spacing--3xs);
}

.assistantTitle {
	gap: var(--spacing--2xs);
}

.greeting {
	color: var(--color--text--shade-1);
	font-size: var(--font-size--md);
	margin-bottom: var(--spacing--sm);
}

.info {
	font-size: var(--font-size--sm);
	color: var(--color--text);

	button {
		display: inline-flex;
	}
}

.back:hover {
	cursor: pointer;
}

.quickReplies {
	margin-top: var(--spacing--sm);

	> * {
		margin-bottom: var(--spacing--3xs);
	}
}

.quickRepliesTitle {
	font-size: var(--font-size--3xs);
	color: var(--color--text);
}

.inputWrapper {
	padding: var(--spacing--4xs) var(--spacing--2xs) var(--spacing--xs);
	background-color: transparent;
	width: 100%;
	position: relative;
	border-left: var(--border);
	border-right: var(--border);

	// Add a gradient fade from the chat to the input
	&::before {
		content: '';
		position: absolute;
		top: calc(-1 * var(--spacing--md));
		left: 0;
		right: var(--spacing--xs);
		height: var(--spacing--md);
		background: linear-gradient(to bottom, transparent 0%, var(--color--background--light-2) 100%);
		pointer-events: none;
		z-index: 1;
	}
}

.disabledInput {
	cursor: not-allowed;

	* {
		cursor: not-allowed;
	}
}

.inputPlaceholder {
	width: 100%;
}
</style>
