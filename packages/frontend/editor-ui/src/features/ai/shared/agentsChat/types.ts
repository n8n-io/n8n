import {
	type APPROVAL_TOOL_NAME,
	type N8N_CHAT_ACTION_TOOL_NAME,
	type WAIT_TOOL_NAME,
} from '@n8n/api-types';

import type { N8nChatInteractionInput, N8nChatResumeValue } from './n8nChatInteraction';

import type { ChatMessageStatus, ToolCallState } from './constants';

export type { ChatMessageStatus, ToolCallState };

export interface ThinkingSegment {
	id: string;
	content: string;
	startTime?: number;
	endTime?: number;
}

export interface ToolCall {
	tool: string;
	toolCallId: string;
	input?: unknown;
	output?: unknown;
	canceled?: boolean;
	state: ToolCallState;
	/** Run id for a currently suspended call, used to cancel non-card HITL waits. */
	runId?: string;
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
	 * Raw suspend payload from `tool-call-suspended`. Kept separate from the
	 * model-authored tool input because delegated tools can surface a nested
	 * approval for a child tool.
	 */
	suspendPayload?: unknown;
	/** Live progress of a delegated child, streamed while the delegation runs
	 *  and restored from history when a `childTrace` was persisted on the
	 *  parent's execution timeline. */
	childProgress?: {
		text: string;
		reasoningSegments: ThinkingSegment[];
		steps: Array<{ toolCallId: string; toolName: string; running: boolean }>;
	};
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
	/** Sanitized full tool configuration, included only by preview chat. */
	details?: unknown;
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
	  })
	/**
	 * A workflow tool parked on a Wait node. Same card contract as a chat card —
	 * it reuses that renderer — but it is not a question, so typing must not
	 * cancel and steer it (see `AgentChatPanel`).
	 */
	| (InteractivePayloadBase & {
			toolName: typeof WAIT_TOOL_NAME;
			input: N8nChatInteractionInput;
			resolvedValue?: N8nChatResumeValue;
	  });

export type AgentsChatInteraction = InteractivePayload;

export type ChatMessageRenderPart =
	| { type: 'text'; text: string }
	| { type: 'interactive'; toolCallId: string };

export interface ChatMessageAttachment {
	fileName: string;
	mimeType: string;
	sizeBytes?: number;
	/** Server attachment id — set on history-loaded attachments; used to build the download URL. */
	fileId?: string;
	/** Local file backing the optimistic echo of a just-sent message (no fileId yet). */
	file?: File;
}

export interface AgentsChatMessage {
	id: string;
	role: 'user' | 'assistant';
	content: string;
	renderParts?: ChatMessageRenderPart[];
	thinkingSegments?: ThinkingSegment[];
	/** Legacy aggregate kept for messages created before timed segments were added. */
	thinking?: string;
	toolCalls?: ToolCall[];
	status?: ChatMessageStatus;
	interactives?: InteractivePayload[];
	interactive?: InteractivePayload;
	attachments?: ChatMessageAttachment[];
	/** Persisted agent execution id for this turn (history parse or live SSE `done`). */
	executionId?: string;
}

export type ChatMessage = AgentsChatMessage;
