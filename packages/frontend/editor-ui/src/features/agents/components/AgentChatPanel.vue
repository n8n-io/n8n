<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick } from 'vue';
import { N8nIcon, N8nMarkdown, N8nPromptInput } from '@n8n/design-system';
import { useRootStore } from '@n8n/stores/useRootStore';
import { getBuilderMessages, clearBuilderMessages } from '../composables/useAgentApi';

const props = withDefaults(
	defineProps<{
		visible?: boolean;
		projectId: string;
		agentId: string;
		initialMessage?: string;
	}>(),
	{
		visible: true,
	},
);

const emit = defineEmits<{
	close: [];
	configUpdated: [];
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

const activeTab = ref<'test' | 'builder'>('test');
const messages = ref<ChatMessage[]>([]);
const builderMessages = ref<ChatMessage[]>([]);
const inputText = ref('');
const isStreaming = ref(false);
const builderHistoryLoaded = ref(false);
const scrollContainer = ref<HTMLDivElement | null>(null);

const currentMessages = computed(() =>
	activeTab.value === 'builder' ? builderMessages.value : messages.value,
);

const messagingState = computed<'idle' | 'waitingFirstChunk' | 'receiving'>(() => {
	if (!isStreaming.value) return 'idle';
	const msgs = currentMessages.value;
	const lastMsg = msgs[msgs.length - 1];
	if (!lastMsg || lastMsg.role === 'user') return 'waitingFirstChunk';
	return 'receiving';
});

function scrollToBottom() {
	void nextTick(() => {
		if (scrollContainer.value) {
			scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight;
		}
	});
}

/** Convert persisted agent messages into the frontend ChatMessage format. */
function convertDbMessages(dbMessages: unknown[]): ChatMessage[] {
	const result: ChatMessage[] = [];
	for (const raw of dbMessages) {
		const msg = raw as {
			id?: string;
			role?: string;
			content?: Array<{
				type: string;
				text?: string;
				toolName?: string;
				input?: unknown;
				result?: unknown;
			}>;
		};
		if (!msg.role || !Array.isArray(msg.content)) continue;
		// Only show user and assistant messages
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
				toolCalls.push({ tool: part.toolName, input: part.input });
			} else if (part.type === 'tool-result' && part.toolName) {
				const existing = toolCalls.find((t) => t.tool === part.toolName && t.output === undefined);
				if (existing) {
					existing.output = part.result;
				}
			}
		}

		result.push({
			id: msg.id ?? crypto.randomUUID(),
			role: msg.role as 'user' | 'assistant',
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
			builderMessages.value = convertDbMessages(dbMessages);
		}
	} catch {
		// Silently ignore — just start with empty chat
	} finally {
		builderHistoryLoaded.value = true;
	}
}

async function onClearBuilderMessages() {
	try {
		await clearBuilderMessages(rootStore.restApiContext, props.projectId, props.agentId);
		builderMessages.value = [];
	} catch {
		// ignore
	}
}

onMounted(() => {
	void loadBuilderHistory();
});

function onSubmit() {
	void sendMessage();
}

function onKeydown(e: KeyboardEvent) {
	if (e.key === 'Enter' && !e.shiftKey) {
		e.preventDefault();
		onSubmit();
	}
}

async function sendMessage() {
	const text = inputText.value.trim();
	if (!text || isStreaming.value) return;

	const targetMessages = activeTab.value === 'builder' ? builderMessages : messages;
	targetMessages.value.push({
		id: crypto.randomUUID(),
		role: 'user',
		content: text,
		status: 'success',
	});
	inputText.value = '';
	scrollToBottom();

	const endpoint = activeTab.value === 'builder' ? 'build' : 'chat';
	await streamFromEndpoint(endpoint, text);
}

function sendMessageFromOutside(message: string) {
	inputText.value = message;
	void sendMessage();
}

defineExpose({ sendMessageFromOutside });

onMounted(() => {
	if (props.initialMessage) {
		sendMessageFromOutside(props.initialMessage);
	}
});

async function streamFromEndpoint(endpoint: 'build' | 'chat', message: string) {
	isStreaming.value = true;
	let builderMutated = false;
	const targetMessages = endpoint === 'build' ? builderMessages : messages;
	const assistantMsg = reactive<ChatMessage>({
		id: crypto.randomUUID(),
		role: 'assistant',
		content: '',
		thinking: '',
		toolCalls: [],
		status: 'streaming',
	});
	let msgAdded = false;

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
			body: JSON.stringify({ message }),
		});

		if (!response.ok || !response.body) {
			assistantMsg.content = `Error: ${response.statusText || 'Failed to reach agent'}`;
			assistantMsg.status = 'error';
			targetMessages.value.push(assistantMsg);
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
					data = JSON.parse(raw);
				} catch {
					continue;
				}

				if (data.done) continue;

				const ensureMsg = () => {
					if (!msgAdded) {
						targetMessages.value.push(assistantMsg);
						msgAdded = true;
						scrollToBottom();
					}
				};

				if (typeof data.text === 'string') {
					ensureMsg();
					assistantMsg.content += data.text;
					scrollToBottom();
				}

				if (typeof data.thinking === 'string') {
					ensureMsg();
					assistantMsg.thinking = (assistantMsg.thinking ?? '') + data.thinking;
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
		if (!msgAdded) {
			targetMessages.value.push(assistantMsg);
		}
		assistantMsg.content = `Error: ${e instanceof Error ? e.message : 'Unknown error'}`;
		assistantMsg.status = 'error';
	} finally {
		isStreaming.value = false;
		// Emit a final refresh after the builder stream completes to ensure the
		// latest config is shown even if no individual tool events fired it.
		if (endpoint === 'build' && builderMutated) {
			emit('configUpdated');
		}
	}
}
</script>

<template>
	<aside v-if="visible" :class="$style.panel">
		<div :class="$style.header">
			<div :class="$style.tabs">
				<button
					:class="[$style.tabBtn, activeTab === 'test' && $style.tabBtnActive]"
					data-testid="chat-tab-test"
					@click="activeTab = 'test'"
				>
					Test
				</button>
				<button
					:class="[$style.tabBtn, activeTab === 'builder' && $style.tabBtnActive]"
					data-testid="chat-tab-builder"
					@click="activeTab = 'builder'"
				>
					Builder
				</button>
			</div>
			<div :class="$style.headerActions">
				<button
					v-if="activeTab === 'builder' && builderMessages.length > 0"
					:class="$style.clearBtn"
					title="Clear builder history"
					data-testid="chat-clear-builder"
					@click="onClearBuilderMessages"
				>
					<N8nIcon icon="trash-2" :size="14" />
				</button>
				<button :class="$style.closeBtn" data-testid="chat-close-button" @click="emit('close')">
					<N8nIcon icon="x" :size="16" />
				</button>
			</div>
		</div>

		<div ref="scrollContainer" :class="$style.messages">
			<div v-if="currentMessages.length === 0 && !isStreaming" :class="$style.emptyState">
				<N8nIcon icon="message-square" :size="32" />
				<p :class="$style.emptyTitle">
					{{ activeTab === 'builder' ? 'Builder chat' : 'Test your agent' }}
				</p>
				<span :class="$style.emptySubtitle">Send a message to start a conversation</span>
			</div>
			<template v-else>
				<div
					v-for="msg in currentMessages"
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
								<span v-else :class="$style.toolRunning">…</span>
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
								<N8nMarkdown :content="msg.content" />
							</div>
						</div>

						<!-- Typing indicator for assistant still streaming with no content -->
						<span
							v-if="
								msg.role === 'assistant' &&
								msg.status === 'streaming' &&
								!msg.content &&
								!msg.toolCalls?.length
							"
							:class="$style.typingIndicator"
						>
							…
						</span>
					</div>
				</div>

				<!-- Waiting for first chunk indicator -->
				<div v-if="messagingState === 'waitingFirstChunk'" :class="$style.message">
					<div :class="$style.avatar">
						<N8nIcon icon="robot" width="20" height="20" />
					</div>
					<div :class="$style.content">
						<span :class="$style.typingIndicator">…</span>
					</div>
				</div>
			</template>
		</div>

		<!-- Input -->
		<div :class="$style.inputArea">
			<N8nPromptInput
				v-model="inputText"
				placeholder="Type a message..."
				:disabled="isStreaming"
				data-testid="chat-input"
				@submit="onSubmit"
				@keydown="onKeydown"
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

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing--2xs) var(--spacing--sm);
	border-bottom: var(--border-width) var(--border-style) var(--color--foreground);
}

.tabs {
	display: flex;
	gap: var(--spacing--4xs);
}

.tabBtn {
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border: none;
	background: none;
	cursor: pointer;
	font-size: var(--font-size--xs);
	color: var(--color--text--tint-2);
	border-radius: var(--radius);
	transition: background-color 0.15s ease;
}

.tabBtn:hover {
	background-color: var(--color--foreground--tint-1);
}

.tabBtnActive {
	color: var(--color--primary);
	background-color: var(--color--primary--tint-3);
	font-weight: var(--font-weight--bold);
}

.tabBtnActive:hover {
	background-color: var(--color--primary--tint-2);
}

.headerActions {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
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

.closeBtn {
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

.closeBtn:hover {
	background-color: var(--color--foreground--tint-1);
	color: var(--color--text);
}

/* Messages area — matches ChatHub layout */
.messages {
	flex: 1;
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

.emptyTitle {
	font-weight: var(--font-weight--bold);
	margin: 0;
}

.emptySubtitle {
	font-size: var(--font-size--sm);
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

.toolRunning {
	color: var(--color--text--tint-2);
}

.typingIndicator {
	margin-top: var(--spacing--xs);
	color: var(--color--text--tint-2);
	font-size: var(--font-size--lg);
}

/* Input area */
.inputArea {
	padding: var(--spacing--sm);
	border-top: var(--border-width) var(--border-style) var(--color--foreground);
}
</style>
