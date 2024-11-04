import type {
	INodeType,
	INodeTypeDescription,
	ISupplyDataFunctions,
	SupplyData,
} from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';

import { VectorStoreQATool } from 'langchain/tools';
import type { VectorStore } from '@langchain/core/vectorstores';
import type { BaseLanguageModel } from '@langchain/core/language_models/base';
import { VectorDBQAChain } from 'langchain/chains';
import { getConnectionHintNoticeField } from '../../../utils/sharedFields';
import { logWrapper } from '../../../utils/logWrapper';

export class ToolVectorStore implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Vector Store Tool',
		name: 'toolVectorStore',
		icon: 'fa:database',
		group: ['transform'],
		version: [1],
		description: 'Retrieve context from vector store',
		defaults: {
			name: 'Vector Store Tool',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Tools'],
				Tools: ['Other Tools'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.toolvectorstore/',
					},
				],
			},
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [
			{
				displayName: 'Vector Store',
				maxConnections: 1,
				type: NodeConnectionType.AiVectorStore,
				required: true,
			},
			{
				displayName: 'Model',
				maxConnections: 1,
				type: NodeConnectionType.AiLanguageModel,
				required: true,
			},
		],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: [NodeConnectionType.AiTool],
		outputNames: ['Tool'],
		properties: [
			getConnectionHintNoticeField([NodeConnectionType.AiAgent]),
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				placeholder: 'e.g. company_knowledge_base',
				validateType: 'string-alphanumeric',
				description: 'Name of the vector store',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				placeholder: 'Retrieves data about [insert information about your data here]...',
				typeOptions: {
					rows: 3,
				},
			},
			{
				displayName: 'Limit',
				name: 'topK',
				type: 'number',
				default: 4,
				description: 'The maximum number of results to return',
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const name = this.getNodeParameter('name', itemIndex) as string;
		const toolDescription = this.getNodeParameter('description', itemIndex) as string;
		const topK = this.getNodeParameter('topK', itemIndex, 4) as number;

		const vectorStore = (await this.getInputConnectionData(
			NodeConnectionType.AiVectorStore,
			itemIndex,
		)) as VectorStore;

		const llm = (await this.getInputConnectionData(
			NodeConnectionType.AiLanguageModel,
			0,
		)) as BaseLanguageModel;

		const description = VectorStoreQATool.getDescription(name, toolDescription);
		const vectorStoreTool = new VectorStoreQATool(name, description, {
			llm,
			vectorStore,
		});

		vectorStoreTool.chain = VectorDBQAChain.fromLLM(llm, vectorStore, {
			k: topK,
		});

		return {
			response: logWrapper(vectorStoreTool, this),
		};
	}
}
