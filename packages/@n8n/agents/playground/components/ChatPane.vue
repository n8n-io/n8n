<template>
	<div
		class="h-full min-h-0 flex flex-col relative"
		@dragover.prevent="dragOver = true"
		@dragleave.prevent="dragOver = false"
		@drop.prevent="onDrop"
		@click="sendMenuOpen = false"
	>
		<div
			v-if="dragOver"
			class="absolute inset-0 z-10 bg-blue-600/20 border-2 border-dashed border-blue-400 rounded-lg flex items-center justify-center"
		>
			<p class="text-blue-300 text-lg font-medium">Drop files here</p>
		</div>

		<div ref="messagesContainer" class="flex-1 overflow-y-auto pb-16">
			<div
				v-if="activeMessages.length === 0"
				class="flex items-center justify-center h-full text-gray-500"
			>
				<p v-if="mode === 'build'">
					Describe the agent you want to build, or ask for changes to the current code.
				</p>
				<p v-else>Send a message to start chatting with the agent.</p>
			</div>
			<ChatMessage
				v-for="(msg, i) in activeMessages"
				:key="i"
				:msg="msg"
				:show-avatar="msg.role === 'user' || i === 0 || activeMessages[i - 1].role !== 'assistant'"
				:loading="responding && i === activeMessages.length - 1 && msg.role === 'assistant'"
				@approve="approveToolCall(i)"
				@deny="denyToolCall(i)"
			/>
		</div>

		<div v-if="pendingFiles.length" class="px-4 py-2 border-t border-gray-800 flex gap-2 flex-wrap">
			<div
				v-for="(file, i) in pendingFiles"
				:key="file.name"
				class="flex items-center gap-1.5 px-2 py-1 bg-gray-800 rounded text-xs text-gray-300"
			>
				<span>📎 {{ file.name }}</span>
				<button class="text-gray-500 hover:text-gray-300" @click="pendingFiles.splice(i, 1)">
					×
				</button>
			</div>
		</div>

		<div class="border-t border-gray-800 p-4">
			<div class="flex items-end gap-2">
				<FileUpload v-if="mode === 'test'" @files="onFiles" />
				<textarea
					ref="textareaRef"
					v-model="input"
					:disabled="!canSend"
					:placeholder="
						mode === 'build' ? 'Describe the agent you want to build...' : 'Type a message...'
					"
					rows="1"
					class="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-sm resize-none focus:outline-none focus:border-gray-500 disabled:opacity-50"
					style="max-height: 200px; overflow-y: auto; scrollbar-width: none"
					@keydown.enter.exact.prevent="send"
					@input="autoResize"
				/>
				<!-- Split send button: [chevron | Send] -->
				<div v-if="mode === 'test'" class="relative flex shrink-0">
					<button
						class="px-2 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-l-lg border-r border-blue-700 disabled:border-gray-600 text-sm transition-colors"
						:disabled="!canSend || loading || (!input.trim() && !pendingFiles.length)"
						@click.stop="sendMenuOpen = !sendMenuOpen"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="w-4 h-4 transition-transform"
							:class="{ 'rotate-180': sendMenuOpen }"
							viewBox="0 0 20 20"
							fill="currentColor"
						>
							<path
								fill-rule="evenodd"
								d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
								clip-rule="evenodd"
							/>
						</svg>
					</button>
					<button
						:disabled="!canSend || loading || (!input.trim() && !pendingFiles.length)"
						class="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-r-lg text-sm font-medium transition-colors"
						@click="send"
					>
						Send
					</button>
					<!-- Drop-up menu -->
					<div
						v-if="sendMenuOpen"
						class="absolute bottom-full mb-1 right-0 bg-gray-800 border border-gray-700 rounded-lg shadow-lg overflow-hidden min-w-[140px] z-20"
					>
						<button
							class="w-full px-3 py-2 text-left text-xs hover:bg-gray-700 transition-colors flex items-center justify-between"
							:class="streaming ? 'text-blue-400' : 'text-gray-300'"
							@click.stop="
								streaming = true;
								sendMenuOpen = false;
							"
						>
							Streaming
							<span v-if="streaming" class="text-blue-400">&#10003;</span>
						</button>
						<button
							class="w-full px-3 py-2 text-left text-xs hover:bg-gray-700 transition-colors flex items-center justify-between"
							:class="!streaming ? 'text-blue-400' : 'text-gray-300'"
							@click.stop="
								streaming = false;
								sendMenuOpen = false;
							"
						>
							Non-streaming
							<span v-if="!streaming" class="text-blue-400">&#10003;</span>
						</button>
					</div>
				</div>
				<!-- Simple send button for build mode -->
				<button
					v-else
					:disabled="!canSend || loading || (!input.trim() && !pendingFiles.length)"
					class="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg text-sm font-medium transition-colors"
					@click="send"
				>
					Send
				</button>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { UploadedFile } from './FileUpload.vue';

interface PendingApproval {
	runId: string;
	toolCallId: string;
	tool: string;
	input: unknown;
}

interface SubAgentUsageInfo {
	agent: string;
	model?: string;
	usage: { promptTokens: number; completionTokens: number; totalTokens: number; cost?: number };
}

interface UsageInfo {
	model?: string;
	promptTokens: number;
	completionTokens: number;
	totalTokens: number;
	cost?: number;
	totalCost?: number;
	subAgentUsage?: SubAgentUsageInfo[];
}

interface Message {
	role: 'user' | 'assistant';
	content: string;
	thinking?: string;
	files?: UploadedFile[];
	usage?: UsageInfo;
	toolCalls?: Array<{ tool: string; input: unknown; output: unknown }>;
	pendingApproval?: PendingApproval;
	approvalStatus?: 'approved' | 'denied';
}

const props = defineProps<{
	agentReady: boolean;
	mode: 'build' | 'test';
	editorCode: string;
}>();

const emit = defineEmits<{
	generated: [code: string];
}>();

const STORAGE_KEYS = { build: 'n8n-agents-build-messages', test: 'n8n-agents-test-messages' };

function loadMessages(key: string): Message[] {
	try {
		const raw = localStorage.getItem(key);
		if (!raw) return [];
		const parsed = JSON.parse(raw) as Message[];
		return parsed.filter((m): m is Message => m != null && typeof m.role === 'string');
	} catch {
		return [];
	}
}

function saveMessages(key: string, messages: Message[]) {
	localStorage.setItem(key, JSON.stringify(messages));
}

const input = ref('');
const buildMessages = ref<Message[]>(loadMessages(STORAGE_KEYS.build));
const testMessages = ref<Message[]>(loadMessages(STORAGE_KEYS.test));
const loading = ref(false);
const responding = ref(false);
const streaming = ref(true);
const sendMenuOpen = ref(false);
const pendingFiles = ref<UploadedFile[]>([]);
const messagesContainer = ref<HTMLElement | undefined>();
const textareaRef = ref<HTMLTextAreaElement | undefined>();
const dragOver = ref(false);

function autoResize() {
	const el = textareaRef.value;
	if (!el) return;
	el.style.height = 'auto';
	el.style.height = `${el.scrollHeight}px`;
}

watch(buildMessages, (msgs) => saveMessages(STORAGE_KEYS.build, msgs), { deep: true });
watch(testMessages, (msgs) => saveMessages(STORAGE_KEYS.test, msgs), { deep: true });

const activeMessages = computed(() =>
	props.mode === 'build' ? buildMessages.value : testMessages.value,
);

const canSend = computed(() => {
	if (loading.value) return false;
	if (props.mode === 'test') return props.agentReady;
	// Build mode is always available
	return true;
});

function onFiles(files: UploadedFile[]) {
	pendingFiles.value.push(...files);
}

function onDrop(event: DragEvent) {
	dragOver.value = false;
	const files = event.dataTransfer?.files;
	if (!files?.length) return;

	const promises = Array.from(files).map(
		(file) =>
			new Promise<UploadedFile>((resolve) => {
				const reader = new FileReader();
				reader.onload = () => {
					resolve({
						name: file.name,
						type: file.type,
						data: (reader.result as string).split(',')[1],
					});
				};
				reader.readAsDataURL(file);
			}),
	);

	Promise.all(promises).then((uploaded) => {
		pendingFiles.value.push(...uploaded);
	});
}

function scrollToBottom() {
	nextTick(() => {
		if (messagesContainer.value) {
			messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
		}
	});
}

async function approveToolCall(msgIndex: number) {
	const msg = activeMessages.value[msgIndex];
	if (!msg?.pendingApproval) return;

	const { runId, toolCallId } = msg.pendingApproval;
	const messages = props.mode === 'build' ? buildMessages : testMessages;

	// Mark this approval message as resolved
	messages.value[msgIndex] = {
		...messages.value[msgIndex],
		pendingApproval: undefined,
		approvalStatus: 'approved',
	};
	loading.value = true;
	responding.value = true;
	scrollToBottom();

	// The approve endpoint returns a new SSE stream — read it as a new response
	try {
		const response = await fetch('/api/agent/approve', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ runId, toolCallId }),
		});

		const reader = response.body?.getReader();
		if (reader) {
			await handleTestResponse(reader, messages);
		}
	} catch {
		// handled by handleTestResponse
	} finally {
		loading.value = false;
		responding.value = false;
		scrollToBottom();
	}
}

async function denyToolCall(msgIndex: number) {
	const msg = activeMessages.value[msgIndex];
	if (!msg?.pendingApproval) return;

	const { runId, toolCallId } = msg.pendingApproval;
	const messages = props.mode === 'build' ? buildMessages : testMessages;

	messages.value[msgIndex] = {
		...messages.value[msgIndex],
		pendingApproval: undefined,
		approvalStatus: 'denied',
	};
	loading.value = true;
	responding.value = true;
	scrollToBottom();

	try {
		const response = await fetch('/api/agent/deny', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ runId, toolCallId }),
		});

		const reader = response.body?.getReader();
		if (reader) {
			await handleTestResponse(reader, messages);
		}
	} catch {
		// handled by handleTestResponse
	} finally {
		loading.value = false;
		responding.value = false;
		scrollToBottom();
	}
}

async function clearMessages() {
	if (props.mode === 'build') {
		buildMessages.value = [];
		localStorage.removeItem(STORAGE_KEYS.build);
		await fetch('/api/agent/clear', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ sessionId: 'builder' }),
		});
	} else {
		testMessages.value = [];
		localStorage.removeItem(STORAGE_KEYS.test);
	}
}

defineExpose({ clearMessages });

function parseSSE(buffer: string): { events: Array<Record<string, unknown>>; remaining: string } {
	const parts = buffer.split('\n\n');
	const remaining = parts.pop() ?? '';
	const events: Array<Record<string, unknown>> = [];

	for (const part of parts) {
		const line = part.trim();
		if (!line.startsWith('data: ')) continue;
		try {
			events.push(JSON.parse(line.slice(6)));
		} catch {
			// skip malformed JSON
		}
	}

	return { events, remaining };
}

async function send() {
	const text = input.value.trim();
	const files = [...pendingFiles.value];

	if (!text && files.length === 0) return;

	const messages = props.mode === 'build' ? buildMessages : testMessages;

	messages.value.push({
		role: 'user',
		content: text,
		files: files.length > 0 ? files : undefined,
	});
	input.value = '';
	pendingFiles.value = [];
	loading.value = true;
	responding.value = true;
	if (textareaRef.value) textareaRef.value.style.height = 'auto';
	scrollToBottom();

	try {
		const url = props.mode === 'build' ? '/api/agent/build' : '/api/agent/chat';
		const useStreaming = props.mode === 'build' || streaming.value;
		const payload =
			props.mode === 'build'
				? { message: text, editorCode: props.editorCode, sessionId: 'builder' }
				: { message: text, files, stream: useStreaming };

		// Push empty assistant placeholder before fetch so the spinner is visible immediately
		const placeholderIdx = messages.value.length;
		messages.value.push({ role: 'assistant', content: '' });
		scrollToBottom();

		const response = await fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			messages.value[placeholderIdx] = {
				role: 'assistant',
				content: `**Error:** ${response.statusText}`,
			};
			return;
		}

		if (!useStreaming) {
			// Non-streaming: update placeholder when response arrives
			const data = await response.json();
			messages.value[placeholderIdx] = {
				role: 'assistant',
				content: data.text ?? '',
				toolCalls: data.toolCalls,
				usage: data.usage,
			};
			return;
		}

		// Streaming path: remove the placeholder — handleBuildResponse/handleTestResponse
		// push their own placeholder message.
		messages.value.splice(placeholderIdx, 1);

		const reader = response.body?.getReader();
		if (!reader) {
			messages.value.push({ role: 'assistant', content: '**Error:** No response stream' });
			return;
		}

		if (props.mode === 'build') {
			await handleBuildResponse(reader, messages);
		} else {
			await handleTestResponse(reader, messages);
		}
	} catch (e: unknown) {
		const errorMessage = e instanceof Error ? e.message : 'Failed to get response';
		messages.value.push({ role: 'assistant', content: `**Error:** ${errorMessage}` });
	} finally {
		loading.value = false;
		responding.value = false;
		scrollToBottom();
	}
}

/**
 * Build mode: stream text and tool events in real-time.
 * The builder uses a set_code tool to push code to the editor,
 * so all other output (text, tool calls) streams normally.
 */
async function handleBuildResponse(
	reader: ReadableStreamDefaultReader<Uint8Array>,
	messages: Ref<Message[]>,
) {
	const assistantIndex = messages.value.length;
	messages.value.push({ role: 'assistant', content: '' });
	// Keep loading spinner visible until first text arrives
	scrollToBottom();

	const decoder = new TextDecoder();
	let buffer = '';
	let accumulated = '';
	let thinking = '';
	let usage: UsageInfo | undefined;
	const toolCalls: Array<{ tool: string; input: unknown; output: unknown }> = [];
	let pendingToolCall: { tool: string; input: unknown } | undefined;
	let hadToolSinceLastText = false;

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;

		buffer += decoder.decode(value, { stream: true });
		const { events, remaining } = parseSSE(buffer);
		buffer = remaining;

		for (const data of events) {
			if (data.error) {
				accumulated += `\n\n**Error:** ${data.error}`;
				loading.value = false;
			} else if (data.thinking) {
				thinking += data.thinking as string;
				loading.value = false;
			} else if (data.text) {
				if (hadToolSinceLastText && accumulated.length > 0) {
					accumulated += '\n\n';
					hadToolSinceLastText = false;
				}
				accumulated += data.text as string;
				loading.value = false;
			} else if (data.code) {
				emit('generated', data.code as string);
			} else if (data.toolCall) {
				const tc = data.toolCall as { tool: string; input: unknown };
				pendingToolCall = tc;
				hadToolSinceLastText = true;
				loading.value = true;
			} else if (data.toolResult) {
				const tr = data.toolResult as { tool: string; output: unknown };
				toolCalls.push({
					tool: tr.tool,
					input: pendingToolCall?.tool === tr.tool ? pendingToolCall.input : undefined,
					output: tr.output,
				});
				pendingToolCall = undefined;
				loading.value = false;
			} else if (data.usage) {
				usage = data.usage as UsageInfo;
			}
		}

		messages.value[assistantIndex] = {
			...messages.value[assistantIndex],
			content: accumulated,
			thinking: thinking || undefined,
			usage,
			toolCalls: toolCalls.length > 0 ? [...toolCalls] : undefined,
		};
		scrollToBottom();
	}

	loading.value = false;

	if (!accumulated.trim() && toolCalls.length === 0) {
		messages.value[assistantIndex] = {
			...messages.value[assistantIndex],
			content: 'Agent code updated.',
		};
	}
}

/**
 * Test mode: stream text and tool call events in real-time.
 * The server sends interleaved events from Mastra's fullStream:
 * - { text } — text deltas
 * - { toolCall: { tool, input } } — tool call started
 * - { toolResult: { tool, output } } — tool call completed
 *
 * When a tool call happens mid-stream, we show a loading spinner
 * and add a newline before subsequent text.
 */
async function handleTestResponse(
	reader: ReadableStreamDefaultReader<Uint8Array>,
	messages: Ref<Message[]>,
) {
	const assistantIndex = messages.value.length;
	messages.value.push({ role: 'assistant', content: '' });
	loading.value = false;
	scrollToBottom();

	const decoder = new TextDecoder();
	let buffer = '';
	let accumulated = '';
	let thinking = '';
	let usage: UsageInfo | undefined;
	const toolCalls: Array<{ tool: string; input: unknown; output: unknown }> = [];
	const serverFiles: Array<{ name: string; type: string; data: string }> = [];
	let pendingToolCall: { tool: string; input: unknown } | undefined;
	let needsNewline = false;

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;

		buffer += decoder.decode(value, { stream: true });
		const { events, remaining } = parseSSE(buffer);
		buffer = remaining;

		for (const data of events) {
			if (data.error) {
				accumulated += `\n\n**Error:** ${data.error}`;
				loading.value = false;
			} else if (data.thinking) {
				thinking += data.thinking as string;
				loading.value = false;
			} else if (data.text) {
				accumulated += data.text as string;
				loading.value = false;
			} else if (data.toolCall) {
				const tc = data.toolCall as { tool: string; input: unknown };
				pendingToolCall = tc;
				loading.value = true;
			} else if (data.toolResult) {
				const tr = data.toolResult as { tool: string; output: unknown };
				toolCalls.push({
					tool: tr.tool,
					input: pendingToolCall?.tool === tr.tool ? pendingToolCall.input : undefined,
					output: tr.output,
				});
				pendingToolCall = undefined;
			} else if (data.usage) {
				usage = data.usage as UsageInfo;
			} else if (data.approval) {
				const approval = data.approval as PendingApproval;
				loading.value = false;

				if (accumulated.trim() || toolCalls.length > 0 || serverFiles.length > 0) {
					// There's content before the approval — finalize it, push approval as new message
					messages.value[assistantIndex] = {
						...messages.value[assistantIndex],
						content: accumulated,
						thinking: thinking || undefined,
						usage,
						toolCalls: toolCalls.length > 0 ? [...toolCalls] : undefined,
						files: serverFiles.length > 0 ? [...serverFiles] : undefined,
					};
					messages.value.push({
						role: 'assistant',
						content: '',
						pendingApproval: approval,
					});
				} else {
					// No content yet — reuse the current empty message for the approval
					messages.value[assistantIndex] = {
						...messages.value[assistantIndex],
						pendingApproval: approval,
					};
				}
				scrollToBottom();
				return;
			} else if (data.toolCalls) {
				// Legacy: batch tool calls (fallback path)
				toolCalls.push(...(data.toolCalls as typeof toolCalls));
			} else if (data.file) {
				const f = data.file as { data: string; mediaType: string };
				const ext = f.mediaType?.split('/')[1] ?? 'bin';
				const name = `file.${ext}`;
				serverFiles.push({
					name,
					type: f.mediaType ?? 'application/octet-stream',
					data: f.data,
				});
			}
		}

		messages.value[assistantIndex] = {
			...messages.value[assistantIndex],
			content: accumulated,
			thinking: thinking || undefined,
			usage,
			toolCalls: toolCalls.length > 0 ? [...toolCalls] : undefined,
			files: serverFiles.length > 0 ? [...serverFiles] : undefined,
		};
		scrollToBottom();
	}

	loading.value = false;

	if (!accumulated.trim() && toolCalls.length === 0 && serverFiles.length === 0) {
		// Remove the empty placeholder if nothing was streamed
		messages.value.splice(assistantIndex, 1);
	} else {
		messages.value[assistantIndex] = {
			...messages.value[assistantIndex],
			content: accumulated,
			thinking: thinking || undefined,
			usage,
			toolCalls: toolCalls.length > 0 ? [...toolCalls] : undefined,
			files: serverFiles.length > 0 ? [...serverFiles] : undefined,
		};
	}
}
</script>
