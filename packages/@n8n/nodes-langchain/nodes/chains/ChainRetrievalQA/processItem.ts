import type { BaseLanguageModel } from '@langchain/core/language_models/base';
import {
	ChatPromptTemplate,
	HumanMessagePromptTemplate,
	PromptTemplate,
	SystemMessagePromptTemplate,
} from '@langchain/core/prompts';
import type { BaseRetriever } from '@langchain/core/retrievers';
import { createStuffDocumentsChain } from 'langchain/chains/combine_documents';
import { createRetrievalChain } from 'langchain/chains/retrieval';
import { type IExecuteFunctions, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { getPromptInputByType, isChatInstance } from '@utils/helpers';
import { getTracingConfig } from '@utils/tracing';

import { INPUT_TEMPLATE_KEY, LEGACY_INPUT_TEMPLATE_KEY, SYSTEM_PROMPT_TEMPLATE } from './constants';

export const processItem = async (
	ctx: IExecuteFunctions,
	itemIndex: number,
): Promise<Record<string, unknown>> => {
	const model = (await ctx.getInputConnectionData(
		NodeConnectionTypes.AiLanguageModel,
		0,
	)) as BaseLanguageModel;

	const retriever = (await ctx.getInputConnectionData(
		NodeConnectionTypes.AiRetriever,
		0,
	)) as BaseRetriever;

	let query;

	if (ctx.getNode().typeVersion <= 1.2) {
		query = ctx.getNodeParameter('query', itemIndex) as string;
	} else {
		query = getPromptInputByType({
			ctx,
			i: itemIndex,
			inputKey: 'text',
			promptTypeKey: 'promptType',
		});
	}

	if (query === undefined) {
		throw new NodeOperationError(ctx.getNode(), 'The ‘query‘ parameter is empty.');
	}

	const options = ctx.getNodeParameter('options', itemIndex, {}) as {
		systemPromptTemplate?: string;
	};

	let templateText = options.systemPromptTemplate ?? SYSTEM_PROMPT_TEMPLATE;

	// Replace legacy input template key for versions 1.4 and below
	if (ctx.getNode().typeVersion < 1.5) {
		templateText = templateText.replace(
			`{${LEGACY_INPUT_TEMPLATE_KEY}}`,
			`{${INPUT_TEMPLATE_KEY}}`,
		);
	}

	// Create prompt template based on model type and user configuration
	let promptTemplate;
	if (isChatInstance(model)) {
		// For chat models, create a chat prompt template with system and human messages
		const messages = [
			SystemMessagePromptTemplate.fromTemplate(templateText),
			HumanMessagePromptTemplate.fromTemplate('{input}'),
		];
		promptTemplate = ChatPromptTemplate.fromMessages(messages);
	} else {
		// For non-chat models, create a text prompt template with Question/Answer format
		const questionSuffix =
			options.systemPromptTemplate === undefined ? '\n\nQuestion: {input}\nAnswer:' : '';

		promptTemplate = new PromptTemplate({
			template: templateText + questionSuffix,
			inputVariables: ['context', 'input'],
		});
	}

	// Create the document chain that combines the retrieved documents
	const combineDocsChain = await createStuffDocumentsChain({
		llm: model,
		prompt: promptTemplate,
	});

	// Create the retrieval chain that handles the retrieval and then passes to the combine docs chain
	const retrievalChain = await createRetrievalChain({
		combineDocsChain,
		retriever,
	});

	// Execute the chain with tracing config
	const tracingConfig = getTracingConfig(ctx);
	return await retrievalChain
		.withConfig(tracingConfig)
		.invoke({ input: query }, { signal: ctx.getExecutionCancelSignal() });
};
