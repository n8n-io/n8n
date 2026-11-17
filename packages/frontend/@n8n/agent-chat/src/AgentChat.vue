<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue';

import { fetchConfig, loginWithPopup, sendMessage, type ChatConfig } from './api';
import { renderMarkdown } from './markdown';

const props = defineProps<{
	base: string;
	mode: 'fullscreen' | 'bubble';
	title?: string;
	welcomeMessage?: string;
	theme: 'n8n' | 'default';
}>();

interface Tool {
	id: string;
	name: string;
	done: boolean;
}
interface Message {
	role: 'user' | 'agent';
	text: string;
	tools: Tool[];
	error?: boolean;
}

const config = ref<ChatConfig>();
const loadError = ref('');
const open = ref(props.mode === 'fullscreen');
const messages = ref<Message[]>([]);
const input = ref('');
const busy = ref(false);
const conversationId = ref<string>();
const list = ref<HTMLElement>();
let abort: AbortController | undefined;

const title = computed(() => props.title ?? config.value?.name ?? 'Agent');
const welcome = computed(() => props.welcomeMessage ?? config.value?.welcomeMessage);

// Embed sign-in: the token lives in this tab's storage of the host page (first-party).
const storageKey = `n8n-agent-chat:${props.base}`;
const stored = readSession();
const token = ref<string | undefined>(stored?.token);
const userName = ref<string | undefined>(stored?.user);
const signingIn = ref(false);
const sameOrigin = new URL(props.base, location.href).origin === location.origin;
const needsLogin = computed(
	() => config.value?.access === 'users' && !config.value.user && !token.value,
);
const signedInAs = computed(() => config.value?.user?.name ?? userName.value);

function readSession(): { token: string; user: string } | undefined {
	try {
		return JSON.parse(sessionStorage.getItem(storageKey) ?? 'null') ?? undefined;
	} catch {
		return undefined;
	}
}
function writeSession(value?: { token: string; user: string }) {
	try {
		if (value) sessionStorage.setItem(storageKey, JSON.stringify(value));
		else sessionStorage.removeItem(storageKey);
	} catch {}
}

async function loadConfig() {
	try {
		config.value = await fetchConfig(props.base, token.value);
		// A token the server no longer knows (expired, restart): sign in again.
		if (token.value && config.value.access === 'users' && !config.value.user) signOut();
	} catch (error) {
		loadError.value = (error as Error).message;
	}
}
onMounted(loadConfig);

async function signIn() {
	if (!config.value) return;
	// Hosted page: same origin, the normal n8n sign-in sets the cookie and comes back.
	if (sameOrigin) {
		location.href = config.value.signInUrl;
		return;
	}
	signingIn.value = true;
	loadError.value = '';
	try {
		const result = await loginWithPopup(config.value.loginUrl);
		token.value = result.token;
		userName.value = result.user.name;
		writeSession({ token: result.token, user: result.user.name });
		newChat();
		await loadConfig();
	} catch (error) {
		loadError.value = (error as Error).message;
	} finally {
		signingIn.value = false;
	}
}

function signOut() {
	token.value = undefined;
	userName.value = undefined;
	writeSession();
	newChat();
}

const scrollDown = () => nextTick(() => list.value?.scrollTo({ top: list.value.scrollHeight }));

async function send() {
	const text = input.value.trim();
	if (!text || busy.value) return;
	input.value = '';
	busy.value = true;
	messages.value.push({ role: 'user', text, tools: [] });
	messages.value.push({ role: 'agent', text: '', tools: [] });
	const reply = messages.value[messages.value.length - 1];
	scrollDown();
	abort = new AbortController();
	try {
		for await (const event of sendMessage(
			props.base,
			{ message: text, conversationId: conversationId.value },
			abort.signal,
			token.value,
		)) {
			if (event.type === 'conversation') conversationId.value = event.id;
			else if (event.type === 'text') reply.text += event.delta;
			else if (event.type === 'tool-start')
				reply.tools.push({ id: event.id, name: event.name, done: false });
			else if (event.type === 'tool-end') {
				const tool = reply.tools.find((t) => t.id === event.id);
				if (tool) tool.done = true;
			} else if (event.type === 'notice') reply.text += `\n\n_${event.text}_`;
			else if (event.type === 'error') {
				reply.text += (reply.text ? '\n\n' : '') + event.message;
				reply.error = true;
				// The server forgot the conversation: start a new one on the next message.
				if (event.code === 'conversation_not_found') conversationId.value = undefined;
				if (event.code === 'login_required') signOut();
			}
			scrollDown();
		}
	} catch (error) {
		if (!abort.signal.aborted) {
			reply.text = (error as Error).message;
			reply.error = true;
		}
	} finally {
		busy.value = false;
		abort = undefined;
	}
}

function newChat() {
	abort?.abort();
	messages.value = [];
	conversationId.value = undefined;
}

function onKeydown(event: KeyboardEvent) {
	if (event.key === 'Enter' && !event.shiftKey) {
		event.preventDefault();
		void send();
	}
}
</script>

<template>
	<div :class="['agent-chat', `agent-chat--${mode}`, `agent-chat--theme-${theme}`]">
		<section v-if="open" class="agent-chat__window" role="dialog" :aria-label="title">
			<header class="agent-chat__header">
				<svg v-if="theme === 'n8n'" class="agent-chat__logo" viewBox="0 0 240 96" aria-label="n8n">
					<path
						d="M48 96C52.5 96 54 94.5 54 90V78C54 60 60 54 78 54H90C108 54 114 60 114 78V90C114 94.5 115.5 96 120 96C124.5 96 126 94.5 126 90V78C126 60 132 54 150 54H162C180 54 186 60 186 78V90C186 94.5 187.5 96 192 96C196.5 96 198 94.5 198 90V78C198 60 204 54 222 54H234C238.5 54 240 52.5 240 48C240 43.5 238.5 42 234 42H222C204 42 198 36 198 18V6C198 1.5 196.5 0 192 0C187.5 0 186 1.5 186 6V18C186 36 180 42 162 42H150C132 42 126 36 126 18V6C126 1.5 124.5 0 120 0C115.5 0 114 1.5 114 6V18C114 36 108 42 90 42H78C60 42 54 36 54 18V6C54 1.5 52.5 0 48 0C43.5 0 42 1.5 42 6V18C42 36 36 42 18 42H6C1.5 42 0 43.5 0 48C0 52.5 1.5 54 6 54H18C36 54 42 60 42 78V90C42 94.5 43.5 96 48 96Z"
					/>
				</svg>
				<span class="agent-chat__title">{{ title }}</span>
				<button
					class="agent-chat__icon-button"
					type="button"
					title="New conversation"
					@click="newChat"
				>
					↻
				</button>
				<button
					v-if="mode === 'bubble'"
					class="agent-chat__icon-button"
					type="button"
					title="Close"
					@click="open = false"
				>
					✕
				</button>
			</header>
			<div ref="list" class="agent-chat__messages" aria-live="polite">
				<p
					v-if="loadError"
					class="agent-chat__message agent-chat__message--agent agent-chat__message--error"
				>
					{{ loadError }}
				</p>
				<div
					v-if="welcome && !loadError"
					class="agent-chat__message agent-chat__message--agent"
					v-html="renderMarkdown(welcome)"
				/>
				<div v-if="needsLogin" class="agent-chat__signin" data-testid="agent-chat-signin">
					<p>Sign in with your n8n account to chat with {{ title }}.</p>
					<button class="agent-chat__send" type="button" :disabled="signingIn" @click="signIn">
						{{ signingIn ? 'Waiting for sign-in…' : 'Sign in with n8n' }}
					</button>
				</div>
				<div
					v-for="(message, index) in messages"
					:key="index"
					:class="[
						'agent-chat__message',
						`agent-chat__message--${message.role}`,
						{ 'agent-chat__message--error': message.error },
					]"
				>
					<div v-for="tool in message.tools" :key="tool.id" class="agent-chat__tool">
						<span :class="['agent-chat__dot', { 'agent-chat__dot--done': tool.done }]" />
						{{ tool.done ? 'Used' : 'Using' }} {{ tool.name }}
					</div>
					<div
						v-if="message.role === 'agent' && message.text"
						v-html="renderMarkdown(message.text)"
					/>
					<template v-else-if="message.role === 'user'">{{ message.text }}</template>
					<span v-else-if="busy && !message.tools.length" class="agent-chat__typing">…</span>
				</div>
			</div>
			<div
				v-if="signedInAs && !needsLogin"
				class="agent-chat__identity"
				data-testid="agent-chat-identity"
			>
				Signed in as {{ signedInAs }}
				<button v-if="token" class="agent-chat__link" type="button" @click="signOut">
					Sign out
				</button>
			</div>
			<form v-if="!needsLogin" class="agent-chat__composer" @submit.prevent="send">
				<textarea
					v-model="input"
					class="agent-chat__input"
					rows="1"
					placeholder="Message"
					:disabled="!!loadError"
					@keydown="onKeydown"
				/>
				<button class="agent-chat__send" type="submit" :disabled="busy || !input.trim()">
					Send
				</button>
			</form>
			<footer class="agent-chat__footer">
				Powered by n8n · Conversations are visible to the agent's owner
			</footer>
		</section>
		<button
			v-if="mode === 'bubble'"
			class="agent-chat__launcher"
			type="button"
			:aria-label="open ? 'Close chat' : `Chat with ${title}`"
			@click="open = !open"
		>
			{{ open ? '✕' : '💬' }}
		</button>
	</div>
</template>

<style>
/* Theme tokens: an embedder overrides them on the host element (they pass into the shadow root). */
:host {
	--agent-chat--color-primary: #ff6d5a;
	--agent-chat--color-on-primary: #fff;
	--agent-chat--color-background: #fff;
	--agent-chat--color-surface: #f4f4f6;
	--agent-chat--color-text: #1f1f29;
	--agent-chat--color-text-light: #6b6b7b;
	--agent-chat--color-border: #e3e3ea;
	--agent-chat--radius: 12px;
	--agent-chat--font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
	--agent-chat--width: 400px;
	--agent-chat--height: 600px;
	all: initial;
}
.agent-chat {
	font-family: var(--agent-chat--font-family);
	color: var(--agent-chat--color-text);
	font-size: 15px;
	line-height: 1.5;
}
.agent-chat * {
	box-sizing: border-box;
}
.agent-chat--fullscreen,
.agent-chat--fullscreen .agent-chat__window {
	position: fixed;
	inset: 0;
	border: 0;
	border-radius: 0;
	width: auto;
	height: auto;
	max-height: none;
}
.agent-chat--bubble {
	position: fixed;
	right: 20px;
	bottom: 20px;
	z-index: 2147483000;
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	gap: 12px;
}
.agent-chat__window {
	display: flex;
	flex-direction: column;
	width: min(var(--agent-chat--width), calc(100vw - 40px));
	height: min(var(--agent-chat--height), calc(100vh - 100px));
	background: var(--agent-chat--color-background);
	border: 1px solid var(--agent-chat--color-border);
	border-radius: var(--agent-chat--radius);
	box-shadow: 0 8px 30px rgb(0 0 0 / 12%);
	overflow: hidden;
}
.agent-chat__header {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 14px 16px;
	border-bottom: 1px solid var(--agent-chat--color-border);
}
.agent-chat__logo {
	width: 28px;
	height: 12px;
	fill: var(--agent-chat--color-primary);
}
/* Hosted page: n8n's brand. The embed keeps the neutral tokens above for the embedder's brand. */
.agent-chat--theme-n8n {
	--agent-chat--color-primary: #ea4b71;
	--agent-chat--color-surface: #f2f2f5;
	--agent-chat--color-text: #2d2e3a;
	--agent-chat--color-border: #dcdce4;
	--agent-chat--radius: 8px;
}
.agent-chat--theme-n8n.agent-chat--fullscreen {
	--agent-chat--color-background: #f7f7fa;
	--agent-chat--color-surface: #fff;
}
.agent-chat--theme-n8n.agent-chat--fullscreen .agent-chat__header {
	background: #fff;
	border-bottom-color: var(--agent-chat--color-border);
}
.agent-chat__title {
	flex: 1;
	font-weight: 600;
	font-size: 16px;
}
.agent-chat__icon-button {
	border: 0;
	background: none;
	color: var(--agent-chat--color-text-light);
	font-size: 16px;
	cursor: pointer;
	padding: 4px 6px;
	border-radius: 6px;
}
.agent-chat__icon-button:hover {
	background: var(--agent-chat--color-surface);
}
.agent-chat__messages {
	flex: 1;
	overflow-y: auto;
	padding: 16px;
	display: flex;
	flex-direction: column;
	gap: 10px;
}
.agent-chat--fullscreen .agent-chat__messages,
.agent-chat--fullscreen .agent-chat__identity,
.agent-chat--fullscreen .agent-chat__composer {
	width: 100%;
	max-width: 760px;
	margin: 0 auto;
}
.agent-chat__message {
	max-width: 85%;
	padding: 10px 14px;
	border-radius: var(--agent-chat--radius);
	overflow-wrap: anywhere;
}
.agent-chat__message p {
	margin: 0 0 8px;
}
.agent-chat__message p:last-child {
	margin-bottom: 0;
}
.agent-chat__message pre {
	overflow-x: auto;
	background: rgb(0 0 0 / 6%);
	padding: 8px;
	border-radius: 6px;
}
.agent-chat__message a {
	color: inherit;
}
.agent-chat__message--user {
	align-self: flex-end;
	background: var(--agent-chat--color-primary);
	color: var(--agent-chat--color-on-primary);
	white-space: pre-wrap;
}
.agent-chat__message--agent {
	align-self: flex-start;
	background: var(--agent-chat--color-surface);
}
.agent-chat__message--error {
	color: #c0392b;
}
.agent-chat__tool {
	display: flex;
	align-items: center;
	gap: 6px;
	font-size: 13px;
	color: var(--agent-chat--color-text-light);
	margin-bottom: 4px;
}
.agent-chat__dot {
	width: 8px;
	height: 8px;
	border-radius: 50%;
	background: var(--agent-chat--color-primary);
	animation: agent-chat-pulse 1s infinite alternate;
}
.agent-chat__dot--done {
	background: #2e9e5b;
	animation: none;
}
.agent-chat__typing {
	color: var(--agent-chat--color-text-light);
	animation: agent-chat-pulse 1s infinite alternate;
}
@keyframes agent-chat-pulse {
	from {
		opacity: 0.3;
	}
	to {
		opacity: 1;
	}
}
.agent-chat__signin {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: 8px;
	padding: 16px;
}
.agent-chat__identity {
	padding: 0 16px;
	font-size: 12px;
	color: var(--agent-chat--color-text-light);
}
.agent-chat__link {
	all: unset;
	cursor: pointer;
	text-decoration: underline;
	margin-left: 6px;
}
.agent-chat__composer {
	display: flex;
	gap: 8px;
	padding: 12px 16px 6px;
}
.agent-chat__input {
	flex: 1;
	resize: none;
	font: inherit;
	padding: 10px 12px;
	border: 1px solid var(--agent-chat--color-border);
	border-radius: var(--agent-chat--radius);
	outline: none;
	max-height: 140px;
}
.agent-chat__input:focus {
	border-color: var(--agent-chat--color-primary);
}
.agent-chat__send {
	border: 0;
	border-radius: var(--agent-chat--radius);
	padding: 0 16px;
	font: inherit;
	font-weight: 600;
	background: var(--agent-chat--color-primary);
	color: var(--agent-chat--color-on-primary);
	cursor: pointer;
}
.agent-chat__send:disabled {
	opacity: 0.5;
	cursor: default;
}
.agent-chat__footer {
	text-align: center;
	font-size: 11px;
	color: var(--agent-chat--color-text-light);
	padding: 0 16px 10px;
}
.agent-chat__launcher {
	width: 56px;
	height: 56px;
	border-radius: 50%;
	border: 0;
	background: var(--agent-chat--color-primary);
	color: var(--agent-chat--color-on-primary);
	font-size: 22px;
	cursor: pointer;
	box-shadow: 0 4px 16px rgb(0 0 0 / 20%);
}
</style>
