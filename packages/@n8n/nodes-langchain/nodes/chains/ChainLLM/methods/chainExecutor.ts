import type { BaseLanguageModel } from '@langchain/core/language_models/base';
import { StringOutputParser } from '@langchain/core/output_parsers';
import type { ChatPromptTemplate, PromptTemplate } from '@langchain/core/prompts';
import type { IExecuteFunctions } from 'n8n-workflow';

import { getTracingConfig } from '@utils/tracing';

import { createPromptTemplate } from './promptUtils';
import type { ChainExecutionParams } from './types';

/**
 * Creates a simple chain for LLMs without output parsers
 */
async function executeSimpleChain({
	context,
	llm,
	query,
	prompt,
}: {
	context: IExecuteFunctions;
	llm: BaseLanguageModel;
	query: string;
	prompt: ChatPromptTemplate | PromptTemplate;
}): Promise<string[]> {
	const chain = prompt
		.pipe(llm)
		.pipe(new StringOutputParser())
		.withConfig(getTracingConfig(context));

	// Execute the chain
	const response = await chain.invoke({
		query,
		signal: context.getExecutionCancelSignal(),
	});

	// Ensure response is always returned as an array
	return [response];
}

/**
 * Creates and executes an LLM chain with the given prompt and optional output parsers
 */
export async function executeChain({
	context,
	itemIndex,
	query,
	llm,
	outputParser,
	messages,
}: ChainExecutionParams): Promise<unknown[]> {
	// If no output parsers provided, use a simple chain with basic prompt template
	if (!outputParser) {
		const promptTemplate = await createPromptTemplate({
			context,
			itemIndex,
			llm,
			messages,
			query,
		});

		return await executeSimpleChain({
			context,
			llm,
			query,
			prompt: promptTemplate,
		});
	}

	const formatInstructions = outputParser.getFormatInstructions();

	// Create a prompt template with format instructions
	const promptWithInstructions = await createPromptTemplate({
		context,
		itemIndex,
		llm,
		messages,
		formatInstructions,
		query,
	});

	const chain = promptWithInstructions
		.pipe(llm)
		.pipe(outputParser)
		.withConfig(getTracingConfig(context));
	const response = await chain.invoke({ query }, { signal: context.getExecutionCancelSignal() });

	// Ensure response is always returned as an array
	// eslint-disable-next-line @typescript-eslint/no-unsafe-return
	return Array.isArray(response) ? response : [response];
}
