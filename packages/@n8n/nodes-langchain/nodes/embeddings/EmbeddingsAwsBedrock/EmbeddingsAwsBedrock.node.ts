import type { BedrockRuntimeClientConfig } from '@aws-sdk/client-bedrock-runtime';
import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { BedrockEmbeddings } from '@langchain/aws';
import { getNodeProxyAgent, logWrapper, getConnectionHintNoticeField } from '@n8n/ai-utilities';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import { resolveAwsCredentials } from '@utils/aws/resolveAwsCredentials';
import { getAwsDomain, validateBedrockEndpointOverride } from 'n8n-nodes-base/aws-credentials';
import { awsNodeAuthOptions, awsNodeCredentials } from 'n8n-nodes-base/dist/nodes/Aws/utils';
import {
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';

export class EmbeddingsAwsBedrock implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Embeddings AWS Bedrock',
		name: 'embeddingsAwsBedrock',
		icon: 'file:bedrock.svg',
		credentials: awsNodeCredentials,
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
			awsNodeAuthOptions,
			getConnectionHintNoticeField([NodeConnectionTypes.AiVectorStore]),
			{
				displayName: 'Model',
				name: 'model',
				type: 'options',
				allowArbitraryValues: true, // Hide issues when model name is specified in the expression and does not match any of the options
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
		const { region, credentials, bedrockRuntimeEndpoint } = await resolveAwsCredentials(
			this,
			itemIndex,
		);
		const modelName = this.getNodeParameter('model', itemIndex) as string;

		// A credential override (e.g. PrivateLink) wins; otherwise getAwsDomain keeps
		// China (amazonaws.com.cn) / GovCloud endpoints correct. The proxy agent and the
		// SDK client are both resolved from this single URL.
		const bedrockEndpoint = bedrockRuntimeEndpoint
			? validateBedrockEndpointOverride(bedrockRuntimeEndpoint, region)
			: `https://bedrock-runtime.${region}.${getAwsDomain(region)}`;
		const proxyAgent = getNodeProxyAgent(bedrockEndpoint);

		const clientConfig: BedrockRuntimeClientConfig = {
			region,
			credentials,
			// Only set an explicit endpoint for overrides; without one the SDK derives
			// the default endpoint, keeping requests byte-identical to previous behaviour.
			...(bedrockRuntimeEndpoint ? { endpoint: bedrockEndpoint } : {}),
		};
		if (proxyAgent) {
			clientConfig.requestHandler = new NodeHttpHandler({
				httpAgent: proxyAgent,
				httpsAgent: proxyAgent,
			});
		}

		const client = new BedrockRuntimeClient(clientConfig);
		const embeddings = new BedrockEmbeddings({
			client,
			model: modelName,
			maxRetries: 3,
			region,
		});

		return {
			response: logWrapper(embeddings, this),
		};
	}
}
