/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import {
	NodeConnectionType,
	type IExecuteFunctions,
	type INodeType,
	type INodeTypeDescription,
	type SupplyData,
} from 'n8n-workflow';
import { HuggingFaceInferenceEmbeddings } from 'langchain/embeddings/hf';
import { logWrapper } from '../../../utils/logWrapper';
import { getConnectionHintNoticeField } from '../../../utils/sharedFields';

export class EmbeddingsHuggingFaceInference implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Embeddings Hugging Face Inference',
		name: 'embeddingsHuggingFaceInference',
		icon: 'file:huggingface.svg',
		group: ['transform'],
		version: 1,
		description: 'Use HuggingFace Inference Embeddings',
		defaults: {
			name: 'Embeddings HuggingFace Inference',
		},
		credentials: [
			{
				name: 'huggingFaceApi',
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
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.embeddingshuggingfaceinference/',
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
				displayName: 'Model Name',
				name: 'modelName',
				type: 'string',
				default: 'sentence-transformers/distilbert-base-nli-mean-tokens',
				description: 'The model name to use from HuggingFace library',
			},
			{
				displayName: 'Options',
				name: 'options',
				placeholder: 'Add Option',
				description: 'Additional options to add',
				type: 'collection',
				default: {},
				options: [
					{
						displayName: 'Custom Inference Endpoint',
						name: 'endpointUrl',
						default: '',
						description: 'Custom endpoint URL',
						type: 'string',
					},
				],
			},
		],
	};

	async supplyData(this: IExecuteFunctions, itemIndex: number): Promise<SupplyData> {
		this.logger.verbose('Supply data for embeddings HF Inference');
		const model = this.getNodeParameter(
			'modelName',
			itemIndex,
			'sentence-transformers/distilbert-base-nli-mean-tokens',
		) as string;
		const credentials = await this.getCredentials('huggingFaceApi');
		const options = this.getNodeParameter('options', itemIndex, {}) as object;

		const embeddings = new HuggingFaceInferenceEmbeddings({
			apiKey: credentials.apiKey as string,
			model,
			...options,
		});

		return {
			response: logWrapper(embeddings, this),
		};
	}
}
