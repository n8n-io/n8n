import {
	chatHubProviderSchema,
	emptyChatModelsResponse,
	PROVIDER_CREDENTIAL_TYPE_MAP,
	type ChatHubLLMProvider,
	type ChatHubProvider,
	type ChatModelDto,
	type ChatModelsResponse,
} from '@n8n/api-types';
import { type User } from '@n8n/db';
import { Service } from '@n8n/di';
import {
	type INodeCredentials,
	type INodePropertyOptions,
	type IWorkflowExecuteAdditionalData,
} from 'n8n-workflow';

import { ChatHubAgentService } from './chat-hub-agent.service';
import { getModelMetadata, PROVIDER_NODE_TYPE_MAP } from './chat-hub.constants';

import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { DynamicNodeParametersService } from '@/services/dynamic-node-parameters.service';
import { getBase } from '@/workflow-execute-additional-data';
import { ChatHubWorkflowService } from './chat-hub-workflow.service';

@Service()
export class ChatHubModelsService {
	constructor(
		private readonly nodeParametersService: DynamicNodeParametersService,
		private readonly credentialsFinderService: CredentialsFinderService,
		private readonly chatHubAgentService: ChatHubAgentService,
		private readonly chatHubWorkflowService: ChatHubWorkflowService,
	) {}

	async getModels(
		user: User,
		credentialIds: Record<ChatHubLLMProvider, string | null>,
	): Promise<ChatModelsResponse> {
		const additionalData = await getBase({ userId: user.id });
		const providers = chatHubProviderSchema.options;

		const allCredentials = await this.credentialsFinderService.findCredentialsForUser(user, [
			'credential:read',
		]);

		const responses = await Promise.all(
			providers.map<Promise<[ChatHubProvider, ChatModelsResponse[ChatHubProvider]]>>(
				async (provider: ChatHubProvider) => {
					const credentials: INodeCredentials = {};

					if (provider !== 'n8n' && provider !== 'custom-agent') {
						const credentialId = credentialIds[provider];
						if (!credentialId) {
							return [provider, { models: [] }];
						}

						// Ensure the user has the permission to read the credential
						if (!allCredentials.some((credential) => credential.id === credentialId)) {
							return [
								provider,
								{ models: [], error: 'Could not retrieve models. Verify credentials.' },
							];
						}

						credentials[PROVIDER_CREDENTIAL_TYPE_MAP[provider]] = { name: '', id: credentialId };
					}

					try {
						return [
							provider,
							await this.fetchModelsForProvider(user, provider, credentials, additionalData),
						];
					} catch {
						return [
							provider,
							{ models: [], error: 'Could not retrieve models. Verify credentials.' },
						];
					}
				},
			),
		);

		return responses.reduce<ChatModelsResponse>(
			(acc, [provider, res]) => {
				acc[provider] = res;
				return acc;
			},
			{ ...emptyChatModelsResponse },
		);
	}

	private async fetchModelsForProvider(
		user: User,
		provider: ChatHubProvider,
		credentials: INodeCredentials,
		additionalData: IWorkflowExecuteAdditionalData,
	): Promise<ChatModelsResponse[ChatHubProvider]> {
		switch (provider) {
			case 'openai': {
				const rawModels = await this.fetchOpenAiModels(credentials, additionalData);
				return { models: this.transformAndFilterModels(rawModels, 'openai') };
			}
			case 'anthropic': {
				const rawModels = await this.fetchAnthropicModels(credentials, additionalData);
				return { models: this.transformAndFilterModels(rawModels, 'anthropic') };
			}
			case 'google': {
				const rawModels = await this.fetchGoogleModels(credentials, additionalData);
				return { models: this.transformAndFilterModels(rawModels, 'google') };
			}
			case 'ollama': {
				const rawModels = await this.fetchOllamaModels(credentials, additionalData);
				return { models: this.transformAndFilterModels(rawModels, 'ollama') };
			}
			case 'azureOpenAi': {
				const rawModels = this.fetchAzureOpenAiModels(credentials, additionalData);
				return { models: this.transformAndFilterModels(rawModels, 'azureOpenAi') };
			}
			case 'azureEntraId': {
				const rawModels = this.fetchAzureEntraIdModels(credentials, additionalData);
				return { models: this.transformAndFilterModels(rawModels, 'azureEntraId') };
			}
			case 'awsBedrock': {
				const rawModels = await this.fetchAwsBedrockModels(credentials, additionalData);
				return { models: this.transformAndFilterModels(rawModels, 'awsBedrock') };
			}
			case 'vercelAiGateway': {
				const rawModels = await this.fetchVercelAiGatewayModels(credentials, additionalData);
				return { models: this.transformAndFilterModels(rawModels, 'vercelAiGateway') };
			}
			case 'xAiGrok': {
				const rawModels = await this.fetchXAiGrokModels(credentials, additionalData);
				return { models: this.transformAndFilterModels(rawModels, 'xAiGrok') };
			}
			case 'groq': {
				const rawModels = await this.fetchGroqModels(credentials, additionalData);
				return { models: this.transformAndFilterModels(rawModels, 'groq') };
			}
			case 'openRouter': {
				const rawModels = await this.fetchOpenRouterModels(credentials, additionalData);
				return { models: this.transformAndFilterModels(rawModels, 'openRouter') };
			}
			case 'deepSeek': {
				const rawModels = await this.fetchDeepSeekModels(credentials, additionalData);
				return { models: this.transformAndFilterModels(rawModels, 'deepSeek') };
			}
			case 'cohere': {
				const rawModels = await this.fetchCohereModels(credentials, additionalData);
				return { models: this.transformAndFilterModels(rawModels, 'cohere') };
			}
			case 'mistralCloud': {
				const rawModels = await this.fetchMistralCloudModels(credentials, additionalData);
				return { models: this.transformAndFilterModels(rawModels, 'mistralCloud') };
			}
			case 'n8n':
				return { models: await this.chatHubWorkflowService.fetchAgentWorkflowsAsModels(user) };
			case 'custom-agent':
				return await this.chatHubAgentService.getAgentsByUserIdAsModels(user.id);
		}
	}

	private async fetchOpenAiModels(
		credentials: INodeCredentials,
		additionalData: IWorkflowExecuteAdditionalData,
	): Promise<INodePropertyOptions[]> {
		const resourceLocatorResults = await this.nodeParametersService.getResourceLocatorResults(
			'searchModels',
			'parameters.model',
			additionalData,
			PROVIDER_NODE_TYPE_MAP.openai,
			{},
			credentials,
		);

		return resourceLocatorResults.results;
	}

	private async fetchAnthropicModels(
		credentials: INodeCredentials,
		additionalData: IWorkflowExecuteAdditionalData,
	): Promise<INodePropertyOptions[]> {
		const resourceLocatorResults = await this.nodeParametersService.getResourceLocatorResults(
			'searchModels',
			'parameters.model',
			additionalData,
			PROVIDER_NODE_TYPE_MAP.anthropic,
			{},
			credentials,
		);

		return resourceLocatorResults.results;
	}

	private async fetchGoogleModels(
		credentials: INodeCredentials,
		additionalData: IWorkflowExecuteAdditionalData,
	): Promise<INodePropertyOptions[]> {
		return await this.nodeParametersService.getOptionsViaLoadOptions(
			{
				// From Gemini node
				// https://github.com/n8n-io/n8n/blob/master/packages/%40n8n/nodes-langchain/nodes/llms/LmChatGoogleGemini/LmChatGoogleGemini.node.ts#L75
				routing: {
					request: {
						method: 'GET',
						url: '/v1beta/models',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'models',
								},
							},
							{
								type: 'filter',
								properties: {
									pass: "={{ !$responseItem.name.includes('embedding') }}",
								},
							},
							{
								type: 'setKeyValue',
								properties: {
									name: '={{$responseItem.name}}',
									value: '={{$responseItem.name}}',
									description: '={{$responseItem.description}}',
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
			additionalData,
			PROVIDER_NODE_TYPE_MAP.google,
			{},
			credentials,
		);
	}

	private async fetchOllamaModels(
		credentials: INodeCredentials,
		additionalData: IWorkflowExecuteAdditionalData,
	): Promise<INodePropertyOptions[]> {
		return await this.nodeParametersService.getOptionsViaLoadOptions(
			{
				// From Ollama Model node
				// https://github.com/n8n-io/n8n/blob/master/packages/%40n8n/nodes-langchain/nodes/llms/LMOllama/description.ts#L24
				routing: {
					request: {
						method: 'GET',
						url: '/api/tags',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'models',
								},
							},
							{
								type: 'setKeyValue',
								properties: {
									name: '={{$responseItem.name}}',
									value: '={{$responseItem.name}}',
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
			additionalData,
			PROVIDER_NODE_TYPE_MAP.ollama,
			{},
			credentials,
		);
	}

	private fetchAzureOpenAiModels(
		_credentials: INodeCredentials,
		_additionalData: IWorkflowExecuteAdditionalData,
	): INodePropertyOptions[] {
		// Azure doesn't appear to offer a way to list available models via API.
		// If we add support for this in the future on the Azure OpenAI node we should copy that
		// implementation here too.
		return [];
	}

	private fetchAzureEntraIdModels(
		_credentials: INodeCredentials,
		_additionalData: IWorkflowExecuteAdditionalData,
	): INodePropertyOptions[] {
		return [];
	}

	private async fetchAwsBedrockModels(
		credentials: INodeCredentials,
		additionalData: IWorkflowExecuteAdditionalData,
	): Promise<INodePropertyOptions[]> {
		// From AWS Bedrock node
		// https://github.com/n8n-io/n8n/blob/master/packages/%40n8n/nodes-langchain/nodes/llms/LmChatAwsBedrock/LmChatAwsBedrock.node.ts#L100
		// https://github.com/n8n-io/n8n/blob/master/packages/%40n8n/nodes-langchain/nodes/llms/LmChatAwsBedrock/LmChatAwsBedrock.node.ts#L155
		const foundationModelsRequest = this.nodeParametersService.getOptionsViaLoadOptions(
			{
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
			additionalData,
			PROVIDER_NODE_TYPE_MAP.awsBedrock,
			{},
			credentials,
		);

		const inferenceProfileModelsRequest = this.nodeParametersService.getOptionsViaLoadOptions(
			{
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
			additionalData,
			PROVIDER_NODE_TYPE_MAP.awsBedrock,
			{},
			credentials,
		);

		const [foundationModels, inferenceProfileModels] = await Promise.all([
			foundationModelsRequest,
			inferenceProfileModelsRequest,
		]);

		return foundationModels.concat(inferenceProfileModels);
	}

	private async fetchMistralCloudModels(
		credentials: INodeCredentials,
		additionalData: IWorkflowExecuteAdditionalData,
	): Promise<INodePropertyOptions[]> {
		return await this.nodeParametersService.getOptionsViaLoadOptions(
			{
				routing: {
					request: {
						method: 'GET',
						url: '/models',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'data',
								},
							},
							{
								type: 'filter',
								properties: {
									pass: "={{ !$responseItem.id.includes('embed') }}",
								},
							},
							{
								type: 'setKeyValue',
								properties: {
									name: '={{ $responseItem.id }}',
									value: '={{ $responseItem.id }}',
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
			additionalData,
			PROVIDER_NODE_TYPE_MAP.mistralCloud,
			{},
			credentials,
		);
	}

	private async fetchCohereModels(
		credentials: INodeCredentials,
		additionalData: IWorkflowExecuteAdditionalData,
	): Promise<INodePropertyOptions[]> {
		return await this.nodeParametersService.getOptionsViaLoadOptions(
			{
				routing: {
					request: {
						method: 'GET',
						url: '/v1/models?page_size=100&endpoint=chat',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'models',
								},
							},
							{
								type: 'setKeyValue',
								properties: {
									name: '={{$responseItem.name}}',
									value: '={{$responseItem.name}}',
									description: '={{$responseItem.description}}',
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
			additionalData,
			PROVIDER_NODE_TYPE_MAP.cohere,
			{},
			credentials,
		);
	}

	private async fetchDeepSeekModels(
		credentials: INodeCredentials,
		additionalData: IWorkflowExecuteAdditionalData,
	): Promise<INodePropertyOptions[]> {
		return await this.nodeParametersService.getOptionsViaLoadOptions(
			{
				routing: {
					request: {
						method: 'GET',
						url: '/models',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'data',
								},
							},
							{
								type: 'setKeyValue',
								properties: {
									name: '={{$responseItem.id}}',
									value: '={{$responseItem.id}}',
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
			additionalData,
			PROVIDER_NODE_TYPE_MAP.deepSeek,
			{},
			credentials,
		);
	}

	private async fetchOpenRouterModels(
		credentials: INodeCredentials,
		additionalData: IWorkflowExecuteAdditionalData,
	): Promise<INodePropertyOptions[]> {
		return await this.nodeParametersService.getOptionsViaLoadOptions(
			{
				routing: {
					request: {
						method: 'GET',
						url: '/models',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'data',
								},
							},
							{
								type: 'setKeyValue',
								properties: {
									name: '={{$responseItem.id}}',
									value: '={{$responseItem.id}}',
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
			additionalData,
			PROVIDER_NODE_TYPE_MAP.openRouter,
			{},
			credentials,
		);
	}

	private async fetchGroqModels(
		credentials: INodeCredentials,
		additionalData: IWorkflowExecuteAdditionalData,
	): Promise<INodePropertyOptions[]> {
		return await this.nodeParametersService.getOptionsViaLoadOptions(
			{
				routing: {
					request: {
						method: 'GET',
						url: '/models',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'data',
								},
							},
							{
								type: 'filter',
								properties: {
									pass: '={{ $responseItem.active === true && $responseItem.object === "model" }}',
								},
							},
							{
								type: 'setKeyValue',
								properties: {
									name: '={{$responseItem.id}}',
									value: '={{$responseItem.id}}',
								},
							},
						],
					},
				},
			},
			additionalData,
			PROVIDER_NODE_TYPE_MAP.groq,
			{},
			credentials,
		);
	}

	private async fetchXAiGrokModels(
		credentials: INodeCredentials,
		additionalData: IWorkflowExecuteAdditionalData,
	): Promise<INodePropertyOptions[]> {
		return await this.nodeParametersService.getOptionsViaLoadOptions(
			{
				routing: {
					request: {
						method: 'GET',
						url: '/models',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'data',
								},
							},
							{
								type: 'setKeyValue',
								properties: {
									name: '={{$responseItem.id}}',
									value: '={{$responseItem.id}}',
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
			additionalData,
			PROVIDER_NODE_TYPE_MAP.xAiGrok,
			{},
			credentials,
		);
	}

	private async fetchVercelAiGatewayModels(
		credentials: INodeCredentials,
		additionalData: IWorkflowExecuteAdditionalData,
	): Promise<INodePropertyOptions[]> {
		return await this.nodeParametersService.getOptionsViaLoadOptions(
			{
				routing: {
					request: {
						method: 'GET',
						url: '/models',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'data',
								},
							},
							{
								type: 'setKeyValue',
								properties: {
									name: '={{$responseItem.id}}',
									value: '={{$responseItem.id}}',
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
			additionalData,
			PROVIDER_NODE_TYPE_MAP.vercelAiGateway,
			{},
			credentials,
		);
	}

	private transformAndFilterModels(
		rawModels: INodePropertyOptions[],
		provider: ChatHubLLMProvider,
	): ChatModelDto[] {
		return rawModels.flatMap((model) => {
			const id = String(model.value);
			const metadata = getModelMetadata(provider, id);

			if (!metadata.available) {
				return [];
			}

			return [
				{
					id,
					name: model.name,
					description: model.description ?? null,
					icon: null,
					model: {
						provider,
						model: id,
					},
					createdAt: null,
					updatedAt: null,
					projectName: null,
					metadata,
				},
			];
		});
	}
}
