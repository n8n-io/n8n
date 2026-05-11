<script setup lang="ts">
import { computed, nextTick, onMounted, ref, useTemplateRef, watch } from 'vue';
import { N8nIcon } from '@n8n/design-system';
import ChatMarkdownChunk from '@/features/ai/chatHub/components/ChatMarkdownChunk.vue';
import ChatTypingIndicator from '@/features/ai/chatHub/components/ChatTypingIndicator.vue';
import {
	buildDisplayGroups,
	type ChatMessage,
	type InteractivePayload,
} from '../composables/agentChatMessages';
import AgentChatToolSteps from './AgentChatToolSteps.vue';
import InteractiveCard from './interactive/InteractiveCard.vue';
import { CHAT_MESSAGE_STATUS } from '../constants';

const props = defineProps<{
	messages: ChatMessage[];
	messagingState: 'idle' | 'waitingFirstChunk' | 'receiving';
	projectId?: string;
	agentId?: string;
}>();

const emit = defineEmits<{
	resume: [payload: { runId: string; toolCallId: string; resumeData: unknown }];
}>();

function onInteractiveSubmit(payload: InteractivePayload, resumeData: unknown) {
	// Cards without a runId are disabled at the card level (see InteractiveCard).
	// This guard is a defensive belt-and-braces for the type narrowing.
	if (!payload.runId) return;
	emit('resume', { runId: payload.runId, toolCallId: payload.toolCallId, resumeData });
}

const scrollRef = useTemplateRef<HTMLDivElement>('scrollRef');

const displayGroups = computed(() => buildDisplayGroups(props.messages));

// How close to the bottom the user has to be for incoming chunks to keep
// following them. Small enough that a deliberate scroll-up breaks the lock,
// large enough that sub-pixel DOM growth during markdown rendering doesn't
// falsely count as "scrolled up".
const SCROLL_STICK_THRESHOLD_PX = 80;

/**
 * True when the user is (or was last) near the bottom of the chat and wants
 * incoming stream chunks to keep scrolling into view. Flipped to false when
 * the user scrolls up away from the bottom, and back to true when they
 * scroll back down or send a new message.
 */
const isStickToBottom = ref(true);

function isNearBottom(): boolean {
	const el = scrollRef.value;
	if (!el) return true;
	return el.scrollHeight - el.scrollTop - el.clientHeight <= SCROLL_STICK_THRESHOLD_PX;
}

function onScroll(): void {
	isStickToBottom.value = isNearBottom();
}

function scrollToBottom(): void {
	void nextTick(() => {
		// Double rAF — async children (markdown, highlighters) can grow content
		// after the first frame, so we measure on the second one.
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				if (scrollRef.value) {
					scrollRef.value.scrollTop = scrollRef.value.scrollHeight;
					isStickToBottom.value = true;
				}
			});
		});
	});
}

function autoScrollIfSticky(): void {
	if (isStickToBottom.value) scrollToBottom();
}

// Snap to the bottom on initial render with a preloaded history. Two hooks on
// purpose: the watcher with `immediate: true` fires after setup / initial
// render, and `onMounted` covers cases where the post-flush scroll measured an
// incomplete height because async content (markdown, highlighters) was still
// expanding.
onMounted(() => {
	if (props.messages.length > 0) scrollToBottom();
});

// New message appended. If it's the user's own message we always follow to
// the bottom (they just sent — they want to see the response). For
// assistant messages and state transitions, follow only if the user is
// sticking to the bottom.
watch(
	() => props.messages.length,
	(newLen, oldLen) => {
		if ((oldLen ?? 0) < newLen) {
			const last = props.messages[newLen - 1];
			if (last?.role === 'user') {
				scrollToBottom();
				return;
			}
		}
		autoScrollIfSticky();
	},
	{ flush: 'post' },
);

watch(() => props.messagingState, autoScrollIfSticky, { flush: 'post' });

// Content within the last message grew (streaming text, tool calls, thinking).
// Only follow the stream down if the user is still near the bottom — otherwise
// we yank them away from whatever they scrolled up to read.
watch(
	() => {
		const last = props.messages[props.messages.length - 1];
		if (!last) return '';
		return `${last.content}|${last.toolCalls?.length ?? 0}|${last.thinking ?? ''}`;
	},
	autoScrollIfSticky,
	{ flush: 'post' },
);
</script>

<template>
	<div ref="scrollRef" :class="$style.messages" @scroll.passive="onScroll">
		<template v-for="group in displayGroups" :key="group.id">
			<div v-if="group.kind === 'toolRun'" :class="[$style.message, $style.assistant]">
				<div :class="$style.content">
					<details v-if="group.thinking" :class="$style.thinkingBlock">
						<summary :class="$style.thinkingSummary">
							<N8nIcon icon="brain" :size="12" />
							Thinking...
						</summary>
						<div :class="$style.thinkingContent">{{ group.thinking }}</div>
					</details>
					<AgentChatToolSteps v-if="group.toolCalls.length" :tool-calls="group.toolCalls" />
					<div v-if="group.interactives.some((p) => !p.resolvedAt)" :class="$style.interactives">
						<InteractiveCard
							v-for="payload in group.interactives.filter((p) => !p.resolvedAt)"
							:key="payload.toolCallId"
							:payload="payload"
							:project-id="projectId"
							:agent-id="agentId"
							@submit="onInteractiveSubmit(payload, $event)"
						/>
					</div>
					<div
						v-if="group.finalMessage?.content"
						:class="[
							$style.chatMessage,
							{ [$style.chatMessageError]: group.finalMessage.status === 'error' },
						]"
					>
						<div :class="$style.markdownContent">
							<ChatMarkdownChunk
								:source="{ type: 'text', content: group.finalMessage.content }"
								@open-artifact="() => {}"
							/>
						</div>
					</div>
					<ChatTypingIndicator
						v-if="
							group.finalMessage?.status === CHAT_MESSAGE_STATUS.STREAMING &&
							!group.finalMessage.content &&
							!group.toolCalls.length
						"
						:class="$style.typingIndicator"
					/>
				</div>
			</div>
			<div
				v-else
				:class="[$style.message, group.message.role === 'user' ? $style.user : $style.assistant]"
			>
				<div :class="$style.content">
					<details v-if="group.message.thinking" :class="$style.thinkingBlock">
						<summary :class="$style.thinkingSummary">
							<N8nIcon icon="brain" :size="12" />
							Thinking...
						</summary>
						<div :class="$style.thinkingContent">{{ group.message.thinking }}</div>
					</details>
					<AgentChatToolSteps
						v-if="group.message.toolCalls?.length"
						:tool-calls="group.message.toolCalls"
					/>

					<div
						v-if="group.message.role === 'user'"
						:class="[$style.chatMessage, $style.chatMessageUser]"
					>
						{{ group.message.content }}
					</div>
					<div
						v-else-if="group.message.content"
						:class="[
							$style.chatMessage,
							{ [$style.chatMessageError]: group.message.status === 'error' },
						]"
					>
						<div :class="$style.markdownContent">
							<ChatMarkdownChunk
								:source="{ type: 'text', content: group.message.content }"
								@open-artifact="() => {}"
							/>
						</div>
					</div>

					<div
						v-if="group.message.interactive && !group.message.interactive.resolvedAt"
						:class="$style.interactives"
					>
						<InteractiveCard
							:payload="group.message.interactive"
							:project-id="projectId"
							:agent-id="agentId"
							@submit="onInteractiveSubmit(group.message.interactive, $event)"
						/>
					</div>
					<ChatTypingIndicator
						v-if="
							group.message.role === 'assistant' &&
							group.message.status === CHAT_MESSAGE_STATUS.STREAMING &&
							!group.message.content &&
							!group.message.toolCalls?.length
						"
						:class="$style.typingIndicator"
					/>
				</div>
			</div>
		</template>

		<div v-if="messagingState === 'waitingFirstChunk'" :class="$style.message">
			<div :class="$style.content">
				<ChatTypingIndicator :class="$style.typingIndicator" />
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.messages {
	flex: 1;
	min-height: 0;
	overflow-y: auto;
	padding: var(--spacing--lg) var(--spacing--md) var(--spacing--sm);
	padding-bottom: var(--spacing--xl);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
	scrollbar-width: none;

	mask-image: linear-gradient(to bottom, transparent 0%, black 5%, black 95%, transparent 100%);

	&::-webkit-scrollbar {
		display: none;
	}
}

.message {
	padding-top: var(--spacing--4xs);
}

.content {
	display: flex;
	flex-direction: column;
	align-items: stretch;
}

.message.user .content {
	align-items: flex-end;
}

/**
 * Vertical stack for one or more interactive cards inside an assistant message.
 * Adds a small gap between adjacent cards (when a tool run produced several)
 * and a top margin so the cards don't sit flush against the tool-step list.
 */
.interactives {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	margin-top: var(--spacing--2xs);
}

.chatMessage {
	overflow-wrap: break-word;
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
}

.chatMessageUser {
	padding: var(--spacing--2xs) var(--spacing--sm);
	border-radius: var(--radius--xl);
	background-color: var(--background--subtle);
	white-space: pre-wrap;
	width: fit-content;
	max-width: 100%;
}

.chatMessageError {
	padding: var(--spacing--xs) var(--spacing--sm);
	border-radius: var(--radius--lg);
	background-color: var(--background--danger);
	border: var(--border-width) var(--border-style) var(--border-color--danger);
	color: var(--text-color--danger);
}

.markdownContent {
	color: var(--text-color);
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);

	> *:last-child > *:last-child {
		margin-bottom: 0;
	}

	> *:first-child > *:first-child {
		margin-top: 0;
	}
}

.thinkingBlock {
	margin-bottom: var(--spacing--2xs);
	font-size: var(--font-size--2xs);
}

.thinkingSummary {
	cursor: pointer;
	color: var(--text-color--subtler);
	font-style: italic;
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.thinkingContent {
	margin: var(--spacing--4xs) 0 0;
	white-space: pre-wrap;
	font-family: inherit;
	font-size: var(--font-size--2xs);
	color: var(--text-color--subtle);
	max-height: 150px;
	overflow-y: auto;
	scrollbar-width: none;
}

.typingIndicator {
	margin-top: var(--spacing--xs);
}
</style>
