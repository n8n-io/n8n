import type { BaseLanguageModel } from '@langchain/core/language_models/base';
import type { VectorStore } from '@langchain/core/vectorstores';
import { VectorDBQAChain } from 'langchain/chains';
import { VectorStoreQATool } from 'langchain/tools';
import type {
	INodeType,
	INodeTypeDescription,
	ISupplyDataFunctions,
	SupplyData,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { nodeNameToToolName } from '@utils/helpers';
import { logWrapper } from '@utils/logWrapper';
import { getConnectionHintNoticeField } from '@utils/sharedFields';

export class ToolVectorStore implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Vector Store Question Answer Tool',
		name: 'toolVectorStore',
		icon: 'fa:database',
		iconColor: 'black',
		group: ['transform'],
		version: [1, 1.1],
		description: 'Answer questions with a vector store',
		defaults: {
			name: 'Answer questions with a vector store',
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
				type: NodeConnectionTypes.AiVectorStore,
				required: true,
			},
			{
				displayName: 'Model',
				maxConnections: 1,
				type: NodeConnectionTypes.AiLanguageModel,
				required: true,
			},
		],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: [NodeConnectionTypes.AiTool],
		outputNames: ['Tool'],
		properties: [
			getConnectionHintNoticeField([NodeConnectionTypes.AiAgent]),
			{
				displayName: 'Data Name',
				name: 'name',
				type: 'string',
				default: '',
				placeholder: 'e.g. users_info',
				validateType: 'string-alphanumeric',
				description:
					'Name of the data in vector store. This will be used to fill this tool description: Useful for when you need to answer questions about [name]. Whenever you need information about [data description], you should ALWAYS use this. Input should be a fully formed question.',
				displayOptions: {
					show: {
						'@version': [1],
					},
				},
			},
			{
				displayName: 'Description of Data',
				name: 'description',
				type: 'string',
				default: '',
				placeholder: "[Describe your data here, e.g. a user's name, email, etc.]",
				description:
					'Describe the data in vector store. This will be used to fill this tool description: Useful for when you need to answer questions about [name]. Whenever you need information about [data description], you should ALWAYS use this. Input should be a fully formed question.',
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
		const node = this.getNode();
		const { typeVersion } = node;
		const name =
			typeVersion <= 1
				? (this.getNodeParameter('name', itemIndex) as string)
				: nodeNameToToolName(node);
		const toolDescription = this.getNodeParameter('description', itemIndex) as string;
		const topK = this.getNodeParameter('topK', itemIndex, 4) as number;

		const vectorStore = (await this.getInputConnectionData(
			NodeConnectionTypes.AiVectorStore,
			itemIndex,
		)) as VectorStore;

		const llm = (await this.getInputConnectionData(
			NodeConnectionTypes.AiLanguageModel,
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
