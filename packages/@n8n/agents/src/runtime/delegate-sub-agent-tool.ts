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
			'Delegate a self-contained task to a specialized sub-agent and return its result. ' +
				'Use this when the task benefits from isolated focus or a specialist perspective.',
		)
		.systemInstruction(
			'Use delegate_subagent for bounded, self-contained subtasks. Provide the sub-agent with enough context to work independently. Do not delegate trivial transformations.',
		)
		.input(delegateSubAgentInputSchema)
		.output(delegateSubAgentOutputSchema)
		.handler(async (input, ctx) => await handleDelegateSubAgent(input, ctx, options, childCounts))
		.build();
}

async function handleDelegateSubAgent(
	input: DelegateSubAgentInput,
	ctx: ToolContext,
	options: CreateDelegateSubAgentToolOptions,
	childCounts: Map<string, number>,
): Promise<DelegateSubAgentToolOutput> {
	let taskPath: SubAgentTaskPath | undefined;
	try {
		const parentTaskPath = options.parentTaskPath;
		assertSubAgentPolicyAllowsChild(parentTaskPath, options.policy);
		const childCountKey = getChildCountKey(ctx, parentTaskPath);
		const childCount = childCounts.get(childCountKey) ?? 0;
		assertSubAgentPolicyAllowsChildCount(childCount, options.policy);

		taskPath = createChildSubAgentTaskPath(parentTaskPath, input.taskName);
		childCounts.set(childCountKey, childCount + 1);

		const request = {
			...input,
			taskPath,
			childCount,
			...(ctx.runId !== undefined ? { parentRunId: ctx.runId } : {}),
			...(ctx.toolCallId !== undefined ? { parentToolCallId: ctx.toolCallId } : {}),
			...(parentTaskPath !== undefined ? { parentTaskPath } : {}),
			...(options.policy !== undefined ? { policy: options.policy } : {}),
		};

		return await runSubAgent(request, options);
	} catch (error) {
		return {
			status: 'failed',
			...(taskPath !== undefined ? { taskPath } : {}),
			answer: '',
			error: error instanceof Error ? error.message : String(error),
		};
	}
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

		const text = message.content.find((content) => content.type === 'text');
		if (text?.type === 'text') return text.text;
	}

	return '';
}

function stringifyUnknown(value: unknown): string {
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
