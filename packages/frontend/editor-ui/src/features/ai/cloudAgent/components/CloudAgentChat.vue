<script setup lang="ts">
import { ref } from 'vue';

import { useCloudAgentStore } from '../cloudAgent.store';
import type { CloudAgentAssistantMessage } from '../cloudAgent.types';

const store = useCloudAgentStore();
const input = ref('');

async function send() {
	const text = input.value.trim();
	if (!text || store.isRunning) return;
	input.value = '';
	await store.sendMessage(text);
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
					<details v-for="call in message.toolCalls" :key="call.toolCallId" class="tool-call">
						<summary>
							<code>{{ call.name }}</code>
							<small v-if="call.family">({{ call.family }})</small>
							<span v-if="call.result?.isError" class="error-badge">error</span>
						</summary>
						<pre>{{ formatToolArgs(call.args) }}</pre>
						<pre v-if="call.result">{{ formatToolArgs(call.result.output) }}</pre>
					</details>
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
