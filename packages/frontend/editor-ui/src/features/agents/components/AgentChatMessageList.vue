<script setup lang="ts">
import { computed, nextTick, useTemplateRef, watch } from 'vue';
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

function scrollToBottom(): void {
	void nextTick(() => {
		if (scrollRef.value) {
			scrollRef.value.scrollTop = scrollRef.value.scrollHeight;
		}
	});
}

// `immediate: true` covers the initial mount: when the list is conditionally
// rendered with messages already loaded, the length never transitions, so
// without immediate the first scrollToBottom never fires and the user lands
// at the top of a long history.
watch(
	() => [props.messages.length, props.messagingState],
	() => scrollToBottom(),
	{ flush: 'post', immediate: true },
);

// Scroll when content within the last message grows (streaming text).
watch(
	() => {
		const last = props.messages[props.messages.length - 1];
		if (!last) return '';
		return `${last.content}|${last.toolCalls?.length ?? 0}|${last.thinking ?? ''}`;
	},
	() => scrollToBottom(),
	{ flush: 'post' },
);
</script>

<template>
	<div ref="scrollRef" :class="$style.messages">
		<template v-for="group in displayGroups" :key="group.id">
			<div v-if="group.kind === 'toolRun'" :class="[$style.message, $style.assistant]">
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
					<AgentChatToolSteps :tool-calls="group.toolCalls" />
				</div>
			</div>
			<div
				v-else
				:class="[$style.message, group.message.role === 'user' ? $style.user : $style.assistant]"
			>
				<div :class="$style.avatar">
					<N8nIcon v-if="group.message.role === 'user'" icon="user" width="20" height="20" />
					<N8nIcon v-else icon="robot" width="20" height="20" />
				</div>
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
					<ChatTypingIndicator
						v-if="
							group.message.role === 'assistant' &&
							group.message.status === 'streaming' &&
							!group.message.content &&
							!group.message.toolCalls?.length
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
}

.message {
	position: relative;
	padding-left: 40px;
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

.content {
	display: flex;
	flex-direction: column;
	align-items: stretch;
}

.chatMessage {
	overflow-wrap: break-word;
	font-size: var(--font-size--md);
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
	font-size: var(--font-size--md);
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
