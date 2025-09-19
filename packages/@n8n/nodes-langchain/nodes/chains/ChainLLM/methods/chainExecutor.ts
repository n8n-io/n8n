import type { BaseLanguageModel } from '@langchain/core/language_models/base';
import type { BaseLLMOutputParser } from '@langchain/core/output_parsers';
import { JsonOutputParser, StringOutputParser } from '@langchain/core/output_parsers';
import type { ChatPromptTemplate, PromptTemplate } from '@langchain/core/prompts';
import type { IExecuteFunctions } from 'n8n-workflow';

import { getTracingConfig } from '@utils/tracing';

import { createPromptTemplate } from './promptUtils';
import type { ChainExecutionParams } from './types';

export class NaiveJsonOutputParser<
	T extends Record<string, any> = Record<string, any>,
> extends JsonOutputParser<T> {
	async parse(text: string): Promise<T> {
		// First try direct JSON parsing
		try {
			const directParsed = JSON.parse(text);
			return directParsed as T;
		} catch (e) {
			// If fails, fall back to JsonOutputParser parser
			return await super.parse(text);
		}
	}
}

/**
 * Type guard to check if the LLM has a modelKwargs property(OpenAI)
 */
export function isModelWithResponseFormat(
	llm: BaseLanguageModel,
): llm is BaseLanguageModel & { modelKwargs: { response_format: { type: string } } } {
	return (
		'modelKwargs' in llm &&
		!!llm.modelKwargs &&
		typeof llm.modelKwargs === 'object' &&
		'response_format' in llm.modelKwargs
	);
}

export function isModelInThinkingMode(
	llm: BaseLanguageModel,
): llm is BaseLanguageModel & { lc_kwargs: { invocationKwargs: { thinking: { type: string } } } } {
	return (
		'lc_kwargs' in llm &&
		'invocationKwargs' in llm.lc_kwargs &&
		typeof llm.lc_kwargs.invocationKwargs === 'object' &&
		'thinking' in llm.lc_kwargs.invocationKwargs &&
		llm.lc_kwargs.invocationKwargs.thinking.type === 'enabled'
	);
}

/**
 * Type guard to check if the LLM has a format property(Ollama)
 */
export function isModelWithFormat(
	llm: BaseLanguageModel,
): llm is BaseLanguageModel & { format: string } {
	return 'format' in llm && typeof llm.format !== 'undefined';
}

/**
 * Determines if an LLM is configured to output JSON and returns the appropriate output parser
 */
export function getOutputParserForLLM(
	llm: BaseLanguageModel,
): BaseLLMOutputParser<string | Record<string, unknown>> {
	if (isModelWithResponseFormat(llm) && llm.modelKwargs?.response_format?.type === 'json_object') {
		return new NaiveJsonOutputParser();
	}

	if (isModelWithFormat(llm) && llm.format === 'json') {
		return new NaiveJsonOutputParser();
	}

	if (isModelInThinkingMode(llm)) {
		return new NaiveJsonOutputParser();
	}

	return new StringOutputParser();
}

/**
 * Creates a simple chain for LLMs without output parsers
 */
async function executeSimpleChain({
	context,
	llm,
	query,
	prompt,
	fallbackLlm,
}: {
	context: IExecuteFunctions;
	llm: BaseLanguageModel;
	query: string;
	prompt: ChatPromptTemplate | PromptTemplate;
	fallbackLlm?: BaseLanguageModel | null;
}) {
	const outputParser = getOutputParserForLLM(llm);
	let model;

	if (fallbackLlm) {
		model = llm.withFallbacks([fallbackLlm]);
	} else {
		model = llm;
	}

	const chain = prompt.pipe(model).pipe(outputParser).withConfig(getTracingConfig(context));

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
	fallbackLlm,
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
			fallbackLlm,
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
