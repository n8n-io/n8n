import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { AgentRunnableSequence } from 'langchain/agents';
import type { BaseChatMemory } from 'langchain/memory';
import type {
	IExecuteFunctions,
	ISupplyDataFunctions,
	EngineResponse,
	EngineRequest,
} from 'n8n-workflow';

import {
	loadMemory,
	processEventStream,
	createEngineRequests,
	saveToMemory,
} from '@utils/agent-execution';
import { modelPricingService } from '@utils/modelPricing';

import { SYSTEM_MESSAGE } from '../../prompt';
import type { AgentResult, RequestResponseMetadata } from '../types';
import { buildResponseMetadata } from './buildResponseMetadata';
import type { ItemContext } from './prepareItemContext';

type RunAgentResult = AgentResult | EngineRequest<RequestResponseMetadata>;

/**
 * Helper function to add cost calculation to token usage
 */
async function addCostToTokenUsage(
	tokenUsage: {
		promptTokens: number;
		completionTokens: number;
		totalTokens: number;
		isEstimate: boolean;
	},
	model: BaseChatModel,
): Promise<typeof tokenUsage & { estimatedCost?: number | null; modelName?: string }> {
	// Get model name from the model instance
	// Try multiple properties as different LLM providers use different naming
	const modelAny = model as any;

	const modelNameRaw =
		modelAny.modelName || // Most common (OpenAI, Anthropic, etc.)
		modelAny.model || // Alternative property
		modelAny.name || // Some providers
		modelAny._modelName || // Private property fallback
		modelAny.caller?.model || // Nested in caller
		modelAny.client?.modelName || // Nested in client
		modelAny._modelType?.() || // Method fallback
		'unknown';

	// Ensure modelName is a string
	const modelName =
		typeof modelNameRaw === 'string' ? modelNameRaw : String(modelNameRaw || 'unknown');

	// Calculate cost
	const estimatedCost = await modelPricingService.calculateCost(
		modelName,
		tokenUsage.promptTokens,
		tokenUsage.completionTokens,
	);

	return {
		...tokenUsage,
		estimatedCost,
		modelName,
	};
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
): Promise<RunAgentResult> {
	const { itemIndex, input, steps, tools, options } = itemContext;

	const invokeParams = {
		steps,
		input,
		system_message: options.systemMessage ?? SYSTEM_MESSAGE,
		formatting_instructions:
			'IMPORTANT: For your response to user, you MUST use the `format_final_json_response` tool with your complete answer formatted according to the required schema. Do not attempt to format the JSON manually - always use this tool. Your response will be rejected if it is not properly formatted through this tool. Only use this tool once you are ready to provide your final answer.',
	};
	const executeOptions = {
		signal: ctx.getExecutionCancelSignal(),
		callbacks: [itemContext.tokenTracker],
	};

	// Check if streaming is actually available
	const isStreamingAvailable = 'isStreaming' in ctx ? ctx.isStreaming?.() : undefined;

	if (
		'isStreaming' in ctx &&
		options.enableStreaming &&
		isStreamingAvailable &&
		ctx.getNode().typeVersion >= 2.1
	) {
		const chatHistory = await loadMemory(memory, model, options.maxTokensFromMemory);
		const eventStream = executor.streamEvents(
			{
				...invokeParams,
				chat_history: chatHistory,
			},
			{
				version: 'v2',
				...executeOptions,
			},
		);

		const result = await processEventStream(
			ctx,
			eventStream,
			itemIndex,
			options.returnIntermediateSteps,
			memory,
			input,
		);

		// If result contains tool calls, build the request object like the normal flow
		if (result.toolCalls && result.toolCalls.length > 0) {
			const actions = await createEngineRequests(result.toolCalls, itemIndex, tools);
			const currentTokens = itemContext.tokenTracker.getAccumulatedTokens();

			return {
				actions,
				metadata: buildResponseMetadata(response, itemIndex, currentTokens),
			};
		}

		// Add token usage to final streaming result
		const currentTokens = itemContext.tokenTracker.getAccumulatedTokens();
		// Merge with previous accumulated tokens if this is a continuation
		if (response?.metadata?.accumulatedTokens) {
			const mergedTokens = {
				promptTokens: response.metadata.accumulatedTokens.promptTokens + currentTokens.promptTokens,
				completionTokens:
					response.metadata.accumulatedTokens.completionTokens + currentTokens.completionTokens,
				totalTokens: response.metadata.accumulatedTokens.totalTokens + currentTokens.totalTokens,
				isEstimate: response.metadata.accumulatedTokens.isEstimate || currentTokens.isEstimate,
			};
			result.tokenUsage = await addCostToTokenUsage(mergedTokens, model);
		} else if (currentTokens.totalTokens > 0) {
			result.tokenUsage = await addCostToTokenUsage(currentTokens, model);
		}

		return result;
	} else {
		// Handle regular execution
		const chatHistory = await loadMemory(memory, model, options.maxTokensFromMemory);

		const modelResponse = await executor.invoke(
			{
				...invokeParams,
				chat_history: chatHistory,
			},
			executeOptions,
		);

		if ('returnValues' in modelResponse) {
			// Save conversation to memory including any tool call context
			if (memory && input && modelResponse.returnValues.output) {
				// If there were tool calls in this conversation, include them in the context
				let fullOutput = modelResponse.returnValues.output as string;

				if (steps.length > 0) {
					// Include tool call information in the conversation context
					const toolContext = steps
						.map(
							(step) =>
								`Tool: ${step.action.tool}, Input: ${JSON.stringify(step.action.toolInput)}, Result: ${step.observation}`,
						)
						.join('; ');
					fullOutput = `[Used tools: ${toolContext}] ${fullOutput}`;
				}

				await saveToMemory(input, fullOutput, memory);
			}
			// Include intermediate steps if requested
			const result = { ...modelResponse.returnValues };
			if (options.returnIntermediateSteps && steps.length > 0) {
				result.intermediateSteps = steps;
			}
			// Add token usage to final result
			const currentTokens = itemContext.tokenTracker.getAccumulatedTokens();
			// Merge with previous accumulated tokens if this is a continuation
			if (response?.metadata?.accumulatedTokens) {
				const mergedTokens = {
					promptTokens:
						response.metadata.accumulatedTokens.promptTokens + currentTokens.promptTokens,
					completionTokens:
						response.metadata.accumulatedTokens.completionTokens + currentTokens.completionTokens,
					totalTokens: response.metadata.accumulatedTokens.totalTokens + currentTokens.totalTokens,
					isEstimate: response.metadata.accumulatedTokens.isEstimate || currentTokens.isEstimate,
				};
				result.tokenUsage = await addCostToTokenUsage(mergedTokens, model);
			} else if (currentTokens.totalTokens > 0) {
				result.tokenUsage = await addCostToTokenUsage(currentTokens, model);
			}
			return result;
		}

		// If response contains tool calls, we need to return this in the right format
		const actions = await createEngineRequests(modelResponse, itemIndex, tools);
		const currentTokens = itemContext.tokenTracker.getAccumulatedTokens();

		return {
			actions,
			metadata: buildResponseMetadata(response, itemIndex, currentTokens),
		};
	}
}
