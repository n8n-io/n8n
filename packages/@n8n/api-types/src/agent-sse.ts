/**
 * Wire format for the agent builder/chat SSE stream. Each SSE `data:` line is
 * exactly one `AgentSseEvent` JSON object.
 *
 * Per-turn events carry the SDK's natural block ids:
 *
 * - `text-*` and `reasoning-*` events carry the SDK's per-block `id`.
 * - `tool-*` events carry the SDK's `toolCallId`.
 * - `start-step` / `finish-step` mark LLM iteration boundaries.
 *
 * The frontend groups deltas by these ids and uses `start-step` / `finish-step`
 * to decide when a new ChatMessage cursor should open. There is no
 * server-minted `messageId` — the FE generates its own UUID per ChatMessage
 * for v-for keys only.
 *
 * `runId` is included on `ToolSuspendedPayload` and echoed back by the
 * frontend on resume. The SDK stores `runId` on each `PendingToolCall` and
 * surfaces it on every suspended-tool chunk; the FE doesn't need to derive it
 * server-side.
 *
 * Note: there is no separate "resumed" event. After the user resumes a
 * suspended tool, the SDK runs the tool's handler (which returns
 * `ctx.resumeData`) and emits a normal `tool-result` event. Consumers see the
 * resume payload as the `output` on that `tool-result`.
 *
 */

import type { AgentPersistedMessageContentPart } from './agents';

export interface ToolSuspendedPayload {
	toolCallId: string;
	/** Run id of the suspended turn; FE echoes this back on `POST /build/resume`. */
	runId: string;
	/** Also the discriminator on the wire (no separate interactionType field). */
	toolName: string;
	/** Shape determined by toolName via the corresponding Ask*InputSchema. */
	input: unknown;
}

/**
 * Custom (sub-agent / app-defined) message envelope. Tool-call and tool-result
 * events ride their own discrete chunk types — only `CustomAgentMessage`-style
 * payloads use this shape.
 */
export interface AgentSseMessage {
	role: string;
	content: AgentPersistedMessageContentPart[];
}

export type AgentSseEvent =
	| { type: 'start-step' }
	| { type: 'finish-step' }
	| { type: 'text-start'; id: string }
	| { type: 'text-delta'; id: string; delta: string }
	| { type: 'text-end'; id: string }
	| { type: 'reasoning-start'; id: string }
	| { type: 'reasoning-delta'; id: string; delta: string }
	| { type: 'reasoning-end'; id: string }
	| { type: 'tool-input-start'; toolCallId: string; toolName: string }
	| { type: 'tool-input-delta'; toolCallId: string; delta: string }
	| { type: 'tool-call'; toolCallId: string; toolName: string; input: unknown }
	| {
			/**
			 * Mid-flight indicator: the LLM has finished emitting the tool call and
			 * the runtime has started invoking the handler. Sent between `tool-call`
			 * and the eventual `tool-result` so the FE can flip the indicator from
			 * "pending" (LLM committed) to "running" (handler in flight).
			 */
			type: 'tool-execution-start';
			toolCallId: string;
			toolName: string;
	  }
	| {
			type: 'tool-result';
			toolCallId: string;
			toolName: string;
			output: unknown;
			isError?: boolean;
	  }
	| { type: 'tool-call-suspended'; payload: ToolSuspendedPayload }
	| { type: 'message'; message: AgentSseMessage }
	| { type: 'working-memory-update'; toolName: string }
	| { type: 'code-delta'; delta: string }
	| { type: 'config-updated' }
	| { type: 'tool-updated' }
	| {
			type: 'error';
			message: string;
			/**
			 * Optional discriminator for distinct error classes.
			 */
			errorCode?: string;
			/** Backend-emitted ids of the missing config slots; only set when `errorCode` is `agent_misconfigured`. */
			missing?: string[];
	  }
	| { type: 'done'; sessionId?: string };
