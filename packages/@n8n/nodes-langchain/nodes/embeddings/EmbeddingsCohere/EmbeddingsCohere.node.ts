/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import {
	NodeConnectionType,
	type IExecuteFunctions,
	type INodeType,
	type INodeTypeDescription,
	type SupplyData,
} from 'n8n-workflow';
import { CohereEmbeddings } from '@langchain/cohere';
import { logWrapper } from '../../../utils/logWrapper';
import { getConnectionHintNoticeField } from '../../../utils/sharedFields';

export class EmbeddingsCohere implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Embeddings Cohere',
		name: 'embeddingsCohere',
		icon: 'file:cohere.svg',
		group: ['transform'],
		version: 1,
		description: 'Use Cohere Embeddings',
		defaults: {
			name: 'Embeddings Cohere',
		},
		requestDefaults: {
			ignoreHttpStatusErrors: true,
			baseURL: '={{ $credentials.host }}',
		},
		credentials: [
			{
				name: 'cohereApi',
				required: true,
			},
		],
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Embeddings'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.embeddingscohere/',
					},
				],
			},
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: [NodeConnectionType.AiEmbedding],
		outputNames: ['Embeddings'],
		properties: [
			getConnectionHintNoticeField([NodeConnectionType.AiVectorStore]),
			{
				displayName:
					'Each model is using different dimensional density for embeddings. Please make sure to use the same dimensionality for your vector store. The default model is using 768-dimensional embeddings.',
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Model',
				name: 'modelName',
				type: 'options',
				description:
					'The model which will generate the embeddings. <a href="https://docs.cohere.com/docs/models">Learn more</a>.',
				default: 'embed-english-v2.0',
				options: [
					{
						name: 'Embed-English-v2.0(4096 Dimensions)',
						value: 'embed-english-v2.0',
					},
					{
						name: 'Embed-English-Light-v2.0(1024 Dimensions)',
						value: 'embed-english-light-v2.0',
					},
					{
						name: 'Embed-Multilingual-v2.0(768 Dimensions)',
						value: 'embed-multilingual-v2.0',
					},
				],
			},
		],
	};

	async supplyData(this: IExecuteFunctions, itemIndex: number): Promise<SupplyData> {
		this.logger.verbose('Supply data for embeddings Cohere');
		const modelName = this.getNodeParameter('modelName', itemIndex, 'embed-english-v2.0') as string;
		const credentials = await this.getCredentials('cohereApi');
		const embeddings = new CohereEmbeddings({
			apiKey: credentials.apiKey as string,
			model: modelName,
		});

		return {
			response: logWrapper(embeddings, this),
		};
	}
}
