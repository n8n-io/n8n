import { NodeConnectionType } from 'n8n-workflow';
import type {
	INodeTypeBaseDescription,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IDataObject,
} from 'n8n-workflow';

import { loadSummarizationChain } from 'langchain/chains';
import type { BaseLanguageModel } from '@langchain/core/language_models/base';
import type { Document } from '@langchain/core/documents';
import type { TextSplitter } from '@langchain/textsplitters';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { N8nJsonLoader } from '../../../../utils/N8nJsonLoader';
import { N8nBinaryLoader } from '../../../../utils/N8nBinaryLoader';
import { getTemplateNoticeField } from '../../../../utils/sharedFields';
import { REFINE_PROMPT_TEMPLATE, DEFAULT_PROMPT_TEMPLATE } from '../prompt';
import { getChainPromptsArgs } from '../helpers';
import { getTracingConfig } from '../../../../utils/tracing';

function getInputs(parameters: IDataObject) {
	const chunkingMode = parameters?.chunkingMode;
	const operationMode = parameters?.operationMode;
	const inputs = [
		{ displayName: '', type: NodeConnectionType.Main },
		{
			displayName: 'Model',
			maxConnections: 1,
			type: NodeConnectionType.AiLanguageModel,
			required: true,
		},
	];

	if (operationMode === 'documentLoader') {
		inputs.push({
			displayName: 'Document',
			type: NodeConnectionType.AiDocument,
			required: true,
			maxConnections: 1,
		});
		return inputs;
	}

	if (chunkingMode === 'advanced') {
		inputs.push({
			displayName: 'Text Splitter',
			type: NodeConnectionType.AiTextSplitter,
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
			outputs: [NodeConnectionType.Main],
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
					],
				},
			],
		};
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		this.logger.verbose('Executing Summarization Chain V2');
		const operationMode = this.getNodeParameter('operationMode', 0, 'nodeInputJson') as
			| 'nodeInputJson'
			| 'nodeInputBinary'
			| 'documentLoader';
		const chunkingMode = this.getNodeParameter('chunkingMode', 0, 'simple') as
			| 'simple'
			| 'advanced';

		const model = (await this.getInputConnectionData(
			NodeConnectionType.AiLanguageModel,
			0,
		)) as BaseLanguageModel;

		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
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

				// Use dedicated document loader input to load documents
				if (operationMode === 'documentLoader') {
					const documentInput = (await this.getInputConnectionData(
						NodeConnectionType.AiDocument,
						0,
					)) as N8nJsonLoader | Array<Document<Record<string, unknown>>>;

					const isN8nLoader =
						documentInput instanceof N8nJsonLoader || documentInput instanceof N8nBinaryLoader;

					processedDocuments = isN8nLoader
						? await documentInput.processItem(item, itemIndex)
						: documentInput;

					const response = await chain.withConfig(getTracingConfig(this)).invoke({
						input_documents: processedDocuments,
					});

					returnData.push({ json: { response } });
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
								NodeConnectionType.AiTextSplitter,
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
					const response = await chain.call({
						input_documents: processedItem,
					});
					returnData.push({ json: { response } });
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: error.message }, pairedItem: { item: itemIndex } });
					continue;
				}

				throw error;
			}
		}

		return [returnData];
	}
}
