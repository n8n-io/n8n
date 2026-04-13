<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { N8nIcon, N8nMarkdown, N8nPromptInput } from '@n8n/design-system';
import { useRootStore } from '@n8n/stores/useRootStore';
import { getBuilderMessages, clearBuilderMessages } from '../composables/useAgentApi';

const props = defineProps<{
	visible: boolean;
	projectId: string;
	agentId: string;
}>();

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
}

const activeTab = ref<'test' | 'builder'>('test');
const testMessages = ref<ChatMessage[]>([]);
const builderMessages = ref<ChatMessage[]>([]);
const inputText = ref('');
const isStreaming = ref(false);
const builderHistoryLoaded = ref(false);

const messages = computed(() =>
	activeTab.value === 'test' ? testMessages.value : builderMessages.value,
);

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

async function sendMessage() {
	const text = inputText.value.trim();
	if (!text || isStreaming.value) return;

	const targetMessages = activeTab.value === 'test' ? testMessages : builderMessages;
	targetMessages.value.push({
		id: crypto.randomUUID(),
		role: 'user',
		content: text,
	});
	inputText.value = '';

	if (activeTab.value === 'builder') {
		await streamFromEndpoint('build', text, builderMessages);
	} else {
		await streamFromEndpoint('chat', text, testMessages);
	}
}

async function streamFromEndpoint(
	endpoint: 'build' | 'chat',
	message: string,
	targetMessages: typeof testMessages,
) {
	isStreaming.value = true;
	let builderMutated = false;
	const assistantMsg = reactive<ChatMessage>({
		id: crypto.randomUUID(),
		role: 'assistant',
		content: '',
		thinking: '',
		toolCalls: [],
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
					}
				};

				if (typeof data.text === 'string') {
					ensureMsg();
					assistantMsg.content += data.text;
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
				}
			}
		}
	} catch (e) {
		if (!msgAdded) {
			targetMessages.value.push(assistantMsg);
		}
		assistantMsg.content = `Error: ${e instanceof Error ? e.message : 'Unknown error'}`;
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

		<div :class="$style.messages">
			<div v-if="messages.length === 0 && !isStreaming" :class="$style.emptyState">
				<N8nIcon icon="message-square" :size="32" />
				<p :class="$style.emptyTitle">
					{{ activeTab === 'test' ? 'Test your agent' : 'Build with AI' }}
				</p>
				<p :class="$style.emptySubtitle">
					{{
						activeTab === 'test'
							? 'Send a message to test your agent'
							: 'Describe what you want and the builder will write the code'
					}}
				</p>
			</div>
			<div v-else :class="$style.messageList">
				<div
					v-for="msg in messages"
					:key="msg.id"
					:class="[
						$style.message,
						msg.role === 'user' ? $style.messageUser : $style.messageAssistant,
					]"
				>
					<!-- Thinking block -->
					<details v-if="msg.thinking" :class="$style.thinkingBlock">
						<summary :class="$style.thinkingSummary">Thinking...</summary>
						<pre :class="$style.thinkingContent">{{ msg.thinking }}</pre>
					</details>

					<!-- Tool calls -->
					<div v-if="msg.toolCalls?.length" :class="$style.toolCalls">
						<div v-for="(tc, i) in msg.toolCalls" :key="i" :class="$style.toolCall">
							<span :class="$style.toolName">{{ tc.tool }}</span>
							<span v-if="tc.output !== undefined" :class="$style.toolStatus">✓</span>
							<span v-else :class="$style.toolStatusPending">⋯</span>
						</div>
					</div>

					<!-- Message content -->
					<N8nMarkdown
						v-if="msg.role === 'assistant' && msg.content"
						:content="msg.content"
						:class="$style.markdownContent"
					/>
					<div v-else-if="msg.role === 'user'" :class="$style.userContent">{{ msg.content }}</div>
				</div>

				<!-- Loading indicator -->
				<div
					v-if="
						isStreaming && messages.length > 0 && messages[messages.length - 1]?.role === 'user'
					"
					:class="$style.loadingIndicator"
				>
					<span :class="$style.dot" />
					<span :class="[$style.dot, $style.dot2]" />
					<span :class="[$style.dot, $style.dot3]" />
				</div>
			</div>
		</div>

		<div :class="$style.inputArea">
			<N8nPromptInput
				v-model="inputText"
				:placeholder="activeTab === 'builder' ? 'Ask the builder...' : 'Type a message...'"
				:streaming="isStreaming"
				:disabled="isStreaming"
				refocus-after-send
				data-testid="chat-input"
				@submit="onSubmit"
			/>
		</div>
	</aside>
</template>

<style module>
.panel {
	width: 400px;
	min-width: 400px;
	background-color: var(--color--foreground--tint-2);
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

.messages {
	flex: 1;
	overflow-y: auto;
	padding: var(--spacing--sm);
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
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
	color: var(--color--text--tint-1);
	margin: 0;
}

.emptySubtitle {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-2);
	margin: 0;
	text-align: center;
}

.messageList {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.message {
	padding: var(--spacing--2xs) var(--spacing--xs);
	border-radius: var(--radius--lg);
	font-size: var(--font-size--sm);
	font-family: var(--font-family);
	line-height: var(--line-height--xl);
	max-width: 90%;
	word-break: break-word;
}

.messageUser {
	align-self: flex-end;
	background-color: var(--color--primary);
	color: var(--color--foreground--tint-2);
}

.messageAssistant {
	align-self: flex-start;
	background-color: var(--color--foreground--tint-1);
	color: var(--color--text);
	max-width: 100%;
}

.userContent {
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
	font-family: var(--font-family);
	white-space: pre-wrap;
}

.markdownContent {
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
	font-family: var(--font-family);
}

.markdownContent :global(p) {
	margin: 0 0 var(--spacing--3xs);
}

.markdownContent :global(p:last-child) {
	margin-bottom: 0;
}

.markdownContent :global(pre) {
	background-color: var(--color--foreground);
	padding: var(--spacing--3xs) var(--spacing--2xs);
	border-radius: var(--radius);
	overflow-x: auto;
	font-size: var(--font-size--2xs);
	margin: var(--spacing--3xs) 0;
}

.markdownContent :global(code) {
	font-size: var(--font-size--2xs);
	background-color: var(--color--foreground);
	padding: 1px var(--spacing--5xs);
	border-radius: var(--radius--sm);
}

.markdownContent :global(pre code) {
	background: none;
	padding: 0;
}

.markdownContent :global(h1),
.markdownContent :global(h2),
.markdownContent :global(h3) {
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--bold);
	margin: var(--spacing--3xs) 0;
}

.markdownContent :global(ul),
.markdownContent :global(ol) {
	padding-left: var(--spacing--sm);
	margin: var(--spacing--3xs) 0;
}

.thinkingBlock {
	margin-bottom: var(--spacing--4xs);
	font-size: var(--font-size--2xs);
}

.thinkingSummary {
	cursor: pointer;
	color: var(--color--text--tint-2);
	font-style: italic;
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

.toolCalls {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--4xs);
	margin-bottom: var(--spacing--4xs);
}

.toolCall {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--5xs);
	font-size: var(--font-size--3xs);
	background-color: var(--color--foreground);
	padding: var(--spacing--5xs) var(--spacing--3xs);
	border-radius: var(--radius--sm);
}

.toolName {
	color: var(--color--text--tint-1);
	font-family: monospace;
}

.toolStatus {
	color: var(--color--success);
}

.toolStatusPending {
	color: var(--color--text--tint-2);
}

.loadingIndicator {
	display: flex;
	gap: var(--spacing--4xs);
	padding: var(--spacing--2xs) 0;
	align-items: center;
}

.dot {
	width: var(--spacing--3xs);
	height: var(--spacing--3xs);
	border-radius: 50%;
	background-color: var(--color--text--tint-2);
	animation: dotPulse 1.4s infinite ease-in-out both;
}

.dot2 {
	animation-delay: 0.16s;
}

.dot3 {
	animation-delay: 0.32s;
}

@keyframes dotPulse {
	0%,
	80%,
	100% {
		transform: scale(0.6);
		opacity: 0.4;
	}
	40% {
		transform: scale(1);
		opacity: 1;
	}
}

.inputArea {
	padding: var(--spacing--2xs) var(--spacing--sm);
	border-top: var(--border-width) var(--border-style) var(--color--foreground);
}
</style>
