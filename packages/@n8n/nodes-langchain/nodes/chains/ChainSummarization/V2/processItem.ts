import type { Document } from '@langchain/core/documents';
import type { BaseLanguageModel } from '@langchain/core/language_models/base';
import type { ChainValues } from '@langchain/core/utils/types';
import { RecursiveCharacterTextSplitter, type TextSplitter } from '@langchain/textsplitters';
import { loadSummarizationChain } from 'langchain/chains';
import { type IExecuteFunctions, type INodeExecutionData, NodeConnectionTypes } from 'n8n-workflow';

import { N8nBinaryLoader } from '@utils/N8nBinaryLoader';
import { N8nJsonLoader } from '@utils/N8nJsonLoader';
import { getTracingConfig } from '@utils/tracing';

import { getChainPromptsArgs } from '../helpers';

export async function processItem(
	ctx: IExecuteFunctions,
	itemIndex: number,
	item: INodeExecutionData,
	operationMode: string,
	chunkingMode: 'simple' | 'advanced' | 'none',
): Promise<ChainValues | undefined> {
	const model = (await ctx.getInputConnectionData(
		NodeConnectionTypes.AiLanguageModel,
		0,
	)) as BaseLanguageModel;

	const summarizationMethodAndPrompts = ctx.getNodeParameter(
		'options.summarizationMethodAndPrompts.values',
		itemIndex,
		{},
	) as {
		prompt?: string;
		refineQuestionPrompt?: string;
		refinePrompt?: string;
		summarizationMethod: 'map_reduce' | 'stuff' | 'refine';
		combineMapPrompt?: string;
	};

	const chainArgs = getChainPromptsArgs(
		summarizationMethodAndPrompts.summarizationMethod ?? 'map_reduce',
		summarizationMethodAndPrompts,
	);

	const chain = loadSummarizationChain(model, chainArgs);

	let processedDocuments: Document[];

	// Use dedicated document loader input to load documents
	if (operationMode === 'documentLoader') {
		const documentInput = (await ctx.getInputConnectionData(NodeConnectionTypes.AiDocument, 0)) as
			| N8nJsonLoader
			| Array<Document<Record<string, unknown>>>;

		const isN8nLoader =
			documentInput instanceof N8nJsonLoader || documentInput instanceof N8nBinaryLoader;

		processedDocuments = isN8nLoader
			? await documentInput.processItem(item, itemIndex)
			: documentInput;

		return await chain.withConfig(getTracingConfig(ctx)).invoke({
			input_documents: processedDocuments,
		});
	} else if (['nodeInputJson', 'nodeInputBinary'].includes(operationMode)) {
		// Take the input and use binary or json loader
		let textSplitter: TextSplitter | undefined;

		switch (chunkingMode) {
			// In simple mode we use recursive character splitter with default settings
			case 'simple':
				const chunkSize = ctx.getNodeParameter('chunkSize', itemIndex, 1000) as number;
				const chunkOverlap = ctx.getNodeParameter('chunkOverlap', itemIndex, 200) as number;

				textSplitter = new RecursiveCharacterTextSplitter({ chunkOverlap, chunkSize });
				break;

			// In advanced mode user can connect text splitter node so we just retrieve it
			case 'advanced':
				textSplitter = (await ctx.getInputConnectionData(NodeConnectionTypes.AiTextSplitter, 0)) as
					| TextSplitter
					| undefined;
				break;
			default:
				break;
		}

		let processor: N8nJsonLoader | N8nBinaryLoader;
		if (operationMode === 'nodeInputBinary') {
			const binaryDataKey = ctx.getNodeParameter(
				'options.binaryDataKey',
				itemIndex,
				'data',
			) as string;
			processor = new N8nBinaryLoader(ctx, 'options.', binaryDataKey, textSplitter);
		} else {
			processor = new N8nJsonLoader(ctx, 'options.', textSplitter);
		}

		const processedItem = await processor.processItem(item, itemIndex);
		return await chain.invoke(
			{
				input_documents: processedItem,
			},
			{ signal: ctx.getExecutionCancelSignal() },
		);
	}
	return undefined;
}
