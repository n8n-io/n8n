import type { AgentRunnableSequence } from '@langchain/classic/agents';
import type { BaseChatMemory } from '@langchain/classic/memory';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import {
	createEngineRequests,
	loadMemory,
	processEventStream,
	saveToMemory,
	type RequestResponseMetadata,
	type ToolCallData,
} from '@utils/agent-execution';
import { buildResponseMetadata } from '@utils/agent-execution/buildResponseMetadata';
import { buildTracingMetadata, getTracingConfig } from '@utils/tracing';
import type {
	EngineRequest,
	EngineResponse,
	IExecuteFunctions,
	ISupplyDataFunctions,
} from 'n8n-workflow';

import type { ItemContext } from './prepareItemContext';
import { isExecuteFunctions } from '../../../utils';
import { SYSTEM_MESSAGE } from '../../prompt';
import type { AgentResult } from '../types';

type RunAgentResult = AgentResult | EngineRequest<RequestResponseMetadata>;

/**
 * Appends the attribution of every tool called during the run (see
 * `ToolMetadata.attribution`). Done in code, after the model, so the label
 * does not depend on the model honouring an instruction in the tool result.
 */
export function appendToolAttributions(
	output: string,
	steps: ToolCallData[],
	tools: ItemContext['tools'],
): string {
	const calledTools = new Set(steps.map((step) => step.action.tool));
	const attributions = new Set<string>();
	for (const tool of tools) {
		const attribution = tool.metadata?.attribution;
		if (
			calledTools.has(tool.name) &&
			typeof attribution === 'string' &&
			!output.includes(attribution)
		) {
			attributions.add(attribution);
		}
	}
	if (attributions.size === 0) return output;
	return `${output}\n\n${[...attributions].join('\n')}`;
}

/**
 * Runs the agent for a single item, choosing between streaming or non-streaming execution.
 * Handles both regular execution and execution after tool calls.
 *
 * @param ctx - The execution context
 * @param executor - The agent runnable sequence
 * @param itemContext - Context for the current item
 * @param model - The chat model for token counting
 * @param memory - Optional memory for conversation context
 * @param response - Optional engine response with previous tool calls
 * @returns AgentResult or engine request with tool calls
 */
export async function runAgent(
	ctx: IExecuteFunctions | ISupplyDataFunctions,
	executor: AgentRunnableSequence,
	itemContext: ItemContext,
	model: BaseChatModel,
	memory: BaseChatMemory | undefined,
	response?: EngineResponse<RequestResponseMetadata>,
	memoryHits?: { loads: number; saves: number },
): Promise<RunAgentResult> {
	const { itemIndex, input, steps, tools, options, outputParser } = itemContext;
	// A structured output must stay parseable, so the attribution is skipped there.
	const finalizeOutput = outputParser
		? undefined
		: (output: string) => appendToolAttributions(output, steps, tools);

	const invokeParams = {
		// steps are passed to the ToolCallingAgent in the runnable sequence to keep track of tool calls
		steps,
		input,
		system_message: options.systemMessage ?? SYSTEM_MESSAGE,
		formatting_instructions:
			'IMPORTANT: For your response to user, you MUST use the `format_final_json_response` tool with your complete answer formatted according to the required schema. Do not attempt to format the JSON manually - always use this tool. Your response will be rejected if it is not properly formatted through this tool. Only use this tool once you are ready to provide your final answer.',
	};
	const executeOptions = { signal: ctx.getExecutionCancelSignal() };
	const logger = 'logger' in ctx ? ctx.logger : undefined;
	const additionalMetadata = buildTracingMetadata(options.tracingMetadata?.values, logger);
	if (Object.keys(additionalMetadata).length > 0 && logger) {
		ctx.logger.debug('Tracing metadata', { additionalMetadata });
	}
	const tracingConfig = isExecuteFunctions(ctx)
		? getTracingConfig(ctx, { additionalMetadata })
		: undefined;
	const executorWithTracing = tracingConfig ? executor.withConfig(tracingConfig) : executor;

	// Check if streaming is actually available
	const isStreamingAvailable = 'isStreaming' in ctx ? ctx.isStreaming?.() : undefined;

	if (
		'isStreaming' in ctx &&
		options.enableStreaming &&
		isStreamingAvailable &&
		ctx.getNode().typeVersion >= 2.1
	) {
		const chatHistory = await loadMemory(memory, model, options.maxTokensFromMemory);
		if (memory && memoryHits) {
			memoryHits.loads++;
		}
		const eventStream = executorWithTracing.streamEvents(
			{
				...invokeParams,
				chat_history: chatHistory,
			},
			{
				version: 'v2',
				...executeOptions,
			},
		);

		const result = await processEventStream(ctx, eventStream, itemIndex, finalizeOutput);

		// If result contains tool calls, build the request object like the normal flow
		if (result.toolCalls && result.toolCalls.length > 0) {
			const actions = createEngineRequests(result.toolCalls, itemIndex, tools);

			return {
				actions,
				metadata: buildResponseMetadata(response, itemIndex),
			};
		}
		// Save conversation to memory including any tool call context
		if (memory && input && result?.output) {
			const previousCount = response?.metadata?.previousRequests?.length;
			await saveToMemory(input, result.output, memory, steps, previousCount);
			if (memoryHits) {
				memoryHits.saves++;
			}
		}

		if (options.returnIntermediateSteps) {
			result.intermediateSteps = steps;
		}

		return result;
	} else {
		// Handle regular execution
		const chatHistory = await loadMemory(memory, model, options.maxTokensFromMemory);
		if (memory && memoryHits) {
			memoryHits.loads++;
		}

		const modelResponse = await executorWithTracing.invoke(
			{
				...invokeParams,
				chat_history: chatHistory,
			},
			executeOptions,
		);

		if ('returnValues' in modelResponse) {
			if (finalizeOutput && typeof modelResponse.returnValues.output === 'string') {
				modelResponse.returnValues.output = finalizeOutput(modelResponse.returnValues.output);
			}
			// Save conversation to memory including any tool call context
			if (memory && input && modelResponse.returnValues.output) {
				const previousCount = response?.metadata?.previousRequests?.length;
				await saveToMemory(input, modelResponse.returnValues.output, memory, steps, previousCount);
				if (memoryHits) {
					memoryHits.saves++;
				}
			}
			// Include intermediate steps if requested
			const result = { ...modelResponse.returnValues };
			if (options.returnIntermediateSteps) {
				result.intermediateSteps = steps;
			}
			return result;
		}

		// If response contains tool calls, we need to return this in the right format
		const actions = createEngineRequests(modelResponse, itemIndex, tools);

		return {
			actions,
			metadata: buildResponseMetadata(response, itemIndex),
		};
	}
}
