import type { Tool } from '@langchain/classic/tools';
import type { BaseLanguageModel } from '@langchain/core/language_models/base';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { BaseLLMOutputParser } from '@langchain/core/output_parsers';
import { JsonOutputParser, StringOutputParser } from '@langchain/core/output_parsers';
import type { ChatPromptTemplate, PromptTemplate } from '@langchain/core/prompts';
import type { Runnable } from '@langchain/core/runnables';
import type { IExecuteFunctions } from 'n8n-workflow';

import { isChatInstance } from '@n8n/ai-utilities';
import { getTracingConfig } from '@utils/tracing';

import { createPromptTemplate, getAgentStepsParser } from './promptUtils';
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
	llm: BaseChatModel | BaseLanguageModel,
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

	// For example Mistral's Magistral models (LmChatMistralCloud node)
	if (llm.metadata?.output_format === 'json') {
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
}: {
	context: IExecuteFunctions;
	llm: BaseChatModel | BaseLanguageModel;
	query: string;
	prompt: ChatPromptTemplate | PromptTemplate;
}) {
	const outputParser = getOutputParserForLLM(llm);

	const chain = prompt.pipe(llm).pipe(outputParser).withConfig(getTracingConfig(context));

	// Execute the chain
	const response = await chain.invoke({
		query,
		signal: context.getExecutionCancelSignal(),
	});

	// Ensure response is always returned as an array
	return [response];
}

// Some models nodes, like OpenAI, can define built-in tools in their metadata
function withBuiltInTools(llm: BaseChatModel | BaseLanguageModel) {
	const modelTools = (llm.metadata?.tools as Tool[]) ?? [];
	if (modelTools.length && isChatInstance(llm) && llm.bindTools) {
		return llm.bindTools(modelTools);
	}
	return llm;
}

function prepareLlm(
	llm: BaseLanguageModel | BaseChatModel,
	fallbackLlm?: BaseLanguageModel | BaseChatModel | null,
) {
	const mainLlm = withBuiltInTools(llm);
	if (fallbackLlm) {
		return mainLlm.withFallbacks([withBuiltInTools(fallbackLlm)]);
	}
	return mainLlm;
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
	const version = context.getNode().typeVersion;
	const model = prepareLlm(llm, fallbackLlm) as BaseChatModel | BaseLanguageModel;
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
			llm: model,
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

	let chain: Runnable<{ query: string }>;
	if (version >= 1.9) {
		// use getAgentStepsParser to have more robust output parsing
		chain = promptWithInstructions
			.pipe(model)
			.pipe(getAgentStepsParser(outputParser))
			.withConfig(getTracingConfig(context));
	} else {
		chain = promptWithInstructions
			.pipe(model)
			.pipe(outputParser)
			.withConfig(getTracingConfig(context));
	}

	const response = await chain.invoke({ query }, { signal: context.getExecutionCancelSignal() });

	// Ensure response is always returned as an array
	// eslint-disable-next-line @typescript-eslint/no-unsafe-return
	return Array.isArray(response) ? response : [response];
}
