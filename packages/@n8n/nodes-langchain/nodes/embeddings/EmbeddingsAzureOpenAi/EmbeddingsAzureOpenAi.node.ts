import { getBearerTokenProvider } from '@azure/identity';
import { AzureOpenAIEmbeddings, OpenAIEmbeddings } from '@langchain/openai';
import { getProxyAgent, logWrapper, getConnectionHintNoticeField } from '@n8n/ai-utilities';
import {
	NodeConnectionTypes,
	NodeOperationError,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';

import { N8nOAuth2TokenCredential } from '../../llms/LmChatAzureOpenAi/credentials/N8nOAuth2TokenCredential';
import {
	AuthenticationType,
	AZURE_OPENAI_INFERENCE_SCOPE,
} from '../../llms/LmChatAzureOpenAi/types';
import type { AzureEntraCognitiveServicesOAuth2ApiCredential } from '../../llms/LmChatAzureOpenAi/types';

const API_KEY_AUTH = AuthenticationType.ApiKey;
const ENTRA_AUTH = AuthenticationType.EntraOAuth2;

type AzureApiKeyCredential = {
	apiKey: string;
	resourceName?: string;
	apiVersion?: string;
	endpoint?: string;
	endpointType?: 'classic' | 'foundry';
	foundryEndpoint?: string;
};

/** The endpoint and deployment details both credential types have to supply. */
type AzureTarget = Pick<
	AzureApiKeyCredential,
	'resourceName' | 'apiVersion' | 'endpoint' | 'endpointType' | 'foundryEndpoint'
>;

export class EmbeddingsAzureOpenAi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Embeddings Azure OpenAI',
		name: 'embeddingsAzureOpenAi',
		icon: 'file:azure.svg',
		credentials: [
			{
				name: API_KEY_AUTH,
				required: true,
				displayOptions: {
					show: {
						authentication: [API_KEY_AUTH],
					},
				},
			},
			{
				name: ENTRA_AUTH,
				required: true,
				displayOptions: {
					show: {
						authentication: [ENTRA_AUTH],
					},
				},
			},
		],
		group: ['transform'],
		version: 1,
		description: 'Use Embeddings Azure OpenAI',
		defaults: {
			name: 'Embeddings Azure OpenAI',
		},

		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Embeddings'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.embeddingsazureopenai/',
					},
				],
			},
		},

		inputs: [],

		outputs: [NodeConnectionTypes.AiEmbedding],
		outputNames: ['Embeddings'],
		properties: [
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				default: API_KEY_AUTH,
				options: [
					{
						name: 'API Key',
						value: API_KEY_AUTH,
					},
					{
						name: 'Azure Entra ID (OAuth2)',
						value: ENTRA_AUTH,
					},
				],
			},
			getConnectionHintNoticeField([NodeConnectionTypes.AiVectorStore]),
			{
				displayName: 'Model (Deployment) Name',
				name: 'model',
				type: 'string',
				description: 'The name of the model(deployment) to use',
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
						displayName: 'Batch Size',
						name: 'batchSize',
						default: 512,
						typeOptions: { maxValue: 2048 },
						description: 'Maximum number of documents to send in each request',
						type: 'number',
					},
					{
						displayName: 'Strip New Lines',
						name: 'stripNewLines',
						default: true,
						description: 'Whether to strip new lines from the input text',
						type: 'boolean',
					},
					{
						displayName: 'Timeout',
						name: 'timeout',
						default: -1,
						description:
							'Maximum amount of time a request is allowed to take in seconds. Set to -1 for no timeout.',
						type: 'number',
					},
					{
						displayName: 'Dimensions',
						name: 'dimensions',
						default: 1536,
						description:
							'The number of dimensions the resulting output embeddings should have. Only supported in text-embedding-3 and later models.',
						type: 'options',
						options: [
							{
								name: '256',
								value: 256,
							},
							{
								name: '512',
								value: 512,
							},
							{
								name: '1024',
								value: 1024,
							},
							{
								name: '1536',
								value: 1536,
							},
							{
								name: '3072',
								value: 3072,
							},
						],
					},
				],
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		this.logger.debug('Supply data for embeddings');
		const authentication = this.getNodeParameter('authentication', itemIndex, API_KEY_AUTH) as
			| typeof API_KEY_AUTH
			| typeof ENTRA_AUTH;

		let target: AzureTarget;
		// Exactly one of these is set. The API key is a string the client keeps; the token provider
		// is a function the client calls before each request, so a long run never reuses a stale
		// token.
		let apiKey: string | undefined;
		let tokenProvider: (() => Promise<string>) | undefined;

		if (authentication === ENTRA_AUTH) {
			const credential =
				await this.getCredentials<AzureEntraCognitiveServicesOAuth2ApiCredential>(ENTRA_AUTH);
			const entraCredential = new N8nOAuth2TokenCredential(
				this.getNode(),
				credential,
				undefined,
				this.helpers.getSecureEgressFilter(),
			);
			const deployment = await entraCredential.getDeploymentDetails();

			target = {
				resourceName: deployment.resourceName,
				apiVersion: deployment.apiVersion,
				endpoint: deployment.endpoint,
				endpointType: credential.endpointType,
				foundryEndpoint: credential.foundryEndpoint,
			};
			tokenProvider = getBearerTokenProvider(entraCredential, AZURE_OPENAI_INFERENCE_SCOPE);
		} else {
			const credential = await this.getCredentials<AzureApiKeyCredential>(API_KEY_AUTH);
			target = credential;
			apiKey = credential.apiKey;
		}

		const credentialLabel = authentication === ENTRA_AUTH ? 'Azure Entra ID' : 'Azure OpenAI API';

		const modelName = this.getNodeParameter('model', itemIndex) as string;

		const options = this.getNodeParameter('options', itemIndex, {}) as {
			batchSize?: number;
			stripNewLines?: boolean;
			timeout?: number;
			dimensions?: number | undefined;
		};

		if (options.timeout === -1) {
			options.timeout = undefined;
		}

		if (target.endpointType === 'foundry') {
			const foundryURL = target.foundryEndpoint?.trim();
			if (!foundryURL) {
				throw new NodeOperationError(
					this.getNode(),
					`Foundry endpoint is missing in the selected ${credentialLabel} credential.`,
				);
			}
			const embeddings = new OpenAIEmbeddings({
				// The openai client accepts a `() => Promise<string>` here and calls it per request
				apiKey: tokenProvider ?? apiKey,
				model: modelName,
				configuration: {
					baseURL: foundryURL,
					fetchOptions: {
						dispatcher: getProxyAgent(foundryURL, {}, this.helpers.getSecureEgressFilter()),
					},
				},
				...options,
			});

			return {
				response: logWrapper(embeddings, this),
			};
		}

		// A classic deployment addresses <resource>.openai.azure.com/...?api-version=. An empty
		// value for either reaches Azure as a malformed URL, so say which field is missing.
		if (!target.endpoint?.trim() && !target.resourceName?.trim()) {
			throw new NodeOperationError(
				this.getNode(),
				`Resource Name is missing in the selected ${credentialLabel} credential.`,
			);
		}
		if (!target.apiVersion?.trim()) {
			throw new NodeOperationError(
				this.getNode(),
				`API Version is missing in the selected ${credentialLabel} credential.`,
			);
		}

		const embeddings = new AzureOpenAIEmbeddings({
			azureOpenAIApiDeploymentName: modelName,
			// instance name only needed to set base url
			azureOpenAIApiInstanceName: !target.endpoint ? target.resourceName : undefined,
			azureOpenAIApiKey: apiKey,
			azureADTokenProvider: tokenProvider,
			azureOpenAIApiVersion: target.apiVersion,
			// azureOpenAIEndpoint and configuration.baseURL are both ignored here
			// only setting azureOpenAIBasePath worked
			azureOpenAIBasePath: target.endpoint ? `${target.endpoint}/openai/deployments` : undefined,
			configuration: {
				fetchOptions: {
					// Resolve the proxy against the host LangChain dials so NO_PROXY applies to it.
					// `||` rather than `??`, so an endpoint that is set but empty also falls back.
					dispatcher: getProxyAgent(
						target.endpoint || `https://${target.resourceName}.openai.azure.com`,
						{},
						this.helpers.getSecureEgressFilter(),
					),
				},
			},
			...options,
		});

		return {
			response: logWrapper(embeddings, this),
		};
	}
}
