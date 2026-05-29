import { z } from 'zod';

import {
	assertSubAgentPolicyAllowsChild,
	assertSubAgentPolicyAllowsChildCount,
	createChildSubAgentTaskPath,
	type SubAgentTaskPath,
	type SubAgentTaskPathPolicy,
} from './sub-agent-task-path';
import { filterLlmMessages } from '../sdk/message';
import { Tool } from '../sdk/tool';
import { AgentEvent } from '../types/runtime/event';
import type {
	BuiltAgent,
	ExecutionOptions,
	FinishReason,
	GenerateResult,
	RunOptions,
	TokenUsage,
} from '../types/sdk/agent';
import type { AgentMessage } from '../types/sdk/message';
import type { ToolContext } from '../types/sdk/tool';

export const DELEGATE_SUB_AGENT_TOOL_NAME = 'delegate_subagent';

// Model-facing input: the arguments the LLM fills in when it calls the tool.
// The `.describe(...)` text is what the model reads, so keep it task-oriented.
const delegateSubAgentInputSchema = z.object({
	subAgentId: z
		.string()
		.min(1)
		.optional()
		.describe('Configured sub-agent ID to run. Use when multiple sub-agents are available.'),
	taskName: z
		.string()
		.min(1)
		.describe('Short human-readable name for this delegated task, e.g. "research_api".'),
	goal: z.string().min(1).describe('The concrete goal the sub-agent should accomplish.'),
	context: z.string().optional().describe('Relevant context the sub-agent needs for the task.'),
	expectedOutput: z.string().optional().describe('The expected shape or contents of the answer.'),
});

// Documents the tool result shape for typing/introspection. Note: the handler's
// returned object (not this schema) is what is actually sent back to the model,
// so this is kept in sync with DelegateSubAgentToolOutput by hand.
const delegateSubAgentOutputSchema = z.object({
	status: z.enum(['completed', 'failed']),
	taskPath: z.string().optional(),
	runId: z.string().optional(),
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
});

/** The arguments the LLM provides when calling delegate_subagent. */
export type DelegateSubAgentInput = z.infer<typeof delegateSubAgentInputSchema>;

/**
 * Limits enforced for a delegation. Extends the task-path policy (max depth /
 * max children / canSpawnSubAgents) with per-child run constraints.
 */
export interface DelegateSubAgentPolicy extends SubAgentTaskPathPolicy {
	/** Abort the child run after this many milliseconds. */
	timeoutMs?: number;
	/** Restrict the child to this allow-list of tool names. */
	allowedToolNames?: string[];
}

/**
 * What a host's `runSubAgent` / `createAgent` callback receives: the model's
 * {@link DelegateSubAgentInput} plus runtime-derived context the host needs to
 * run and link the child. All `parent*` fields come from the parent's tool
 * execution context and are used for tracing/linkage, not required to run.
 */
export interface DelegateSubAgentRequest extends DelegateSubAgentInput {
	/** Hierarchical id assigned to this delegation (e.g. `/root/research_api`). */
	taskPath: SubAgentTaskPath;
	/** Parent run id (`ctx.runId`), e.g. for memory scoping / correlation. */
	parentRunId?: string;
	/** Parent's persisted memory thread id (`ctx.persistence.threadId`). */
	parentThreadId?: string;
	/** Parent's tool-call id that triggered this delegation. */
	parentToolCallId?: string;
	/** Parent's own task path (this child's path is derived from it). */
	parentTaskPath?: SubAgentTaskPath;
	/** How many siblings the parent already spawned before this one (0-based). */
	childCount: number;
	/** Effective policy for this delegation. */
	policy?: DelegateSubAgentPolicy;
}

/** The result a delegation returns to the parent model and to lifecycle events. */
export interface DelegateSubAgentToolOutput {
	status: 'completed' | 'failed';
	/** Echoed back so consumers can correlate the result with the delegation. */
	taskPath?: SubAgentTaskPath;
	/** The child run's id, when the executor produced one. */
	runId?: string;
	/** The child's answer — the main payload the parent acts on. */
	answer: string;
	structuredOutput?: unknown;
	/** Child token usage + cost, surfaced so the parent can account for it. */
	usage?: Pick<TokenUsage, 'promptTokens' | 'completionTokens' | 'totalTokens' | 'cost'>;
	finishReason?: FinishReason;
	/** Present when status is 'failed'. */
	error?: string;
}

type DelegateSubAgentGenerateOptions = RunOptions & ExecutionOptions;

/** Options shared by all three execution modes. */
interface CreateDelegateSubAgentToolBaseOptions {
	/**
	 * Sub-agents the model may choose between. Listed in the system prompt; the
	 * model selects one by passing its id as `subAgentId`.
	 */
	availableSubAgents?: Array<{ id: string; name: string; description?: string }>;
	/**
	 * This (parent) agent's own task path; child paths are derived from it. Omit
	 * for a top-level agent — children then hang off `/root`.
	 */
	parentTaskPath?: SubAgentTaskPath;
	/** Depth / fan-out / tool limits enforced before each delegation. */
	policy?: DelegateSubAgentPolicy;
	/**
	 * Override the run options passed to the child's `generate(...)` — static or
	 * computed per request. Only used by the `agent` / `createAgent` modes (a
	 * `runSubAgent` override controls its own execution).
	 */
	generateOptions?:
		| DelegateSubAgentGenerateOptions
		| ((
				request: DelegateSubAgentRequest,
		  ) => DelegateSubAgentGenerateOptions | Promise<DelegateSubAgentGenerateOptions>);
	/**
	 * Override how a request becomes the child's prompt (defaults to
	 * {@link renderDelegateSubAgentPrompt}). Only used by the `agent` /
	 * `createAgent` modes.
	 */
	renderPrompt?: (request: DelegateSubAgentRequest) => string;
}

/**
 * Base options PLUS exactly one execution mode — pick the one matching how much
 * control you need over running the child:
 *
 *  - `agent`: a single, prebuilt child agent reused for every delegation.
 *    Simplest; every delegation runs the same fixed agent.
 *  - `createAgent(request)`: build a fresh child per delegation from the request
 *    (e.g. select by `request.subAgentId`, choose a model, apply
 *    `request.policy.allowedToolNames`). The tool still renders the prompt, calls
 *    `agent.generate(...)`, and maps the result for you.
 *  - `runSubAgent(request)`: full override — you run the child however you want
 *    and return the output. Use when execution needs host concerns the SDK can't
 *    know about (credential/source resolution, memory, persistence). This is what
 *    the n8n CLI uses.
 */
export type CreateDelegateSubAgentToolOptions = CreateDelegateSubAgentToolBaseOptions &
	(
		| {
				agent: BuiltAgent;
				createAgent?: never;
				runSubAgent?: never;
		  }
		| {
				createAgent: (request: DelegateSubAgentRequest) => BuiltAgent | Promise<BuiltAgent>;
				agent?: never;
				runSubAgent?: never;
		  }
		| {
				runSubAgent(request: DelegateSubAgentRequest): Promise<DelegateSubAgentToolOutput>;
				agent?: never;
				createAgent?: never;
		  }
	);

/**
 * Build the generic `delegate_subagent` tool — lets a parent agent hand a
 * bounded subtask to a child agent and get back a concise result.
 *
 * The tool owns the cross-cutting concerns: the model-facing input/output
 * schema, the description + system instruction that teach the LLM when/how to
 * delegate, task-path bookkeeping, policy enforcement (depth / fan-out /
 * canSpawnSubAgents), and the `subagent-started` / `-progress` / `-completed`
 * lifecycle events. You only supply HOW to run the child, via one of the three
 * modes on {@link CreateDelegateSubAgentToolOptions}.
 *
 * @example Fixed child agent:
 *   agent.tool(createDelegateSubAgentTool({ agent: researcher }));
 *
 * @example Host-controlled execution (what the n8n CLI does):
 *   agent.tool(createDelegateSubAgentTool({
 *     runSubAgent: (request) => runner.run(request),
 *     availableSubAgents,
 *     policy: { maxDepth: 2, maxChildren: 5 },
 *   }));
 */
export function createDelegateSubAgentTool(options: CreateDelegateSubAgentToolOptions) {
	// Per-parent fan-out counter keyed by run/thread/task — drives maxChildren.
	const childCounts = new Map<string, number>();

	return new Tool(DELEGATE_SUB_AGENT_TOOL_NAME)
		.description(
			'Run a focused child agent on a bounded, self-contained subtask and return its result. ' +
				'Use for independent research, review, analysis, or exploration that would clutter the parent context or benefit from a fresh perspective. ' +
				'Do not use for trivial work or to pass through the entire user request unchanged.',
		)
		.systemInstruction(
			[
				'You have access to delegate_subagent, which runs a focused child agent in a fresh context and returns a concise result.',
				'Use delegate_subagent when the user request contains a bounded subtask that can be handled independently, the subtask needs substantial exploration/review/search/reasoning that would clutter your context, or a fresh perspective would help.',
				'Do not use delegate_subagent when the task is trivial, can be completed with one or two direct tool calls, depends on unstated conversation context you cannot summarize clearly, or would simply pass the entire user request to another agent without decomposition.',
				'Before delegating, make a brief plan for yourself: identify the concrete subtask, decide whether delegation is useful, and provide a self-contained handoff if you delegate.',
				...formatAvailableSubAgents(options.availableSubAgents),
				'When calling delegate_subagent, use taskName for a short descriptive name, goal for the concrete outcome, context for all relevant details including constraints/paths/data/prior decisions/acceptance criteria, and expectedOutput for what you need back.',
				'After the subagent returns, inspect the result before using it, synthesize it into your response instead of blindly copying it, and retry with better context or handle the task yourself if the result is incomplete or failed.',
			].join('\n'),
		)
		.input(delegateSubAgentInputSchema)
		.output(delegateSubAgentOutputSchema)
		.handler(async (input, ctx) => await handleDelegateSubAgent(input, ctx, options, childCounts))
		.build();
}

function formatAvailableSubAgents(
	availableSubAgents: CreateDelegateSubAgentToolBaseOptions['availableSubAgents'],
): string[] {
	if (!availableSubAgents?.length) return [];

	return [
		'Configured subagents are available. Pick the most relevant one and pass its id as subAgentId:',
		...availableSubAgents.map((subAgent) => {
			const description = subAgent.description ? ` - ${subAgent.description}` : '';
			return `- ${subAgent.id}: ${subAgent.name}${description}`;
		}),
	];
}

/**
 * Tool handler: enforce policy (depth + fan-out), assign the child's task path,
 * assemble the {@link DelegateSubAgentRequest} from the model input plus the
 * parent tool context, then run the child via {@link runSubAgent} while emitting
 * started/progress/completed lifecycle events. Any error is converted into a
 * `status: 'failed'` output (never thrown) so one failed delegation can't abort
 * the parent's run.
 */
async function handleDelegateSubAgent(
	input: DelegateSubAgentInput,
	ctx: ToolContext,
	options: CreateDelegateSubAgentToolOptions,
	childCounts: Map<string, number>,
): Promise<DelegateSubAgentToolOutput> {
	let taskPath: SubAgentTaskPath | undefined;
	let request: DelegateSubAgentRequest | undefined;
	let startedAt: number | undefined;
	try {
		const parentTaskPath = options.parentTaskPath;
		assertSubAgentPolicyAllowsChild(parentTaskPath, options.policy);
		const childCountKey = getChildCountKey(ctx, parentTaskPath);
		const childCount = childCounts.get(childCountKey) ?? 0;
		assertSubAgentPolicyAllowsChildCount(childCount, options.policy);

		taskPath = createChildSubAgentTaskPath(parentTaskPath, input.taskName);
		childCounts.set(childCountKey, childCount + 1);

		request = {
			...input,
			taskPath,
			childCount,
			...(ctx.runId !== undefined ? { parentRunId: ctx.runId } : {}),
			...(ctx.persistence?.threadId !== undefined
				? { parentThreadId: ctx.persistence.threadId }
				: {}),
			...(ctx.toolCallId !== undefined ? { parentToolCallId: ctx.toolCallId } : {}),
			...(parentTaskPath !== undefined ? { parentTaskPath } : {}),
			...(options.policy !== undefined ? { policy: options.policy } : {}),
		};

		startedAt = Date.now();
		emitSubAgentStarted(ctx, request, startedAt);
		emitSubAgentProgress(ctx, request);
		const output = await runSubAgent(request, options);
		emitSubAgentCompleted(ctx, request, output, startedAt);
		return output;
	} catch (error) {
		if (request !== undefined && startedAt !== undefined) {
			emitSubAgentCompleted(
				ctx,
				request,
				{
					status: 'failed',
					...(taskPath !== undefined ? { taskPath } : {}),
					answer: '',
					error: stringifyUnknown(error),
				},
				startedAt,
			);
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

function emitSubAgentProgress(ctx: ToolContext, request: DelegateSubAgentRequest): void {
	ctx.emitEvent?.({
		type: AgentEvent.SubAgentProgress,
		...subAgentLifecycleBase(request),
		stage: 'running',
		timestamp: Date.now(),
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
		...(output.usage !== undefined ? { usage: output.usage } : {}),
		...(output.finishReason !== undefined ? { finishReason: output.finishReason } : {}),
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

/**
 * Dispatch to the configured execution mode: use the host `runSubAgent` override
 * if present; otherwise run the SDK default — resolve the child (`agent` or
 * `createAgent(request)`), render its prompt, call `generate(...)`, and map the
 * result to {@link DelegateSubAgentToolOutput}.
 */
async function runSubAgent(
	request: DelegateSubAgentRequest,
	options: CreateDelegateSubAgentToolOptions,
): Promise<DelegateSubAgentToolOutput> {
	if ('runSubAgent' in options && options.runSubAgent !== undefined) {
		return await options.runSubAgent(request);
	}

	const agent =
		'agent' in options && options.agent !== undefined
			? options.agent
			: await options.createAgent(request);
	const prompt = options.renderPrompt?.(request) ?? renderDelegateSubAgentPrompt(request);
	const generateOptions = await resolveGenerateOptions(request, options);
	const result = await agent.generate(prompt, generateOptions);

	return generateResultToDelegateSubAgentOutput(request.taskPath, result);
}

async function resolveGenerateOptions(
	request: DelegateSubAgentRequest,
	options: CreateDelegateSubAgentToolOptions,
): Promise<DelegateSubAgentGenerateOptions | undefined> {
	if (options.generateOptions === undefined) return undefined;

	return typeof options.generateOptions === 'function'
		? await options.generateOptions(request)
		: options.generateOptions;
}

export function renderDelegateSubAgentPrompt(request: DelegateSubAgentRequest): string {
	const sections = [`Goal:\n${request.goal}`];

	if (request.context) {
		sections.push(`Context:\n${request.context}`);
	}

	if (request.expectedOutput) {
		sections.push(`Expected output:\n${request.expectedOutput}`);
	}

	return sections.join('\n\n');
}

export function generateResultToDelegateSubAgentOutput(
	taskPath: SubAgentTaskPath,
	result: GenerateResult,
): DelegateSubAgentToolOutput {
	return {
		status: result.finishReason === 'error' || result.error !== undefined ? 'failed' : 'completed',
		taskPath,
		runId: result.runId,
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
	};
}

function getChildCountKey(ctx: ToolContext, parentTaskPath: SubAgentTaskPath | undefined): string {
	return ctx.runId ?? ctx.persistence?.threadId ?? parentTaskPath ?? 'adhoc';
}

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
