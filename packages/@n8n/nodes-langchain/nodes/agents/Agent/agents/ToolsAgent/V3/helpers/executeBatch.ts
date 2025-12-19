import type { AgentRunnableSequence } from '@langchain/classic/agents';
import type { BaseChatMemory } from '@langchain/classic/memory';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { NodeOperationError, assertParamIsNumber } from 'n8n-workflow';
import type {
	IExecuteFunctions,
	ISupplyDataFunctions,
	INodeExecutionData,
	EngineResponse,
	EngineRequest,
} from 'n8n-workflow';

import { processHitlResponses } from '@utils/agent-execution';
import type { RequestResponseMetadata } from '@utils/agent-execution/types';
import { getOptionalOutputParser } from '@utils/output_parsers/N8nOutputParser';

import type { AgentResult } from '../types';
import { createAgentSequence } from './createAgentSequence';
import { finalizeResult } from './finalizeResult';
import { prepareItemContext } from './prepareItemContext';
import { runAgent } from './runAgent';
import { checkMaxIterations } from './checkMaxIterations';

type BatchResult = AgentResult | EngineRequest<RequestResponseMetadata>;
/**
 * Executes a batch of items, handling both successful execution and errors.
 * Applies continue-on-fail logic when errors occur.
 *
 * @param ctx - The execution context
 * @param batch - Array of items to process in this batch
 * @param startIndex - Starting index of the batch in the original items array (used to calculate itemIndex)
 * @param model - Primary chat model
 * @param fallbackModel - Optional fallback model
 * @param memory - Optional memory for conversation context
 * @param response - Optional engine response with previous tool calls
 * @returns Object containing execution data and optional requests
 */
export async function executeBatch(
	ctx: IExecuteFunctions | ISupplyDataFunctions,
	batch: INodeExecutionData[],
	startIndex: number,
	model: BaseChatModel,
	fallbackModel: BaseChatModel | null,
	memory: BaseChatMemory | undefined,
	response?: EngineResponse<RequestResponseMetadata>,
): Promise<{
	returnData: INodeExecutionData[];
	request: EngineRequest<RequestResponseMetadata> | undefined;
}> {
	const returnData: INodeExecutionData[] = [];
	let request: EngineRequest<RequestResponseMetadata> | undefined = undefined;

	// Process HITL (Human-in-the-Loop) tool responses before running the agent
	// If there are approved HITL tools, we need to execute the gated tools first
	const hitlResult = processHitlResponses(response, startIndex);

	if (hitlResult.hasApprovedHitlTools && hitlResult.pendingGatedToolRequest) {
		// Return the gated tool request immediately
		// The Agent will resume after the gated tool executes
		return {
			returnData: [],
			request: hitlResult.pendingGatedToolRequest,
		};
	}

	// Use the processed response (with HITL denials properly formatted)
	const processedResponse = hitlResult.processedResponse;

	// Check max iterations if this is a continuation of a previous execution
	const maxIterations = ctx.getNodeParameter('options.maxIterations', 0, 10);
	assertParamIsNumber('options.maxIterations', maxIterations, ctx.getNode());

	const batchPromises = batch.map(async (_item, batchItemIndex) => {
		const itemIndex = startIndex + batchItemIndex;

		checkMaxIterations(response, maxIterations, ctx.getNode());

		const itemContext = await prepareItemContext(ctx, itemIndex, processedResponse);

		const { tools, prompt, options, outputParser } = itemContext;

		// Create executors for primary and fallback models
		const executor: AgentRunnableSequence = createAgentSequence(
			model,
			tools,
			prompt,
			options,
			outputParser,
			memory,
			fallbackModel,
		);

		// Run the agent with processed response
		return await runAgent(ctx, executor, itemContext, model, memory, processedResponse);
	});

	const batchResults = await Promise.allSettled(batchPromises);
	// This is only used to check if the output parser is connected
	// so we can parse the output if needed. Actual output parsing is done in the loop above
	const outputParser = await getOptionalOutputParser(ctx, 0);

	batchResults.forEach((result, index) => {
		const itemIndex = startIndex + index;
		if (result.status === 'rejected') {
			const error = result.reason as Error;
			if (ctx.continueOnFail()) {
				returnData.push({
					json: { error: error.message },
					pairedItem: { item: itemIndex },
				} as INodeExecutionData);
				return;
			} else {
				throw new NodeOperationError(ctx.getNode(), error);
			}
		}
		const batchResult = result.value as BatchResult;

		if (!batchResult) {
			return;
		}

		if ('actions' in batchResult) {
			if (!request) {
				request = {
					actions: batchResult.actions,
					metadata: batchResult.metadata,
				};
			} else {
				request.actions.push.apply(request.actions, batchResult.actions);
			}
			return;
		}

		// Finalize the result
		const itemResult = finalizeResult(batchResult, itemIndex, memory, outputParser);
		returnData.push(itemResult);
	});

	return { returnData, request };
}
