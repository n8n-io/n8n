import type { Document } from '@langchain/core/documents';
import type { BaseLanguageModel } from '@langchain/core/language_models/base';
import type { ChainValues } from '@langchain/core/utils/types';
import type { TextSplitter } from '@langchain/textsplitters';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { loadSummarizationChain } from 'langchain/chains';
import type {
	INodeTypeBaseDescription,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IDataObject,
	INodeInputConfiguration,
} from 'n8n-workflow';
import { NodeConnectionTypes, sleep } from 'n8n-workflow';

import { N8nBinaryLoader } from '@utils/N8nBinaryLoader';
import { N8nJsonLoader } from '@utils/N8nJsonLoader';
import { getTemplateNoticeField } from '@utils/sharedFields';
import { getTracingConfig } from '@utils/tracing';

import { getChainPromptsArgs } from '../helpers';
import { REFINE_PROMPT_TEMPLATE, DEFAULT_PROMPT_TEMPLATE } from '../prompt';

function getInputs(parameters: IDataObject) {
	const chunkingMode = parameters?.chunkingMode;
	const operationMode = parameters?.operationMode;
	const inputs: INodeInputConfiguration[] = [
		{ displayName: '', type: 'main' },
		{
			displayName: 'Model',
			maxConnections: 1,
			type: 'ai_languageModel',
			required: true,
		},
	];

	if (operationMode === 'documentLoader') {
		inputs.push({
			displayName: 'Document',
			type: 'ai_document',
			required: true,
			maxConnections: 1,
		});
		return inputs;
	}

	if (chunkingMode === 'advanced') {
		inputs.push({
			displayName: 'Text Splitter',
			type: 'ai_textSplitter',
			required: false,
			maxConnections: 1,
		});
		return inputs;
	}
	return inputs;
}

export class ChainSummarizationV2 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			version: [2],
			defaults: {
				name: 'Summarization Chain',
				color: '#909298',
			},
			// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
			inputs: `={{ ((parameter) => { ${getInputs.toString()}; return getInputs(parameter) })($parameter) }}`,
			outputs: [NodeConnectionTypes.Main],
			credentials: [],
			properties: [
				getTemplateNoticeField(1951),
				{
					displayName: 'Data to Summarize',
					name: 'operationMode',
					noDataExpression: true,
					type: 'options',
					description: 'How to pass data into the summarization chain',
					default: 'nodeInputJson',
					options: [
						{
							name: 'Use Node Input (JSON)',
							value: 'nodeInputJson',
							description: 'Summarize the JSON data coming into this node from the previous one',
						},
						{
							name: 'Use Node Input (Binary)',
							value: 'nodeInputBinary',
							description: 'Summarize the binary data coming into this node from the previous one',
						},
						{
							name: 'Use Document Loader',
							value: 'documentLoader',
							description: 'Use a loader sub-node with more configuration options',
						},
					],
				},
				{
					displayName: 'Chunking Strategy',
					name: 'chunkingMode',
					noDataExpression: true,
					type: 'options',
					description: 'Chunk splitting strategy',
					default: 'simple',
					options: [
						{
							name: 'Simple (Define Below)',
							value: 'simple',
						},
						{
							name: 'Advanced',
							value: 'advanced',
							description: 'Use a splitter sub-node with more configuration options',
						},
					],
					displayOptions: {
						show: {
							'/operationMode': ['nodeInputJson', 'nodeInputBinary'],
						},
					},
				},
				{
					displayName: 'Characters Per Chunk',
					name: 'chunkSize',
					description:
						'Controls the max size (in terms of number of characters) of the final document chunk',
					type: 'number',
					default: 1000,
					displayOptions: {
						show: {
							'/chunkingMode': ['simple'],
						},
					},
				},
				{
					displayName: 'Chunk Overlap (Characters)',
					name: 'chunkOverlap',
					type: 'number',
					description: 'Specifies how much characters overlap there should be between chunks',
					default: 200,
					displayOptions: {
						show: {
							'/chunkingMode': ['simple'],
						},
					},
				},
				{
					displayName: 'Options',
					name: 'options',
					type: 'collection',
					default: {},
					placeholder: 'Add Option',
					options: [
						{
							displayName: 'Input Data Field Name',
							name: 'binaryDataKey',
							type: 'string',
							default: 'data',
							description:
								'The name of the field in the agent or chain’s input that contains the binary file to be processed',
							displayOptions: {
								show: {
									'/operationMode': ['nodeInputBinary'],
								},
							},
						},
						{
							displayName: 'Summarization Method and Prompts',
							name: 'summarizationMethodAndPrompts',
							type: 'fixedCollection',
							default: {
								values: {
									summarizationMethod: 'map_reduce',
									prompt: DEFAULT_PROMPT_TEMPLATE,
									combineMapPrompt: DEFAULT_PROMPT_TEMPLATE,
								},
							},
							placeholder: 'Add Option',
							typeOptions: {},
							options: [
								{
									name: 'values',
									displayName: 'Values',
									values: [
										{
											displayName: 'Summarization Method',
											name: 'summarizationMethod',
											type: 'options',
											description: 'The type of summarization to run',
											default: 'map_reduce',
											options: [
												{
													name: 'Map Reduce (Recommended)',
													value: 'map_reduce',
													description:
														'Summarize each document (or chunk) individually, then summarize those summaries',
												},
												{
													name: 'Refine',
													value: 'refine',
													description:
														'Summarize the first document (or chunk). Then update that summary based on the next document (or chunk), and repeat.',
												},
												{
													name: 'Stuff',
													value: 'stuff',
													description:
														'Pass all documents (or chunks) at once. Ideal for small datasets.',
												},
											],
										},
										{
											displayName: 'Individual Summary Prompt',
											name: 'combineMapPrompt',
											type: 'string',
											hint: 'The prompt to summarize an individual document (or chunk)',
											displayOptions: {
												hide: {
													'/options.summarizationMethodAndPrompts.values.summarizationMethod': [
														'stuff',
														'refine',
													],
												},
											},
											default: DEFAULT_PROMPT_TEMPLATE,
											typeOptions: {
												rows: 9,
											},
										},
										{
											displayName: 'Final Prompt to Combine',
											name: 'prompt',
											type: 'string',
											default: DEFAULT_PROMPT_TEMPLATE,
											hint: 'The prompt to combine individual summaries',
											displayOptions: {
												hide: {
													'/options.summarizationMethodAndPrompts.values.summarizationMethod': [
														'stuff',
														'refine',
													],
												},
											},
											typeOptions: {
												rows: 9,
											},
										},
										{
											displayName: 'Prompt',
											name: 'prompt',
											type: 'string',
											default: DEFAULT_PROMPT_TEMPLATE,
											displayOptions: {
												hide: {
													'/options.summarizationMethodAndPrompts.values.summarizationMethod': [
														'refine',
														'map_reduce',
													],
												},
											},
											typeOptions: {
												rows: 9,
											},
										},
										{
											displayName: 'Subsequent (Refine) Prompt',
											name: 'refinePrompt',
											type: 'string',
											displayOptions: {
												hide: {
													'/options.summarizationMethodAndPrompts.values.summarizationMethod': [
														'stuff',
														'map_reduce',
													],
												},
											},
											default: REFINE_PROMPT_TEMPLATE,
											hint: 'The prompt to refine the summary based on the next document (or chunk)',
											typeOptions: {
												rows: 9,
											},
										},
										{
											displayName: 'Initial Prompt',
											name: 'refineQuestionPrompt',
											type: 'string',
											displayOptions: {
												hide: {
													'/options.summarizationMethodAndPrompts.values.summarizationMethod': [
														'stuff',
														'map_reduce',
													],
												},
											},
											default: DEFAULT_PROMPT_TEMPLATE,
											hint: 'The prompt for the first document (or chunk)',
											typeOptions: {
												rows: 9,
											},
										},
									],
								},
							],
						},
						{
							displayName: 'Batch Processing',
							name: 'batching',
							type: 'collection',
							description: 'Batch processing options for rate limiting',
							default: {},
							options: [
								{
									displayName: 'Batch Size',
									name: 'batchSize',
									default: 100,
									type: 'number',
									description:
										'How many items to process in parallel. This is useful for rate limiting.',
								},
								{
									displayName: 'Delay Between Batches',
									name: 'delayBetweenBatches',
									default: 0,
									type: 'number',
									description:
										'Delay in milliseconds between batches. This is useful for rate limiting.',
								},
							],
						},
					],
				},
			],
		};
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		this.logger.debug('Executing Summarization Chain V2');
		const operationMode = this.getNodeParameter('operationMode', 0, 'nodeInputJson') as
			| 'nodeInputJson'
			| 'nodeInputBinary'
			| 'documentLoader';
		const chunkingMode = this.getNodeParameter('chunkingMode', 0, 'simple') as
			| 'simple'
			| 'advanced';

		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const { batchSize, delayBetweenBatches } = this.getNodeParameter('options.batching', 0, {
			batchSize: 100,
			delayBetweenBatches: 0,
		}) as {
			batchSize: number;
			delayBetweenBatches: number;
		};

		for (let i = 0; i < items.length; i += batchSize) {
			const batch = items.slice(i, i + batchSize);
			const batchPromises = batch.map(async (_item, batchIndex) => {
				const itemIndex = i + batchIndex;

				const model = (await this.getInputConnectionData(
					NodeConnectionTypes.AiLanguageModel,
					0,
				)) as BaseLanguageModel;

				const summarizationMethodAndPrompts = this.getNodeParameter(
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
				const item = items[itemIndex];

				let processedDocuments: Document[];
				let output: ChainValues = {};

				// Use dedicated document loader input to load documents
				if (operationMode === 'documentLoader') {
					const documentInput = (await this.getInputConnectionData(
						NodeConnectionTypes.AiDocument,
						0,
					)) as N8nJsonLoader | Array<Document<Record<string, unknown>>>;

					const isN8nLoader =
						documentInput instanceof N8nJsonLoader || documentInput instanceof N8nBinaryLoader;

					processedDocuments = isN8nLoader
						? await documentInput.processItem(item, itemIndex)
						: documentInput;

					output = await chain.withConfig(getTracingConfig(this)).invoke({
						input_documents: processedDocuments,
					});
				}

				// Take the input and use binary or json loader
				if (['nodeInputJson', 'nodeInputBinary'].includes(operationMode)) {
					let textSplitter: TextSplitter | undefined;

					switch (chunkingMode) {
						// In simple mode we use recursive character splitter with default settings
						case 'simple':
							const chunkSize = this.getNodeParameter('chunkSize', itemIndex, 1000) as number;
							const chunkOverlap = this.getNodeParameter('chunkOverlap', itemIndex, 200) as number;

							textSplitter = new RecursiveCharacterTextSplitter({ chunkOverlap, chunkSize });
							break;

						// In advanced mode user can connect text splitter node so we just retrieve it
						case 'advanced':
							textSplitter = (await this.getInputConnectionData(
								NodeConnectionTypes.AiTextSplitter,
								0,
							)) as TextSplitter | undefined;
							break;
						default:
							break;
					}

					let processor: N8nJsonLoader | N8nBinaryLoader;
					if (operationMode === 'nodeInputBinary') {
						const binaryDataKey = this.getNodeParameter(
							'options.binaryDataKey',
							itemIndex,
							'data',
						) as string;
						processor = new N8nBinaryLoader(this, 'options.', binaryDataKey, textSplitter);
					} else {
						processor = new N8nJsonLoader(this, 'options.', textSplitter);
					}

					const processedItem = await processor.processItem(item, itemIndex);
					output = await chain.invoke(
						{
							input_documents: processedItem,
						},
						{ signal: this.getExecutionCancelSignal() },
					);
				}
				return output;
			});

			const batchResults = await Promise.allSettled(batchPromises);
			batchResults.forEach((response, index) => {
				if (response.status === 'rejected') {
					const error = response.reason as Error;
					if (this.continueOnFail()) {
						returnData.push({
							json: { error: error.message },
							pairedItem: { item: i + index },
						});
					} else {
						throw error;
					}
				} else {
					const output = response.value;
					returnData.push({ json: { output } });
				}
			});

			// Add delay between batches if not the last batch
			if (i + batchSize < items.length && delayBetweenBatches > 0) {
				await sleep(delayBetweenBatches);
			}
		}

		return [returnData];
	}
}
