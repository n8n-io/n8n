import { ChatBedrockConverse } from '@langchain/aws';
import {
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';

import { Aws } from 'n8n-nodes-base/dist/credentials/Aws.credentials';

import { getProxyAgent } from '@utils/httpProxyAgent';
import { getConnectionHintNoticeField } from '@utils/sharedFields';

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
				required: true,
			},
		],
		requestDefaults: {
			ignoreHttpStatusErrors: true,
			baseURL: '=https://bedrock.{{$credentials?.region ?? "eu-central-1"}}.amazonaws.com',
		},
		properties: [
			getConnectionHintNoticeField([NodeConnectionTypes.AiChain, NodeConnectionTypes.AiChain]),
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
		const credentials = await this.getCredentials('aws');
		const modelName = this.getNodeParameter('model', itemIndex) as string;
		const options = this.getNodeParameter('options', itemIndex, {}) as {
			temperature: number;
			maxTokensToSample: number;
		};

		const model = new ChatBedrockConverse({
			region: credentials.region as string,
			model: modelName,
			temperature: options.temperature,
			maxTokens: options.maxTokensToSample,
			clientConfig: {
				httpAgent: getProxyAgent(),
			},
			credentials: Aws.getCredentialProvider(credentials),
			callbacks: [new N8nLlmTracing(this)],
			onFailedAttempt: makeN8nLlmFailedAttemptHandler(this),
		});

		return {
			response: model,
		};
	}
}
