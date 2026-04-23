/**
 * Wire format for the agent builder/chat SSE stream. Each SSE `data:` line is
 * exactly one `AgentSseEvent` JSON object.
 *
 * The `messageId` field on per-turn events is the stable id of the persisted
 * assistant message that the event belongs to. The frontend creates a new
 * `ChatMessage` whenever `messageId` changes so the live array shape matches
 * what `convertDbMessages` produces from history.
 *
 * `runId` is included on `ToolSuspendedPayload` and echoed back by the
 * frontend on resume. The SDK stores `runId` on each `PendingToolCall` and
 * surfaces it on every suspended-tool chunk; the FE doesn't need to derive it
 * server-side.
 *
 * Note: there is no separate "resumed" event. After the user resumes a
 * suspended tool, the SDK runs the tool's handler (which returns
 * `ctx.resumeData`) and emits a normal `tool-result` content part. Consumers
 * see the resume payload as the `output` on the standard `toolResult` event.
 */

export interface ToolSuspendedPayload {
	toolCallId: string;
	/** Run id of the suspended turn; FE echoes this back on `POST /build/resume`. */
	runId: string;
	/** Also the discriminator on the wire (no separate interactionType field). */
	toolName: string;
	/** Shape determined by toolName via the corresponding Ask*InputSchema. */
	input: unknown;
}

export type AgentSseEvent =
	| { type: 'text'; messageId: string; delta: string }
	| { type: 'reasoning'; messageId: string; delta: string }
	| {
			type: 'toolCall';
			messageId: string;
			toolCallId: string;
			toolName: string;
			input: unknown;
	  }
	| {
			type: 'toolResult';
			messageId: string;
			toolCallId: string;
			toolName: string;
			output: unknown;
			isError?: boolean;
	  }
	| {
			type: 'toolCallDelta';
			messageId: string;
			toolCallId?: string;
			toolName?: string;
			argumentsDelta: string;
	  }
	| {
			/**
			 * Mid-flight indicator: the LLM has finished emitting the tool call and
			 * the runtime has started invoking the handler. Sent between the
			 * `toolCall` and the eventual `toolResult` so the FE can flip the
			 * indicator from "pending" (LLM committed) to "running" (handler in
			 * flight).
			 */
			type: 'toolExecutionStart';
			messageId: string;
			toolCallId: string;
			toolName: string;
	  }
	| { type: 'toolSuspended'; messageId: string; payload: ToolSuspendedPayload }
	| { type: 'codeDelta'; delta: string }
	| { type: 'configUpdated' }
	| { type: 'toolUpdated' }
	| { type: 'error'; message: string }
	| { type: 'done'; sessionId?: string };
