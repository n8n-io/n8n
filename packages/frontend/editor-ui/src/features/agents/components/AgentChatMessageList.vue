<script setup lang="ts">
import { computed, nextTick, onMounted, ref, useTemplateRef, watch } from 'vue';
import { N8nIcon } from '@n8n/design-system';
import ChatMarkdownChunk from '@/features/ai/chatHub/components/ChatMarkdownChunk.vue';
import ChatTypingIndicator from '@/features/ai/chatHub/components/ChatTypingIndicator.vue';
import { buildDisplayGroups, type ChatMessage } from '../composables/agentChatMessages';
import AgentChatToolSteps from './AgentChatToolSteps.vue';

const props = defineProps<{
	messages: ChatMessage[];
	messagingState: 'idle' | 'waitingFirstChunk' | 'receiving';
}>();

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
			<div
				v-if="group.kind === 'message'"
				:class="[$style.message, group.message.role === 'user' ? $style.user : $style.assistant]"
			>
				<div :class="$style.avatar">
					<N8nIcon v-if="group.message.role === 'user'" icon="user" width="20" height="20" />
					<N8nIcon v-else icon="robot" width="20" height="20" />
				</div>
				<div :class="$style.content">
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
				</div>
			</div>
			<div v-else :class="[$style.message, $style.assistant]">
				<div :class="$style.avatar">
					<N8nIcon icon="robot" width="20" height="20" />
				</div>
				<div :class="$style.content">
					<details v-if="group.thinking" :class="$style.thinkingBlock">
						<summary :class="$style.thinkingSummary">
							<N8nIcon icon="brain" :size="12" />
							Thinking...
						</summary>
						<div :class="$style.thinkingContent">{{ group.thinking }}</div>
					</details>
					<AgentChatToolSteps v-if="group.toolCalls.length" :tool-calls="group.toolCalls" />
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
							group.finalMessage?.status === 'streaming' &&
							!group.finalMessage.content &&
							!group.toolCalls.length
						"
						:class="$style.typingIndicator"
					/>
				</div>
			</div>
		</template>

		<div v-if="messagingState === 'waitingFirstChunk'" :class="$style.message">
			<div :class="$style.avatar">
				<N8nIcon icon="robot" width="20" height="20" />
			</div>
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
	padding: var(--spacing--lg) var(--spacing--xl);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
	/* Slimmer scrollbar — still visible on hover/scroll but less intrusive. */
	scrollbar-width: thin;
	scrollbar-color: var(--color--foreground--shade-1) transparent;

	&::-webkit-scrollbar {
		width: 6px;
	}

	&::-webkit-scrollbar-track {
		background: transparent;
	}

	&::-webkit-scrollbar-thumb {
		background: var(--color--foreground--shade-1);
		border-radius: 999px;
	}
}

.message {
	position: relative;
	padding-top: var(--spacing--4xs);
	padding-left: 40px;
}

/* Flip user messages so the avatar sits on the right and the bubble aligns to
   that side. */
.message.user {
	padding-left: 0;
	padding-right: 40px;
}

.avatar {
	position: absolute;
	left: 0;
	top: 0;
	display: grid;
	place-items: center;
	width: 28px;
	height: 28px;
	border-radius: 50%;
	background: var(--color--background);
	color: var(--color--text--tint-1);
}

.message.user .avatar {
	left: auto;
	right: 0;
}

.content {
	display: flex;
	flex-direction: column;
	align-items: stretch;
}

.message.user .content {
	align-items: flex-end;
}

.chatMessage {
	overflow-wrap: break-word;
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
}

.chatMessageUser {
	padding: var(--spacing--2xs) var(--spacing--sm);
	border-radius: var(--radius--xl);
	background-color: var(--color--background);
	white-space: pre-wrap;
	width: fit-content;
	max-width: 100%;
}

.chatMessageError {
	padding: var(--spacing--xs) var(--spacing--sm);
	border-radius: var(--radius--lg);
	background-color: var(--color--danger--tint-4);
	border: var(--border-width) var(--border-style) var(--color--danger--tint-3);
	color: var(--color--danger);
}

.markdownContent {
	color: var(--color--text--shade-1);
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
	color: var(--color--text--tint-2);
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
	color: var(--color--text--tint-1);
	max-height: 150px;
	overflow-y: auto;
}

.typingIndicator {
	margin-top: var(--spacing--xs);
}
</style>
