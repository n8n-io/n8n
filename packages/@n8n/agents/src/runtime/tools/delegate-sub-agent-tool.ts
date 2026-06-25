import { z } from 'zod';

import { withSdkOwnedBuiltInMetadata } from './sdk-owned-tool';
import {
	createChildSubAgentTaskPath,
	DEFAULT_SUB_AGENT_MAX_CHILDREN,
	type SubAgentTaskPath,
	type SubAgentTaskPathPolicy,
} from './sub-agent-task-path';
import { filterLlmMessages } from '../../sdk/message';
import { Tool } from '../../sdk/tool';
import { AgentEvent } from '../../types/runtime/event';
import type {
	AgentExecutionCounter,
	FinishReason,
	GenerateResult,
	ModelConfig,
	TokenUsage,
} from '../../types/sdk/agent';
import type { AgentMessage } from '../../types/sdk/message';
import type { BuiltProviderTool, BuiltTool, ToolContext } from '../../types/sdk/tool';

export const DELEGATE_SUB_AGENT_TOOL_NAME = 'delegate_subagent';
export const INLINE_SUB_AGENT_ID = 'inline';
/** i18n key — localized in the agent chat UI; see `agents.chat.delegate.childSuspendUnsupported`. */
export const DELEGATED_CHILD_SUSPEND_UNSUPPORTED_MESSAGE =
	'agents.chat.delegate.childSuspendUnsupported';
export const INLINE_DELEGATE_SUB_AGENT_TOOL_METADATA_KEY = 'inlineDelegateSubAgent';

export const SUB_AGENT_TASK_DIFFICULTIES = ['low', 'medium', 'high'] as const;
const SubAgentTaskDifficultySchema = z.enum(SUB_AGENT_TASK_DIFFICULTIES);
export type SubAgentTaskDifficulty = z.infer<typeof SubAgentTaskDifficultySchema>;

// Model-facing input: the arguments the LLM fills in when it calls the tool.
// The `.describe(...)` text is what the model reads, so keep it task-oriented.
const delegateSubAgentInputSchema = z.object({
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
const delegateSubAgentOutputSchema = z.object({
	status: z.enum(['completed', 'failed', 'suspended']),
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
	/** Parent's tool-call id that triggered this delegation. */
	parentToolCallId?: string;
	/**
	 * Parent run's abort signal (`ctx.abortSignal`). Forward it to the child so
	 * cancelling the parent run also cancels the delegated work.
	 */
	parentAbortSignal?: AbortSignal;
	/** Parent aggregate execution counter (`ctx.executionCounter`) for inline child accounting. */
	parentExecutionCounter?: AgentExecutionCounter;
	/** How many siblings the parent already spawned before this one (0-based). */
	childCount: number;
	/** Effective policy for this delegation. */
	policy?: DelegateSubAgentPolicy;
}

/** The result a delegation returns to the parent model and to lifecycle events. */
export interface DelegateSubAgentToolOutput {
	status: 'completed' | 'failed' | 'suspended';
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
	/** Present when status is 'suspended' — child run paused awaiting tool resume. */
	pendingSuspend?: GenerateResult['pendingSuspend'];
}

/**
 * Options for the `delegate_subagent` tool.
 *
 * You supply `runSubAgent` — the host callback that actually runs the child for
 * a delegation and returns its result. Everything else (input/output schema,
 * system prompt, task-path bookkeeping, parallelism policy, and the
 * `subagent-started` / `-completed` lifecycle events) is owned by
 * the tool.
 */
/**
 * Helpers passed to a host `runSubAgent` callback so the host can route
 * `subAgentId: "inline"` while reusing the SDK inline child runner implementation.
 */
export interface DelegateSubAgentRunnerHelpers {
	/** Run a one-off inline child using the parent agent's inherited local/deferred tool set. */
	runInlineSubAgent: (request: DelegateSubAgentRequest) => Promise<DelegateSubAgentToolOutput>;
}

export type InlineSubAgentProviderToolsResolver = (
	modelConfig: ModelConfig,
) => BuiltProviderTool[] | Promise<BuiltProviderTool[]>;

export type DelegateSubAgentRunner = (
	request: DelegateSubAgentRequest,
	helpers: DelegateSubAgentRunnerHelpers,
) => Promise<DelegateSubAgentToolOutput>;

export interface CreateDelegateSubAgentToolOptions {
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

	toModelOutput?: (output: z.infer<typeof delegateSubAgentOutputSchema>) => unknown;
}

export type DelegateSubAgentToolMetadata = CreateDelegateSubAgentToolOptions;

/**
 * Build the generic `delegate_subagent` tool — lets a parent agent hand a
 * bounded subtask to a child agent and get back a concise result.
 *
 * The tool owns the cross-cutting concerns: the model-facing input/output
 * schema, the description + system instruction that teach the LLM when/how to
 * delegate, task-path bookkeeping, parallelism policy, and the
 * `subagent-started` / `-completed`
 * lifecycle events. You only supply HOW to run the child, via `runSubAgent`.
 *
 * @example Host-controlled execution (what the n8n CLI does):
 *   agent.tool(createDelegateSubAgentTool({
 *     runSubAgent: (request) => runner.run(request),
 *     availableSubAgents,
 *     policy: { maxChildren: 10 },
 *   }));
 */
function resolveDelegateSubAgentPolicy(
	policy: DelegateSubAgentPolicy | undefined,
): DelegateSubAgentPolicy {
	const resolvedPolicy = {
		...policy,
		maxChildren: policy?.maxChildren ?? DEFAULT_SUB_AGENT_MAX_CHILDREN,
	};

	if (
		!Number.isFinite(resolvedPolicy.maxChildren) ||
		!Number.isInteger(resolvedPolicy.maxChildren)
	) {
		throw new Error('delegate_subagent policy.maxChildren must be a finite positive integer');
	}

	if (resolvedPolicy.maxChildren < 1) {
		throw new Error('delegate_subagent policy.maxChildren must be at least 1');
	}

	return resolvedPolicy;
}

export function createDelegateSubAgentTool(options: CreateDelegateSubAgentToolOptions = {}) {
	// Per-parent child path index for stable task paths (/root/name_0, /root/name_1, ...).
	const childPathIndexes = new Map<string, number>();
	const resolvedOptions: CreateDelegateSubAgentToolOptions = {
		...options,
		policy: resolveDelegateSubAgentPolicy(options.policy),
	};
	const inlineProviderToolInstruction = resolvedOptions.resolveInlineSubAgentProviderTools
		? "Provider-defined tools are loaded for the inline child's selected model provider."
		: 'Inline children do not inherit provider-defined tools.';

	const tool = new Tool(DELEGATE_SUB_AGENT_TOOL_NAME)
		.description(
			'Delegate a bounded, self-contained subtask to a focused child agent that runs in an isolated context and returns only a concise final result. ' +
				'Use it for reasoning-heavy subtasks, context-flooding investigations, or independent workstreams inside a larger deliverable. ' +
				'Do not use it for trivial work, single tool calls, mechanical steps, tasks that need hidden conversation context, or pass-through delegation of the entire user request.',
		)
		.systemInstruction(
			[
				`delegate_subagent runs a focused child agent in a fresh, isolated context and returns only its final answer. Always set subAgentId. Use subAgentId: "inline" to run a one-off inline child that inherits your local and deferred tools after safety filtering. ${inlineProviderToolInstruction} The child cannot see this conversation or your memory, so everything it needs must be in the call.`,
				'Use a configured subagent ID only when one is listed and its name and useWhen guidance fit the subtask better than a generic inline child.',
				...formatAvailableSubAgents(resolvedOptions.availableSubAgents),
				...formatDelegationPolicyInstructions(resolvedOptions.policy),
				'WHEN TO USE delegate_subagent:\n- The request decomposes into 2+ independent workstreams that can be handled separately.\n- A workstream needs substantial research, review, comparison, or analysis.\n- Doing the work inline would flood your context with intermediate findings.\n- A fresh isolated perspective would materially improve a bounded subtask.',
				'WHEN NOT TO USE delegate_subagent:\n- Single-step mechanical work: do it directly.\n- Trivial tasks or one/two tool calls: do them yourself.\n- Tasks that need user interaction or hidden conversation context.\n- Your core synthesis, final judgment, or recommendation.\n- The entire user request as one delegated task; that is pass-through with no value added.',
				`HOW TO DELEGATE:\n- Delegate bounded workstreams, not the final answer.\n- Pass all required context, constraints, language/tone, and expected output.\n- Set difficulty (low, medium, or high) when you can estimate task complexity; omit it to keep the default inline model.\n- If multiple independent workstreams exist, delegate them separately.\n- Inline children inherit your local and deferred tools after safety filtering. ${inlineProviderToolInstruction}\n- Inspect results and synthesize the final response yourself.\n- Verify side-effect claims before presenting them as done.`,
			].join('\n'),
		)
		.input(delegateSubAgentInputSchema)
		.output(delegateSubAgentOutputSchema)
		.handler(
			async (input, ctx) =>
				await handleDelegateSubAgent(input, ctx, resolvedOptions, childPathIndexes),
		)
		.toModelOutput((output) => {
			return resolvedOptions.toModelOutput ? resolvedOptions.toModelOutput(output) : output;
		})
		.build();
	return withSdkOwnedBuiltInMetadata({
		...tool,
		metadata: {
			...tool.metadata,
			[INLINE_DELEGATE_SUB_AGENT_TOOL_METADATA_KEY]: {
				...(resolvedOptions.availableSubAgents !== undefined
					? { availableSubAgents: resolvedOptions.availableSubAgents }
					: {}),
				policy: resolvedOptions.policy,
				...(resolvedOptions.inlineSubAgentBlockedTools !== undefined
					? { inlineSubAgentBlockedTools: resolvedOptions.inlineSubAgentBlockedTools }
					: {}),
				...(resolvedOptions.inlineSubAgentModelsByDifficulty !== undefined
					? {
							inlineSubAgentModelsByDifficulty: resolvedOptions.inlineSubAgentModelsByDifficulty,
						}
					: {}),
				...(resolvedOptions.resolveInlineSubAgentProviderTools !== undefined
					? {
							resolveInlineSubAgentProviderTools:
								resolvedOptions.resolveInlineSubAgentProviderTools,
						}
					: {}),
				...(resolvedOptions.runSubAgent !== undefined
					? { runSubAgent: resolvedOptions.runSubAgent }
					: {}),
				...(resolvedOptions.toModelOutput !== undefined
					? { toModelOutput: resolvedOptions.toModelOutput }
					: {}),
			} satisfies DelegateSubAgentToolMetadata,
		},
	});
}

export function getInlineDelegateSubAgentToolOptions(
	tool: BuiltTool,
): DelegateSubAgentToolMetadata | undefined {
	const value = tool.metadata?.[INLINE_DELEGATE_SUB_AGENT_TOOL_METADATA_KEY];
	if (typeof value !== 'object' || value === null) return undefined;
	return value as DelegateSubAgentToolMetadata;
}

function formatAvailableSubAgents(
	availableSubAgents: CreateDelegateSubAgentToolOptions['availableSubAgents'],
): string[] {
	if (!availableSubAgents?.length) return [];

	return [
		'Configured subagents are available as specialist options. Use subAgentId: "inline" for the default inline child; pass one of these exact IDs only when that specialist is a better fit:',
		...availableSubAgents.map((subAgent) => {
			const useWhen = subAgent.useWhen ? `\n  Use when: ${subAgent.useWhen}` : '';
			return `- ${subAgent.id}: ${subAgent.name}${useWhen}`;
		}),
	];
}

function formatDelegationPolicyInstructions(policy: DelegateSubAgentPolicy | undefined): string[] {
	if (policy?.maxChildren === undefined) return [];

	const runLabel = policy.maxChildren === 1 ? 'run' : 'runs';
	return [
		[
			'DELEGATION PARALLELISM:',
			`- Up to ${policy.maxChildren} child sub-agent ${runLabel} can execute at the same time.`,
			'- This limits parallelism, not the total number of delegated tasks.',
			'- If more independent workstreams are useful, you may issue more delegate_subagent calls; the runtime will run them in batches.',
		].join('\n'),
	];
}

/**
 * Tool handler: assign the child's task path,
 * assemble the {@link DelegateSubAgentRequest} from the model input plus the
 * parent tool context, then run the child via the host `runSubAgent` callback
 * while emitting started/progress/completed lifecycle events. Any error is
 * converted into a `status: 'failed'` output (never thrown) so one failed
 * delegation can't abort the parent's run.
 */
async function handleDelegateSubAgent(
	input: DelegateSubAgentInput,
	ctx: ToolContext,
	options: CreateDelegateSubAgentToolOptions,
	childPathIndexes: Map<string, number>,
): Promise<DelegateSubAgentToolOutput> {
	let taskPath: SubAgentTaskPath | undefined;
	let request: DelegateSubAgentRequest | undefined;
	let startedAt: number | undefined;
	try {
		const childPathIndexKey = getChildPathIndexKey(ctx);
		const childPathIndex = childPathIndexes.get(childPathIndexKey) ?? 0;

		taskPath = createChildSubAgentTaskPath(input.taskName, childPathIndex);
		childPathIndexes.set(childPathIndexKey, childPathIndex + 1);

		request = {
			...input,
			taskPath,
			childCount: childPathIndex,
			...(ctx.runId !== undefined ? { parentRunId: ctx.runId } : {}),
			...(ctx.persistence?.threadId !== undefined
				? { parentThreadId: ctx.persistence.threadId }
				: {}),
			...(ctx.persistence?.resourceId !== undefined
				? { parentResourceId: ctx.persistence.resourceId }
				: {}),
			...(ctx.abortSignal !== undefined ? { parentAbortSignal: ctx.abortSignal } : {}),
			...(ctx.toolCallId !== undefined ? { parentToolCallId: ctx.toolCallId } : {}),
			...(ctx.executionCounter !== undefined
				? { parentExecutionCounter: ctx.executionCounter }
				: {}),
			...(options.policy !== undefined ? { policy: options.policy } : {}),
		};

		startedAt = Date.now();
		emitSubAgentStarted(ctx, request, startedAt);
		if (!options.runSubAgent) {
			throw new Error(
				'delegate_subagent was registered without a runSubAgent callback, and no host runner was provided. Register it on an Agent (for inline delegation) or pass runSubAgent.',
			);
		}
		const output = await options.runSubAgent(request, {
			runInlineSubAgent: () => {
				throw new Error(
					'delegate_subagent host runner does not support inline delegation without helpers.runInlineSubAgent from an Agent build.',
				);
			},
		});
		emitSubAgentCompleted(ctx, request, output, startedAt);
		return output;
	} catch (error) {
		if (request !== undefined && startedAt !== undefined) {
			const failedOutput: DelegateSubAgentToolOutput = {
				status: 'failed',
				...(taskPath !== undefined ? { taskPath } : {}),
				answer: '',
				error: stringifyUnknown(error),
			};
			emitSubAgentCompleted(ctx, request, failedOutput, startedAt);
			return failedOutput;
		}
		return {
			status: 'failed',
			...(taskPath !== undefined ? { taskPath } : {}),
			answer: '',
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

function emitSubAgentStarted(
	ctx: ToolContext,
	request: DelegateSubAgentRequest,
	startedAt: number,
): void {
	ctx.emitEvent?.({
		type: AgentEvent.SubAgentStarted,
		...subAgentLifecycleBase(request),
		startedAt,
	});
}

function emitSubAgentCompleted(
	ctx: ToolContext,
	request: DelegateSubAgentRequest,
	output: DelegateSubAgentToolOutput,
	startedAt: number,
): void {
	const finishedAt = Date.now();
	ctx.emitEvent?.({
		type: AgentEvent.SubAgentCompleted,
		...subAgentLifecycleBase(request),
		status: output.status,
		startedAt,
		finishedAt,
		durationMs: finishedAt - startedAt,
		...(output.runId !== undefined ? { runId: output.runId } : {}),
		...(output.threadId !== undefined ? { threadId: output.threadId } : {}),
		...(output.usage !== undefined ? { usage: output.usage } : {}),
		...(output.finishReason !== undefined ? { finishReason: output.finishReason } : {}),
		...(output.model !== undefined ? { model: output.model } : {}),
		...(output.error !== undefined ? { error: output.error } : {}),
	});
}

function subAgentLifecycleBase(request: DelegateSubAgentRequest) {
	return {
		taskName: request.taskName,
		taskPath: request.taskPath,
		...(request.parentRunId !== undefined ? { parentRunId: request.parentRunId } : {}),
		...(request.parentToolCallId !== undefined
			? { parentToolCallId: request.parentToolCallId }
			: {}),
		...(request.subAgentId !== undefined ? { subAgentId: request.subAgentId } : {}),
	};
}

function getChildPathIndexKey(ctx: ToolContext): string {
	return ctx.runId ?? ctx.persistence?.threadId ?? ctx.persistence?.resourceId ?? 'adhoc';
}

function stringifyUnknown(value: unknown): string {
	if (value instanceof Error) return value.message;
	if (typeof value === 'string') return value;
	if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
		return String(value);
	}
	try {
		return JSON.stringify(value);
	} catch {
		return 'Unknown error';
	}
}

/**
 * Optional helpers for a `runSubAgent` implementation.
 *
 * A host that runs the child by calling `agent.generate(...)`/`stream(...)` can
 * reuse these instead of hand-rolling the delegation prompt and the result
 * mapping. They are NOT wired into the tool — call them from your `runSubAgent`
 * (the n8n CLI runner does).
 */

/** Render the default delegation prompt from a request's goal / context / expectedOutput. */
export function renderDelegateSubAgentPrompt(request: {
	goal: string;
	context?: string;
	expectedOutput?: string;
}): string {
	const sections = [
		'You are a focused subagent working on a specific delegated task.',
		`YOUR TASK:\n${request.goal}`,
	];

	if (request.context) {
		sections.push(`CONTEXT:\n${request.context}`);
	}

	if (request.expectedOutput) {
		sections.push(`EXPECTED OUTPUT:\n${request.expectedOutput}`);
	}

	sections.push(
		[
			'Complete this task using the tools available to you. When finished, provide a clear, concise summary of:',
			'- What you did',
			'- What you found or accomplished',
			'- Important outputs, decisions, or evidence',
			'- Any issues, assumptions, or limitations',
			'',
			'If the information above is insufficient, do your best with explicitly stated assumptions and note what was missing, rather than stopping to ask.',
			'',
			'Be thorough but concise -- your response is returned to the parent agent as a summary.',
		].join('\n'),
	);

	return sections.join('\n\n');
}

function resolveDelegateSubAgentStatus(
	result: GenerateResult,
): DelegateSubAgentToolOutput['status'] {
	if (result.finishReason === 'error' || result.error !== undefined) {
		return 'failed';
	}
	if (result.pendingSuspend !== undefined && result.pendingSuspend.length > 0) {
		return 'suspended';
	}
	return 'completed';
}

/** Failed delegate output when a child run suspends for user input (not yet resumable). */
export function failedDelegatedChildSuspendOutput(
	taskPath: SubAgentTaskPath,
	model?: string,
): DelegateSubAgentToolOutput {
	return {
		status: 'failed',
		taskPath,
		answer: '',
		error: DELEGATED_CHILD_SUSPEND_UNSUPPORTED_MESSAGE,
		...(model !== undefined ? { model } : {}),
	};
}

/** Map an agent {@link GenerateResult} into the delegate tool's output shape. */
export function generateResultToDelegateSubAgentOutput(
	taskPath: SubAgentTaskPath,
	result: GenerateResult,
	threadId?: string,
): DelegateSubAgentToolOutput {
	const status = resolveDelegateSubAgentStatus(result);
	return {
		status,
		taskPath,
		runId: result.runId,
		...(threadId !== undefined ? { threadId } : {}),
		...(result.model !== undefined ? { model: result.model } : {}),
		answer: lastText(result.messages),
		...(result.structuredOutput !== undefined ? { structuredOutput: result.structuredOutput } : {}),
		...(result.usage !== undefined
			? {
					usage: {
						promptTokens: result.usage.promptTokens,
						completionTokens: result.usage.completionTokens,
						totalTokens: result.usage.totalTokens,
						...(result.usage.cost !== undefined ? { cost: result.usage.cost } : {}),
					},
				}
			: {}),
		...(result.finishReason !== undefined ? { finishReason: result.finishReason } : {}),
		...(result.error !== undefined ? { error: stringifyUnknown(result.error) } : {}),
		...(status === 'suspended' && result.pendingSuspend !== undefined
			? { pendingSuspend: result.pendingSuspend }
			: {}),
	};
}

/** Last non-empty assistant text across the run's messages. */
function lastText(messages: AgentMessage[]): string {
	const llmMessages = filterLlmMessages(messages);
	for (let i = llmMessages.length - 1; i >= 0; i--) {
		const message = llmMessages[i];
		if (!message) continue;

		const text = message.content
			.filter((content) => content.type === 'text')
			.map((content) => content.text)
			.join('\n')
			.trim();
		if (text) return text;
	}

	return '';
}
