import {
	ASK_CREDENTIAL_TOOL_NAME,
	ASK_LLM_TOOL_NAME,
	ASK_QUESTION_TOOL_NAME,
	askCredentialInputSchema,
	askCredentialResumeSchema,
	askLlmInputSchema,
	askLlmResumeSchema,
	askQuestionInputSchema,
	askQuestionResumeSchema,
	type AgentBuilderOpenSuspension,
	type AgentPersistedMessageDto,
	type AskCredentialInput,
	type AskCredentialResume,
	type AskLlmInput,
	type AskLlmResume,
	type AskQuestionInput,
	type AskQuestionResume,
	type InteractiveToolName,
} from '@n8n/api-types';

import { CHAT_MESSAGE_STATUS, TOOL_CALL_STATE } from '../constants';
import type { ChatMessageStatus, ToolCallState } from '../constants';
export { type ChatMessageStatus, type ToolCallState };

// ---------------------------------------------------------------------------
// Tool call state — type lives in `../constants` so the literal values and
// the type stay in one place. See ToolCallState there for state transitions.
// ---------------------------------------------------------------------------

export interface ToolCall {
	tool: string;
	toolCallId: string;
	input?: unknown;
	output?: unknown;
	state: ToolCallState;
	/**
	 * One-line answer label rendered next to the tool name in
	 * `AgentChatToolSteps`. Set when an interactive tool resolves so the user
	 * sees what they picked (e.g. "Slack") instead of just "ask_question".
	 */
	displaySummary?: string;
}

// ---------------------------------------------------------------------------
// Interactive card payload — discriminated by toolName
// ---------------------------------------------------------------------------

interface InteractivePayloadBase {
	toolCallId: string;
	/**
	 * Run id of the suspended turn — required to resume the interactive tool
	 * call. Set on live `tool-call-suspended` chunks and re-attached to
	 * suspended cards by `applyOpenSuspensions` after a history reload.
	 * Absent on cards rebuilt from raw history (the runId only arrives via
	 * the sidecar) and on already-resolved cards (no resume possible).
	 */
	runId?: string;
	/** Wall-clock timestamp when the user submitted; absent when card is open. */
	resolvedAt?: number;
}

/**
 * Discriminated union describing the interactive card that a suspended builder
 * tool call renders in the chat. `toolName` is the discriminant (one of the
 * three canonical interactive tool names from `@n8n/api-types`).
 */
export type InteractivePayload =
	| (InteractivePayloadBase & {
			toolName: typeof ASK_CREDENTIAL_TOOL_NAME;
			input: AskCredentialInput;
			resolvedValue?: AskCredentialResume;
	  })
	| (InteractivePayloadBase & {
			toolName: typeof ASK_LLM_TOOL_NAME;
			input: AskLlmInput;
			resolvedValue?: AskLlmResume;
	  })
	| (InteractivePayloadBase & {
			toolName: typeof ASK_QUESTION_TOOL_NAME;
			input: AskQuestionInput;
			resolvedValue?: AskQuestionResume;
	  });

const INTERACTIVE_TOOL_NAMES = [
	ASK_CREDENTIAL_TOOL_NAME,
	ASK_LLM_TOOL_NAME,
	ASK_QUESTION_TOOL_NAME,
] as readonly InteractiveToolName[];

export function isInteractiveToolName(v: unknown): v is InteractiveToolName {
	return typeof v === 'string' && (INTERACTIVE_TOOL_NAMES as readonly string[]).includes(v);
}

// ---------------------------------------------------------------------------
// Chat message
// ---------------------------------------------------------------------------

export interface ChatMessage {
	id: string;
	role: 'user' | 'assistant';
	content: string;
	thinking?: string;
	toolCalls?: ToolCall[];
	status?: ChatMessageStatus;
	interactive?: InteractivePayload;
}

// ---------------------------------------------------------------------------
// Display grouping
// ---------------------------------------------------------------------------

/**
 * Presentation group for the message list. The builder persists one assistant
 * message per tool-use turn, so a single conversation fragments into many robot
 * avatars on reload. We fold consecutive tool-only assistant messages into a
 * single `toolRun` block to match the live-stream look.
 *
 * Interactive messages are still grouped: their tool calls join the rest of
 * the run (so the suspended/done icon shows in the step list), and any
 * `interactive` payloads — both still-open and already-resolved cards — are
 * collected into `interactives` so the group can render the corresponding
 * cards beside the step list.
 */
export type DisplayGroup =
	| { kind: 'message'; id: string; message: ChatMessage }
	| {
			kind: 'toolRun';
			id: string;
			thinking: string;
			toolCalls: ToolCall[];
			/** Interactive cards belonging to messages folded into this group. */
			interactives: InteractivePayload[];
			/**
			 * Trailing assistant message in the turn that carries text content.
			 * Folding it into the same group keeps a single bubble per turn
			 * (thinking → tools → interactives → final text).
			 */
			finalMessage?: ChatMessage;
	  };

export function isGroupable(msg: ChatMessage): boolean {
	return msg.role === 'assistant' && !!msg.toolCalls?.length && !msg.content.trim();
}

export function buildDisplayGroups(messages: ChatMessage[]): DisplayGroup[] {
	const groups: DisplayGroup[] = [];
	for (const msg of messages) {
		if (isGroupable(msg)) {
			const last = groups[groups.length - 1];
			if (last && last.kind === 'toolRun' && !last.finalMessage) {
				last.toolCalls = [...last.toolCalls, ...(msg.toolCalls ?? [])];
				if (msg.thinking) {
					last.thinking = last.thinking ? `${last.thinking}\n\n${msg.thinking}` : msg.thinking;
				}
				if (msg.interactive) last.interactives.push(msg.interactive);
				continue;
			}
			groups.push({
				kind: 'toolRun',
				id: msg.id,
				thinking: msg.thinking ?? '',
				toolCalls: [...(msg.toolCalls ?? [])],
				interactives: msg.interactive ? [msg.interactive] : [],
			});
			continue;
		}
		// Assistant message with text content: fold into the open toolRun (if any)
		// so tools and their trailing answer share a single bubble per turn.
		if (msg.role === 'assistant') {
			const last = groups[groups.length - 1];
			if (last && last.kind === 'toolRun' && !last.finalMessage) {
				last.finalMessage = msg;
				if (msg.thinking) {
					last.thinking = last.thinking ? `${last.thinking}\n\n${msg.thinking}` : msg.thinking;
				}
				if (msg.toolCalls?.length) {
					last.toolCalls = [...last.toolCalls, ...msg.toolCalls];
				}
				if (msg.interactive) last.interactives.push(msg.interactive);
				continue;
			}
		}
		groups.push({ kind: 'message', id: msg.id, message: msg });
	}
	return groups;
}

// ---------------------------------------------------------------------------
// Reconstruct InteractivePayload from history (or live-resolved tool calls)
// ---------------------------------------------------------------------------

/**
 * Given a tool call belonging to one of the interactive builder tools,
 * reconstruct an `InteractivePayload` for it. The result is:
 *
 * - **resolved**: when `output` is present — `resolvedValue` is parsed from it
 *   via the matching zod schema. The output IS the user's resume payload (the
 *   tool handler returns `ctx.resumeData` after a resume), so no separate
 *   `resumedAt` signal is needed.
 * - **open**: when `output` is absent — the card renders as an active
 *   awaiting-user prompt. Used when a refresh during a suspension restored the
 *   suspended assistant turn from the open checkpoint.
 *
 * Returns `undefined` when the tool name isn't interactive or input parsing fails.
 */
export function rebuildInteractiveFromHistory(tc: ToolCall): InteractivePayload | undefined {
	if (!isInteractiveToolName(tc.tool)) return undefined;

	const base: InteractivePayloadBase = {
		toolCallId: tc.toolCallId,
		// `resolvedAt` is a boolean-ish flag for the UI's disabled state — the
		// exact timestamp doesn't matter, only its presence.
		...(tc.output !== undefined && { resolvedAt: 1 }),
	};

	if (tc.tool === ASK_CREDENTIAL_TOOL_NAME) {
		const input = askCredentialInputSchema.safeParse(tc.input);
		if (!input.success) return undefined;
		const resolved =
			tc.output !== undefined ? askCredentialResumeSchema.safeParse(tc.output) : null;
		return {
			...base,
			toolName: ASK_CREDENTIAL_TOOL_NAME,
			input: input.data,
			...(resolved?.success && { resolvedValue: resolved.data }),
		};
	}

	if (tc.tool === ASK_LLM_TOOL_NAME) {
		const input = askLlmInputSchema.safeParse(tc.input ?? {});
		if (!input.success) return undefined;
		const resolved = tc.output !== undefined ? askLlmResumeSchema.safeParse(tc.output) : null;
		return {
			...base,
			toolName: ASK_LLM_TOOL_NAME,
			input: input.data,
			...(resolved?.success && { resolvedValue: resolved.data }),
		};
	}

	// ask_question
	const input = askQuestionInputSchema.safeParse(tc.input);
	if (!input.success) return undefined;
	const resolved = tc.output !== undefined ? askQuestionResumeSchema.safeParse(tc.output) : null;
	return {
		...base,
		toolName: ASK_QUESTION_TOOL_NAME,
		input: input.data,
		...(resolved?.success && { resolvedValue: resolved.data }),
	};
}

// ---------------------------------------------------------------------------
// Convert persisted DB messages
// ---------------------------------------------------------------------------

/**
 * Convert persisted agent messages into the frontend ChatMessage format.
 *
 * Whenever a tool call is interactive (one of the ask_* tools), we attach a
 * reconstructed `InteractivePayload` so the UI re-renders the card in either
 * its open (awaiting user) or resolved (disabled) state.
 */
export function convertDbMessages(dbMessages: AgentPersistedMessageDto[]): ChatMessage[] {
	const result: ChatMessage[] = [];

	for (const msg of dbMessages) {
		if (!msg.role || !Array.isArray(msg.content)) continue;

		const role: ChatMessage['role'] | null =
			msg.role === 'user' ? 'user' : msg.role === 'assistant' ? 'assistant' : null;
		if (role === null) continue;

		let text = '';
		let thinking = '';
		const toolCalls: ToolCall[] = [];

		for (const part of msg.content) {
			if (part.type === 'text' && part.text) {
				text += part.text;
			} else if (part.type === 'reasoning' && part.text) {
				thinking += part.text;
			} else if (part.type === 'tool-call' && part.toolName) {
				let state: ToolCallState;
				let output: unknown;
				if (part.state === 'resolved') {
					state = TOOL_CALL_STATE.DONE;
					output = part.output;
				} else if (part.state === 'rejected') {
					state = TOOL_CALL_STATE.ERROR;
					output = part.error;
				} else {
					state = TOOL_CALL_STATE.RUNNING;
					output = undefined;
				}

				toolCalls.push({
					tool: part.toolName,
					toolCallId: part.toolCallId ?? '',
					input: part.input,
					...(output !== undefined && { output }),
					state,
				});
			}
		}

		// Attach a reconstructed `interactive` payload if any tool call is one
		// of the interactive ask_* tools. Open (no output) → status awaitingUser.
		let interactive: InteractivePayload | undefined;
		let status: ChatMessage['status'];
		for (const tc of toolCalls) {
			const rebuilt = rebuildInteractiveFromHistory(tc);
			if (rebuilt) {
				interactive = rebuilt;
				if (rebuilt.resolvedAt === undefined) {
					tc.state = TOOL_CALL_STATE.SUSPENDED;
					status = CHAT_MESSAGE_STATUS.AWAITING_USER;
				}
				break;
			}
		}

		result.push({
			id: msg.id ?? crypto.randomUUID(),
			role,
			content: text,
			thinking: thinking || undefined,
			toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
			...(status && { status }),
			...(interactive && { interactive }),
		});
	}
	return result;
}

// ---------------------------------------------------------------------------
// Apply open-suspension sidecar to history-loaded chat
// ---------------------------------------------------------------------------

/**
 * Re-attach a `runId` to each interactive card whose underlying tool call is
 * still suspended on the backend. The sidecar comes from `GET /build/messages`
 * (`openSuspensions`) — `convertDbMessages` can't surface it on its own
 * because raw persisted messages don't carry runIds.
 *
 * Mutates `chat` in place (history-load happens before reactivity wraps the
 * messages, so this is safe and avoids an extra deep clone) and returns it
 * for ergonomic chaining.
 */
export function applyOpenSuspensions(
	chat: ChatMessage[],
	suspensions: AgentBuilderOpenSuspension[],
): ChatMessage[] {
	if (suspensions.length === 0) return chat;
	const byToolCallId = new Map(suspensions.map((s) => [s.toolCallId, s.runId]));
	for (const msg of chat) {
		if (!msg.interactive) continue;
		const runId = byToolCallId.get(msg.interactive.toolCallId);
		if (runId) msg.interactive.runId = runId;
	}
	return chat;
}
