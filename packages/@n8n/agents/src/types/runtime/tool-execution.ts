import type { JSONSchema7 } from 'json-schema';

import type { AgentMessageList } from '../../runtime/model/message-list';
import type { TokenCounter } from '../../runtime/model/model-token-counter';
import type { AgentEventBus } from '../../runtime/state/event-bus';
import type { RuntimeTelemetry } from '../../runtime/telemetry/runtime-telemetry';
import type { RuntimeSkillLoader } from '../../skills/types';
import type { WorkspaceFilesystem } from '../../workspace/types';
import type {
	AgentExecutionCounter,
	BuiltTelemetry,
	BuiltTool,
	PendingToolCall,
	ToolSuspendOptions,
	ToolApprovalContext,
} from '../index';
import type { AgentPersistenceOptions, ToolResultEntry } from '../sdk/agent';
import type { AgentMessage } from '../sdk/message';
import type { JSONValue } from '../utils/json';

/** Pending tool calls from a suspended run, passed into the loop to execute before the first LLM call. */
export interface PendingResume {
	pendingToolCalls: Record<string, PendingToolCall>;
	/** The tool call being resumed with new data. */
	resumeToolCallId: string;
	resumeData: unknown;
}

export type ToolCallOutcome =
	| {
			outcome: 'success';
			toolEntry: ToolResultEntry;
			/**
			 * Output as the LLM sees it (after `toModelOutput`). Same as
			 * `toolEntry.output` when no `toModelOutput` transform is configured.
			 * Surfaced on the `tool-result` wire chunk so consumers see what the
			 * LLM saw (rather than the larger raw output).
			 */
			modelOutput: unknown;
			customMessage?: AgentMessage;
			mcpServerName?: string;
	  }
	| {
			outcome: 'suspended';
			payload: unknown;
			resumeSchema: JSONSchema7;
			continuation?: JSONValue;
	  }
	| {
			outcome: 'cancelled';
			toolEntry: ToolResultEntry;
			modelOutput: string;
			userMessage: string;
			canceled: true;
	  }
	| { outcome: 'retryable-error' }
	| { outcome: 'error'; error: unknown }
	| { outcome: 'noop' }; // tool call shouldn't be saved or logged anywhere, usually means that if was executed by AI SDK

export type ToolCallIdentity = Pick<PendingToolCall, 'toolCallId' | 'toolName' | 'input'>;

/** A tool call that completed successfully. */
export interface ToolCallSuccess extends ToolCallIdentity {
	toolEntry: ToolResultEntry;
	modelOutput: unknown;
	customMessage?: AgentMessage;
	/** Set when the tool belongs to an MCP server, so hosts can attribute the result to it. */
	mcpServerName?: string;
}

/** Info about a tool call that suspended (before persistence — no runId yet). */
export interface ToolCallSuspension extends ToolCallIdentity {
	payload: unknown;
	/** JSON Schema describing the shape of resume data, derived from the tool's resumeSchema. */
	resumeSchema: JSONSchema7;
}

/** Info about a tool call that failed — carries enough data for stream chunks. */
export interface ToolCallError extends ToolCallIdentity {
	error: unknown;
}

/** Result of executing a batch of tool calls (before persistence). */
export interface ToolCallBatchResult {
	results: ToolCallSuccess[];
	suspensions: ToolCallSuspension[];
	errors: ToolCallError[];
	/** All items to persist: suspended tools (with suspendPayload) + unexecuted tools (without). */
	pending: Record<string, PendingToolCall>;
}

export interface ToolCallInput {
	toolCallId: string;
	toolName: string;
	input: unknown;
	providerExecuted?: boolean;
}

/** Shared input for the tool-call batch iterators. */
export interface ToolBatchContext {
	toolMap: Map<string, BuiltTool>;
	list: AgentMessageList;
	runId: string;
	persistence?: AgentPersistenceOptions;
	telemetry?: BuiltTelemetry;
	executionCounter?: AgentExecutionCounter;
	approvalContext?: ToolApprovalContext;
	abortSignal: AbortSignal;
	isAborted: () => boolean;
}

export interface ResumeToolBatchContext extends ToolBatchContext {
	pendingResume: PendingResume;
}

/** Inputs for executing a single tool call. */
export interface ProcessToolCallParams extends ToolCallIdentity {
	toolMap: Map<string, BuiltTool>;
	list: AgentMessageList;
	runId: string;
	persistence?: AgentPersistenceOptions;
	resumeData?: unknown;
	resolvedTelemetry?: BuiltTelemetry;
	executionCounter?: AgentExecutionCounter;
	approvalContext?: ToolApprovalContext;
	abortSignal?: AbortSignal;
	/** Whether this counts as a new tool-call invocation. Default `true`; `false` on resume. */
	countToolCall?: boolean;
	/** Checkpointed suspend payload of the tool call being resumed. */
	suspendPayload?: unknown;
	/** Checkpointed private continuation of the tool call being resumed. */
	continuation?: JSONValue;
	/** Checkpointed resume schema of the tool call being resumed. */
	resumeSchema?: ToolSuspendOptions['resumeSchema'];
}

export interface ToolCallExecutorDeps {
	loadSkill?: RuntimeSkillLoader;
	telemetry: RuntimeTelemetry;
	eventBus: AgentEventBus;
	/** Effective tool-call concurrency (default 1 = sequential). */
	concurrency: number;
	/** Invoked when a run is aborted mid-batch so the runtime can set cancelled state. */
	onCancelled: () => void;
	tokenCounter: TokenCounter;
	workspaceFilesystem?: WorkspaceFilesystem;
}
