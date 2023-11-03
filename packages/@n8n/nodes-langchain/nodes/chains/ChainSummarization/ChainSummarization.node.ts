import {
	NodeConnectionType,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

import type { SummarizationChainParams } from 'langchain/chains';
import { loadSummarizationChain } from 'langchain/chains';
import type { BaseLanguageModel } from 'langchain/dist/base_language';
import type { Document } from 'langchain/document';
import { PromptTemplate } from 'langchain/prompts';
import { N8nJsonLoader } from '../../../utils/N8nJsonLoader';
import { N8nBinaryLoader } from '../../../utils/N8nBinaryLoader';
import { REFINE_PROMPT_TEMPLATE, DEFAULT_PROMPT_TEMPLATE } from './prompt';

export class ChainSummarization implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Summarization Chain',
		name: 'chainSummarization',
		icon: 'fa:link',
		group: ['transform'],
		version: 1,
		description: 'Transforms text into a concise summary',

		defaults: {
			name: 'Summarization Chain',
			color: '#909298',
		},
		codex: {
			alias: ['LangChain'],
			categories: ['AI'],
			subcategories: {
				AI: ['Chains'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.chainsummarization/',
					},
				],
			},
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [
			NodeConnectionType.Main,
			{
				displayName: 'Model',
				maxConnections: 1,
				type: NodeConnectionType.AiLanguageModel,
				required: true,
			},
			{
				displayName: 'Document',
				maxConnections: 1,
				type: NodeConnectionType.AiDocument,
				required: true,
			},
		],
		outputs: [NodeConnectionType.Main],
		credentials: [],
		properties: [
			{
				displayName: 'Specify the document to load in the document loader sub-node',
				name: 'notice',
				type: 'notice',
				default: '',
			},
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
							'Individually summarizes each document using an LLM (Map step), then combines these summaries into a global summary (Reduce step), with an optional compression step to ensure fit',
					},
					{
						name: 'Refine',
						value: 'refine',
						description:
							'Iteratively updates its answer by looping over the documents and passing the current document along with the latest intermediate answer to an LLM, suitable for analyzing large document sets, albeit with more LLM calls',
					},
					{
						name: 'Stuff',
						value: 'stuff',
						description:
							'Inserts all documents into a prompt, then passes it to an LLM for summarization, ideal for small document sets',
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
						displayName: 'Combine Map Prompt',
						name: 'combineMapPrompt',
						type: 'string',
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
						displayName: 'Prompt',
						name: 'prompt',
						type: 'string',
						default: DEFAULT_PROMPT_TEMPLATE,
						displayOptions: {
							hide: {
								'/type': ['refine'],
							},
						},
						typeOptions: {
							rows: 6,
						},
					},
					{
						displayName: 'Refine Prompt',
						name: 'refinePrompt',
						type: 'string',
						displayOptions: {
							show: {
								'/type': ['refine'],
							},
						},
						default: REFINE_PROMPT_TEMPLATE,
						typeOptions: {
							rows: 6,
						},
					},
					{
						displayName: 'Refine Question Prompt',
						name: 'refineQuestionPrompt',
						type: 'string',
						displayOptions: {
							show: {
								'/type': ['refine'],
							},
						},
						default: DEFAULT_PROMPT_TEMPLATE,
						typeOptions: {
							rows: 6,
						},
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		this.logger.verbose('Executing Vector Store QA Chain');
		const type = this.getNodeParameter('type', 0) as 'map_reduce' | 'stuff' | 'refine';

		const model = (await this.getInputConnectionData(
			NodeConnectionType.AiLanguageModel,
			0,
		)) as BaseLanguageModel;

		const documentInput = (await this.getInputConnectionData(NodeConnectionType.AiDocument, 0)) as
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

		return this.prepareOutputData(returnData);
	}
}
