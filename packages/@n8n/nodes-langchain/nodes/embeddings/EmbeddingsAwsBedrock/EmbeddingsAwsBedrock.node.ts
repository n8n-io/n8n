import { BedrockEmbeddings } from '@langchain/aws';
import {
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';

import { logWrapper } from '@utils/logWrapper';
import { getConnectionHintNoticeField } from '@utils/sharedFields';

export class EmbeddingsAwsBedrock implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Embeddings AWS Bedrock',
		name: 'embeddingsAwsBedrock',
		icon: 'file:bedrock.svg',
		credentials: [
			{
				name: 'aws',
				required: true,
			},
		],
		group: ['transform'],
		version: 1,
		description: 'Use Embeddings AWS Bedrock',
		defaults: {
			name: 'Embeddings AWS Bedrock',
		},

		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Embeddings'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.embeddingsawsbedrock/',
					},
				],
			},
		},

		inputs: [],

		outputs: [NodeConnectionTypes.AiEmbedding],
		outputNames: ['Embeddings'],
		requestDefaults: {
			ignoreHttpStatusErrors: true,
			baseURL: '=https://bedrock.{{$credentials?.region ?? "eu-central-1"}}.amazonaws.com',
		},
		properties: [
			getConnectionHintNoticeField([NodeConnectionTypes.AiVectorStore]),
			{
				displayName: 'Model',
				name: 'model',
				type: 'options',
				description:
					'The model which will generate the completion. <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/foundation-models.html">Learn more</a>.',
				typeOptions: {
					loadOptions: {
						routing: {
							request: {
								method: 'GET',
								url: '/foundation-models?byInferenceType=ON_DEMAND&byOutputModality=EMBEDDING',
							},
							output: {
								postReceive: [
									{
										type: 'rootProperty',
										properties: {
											property: 'modelSummaries',
										},
									},
									{
										type: 'setKeyValue',
										properties: {
											name: '={{$responseItem.modelName}}',
											description: '={{$responseItem.modelArn}}',
											value: '={{$responseItem.modelId}}',
										},
									},
									{
										type: 'sort',
										properties: {
											key: 'name',
										},
									},
								],
							},
						},
					},
				},
				routing: {
					send: {
						type: 'body',
						property: 'model',
					},
				},
				default: '',
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const credentials = await this.getCredentials('aws');
		const modelName = this.getNodeParameter('model', itemIndex) as string;

		const embeddings = new BedrockEmbeddings({
			region: credentials.region as string,
			model: modelName,
			maxRetries: 3,
			credentials: {
				secretAccessKey: credentials.secretAccessKey as string,
				accessKeyId: credentials.accessKeyId as string,
				sessionToken: credentials.sessionToken as string,
			},
		});

		return {
			response: logWrapper(embeddings, this),
		};
	}
}
