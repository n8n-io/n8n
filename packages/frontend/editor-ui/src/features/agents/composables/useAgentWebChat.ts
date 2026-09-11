import type {
	AgentWebChatPageConfig,
	AgentWebChatSessionResponse,
	AgentWebChatSseEvent,
} from '@n8n/api-types';
import { getBrowserId } from '@n8n/constants';
import { get, post, ResponseError } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, reactive, ref } from 'vue';

import {
	getMessageInteractive,
	isApprovalSuspendInput,
	rebuildInteractiveFromHistory,
	upsertMessageInteractive,
} from '@/features/ai/shared/agentsChat/messageMappers';
import type { ChatMessage, ToolCall } from '@/features/ai/shared/agentsChat/types';

import { CHAT_MESSAGE_STATUS, TOOL_CALL_STATE } from '../constants';

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
		await runTurn(`${channelUrl.value}/chat`, { sessionId, message: text });
	}

	async function resume(payload: {
		runId: string;
		toolCallId: string;
		resumeData: unknown;
	}): Promise<void> {
		if (!token || !sessionId || isStreaming.value) return;

		const found = findToolCallById(payload.toolCallId);
		if (found) {
			found.tc.state = TOOL_CALL_STATE.DONE;
			found.tc.canceled = false;
			found.tc.output = payload.resumeData;
			const updated = rebuildInteractiveFromHistory(found.tc);
			if (updated) upsertMessageInteractive(found.msg, updated);
			if (found.msg.status === CHAT_MESSAGE_STATUS.AWAITING_USER) {
				found.msg.status = CHAT_MESSAGE_STATUS.SUCCESS;
			}
		}

		await runTurn(`${channelUrl.value}/chat/resume`, {
			sessionId,
			runId: payload.runId,
			toolCallId: payload.toolCallId,
			resumeData: payload.resumeData,
		});
	}

	async function runTurn(url: string, body: Record<string, unknown>): Promise<void> {
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
			reply = reactive<ChatMessage>({ id: nextId(), role: 'assistant', content, status });
			messages.value.push(reply);
			return reply;
		};
		const ensureReply = (): ChatMessage => {
			if (reply) return reply;
			messagingState.value = 'receiving';
			return startReply('', CHAT_MESSAGE_STATUS.STREAMING);
		};

		try {
			const response = await fetch(url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'text/event-stream',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify(body),
				signal: turn.signal,
			});

			if (!response.ok || !response.body) {
				ensureReply();
				if (reply) {
					reply.content = await readError(response);
					reply.status = CHAT_MESSAGE_STATUS.ERROR;
				}
				return;
			}

			for await (const event of readSse(response.body, turn.signal)) {
				applyEvent(event, {
					getReply: () => reply,
					startReply,
					ensureReply,
					setReply: (msg) => {
						reply = msg;
					},
				});
			}
			if (
				reply &&
				reply.status !== CHAT_MESSAGE_STATUS.ERROR &&
				reply.status !== CHAT_MESSAGE_STATUS.AWAITING_USER
			) {
				reply.status = CHAT_MESSAGE_STATUS.SUCCESS;
			}
		} catch (e) {
			// An abort is the visitor pressing stop, so whatever text already
			// arrived stands as the reply rather than being replaced by an error.
			if (turn.signal.aborted) {
				if (reply && reply.status !== CHAT_MESSAGE_STATUS.AWAITING_USER) {
					reply.status = CHAT_MESSAGE_STATUS.SUCCESS;
				}
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

	function applyEvent(
		event: AgentWebChatSseEvent,
		ctx: {
			getReply: () => ChatMessage | undefined;
			startReply: (content: string, status: ChatMessage['status']) => ChatMessage;
			ensureReply: () => ChatMessage;
			setReply: (msg: ChatMessage) => void;
		},
	): void {
		switch (event.type) {
			case 'text-delta': {
				messagingState.value = 'receiving';
				const current = ctx.getReply();
				if (current) current.content += event.delta;
				else ctx.setReply(ctx.startReply(event.delta, CHAT_MESSAGE_STATUS.STREAMING));
				return;
			}
			case 'tool-call': {
				const msg = ctx.ensureReply();
				msg.toolCalls = msg.toolCalls ?? [];
				const existing = msg.toolCalls.find((tc) => tc.toolCallId === event.toolCallId);
				if (existing) {
					existing.input = event.input;
					if (
						existing.state !== TOOL_CALL_STATE.RUNNING &&
						existing.state !== TOOL_CALL_STATE.DONE &&
						existing.state !== TOOL_CALL_STATE.CANCELLED
					) {
						existing.state = TOOL_CALL_STATE.PENDING;
					}
				} else {
					msg.toolCalls.push({
						tool: event.toolName,
						toolCallId: event.toolCallId,
						input: event.input,
						state: TOOL_CALL_STATE.PENDING,
					});
				}
				return;
			}
			case 'tool-call-suspended': {
				const { payload } = event;
				const found = findToolCallById(payload.toolCallId);
				const suspendIsRenderableInput = isApprovalSuspendInput(payload.input);
				let msg: ChatMessage;
				let tc: ToolCall;
				if (found) {
					msg = found.msg;
					tc = found.tc;
					tc.state = TOOL_CALL_STATE.SUSPENDED;
					tc.canceled = false;
					tc.output = undefined;
					tc.runId = payload.runId;
					tc.suspendPayload = payload.input;
				} else {
					msg = ctx.ensureReply();
					tc = {
						tool: payload.toolName,
						toolCallId: payload.toolCallId,
						state: TOOL_CALL_STATE.SUSPENDED,
						runId: payload.runId,
						...(suspendIsRenderableInput
							? { input: payload.input }
							: { suspendPayload: payload.input }),
					};
					msg.toolCalls = [...(msg.toolCalls ?? []), tc];
				}
				const interactive = rebuildInteractiveFromHistory({
					...tc,
					output: undefined,
				});
				if (interactive) {
					interactive.runId = payload.runId;
					upsertMessageInteractive(msg, interactive);
					msg.status = CHAT_MESSAGE_STATUS.AWAITING_USER;
				}
				return;
			}
			case 'tool-result': {
				const found = findToolCallById(event.toolCallId);
				if (!found) return;
				found.tc.output = event.output;
				found.tc.state = event.isError
					? TOOL_CALL_STATE.ERROR
					: event.canceled === true
						? TOOL_CALL_STATE.CANCELLED
						: TOOL_CALL_STATE.DONE;
				found.tc.canceled = event.canceled === true;
				const currentInteractive = getMessageInteractive(found.msg, event.toolCallId);
				const updated = rebuildInteractiveFromHistory(found.tc);
				if (updated && currentInteractive?.resolvedAt === undefined) {
					upsertMessageInteractive(found.msg, updated);
				} else if (updated && !currentInteractive) {
					upsertMessageInteractive(found.msg, updated);
				}
				if (found.msg.status === CHAT_MESSAGE_STATUS.AWAITING_USER) {
					found.msg.status = CHAT_MESSAGE_STATUS.SUCCESS;
				}
				return;
			}
			case 'error': {
				const current = ctx.getReply();
				if (current) {
					current.content = event.message;
					current.status = CHAT_MESSAGE_STATUS.ERROR;
				} else {
					ctx.setReply(ctx.startReply(event.message, CHAT_MESSAGE_STATUS.ERROR));
				}
				return;
			}
			default:
				return;
		}
	}

	function findToolCallById(toolCallId: string): { msg: ChatMessage; tc: ToolCall } | undefined {
		for (const msg of messages.value) {
			const tc = msg.toolCalls?.find((toolCall) => toolCall.toolCallId === toolCallId);
			if (tc) return { msg, tc };
		}
		return undefined;
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
		resume,
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

type SseEvent = AgentWebChatSseEvent;

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
		const parsed: unknown = JSON.parse(data);
		if (!isRecord(parsed) || typeof parsed.type !== 'string') return undefined;
		if (parsed.type === 'text-delta' && typeof parsed.delta === 'string') {
			return { type: 'text-delta', id: typeof parsed.id === 'string' ? parsed.id : '', delta: parsed.delta };
		}
		if (parsed.type === 'text-start' && typeof parsed.id === 'string') {
			return { type: 'text-start', id: parsed.id };
		}
		if (parsed.type === 'text-end' && typeof parsed.id === 'string') {
			return { type: 'text-end', id: parsed.id };
		}
		if (parsed.type === 'done') return { type: 'done' };
		if (parsed.type === 'error') {
			return { type: 'error', message: typeof parsed.message === 'string' ? parsed.message : 'Something went wrong.' };
		}
		if (
			parsed.type === 'tool-call' &&
			typeof parsed.toolCallId === 'string' &&
			typeof parsed.toolName === 'string'
		) {
			return {
				type: 'tool-call',
				toolCallId: parsed.toolCallId,
				toolName: parsed.toolName,
				input: parsed.input,
			};
		}
		if (
			parsed.type === 'tool-result' &&
			typeof parsed.toolCallId === 'string' &&
			typeof parsed.toolName === 'string'
		) {
			return {
				type: 'tool-result',
				toolCallId: parsed.toolCallId,
				toolName: parsed.toolName,
				output: parsed.output,
				...(typeof parsed.isError === 'boolean' && { isError: parsed.isError }),
				...(typeof parsed.canceled === 'boolean' && { canceled: parsed.canceled }),
			};
		}
		if (parsed.type === 'tool-call-suspended' && isRecord(parsed.payload)) {
			const { payload } = parsed;
			if (
				typeof payload.toolCallId !== 'string' ||
				typeof payload.runId !== 'string' ||
				typeof payload.toolName !== 'string'
			) {
				return undefined;
			}
			return {
				type: 'tool-call-suspended',
				payload: {
					toolCallId: payload.toolCallId,
					runId: payload.runId,
					toolName: payload.toolName,
					input: payload.input,
				},
			};
		}
	} catch {
		// A malformed frame is dropped rather than shown.
	}
	return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}
