/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import {
	NodeConnectionType,
	type IExecuteFunctions,
	type INodeType,
	type INodeTypeDescription,
	type SupplyData,
} from 'n8n-workflow';
import { OllamaEmbeddings } from 'langchain/embeddings/ollama';
import { logWrapper } from '../../../utils/logWrapper';
import { getConnectionHintNoticeField } from '../../../utils/sharedFields';
import { ollamaDescription, ollamaModel } from '../../llms/LMOllama/description';

export class EmbeddingsOllama implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Embeddings Ollama',
		name: 'embeddingsOllama',
		icon: 'file:ollama.svg',
		group: ['transform'],
		version: 1,
		description: 'Use Ollama Embeddings',
		defaults: {
			name: 'Embeddings Ollama',
		},
		...ollamaDescription,
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Embeddings'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.embeddingsollama/',
					},
				],
			},
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: [NodeConnectionType.AiEmbedding],
		outputNames: ['Embeddings'],
		properties: [getConnectionHintNoticeField([NodeConnectionType.AiVectorStore]), ollamaModel],
	};

	async supplyData(this: IExecuteFunctions, itemIndex: number): Promise<SupplyData> {
		this.logger.verbose('Supply data for embeddings Ollama');
		const modelName = this.getNodeParameter('model', itemIndex) as string;
		const credentials = await this.getCredentials('ollamaApi');

		const embeddings = new OllamaEmbeddings({
			baseUrl: credentials.baseUrl as string,
			model: modelName,
		});

		return {
			response: logWrapper(embeddings, this),
		};
	}
}
