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
import type { FinishReason, GenerateResult, TokenUsage } from '../types/sdk/agent';
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
	context: z
		.string()
		.optional()
		.describe(
			'All details the child needs, since it sees nothing else: constraints, paths, data, prior decisions, acceptance criteria, and what you have already tried or ruled out.',
		),
	expectedOutput: z.string().optional().describe('The expected shape or contents of the answer.'),
});

// Documents the tool result shape for typing/introspection. Note: the handler's
// returned object (not this schema) is what is actually sent back to the model,
// so this is kept in sync with DelegateSubAgentToolOutput by hand.
const delegateSubAgentOutputSchema = z.object({
	status: z.enum(['completed', 'failed']),
	taskPath: z.string().optional(),
	runId: z.string().optional(),
	threadId: z.string().optional(),
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
 * Limits the delegate tool enforces structurally for a delegation: fan-out and
 * the on/off switch (see {@link SubAgentTaskPathPolicy}).
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
	/** Hierarchical id assigned to this delegation (e.g. `/root/research_api`). */
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
	/**
	 * The child run's memory thread id (`persistence.threadId`), when the
	 * executor used one. Surfaced so a consumer can correlate the child run or
	 * re-supply it to continue the same thread on a later delegation.
	 */
	threadId?: string;
	/** The child's answer — the main payload the parent acts on. */
	answer: string;
	structuredOutput?: unknown;
	/** Child token usage + cost, surfaced so the parent can account for it. */
	usage?: Pick<TokenUsage, 'promptTokens' | 'completionTokens' | 'totalTokens' | 'cost'>;
	finishReason?: FinishReason;
	/** Present when status is 'failed'. */
	error?: string;
}

/**
 * Options for the `delegate_subagent` tool.
 *
 * You supply `runSubAgent` — the host callback that actually runs the child for
 * a delegation and returns its result. Everything else (input/output schema,
 * system prompt, task-path bookkeeping, policy enforcement, and the
 * `subagent-started` / `-completed` lifecycle events) is owned by
 * the tool.
 */
export interface CreateDelegateSubAgentToolOptions {
	/**
	 * Sub-agents the model may choose between. Listed in the system prompt; the
	 * model selects one by passing its id as `subAgentId`.
	 */
	availableSubAgents?: Array<{ id: string; name: string; description?: string }>;
	/** Fan-out limits and spawn switch enforced before each delegation. */
	policy?: DelegateSubAgentPolicy;
	/** Run the child for this delegation and return its result. */
	runSubAgent: (request: DelegateSubAgentRequest) => Promise<DelegateSubAgentToolOutput>;
}

/**
 * Build the generic `delegate_subagent` tool — lets a parent agent hand a
 * bounded subtask to a child agent and get back a concise result.
 *
 * The tool owns the cross-cutting concerns: the model-facing input/output
 * schema, the description + system instruction that teach the LLM when/how to
 * delegate, task-path bookkeeping, policy enforcement (fan-out /
 * canSpawnSubAgents), and the `subagent-started` / `-completed`
 * lifecycle events. You only supply HOW to run the child, via `runSubAgent`.
 *
 * @example Host-controlled execution (what the n8n CLI does):
 *   agent.tool(createDelegateSubAgentTool({
 *     runSubAgent: (request) => runner.run(request),
 *     availableSubAgents,
 *     policy: { maxChildren: 5 },
 *   }));
 */
export function createDelegateSubAgentTool(options: CreateDelegateSubAgentToolOptions) {
	// Per-parent fan-out counter keyed by run/thread/task — drives maxChildren.
	const childCounts = new Map<string, number>();

	return new Tool(DELEGATE_SUB_AGENT_TOOL_NAME)
		.description(
			'Delegate a bounded, self-contained subtask to a focused child agent that runs in an isolated context (it sees only what you pass in) and returns a concise result. ' +
				'Reach for it when a subtask needs substantial search/research/review/reasoning whose intermediate output would clutter your context, or clearly benefits from a fresh perspective. ' +
				'Do not use it for trivial work, for steps that depend on this conversation you cannot restate, or to forward the user request wholesale instead of decomposing it.',
		)
		.systemInstruction(
			[
				'delegate_subagent runs a focused child agent in a fresh, isolated context and returns only its final answer. The child cannot see this conversation, your tools, or your memory, so everything it needs must be in the call.',
				'Delegate only when all of these hold: the work is a concrete, self-contained subtask; it can be fully specified without unstated context from this conversation; and it is heavy enough (substantial search/research/review/reasoning) that doing it inline would clutter your context, or a fresh perspective clearly helps.',
				'Do not delegate when: the task is trivial or is one or two tool calls you can make directly; it is the core reasoning you are responsible for (never delegate the understanding); it depends on context you cannot restate; or you would just forward the user request without decomposing it. Wanting more thoroughness or research is not by itself a reason to delegate.',
				'Write the handoff for a smart colleague who just walked in and has seen none of this conversation: put the concrete outcome in goal; put every detail the child needs in context (constraints, paths, data, prior decisions, acceptance criteria, what you have already tried or ruled out); state exactly what you need back, and how concise, in expectedOutput; and give it a short descriptive taskName.',
				...formatAvailableSubAgents(options.availableSubAgents),
				'When the child returns: inspect the answer before relying on it, do not blindly trust self-reported success, synthesize it into your own response instead of copying it verbatim, and if it is incomplete or failed either retry with a sharper handoff or do the task yourself.',
			].join('\n'),
		)
		.input(delegateSubAgentInputSchema)
		.output(delegateSubAgentOutputSchema)
		.handler(async (input, ctx) => await handleDelegateSubAgent(input, ctx, options, childCounts))
		.build();
}

function formatAvailableSubAgents(
	availableSubAgents: CreateDelegateSubAgentToolOptions['availableSubAgents'],
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
 * Tool handler: enforce policy (fan-out), assign the child's task path,
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
	childCounts: Map<string, number>,
): Promise<DelegateSubAgentToolOutput> {
	let taskPath: SubAgentTaskPath | undefined;
	let request: DelegateSubAgentRequest | undefined;
	let startedAt: number | undefined;
	try {
		assertSubAgentPolicyAllowsChild(options.policy);
		const childCountKey = getChildCountKey(ctx);
		const childCount = childCounts.get(childCountKey) ?? 0;
		assertSubAgentPolicyAllowsChildCount(childCount, options.policy);

		taskPath = createChildSubAgentTaskPath(input.taskName, childCount);
		childCounts.set(childCountKey, childCount + 1);

		request = {
			...input,
			taskPath,
			childCount,
			...(ctx.runId !== undefined ? { parentRunId: ctx.runId } : {}),
			...(ctx.persistence?.threadId !== undefined
				? { parentThreadId: ctx.persistence.threadId }
				: {}),
			...(ctx.persistence?.resourceId !== undefined
				? { parentResourceId: ctx.persistence.resourceId }
				: {}),
			...(ctx.abortSignal !== undefined ? { parentAbortSignal: ctx.abortSignal } : {}),
			...(ctx.toolCallId !== undefined ? { parentToolCallId: ctx.toolCallId } : {}),
			...(options.policy !== undefined ? { policy: options.policy } : {}),
		};

		startedAt = Date.now();
		emitSubAgentStarted(ctx, request, startedAt);
		const output = await options.runSubAgent(request);
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

function getChildCountKey(ctx: ToolContext): string {
	return ctx.runId ?? ctx.persistence?.threadId ?? 'adhoc';
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
		'You are running as a delegated sub-agent on a single, self-contained task. You have no access to the parent conversation beyond what is written below, and you cannot ask follow-up questions during this run. Complete the task independently and reply with a concise, self-contained answer.',
		`Goal:\n${request.goal}`,
	];

	if (request.context) {
		sections.push(`Context:\n${request.context}`);
	}

	if (request.expectedOutput) {
		sections.push(`Expected output:\n${request.expectedOutput}`);
	}

	sections.push(
		'If the information above is insufficient, do your best with explicitly stated assumptions and note what was missing, rather than stopping to ask.',
	);

	return sections.join('\n\n');
}

/** Map an agent {@link GenerateResult} into the delegate tool's output shape. */
export function generateResultToDelegateSubAgentOutput(
	taskPath: SubAgentTaskPath,
	result: GenerateResult,
	threadId?: string,
): DelegateSubAgentToolOutput {
	return {
		status: result.finishReason === 'error' || result.error !== undefined ? 'failed' : 'completed',
		taskPath,
		runId: result.runId,
		...(threadId !== undefined ? { threadId } : {}),
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
