import type { AgentPersistenceOptions } from './agent';
import type { ContentToolCall } from './message';
import type { BuiltTool } from './tool';
import type { JSONValue } from '../utils/json';

/** The tool that a call runs. It has no handler, so a hook cannot run the tool. */
export type ToolCallTarget = Pick<
	BuiltTool,
	'name' | 'metadata' | 'mcpServerName' | 'mcpToolName' | 'mcpAnnotations'
> & {
	/** The dispatcher that the model called, such as `call_tool`. Absent for a direct call. */
	readonly dispatchedBy?: string;
};

/**
 * A tool call in the message list of a run. `tool` describes the tool that the call ran or
 * will run. It is absent when the runtime no longer has a tool of that name. A tool that the
 * model provider ran has its name and `metadata.kind: 'provider'`.
 */
export type RunToolCall = ContentToolCall & { readonly tool?: ToolCallTarget };

export interface PreToolExecutionContext {
	readonly toolCallId: string;
	readonly runId: string;
	readonly tool: ToolCallTarget;
	/** The input that the handler receives, after schema validation. */
	readonly input: JSONValue;
	/** The call suspended before, and its handler is entered again with resume data. */
	readonly resumed: boolean;
	readonly persistence?: AgentPersistenceOptions;
	/**
	 * The tool calls in the message list of this run, oldest first. This call and the other
	 * calls of its batch are `pending`. History before the point where the run loaded its
	 * messages is not included.
	 */
	readonly runToolCalls: () => readonly RunToolCall[];
}

export type PreToolExecutionDecision =
	| { allow: true }
	/** `result` goes to the model as the result of the tool call. */
	| { allow: false; result: unknown };

/**
 * Decides whether a tool call runs. The runtime calls it each time it enters a tool handler:
 * for a new call and for a call that resumes. A hook that throws stops the call.
 */
export type PreToolExecution = (ctx: PreToolExecutionContext) => Promise<PreToolExecutionDecision>;
