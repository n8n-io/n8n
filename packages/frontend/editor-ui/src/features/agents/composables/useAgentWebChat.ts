import type { AgentWebChatPageConfig, AgentWebChatSessionResponse } from '@n8n/api-types';
import { getBrowserId } from '@n8n/constants';
import { get, post, ResponseError } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, ref } from 'vue';

import { CHAT_MESSAGE_STATUS } from '../constants';
import type { ChatMessage } from '@/features/ai/shared/agentsChat/types';

/** Credentials a `basicAuth` channel asks the visitor for. */
export interface AgentWebChatCredentials {
	user: string;
	password: string;
}

type MessagingState = 'idle' | 'waitingFirstChunk' | 'receiving';

/**
 * Talks to a published agent's web channel from the public chat page.
 *
 * Deliberately separate from `useAgentChatStream`: that one speaks the
 * authenticated builder API, in project scope, with a full event stream. This
 * one has no user, no project and no editor state — only an `integrationId`
 * from the URL and a session token the server minted for this visitor.
 */
export function useAgentWebChat(integrationId: string) {
	const rootStore = useRootStore();

	const config = ref<AgentWebChatPageConfig | null>(null);
	const messages = ref<ChatMessage[]>([]);
	const messagingState = ref<MessagingState>('idle');
	const error = ref<string | null>(null);
	const authRequired = ref(false);
	const n8nLoginRequired = ref(false);

	let token: string | undefined;
	let sessionId: string | undefined;
	let turn: AbortController | undefined;

	const isStreaming = computed(() => messagingState.value !== 'idle');

	/** `baseUrl` already carries the instance's path prefix, so this works under `N8N_PATH`. */
	const channelUrl = computed(
		() =>
			`${rootStore.baseUrl.replace(/\/$/, '')}/web-agent/${encodeURIComponent(integrationId)}`,
	);
	// Use an absolute base URL so a 401 from this public surface does not invoke
	// the editor's global session-expired handler. This view decides whether a
	// 401 means a missing n8n login or incorrect Basic Auth credentials.
	const requestBaseUrl = computed(() => new URL(rootStore.baseUrl, window.location.origin).toString());
	const channelEndpoint = `web-agent/${encodeURIComponent(integrationId)}`;

	async function loadConfig(): Promise<void> {
		error.value = null;
		try {
			const response = await get(
				requestBaseUrl.value,
				`${channelEndpoint}/config`,
				undefined,
				{ 'browser-id': getBrowserId() },
			);
			config.value = unwrap<AgentWebChatPageConfig>(response) ?? null;
			// Only Basic Auth is collected on this page. `n8nUserAuth` rides on the
			// instance's own session cookie, and the server turns a missing one into
			// the error shown when the session is opened.
			authRequired.value = config.value?.accessMode === 'basicAuth';
		} catch (e) {
			error.value = e instanceof Error ? e.message : 'This chat is not available.';
		}
	}

	async function openSession(credentials?: AgentWebChatCredentials): Promise<boolean> {
		error.value = null;
		n8nLoginRequired.value = false;
		try {
			const response = await post(
				requestBaseUrl.value,
				`${channelEndpoint}/session`,
				undefined,
				{
					// n8n binds its auth cookie to this browser identifier. Normal
					// relative REST requests add it in the API client. This public
					// request uses an absolute base URL to opt out of the global 401
					// handler, so it supplies the same header explicitly.
					'browser-id': getBrowserId(),
					...(credentials ? { Authorization: basicHeader(credentials) } : {}),
				},
			);

			const session = unwrap<AgentWebChatSessionResponse>(response);
			if (!session?.token || !session.sessionId) throw new Error('This chat could not be opened.');

			token = session.token;
			sessionId = session.sessionId;
			config.value = session.config;
			authRequired.value = false;
			return true;
		} catch (e) {
			n8nLoginRequired.value =
				e instanceof ResponseError &&
				e.httpStatusCode === 401 &&
				config.value?.accessMode === 'n8nUserAuth';
			error.value = e instanceof Error ? e.message : 'This chat could not be opened.';
			return false;
		}
	}

	async function send(text: string): Promise<void> {
		if (!token || !sessionId || isStreaming.value) return;

		messages.value.push({ id: nextId(), role: 'user', content: text });
		messagingState.value = 'waitingFirstChunk';
		turn = new AbortController();

		/**
		 * The assistant message is created by the first thing that has something to
		 * put in it, not up front. `AgentChatMessageList` already renders a typing
		 * indicator for `waitingFirstChunk`, and an empty streaming message makes it
		 * render a second one underneath.
		 */
		let reply: ChatMessage | undefined;
		const startReply = (content: string, status: ChatMessage['status']): ChatMessage => {
			reply = { id: nextId(), role: 'assistant', content, status };
			messages.value.push(reply);
			return reply;
		};

		try {
			const response = await fetch(`${channelUrl.value}/chat`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'text/event-stream',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ sessionId, message: text }),
				signal: turn.signal,
			});

			if (!response.ok || !response.body) {
				startReply(await readError(response), CHAT_MESSAGE_STATUS.ERROR);
				return;
			}

			for await (const event of readSse(response.body, turn.signal)) {
				if (event.type === 'text-delta') {
					messagingState.value = 'receiving';
					if (reply) reply.content += event.delta;
					else startReply(event.delta, CHAT_MESSAGE_STATUS.STREAMING);
				} else if (event.type === 'error') {
					if (reply) {
						reply.content = event.message;
						reply.status = CHAT_MESSAGE_STATUS.ERROR;
					} else {
						startReply(event.message, CHAT_MESSAGE_STATUS.ERROR);
					}
					return;
				}
			}
			if (reply) reply.status = CHAT_MESSAGE_STATUS.SUCCESS;
		} catch (e) {
			// An abort is the visitor pressing stop, so whatever text already
			// arrived stands as the reply rather than being replaced by an error.
			if (turn.signal.aborted) {
				if (reply) reply.status = CHAT_MESSAGE_STATUS.SUCCESS;
			} else {
				const message = e instanceof Error ? e.message : 'Something went wrong.';
				if (reply) {
					reply.content = message;
					reply.status = CHAT_MESSAGE_STATUS.ERROR;
				} else {
					startReply(message, CHAT_MESSAGE_STATUS.ERROR);
				}
			}
		} finally {
			messagingState.value = 'idle';
			turn = undefined;
		}
	}

	function stop(): void {
		turn?.abort();
	}

	return {
		config,
		messages,
		messagingState,
		isStreaming,
		error,
		authRequired,
		n8nLoginRequired,
		loadConfig,
		openSession,
		send,
		stop,
	};
}

function nextId(): string {
	return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function basicHeader({ user, password }: AgentWebChatCredentials): string {
	// `btoa` needs latin1; encode first so a non-ASCII password does not throw.
	return `Basic ${btoa(unescape(encodeURIComponent(`${user}:${password}`)))}`;
}

/** n8n's REST layer wraps a handler's return value as `{ data }`. */
function unwrap<T>(body: unknown): T | undefined {
	if (typeof body !== 'object' || body === null) return undefined;
	return ('data' in body ? (body as { data: T }).data : (body as T)) ?? undefined;
}

async function readError(response: Response): Promise<string> {
	try {
		const body = (await response.json()) as { message?: string };
		if (body.message) return body.message;
	} catch {
		// Not JSON — fall through to a message based on the status.
	}
	return response.status === 401 || response.status === 403
		? 'You do not have access to this chat.'
		: 'This chat is not available.';
}

type SseEvent = { type: 'text-delta'; delta: string } | { type: 'error'; message: string };

/**
 * Read the sanitized public event stream.
 *
 * Only the events the page renders are understood; anything else is dropped, so
 * a future server-side event cannot reach the transcript by default.
 */
async function* readSse(
	body: ReadableStream<Uint8Array>,
	signal: AbortSignal,
): AsyncIterable<SseEvent> {
	const reader = body.getReader();
	const decoder = new TextDecoder();
	let buffer = '';

	try {
		while (!signal.aborted) {
			const { done, value } = await reader.read();
			if (done) break;

			buffer += decoder.decode(value, { stream: true });
			// Frames are separated by a blank line; a partial one waits for the rest.
			let boundary = buffer.indexOf('\n\n');
			while (boundary !== -1) {
				const event = parseFrame(buffer.slice(0, boundary));
				buffer = buffer.slice(boundary + 2);
				if (event) yield event;
				boundary = buffer.indexOf('\n\n');
			}
		}
	} finally {
		await reader.cancel().catch(() => {});
	}
}

function parseFrame(frame: string): SseEvent | undefined {
	const data = frame
		.split('\n')
		.filter((line) => line.startsWith('data:'))
		.map((line) => line.slice(5).trim())
		.join('\n');
	if (!data) return undefined;

	try {
		const parsed = JSON.parse(data) as { type?: string; delta?: string; message?: string };
		if (parsed.type === 'text-delta' && typeof parsed.delta === 'string') {
			return { type: 'text-delta', delta: parsed.delta };
		}
		if (parsed.type === 'error') {
			return { type: 'error', message: parsed.message ?? 'Something went wrong.' };
		}
	} catch {
		// A malformed frame is dropped rather than shown.
	}
	return undefined;
}
