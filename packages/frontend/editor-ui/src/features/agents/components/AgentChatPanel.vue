<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick, useTemplateRef, watch } from 'vue';
import { N8nIcon, N8nText } from '@n8n/design-system';
import { useRootStore } from '@n8n/stores/useRootStore';
import {
	getBuilderMessages,
	clearBuilderMessages,
	getChatMessages,
} from '../composables/useAgentApi';
import ChatInputBase from '@/features/ai/shared/components/ChatInputBase.vue';
import ChatMarkdownChunk from '@/features/ai/chatHub/components/ChatMarkdownChunk.vue';
import ChatTypingIndicator from '@/features/ai/chatHub/components/ChatTypingIndicator.vue';

const props = withDefaults(
	defineProps<{
		visible?: boolean;
		projectId: string;
		agentId: string;
		mode?: 'panel' | 'inline';
		endpoint?: 'build' | 'chat';
		initialMessage?: string;
		continueSessionId?: string;
		sessionTitle?: string;
		sessionEmoji?: string;
	}>(),
	{
		visible: true,
		mode: 'panel',
		endpoint: 'chat',
		initialMessage: undefined,
		continueSessionId: undefined,
		sessionTitle: undefined,
		sessionEmoji: undefined,
	},
);

const emit = defineEmits<{
	codeUpdated: [];
	codeDelta: [delta: string];
	configUpdated: [];
	'update:streaming': [streaming: boolean];
	'continue-loaded': [count: number];
	back: [];
}>();

const rootStore = useRootStore();

interface ChatMessage {
	id: string;
	role: 'user' | 'assistant';
	content: string;
	thinking?: string;
	toolCalls?: Array<{ tool: string; input?: unknown; output?: unknown }>;
	status?: 'streaming' | 'success' | 'error';
}

const messages = ref<ChatMessage[]>([]);
const inputText = ref('');
const isStreaming = ref(false);
const abortController = ref<AbortController | null>(null);
const builderHistoryLoaded = ref(false);
const chatHistoryLoaded = ref(false);
const chatSessionId = ref<string>(props.continueSessionId ?? crypto.randomUUID());
const scrollRef = useTemplateRef<HTMLDivElement>('scrollRef');

const messagingState = computed<'idle' | 'waitingFirstChunk' | 'receiving'>(() => {
	if (!isStreaming.value) return 'idle';
	const lastMsg = messages.value[messages.value.length - 1];
	if (!lastMsg || lastMsg.role === 'user') return 'waitingFirstChunk';
	return 'receiving';
});

watch(isStreaming, (v) => emit('update:streaming', v));

function scrollToBottom() {
	void nextTick(() => {
		if (scrollRef.value) {
			scrollRef.value.scrollTop = scrollRef.value.scrollHeight;
		}
	});
}

/** Convert persisted agent messages into the frontend ChatMessage format. */
function convertDbMessages(dbMessages: unknown[]): ChatMessage[] {
	type Part = {
		type: string;
		text?: string;
		toolName?: string;
		toolCallId?: string;
		input?: unknown;
		result?: unknown;
		output?: unknown;
	};
	type Msg = { id?: string; role?: string; content?: Part[] };

	// Pre-pass: build a map of toolCallId → result so tool results living in
	// separate (e.g. "tool" role) messages are still paired with their calls.
	const resultsById = new Map<string, unknown>();
	const resultsByName: Array<{ name: string; result: unknown }> = [];
	for (const raw of dbMessages) {
		const msg = raw as Msg;
		if (!Array.isArray(msg.content)) continue;
		for (const part of msg.content) {
			if (part.type !== 'tool-result') continue;
			const value = part.result ?? part.output;
			if (part.toolCallId) resultsById.set(part.toolCallId, value);
			else if (part.toolName) resultsByName.push({ name: part.toolName, result: value });
		}
	}

	const result: ChatMessage[] = [];
	for (const raw of dbMessages) {
		const msg = raw as Msg;
		if (!msg.role || !Array.isArray(msg.content)) continue;
		if (msg.role !== 'user' && msg.role !== 'assistant') continue;

		let text = '';
		let thinking = '';
		const toolCalls: Array<{ tool: string; input?: unknown; output?: unknown }> = [];

		for (const part of msg.content) {
			if (part.type === 'text' && part.text) {
				text += part.text;
			} else if (part.type === 'reasoning' && part.text) {
				thinking += part.text;
			} else if (part.type === 'tool-call' && part.toolName) {
				let output: unknown;
				if (part.toolCallId && resultsById.has(part.toolCallId)) {
					output = resultsById.get(part.toolCallId);
				} else {
					const idx = resultsByName.findIndex((r) => r.name === part.toolName);
					if (idx >= 0) output = resultsByName.splice(idx, 1)[0].result;
				}
				// Historical tool calls are always complete — fall back to null so
				// the UI shows a done state instead of the pending spinner.
				toolCalls.push({ tool: part.toolName, input: part.input, output: output ?? null });
			}
		}

		result.push({
			id: msg.id ?? crypto.randomUUID(),
			role: msg.role,
			content: text,
			thinking: thinking || undefined,
			toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
		});
	}
	return result;
}

async function loadBuilderHistory() {
	if (builderHistoryLoaded.value) return;
	try {
		const dbMessages = await getBuilderMessages(
			rootStore.restApiContext,
			props.projectId,
			props.agentId,
		);
		if (dbMessages.length > 0) {
			messages.value = convertDbMessages(dbMessages);
		}
	} catch {
		// Silently ignore — just start with empty chat
	} finally {
		builderHistoryLoaded.value = true;
	}
}

async function loadChatHistory(threadId: string) {
	if (chatHistoryLoaded.value) return;
	try {
		const dbMessages = await getChatMessages(
			rootStore.restApiContext,
			props.projectId,
			props.agentId,
			threadId,
		);
		if (dbMessages.length > 0) {
			messages.value = convertDbMessages(dbMessages);
		}
	} catch {
		// Silently ignore — just start with empty chat
	} finally {
		chatHistoryLoaded.value = true;
		emit('continue-loaded', messages.value.length);
	}
}

async function onClearHistory() {
	if (props.endpoint !== 'build') {
		messages.value = [];
		chatSessionId.value = crypto.randomUUID();
		return;
	}
	try {
		await clearBuilderMessages(rootStore.restApiContext, props.projectId, props.agentId);
		messages.value = [];
	} catch {
		// ignore
	}
}

async function streamFromEndpoint(endpoint: 'build' | 'chat', message: string) {
	isStreaming.value = true;
	let builderMutated = false;
	const assistantMsg = reactive<ChatMessage>({
		id: crypto.randomUUID(),
		role: 'assistant',
		content: '',
		thinking: '',
		toolCalls: [],
		status: 'streaming',
	});
	let msgAdded = false;

	const ensureMsg = () => {
		if (!msgAdded) {
			messages.value.push(assistantMsg);
			msgAdded = true;
			scrollToBottom();
		}
	};

	const controller = new AbortController();
	abortController.value = controller;

	try {
		const { baseUrl } = rootStore.restApiContext;
		const browserId = localStorage.getItem('n8n-browserId') ?? '';
		const url = `${baseUrl}/projects/${props.projectId}/agents/v2/${props.agentId}/${endpoint}`;
		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'browser-id': browserId,
			},
			credentials: 'include',
			body: JSON.stringify(
				endpoint === 'chat' ? { message, sessionId: chatSessionId.value } : { message },
			),
			signal: controller.signal,
		});

		if (!response.ok || !response.body) {
			assistantMsg.content = `Error: ${response.statusText || 'Failed to reach agent'}`;
			assistantMsg.status = 'error';
			messages.value.push(assistantMsg);
			return;
		}

		const reader = response.body.getReader();
		const decoder = new TextDecoder();
		let buffer = '';

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			buffer += decoder.decode(value, { stream: true });
			const lines = buffer.split('\n');
			buffer = lines.pop() ?? '';

			for (const line of lines) {
				if (!line.startsWith('data: ')) continue;
				const raw = line.slice(6);

				let data: Record<string, unknown>;
				try {
					data = JSON.parse(raw) as Record<string, unknown>;
				} catch {
					continue;
				}

				if (data.done) continue;

				if (typeof data.text === 'string') {
					ensureMsg();
					assistantMsg.content += data.text;
					scrollToBottom();
				}

				if (typeof data.thinking === 'string') {
					ensureMsg();
					assistantMsg.thinking = (assistantMsg.thinking ?? '') + data.thinking;
				}

				if (typeof data.codeDelta === 'string') {
					emit('codeDelta', data.codeDelta);
				}

				if (typeof data.code === 'string') {
					emit('codeUpdated');
				}

				if (data.configUpdated !== undefined || data.toolUpdated !== undefined) {
					builderMutated = true;
					emit('configUpdated');
				}

				if (data.toolCall && typeof data.toolCall === 'object') {
					ensureMsg();
					if (assistantMsg.content && !assistantMsg.content.endsWith('\n')) {
						assistantMsg.content += '\n';
					}
					const tc = data.toolCall as { tool: string; input?: unknown };
					assistantMsg.toolCalls = assistantMsg.toolCalls ?? [];
					assistantMsg.toolCalls.push({ tool: tc.tool, input: tc.input });
				}

				if (data.toolResult && typeof data.toolResult === 'object') {
					const tr = data.toolResult as { tool: string; output?: unknown };
					const existing = assistantMsg.toolCalls?.find(
						(t) => t.tool === tr.tool && t.output === undefined,
					);
					if (existing) {
						existing.output = tr.output;
					}
					if (assistantMsg.content && !assistantMsg.content.endsWith('\n')) {
						assistantMsg.content += '\n';
					}
				}

				if (typeof data.error === 'string') {
					ensureMsg();
					assistantMsg.content += `\n\nError: ${data.error}`;
					assistantMsg.status = 'error';
				}
			}
		}

		assistantMsg.status = 'success';
	} catch (e) {
		if (e instanceof DOMException && e.name === 'AbortError') {
			assistantMsg.status = 'success';
		} else {
			if (!msgAdded) {
				messages.value.push(assistantMsg);
			}
			assistantMsg.content = `Error: ${e instanceof Error ? e.message : 'Unknown error'}`;
			assistantMsg.status = 'error';
		}
	} finally {
		abortController.value = null;
		isStreaming.value = false;
		scrollToBottom();
		if (endpoint === 'build' && builderMutated) {
			emit('configUpdated');
		}
	}
}

async function sendMessage() {
	const text = inputText.value.trim();
	if (!text || isStreaming.value) return;

	messages.value.push({
		id: crypto.randomUUID(),
		role: 'user',
		content: text,
		status: 'success',
	});
	inputText.value = '';
	scrollToBottom();

	await streamFromEndpoint(props.endpoint, text);
}

function sendMessageFromOutside(message: string) {
	inputText.value = message;
	void sendMessage();
}

function stopGenerating() {
	abortController.value?.abort();
}

function onSubmit() {
	void sendMessage();
}

defineExpose({ sendMessageFromOutside });

onMounted(() => {
	if (props.endpoint === 'build') {
		void loadBuilderHistory();
	} else if (props.continueSessionId) {
		void loadChatHistory(props.continueSessionId);
	}
	if (props.initialMessage) {
		sendMessageFromOutside(props.initialMessage);
	}
});
</script>

<template>
	<aside v-if="visible" :class="[mode === 'inline' ? $style.inlinePanel : $style.panel]">
		<div v-if="continueSessionId" :class="[$style.topBar, $style.topBarContinue]">
			<button :class="$style.backBtn" title="Back to agent" @click="emit('back')">
				<N8nIcon icon="arrow-left" :size="14" />
			</button>
			<span v-if="sessionEmoji" :class="$style.sessionEmoji">{{ sessionEmoji }}</span>
			<span v-if="sessionTitle" :class="$style.sessionTitle">{{ sessionTitle }}</span>
		</div>
		<div v-else-if="endpoint === 'build' && messages.length > 0" :class="$style.topBar">
			<button
				:class="$style.clearBtn"
				title="Clear chat history"
				data-testid="chat-clear"
				@click="onClearHistory"
			>
				<N8nIcon icon="trash-2" :size="14" />
			</button>
		</div>

		<!-- Messages -->
		<div ref="scrollRef" :class="$style.messages">
			<div v-if="messages.length === 0 && !isStreaming" :class="$style.emptyState">
				<N8nIcon :icon="endpoint === 'build' ? 'wand-sparkles' : 'message-square'" :size="32" />
				<N8nText tag="p" bold>
					{{ endpoint === 'build' ? 'Build your agent' : 'Chat with your agent' }}
				</N8nText>
				<N8nText size="small" color="text-light">
					{{
						endpoint === 'build'
							? 'Describe what you want your agent to do'
							: 'Send a message to start a conversation'
					}}
				</N8nText>
			</div>
			<template v-else>
				<div
					v-for="msg in messages"
					:key="msg.id"
					:class="[$style.message, msg.role === 'user' ? $style.user : $style.assistant]"
				>
					<!-- Avatar -->
					<div :class="$style.avatar">
						<N8nIcon v-if="msg.role === 'user'" icon="user" width="20" height="20" />
						<N8nIcon v-else icon="robot" width="20" height="20" />
					</div>

					<!-- Content -->
					<div :class="$style.content">
						<!-- Thinking -->
						<details v-if="msg.thinking" :class="$style.thinkingBlock">
							<summary :class="$style.thinkingSummary">
								<N8nIcon icon="brain" :size="12" />
								Thinking...
							</summary>
							<div :class="$style.thinkingContent">{{ msg.thinking }}</div>
						</details>

						<!-- Tool calls -->
						<div v-if="msg.toolCalls?.length" :class="$style.toolCalls">
							<div v-for="(tc, i) in msg.toolCalls" :key="i" :class="$style.toolCall">
								<N8nIcon icon="wrench" :size="12" />
								<span :class="$style.toolName">{{ tc.tool }}</span>
								<N8nIcon
									v-if="tc.output !== undefined"
									icon="check"
									:size="12"
									:class="$style.toolDone"
								/>
								<ChatTypingIndicator v-else />
							</div>
						</div>

						<!-- User message -->
						<div v-if="msg.role === 'user'" :class="[$style.chatMessage, $style.chatMessageUser]">
							{{ msg.content }}
						</div>

						<!-- Assistant message -->
						<div
							v-else-if="msg.content"
							:class="[$style.chatMessage, { [$style.chatMessageError]: msg.status === 'error' }]"
						>
							<div :class="$style.markdownContent">
								<ChatMarkdownChunk
									:source="{ type: 'text', content: msg.content }"
									@open-artifact="() => {}"
								/>
							</div>
						</div>

						<!-- Typing indicator for assistant still streaming with no content -->
						<ChatTypingIndicator
							v-if="
								msg.role === 'assistant' &&
								msg.status === 'streaming' &&
								!msg.content &&
								!msg.toolCalls?.length
							"
							:class="$style.typingIndicator"
						/>
					</div>
				</div>

				<!-- Waiting for first chunk indicator -->
				<div v-if="messagingState === 'waitingFirstChunk'" :class="$style.message">
					<div :class="$style.avatar">
						<N8nIcon icon="robot" width="20" height="20" />
					</div>
					<div :class="$style.content">
						<ChatTypingIndicator :class="$style.typingIndicator" />
					</div>
				</div>
			</template>
		</div>

		<!-- Input -->
		<div :class="$style.inputArea">
			<ChatInputBase
				v-model="inputText"
				placeholder="Type a message..."
				:is-streaming="messagingState === 'receiving'"
				:can-submit="!isStreaming && inputText.trim().length > 0"
				:disabled="isStreaming && messagingState !== 'receiving'"
				data-testid="chat-input"
				@submit="onSubmit"
				@stop="stopGenerating"
			/>
		</div>
	</aside>
</template>

<style lang="scss" module>
.panel {
	width: 400px;
	min-width: 400px;
	border-left: var(--border-width) var(--border-style) var(--color--foreground);
	display: flex;
	flex-direction: column;
}

.inlinePanel {
	flex: 1;
	min-height: 0;
	display: flex;
	flex-direction: column;
	min-width: 0;
}

.topBar {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	padding: var(--spacing--2xs) var(--spacing--sm);
	border-bottom: var(--border-width) var(--border-style) var(--color--foreground);
}

.clearBtn {
	display: flex;
	align-items: center;
	justify-content: center;
	border: none;
	background: none;
	cursor: pointer;
	color: var(--color--text--tint-2);
	padding: var(--spacing--4xs);
	border-radius: var(--radius);
}

.clearBtn:hover {
	background-color: var(--color--foreground--tint-1);
	color: var(--color--danger);
}

.topBarContinue {
	justify-content: flex-start;
	gap: var(--spacing--2xs);
}

.backBtn {
	display: flex;
	align-items: center;
	justify-content: center;
	border: none;
	background: none;
	cursor: pointer;
	color: var(--color--primary);
	padding: var(--spacing--4xs);
	border-radius: var(--radius);

	&:hover {
		background-color: var(--color--foreground--tint-1);
	}
}

.sessionEmoji {
	font-size: var(--font-size--md);
	line-height: 1;
	flex-shrink: 0;
}

.sessionTitle {
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
	font-weight: var(--font-weight--bold);
	color: var(--color--text);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	min-width: 0;
}

/* Messages area — matches ChatHub layout */
.messages {
	flex: 1;
	min-height: 0;
	overflow-y: auto;
	padding: var(--spacing--lg) var(--spacing--xl);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
}

.emptyState {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	height: 100%;
	gap: var(--spacing--3xs);
	color: var(--color--text--tint-2);
}

/* Message layout — mirrors ChatMessage.vue styles */
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

/* Thinking block */
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

/* Tool calls */
.toolCalls {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	margin-bottom: var(--spacing--2xs);
}

.toolCall {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
	padding: var(--spacing--4xs) var(--spacing--2xs);
	background-color: var(--color--foreground--tint-2);
	border-radius: var(--radius);
	width: fit-content;
}

.toolName {
	font-family: monospace;
}

.toolDone {
	color: var(--color--success);
}

.typingIndicator {
	margin-top: var(--spacing--xs);
}

.inputArea {
	padding: var(--spacing--sm);
}
</style>
