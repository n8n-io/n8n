<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick, useTemplateRef } from 'vue';
import { N8nIcon, N8nIconButton, N8nInput, N8nText } from '@n8n/design-system';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useI18n } from '@n8n/i18n';
import ChatMarkdownChunk from '@/features/ai/chatHub/components/ChatMarkdownChunk.vue';
import ChatTypingIndicator from '@/features/ai/chatHub/components/ChatTypingIndicator.vue';

const props = withDefaults(
	defineProps<{
		visible?: boolean;
		projectId: string;
		agentId: string;
		mode?: 'panel' | 'inline';
		initialMessage?: string;
	}>(),
	{
		visible: true,
		mode: 'panel',
	},
);

const emit = defineEmits<{
	codeUpdated: [];
	codeDelta: [delta: string];
}>();

const locale = useI18n();
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
const scrollRef = useTemplateRef<HTMLDivElement>('scrollRef');
const inputRef = useTemplateRef<InstanceType<typeof N8nInput>>('inputRef');

const messagingState = computed<'idle' | 'waitingFirstChunk' | 'receiving'>(() => {
	if (!isStreaming.value) return 'idle';
	const lastMsg = messages.value[messages.value.length - 1];
	if (!lastMsg || lastMsg.role === 'user') return 'waitingFirstChunk';
	return 'receiving';
});

function scrollToBottom() {
	void nextTick(() => {
		if (scrollRef.value) {
			scrollRef.value.scrollTop = scrollRef.value.scrollHeight;
		}
	});
}

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

	messages.value.push({
		id: crypto.randomUUID(),
		role: 'user',
		content: text,
		status: 'success',
	});
	inputText.value = '';
	scrollToBottom();

	await streamFromEndpoint('chat', text);
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
					data = JSON.parse(raw);
				} catch {
					continue;
				}

				if (data.done) continue;

				const ensureMsg = () => {
					if (!msgAdded) {
						messages.value.push(assistantMsg);
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

				if (typeof data.codeDelta === 'string') {
					emit('codeDelta', data.codeDelta);
				}

				if (typeof data.code === 'string') {
					emit('codeUpdated');
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
			messages.value.push(assistantMsg);
		}
		assistantMsg.content = `Error: ${e instanceof Error ? e.message : 'Unknown error'}`;
		assistantMsg.status = 'error';
	} finally {
		isStreaming.value = false;
		scrollToBottom();
	}
}
</script>

<template>
	<aside v-if="visible" :class="[mode === 'inline' ? $style.inlinePanel : $style.panel]">
		<!-- Messages -->
		<div ref="scrollRef" :class="$style.messages">
			<div v-if="messages.length === 0 && !isStreaming" :class="$style.emptyState">
				<N8nIcon icon="message-square" :size="32" />
				<N8nText tag="p" bold>Test your agent</N8nText>
				<N8nText size="small" color="text-light"> Send a message to start a conversation </N8nText>
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
			<form :class="$style.prompt" @submit.prevent="onSubmit">
				<N8nInput
					ref="inputRef"
					:model-value="inputText"
					type="textarea"
					placeholder="Type a message..."
					autocomplete="off"
					:autosize="{ minRows: 1, maxRows: 6 }"
					autofocus
					:disabled="isStreaming"
					data-testid="chat-input"
					@update:model-value="inputText = $event"
					@keydown="onKeydown"
				/>
				<div :class="$style.promptFooter">
					<div />
					<div :class="$style.promptActions">
						<N8nIconButton
							v-if="messagingState !== 'receiving'"
							type="submit"
							:disabled="isStreaming || !inputText.trim()"
							:title="locale.baseText('chatHub.chat.prompt.button.send')"
							:loading="messagingState === 'waitingFirstChunk'"
							icon="arrow-up"
							icon-size="large"
							@click.stop
						/>
						<N8nIconButton
							v-else
							native-type="button"
							:title="locale.baseText('chatHub.chat.prompt.button.stopGenerating')"
							icon="square"
							icon-size="large"
							@click.stop
						/>
					</div>
				</div>
			</form>
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
	display: flex;
	flex-direction: column;
	min-width: 0;
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

/* Input area — matches ChatPromptFull layout */
.inputArea {
	padding: var(--spacing--sm);
	border-top: var(--border-width) var(--border-style) var(--color--foreground);
}

.prompt {
	width: 100%;
	position: relative;
	display: flex;
	flex-direction: column;

	& textarea {
		font-size: var(--font-size--md);
		line-height: 1.5em;
		padding: var(--spacing--sm);
		padding-bottom: 52px;
		color: var(--color--text--shade-1);
		box-shadow: 0 10px 24px 0 #00000010;
		border-radius: 16px;

		&::placeholder {
			color: var(--color--text--tint-1);
		}
	}

	:global(.n8n-input__wrapper) {
		--input--radius: 16px;
	}
}

.promptFooter {
	position: absolute;
	bottom: 1px;
	left: 1px;
	width: calc(100% - 2px);
	z-index: 10;
	background: var(--color--background--light-2);
	border-radius: 16px;
	padding: var(--spacing--sm);
	display: flex;
	align-items: flex-end;
	justify-content: space-between;
	gap: var(--spacing--sm);
	pointer-events: none;

	& > * {
		pointer-events: auto;
	}
}

.promptActions {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);

	& button path {
		stroke-width: 2.5;
	}
}
</style>
