import { z } from 'zod';

import type {
	SubAgentTaskPath,
	SubAgentTaskPathPolicy,
} from '../../runtime/tools/sub-agent-task-path';
import type {
	AgentExecutionCounter,
	FinishReason,
	GenerateResult,
	ModelConfig,
	StreamChunk,
	TokenUsage,
} from '../sdk/agent';
import type { BuiltProviderTool } from '../sdk/tool';
import type { BuiltTelemetry } from '../telemetry';
import type { JSONObject, JSONValue } from '../utils/json';

export const DELEGATE_SUB_AGENT_TOOL_NAME = 'delegate_subagent';
export const INLINE_SUB_AGENT_ID = 'inline';
/** i18n key — localized in the agent chat UI; see `agents.chat.delegate.childSuspendUnsupported`. */
export const DELEGATED_CHILD_SUSPEND_UNSUPPORTED_MESSAGE =
	'agents.chat.delegate.childSuspendUnsupported';
export const INLINE_DELEGATE_SUB_AGENT_TOOL_METADATA_KEY = 'inlineDelegateSubAgent';

export const SUB_AGENT_TASK_DIFFICULTIES = ['low', 'medium', 'high'] as const;
const SubAgentTaskDifficultySchema = z.enum(SUB_AGENT_TASK_DIFFICULTIES);
export type SubAgentTaskDifficulty = z.infer<typeof SubAgentTaskDifficultySchema>;

const jsonValueSchema: z.ZodType<JSONValue> = z.lazy(() =>
	z.union([
		z.string(),
		z.number(),
		z.boolean(),
		z.null(),
		z.array(jsonValueSchema),
		z.record(z.string(), jsonValueSchema),
	]),
);

// Model-facing input: the arguments the LLM fills in when it calls the tool.
// The `.describe(...)` text is what the model reads, so keep it task-oriented.
export const delegateSubAgentInputSchema = z.object({
	subAgentId: z
		.string()
		.min(1)
		.describe(
			'Required. Use "inline" for a one-off inline sub-agent. Use an exact configured sub-agent ID only when one is listed and fits the task.',
		),
	taskName: z
		.string()
		.min(1)
		.describe('Short human-readable name for this delegated task, e.g. "research_api".'),
	goal: z.string().min(1).describe('The concrete goal the sub-agent should accomplish.'),
	context: z
		.string()
		.optional()
		.describe(
			'All details the child needs, since it sees nothing else: constraints, paths, data, prior decisions, acceptance criteria, and what you have already tried or ruled out.',
		),
	expectedOutput: z.string().optional().describe('The expected shape or contents of the answer.'),
	difficulty: SubAgentTaskDifficultySchema.optional().describe(
		'Optional difficulty estimate for this delegated task. Use low for simple bounded work, medium for moderate analysis or implementation, and high for complex research, architecture, or multi-step reasoning.',
	),
});

// Documents the tool result shape for typing/introspection. Note: the handler's
// returned object (not this schema) is what is actually sent back to the model,
// so this is kept in sync with DelegateSubAgentToolOutput by hand.
export const delegateSubAgentOutputSchema = z.object({
	status: z.enum(['completed', 'failed', 'suspended', 'cancelled']),
	taskPath: z.string().optional(),
	runId: z.string().optional(),
	threadId: z.string().optional(),
	model: z.string().optional(),
	answer: z.string(),
	structuredOutput: z.unknown().optional(),
	usage: z
		.object({
			promptTokens: z.number().optional(),
			completionTokens: z.number().optional(),
			totalTokens: z.number().optional(),
			cost: z.number().optional(),
		})
		.optional(),
	finishReason: z.string().optional(),
	error: z.string().optional(),
	resumeContext: jsonValueSchema.optional(),
	pendingSuspend: z
		.array(
			z.object({
				runId: z.string(),
				toolCallId: z.string(),
				toolName: z.string(),
				input: z.unknown(),
				suspendPayload: z.unknown(),
				resumeSchema: z.unknown().optional(),
			}),
		)
		.optional(),
});

const delegateSubAgentContinuationSchema = z.object({
	runId: z.string(),
	toolCallId: z.string(),
	taskPath: z.string(),
	subAgentId: z.string(),
	childCount: z.number().int().nonnegative(),
	threadId: z.string().optional(),
	resumeContext: jsonValueSchema.optional(),
});

export const delegateSubAgentSuspendSchema = z.unknown();
export const delegateSubAgentResumeSchema = z.unknown();

export type DelegateSubAgentContinuation = z.infer<typeof delegateSubAgentContinuationSchema>;

export function parseDelegateSubAgentContinuation(
	value: unknown,
): DelegateSubAgentContinuation | undefined {
	const parsed = delegateSubAgentContinuationSchema.safeParse(value);
	return parsed.success ? parsed.data : undefined;
}

/** The arguments the LLM provides when calling delegate_subagent. */
export type DelegateSubAgentInput = z.infer<typeof delegateSubAgentInputSchema>;

/**
 * Limits the delegate tool enforces structurally for a delegation: fan-out
 * and the on/off switch (see {@link SubAgentTaskPathPolicy}).
 *
 * Per-run runtime constraints (e.g. a wall-clock timeout) are intentionally not
 * here — they're a host concern, enforced inside the `runSubAgent` callback (as
 * the n8n CLI runner does).
 */
export type DelegateSubAgentPolicy = SubAgentTaskPathPolicy;

/**
 * What a host's `runSubAgent` callback receives: the model's
 * {@link DelegateSubAgentInput} plus runtime-derived context the host needs to
 * run and link the child. All `parent*` fields come from the parent's tool
 * execution context and are used for tracing/linkage, not required to run.
 */
export interface DelegateSubAgentRequest extends DelegateSubAgentInput {
	/** Direct child path assigned to this delegation (e.g. `/root/research_api_0`). */
	taskPath: SubAgentTaskPath;
	/** Parent run id (`ctx.runId`), e.g. for memory scoping / correlation. */
	parentRunId?: string;
	/** Parent's persisted memory thread id (`ctx.persistence.threadId`). */
	parentThreadId?: string;
	/** Parent's episodic-memory resource id (`ctx.persistence.resourceId`). */
	parentResourceId?: string;
	/** Opaque host metadata from the parent's persistence scope. */
	parentHostMetadata?: JSONObject;
	/** Parent's tool-call id that triggered this delegation. */
	parentToolCallId?: string;
	/**
	 * Parent run's abort signal (`ctx.abortSignal`). Forward it to the child so
	 * cancelling the parent run also cancels the delegated work.
	 */
	parentAbortSignal?: AbortSignal;
	/** Parent aggregate execution counter (`ctx.executionCounter`) for inline child accounting. */
	parentExecutionCounter?: AgentExecutionCounter;
	/**
	 * Parent's live, resolved telemetry (`ctx.parentTelemetry`). Hosts derive the
	 * child's own telemetry from this (see `deriveSubAgentTelemetry`) so the
	 * sub-agent shares the parent's tracer and nests under the parent's
	 * delegate-tool-call span instead of starting a separate root trace.
	 */
	parentTelemetry?: BuiltTelemetry;
	/** How many siblings the parent already spawned before this one (0-based). */
	childCount: number;
	/** Effective policy for this delegation. */
	policy?: DelegateSubAgentPolicy;
}

/** The result a delegation returns to the parent model and to lifecycle events. */
export interface DelegateSubAgentToolOutput {
	status: 'completed' | 'failed' | 'suspended' | 'cancelled';
	/** Echoed back so consumers can correlate the result with the delegation. */
	taskPath?: SubAgentTaskPath;
	/** The child run's id, when the executor produced one. */
	runId?: string;
	/**
	 * The child run's memory thread id (`persistence.threadId`), when the
	 * executor used one. Surfaced so a consumer can correlate the child run or
	 * re-supply it to continue the same thread on a later delegation.
	 */
	threadId?: string;
	/** Effective child model id used for this delegation (e.g. `anthropic/claude-haiku-4-5`). */
	model?: string;
	/** The child's answer — the main payload the parent acts on. */
	answer: string;
	structuredOutput?: unknown;
	/** Child token usage + cost, surfaced so the parent can account for it. */
	usage?: Pick<TokenUsage, 'promptTokens' | 'completionTokens' | 'totalTokens' | 'cost'>;
	finishReason?: FinishReason;
	/** Present when status is 'failed'. */
	error?: string;
	/** Host-owned, serializable context required to reconstruct this exact child. */
	resumeContext?: JSONValue;
	/** Present when status is 'suspended' — child run paused awaiting tool resume. */
	pendingSuspend?: GenerateResult['pendingSuspend'];
}

/**
 * Helpers passed to a host `runSubAgent` callback so the host can route
 * `subAgentId: "inline"` while reusing the SDK inline child runner implementation.
 */
export interface DelegateSubAgentRunnerHelpers {
	/** Run a one-off inline child using the parent agent's inherited local/deferred tool set. */
	runInlineSubAgent: (request: DelegateSubAgentRequest) => Promise<DelegateSubAgentToolOutput>;
	/**
	 * Forward a child stream chunk into the parent run's event bus (allowlisted
	 * types only, with a per-delegation character budget). No-op when the
	 * parent tool call id is missing.
	 */
	emitChunk: (chunk: StreamChunk) => void;
}

export type InlineSubAgentProviderToolsResolver = (
	modelConfig: ModelConfig,
) => BuiltProviderTool[] | Promise<BuiltProviderTool[]>;

export type DelegateSubAgentRunner = (
	request: DelegateSubAgentRequest,
	helpers: DelegateSubAgentRunnerHelpers,
) => Promise<DelegateSubAgentToolOutput>;

export interface DelegateSubAgentCheckpointTarget {
	childRunId: string;
	childToolCallId: string;
	childThreadId?: string;
	resumeContext?: JSONValue;
}

export interface DelegateSubAgentResumeRequest
	extends DelegateSubAgentRequest,
		DelegateSubAgentCheckpointTarget {
	resumeData: unknown;
}

export type DelegateSubAgentResumeRunner = (
	request: DelegateSubAgentResumeRequest,
	helpers: DelegateSubAgentRunnerHelpers,
) => Promise<DelegateSubAgentToolOutput>;

export interface DelegateSubAgentCancelRequest
	extends DelegateSubAgentRequest,
		DelegateSubAgentCheckpointTarget {
	reason: string;
}

export type DelegateSubAgentCancelRunner = (
	request: DelegateSubAgentCancelRequest,
	helpers: DelegateSubAgentRunnerHelpers,
) => Promise<void>;

export interface CreateDelegateSubAgentToolOptions {
	/** Model-facing tool name. Defaults to {@link DELEGATE_SUB_AGENT_TOOL_NAME}; the default description and system instruction adapt to it. */
	name?: string;
	/** Model-facing tool description. Anything other than a non-blank string falls back to the built-in text. */
	description?: string | null;
	/** System-prompt delegation guidance. Anything other than a non-blank string falls back to the built-in guidance. */
	systemInstruction?: string | null;
	/**
	 * Sub-agents the model may choose between. Listed in the system prompt; the
	 * model selects one by passing its id as `subAgentId`.
	 */
	availableSubAgents?: Array<{ id: string; name: string; useWhen?: string }>;
	/** Parallelism limit for delegated child runs (also used as delegate_subagent batch size). */
	policy?: DelegateSubAgentPolicy;
	/** Additional local/deferred tool names the host removes from inline children. */
	inlineSubAgentBlockedTools?: string[];
	/**
	 * Resolved inline sub-agent models by task difficulty. Hosts map persisted config
	 * to runtime {@link ModelConfig} values before registering the delegate tool.
	 */
	inlineSubAgentModelsByDifficulty?: Partial<Record<SubAgentTaskDifficulty, ModelConfig>>;
	/**
	 * Resolve provider-defined tools for an inline child after its model has been chosen.
	 * Inline children do not inherit parent provider tools.
	 */
	resolveInlineSubAgentProviderTools?: InlineSubAgentProviderToolsResolver;
	/**
	 * Run the child for this delegation and return its result. When provided, the
	 * host receives every `subAgentId` (including `"inline"`) and may call
	 * `helpers.runInlineSubAgent` for inline work.
	 */
	runSubAgent?: DelegateSubAgentRunner;
	/** Resume a child checkpoint previously cascaded through this delegate tool. */
	resumeSubAgent?: DelegateSubAgentResumeRunner;
	/** Return true only when a thrown child-resume error is safe to retry. */
	shouldRetrySubAgentResumeError?: (error: unknown) => boolean;
	/** Clean up a child checkpoint when the parent cancels the suspended delegation. */
	cancelSubAgent?: DelegateSubAgentCancelRunner;

	toModelOutput?: (output: z.infer<typeof delegateSubAgentOutputSchema>) => unknown;
}

export type DelegateSubAgentToolMetadata = CreateDelegateSubAgentToolOptions;
