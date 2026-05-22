<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue';
import { N8nIcon } from '@n8n/design-system';
import { useSpeechSynthesis } from '@vueuse/core';
import ChatMarkdownChunk from '@/features/ai/chatHub/components/ChatMarkdownChunk.vue';
import ChatTypingIndicator from '@/features/ai/chatHub/components/ChatTypingIndicator.vue';
import {
	buildDisplayGroups,
	type ChatMessage,
	type DisplayGroup,
	type InteractivePayload,
} from '../composables/agentChatMessages';
import AgentChatMemoryUsed from './AgentChatMemoryUsed.vue';
import AgentChatToolSteps from './AgentChatToolSteps.vue';
import InteractiveCard from './interactive/InteractiveCard.vue';
import { CHAT_MESSAGE_STATUS } from '../constants';
import AgentChatMessageActions from './AgentChatMessageActions.vue';

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
	if (!payload.runId) return;
	emit('resume', { runId: payload.runId, toolCallId: payload.toolCallId, resumeData });
}

const scrollRef = useTemplateRef<HTMLDivElement>('scrollRef');

const displayGroups = computed(() => buildDisplayGroups(props.messages));

function getAssistantGroupContent(group: DisplayGroup): string {
	if (group.kind === 'toolRun') {
		return group.finalMessage?.content ?? '';
	}

	return group.message.role === 'assistant' ? group.message.content : '';
}

function isAssistantGroup(group: DisplayGroup): boolean {
	return group.kind === 'toolRun' || group.message.role === 'assistant';
}

function getAssistantRunContent(groupId: string): string {
	const index = displayGroups.value.findIndex((group) => group.id === groupId);
	if (index === -1) return '';

	const lines: string[] = [];
	for (let i = index; i >= 0; i--) {
		const group = displayGroups.value[i];
		if (!isAssistantGroup(group)) break;

		const content = getAssistantGroupContent(group).trim();
		if (content) lines.unshift(content);
	}

	return lines.join('\n\n');
}

function toEvidenceList(value: unknown): string[] {
	if (!Array.isArray(value)) return [];

	return value
		.flatMap((item) => {
			if (typeof item === 'string') return [item.trim()];
			if (!item || typeof item !== 'object') return [];

			const evidence =
				('evidence' in item && typeof item.evidence === 'string' && item.evidence) ||
				('evidenceText' in item && typeof item.evidenceText === 'string' && item.evidenceText) ||
				('text' in item && typeof item.text === 'string' && item.text) ||
				('content' in item && typeof item.content === 'string' && item.content) ||
				'';

			return evidence ? [evidence.trim()] : [];
		})
		.filter((item) => item.length > 0);
}

function parseMemoryOutput(
	output: unknown,
): Array<{ id: string; keyMemory: string; evidence: string[] }> {
	if (
		!output ||
		typeof output !== 'object' ||
		!('entries' in output) ||
		!Array.isArray(output.entries)
	) {
		return [];
	}

	return output.entries
		.flatMap((entry, index) => {
			if (!entry || typeof entry !== 'object') return [];
			const keyMemory =
				'content' in entry && typeof entry.content === 'string' ? entry.content.trim() : '';
			if (!keyMemory) return [];

			const evidence = [
				...('sources' in entry ? toEvidenceList(entry.sources) : []),
				...('evidence' in entry ? toEvidenceList(entry.evidence) : []),
			];

			return [
				{
					id:
						('id' in entry && typeof entry.id === 'string' && entry.id) || `${keyMemory}-${index}`,
					keyMemory,
					evidence,
				},
			];
		})
		.filter((memory) => memory.keyMemory.length > 0);
}

function isCompletedAssistantGroup(group: DisplayGroup): boolean {
	if (group.kind === 'toolRun') {
		return (
			group.finalMessage !== undefined &&
			group.finalMessage.status !== CHAT_MESSAGE_STATUS.STREAMING &&
			group.finalMessage.status !== CHAT_MESSAGE_STATUS.AWAITING_USER
		);
	}

	return (
		group.message.role === 'assistant' &&
		group.message.status !== CHAT_MESSAGE_STATUS.STREAMING &&
		group.message.status !== CHAT_MESSAGE_STATUS.AWAITING_USER
	);
}

function shouldShowAssistantFooter(groupId: string): boolean {
	if (props.messagingState !== 'idle') return false;

	const index = displayGroups.value.findIndex((group) => group.id === groupId);
	if (index === -1) return false;

	const group = displayGroups.value[index];
	if (!isAssistantGroup(group) || !isCompletedAssistantGroup(group)) return false;

	const nextGroup = displayGroups.value[index + 1];
	return !nextGroup || !isAssistantGroup(nextGroup);
}

function getMemoriesUsedInAssistantRun(groupId: string) {
	const index = displayGroups.value.findIndex((group) => group.id === groupId);
	if (index === -1) return [];

	for (let i = index; i >= 0; i--) {
		const group = displayGroups.value[i];
		if (!isAssistantGroup(group)) break;

		const toolCalls = group.kind === 'toolRun' ? group.toolCalls : (group.message.toolCalls ?? []);
		for (let j = toolCalls.length - 1; j >= 0; j--) {
			const toolCall = toolCalls[j];
			if (toolCall.tool !== 'recall_memory') continue;
			const memories = parseMemoryOutput(toolCall.output);
			if (memories.length > 0) return memories;
		}
	}

	return [];
}

const spokenMessageId = ref<string | null>(null);
const spokenText = computed(() => {
	if (!spokenMessageId.value) return '';
	return getAssistantRunContent(spokenMessageId.value);
});
const speech = useSpeechSynthesis(spokenText, {
	pitch: 1,
	rate: 1,
	volume: 1,
});
const isSpeechSynthesisAvailable = computed(() => speech.isSupported.value);

const SCROLL_STICK_THRESHOLD_PX = 80;
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

function isSpeakingMessage(messageId: string): boolean {
	return spokenMessageId.value === messageId && speech.status.value === 'play';
}

function toggleReadAloud(messageId: string): void {
	if (!isSpeechSynthesisAvailable.value) return;

	if (spokenMessageId.value === messageId && speech.status.value === 'play') {
		speech.stop();
		spokenMessageId.value = null;
		return;
	}

	speech.stop();
	spokenMessageId.value = messageId;
	speech.speak();
}

onMounted(() => {
	if (props.messages.length > 0) scrollToBottom();
});

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

watch(
	() => {
		const last = props.messages[props.messages.length - 1];
		if (!last) return '';
		return `${last.content}|${last.toolCalls?.length ?? 0}|${last.thinking ?? ''}`;
	},
	autoScrollIfSticky,
	{ flush: 'post' },
);

watch(
	() => speech.status.value,
	(status) => {
		if (status === 'end') {
			spokenMessageId.value = null;
		}
	},
);

watch(spokenText, (value) => {
	if (!value && spokenMessageId.value) {
		speech.stop();
		spokenMessageId.value = null;
	}
});

onBeforeUnmount(() => {
	speech.stop();
});
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
					<div v-if="shouldShowAssistantFooter(group.id)" :class="$style.messageFooter">
						<AgentChatMemoryUsed :memories="getMemoriesUsedInAssistantRun(group.id)" />
						<AgentChatMessageActions
							v-if="getAssistantRunContent(group.id)"
							:content="getAssistantRunContent(group.id)"
							:is-speech-synthesis-available="isSpeechSynthesisAvailable"
							:is-speaking="isSpeakingMessage(group.id)"
							@read-aloud="toggleReadAloud(group.id)"
						/>
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
					<div v-if="shouldShowAssistantFooter(group.id)" :class="$style.messageFooter">
						<AgentChatMemoryUsed :memories="getMemoriesUsedInAssistantRun(group.id)" />
						<AgentChatMessageActions
							v-if="getAssistantRunContent(group.id)"
							:content="getAssistantRunContent(group.id)"
							:is-speech-synthesis-available="isSpeechSynthesisAvailable"
							:is-speaking="isSpeakingMessage(group.id)"
							@read-aloud="toggleReadAloud(group.id)"
						/>
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
	gap: var(--spacing--sm);
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

.messageFooter {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	margin-top: var(--spacing--4xs);
}

.message.user .content {
	align-items: flex-end;
}

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
