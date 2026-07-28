import { type APPROVAL_TOOL_NAME, type N8N_CHAT_ACTION_TOOL_NAME } from '@n8n/api-types';

import type { N8nChatInteractionInput, N8nChatResumeValue } from './n8nChatInteraction';

import type { ChatMessageStatus, ToolCallState } from './constants';

export type { ChatMessageStatus, ToolCallState };

export interface ToolCall {
	tool: string;
	toolCallId: string;
	input?: unknown;
	output?: unknown;
	canceled?: boolean;
	state: ToolCallState;
	/** Epoch ms when the tool started executing (live: client clock; reload: recorded). */
	startTime?: number;
	/** Epoch ms when the tool settled. Absent while still running. */
	endTime?: number;
	/**
	 * One-line answer label rendered next to the tool name in
	 * `AgentChatToolSteps`. Set when an interactive tool resolves so the user
	 * sees what they picked (e.g. "Slack") instead of just "ask_questions".
	 */
	displaySummary?: string;
	/**
	 * Raw suspend payload from `tool-call-suspended` for tools other than
	 * `approval` (e.g. `{ type: 'integration_action', ... }`). The approval
	 * tool instead overwrites `input` (its suspend payload IS the renderable
	 * input).
	 */
	suspendPayload?: unknown;
}

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
	/** Set when the tool was cancelled via a steering message rather than answered. */
	cancelled?: boolean;
}

export interface ApprovalInput {
	type: 'approval';
	toolName: string;
	displayName?: string;
	args: unknown;
}

export interface ApprovalResume {
	approved: boolean;
}

/**
 * Discriminated union describing the interactive card that a suspended tool call
 * renders in the chat. `toolName` is the discriminant.
 */
export type InteractivePayload =
	| (InteractivePayloadBase & {
			toolName: typeof APPROVAL_TOOL_NAME;
			input: ApprovalInput;
			resolvedValue?: ApprovalResume;
	  })
	| (InteractivePayloadBase & {
			toolName: typeof N8N_CHAT_ACTION_TOOL_NAME;
			input: N8nChatInteractionInput;
			resolvedValue?: N8nChatResumeValue;
	  });

export type AgentsChatInteraction = InteractivePayload;

export type ChatMessageRenderPart =
	| { type: 'text'; text: string }
	| { type: 'interactive'; toolCallId: string };

export interface AgentsChatMessage {
	id: string;
	role: 'user' | 'assistant';
	content: string;
	renderParts?: ChatMessageRenderPart[];
	thinking?: string;
	toolCalls?: ToolCall[];
	status?: ChatMessageStatus;
	interactives?: InteractivePayload[];
	interactive?: InteractivePayload;
	/** Persisted agent execution id for this turn (history parse or live SSE `done`). */
	executionId?: string;
}

export type ChatMessage = AgentsChatMessage;
