import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { AgentRunnableSequence } from '@langchain/classic/agents';
import type { BaseChatMemory } from '@langchain/classic/memory';
import { NodeOperationError } from 'n8n-workflow';
import type {
	IExecuteFunctions,
	ISupplyDataFunctions,
	INodeExecutionData,
	EngineResponse,
	EngineRequest,
} from 'n8n-workflow';

import { getOptionalOutputParser } from '@utils/output_parsers/N8nOutputParser';

import type { RequestResponseMetadata, AgentResult } from '../types';
import { createAgentSequence } from './createAgentSequence';
import { finalizeResult } from './finalizeResult';
import { prepareItemContext } from './prepareItemContext';
import { runAgent } from './runAgent';

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

	const batchPromises = batch.map(async (_item, batchItemIndex) => {
		const itemIndex = startIndex + batchItemIndex;

		const itemContext = await prepareItemContext(ctx, itemIndex, response);

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

		// Run the agent
		return await runAgent(ctx, executor, itemContext, model, memory, response);
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
