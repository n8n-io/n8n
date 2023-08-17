import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
// import { NodeOperationError } from 'n8n-workflow';

// import type { Tool } from 'langchain/tools';
// import type { BaseChatMemory } from 'langchain/memory';
// import type { InitializeAgentExecutorOptions } from 'langchain/agents';
// import { initializeAgentExecutorWithOptions } from 'langchain/agents';
import { RetrievalQAChain } from 'langchain/chains';
import type { BaseLanguageModel } from 'langchain/dist/base_language';
import { getSingleInputConnectionData } from '../../utils/helpers';
import { BaseRetriever } from 'langchain/schema/retriever';

export class LangChainChainRetrievalQA implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'LangChain - Retrieval QA Chain',
		name: 'langChainChainRetrievalQa',
		icon: 'fa:link',
		group: ['transform'],
		version: 1,
		description: 'LangChain',
		defaults: {
			name: 'LangChain - Retrieval QA Chain',
			color: '#408080',
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: ['main', 'vectorRetriever', 'languageModel'],
		inputNames: ['','Vector Retriever', 'Language Model'],
		outputs: ['main', 'chain'],
		outputNames: ['', 'Chain'],
		credentials: [],
		properties: [
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				default: '',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const model = await getSingleInputConnectionData(this, 'languageModel', 'Language Model') as BaseLanguageModel;
		const vectorRetriever = await getSingleInputConnectionData(this, 'vectorRetriever', 'Vector Store Retriever') as BaseRetriever;
		const chain = RetrievalQAChain.fromLLM(model, vectorRetriever);

		const items = this.getInputData();

		const returnData: INodeExecutionData[] = [];
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			const query = this.getNodeParameter('query', itemIndex) as string;

			const response = await chain.call({ query })
			returnData.push({ json: { response } });
		}
		return this.prepareOutputData(returnData);
	}
}
