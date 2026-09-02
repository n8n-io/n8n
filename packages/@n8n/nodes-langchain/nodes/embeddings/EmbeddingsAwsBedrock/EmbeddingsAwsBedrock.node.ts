import { logWrapper, getConnectionHintNoticeField } from '@n8n/ai-utilities';
import { createBedrockRuntimeClient } from '@utils/aws/createBedrockRuntimeClient';
import { resolveAwsCredentials } from '@utils/aws/resolveAwsCredentials';
import { resolveBedrockRegion } from '@utils/aws/resolveBedrockRegion';
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

import { BedrockInvokeModelEmbeddings } from './BedrockInvokeModelEmbeddings';
import { listModels } from './methods/listModels';

function isJsonObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

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
				// Keeps the same field naming as other Bedrock model pickers
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
				displayName: 'Model',
				name: 'model',
				type: 'options',
				allowArbitraryValues: true, // Hide issues when model name is specified in the expression and does not match any of the options
				// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-options
				description:
					'The model or inference profile which will generate the embeddings. <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/foundation-models.html">Learn more</a>.',
				typeOptions: {
					loadOptionsDependsOn: ['authentication'],
					loadOptionsMethod: 'listModels',
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
						displayName: 'Additional Model Request Fields',
						name: 'additionalModelRequestFields',
						default: '{}',
						description:
							'Model-specific request fields passed through as JSON (e.g. Titan <code>dimensions</code>/<code>normalize</code>, Cohere <code>input_type</code>/<code>truncate</code>). See the <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters.html">AWS model parameters docs</a>.',
						type: 'json',
						typeOptions: { rows: 4 },
					},
					{
						displayName: 'Max Retries',
						name: 'maxRetries',
						default: 2,
						description: 'Maximum number of retries to attempt when a request fails',
						type: 'number',
					},
					{
						displayName: 'Timeout',
						name: 'timeout',
						default: 60000,
						description:
							'Maximum amount of time a request is allowed to take in milliseconds. Set to 0 to disable.',
						type: 'number',
					},
				],
			},
		],
	};

	methods = {
		loadOptions: {
			listModels,
		},
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const {
			region: credentialRegion,
			credentials,
			bedrockRuntimeEndpoint,
		} = await resolveAwsCredentials(this, itemIndex);
		const modelName = this.getNodeParameter('model', itemIndex) as string;
		const options = this.getNodeParameter('options', itemIndex, {}) as {
			maxRetries?: number;
			timeout?: number;
			additionalModelRequestFields?: string;
		};

		const region = resolveBedrockRegion(modelName, credentialRegion);

		const client = createBedrockRuntimeClient({
			region,
			credentials,
			bedrockRuntimeEndpoint,
			maxRetries: options.maxRetries,
			timeout: options.timeout,
		});

		let additionalModelRequestFields: Record<string, unknown> | undefined;
		const additionalFields = options.additionalModelRequestFields?.trim();
		if (additionalFields && additionalFields !== '{}') {
			let parsed: unknown;
			try {
				parsed = jsonParse(additionalFields);
			} catch {
				throw new UserError('Additional Model Request Fields must be valid JSON', {
					level: 'warning',
				});
			}
			if (!isJsonObject(parsed)) {
				throw new UserError('Additional Model Request Fields must be a JSON object', {
					level: 'warning',
				});
			}
			additionalModelRequestFields = parsed;
		}

		const embeddings = new BedrockInvokeModelEmbeddings({
			client,
			model: modelName,
			additionalModelRequestFields,
		});

		return {
			response: logWrapper(embeddings, this),
		};
	}
}
