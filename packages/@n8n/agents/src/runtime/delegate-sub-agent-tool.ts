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

export type DelegateSubAgentInput = z.infer<typeof delegateSubAgentInputSchema>;

export interface DelegateSubAgentPolicy extends SubAgentTaskPathPolicy {
	timeoutMs?: number;
	allowedToolNames?: string[];
}

export interface DelegateSubAgentRequest extends DelegateSubAgentInput {
	taskPath: SubAgentTaskPath;
	parentRunId?: string;
	parentToolCallId?: string;
	parentTaskPath?: SubAgentTaskPath;
	childCount: number;
	policy?: DelegateSubAgentPolicy;
}

export interface DelegateSubAgentToolOutput {
	status: 'completed' | 'failed';
	taskPath?: SubAgentTaskPath;
	runId?: string;
	answer: string;
	structuredOutput?: unknown;
	usage?: Pick<TokenUsage, 'promptTokens' | 'completionTokens' | 'totalTokens' | 'cost'>;
	finishReason?: FinishReason;
	error?: string;
}

type DelegateSubAgentGenerateOptions = RunOptions & ExecutionOptions;

interface CreateDelegateSubAgentToolBaseOptions {
	availableSubAgents?: Array<{ id: string; name: string; description?: string }>;
	parentTaskPath?: SubAgentTaskPath;
	policy?: DelegateSubAgentPolicy;
	generateOptions?:
		| DelegateSubAgentGenerateOptions
		| ((
				request: DelegateSubAgentRequest,
		  ) => DelegateSubAgentGenerateOptions | Promise<DelegateSubAgentGenerateOptions>);
	renderPrompt?: (request: DelegateSubAgentRequest) => string;
}

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

export function createDelegateSubAgentTool(options: CreateDelegateSubAgentToolOptions) {
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
