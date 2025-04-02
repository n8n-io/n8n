import type { Document } from '@langchain/core/documents';
import type { BaseLanguageModel } from '@langchain/core/language_models/base';
import { PromptTemplate } from '@langchain/core/prompts';
import type { SummarizationChainParams } from 'langchain/chains';
import { loadSummarizationChain } from 'langchain/chains';
import {
	NodeConnectionTypes,
	type INodeTypeBaseDescription,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

import { N8nBinaryLoader } from '@utils/N8nBinaryLoader';
import { N8nJsonLoader } from '@utils/N8nJsonLoader';
import { getTemplateNoticeField } from '@utils/sharedFields';

import { REFINE_PROMPT_TEMPLATE, DEFAULT_PROMPT_TEMPLATE } from '../prompt';

export class ChainSummarizationV1 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			version: 1,
			defaults: {
				name: 'Summarization Chain',
				color: '#909298',
			},
			// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
			inputs: [
				NodeConnectionTypes.Main,
				{
					displayName: 'Model',
					maxConnections: 1,
					type: NodeConnectionTypes.AiLanguageModel,
					required: true,
				},
				{
					displayName: 'Document',
					maxConnections: 1,
					type: NodeConnectionTypes.AiDocument,
					required: true,
				},
			],
			outputs: [NodeConnectionTypes.Main],
			credentials: [],
			properties: [
				getTemplateNoticeField(1951),
				{
					displayName: 'Type',
					name: 'type',
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
							description: 'Pass all documents (or chunks) at once. Ideal for small datasets.',
						},
					],
				},
				{
					displayName: 'Options',
					name: 'options',
					type: 'collection',
					default: {},
					placeholder: 'Add Option',
					options: [
						{
							displayName: 'Final Prompt to Combine',
							name: 'combineMapPrompt',
							type: 'string',
							hint: 'The prompt to combine individual summaries',
							displayOptions: {
								show: {
									'/type': ['map_reduce'],
								},
							},
							default: DEFAULT_PROMPT_TEMPLATE,
							typeOptions: {
								rows: 6,
							},
						},
						{
							displayName: 'Individual Summary Prompt',
							name: 'prompt',
							type: 'string',
							default: DEFAULT_PROMPT_TEMPLATE,
							hint: 'The prompt to summarize an individual document (or chunk)',
							displayOptions: {
								show: {
									'/type': ['map_reduce'],
								},
							},
							typeOptions: {
								rows: 6,
							},
						},
						{
							displayName: 'Prompt',
							name: 'prompt',
							type: 'string',
							default: DEFAULT_PROMPT_TEMPLATE,
							displayOptions: {
								show: {
									'/type': ['stuff'],
								},
							},
							typeOptions: {
								rows: 6,
							},
						},
						{
							displayName: 'Subsequent (Refine) Prompt',
							name: 'refinePrompt',
							type: 'string',
							displayOptions: {
								show: {
									'/type': ['refine'],
								},
							},
							default: REFINE_PROMPT_TEMPLATE,
							hint: 'The prompt to refine the summary based on the next document (or chunk)',
							typeOptions: {
								rows: 6,
							},
						},
						{
							displayName: 'Initial Prompt',
							name: 'refineQuestionPrompt',
							type: 'string',
							displayOptions: {
								show: {
									'/type': ['refine'],
								},
							},
							default: DEFAULT_PROMPT_TEMPLATE,
							hint: 'The prompt for the first document (or chunk)',
							typeOptions: {
								rows: 6,
							},
						},
					],
				},
			],
		};
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		this.logger.debug('Executing Vector Store QA Chain');
		const type = this.getNodeParameter('type', 0) as 'map_reduce' | 'stuff' | 'refine';

		const model = (await this.getInputConnectionData(
			NodeConnectionTypes.AiLanguageModel,
			0,
		)) as BaseLanguageModel;

		const documentInput = (await this.getInputConnectionData(NodeConnectionTypes.AiDocument, 0)) as
			| N8nJsonLoader
			| Array<Document<Record<string, unknown>>>;

		const options = this.getNodeParameter('options', 0, {}) as {
			prompt?: string;
			refineQuestionPrompt?: string;
			refinePrompt?: string;
			combineMapPrompt?: string;
		};

		const chainArgs: SummarizationChainParams = {
			type,
		};

		// Map reduce prompt override
		if (type === 'map_reduce') {
			const mapReduceArgs = chainArgs as SummarizationChainParams & {
				type: 'map_reduce';
			};
			if (options.combineMapPrompt) {
				mapReduceArgs.combineMapPrompt = new PromptTemplate({
					template: options.combineMapPrompt,
					inputVariables: ['text'],
				});
			}
			if (options.prompt) {
				mapReduceArgs.combinePrompt = new PromptTemplate({
					template: options.prompt,
					inputVariables: ['text'],
				});
			}
		}

		// Stuff prompt override
		if (type === 'stuff') {
			const stuffArgs = chainArgs as SummarizationChainParams & {
				type: 'stuff';
			};
			if (options.prompt) {
				stuffArgs.prompt = new PromptTemplate({
					template: options.prompt,
					inputVariables: ['text'],
				});
			}
		}

		// Refine prompt override
		if (type === 'refine') {
			const refineArgs = chainArgs as SummarizationChainParams & {
				type: 'refine';
			};

			if (options.refinePrompt) {
				refineArgs.refinePrompt = new PromptTemplate({
					template: options.refinePrompt,
					inputVariables: ['existing_answer', 'text'],
				});
			}

			if (options.refineQuestionPrompt) {
				refineArgs.questionPrompt = new PromptTemplate({
					template: options.refineQuestionPrompt,
					inputVariables: ['text'],
				});
			}
		}

		const chain = loadSummarizationChain(model, chainArgs);

		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			let processedDocuments: Document[];
			if (documentInput instanceof N8nJsonLoader || documentInput instanceof N8nBinaryLoader) {
				processedDocuments = await documentInput.processItem(items[itemIndex], itemIndex);
			} else {
				processedDocuments = documentInput;
			}

			const response = await chain.call({
				input_documents: processedDocuments,
			});

			returnData.push({ json: { response } });
		}

		return [returnData];
	}
}
