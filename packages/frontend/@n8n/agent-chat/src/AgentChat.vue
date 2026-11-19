<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue';

import { themeCss } from './theme';

import {
	endSession,
	exchangeInvite,
	fetchConfig,
	fetchHistory,
	loginWithPopup,
	sendMessage,
	stopTurn,
	type ChatAppearance,
	type ChatConfig,
	type PreviewState,
} from './api';
import { renderMarkdown } from './markdown';

const props = defineProps<{
	base: string;
	mode: 'fullscreen' | 'bubble';
	theme: 'n8n' | 'default';
	/** From the snippet's data-* attributes: they win over the owner's appearance. */
	overrides?: ChatAppearance;
	/** Hide the round launcher: the host page opens the chat with window.n8nAgentChat.open(). */
	hideLauncher?: boolean;
	/** Theme editor preview: sample messages, no network. Reactive (the editor updates it). */
	preview?: PreviewState;
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
	/** Option B: a message that waits in the queue until the running turn ends. */
	queued?: boolean;
	files?: string[];
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

// Owner's appearance (or the editor's draft), then the snippet's data-* attributes on top.
const look = computed<ChatAppearance>(() => ({
	...(props.preview ? props.preview.appearance : config.value?.appearance),
	...Object.fromEntries(
		Object.entries(props.overrides ?? {}).filter(([, v]) => v !== undefined && v !== ''),
	),
}));
const css = computed(() => themeCss(look.value, props.theme, props.mode));
const title = computed(() => look.value.title || config.value?.name || 'Agent');
const welcome = computed(() => look.value.welcomeMessage || config.value?.welcomeMessage);
const launcherIcon = computed(() => {
	const icon = look.value.launcherIcon;
	if (icon === 'logo' && look.value.logoUrl) return undefined;
	return icon === 'sparkle' ? '✨' : icon === 'help' ? '?' : '💬';
});

// Embed sign-in: the token lives in this tab's storage of the host page (first-party).
const storageKey = `n8n-agent-chat:${props.base}`;
const stored = readSession();
const token = ref<string | undefined>(stored?.token);
const userName = ref<string | undefined>(stored?.user);
const signingIn = ref(false);
const sameOrigin = new URL(props.base, location.href).origin === location.origin;
// No identity and anonymous chat is off: the visitor cannot chat yet (or at all).
const needsLogin = computed(
	() => !!config.value && !config.value.methods.anonymous && !config.value.user && !token.value,
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
		if (token.value && !config.value.user) signOut();
		const stored = config.value.features?.history ? storedConversation() : undefined;
		if (stored && !needsLogin.value && !messages.value.length) {
			await loadHistory(stored);
			restored.value = messages.value.length;
		}
	} catch (error) {
		loadError.value = (error as Error).message;
	}
}
// Magic link (hosted page only): the token comes in the URL fragment, which never reaches a server.
// Take it out of the address bar at once, so it does not stay in history.
const inviteToken = sameOrigin
	? /(?:^#|&)invite=([A-Za-z0-9_-]+)/.exec(location.hash)?.[1]
	: undefined;
if (inviteToken) history.replaceState(null, '', location.pathname + location.search);
// A link opened in a tab that already shows this page changes only the fragment: load it as new.
if (sameOrigin) {
	window.addEventListener('hashchange', () => {
		if (location.hash.includes('invite=')) location.reload();
	});
}
const pendingSwitch = ref<{ current: string; label: string }>();

async function redeemInvite(replace: boolean) {
	if (!inviteToken) return;
	const result = await exchangeInvite(props.base, inviteToken, replace);
	pendingSwitch.value = undefined;
	if (result.ok) {
		newChat();
	} else if (result.code === 'session_exists') {
		// Another session is active: ask before replacing it (login CSRF guard).
		pendingSwitch.value = { current: result.current ?? '', label: result.label ?? '' };
	} else {
		loadError.value = result.message ?? 'This link does not work.';
	}
	await loadConfig();
}
onMounted(async () => {
	if (props.preview) return showPreview(props.preview);
	if (inviteToken) await redeemInvite(false);
	else await loadConfig();
});

/** Theme editor: a signed-in person mid-conversation, with a tool step. Nothing reaches a server. */
function showPreview(preview: PreviewState) {
	open.value = true;
	config.value = {
		name: preview.agentName,
		methods: { n8nUsers: true, magicLinks: true, anonymous: false },
		user: { name: 'Alex Doe', kind: 'invite' },
		variant: preview.variant,
		features: {
			history: preview.variant === 'n8n-chat',
			queue: preview.variant === 'n8n-chat',
			stop: preview.variant === 'n8n-chat',
			uploads: preview.variant === 'n8n-chat',
		},
		signInUrl: '',
		loginUrl: '',
	};
	messages.value = [
		{ role: 'user', text: 'Where is my order #1042?', tools: [] },
		{
			role: 'agent',
			text: 'Your order **#1042** shipped yesterday. It should arrive on Friday.',
			tools: [{ id: 'preview', name: 'get_order_status', done: true }],
		},
	];
}

defineExpose({
	setOpen: (value: boolean) => (open.value = value),
	toggle: () => (open.value = !open.value),
});

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

async function signOut() {
	if (config.value?.user?.kind === 'invite') {
		await endSession(props.base);
		newChat();
		await loadConfig();
		return;
	}
	token.value = undefined;
	userName.value = undefined;
	writeSession();
	newChat();
}

const scrollDown = () => nextTick(() => list.value?.scrollTo({ top: list.value.scrollHeight }));

// Option B (n8n Chat backend): durable queue, history after a reload, Stop.
const optionB = computed(() => config.value?.variant === 'n8n-chat');
const features = computed(() => config.value?.features);
const runningExecution = ref<string>();
const attachment = ref<{ fileName: string; mimeType: string; data: string }>();
const fileInput = ref<HTMLInputElement>();
// The conversation survives a reload in this tab (option B). Bound to the identity it was made with.
const conversationKey = `${storageKey}:conversation`;
function rememberConversation(id?: string) {
	try {
		if (id)
			sessionStorage.setItem(conversationKey, JSON.stringify({ id, who: signedInAs.value ?? '' }));
		else sessionStorage.removeItem(conversationKey);
	} catch {}
}
function storedConversation(): string | undefined {
	try {
		const entry = JSON.parse(sessionStorage.getItem(conversationKey) ?? 'null') as {
			id: string;
			who: string;
		} | null;
		return entry && entry.who === (signedInAs.value ?? '') ? entry.id : undefined;
	} catch {
		return undefined;
	}
}

let polling: ReturnType<typeof setTimeout> | undefined;
/** Option B: messages that came back from the server after a reload (shown once as a note). */
const restored = ref(0);
const uploadsHint = computed(() => {
	if (features.value?.uploadsOff === 'anonymous')
		return 'Sign in or open your invite link to attach files.';
	if (features.value?.uploadsOff === 'disabled')
		return 'File uploads are off for this chat. The owner can turn them on in the n8n Chat channel.';
	return attachment.value ? `Attached: ${attachment.value.fileName}` : 'Attach a file (up to 2 MB)';
});
/** Option B: shows the recorded conversation; follows a running turn by reading again. */
async function loadHistory(id: string) {
	clearTimeout(polling);
	const history = await fetchHistory(props.base, id, token.value);
	if (!history) {
		rememberConversation();
		conversationId.value = undefined;
		return;
	}
	conversationId.value = id;
	messages.value = [
		...history.messages.map((entry) => ({
			role: entry.role,
			text: entry.text,
			tools: entry.tools.map((tool) => ({ ...tool, done: true })),
			files: entry.files.map((file) => file.name),
			error: entry.error,
		})),
		...history.pending.map((item) => ({
			role: 'user' as const,
			text: item.text,
			tools: [],
			queued: true,
		})),
	];
	runningExecution.value = history.activeExecutionId ?? undefined;
	scrollDown();
	if (history.activeExecutionId || history.pending.length) {
		polling = setTimeout(() => void loadHistory(id), 1500);
	}
}

async function pickFile(event: Event) {
	const file = (event.target as HTMLInputElement).files?.[0];
	if (!file) return;
	const bytes = new Uint8Array(await file.arrayBuffer());
	let binary = '';
	for (const byte of bytes) binary += String.fromCharCode(byte);
	attachment.value = { fileName: file.name, mimeType: file.type, data: btoa(binary) };
}

async function send() {
	const text = input.value.trim();
	const queueing = !!features.value?.queue;
	if ((!text && !attachment.value) || (busy.value && !queueing)) return;
	clearTimeout(polling);
	input.value = '';
	const files = attachment.value ? [attachment.value] : undefined;
	attachment.value = undefined;
	if (fileInput.value) fileInput.value.value = '';
	const ask: Message = {
		role: 'user',
		text,
		tools: [],
		queued: busy.value,
		files: files?.map((file) => file.fileName),
	};
	messages.value.push(ask);
	// v1 answers at once. Option B answers when the queue starts the turn.
	let reply: Message | undefined;
	const startReply = () => {
		messages.value.push({ role: 'agent', text: '', tools: [] });
		reply = messages.value[messages.value.length - 1];
	};
	if (!queueing) startReply();
	busy.value = true;
	scrollDown();
	const controller = new AbortController();
	abort = controller;
	let finished = false;
	try {
		for await (const event of sendMessage(
			props.base,
			{ message: text, conversationId: conversationId.value, attachments: files },
			controller.signal,
			token.value,
		)) {
			if (event.type === 'conversation') {
				conversationId.value = event.id;
				if (optionB.value) rememberConversation(event.id);
			} else if (event.type === 'started') {
				ask.queued = false;
				runningExecution.value = event.executionId;
				startReply();
			} else if (event.type === 'text') (reply ?? (startReply(), reply!)).text += event.delta;
			else if (event.type === 'tool-start')
				(reply ?? (startReply(), reply!)).tools.push({
					id: event.id,
					name: event.name,
					done: false,
				});
			else if (event.type === 'tool-end') {
				const tool = reply?.tools.find((t) => t.id === event.id);
				if (tool) tool.done = true;
			} else if (event.type === 'notice')
				(reply ?? (startReply(), reply!)).text += `\n\n_${event.text}_`;
			else if (event.type === 'done') finished = true;
			else if (event.type === 'error') {
				finished = true;
				const target = reply ?? (startReply(), reply!);
				target.text += (target.text ? '\n\n' : '') + event.message;
				target.error = true;
				// The server forgot the conversation: start a new one on the next message.
				if (event.code === 'conversation_not_found') {
					conversationId.value = undefined;
					rememberConversation();
				}
				// Access changed (method turned off, session ended): show the current way in.
				if (['login_required', 'invite_required', 'no_access_method'].includes(event.code ?? '')) {
					if (token.value) void signOut();
					void loadConfig();
				}
			}
			scrollDown();
		}
	} catch (error) {
		if (!controller.signal.aborted) {
			const target = reply ?? (startReply(), reply!);
			target.text = (error as Error).message;
			target.error = true;
			finished = true;
		}
	} finally {
		if (abort === controller) {
			abort = undefined;
			busy.value = false;
			runningExecution.value = undefined;
		}
		// Option B: a stream that ended early (network, reload) leaves the turn running: read it back.
		if (optionB.value && !finished && conversationId.value && !controller.signal.aborted) {
			void loadHistory(conversationId.value);
		}
	}
}

async function stop() {
	if (conversationId.value && runningExecution.value) {
		await stopTurn(props.base, conversationId.value, runningExecution.value, token.value);
		const last = messages.value.findLast((message) => message.role === 'agent');
		if (last) last.text += (last.text ? '\n\n' : '') + '_Stopped._';
	}
}

function newChat() {
	restored.value = 0;
	clearTimeout(polling);
	abort?.abort();
	messages.value = [];
	conversationId.value = undefined;
	runningExecution.value = undefined;
	rememberConversation();
}

function onKeydown(event: KeyboardEvent) {
	if (event.key === 'Enter' && !event.shiftKey) {
		event.preventDefault();
		void send();
	}
}
</script>

<template>
	<div
		:class="[
			'agent-chat',
			`agent-chat--${mode}`,
			`agent-chat--theme-${theme}`,
			{ 'agent-chat--left': look.position === 'left' },
		]"
	>
		<!-- The theme as :host variables; host page CSS on the host element still wins. -->
		<component :is="'style'">{{ css }}</component>
		<section v-if="open" class="agent-chat__window" role="dialog" :aria-label="title">
			<header class="agent-chat__header">
				<img
					v-if="look.logoUrl"
					class="agent-chat__logo-img"
					:src="look.logoUrl"
					alt=""
					referrerpolicy="no-referrer"
				/>
				<svg
					v-else-if="theme === 'n8n'"
					class="agent-chat__logo"
					viewBox="0 0 240 96"
					aria-label="n8n"
				>
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
				<div v-if="pendingSwitch" class="agent-chat__signin" data-testid="agent-chat-switch">
					<p>
						You are chatting as <strong>{{ pendingSwitch.current }}</strong
						>. This link is for <strong>{{ pendingSwitch.label }}</strong
						>.
					</p>
					<button class="agent-chat__send" type="button" @click="redeemInvite(true)">
						Switch to {{ pendingSwitch.label }}
					</button>
					<button class="agent-chat__link" type="button" @click="pendingSwitch = undefined">
						Keep chatting as {{ pendingSwitch.current }}
					</button>
				</div>
				<div v-if="needsLogin" class="agent-chat__signin" data-testid="agent-chat-signin">
					<template v-if="config?.methods.n8nUsers">
						<p>Sign in with your n8n account to chat with {{ title }}.</p>
						<button class="agent-chat__send" type="button" :disabled="signingIn" @click="signIn">
							{{ signingIn ? 'Waiting for sign-in…' : 'Sign in with n8n' }}
						</button>
					</template>
					<p v-if="config?.methods.magicLinks" data-testid="agent-chat-invite-needed">
						{{ config.methods.n8nUsers ? 'Or open' : 'Open' }} the invite link you received to chat
						with {{ title }}.
					</p>
					<p
						v-if="!config?.methods.n8nUsers && !config?.methods.magicLinks"
						data-testid="agent-chat-unavailable"
					>
						This chat is not available.
					</p>
				</div>
				<p v-if="restored" class="agent-chat__note" data-testid="agent-chat-restored">
					Conversation restored after reload ({{ restored }} messages)
				</p>
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
					<div v-for="file in message.files" :key="file" class="agent-chat__file">
						📎 {{ file }}
					</div>
					<div v-if="message.queued" class="agent-chat__queued" data-testid="agent-chat-queued">
						Waiting until the current answer is done
					</div>
				</div>
			</div>
			<div
				v-if="signedInAs && !needsLogin"
				class="agent-chat__identity"
				data-testid="agent-chat-identity"
			>
				Chatting as {{ signedInAs }}
				<button
					v-if="token || config?.user?.kind === 'invite'"
					class="agent-chat__link"
					type="button"
					@click="signOut"
				>
					Sign out
				</button>
			</div>
			<!-- Anonymous chat without an identity: say so, so missing features (uploads, memory) make sense. -->
			<div
				v-else-if="config && !needsLogin && !signedInAs"
				class="agent-chat__identity"
				data-testid="agent-chat-anonymous"
			>
				Chatting as a visitor (not signed in)
				<button
					v-if="config.methods.n8nUsers"
					class="agent-chat__link"
					type="button"
					:disabled="signingIn"
					@click="signIn"
				>
					Sign in with n8n
				</button>
			</div>
			<form v-if="!needsLogin" class="agent-chat__composer" @submit.prevent="send">
				<!-- Option B: the attach button is always there; disabled with the reason when uploads are off. -->
				<span
					v-if="optionB"
					:class="[
						'agent-chat__attach-wrap',
						{ 'agent-chat__attach-wrap--off': !features?.uploads },
					]"
					:title="uploadsHint"
				>
					<input
						ref="fileInput"
						type="file"
						hidden
						accept="image/png,image/jpeg,image/gif,image/webp,application/pdf,text/plain,text/csv"
						data-testid="agent-chat-file"
						@change="pickFile"
					/>
					<button
						:class="[
							'agent-chat__icon-button',
							'agent-chat__attach',
							{ 'agent-chat__attach--on': attachment },
						]"
						type="button"
						:aria-label="uploadsHint"
						:disabled="!features?.uploads"
						data-testid="agent-chat-attach"
						@click="fileInput?.click()"
					>
						📎
					</button>
				</span>
				<textarea
					v-model="input"
					class="agent-chat__input"
					rows="1"
					:placeholder="look.placeholder || 'Message'"
					:disabled="!!loadError"
					@keydown="onKeydown"
				/>
				<button
					class="agent-chat__send"
					type="submit"
					data-testid="agent-chat-send"
					:disabled="!!preview || (busy && !features?.queue) || (!input.trim() && !attachment)"
				>
					Send
				</button>
				<button
					v-if="runningExecution && features?.stop"
					class="agent-chat__send agent-chat__stop"
					type="button"
					title="Stop the current answer. Waiting messages stay queued."
					data-testid="agent-chat-stop"
					@click="stop"
				>
					■ Stop
				</button>
			</form>
			<p v-if="attachment" class="agent-chat__note" data-testid="agent-chat-attachment">
				📎 {{ attachment.fileName }}
				<button class="agent-chat__link" type="button" @click="attachment = undefined">
					Remove
				</button>
			</p>
			<footer class="agent-chat__footer">
				Powered by n8n · Conversations are visible to the agent's owner
				<span v-if="config" data-testid="agent-chat-variant">
					· spike:
					{{ optionB ? 'option B (n8n Chat backend: history, queue, Stop)' : 'v1 (API channel)' }}
				</span>
			</footer>
		</section>
		<button
			v-if="mode === 'bubble' && !hideLauncher"
			class="agent-chat__launcher"
			type="button"
			:aria-label="open ? 'Close chat' : `Chat with ${title}`"
			data-testid="agent-chat-launcher"
			@click="open = !open"
		>
			<template v-if="open">✕</template>
			<template v-else-if="launcherIcon">{{ launcherIcon }}</template>
			<img
				v-else
				class="agent-chat__launcher-img"
				:src="look.logoUrl"
				alt=""
				referrerpolicy="no-referrer"
			/>
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
/* Colours, font and radius come from theme.ts (:host variables), so the owner's appearance and data-* apply. */
.agent-chat--left {
	right: auto;
	left: 20px;
	align-items: flex-start;
}
.agent-chat__logo-img {
	height: 24px;
	max-width: 96px;
	object-fit: contain;
}
.agent-chat__launcher-img {
	width: 32px;
	height: 32px;
	object-fit: contain;
	border-radius: 50%;
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
	background: var(--agent-chat--color-background);
	color: inherit;
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
.agent-chat__note {
	text-align: center;
	font-size: 12px;
	opacity: 0.7;
	margin: 4px 0;
}

.agent-chat__stop {
	background: #b42318;
}

.agent-chat__attach:disabled {
	opacity: 0.35;
	/* Lets the wrapper show its tooltip: a disabled button gets no hover. */
	pointer-events: none;
}

.agent-chat__attach-wrap {
	display: inline-flex;
}

.agent-chat__attach-wrap--off {
	cursor: not-allowed;
}

.agent-chat__attach--on {
	outline: 2px solid currentColor;
	border-radius: 6px;
}

.agent-chat__queued,
.agent-chat__file {
	font-size: 12px;
	opacity: 0.7;
	margin-top: 4px;
}

.agent-chat__attach {
	color: inherit;
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
