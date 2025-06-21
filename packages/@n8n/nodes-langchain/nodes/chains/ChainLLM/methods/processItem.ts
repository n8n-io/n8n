import type { BaseLanguageModel } from '@langchain/core/language_models/base';
import { type IExecuteFunctions, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { getPromptInputByType } from '@utils/helpers';
import { getOptionalOutputParser } from '@utils/output_parsers/N8nOutputParser';

import { executeChain } from './chainExecutor';
import { type MessageTemplate } from './types';

async function getChatModel(ctx: IExecuteFunctions, index: number = 0): Promise<BaseLanguageModel> {
	const connectedModels = await ctx.getInputConnectionData(NodeConnectionTypes.AiLanguageModel, 0);

	let model;

	if (Array.isArray(connectedModels) && index !== undefined) {
		if (connectedModels.length <= index) {
			throw new NodeOperationError(
				ctx.getNode(),
				`Chat Model not found at index ${index}. Available models: ${connectedModels.length}`,
			);
		}
		connectedModels.reverse();
		model = connectedModels[index] as BaseLanguageModel;
	} else {
		model = connectedModels as BaseLanguageModel;
	}

	return model;
}

export const processItem = async (ctx: IExecuteFunctions, itemIndex: number) => {
	const needsFallback = ctx.getNodeParameter('needsFallback', 0, false) as boolean;
	const llm = await getChatModel(ctx, 0);
	const fallbackLlm = needsFallback ? await getChatModel(ctx, 1) : null;

	// Get output parser if configured
	const outputParser = await getOptionalOutputParser(ctx);

	// Get user prompt based on node version
	let prompt: string;

	if (ctx.getNode().typeVersion <= 1.3) {
		prompt = ctx.getNodeParameter('prompt', itemIndex) as string;
	} else {
		prompt = getPromptInputByType({
			ctx,
			i: itemIndex,
			inputKey: 'text',
			promptTypeKey: 'promptType',
		});
	}

	// Validate prompt
	if (prompt === undefined) {
		throw new NodeOperationError(ctx.getNode(), "The 'prompt' parameter is empty.");
	}

	// Get chat messages if configured
	const messages = ctx.getNodeParameter(
		'messages.messageValues',
		itemIndex,
		[],
	) as MessageTemplate[];

	// Execute the chain
	return await executeChain({
		context: ctx,
		itemIndex,
		query: prompt,
		llm,
		outputParser,
		messages,
		fallbackLlm,
	});
};
