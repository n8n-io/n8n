import type { BaseLanguageModel } from '@langchain/core/language_models/base';
import { type IExecuteFunctions, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { getPromptInputByType } from '@utils/helpers';
import { getOptionalOutputParser } from '@utils/output_parsers/N8nOutputParser';

import { executeChain } from './chainExecutor';
import { type MessageTemplate } from './types';

export const processItem = async (ctx: IExecuteFunctions, itemIndex: number) => {
	const llm = (await ctx.getInputConnectionData(
		NodeConnectionTypes.AiLanguageModel,
		0,
	)) as BaseLanguageModel;

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
	});
};
