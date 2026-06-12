<script setup lang="ts">
import { N8nButton, N8nMarkdown, N8nSpinner, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';

import { createChatThreadState, type ChatMessage, type ChatThreadState } from '../chat/chat-thread';
import { markChatThreadVisible } from '../chat/visible-chat-threads';
import {
	chatAnswerablePromptForThread,
	externalPromptsForThread,
	permissionPromptState,
	respondToPrompt,
} from '../permissions/permission-prompt-store';
import type {
	InstancePermissionPrompt,
	PromptResponse,
} from '../permissions/prompt-classification';
import { getThreadClient, type ThreadListener } from '../services/thread-client';

/**
 * Embeddable chat transcript for one thread.
 *
 * The snapshot is re-fetched on every mount — the main-process cache may have been
 * taken mid-run (empty messages, advanced cursor) and would silently hide the
 * thread's history. Live events are folded in from where the fresh snapshot ends.
 *
 * Pending 'external' confirmations (e.g. the agent's clarifying questions) are
 * rendered as regular assistant messages from the prompt store; when one is
 * text-answerable, `send` routes the reply to the confirm endpoint instead of
 * posting a new chat message, resuming the suspended run.
 */
const props = defineProps<{ threadId: string }>();

/** `isFallback` marks a first-user-message stand-in — don't let it override a known title. */
const emit = defineEmits<{ titleChanged: [title: string, isFallback?: boolean] }>();

const i18n = useI18n();
const client = getThreadClient();

const TITLE_FALLBACK_MAX_LENGTH = 60;

// The reducer mutates this reactive array in place, so deltas re-render as they stream.
const messages = reactive<ChatMessage[]>([]);
let state: ChatThreadState | null = null;

const loading = ref(true);
const loadError = ref(false);
const sendError = ref(false);
const sending = ref(false);

const listRef = ref<HTMLElement | null>(null);
// Auto-scroll follows new content only while the user is at (or near) the bottom.
const pinnedToBottom = ref(true);
const BOTTOM_THRESHOLD_PX = 60;

const busy = computed(() => sending.value || (messages.at(-1)?.isStreaming ?? false));

const onThreadEvent: ThreadListener = (event) => state?.apply(event);

async function load() {
	loading.value = true;
	loadError.value = false;
	client.unlisten(props.threadId, onThreadEvent);
	try {
		const snapshot = await client.get(props.threadId, { refresh: true });
		messages.splice(0, messages.length);
		state = createChatThreadState(messages, snapshot.messages, {
			onTitle: (title) => emit('titleChanged', title),
		});
		// No server title yet — the first user message is the next best label.
		const firstUserMessage = messages.find((message) => message.role === 'user');
		if (firstUserMessage) emit('titleChanged', truncateTitle(firstUserMessage.content), true);
		// Start where the snapshot ends (its first live event has id `nextEventId`;
		// the SSE cursor is exclusive).
		client.listen(props.threadId, onThreadEvent, {
			lastEventId: Math.max(0, snapshot.nextEventId - 1),
		});
	} catch (error) {
		// Surface the cause in devtools — the inline state only shows a generic message.
		console.error('Failed to load chat thread', error);
		loadError.value = true;
	} finally {
		loading.value = false;
	}
	// Only after `loading` flips does the list render — scrolling earlier hits nothing.
	await scrollToBottom();
}

function truncateTitle(text: string): string {
	const singleLine = text.replace(/\s+/g, ' ').trim();
	if (singleLine.length <= TITLE_FALLBACK_MAX_LENGTH) return singleLine;
	return `${singleLine.slice(0, TITLE_FALLBACK_MAX_LENGTH - 1)}…`;
}

// Prompts answered from this chat keep their question in the transcript as a real
// message; the set hides their store-rendered (pending) twin to avoid duplicates.
const materializedPromptIds = reactive(new Set<string>());

/** Pending agent requests of this thread, rendered as assistant messages. */
const pendingPrompts = computed(() =>
	externalPromptsForThread(props.threadId).filter(
		(prompt) => !materializedPromptIds.has(prompt.id),
	),
);

const answerablePrompt = computed(() => chatAnswerablePromptForThread(props.threadId));

/** The prompt's content as assistant-message markdown: intro plus its question(s). */
function promptContent(prompt: InstancePermissionPrompt): string {
	const parts: string[] = [];
	if (prompt.introMessage) parts.push(prompt.introMessage);
	for (const question of prompt.questions ?? []) {
		const options = question.options?.length ? ` (${question.options.join(' / ')})` : '';
		parts.push(`${question.question}${options}`);
	}
	if (parts.length === 0) parts.push(prompt.message);
	return parts.join('\n\n');
}

function answerResponse(prompt: InstancePermissionPrompt, text: string): PromptResponse {
	if (prompt.inputType === 'questions') {
		// One free-text reply answers the whole set — the agent sees each question
		// paired with the full reply and picks out what applies.
		return {
			kind: 'questions',
			answers: (prompt.questions ?? []).map((question) => ({
				questionId: question.id,
				selectedOptions: [],
				customText: text,
			})),
		};
	}
	return { kind: 'approval', approved: true, userInput: text };
}

/** Answer a pending agent question: persist the Q&A in the transcript and resume the run. */
async function answerPrompt(prompt: InstancePermissionPrompt, text: string) {
	if (!state) return;
	// On retry after a failed submit the question is already in the transcript.
	if (!materializedPromptIds.has(prompt.id)) {
		messages.push({
			id: prompt.id,
			role: 'assistant',
			content: promptContent(prompt),
			isStreaming: false,
		});
		materializedPromptIds.add(prompt.id);
	}
	state.addUserMessage(text);
	// The suspended run's `run-start` predates this transcript — register it so the
	// resumed agent's reply streams in.
	if (prompt.runId && prompt.agentId) state.registerRun(prompt.runId, prompt.agentId);
	await respondToPrompt(prompt.id, answerResponse(prompt, text));
	if (permissionPromptState.failedIds.has(prompt.id)) {
		throw new Error('Failed to submit the answer');
	}
}

/** Append the user's message optimistically and post it; the reply streams in via events. */
async function send(text: string) {
	if (!state) return;
	sendError.value = false;
	sending.value = true;
	pinnedToBottom.value = true;
	try {
		const prompt = answerablePrompt.value;
		if (prompt) {
			await answerPrompt(prompt, text);
		} else {
			state.addUserMessage(text);
			await client.post(props.threadId, text);
		}
	} catch (error) {
		console.error('Failed to send chat message', error);
		sendError.value = true;
	} finally {
		sending.value = false;
	}
}

defineExpose({ send, busy });

function onScroll() {
	const list = listRef.value;
	if (!list) return;
	pinnedToBottom.value =
		list.scrollTop + list.clientHeight >= list.scrollHeight - BOTTOM_THRESHOLD_PX;
}

async function scrollToBottom() {
	await nextTick();
	const list = listRef.value;
	if (list) list.scrollTop = list.scrollHeight;
}

watch([messages, pendingPrompts], () => {
	if (pinnedToBottom.value) void scrollToBottom();
});

const releaseVisible = markChatThreadVisible(props.threadId);
onMounted(load);
onBeforeUnmount(() => {
	client.unlisten(props.threadId, onThreadEvent);
	releaseVisible();
});
</script>

<template>
	<div :class="$style.chat">
		<div v-if="loading" :class="$style.state" role="status" aria-live="polite">
			<N8nSpinner aria-hidden="true" />
			<N8nText color="text-light" size="small">{{
				i18n.baseText('desktopAssistant.chat.loading')
			}}</N8nText>
		</div>

		<div v-else-if="loadError" :class="$style.state" role="alert">
			<N8nText color="text-light" size="small">{{
				i18n.baseText('desktopAssistant.chat.error')
			}}</N8nText>
			<N8nButton variant="outline" size="small" @click="load">{{
				i18n.baseText('desktopAssistant.chat.retry')
			}}</N8nButton>
		</div>

		<div v-else ref="listRef" :class="$style.list" @scroll.passive="onScroll">
			<div v-if="messages.length === 0 && pendingPrompts.length === 0" :class="$style.state">
				<N8nText color="text-light" size="small">{{
					i18n.baseText('desktopAssistant.chat.empty')
				}}</N8nText>
			</div>

			<template v-for="message in messages" :key="message.id">
				<div v-if="message.role === 'user'" :class="$style.userMessage">
					{{ message.content }}
				</div>
				<div v-else :class="$style.assistantMessage">
					<N8nMarkdown v-if="message.content" :content="message.content" />
					<!-- Streaming has started but no text arrived yet. -->
					<span v-if="message.isStreaming && !message.content" :class="$style.blinkingCursor" />
				</div>
			</template>

			<!-- The agent's pending requests (e.g. clarifying questions), shown as
			     assistant messages; answering one moves it into the transcript above. -->
			<div
				v-for="prompt in pendingPrompts"
				:key="prompt.id"
				:class="$style.assistantMessage"
				data-testid="chat-pending-prompt"
			>
				<N8nMarkdown :content="promptContent(prompt)" />
			</div>

			<div v-if="sendError" :class="$style.sendError" role="alert">
				{{ i18n.baseText('desktopAssistant.chat.sendFailed') }}
			</div>
		</div>
	</div>
</template>

<style module>
.chat {
	display: flex;
	flex: 1;
	flex-direction: column;
	min-height: 0;
}

.state {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	align-items: center;
	justify-content: center;
	padding: var(--spacing--xl) var(--spacing--md);
}

.list {
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: var(--spacing--xs);
	min-height: 0;
	padding: var(--spacing--xs) var(--spacing--sm);
	overflow-y: auto;
}

.userMessage {
	align-self: flex-end;
	max-width: 85%;
	padding: var(--spacing--3xs) var(--spacing--xs);
	font-size: 13px;
	color: var(--da-text);
	white-space: pre-wrap;
	overflow-wrap: anywhere;
	background: var(--da-surface-2);
	border: 1px solid var(--da-border);
	border-radius: var(--da-radius);
}

.assistantMessage {
	align-self: stretch;
	font-size: 13px;
	color: var(--da-text);
	overflow-wrap: anywhere;
	/* N8nMarkdown colors its text, code blocks, and blockquotes with design-system
	   tokens that default to the light theme (dark on dark here); pin them to the
	   assistant palette. */
	--color--text: var(--da-text);
	--color--text--shade-1: var(--da-text);
	--color--background: var(--da-surface-2);
	--border-color: var(--da-border-strong);
	--color--primary: var(--da-accent);
}

.blinkingCursor {
	display: inline-block;
	width: 2px;
	height: 1.2em;
	vertical-align: text-bottom;
	background: var(--da-text);
	animation: cursor-blink 1s step-end infinite;
}

@keyframes cursor-blink {
	0%,
	100% {
		opacity: 1;
	}

	50% {
		opacity: 0;
	}
}

.sendError {
	align-self: center;
	font-size: 12px;
	color: var(--da-red);
}
</style>
