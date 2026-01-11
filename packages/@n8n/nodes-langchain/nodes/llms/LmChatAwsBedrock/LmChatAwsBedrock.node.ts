import type { BedrockRuntimeClientConfig } from '@aws-sdk/client-bedrock-runtime';
import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { fromIni, fromTemporaryCredentials, fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { ChatBedrockConverse } from '@langchain/aws';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import { getNodeProxyAgent } from '@utils/httpProxyAgent';
import { getConnectionHintNoticeField } from '@utils/sharedFields';
import {
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';

import type {
	AwsIamCredentialsType,
	AwsAssumeRoleCredentialsType,
} from 'n8n-nodes-base/dist/credentials/common/aws/types';
import { makeN8nLlmFailedAttemptHandler } from '../n8nLlmFailedAttemptHandler';
import { N8nLlmTracing } from '../N8nLlmTracing';

export class LmChatAwsBedrock implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS Bedrock Chat Model',

		name: 'lmChatAwsBedrock',
		icon: 'file:bedrock.svg',
		group: ['transform'],
		version: [1, 1.1],
		description: 'Language Model AWS Bedrock',
		defaults: {
			name: 'AWS Bedrock Chat Model',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Language Models', 'Root Nodes'],
				'Language Models': ['Chat Models (Recommended)'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.lmchatawsbedrock/',
					},
				],
			},
		},

		inputs: [],

		outputs: [NodeConnectionTypes.AiLanguageModel],
		outputNames: ['Model'],
		credentials: [
			{
				name: 'aws',
				required: false, // Optional now!
				displayOptions: {
					show: {
						authentication: ['accessKeys', 'profile'],
					},
				},
			},
			{
				name: 'awsAssumeRole',
				required: false, // Optional now!
				displayOptions: {
					show: {
						authentication: ['assumeRole'],
					},
				},
			},
		],
		requestDefaults: {
			ignoreHttpStatusErrors: true,
			baseURL: '=https://bedrock.{{$credentials?.region ?? "eu-central-1"}}.amazonaws.com',
		},
		properties: [
			getConnectionHintNoticeField([NodeConnectionTypes.AiChain, NodeConnectionTypes.AiChain]),
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{
						name: 'Access Keys',
						value: 'accessKeys',
						description: 'Use explicit AWS access keys',
					},
					{
						name: 'AWS CLI Profile',
						value: 'profile',
						description: 'Use AWS CLI profile from ~/.aws/credentials',
					},
					{
						name: 'Assume Role',
						value: 'assumeRole',
						description: 'Assume an IAM role (for cross-account access)',
					},
					{
						name: 'Default AWS Credentials',
						value: 'default',
						description: 'Let AWS SDK auto-detect (env vars, ECS/EKS roles, EC2 instance profile)',
					},
				],
				default: 'accessKeys', // Backwards compatible
			},
			{
				displayName: 'Model Source',
				name: 'modelSource',
				type: 'options',
				displayOptions: {
					show: {
						'@version': [{ _cnd: { gte: 1.1 } }],
					},
				},
				options: [
					{
						name: 'On-Demand Models',
						value: 'onDemand',
						description: 'Standard foundation models with on-demand pricing',
					},
					{
						name: 'Inference Profiles',
						value: 'inferenceProfile',
						description:
							'Cross-region inference profiles (required for models like Claude Sonnet 4 and others)',
					},
				],
				default: 'onDemand',
				description: 'Choose between on-demand foundation models or inference profiles',
			},
			{
				displayName: 'Model',
				name: 'model',
				type: 'options',
				allowArbitraryValues: true, // Hide issues when model name is specified in the expression and does not match any of the options
				description:
					'The model which will generate the completion. <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/foundation-models.html">Learn more</a>.',
				displayOptions: {
					hide: {
						modelSource: ['inferenceProfile'],
					},
				},
				typeOptions: {
					loadOptionsDependsOn: ['modelSource'],
					loadOptions: {
						routing: {
							request: {
								method: 'GET',
								url: '/foundation-models?&byOutputModality=TEXT&byInferenceType=ON_DEMAND',
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
			{
				displayName: 'Model',
				name: 'model',
				type: 'options',
				allowArbitraryValues: true,
				description:
					'The inference profile which will generate the completion. <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/inference-profiles-use.html">Learn more</a>.',
				displayOptions: {
					show: {
						modelSource: ['inferenceProfile'],
					},
				},
				typeOptions: {
					loadOptionsDependsOn: ['modelSource'],
					loadOptions: {
						routing: {
							request: {
								method: 'GET',
								url: '/inference-profiles?maxResults=1000',
							},
							output: {
								postReceive: [
									{
										type: 'rootProperty',
										properties: {
											property: 'inferenceProfileSummaries',
										},
									},
									{
										type: 'setKeyValue',
										properties: {
											name: '={{$responseItem.inferenceProfileName}}',
											description:
												'={{$responseItem.description || $responseItem.inferenceProfileArn}}',
											value: '={{$responseItem.inferenceProfileId}}',
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
			{
				displayName: 'Options',
				name: 'options',
				placeholder: 'Add Option',
				description: 'Additional options to add',
				type: 'collection',
				default: {},
				options: [
					{
						displayName: 'Maximum Number of Tokens',
						name: 'maxTokensToSample',
						default: 2000,
						description: 'The maximum number of tokens to generate in the completion',
						type: 'number',
					},
					{
						displayName: 'Sampling Temperature',
						name: 'temperature',
						default: 0.7,
						typeOptions: { maxValue: 1, minValue: 0, numberPrecision: 1 },
						description:
							'Controls randomness: Lowering results in less random completions. As the temperature approaches zero, the model will become deterministic and repetitive.',
						type: 'number',
					},
				],
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const authentication = this.getNodeParameter('authentication', itemIndex, 'accessKeys') as
			| 'accessKeys'
			| 'profile'
			| 'assumeRole'
			| 'default';

		const modelName = this.getNodeParameter('model', itemIndex) as string;
		const options = this.getNodeParameter('options', itemIndex, {}) as {
			temperature: number;
			maxTokensToSample: number;
		};

		// Configure Bedrock client
		const proxyAgent = getNodeProxyAgent();
		let region = 'us-east-1'; // Default region
		const clientConfig: BedrockRuntimeClientConfig = {
			region,
		};

		// Handle authentication based on user selection
		if (authentication === 'default') {
			// Don't pass credentials - AWS SDK will use its provider chain!
			// This auto-detects: Env vars → CLI profiles → ECS → EKS → EC2
		} else if (authentication === 'assumeRole') {
			const credentials = await this.getCredentials<AwsAssumeRoleCredentialsType>('awsAssumeRole');
			region = credentials.region;
			clientConfig.region = region;

			// Use AWS SDK's fromTemporaryCredentials with system or explicit credentials
			const useSystemCreds = credentials.useSystemCredentialsForRole ?? false;

			if (useSystemCreds) {
				// Use AWS SDK's fromNodeProviderChain for automatic system credential detection
				// This handles: env vars, ECS metadata, EKS pod identity, EC2 instance profile, AWS SSO
				try {
					clientConfig.credentials = fromTemporaryCredentials({
						masterCredentials: fromNodeProviderChain(), // AWS SDK handles all credential sources
						params: {
							RoleArn: credentials.roleArn!,
							RoleSessionName: credentials.roleSessionName || 'n8n-bedrock-session',
							ExternalId: credentials.externalId,
							DurationSeconds: 3600,
						},
					});
				} catch (error) {
					throw new Error(
						`Failed to obtain system credentials or assume role ${credentials.roleArn}: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
							'Ensure n8n is running in AWS (ECS/EKS/EC2) with an attached IAM role, or set AWS environment variables.',
					);
				}
			} else {
				// Use explicit STS credentials to assume role
				clientConfig.credentials = fromTemporaryCredentials({
					masterCredentials: {
						accessKeyId: credentials.stsAccessKeyId!,
						secretAccessKey: credentials.stsSecretAccessKey!,
						...(credentials.stsSessionToken && { sessionToken: credentials.stsSessionToken }),
					},
					params: {
						RoleArn: credentials.roleArn!,
						RoleSessionName: credentials.roleSessionName || 'n8n-bedrock-session',
						ExternalId: credentials.externalId,
						DurationSeconds: 3600,
					},
				});
			}
		} else {
			// accessKeys or profile
			const credentials = await this.getCredentials<AwsIamCredentialsType>('aws');
			region = credentials.region;
			clientConfig.region = region;

			const authMethod = credentials.authenticationMethod || 'accessKeys';

			if (authMethod === 'accessKeys') {
				// Explicit credentials (current behavior)
				clientConfig.credentials = {
					accessKeyId: credentials.accessKeyId!,
					secretAccessKey: credentials.secretAccessKey!,
					...(credentials.sessionToken && { sessionToken: credentials.sessionToken }),
				};
			} else if (authMethod === 'profile') {
				// AWS CLI profile - use AWS SDK's fromIni
				clientConfig.credentials = fromIni({
					profile: credentials.profileName || 'default',
					ignoreCache: true, // Allow external credential updates without n8n restart
				});
			}
		}

		if (proxyAgent) {
			clientConfig.requestHandler = new NodeHttpHandler({
				httpAgent: proxyAgent,
				httpsAgent: proxyAgent,
			});
		}

		const client = new BedrockRuntimeClient(clientConfig);

		// Create LangChain model
		const model = new ChatBedrockConverse({
			client,
			model: modelName,
			region,
			temperature: options.temperature,
			maxTokens: options.maxTokensToSample,
			callbacks: [new N8nLlmTracing(this)],
			onFailedAttempt: makeN8nLlmFailedAttemptHandler(this),
		});

		return {
			response: model,
		};
	}
}
