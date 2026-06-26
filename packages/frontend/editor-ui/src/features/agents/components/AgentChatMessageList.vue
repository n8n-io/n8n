<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue';
import { N8nIcon, N8nText } from '@n8n/design-system';
import { useSpeechSynthesis } from '@vueuse/core';
import { N8N_CHAT_ACTION_TOOL_NAME } from '@n8n/api-types';
import { isAwaitingCard } from '@/features/ai/shared/agentsChat/n8nChatInteraction';
import { useI18n } from '@n8n/i18n';
import {
	buildDisplayGroups,
	type DisplayGroup,
} from '@/features/ai/shared/agentsChat/displayGroups';
import { getMessageInteractives, isRecord } from '@/features/ai/shared/agentsChat/messageMappers';
import type {
	ChatMessage,
	InteractivePayload,
	ToolCall,
} from '@/features/ai/shared/agentsChat/types';
import AgentChatMemoryUsed from './AgentChatMemoryUsed.vue';
import AgentChatMessageActions from './AgentChatMessageActions.vue';
import AgentChatToolSteps from './AgentChatToolSteps.vue';
import AgentMarkdownChunk from './AgentMarkdownChunk.vue';
import AgentTypingIndicator from './AgentTypingIndicator.vue';
import InteractiveCard from './interactive/InteractiveCard.vue';
import { CHAT_MESSAGE_STATUS, TOOL_CALL_STATE } from '../constants';

const props = defineProps<{
	messages: ChatMessage[];
	messagingState: 'idle' | 'waitingFirstChunk' | 'receiving';
	projectId?: string;
	agentId?: string;
}>();

const emit = defineEmits<{
	resume: [payload: { runId: string; toolCallId: string; resumeData: unknown }];
}>();

const i18n = useI18n();

function onInteractiveSubmit(payload: InteractivePayload, resumeData: unknown) {
	// Cards without a runId are disabled at the card level (see InteractiveCard).
	// This guard is a defensive belt-and-braces for the type narrowing.
	if (!payload.runId) return;
	emit('resume', { runId: payload.runId, toolCallId: payload.toolCallId, resumeData });
}

function isIntegrationActionSuspend(value: unknown): value is { type: 'integration_action' } {
	return isRecord(value) && value.type === 'integration_action';
}

/**
 * Returns a display name for the external platform a tool call is waiting on,
 * or `undefined` when the tool call either isn't suspended or renders its own
 * interactive card. Builder tools never match (their suspend payload is their
 * renderable input, not an integration_action sidecar); n8n_chat_action DOES
 * carry the sidecar but is excluded explicitly because it renders its own
 * interactive card in the chat.
 */
function externalWaitPlatform(tc: ToolCall): string | undefined {
	if (tc.state !== TOOL_CALL_STATE.SUSPENDED) return undefined;
	if (tc.tool === N8N_CHAT_ACTION_TOOL_NAME) return undefined;
	if (!isIntegrationActionSuspend(tc.suspendPayload)) return undefined;
	const base = tc.tool.replace(/_action$/, '').replace(/_\d+$/, '');
	return base.charAt(0).toUpperCase() + base.slice(1);
}

/**
 * Open cards always render. Once resolved, answered interactive cards clear
 * from the chat (builder cards collapse into their tool-step summary; n8n
 * chat cards leave the picked answer there too) — but display-only n8n chat
 * cards persist: they are content, and being born resolved they would
 * otherwise never render at all.
 */
function shouldRenderInteractive(payload: InteractivePayload): boolean {
	if (!payload.resolvedAt) return !!payload.runId;
	return payload.toolName === N8N_CHAT_ACTION_TOOL_NAME && !isAwaitingCard(payload.input.card);
}

function getRenderableInteractives(message: ChatMessage): InteractivePayload[] {
	return getMessageInteractives(message).filter(shouldRenderInteractive);
}

type MessageRenderItem =
	| { type: 'text'; key: string; text: string }
	| { type: 'interactive'; key: string; payload: InteractivePayload };

function getMessageRenderItems(message: ChatMessage): MessageRenderItem[] {
	const renderableInteractives = getRenderableInteractives(message);
	const renderableByToolCallId = new Map(
		renderableInteractives.map((payload) => [payload.toolCallId, payload]),
	);

	if (!message.renderParts?.length) {
		return [
			...(message.content ? [{ type: 'text' as const, key: 'text', text: message.content }] : []),
			...renderableInteractives.map((payload) => ({
				type: 'interactive' as const,
				key: `interactive-${payload.toolCallId}`,
				payload,
			})),
		];
	}

	const items: MessageRenderItem[] = [];
	const renderedInteractiveIds = new Set<string>();
	for (const [index, part] of message.renderParts.entries()) {
		if (part.type === 'text') {
			if (part.text) items.push({ type: 'text', key: `text-${index}`, text: part.text });
			continue;
		}

		const payload = renderableByToolCallId.get(part.toolCallId);
		if (!payload) continue;
		renderedInteractiveIds.add(payload.toolCallId);
		items.push({ type: 'interactive', key: `interactive-${payload.toolCallId}`, payload });
	}

	for (const payload of renderableInteractives) {
		if (renderedInteractiveIds.has(payload.toolCallId)) continue;
		items.push({ type: 'interactive', key: `interactive-${payload.toolCallId}`, payload });
	}

	return items;
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

interface RecallMemoryOutputEntry {
	id: string;
	content: string;
}

function getRecallMemoryEntries(output: unknown): RecallMemoryOutputEntry[] {
	if (!output || typeof output !== 'object') return [];
	if (!('entries' in output) || !Array.isArray(output.entries)) return [];

	const entries: RecallMemoryOutputEntry[] = [];

	for (const [index, entry] of output.entries.entries()) {
		if (!entry || typeof entry !== 'object') continue;
		if (!('content' in entry) || typeof entry.content !== 'string') continue;

		const id =
			'id' in entry && typeof entry.id === 'string'
				? entry.id
				: 'createdAt' in entry && typeof entry.createdAt === 'string'
					? entry.createdAt
					: `${entry.content}:${index}`;
		entries.push({ id, content: entry.content });
	}

	return entries;
}

interface MemoryUsed {
	id: string;
	keyMemory: string;
	evidence: string[];
}

function parseMemoryOutput(output: unknown): MemoryUsed[] {
	return getRecallMemoryEntries(output)
		.map((entry) => ({
			id: entry.id,
			keyMemory: entry.content.trim(),
			evidence: [],
		}))
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
	const index = displayGroups.value.findIndex((group) => group.id === groupId);
	if (index === -1) return false;

	const group = displayGroups.value[index];
	if (!isAssistantGroup(group) || !isCompletedAssistantGroup(group)) return false;

	const nextGroup = displayGroups.value[index + 1];
	return !nextGroup || !isAssistantGroup(nextGroup);
}

function getMemoriesUsedInAssistantRun(groupId: string): MemoryUsed[] {
	const index = displayGroups.value.findIndex((group) => group.id === groupId);
	if (index === -1) return [];

	const memories: MemoryUsed[] = [];
	const memoryIds = new Set<string>();

	for (let i = index; i >= 0; i--) {
		const group = displayGroups.value[i];
		if (!isAssistantGroup(group)) break;

		const toolCalls = group.kind === 'toolRun' ? group.toolCalls : (group.message.toolCalls ?? []);
		for (let j = toolCalls.length - 1; j >= 0; j--) {
			const toolCall = toolCalls[j];
			if (toolCall.tool !== 'recall_memory') continue;

			const uniqueMemories = parseMemoryOutput(toolCall.output).filter((memory) => {
				if (memoryIds.has(memory.id)) return false;
				memoryIds.add(memory.id);
				return true;
			});
			memories.unshift(...uniqueMemories);
		}
	}

	return memories;
}

const openMemoryFooterGroupId = ref<string | null>(null);

function setMemoryFooterOpen(groupId: string, open: boolean): void {
	openMemoryFooterGroupId.value = open
		? groupId
		: openMemoryFooterGroupId.value === groupId
			? null
			: openMemoryFooterGroupId.value;
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
		return `${last.content}|${last.toolCalls?.length ?? 0}|${getMessageInteractives(last).length}|${
			last.thinking ?? ''
		}`;
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
					<AgentChatToolSteps
						v-if="group.toolCalls.length"
						:tool-calls="group.toolCalls"
						:project-id="projectId"
					/>
					<template v-for="tc in group.toolCalls" :key="`wait-${tc.toolCallId}`">
						<N8nText
							v-if="externalWaitPlatform(tc)"
							size="small"
							color="text-light"
							data-testid="agent-chat-external-wait"
						>
							{{
								i18n.baseText('agents.chat.waitingExternal', {
									interpolate: { platform: externalWaitPlatform(tc)! },
								})
							}}
						</N8nText>
					</template>
					<div v-if="group.interactives.some(shouldRenderInteractive)" :class="$style.interactives">
						<InteractiveCard
							v-for="payload in group.interactives.filter(shouldRenderInteractive)"
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
							<AgentMarkdownChunk :source="group.finalMessage.content" />
						</div>
					</div>
					<div
						v-if="shouldShowAssistantFooter(group.id)"
						:class="[
							$style.messageFooter,
							{ [$style.messageFooterVisible]: openMemoryFooterGroupId === group.id },
						]"
					>
						<AgentChatMemoryUsed
							:memories="getMemoriesUsedInAssistantRun(group.id)"
							@update:open="setMemoryFooterOpen(group.id, $event)"
						/>
						<AgentChatMessageActions
							v-if="getAssistantRunContent(group.id)"
							:content="getAssistantRunContent(group.id)"
							:is-speech-synthesis-available="isSpeechSynthesisAvailable"
							:is-speaking="isSpeakingMessage(group.id)"
							@read-aloud="toggleReadAloud(group.id)"
						/>
					</div>
					<AgentTypingIndicator
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
						:project-id="projectId"
					/>
					<template v-for="tc in group.message.toolCalls ?? []" :key="`wait-${tc.toolCallId}`">
						<N8nText
							v-if="externalWaitPlatform(tc)"
							size="small"
							color="text-light"
							data-testid="agent-chat-external-wait"
						>
							{{
								i18n.baseText('agents.chat.waitingExternal', {
									interpolate: { platform: externalWaitPlatform(tc)! },
								})
							}}
						</N8nText>
					</template>

					<div
						v-if="group.message.role === 'user'"
						:class="[$style.chatMessage, $style.chatMessageUser]"
					>
						{{ group.message.content }}
					</div>
					<template v-else>
						<template v-for="item in getMessageRenderItems(group.message)" :key="item.key">
							<div
								v-if="item.type === 'text'"
								:class="[
									$style.chatMessage,
									{ [$style.chatMessageError]: group.message.status === 'error' },
								]"
							>
								<div :class="$style.markdownContent">
									<AgentMarkdownChunk :source="item.text" />
								</div>
							</div>
							<div v-else :class="$style.interactives">
								<InteractiveCard
									:payload="item.payload"
									:project-id="projectId"
									:agent-id="agentId"
									@submit="onInteractiveSubmit(item.payload, $event)"
								/>
							</div>
						</template>
					</template>
					<div
						v-if="shouldShowAssistantFooter(group.id)"
						:class="[
							$style.messageFooter,
							{ [$style.messageFooterVisible]: openMemoryFooterGroupId === group.id },
						]"
					>
						<AgentChatMessageActions
							v-if="getAssistantRunContent(group.id)"
							:content="getAssistantRunContent(group.id)"
							:is-speech-synthesis-available="isSpeechSynthesisAvailable"
							:is-speaking="isSpeakingMessage(group.id)"
							@read-aloud="toggleReadAloud(group.id)"
						/>
						<AgentChatMemoryUsed
							:memories="getMemoriesUsedInAssistantRun(group.id)"
							@update:open="setMemoryFooterOpen(group.id, $event)"
						/>
					</div>
					<AgentTypingIndicator
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
				<AgentTypingIndicator :class="$style.typingIndicator" />
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
	opacity: 0;
}

.message.assistant:hover .messageFooter,
.message.assistant:focus-within .messageFooter,
.messageFooter:hover,
.messageFooter:focus-within,
.messageFooterVisible {
	opacity: 1;
}

.message.user .content {
	align-items: flex-end;
}

/**
 * Vertical stack for one or more interactive cards inside an assistant message.
 * Adds a small gap between adjacent cards (when a tool run produced several)
 * and vertical margins so the cards sit flush against neither the tool-step
 * list above nor any message text that follows (e.g. after a display-only card).
 */
.interactives {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	margin-top: var(--spacing--2xs);
	margin-bottom: var(--spacing--2xs);
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
