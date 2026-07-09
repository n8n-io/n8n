import type { GuardrailTrace, PerformanceConfigLatency } from '@aws-sdk/client-bedrock-runtime';
import { ChatBedrockConverse, type ChatBedrockConverseInput } from '@langchain/aws';
import {
	makeN8nLlmFailedAttemptHandler,
	N8nLlmTracing,
	getConnectionHintNoticeField,
} from '@n8n/ai-utilities';
import type { DocumentType } from '@smithy/types';
import { assertSupportedAwsRegion } from 'n8n-nodes-base/aws-credentials';
import { awsNodeAuthOptions, awsNodeCredentials } from 'n8n-nodes-base/dist/nodes/Aws/utils';
import {
	jsonParse,
	NodeConnectionTypes,
	UserError,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';

import { createBedrockRuntimeClient } from '@utils/aws/createBedrockRuntimeClient';
import { resolveAwsCredentials } from '@utils/aws/resolveAwsCredentials';

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
		credentials: awsNodeCredentials,
		requestDefaults: {
			ignoreHttpStatusErrors: true,
			baseURL: '=https://bedrock.{{$credentials?.region ?? "eu-central-1"}}.amazonaws.com',
		},
		properties: [
			awsNodeAuthOptions,
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
				builderHint: {
					propertyHint:
						'Default to the latest Claude Sonnet on Bedrock (anthropic.claude-sonnet-4-6 family). For Claude Sonnet 4+, switch Model Source to Inference Profiles. Avoid claude-sonnet-4-5, claude-3.x, and non-Claude legacy models unless requested.',
				},
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
				builderHint: {
					propertyHint:
						'Default to the latest Claude Sonnet inference profile (anthropic.claude-sonnet-4-6 family). Avoid claude-sonnet-4-5 and claude-3.x profiles unless specifically requested.',
				},
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
					{
						displayName: 'Top P',
						name: 'topP',
						default: 1,
						typeOptions: { maxValue: 1, minValue: 0, numberPrecision: 1 },
						description:
							'Controls diversity via nucleus sampling: 0.5 means half of all likelihood-weighted options are considered. We generally recommend altering this or temperature but not both.',
						type: 'number',
					},
					{
						displayName: 'Max Retries',
						name: 'maxRetries',
						default: 2,
						description: 'Maximum number of retries to attempt when a request fails',
						type: 'number',
					},
					{
						displayName: 'Additional Model Request Fields',
						name: 'additionalModelRequestFields',
						default: '{}',
						description:
							'Model-family-specific inference parameters passed through as JSON (e.g. Claude <code>top_k</code>/<code>thinking</code>, Nova <code>inferenceConfig</code>/<code>reasoningConfig</code>, Cohere penalties). See the <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters.html">AWS model parameters docs</a>.',
						type: 'json',
						typeOptions: { rows: 4 },
					},
					{
						displayName: 'Latency Optimization',
						name: 'latency',
						default: 'standard',
						description:
							'Latency optimization mode for the request. "Optimized" can reduce response time for supported models and regions.',
						type: 'options',
						options: [
							{ name: 'Standard', value: 'standard' },
							{ name: 'Optimized', value: 'optimized' },
						],
					},
					{
						displayName: 'Guardrail',
						name: 'guardrail',
						type: 'fixedCollection',
						default: {},
						description: 'Apply an Amazon Bedrock guardrail to requests',
						options: [
							{
								displayName: 'Guardrail',
								name: 'values',
								values: [
									{
										displayName: 'Guardrail Identifier',
										name: 'guardrailIdentifier',
										type: 'string',
										default: '',
										description: 'The identifier (ID or ARN) of the guardrail to apply',
									},
									{
										displayName: 'Guardrail Version',
										name: 'guardrailVersion',
										type: 'string',
										default: '',
										description: 'The version of the guardrail to apply',
									},
									{
										displayName: 'Trace',
										name: 'trace',
										type: 'options',
										default: 'disabled',
										description: 'The trace behavior for the guardrail',
										options: [
											{ name: 'Disabled', value: 'disabled' },
											{ name: 'Enabled', value: 'enabled' },
											{ name: 'Enabled (Full)', value: 'enabled_full' },
										],
									},
								],
							},
						],
					},
				],
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const {
			region: credentialRegion,
			credentials,
			bedrockRuntimeEndpoint,
		} = await resolveAwsCredentials(this, itemIndex);
		const modelName = this.getNodeParameter('model', itemIndex) as string;
		const options = this.getNodeParameter('options', itemIndex, {}) as {
			temperature?: number;
			maxTokensToSample?: number;
			topP?: number;
			maxRetries?: number;
			additionalModelRequestFields?: string;
			latency?: PerformanceConfigLatency;
			guardrail?: {
				values?: {
					guardrailIdentifier?: string;
					guardrailVersion?: string;
					trace?: GuardrailTrace;
				};
			};
		};

		// If the model is specified as a full ARN, extract the region from it
		// ARN format: arn:<partition>:bedrock:<region>:<account-id>:inference-profile/<profile-id>
		// Partition covers commercial (aws), China (aws-cn) and GovCloud (aws-us-gov).
		let region = credentialRegion;
		const arnMatch = modelName.match(/^arn:(?:aws|aws-cn|aws-us-gov):bedrock:([a-z0-9-]+):/);
		if (arnMatch) {
			const arnRegion = arnMatch[1];
			// Validate before the region is interpolated into the bedrock-runtime endpoint URL below.
			assertSupportedAwsRegion(arnRegion);
			region = arnRegion;
		}

		// Pass the pre-configured client to avoid credential resolution proxy issues
		const client = createBedrockRuntimeClient({ region, credentials, bedrockRuntimeEndpoint });

		// Forward only user-set options; unset ones are omitted so model defaults are preserved.
		const modelConfig: ChatBedrockConverseInput = {
			client,
			model: modelName,
			region,
			callbacks: [new N8nLlmTracing(this)],
			onFailedAttempt: makeN8nLlmFailedAttemptHandler(this),
		};

		if (options.temperature !== undefined) modelConfig.temperature = options.temperature;
		if (options.maxTokensToSample !== undefined) modelConfig.maxTokens = options.maxTokensToSample;
		if (options.topP !== undefined) modelConfig.topP = options.topP;
		if (options.maxRetries !== undefined) modelConfig.maxRetries = options.maxRetries;
		if (options.latency !== undefined) modelConfig.performanceConfig = { latency: options.latency };

		const guardrail = options.guardrail?.values;
		if (guardrail?.guardrailIdentifier) {
			modelConfig.guardrailConfig = {
				guardrailIdentifier: guardrail.guardrailIdentifier,
				...(guardrail.guardrailVersion ? { guardrailVersion: guardrail.guardrailVersion } : {}),
				...(guardrail.trace ? { trace: guardrail.trace } : {}),
			};
		}

		const additionalFields = options.additionalModelRequestFields?.trim();
		if (additionalFields && additionalFields !== '{}') {
			let parsed: DocumentType;
			try {
				parsed = jsonParse<DocumentType>(additionalFields);
			} catch {
				throw new UserError('Additional Model Request Fields must be valid JSON', {
					level: 'warning',
				});
			}
			modelConfig.additionalModelRequestFields = parsed;
		}

		const model = new ChatBedrockConverse(modelConfig);

		return {
			response: model,
		};
	}
}
