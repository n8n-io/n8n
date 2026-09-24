import { isRecord } from '@n8n/utils/is-record';
import type { JSONSchema7 } from 'json-schema';
import type { z } from 'zod';

import { withSdkOwnedBuiltInMetadata } from './sdk-owned-tool';
import {
	assertSubAgentTaskPath,
	createChildSubAgentTaskPath,
	DEFAULT_SUB_AGENT_MAX_CHILDREN,
	type SubAgentTaskPath,
} from './sub-agent-task-path';
import { isAbortError } from '../../sdk/abort';
import { filterLlmMessages } from '../../sdk/message';
import { Tool } from '../../sdk/tool';
import {
	DELEGATE_SUB_AGENT_TOOL_NAME,
	DELEGATED_CHILD_SUSPEND_UNSUPPORTED_MESSAGE,
	INLINE_DELEGATE_SUB_AGENT_TOOL_METADATA_KEY,
	delegateSubAgentInputSchema,
	delegateSubAgentOutputSchema,
	delegateSubAgentSuspendSchema,
	delegateSubAgentResumeSchema,
	parseDelegateSubAgentContinuation,
	type CreateDelegateSubAgentToolOptions,
	type DelegateSubAgentCheckpointTarget,
	type DelegateSubAgentContinuation,
	type DelegateSubAgentInput,
	type DelegateSubAgentPolicy,
	type DelegateSubAgentRequest,
	type DelegateSubAgentResumeRunner,
	type DelegateSubAgentRunnerHelpers,
	type DelegateSubAgentToolMetadata,
	type DelegateSubAgentToolOutput,
} from '../../types/runtime/delegation';
import { AgentEvent } from '../../types/runtime/event';
import type { ForwardedChildChunk } from '../../types/runtime/event';
import type { GenerateResult, StreamChunk, TokenUsage } from '../../types/sdk/agent';
import type { AgentMessage } from '../../types/sdk/message';
import type {
	BuiltTool,
	InterruptibleToolContext,
	ToolCancellationContext,
	ToolContext,
} from '../../types/sdk/tool';
import type { JSONValue } from '../../types/utils/json';
import { withoutMessageCount } from '../loop/execution-counter';

export {
	DELEGATE_SUB_AGENT_TOOL_NAME,
	INLINE_SUB_AGENT_ID,
	DELEGATED_CHILD_SUSPEND_UNSUPPORTED_MESSAGE,
	INLINE_DELEGATE_SUB_AGENT_TOOL_METADATA_KEY,
	SUB_AGENT_TASK_DIFFICULTIES,
	parseDelegateSubAgentContinuation,
} from '../../types/runtime/delegation';
export type {
	SubAgentTaskDifficulty,
	DelegateSubAgentContinuation,
	DelegateSubAgentInput,
	DelegateSubAgentPolicy,
	DelegateSubAgentRequest,
	DelegateSubAgentToolOutput,
	DelegateSubAgentRunnerHelpers,
	InlineSubAgentProviderToolsResolver,
	DelegateSubAgentRunner,
	DelegateSubAgentResumeRequest,
	DelegateSubAgentResumeRunner,
	DelegateSubAgentCancelRequest,
	DelegateSubAgentCancelRunner,
	CreateDelegateSubAgentToolOptions,
	DelegateSubAgentToolMetadata,
} from '../../types/runtime/delegation';

/** Cap on forwarded text+reasoning characters per delegation. */
const SUB_AGENT_FORWARD_CHAR_BUDGET = 20_000;

const FORWARDED_CHILD_CHUNK_TYPES = new Set<ForwardedChildChunk['type']>([
	'text-delta',
	'reasoning-start',
	'reasoning-delta',
	'reasoning-end',
	'tool-input-start',
	'tool-execution-start',
	'tool-execution-end',
]);

function isForwardedChildChunk(chunk: StreamChunk): chunk is ForwardedChildChunk {
	return FORWARDED_CHILD_CHUNK_TYPES.has(chunk.type as ForwardedChildChunk['type']);
}

function createEmitChunkHelper(
	ctx: ToolContext,
	request: DelegateSubAgentRequest,
): (chunk: StreamChunk) => void {
	let forwardedChars = 0;
	return (chunk) => {
		if (request.parentToolCallId === undefined) return;
		if (!isForwardedChildChunk(chunk)) return;

		let forwarded: ForwardedChildChunk = chunk;
		if (chunk.type === 'text-delta' || chunk.type === 'reasoning-delta') {
			// Trim rather than pass through whole: a single provider delta can be
			// arbitrarily large, and forwarding it intact would blow the budget.
			const remaining = SUB_AGENT_FORWARD_CHAR_BUDGET - forwardedChars;
			if (remaining <= 0) return;
			const delta = chunk.delta.slice(0, remaining);
			forwardedChars += delta.length;
			forwarded = { ...chunk, delta };
		}

		ctx.emitEvent?.({
			type: AgentEvent.SubAgentChunk,
			...subAgentLifecycleBase(request),
			chunk: forwarded,
		});
	};
}

function resolveDelegateSubAgentPolicy(
	policy: DelegateSubAgentPolicy | undefined,
	toolName: string,
): DelegateSubAgentPolicy {
	const resolvedPolicy = {
		...policy,
		maxChildren: policy?.maxChildren ?? DEFAULT_SUB_AGENT_MAX_CHILDREN,
	};

	if (
		!Number.isFinite(resolvedPolicy.maxChildren) ||
		!Number.isInteger(resolvedPolicy.maxChildren)
	) {
		throw new Error(`${toolName} policy.maxChildren must be a finite positive integer`);
	}

	if (resolvedPolicy.maxChildren < 1) {
		throw new Error(`${toolName} policy.maxChildren must be at least 1`);
	}

	return resolvedPolicy;
}

const DELEGATE_SUB_AGENT_TOOL_NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/;

function resolveDelegateSubAgentToolName(name: string | undefined): string {
	if (name === undefined) return DELEGATE_SUB_AGENT_TOOL_NAME;
	if (!DELEGATE_SUB_AGENT_TOOL_NAME_PATTERN.test(name)) {
		throw new Error(
			`Invalid delegate sub-agent tool name "${name}": must start with a letter and contain only letters, digits, underscores, and hyphens (max 64 characters)`,
		);
	}
	return name;
}

const DEFAULT_DELEGATE_SUB_AGENT_DESCRIPTION =
	'Delegate a bounded, self-contained subtask to a focused child agent that runs in an isolated context and returns only a concise final result. ' +
	'Use it for reasoning-heavy subtasks, context-flooding investigations, or independent workstreams inside a larger deliverable. ' +
	'Do not use it for trivial work, single tool calls, mechanical steps, tasks that need hidden conversation context, or pass-through delegation of the entire user request.';

function resolveDelegateSubAgentDescription(options: CreateDelegateSubAgentToolOptions): string {
	const { description } = options;
	if (typeof description === 'string' && description.trim().length > 0) return description;

	return DEFAULT_DELEGATE_SUB_AGENT_DESCRIPTION;
}

function resolveDelegateSubAgentSystemInstruction(
	options: CreateDelegateSubAgentToolOptions,
	toolName: string,
	inlineProviderToolInstruction: string,
): string {
	const { systemInstruction } = options;
	if (typeof systemInstruction === 'string' && systemInstruction.trim().length > 0) {
		return systemInstruction;
	}

	return [
		`${toolName} runs a focused child agent in a fresh, isolated context and returns only its final answer. Always set subAgentId. Use subAgentId: "inline" to run a one-off inline child that inherits your local and deferred tools after safety filtering. ${inlineProviderToolInstruction} The child cannot see this conversation or your memory, so everything it needs must be in the call.`,
		'Use a configured subagent ID only when one is listed and its name and useWhen guidance fit the subtask better than a generic inline child.',
		...formatAvailableSubAgents(options.availableSubAgents),
		...formatDelegationPolicyInstructions(options.policy, toolName),
		`WHEN TO USE ${toolName}:\n- The request decomposes into 2+ independent workstreams that can be handled separately.\n- A workstream needs substantial research, review, comparison, or analysis.\n- Doing the work inline would flood your context with intermediate findings.\n- A fresh isolated perspective would materially improve a bounded subtask.`,
		`WHEN NOT TO USE ${toolName}:\n- Single-step mechanical work: do it directly.\n- Trivial tasks or one/two tool calls: do them yourself.\n- Tasks that need user interaction or hidden conversation context.\n- Your core synthesis, final judgment, or recommendation.\n- The entire user request as one delegated task; that is pass-through with no value added.`,
		`HOW TO DELEGATE:\n- Delegate bounded workstreams, not the final answer.\n- Pass all required context, constraints, language/tone, and expected output.\n- Set difficulty (low, medium, or high) when you can estimate task complexity; omit it to keep the default inline model.\n- If multiple independent workstreams exist, delegate them separately.\n- Inline children inherit your local and deferred tools after safety filtering. ${inlineProviderToolInstruction}\n- Inspect results and synthesize the final response yourself.\n- Verify side-effect claims before presenting them as done.`,
	].join('\n');
}

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
export function createDelegateSubAgentTool(options: CreateDelegateSubAgentToolOptions = {}) {
	// Each parent has its own index so child task paths stay stable.
	const childPathIndexes = new Map<string, number>();
	const toolName = resolveDelegateSubAgentToolName(options.name);
	const resolvedOptions = resolveDelegateSubAgentOptions(options, toolName);
	const tool = buildDelegateSubAgentTool(toolName, resolvedOptions, childPathIndexes);
	return withSdkOwnedBuiltInMetadata({
		...tool,
		...createDelegateCancellationHandler(resolvedOptions, childPathIndexes),
		metadata: {
			...tool.metadata,
			[INLINE_DELEGATE_SUB_AGENT_TOOL_METADATA_KEY]: buildDelegateToolMetadata(resolvedOptions),
		},
	});
}

function resolveDelegateSubAgentOptions(
	options: CreateDelegateSubAgentToolOptions,
	toolName: string,
): CreateDelegateSubAgentToolOptions {
	const resolvedOptions: CreateDelegateSubAgentToolOptions = {
		...options,
		policy: resolveDelegateSubAgentPolicy(options.policy, toolName),
	};
	if (
		(resolvedOptions.resumeSubAgent === undefined) !==
		(resolvedOptions.cancelSubAgent === undefined)
	) {
		throw new Error(
			`${toolName} requires resumeSubAgent and cancelSubAgent to be configured together`,
		);
	}
	return resolvedOptions;
}

function buildDelegateSubAgentTool(
	toolName: string,
	resolvedOptions: CreateDelegateSubAgentToolOptions,
	childPathIndexes: Map<string, number>,
) {
	const inlineProviderToolInstruction = resolvedOptions.resolveInlineSubAgentProviderTools
		? "Provider-defined tools are loaded for the inline child's selected model provider."
		: 'Inline children do not inherit provider-defined tools.';

	const toolBuilder = new Tool(toolName)
		.description(resolveDelegateSubAgentDescription(resolvedOptions))
		.systemInstruction(
			resolveDelegateSubAgentSystemInstruction(
				resolvedOptions,
				toolName,
				inlineProviderToolInstruction,
			),
		)
		.input(delegateSubAgentInputSchema)
		.output(delegateSubAgentOutputSchema);
	const handler = async (
		input: DelegateSubAgentInput,
		ctx: ToolContext | InterruptibleToolContext,
	) => await handleDelegateSubAgent(input, ctx, resolvedOptions, childPathIndexes);
	const toModelOutput = (output: z.infer<typeof delegateSubAgentOutputSchema>) =>
		resolvedOptions.toModelOutput ? resolvedOptions.toModelOutput(output) : output;
	if (resolvedOptions.resumeSubAgent) {
		return toolBuilder
			.suspend(delegateSubAgentSuspendSchema)
			.resume(delegateSubAgentResumeSchema)
			.handler(handler)
			.toModelOutput(toModelOutput)
			.build();
	}
	return toolBuilder.handler(handler).toModelOutput(toModelOutput).build();
}

function createDelegateCancellationHandler(
	options: CreateDelegateSubAgentToolOptions,
	childPathIndexes: Map<string, number>,
): Pick<BuiltTool, 'onCancellation'> {
	if (options.cancelSubAgent === undefined) return {};
	return {
		onCancellation: async (rawInput: unknown, ctx: ToolCancellationContext) => {
			const parsedInput = delegateSubAgentInputSchema.safeParse(rawInput);
			if (!parsedInput.success) {
				throw new Error('Delegated child input is missing or invalid');
			}
			await cancelDelegatedSubAgent(parsedInput.data, ctx, options, childPathIndexes);
		},
	};
}

function buildDelegateToolMetadata(
	resolvedOptions: CreateDelegateSubAgentToolOptions,
): DelegateSubAgentToolMetadata {
	return {
		...(resolvedOptions.name !== undefined ? { name: resolvedOptions.name } : {}),
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
					resolveInlineSubAgentProviderTools: resolvedOptions.resolveInlineSubAgentProviderTools,
				}
			: {}),
		...(resolvedOptions.runSubAgent !== undefined
			? { runSubAgent: resolvedOptions.runSubAgent }
			: {}),
		...(resolvedOptions.resumeSubAgent !== undefined
			? { resumeSubAgent: resolvedOptions.resumeSubAgent }
			: {}),
		...(resolvedOptions.shouldRetrySubAgentResumeError !== undefined
			? { shouldRetrySubAgentResumeError: resolvedOptions.shouldRetrySubAgentResumeError }
			: {}),
		...(resolvedOptions.cancelSubAgent !== undefined
			? { cancelSubAgent: resolvedOptions.cancelSubAgent }
			: {}),
		...(resolvedOptions.systemInstruction !== undefined
			? { systemInstruction: resolvedOptions.systemInstruction }
			: {}),
		...(resolvedOptions.description !== undefined
			? { description: resolvedOptions.description }
			: {}),
		...(resolvedOptions.toModelOutput !== undefined
			? { toModelOutput: resolvedOptions.toModelOutput }
			: {}),
	};
}

export function getInlineDelegateSubAgentToolOptions(
	tool: Pick<BuiltTool, 'metadata'>,
): DelegateSubAgentToolMetadata | undefined {
	const value = tool.metadata?.[INLINE_DELEGATE_SUB_AGENT_TOOL_METADATA_KEY];
	if (typeof value !== 'object' || value === null) return undefined;
	return value;
}

/** Whether a tool is a delegate sub-agent tool built by {@link createDelegateSubAgentTool}, regardless of its configured name. */
export function isDelegateSubAgentTool(tool: Pick<BuiltTool, 'name' | 'metadata'>): boolean {
	return getInlineDelegateSubAgentToolOptions(tool) !== undefined;
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

function formatDelegationPolicyInstructions(
	policy: DelegateSubAgentPolicy | undefined,
	toolName: string,
): string[] {
	if (policy?.maxChildren === undefined) return [];

	const runLabel = policy.maxChildren === 1 ? 'run' : 'runs';
	return [
		[
			'DELEGATION PARALLELISM:',
			`- Up to ${policy.maxChildren} child sub-agent ${runLabel} can execute at the same time.`,
			'- This limits parallelism, not the total number of delegated tasks.',
			`- If more independent workstreams are useful, you may issue more ${toolName} calls; the runtime will run them in batches.`,
		].join('\n'),
	];
}

/**
 * Tool handler: assign the child's task path,
 * assemble the {@link DelegateSubAgentRequest} from the model input plus the
 * parent tool context, then run the child via the host `runSubAgent` callback
 * while emitting started/progress/completed lifecycle events. A failure is
 * converted into a `status: 'failed'` output (never thrown) so one failed
 * delegation can't abort the parent's run; an abort is rethrown, because a
 * cancelled run must end the parent too.
 */
async function handleDelegateSubAgent(
	input: DelegateSubAgentInput,
	ctx: ToolContext | InterruptibleToolContext,
	options: CreateDelegateSubAgentToolOptions,
	childPathIndexes: Map<string, number>,
): Promise<DelegateSubAgentToolOutput> {
	let taskPath: SubAgentTaskPath | undefined;
	let request: DelegateSubAgentRequest | undefined;
	let startedAt: number | undefined;
	try {
		if (
			options.resumeSubAgent !== undefined &&
			isInterruptibleToolContext(ctx) &&
			ctx.continuation !== undefined
		) {
			const restored = restoreDelegateRequest(
				input,
				ctx,
				ctx.continuation,
				options.policy,
				childPathIndexes,
			);
			const { checkpoint } = restored;
			taskPath = checkpoint.taskPath;
			request = restored.request;
			startedAt = Date.now();
			emitSubAgentStarted(ctx, request, startedAt);
			return await resumeDelegatedChild(ctx, restored, startedAt, options, options.resumeSubAgent);
		}

		const childPathIndexKey = getChildPathIndexKey(ctx);
		const childPathIndex = childPathIndexes.get(childPathIndexKey) ?? 0;

		taskPath = createChildSubAgentTaskPath(input.taskName, childPathIndex);
		childPathIndexes.set(childPathIndexKey, childPathIndex + 1);

		request = createDelegateSubAgentRequest(input, ctx, taskPath, childPathIndex, options.policy);

		startedAt = Date.now();
		emitSubAgentStarted(ctx, request, startedAt);
		return await runDelegatedChild(ctx, request, startedAt, options);
	} catch (error) {
		return handleDelegateFailure(error, ctx, taskPath, request, startedAt);
	}
}

async function resumeDelegatedChild(
	ctx: InterruptibleToolContext,
	{ request, checkpoint }: ReturnType<typeof restoreDelegateRequest>,
	startedAt: number,
	options: CreateDelegateSubAgentToolOptions,
	resumeSubAgent: DelegateSubAgentResumeRunner,
): Promise<DelegateSubAgentToolOutput> {
	let output: DelegateSubAgentToolOutput;
	try {
		output = await resumeSubAgent(
			{
				...request,
				...getChildCheckpointTarget(checkpoint),
				resumeData: ctx.resumeData,
			},
			createRunnerHelpers(ctx, request, options.name),
		);
	} catch (error) {
		if (ctx.abortSignal?.aborted || isAbortError(error)) throw error;
		if (options.shouldRetrySubAgentResumeError?.(error) === false) throw error;
		return await ctx.suspend(ctx.suspendPayload);
	}
	emitSubAgentCompleted(ctx, request, output, startedAt);
	if (output.status === 'suspended') {
		return await cascadeChildSuspension(ctx, request, output);
	}
	return output;
}

async function runDelegatedChild(
	ctx: ToolContext | InterruptibleToolContext,
	request: DelegateSubAgentRequest,
	startedAt: number,
	options: CreateDelegateSubAgentToolOptions,
): Promise<DelegateSubAgentToolOutput> {
	const toolName = options.name ?? DELEGATE_SUB_AGENT_TOOL_NAME;
	if (!options.runSubAgent) {
		throw new Error(
			`${toolName} was registered without a runSubAgent callback, and no host runner was provided. Register it on an Agent (for inline delegation) or pass runSubAgent.`,
		);
	}
	const output = await options.runSubAgent(
		request,
		createRunnerHelpers(ctx, request, options.name),
	);
	emitSubAgentCompleted(ctx, request, output, startedAt);
	if (
		output.status === 'suspended' &&
		options.resumeSubAgent !== undefined &&
		isInterruptibleToolContext(ctx)
	) {
		return await cascadeChildSuspension(ctx, request, output);
	}
	return output;
}

function handleDelegateFailure(
	error: unknown,
	ctx: ToolContext,
	taskPath: SubAgentTaskPath | undefined,
	request: DelegateSubAgentRequest | undefined,
	startedAt: number | undefined,
): DelegateSubAgentToolOutput {
	// When the parent has a signal it is the authority: `isAbortError` also
	// matches by message text, and an unrelated child error must not be
	// mistaken for a cancellation and kill the parent run.
	const aborted = ctx.abortSignal ? ctx.abortSignal.aborted : isAbortError(error);
	const output: DelegateSubAgentToolOutput = {
		status: aborted ? 'cancelled' : 'failed',
		...(taskPath !== undefined ? { taskPath } : {}),
		answer: '',
		...(aborted ? {} : { error: stringifyUnknown(error) }),
	};
	if (request !== undefined && startedAt !== undefined) {
		emitSubAgentCompleted(ctx, request, output, startedAt);
	}
	if (aborted) throw error;
	return output;
}

function createDelegateSubAgentRequest(
	input: DelegateSubAgentInput,
	ctx: ToolContext,
	taskPath: SubAgentTaskPath,
	childCount: number,
	policy?: DelegateSubAgentPolicy,
): DelegateSubAgentRequest {
	return {
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
		...(ctx.persistence?.hostMetadata !== undefined
			? { parentHostMetadata: ctx.persistence.hostMetadata }
			: {}),
		...(ctx.abortSignal !== undefined ? { parentAbortSignal: ctx.abortSignal } : {}),
		...(ctx.toolCallId !== undefined ? { parentToolCallId: ctx.toolCallId } : {}),
		...(ctx.executionCounter !== undefined
			? { parentExecutionCounter: withoutMessageCount(ctx.executionCounter) }
			: {}),
		...(ctx.parentTelemetry !== undefined ? { parentTelemetry: ctx.parentTelemetry } : {}),
		...(policy !== undefined ? { policy } : {}),
	};
}

function isJsonSchemaObject(value: unknown): value is JSONSchema7 {
	return isRecord(value);
}

async function cancelDelegatedSubAgent(
	input: DelegateSubAgentInput,
	ctx: ToolCancellationContext,
	options: CreateDelegateSubAgentToolOptions,
	childPathIndexes: Map<string, number>,
): Promise<void> {
	if (options.cancelSubAgent === undefined || ctx.continuation === undefined) return;
	const { checkpoint, request } = restoreDelegateRequest(
		input,
		ctx,
		ctx.continuation,
		options.policy,
		childPathIndexes,
	);
	await options.cancelSubAgent(
		{
			...request,
			...getChildCheckpointTarget(checkpoint),
			reason: ctx.cancellation.message,
		},
		createRunnerHelpers(ctx, request, options.name),
	);
}

function restoreDelegateRequest(
	input: DelegateSubAgentInput,
	ctx: ToolContext,
	continuation: JSONValue,
	policy: DelegateSubAgentPolicy | undefined,
	childPathIndexes: Map<string, number>,
): {
	checkpoint: DelegateSubAgentContinuation & { taskPath: SubAgentTaskPath };
	request: DelegateSubAgentRequest;
} {
	const checkpoint = parseDelegateSubAgentContinuation(continuation);
	if (!checkpoint) {
		throw new Error('Delegated child checkpoint metadata is missing or invalid');
	}
	if (checkpoint.subAgentId !== input.subAgentId) {
		throw new Error('Delegated child checkpoint does not match the selected sub-agent');
	}
	const { taskPath } = checkpoint;
	assertSubAgentTaskPath(taskPath);
	const key = getChildPathIndexKey(ctx);
	childPathIndexes.set(key, Math.max(childPathIndexes.get(key) ?? 0, checkpoint.childCount + 1));
	const request = createDelegateSubAgentRequest(
		input,
		ctx,
		taskPath,
		checkpoint.childCount,
		policy,
	);
	return { checkpoint: { ...checkpoint, taskPath }, request };
}

function getChildCheckpointTarget(
	checkpoint: DelegateSubAgentContinuation,
): DelegateSubAgentCheckpointTarget {
	return {
		childRunId: checkpoint.runId,
		childToolCallId: checkpoint.toolCallId,
		...(checkpoint.threadId !== undefined ? { childThreadId: checkpoint.threadId } : {}),
		...(checkpoint.resumeContext !== undefined ? { resumeContext: checkpoint.resumeContext } : {}),
	};
}

function createRunnerHelpers(
	ctx: ToolContext | InterruptibleToolContext,
	request: DelegateSubAgentRequest,
	configuredToolName?: string,
): DelegateSubAgentRunnerHelpers {
	const toolName = configuredToolName ?? DELEGATE_SUB_AGENT_TOOL_NAME;
	return {
		runInlineSubAgent: () => {
			throw new Error(
				`${toolName} host runner does not support inline delegation without helpers.runInlineSubAgent from an Agent build.`,
			);
		},
		emitChunk: createEmitChunkHelper(ctx, request),
	};
}

function isInterruptibleToolContext(
	ctx: ToolContext | InterruptibleToolContext,
): ctx is InterruptibleToolContext {
	return 'suspend' in ctx;
}

async function cascadeChildSuspension(
	ctx: InterruptibleToolContext,
	request: DelegateSubAgentRequest,
	output: DelegateSubAgentToolOutput,
): Promise<never> {
	const suspension = output.pendingSuspend?.[0];
	if (!suspension || !isJsonSchemaObject(suspension.resumeSchema)) {
		throw new Error(DELEGATED_CHILD_SUSPEND_UNSUPPORTED_MESSAGE);
	}

	return await ctx.suspend(suspension.suspendPayload, {
		resumeSchema: suspension.resumeSchema,
		continuation: {
			runId: suspension.runId,
			toolCallId: suspension.toolCallId,
			taskPath: request.taskPath,
			subAgentId: request.subAgentId,
			childCount: request.childCount,
			...(output.threadId !== undefined ? { threadId: output.threadId } : {}),
			...(output.resumeContext !== undefined ? { resumeContext: output.resumeContext } : {}),
		},
	});
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
		// An aborted child sets its state to `cancelled` but still reports an
		// error, so the state decides which of the two this really was.
		return result.getState().status === 'cancelled' ? 'cancelled' : 'failed';
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
					usage: toDelegateUsage(result.usage),
				}
			: {}),
		...(result.finishReason !== undefined ? { finishReason: result.finishReason } : {}),
		...(result.error !== undefined ? { error: stringifyUnknown(result.error) } : {}),
		...(status === 'suspended' && result.pendingSuspend !== undefined
			? { pendingSuspend: result.pendingSuspend }
			: {}),
	};
}

function toDelegateUsage(usage: TokenUsage): DelegateSubAgentToolOutput['usage'] {
	return {
		promptTokens: usage.promptTokens,
		completionTokens: usage.completionTokens,
		totalTokens: usage.totalTokens,
		...(usage.cost !== undefined ? { cost: usage.cost } : {}),
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
