import type { BaseLanguageModel } from '@langchain/core/language_models/base';
import { StringOutputParser } from '@langchain/core/output_parsers';
import type { ChatPromptTemplate, PromptTemplate } from '@langchain/core/prompts';
import { CombiningOutputParser } from 'langchain/output_parsers';
import type { IExecuteFunctions } from 'n8n-workflow';

import type { N8nOutputParser } from '@utils/output_parsers/N8nOutputParser';
import { getTracingConfig } from '@utils/tracing';

import { createPromptTemplate } from './promptUtils';
import type { ChainExecutionParams } from './types';

/**
 * Determines which output parser to use based on the number of parsers provided
 */
function getOutputParser(outputParsers: N8nOutputParser[]): N8nOutputParser {
	if (outputParsers.length === 1) {
		return outputParsers[0];
	}

	// If multiple parsers, combine them
	return new CombiningOutputParser(...outputParsers) as unknown as N8nOutputParser;
}

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
	outputParsers,
	messages,
}: ChainExecutionParams): Promise<unknown[]> {
	// If no output parsers provided, use a simple chain with basic prompt template
	if (!outputParsers.length) {
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

	const parser = getOutputParser(outputParsers);
	const formatInstructions = parser.getFormatInstructions();

	// Create a prompt template with format instructions
	const promptWithInstructions = await createPromptTemplate({
		context,
		itemIndex,
		llm,
		messages,
		formatInstructions,
		query,
	});

	const chain = promptWithInstructions.pipe(llm).pipe(parser).withConfig(getTracingConfig(context));
	const response = await chain.invoke({ query }, { signal: context.getExecutionCancelSignal() });

	// Ensure response is always returned as an array
	// eslint-disable-next-line @typescript-eslint/no-unsafe-return
	return Array.isArray(response) ? response : [response];
}
