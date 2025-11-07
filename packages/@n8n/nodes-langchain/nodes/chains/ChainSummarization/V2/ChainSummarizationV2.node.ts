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

import { getBatchingOptionFields, getTemplateNoticeField } from '@utils/sharedFields';

import { processItem } from './processItem';
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
			version: [2, 2.1],
			defaults: {
				name: 'Summarization Chain',
				color: '#909298',
			},

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
						getBatchingOptionFields({
							show: {
								'@version': [{ _cnd: { gte: 2.1 } }],
							},
						}),
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

		const batchSize = this.getNodeParameter('options.batching.batchSize', 0, 5) as number;
		const delayBetweenBatches = this.getNodeParameter(
			'options.batching.delayBetweenBatches',
			0,
			0,
		) as number;

		if (this.getNode().typeVersion >= 2.1 && batchSize > 1) {
			// Batch processing
			for (let i = 0; i < items.length; i += batchSize) {
				const batch = items.slice(i, i + batchSize);
				const batchPromises = batch.map(async (item, batchItemIndex) => {
					const itemIndex = i + batchItemIndex;
					return await processItem(this, itemIndex, item, operationMode, chunkingMode);
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
		} else {
			for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
				try {
					const response = await processItem(
						this,
						itemIndex,
						items[itemIndex],
						operationMode,
						chunkingMode,
					);
					returnData.push({ json: { response } });
				} catch (error) {
					if (this.continueOnFail()) {
						returnData.push({ json: { error: error.message }, pairedItem: { item: itemIndex } });
						continue;
					}

					throw error;
				}
			}
		}

		return [returnData];
	}
}
