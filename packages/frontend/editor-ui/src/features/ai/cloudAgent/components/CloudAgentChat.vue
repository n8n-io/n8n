<script setup lang="ts">
import { ref } from 'vue';

import { useCloudAgentStore } from '../cloudAgent.store';
import type { CloudAgentAssistantMessage, CloudAgentToolCall } from '../cloudAgent.types';

const store = useCloudAgentStore();
const input = ref('');

// Per-tool-call drafts for ask_user replies. Keyed by toolCallId.
const answerDrafts = ref<Record<string, string>>({});

async function send() {
	const text = input.value.trim();
	if (!text || store.isRunning) return;
	input.value = '';
	await store.sendMessage(text);
}

async function sendAnswer(call: CloudAgentToolCall) {
	const draft = (answerDrafts.value[call.toolCallId] ?? '').trim();
	if (!draft) return;
	await store.answerQuestion(call.toolCallId, draft);
	delete answerDrafts.value[call.toolCallId];
}

function formatToolArgs(args: unknown): string {
	try {
		return JSON.stringify(args, null, 2);
	} catch {
		return String(args);
	}
}

function isAssistant(m: { role: string }): m is CloudAgentAssistantMessage {
	return m.role === 'assistant';
}

function isAskUser(call: CloudAgentToolCall): boolean {
	return call.name === 'ask_user';
}

function askUserQuestion(call: CloudAgentToolCall): string {
	const args = call.args as { question?: string } | null | undefined;
	return args?.question ?? '';
}

function askUserOptions(call: CloudAgentToolCall): string[] {
	const args = call.args as { options?: string[] } | null | undefined;
	return Array.isArray(args?.options) ? args.options : [];
}

function pickOption(call: CloudAgentToolCall, option: string) {
	answerDrafts.value[call.toolCallId] = option;
	void sendAnswer(call);
}
</script>

<template>
	<div class="cloud-agent-chat">
		<header class="header">
			<span class="title">Cloud Agent</span>
			<span class="conn" :data-state="store.connectionState">{{ store.connectionState }}</span>
		</header>

		<ol class="messages">
			<li v-for="message in store.messages" :key="message.id" :class="['message', message.role]">
				<div v-if="message.role === 'user'" class="user-text">{{ message.content }}</div>
				<template v-else-if="isAssistant(message)">
					<div v-if="message.text" class="assistant-text">{{ message.text }}</div>
					<template v-for="call in message.toolCalls" :key="call.toolCallId">
						<!-- Interactive prompt for ask_user without a result yet -->
						<div v-if="isAskUser(call) && !call.result" class="ask-user">
							<div class="ask-user-question">{{ askUserQuestion(call) }}</div>
							<div v-if="askUserOptions(call).length > 0" class="ask-user-options">
								<button
									v-for="option in askUserOptions(call)"
									:key="option"
									type="button"
									class="ask-user-option"
									@click="pickOption(call, option)"
								>
									{{ option }}
								</button>
							</div>
							<div class="ask-user-input-row">
								<input
									v-model="answerDrafts[call.toolCallId]"
									class="input"
									placeholder="Type your answer…"
									@keydown.enter.prevent="sendAnswer(call)"
								/>
								<button
									type="button"
									class="send"
									:disabled="!(answerDrafts[call.toolCallId] ?? '').trim()"
									@click="sendAnswer(call)"
								>
									Send
								</button>
							</div>
						</div>
						<!-- Generic tool-call card (workflows/credentials/nodes/etc.) -->
						<details v-else class="tool-call">
							<summary>
								<code>{{ call.name }}</code>
								<small v-if="call.family">({{ call.family }})</small>
								<span v-if="call.result?.isError" class="error-badge">error</span>
								<span v-else-if="!call.result" class="pending-badge">running…</span>
							</summary>
							<pre>{{ formatToolArgs(call.args) }}</pre>
							<pre v-if="call.result">{{ formatToolArgs(call.result.output) }}</pre>
						</details>
					</template>
				</template>
			</li>
		</ol>

		<form class="input-row" @submit.prevent="send">
			<input
				v-model="input"
				class="input"
				:placeholder="store.isRunning ? 'Agent is working…' : 'Ask the cloud agent…'"
				:disabled="store.isRunning"
			/>
			<button v-if="store.isRunning" type="button" class="cancel" @click="store.cancel()">
				Cancel
			</button>
			<button v-else type="submit" class="send" :disabled="!input.trim()">Send</button>
		</form>
	</div>
</template>

<style scoped>
.cloud-agent-chat {
	display: flex;
	flex-direction: column;
	height: 100%;
	gap: 8px;
	padding: 12px;
}
.header {
	display: flex;
	align-items: center;
	gap: 8px;
}
.title {
	font-weight: 600;
}
.conn {
	font-size: 0.75rem;
	color: #888;
}
.messages {
	flex: 1;
	overflow-y: auto;
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: 8px;
}
.message {
	border-radius: 6px;
	padding: 8px 12px;
}
.message.user {
	align-self: flex-end;
	background: #e7f5ff;
}
.message.assistant {
	background: #f8f9fa;
}
.user-text,
.assistant-text {
	white-space: pre-wrap;
}
.tool-call {
	margin-top: 6px;
	font-size: 0.85rem;
}
.tool-call summary {
	cursor: pointer;
}
.tool-call pre {
	background: #fff;
	padding: 6px;
	border-radius: 4px;
	margin: 4px 0;
	max-height: 200px;
	overflow: auto;
}
.error-badge {
	color: #c92a2a;
	margin-left: 6px;
}
.pending-badge {
	color: #888;
	margin-left: 6px;
	font-style: italic;
}
.ask-user {
	margin-top: 8px;
	padding: 10px 12px;
	background: #fff7d6;
	border: 1px solid #f1c40f;
	border-radius: 6px;
}
.ask-user-question {
	font-weight: 600;
	margin-bottom: 8px;
	white-space: pre-wrap;
}
.ask-user-options {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
	margin-bottom: 8px;
}
.ask-user-option {
	padding: 4px 10px;
	border-radius: 4px;
	border: 1px solid #2563eb;
	background: white;
	color: #2563eb;
	cursor: pointer;
}
.ask-user-option:hover {
	background: #2563eb;
	color: white;
}
.ask-user-input-row {
	display: flex;
	gap: 6px;
}
.input-row {
	display: flex;
	gap: 6px;
}
.input {
	flex: 1;
	padding: 6px 10px;
	border-radius: 4px;
	border: 1px solid #ccc;
}
.send,
.cancel {
	padding: 6px 14px;
	border-radius: 4px;
	border: 1px solid #2563eb;
	background: #2563eb;
	color: white;
	cursor: pointer;
}
.cancel {
	border-color: #c92a2a;
	background: #c92a2a;
}
.send[disabled] {
	opacity: 0.5;
	cursor: not-allowed;
}
</style>
