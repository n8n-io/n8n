import type { z } from 'zod';

import { cancelDelegatedSubAgent, handleDelegateSubAgent } from './delegate-sub-agent-runner';
import { withSdkOwnedBuiltInMetadata } from './sdk-owned-tool';
import { DEFAULT_SUB_AGENT_MAX_CHILDREN } from './sub-agent-task-path';
import { Tool } from '../../sdk/tool';
import {
	DELEGATE_SUB_AGENT_TOOL_NAME,
	INLINE_DELEGATE_SUB_AGENT_TOOL_METADATA_KEY,
	delegateSubAgentInputSchema,
	delegateSubAgentOutputSchema,
	delegateSubAgentSuspendSchema,
	delegateSubAgentResumeSchema,
	type CreateDelegateSubAgentToolOptions,
	type DelegateSubAgentInput,
	type DelegateSubAgentPolicy,
	type DelegateSubAgentToolMetadata,
} from '../../types/runtime/delegation';
import type {
	BuiltTool,
	InterruptibleToolContext,
	ToolCancellationContext,
	ToolContext,
} from '../../types/sdk/tool';

export {
	failedDelegatedChildSuspendOutput,
	generateResultToDelegateSubAgentOutput,
	renderDelegateSubAgentPrompt,
} from './delegate-sub-agent-runner';
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
