import { isRecord } from '@n8n/utils/is-record';
import type { JSONSchema7 } from 'json-schema';

import {
	assertSubAgentTaskPath,
	createChildSubAgentTaskPath,
	type SubAgentTaskPath,
} from './sub-agent-task-path';
import { isAbortError } from '../../sdk/abort';
import { filterLlmMessages } from '../../sdk/message';
import {
	DELEGATE_SUB_AGENT_TOOL_NAME,
	DELEGATED_CHILD_SUSPEND_UNSUPPORTED_MESSAGE,
	parseDelegateSubAgentContinuation,
	type CreateDelegateSubAgentToolOptions,
	type DelegateSubAgentCheckpointTarget,
	type DelegateSubAgentContinuation,
	type DelegateSubAgentInput,
	type DelegateSubAgentPolicy,
	type DelegateSubAgentRequest,
	type DelegateSubAgentResumeRunner,
	type DelegateSubAgentRunnerHelpers,
	type DelegateSubAgentToolOutput,
} from '../../types/runtime/delegation';
import { AgentEvent, type ForwardedChildChunk } from '../../types/runtime/event';
import type { GenerateResult, StreamChunk, TokenUsage } from '../../types/sdk/agent';
import type { AgentMessage } from '../../types/sdk/message';
import type {
	InterruptibleToolContext,
	ToolCancellationContext,
	ToolContext,
} from '../../types/sdk/tool';
import type { JSONValue } from '../../types/utils/json';
import { withoutMessageCount } from '../loop/execution-counter';

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

/**
 * Tool handler: assign the child's task path,
 * assemble the {@link DelegateSubAgentRequest} from the model input plus the
 * parent tool context, then run the child via the host `runSubAgent` callback
 * while emitting started/progress/completed lifecycle events. A failure is
 * converted into a `status: 'failed'` output (never thrown) so one failed
 * delegation can't abort the parent's run; an abort is rethrown, because a
 * cancelled run must end the parent too.
 */
export async function handleDelegateSubAgent(
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

export async function cancelDelegatedSubAgent(
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
		return JSON.stringify(value) ?? 'Unknown error';
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
