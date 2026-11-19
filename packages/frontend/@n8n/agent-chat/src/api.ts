/**
 * Wire protocol of the agent chat surface (v0, spike).
 *
 * POST {base}/messages  { message, conversationId? }  →  NDJSON events:
 *   { type: 'conversation', id }        always first; the server picks the id
 *   { type: 'text', delta }
 *   { type: 'tool-start', id, name } / { type: 'tool-end', id }
 *   { type: 'notice', text }            e.g. an action that needs approval
 *   { type: 'error', message, code? }
 *   { type: 'done' }
 * GET {base}/config  →  { name, appearance, methods, user, variant, features, signInUrl, loginUrl }
 * Option B (variant `n8n-chat`) adds, on the durable queue of n8n Chat:
 *   { type: 'queued', queueId } / { type: 'started', executionId }   a message waits, then runs
 *   GET  {base}/conversations/{id}        →  { messages, activeExecutionId, pending }
 *   POST {base}/conversations/{id}/stop   { executionId }
 * Auth (spike): without `methods.anonymous` the caller needs an identity of an enabled method. Same origin (hosted page)
 * uses the n8n cookie. Another origin (embed) signs in in a popup on the
 * instance and polls POST {loginUrl}/{requestId} for a short-lived token, which
 * it sends as `Authorization: Bearer`. No third-party cookie is involved.
 */
export type ChatEvent =
	| { type: 'conversation'; id: string }
	| { type: 'text'; delta: string }
	| { type: 'tool-start'; id: string; name: string }
	| { type: 'tool-end'; id: string }
	| { type: 'notice'; text: string }
	| { type: 'error'; message: string; code?: string }
	| { type: 'queued'; queueId: string }
	| { type: 'started'; executionId: string }
	| { type: 'done'; executionId?: string };

/** Colours for one scheme. Unset ones use the scheme's n8n defaults. */
export interface ColorSet {
	primaryColor?: string;
	backgroundColor?: string;
	textColor?: string;
	agentBubbleColor?: string;
}

/**
 * The owner's look for the chat (theme editor). Empty fields use n8n's defaults.
 * `light` / `dark` hold the colours per scheme. The top-level colours come from the
 * snippet's data-* attributes and win in both schemes.
 */
export interface ChatAppearance {
	title?: string;
	welcomeMessage?: string;
	placeholder?: string;
	light?: ColorSet;
	dark?: ColorSet;
	primaryColor?: string;
	backgroundColor?: string;
	textColor?: string;
	agentBubbleColor?: string;
	font?: 'system' | 'serif' | 'mono' | 'rounded';
	radius?: number;
	logoUrl?: string;
	colorScheme?: 'light' | 'dark' | 'auto';
	position?: 'right' | 'left';
	launcherIcon?: 'chat' | 'sparkle' | 'help' | 'logo';
}

/** Theme editor preview: the draft appearance and the sample conversation's context. */
export interface PreviewState {
	appearance: ChatAppearance;
	agentName: string;
	variant: 'webhook' | 'n8n-chat';
	/** Show this scheme whatever the setting is, so the editor can check both sets. */
	scheme?: 'light' | 'dark';
}

export interface ChatConfig {
	name: string;
	welcomeMessage?: string;
	appearance?: ChatAppearance;
	methods: { n8nUsers: boolean; magicLinks: boolean; anonymous: boolean };
	user: { name: string; kind?: 'n8n-user' | 'invite' } | null;
	variant?: 'webhook' | 'n8n-chat';
	features?: {
		history: boolean;
		queue: boolean;
		stop: boolean;
		uploads: boolean;
		/** Why uploads are off for this caller: off in the channel, or an anonymous visitor. */
		uploadsOff?: 'disabled' | 'anonymous';
	};
	signInUrl: string;
	loginUrl: string;
}

// The chat header marks the widget's own calls: the server honours cookies only with it, same-origin.
const auth = (token?: string): Record<string, string> =>
	token ? { 'X-N8n-Chat': '1', Authorization: `Bearer ${token}` } : { 'X-N8n-Chat': '1' };

export async function fetchConfig(base: string, token?: string): Promise<ChatConfig> {
	const res = await fetch(`${base}/config`, { headers: auth(token) });
	if (!res.ok) throw new Error(`This chat is not available (${res.status})`);
	return (await res.json()) as ChatConfig;
}

export async function* sendMessage(
	base: string,
	body: {
		message: string;
		conversationId?: string;
		attachments?: Array<{ fileName: string; mimeType: string; data: string }>;
	},
	signal?: AbortSignal,
	token?: string,
): AsyncGenerator<ChatEvent> {
	const res = await fetch(`${base}/messages`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Accept: 'application/x-ndjson', ...auth(token) },
		body: JSON.stringify(body),
		signal,
	});
	if (!res.ok || !res.body) {
		yield { type: 'error', message: `The agent could not answer (${res.status})` };
		return;
	}
	const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
	let buffer = '';
	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		buffer += value;
		const lines = buffer.split('\n');
		buffer = lines.pop() ?? '';
		for (const line of lines) if (line.trim()) yield JSON.parse(line) as ChatEvent;
	}
	if (buffer.trim()) yield JSON.parse(buffer) as ChatEvent;
}

/**
 * Embed sign-in. Opens the instance's sign-in in a popup (call it from a click,
 * or the browser blocks the popup) and polls until the popup hands over a token.
 */
export async function loginWithPopup(
	loginUrl: string,
): Promise<{ token: string; user: { name: string } }> {
	const bytes = crypto.getRandomValues(new Uint8Array(24));
	const requestId = btoa(String.fromCharCode(...bytes))
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');
	const popup = window.open(
		`${loginUrl}?request=${requestId}`,
		'n8n-agent-chat-login',
		'popup,width=480,height=640',
	);
	if (!popup)
		throw new Error('The browser blocked the sign-in window. Allow popups for this site.');
	// The popup can lose its link to this page (the sign-in page sets COOP), so poll the server instead.
	for (let i = 0; i < 180; i++) {
		await new Promise((resolve) => setTimeout(resolve, 1000));
		const res = await fetch(`${loginUrl}/${requestId}`, { method: 'POST' });
		if (res.status === 200) {
			try {
				popup.close();
			} catch {}
			return (await res.json()) as { token: string; user: { name: string } };
		}
	}
	throw new Error('Sign-in timed out. Try again.');
}

export type InviteResult =
	| { ok: true; user: { name: string } }
	| { ok: false; code: string; message?: string; current?: string; label?: string };

/** Hosted page: exchanges a magic link token for a recipient session (an HttpOnly cookie). */
export async function exchangeInvite(
	base: string,
	token: string,
	replace = false,
): Promise<InviteResult> {
	const res = await fetch(`${base}/invite`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', ...auth() },
		body: JSON.stringify({ token, replace }),
	});
	const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
	if (res.ok) return { ok: true, user: body.user as { name: string } };
	return { ok: false, ...(body as { code: string }) };
}

export interface History {
	messages: Array<{
		role: 'user' | 'agent';
		text: string;
		tools: Array<{ id: string; name: string }>;
		files: Array<{ name: string }>;
		error: boolean;
	}>;
	activeExecutionId: string | null;
	pending: Array<{ id: string; text: string }>;
}

/** Option B: the transcript of one of the caller's own conversations, or undefined when it is gone. */
export async function fetchHistory(
	base: string,
	conversationId: string,
	token?: string,
): Promise<History | undefined> {
	const res = await fetch(`${base}/conversations/${conversationId}`, { headers: auth(token) });
	return res.ok ? ((await res.json()) as History) : undefined;
}

/** Option B: stops the running turn. Waiting messages stay queued. */
export async function stopTurn(
	base: string,
	conversationId: string,
	executionId: string,
	token?: string,
) {
	await fetch(`${base}/conversations/${conversationId}/stop`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', ...auth(token) },
		body: JSON.stringify({ executionId }),
	});
}

export async function endSession(base: string) {
	await fetch(`${base}/logout`, { method: 'POST', headers: auth() });
}
