import type { BedrockRuntimeClientConfig } from '@aws-sdk/client-bedrock-runtime';
import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import type { AwsCredentialIdentityProvider } from '@aws-sdk/types';
import { BedrockEmbeddings } from '@langchain/aws';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import { getNodeProxyAgent } from '@utils/httpProxyAgent';
import { logWrapper } from '@utils/logWrapper';
import { getConnectionHintNoticeField } from '@utils/sharedFields';
import {
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';

/**
 * Type for AWS IAM credentials (access key based)
 */
interface AwsIamCredentials {
	region: string;
	accessKeyId: string;
	secretAccessKey: string;
	sessionToken?: string;
}

/**
 * Type for AWS Profile credentials (profile/instance based)
 */
interface AwsProfileCredentials {
	region: string;
	credentialSource: 'profile' | 'instanceMetadata' | 'containerMetadata' | 'tokenFile' | 'chain';
	profileName?: string;
}

/**
 * Dynamically imports the profile credentials utility to avoid circular dependencies
 * and only load when needed
 */
async function getProfileCredentialProvider(
	credentials: AwsProfileCredentials,
): Promise<AwsCredentialIdentityProvider> {
	// Dynamic import to avoid loading AWS SDK credential providers when not needed
	const { createCredentialProvider } = await import(
		'n8n-nodes-base/credentials/common/aws/profile-credentials-utils'
	);
	return createCredentialProvider({
		source: credentials.credentialSource,
		region: credentials.region,
		profile: credentials.profileName,
	});
}

export class EmbeddingsAwsBedrock implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Embeddings AWS Bedrock',
		name: 'embeddingsAwsBedrock',
		icon: 'file:bedrock.svg',
		credentials: [
			{
				name: 'aws',
				required: true,
				displayOptions: {
					show: {
						'@version': [1],
					},
				},
			},
			{
				// For version 2+, allow choosing between IAM and Profile credentials
				name: 'aws',
				displayOptions: {
					show: {
						'@version': [2],
						credentialType: ['iam'],
					},
				},
			},
			{
				name: 'awsProfile',
				displayOptions: {
					show: {
						'@version': [2],
						credentialType: ['profile'],
					},
				},
			},
		],
		group: ['transform'],
		version: [1, 2],
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
				displayName: 'Credential Type',
				name: 'credentialType',
				type: 'options',
				displayOptions: {
					show: {
						'@version': [{ _cnd: { gte: 2 } }],
					},
				},
				options: [
					{
						name: 'IAM Access Keys',
						value: 'iam',
						description: 'Use AWS Access Key ID and Secret Access Key',
					},
					{
						name: 'Profile / Instance',
						value: 'profile',
						description: 'Use AWS profile, EC2 instance role, ECS task role, or EKS pod identity',
					},
				],
				default: 'iam',
				description: 'Choose how to authenticate with AWS',
			},
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
		const nodeVersion = this.getNode().typeVersion;
		const modelName = this.getNodeParameter('model', itemIndex) as string;

		const proxyAgent = getNodeProxyAgent();
		let clientConfig: BedrockRuntimeClientConfig;
		let region: string;

		// Determine credential type based on node version
		if (nodeVersion >= 2) {
			const credentialType = this.getNodeParameter('credentialType', itemIndex, 'iam') as string;

			if (credentialType === 'profile') {
				// Use profile-based credentials
				const profileCredentials = await this.getCredentials<AwsProfileCredentials>('awsProfile');
				const credentialProvider = await getProfileCredentialProvider(profileCredentials);
				region = profileCredentials.region;

				clientConfig = {
					region,
					credentials: credentialProvider,
				};
			} else {
				// Use IAM credentials (access key based)
				const iamCredentials = await this.getCredentials<AwsIamCredentials>('aws');
				region = iamCredentials.region;
				clientConfig = {
					region,
					credentials: {
						secretAccessKey: iamCredentials.secretAccessKey,
						accessKeyId: iamCredentials.accessKeyId,
						...(iamCredentials.sessionToken && { sessionToken: iamCredentials.sessionToken }),
					},
				};
			}
		} else {
			// Legacy behavior for older node versions - always use IAM credentials
			const credentials = await this.getCredentials<AwsIamCredentials>('aws');
			region = credentials.region;
			clientConfig = {
				region,
				credentials: {
					secretAccessKey: credentials.secretAccessKey,
					accessKeyId: credentials.accessKeyId,
					...(credentials.sessionToken && { sessionToken: credentials.sessionToken }),
				},
			};
		}

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
