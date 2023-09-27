import {
	NodeConnectionType,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

import { loadSummarizationChain } from 'langchain/chains';
import type { BaseLanguageModel } from 'langchain/dist/base_language';
import type { Document } from 'langchain/document';
import { N8nJsonLoader } from '../../../utils/N8nJsonLoader';
import { N8nBinaryLoader } from '../../../utils/N8nBinaryLoader';

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
				displayName: 'Mode',
				name: 'mode',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Run Once for All Items',
						value: 'runOnceForAllItems',
						description: 'Run this chain only once, no matter how many input items there are',
					},
					{
						name: 'Run Once for Each Item',
						value: 'runOnceForEachItem',
						description: 'Run this chain as many times as there are input items',
					},
				],
				default: 'runOnceForAllItems',
			},
			{
				displayName: 'Type',
				name: 'type',
				type: 'options',
				description: 'The type of summarization to run',
				default: 'map_reduce',
				options: [
					{
						name: 'Map Reduce',
						value: 'map_reduce',
					},
					{
						name: 'Refine',
						value: 'refine',
					},
					{
						name: 'Stuff',
						value: 'stuff',
					},
				],
			},
			{
				displayName: 'Specify the document to load in the document loader sub-node',
				name: 'notice',
				type: 'notice',
				default: '',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		this.logger.verbose('Executing Vector Store QA Chain');
		const runMode = this.getNodeParameter('mode', 0) as string;
		const type = this.getNodeParameter('type', 0) as 'map_reduce' | 'stuff' | 'refine';

		const model = (await this.getInputConnectionData(
			NodeConnectionType.AiLanguageModel,
			0,
		)) as BaseLanguageModel;

		const documentInput = (await this.getInputConnectionData(NodeConnectionType.AiDocument, 0)) as
			| N8nJsonLoader
			| Array<Document<Record<string, unknown>>>;

		const chain = loadSummarizationChain(model, { type });

		const items = this.getInputData();
		if (runMode === 'runOnceForAllItems') {
			let processedDocuments: Document[];
			if (documentInput instanceof N8nJsonLoader || documentInput instanceof N8nBinaryLoader) {
				processedDocuments = await documentInput.process(items);
			} else {
				processedDocuments = documentInput;
			}

			const response = await chain.call({
				input_documents: processedDocuments,
			});

			return this.prepareOutputData([{ json: { response } }]);
		}

		// Run for each item
		const returnData: INodeExecutionData[] = [];
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			let processedDocuments: Document[];
			if (documentInput instanceof N8nJsonLoader || documentInput instanceof N8nBinaryLoader) {
				processedDocuments = await documentInput.process([items[itemIndex]]);
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
