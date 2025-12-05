import { In, type WorkflowRepository, type User } from '@n8n/db';
import { getBase } from '@/workflow-execute-additional-data';

import { ChatHubAgentService } from './chat-hub-agent.service';
import { ChatHubWorkflowService } from './chat-hub-workflow.service';

import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { DynamicNodeParametersService } from '@/services/dynamic-node-parameters.service';
import { WorkflowService } from '@/workflows/workflow.service';
import { getModelMetadata, PROVIDER_NODE_TYPE_MAP } from './chat-hub.constants';
import {
	AGENT_LANGCHAIN_NODE_TYPE,
	CHAT_TRIGGER_NODE_TYPE,
	type INodeCredentials,
	type INodePropertyOptions,
	type IWorkflowExecuteAdditionalData,
} from 'n8n-workflow';
import {
	chatHubProviderSchema,
	emptyChatModelsResponse,
	PROVIDER_CREDENTIAL_TYPE_MAP,
	type ChatHubLLMProvider,
	type ChatHubProvider,
	type ChatModelDto,
	type ChatModelsResponse,
} from '@n8n/api-types';
import { validChatTriggerParamsShape } from './chat-hub.types';
import { Service } from '@n8n/di';

@Service()
export class ChatHubModelsService {
	constructor(
		private readonly nodeParametersService: DynamicNodeParametersService,
		private readonly workflowService: WorkflowService,
		private readonly workflowRepository: WorkflowRepository,
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
				return await this.fetchAgentWorkflowsAsModels(user);
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

	private async fetchAgentWorkflowsAsModels(user: User): Promise<ChatModelsResponse['n8n']> {
		// Workflows are scanned by their latest version for chat trigger nodes.
		// This means that we might miss some active workflow versions that had chat triggers but
		// the latest version does not, but this trade-off is done for performance.
		const workflowsWithChatTrigger = await this.workflowService.getWorkflowsWithNodesIncluded(
			user,
			[CHAT_TRIGGER_NODE_TYPE],
			true,
		);

		const activeWorkflows = workflowsWithChatTrigger
			// Ensure the user has at least read access to the workflows
			.filter((workflow) => workflow.scopes.includes('workflow:read'))
			.filter((workflow) => !!workflow.activeVersionId);

		const workflows = await this.workflowRepository.find({
			select: { id: true },
			where: { id: In(activeWorkflows.map((workflow) => workflow.id)) },
			relations: { activeVersion: true },
		});

		const models: ChatModelDto[] = [];

		for (const { id, activeVersion } of workflows) {
			if (!activeVersion) {
				continue;
			}

			const chatTrigger = activeVersion.nodes?.find((node) => node.type === CHAT_TRIGGER_NODE_TYPE);
			if (!chatTrigger) {
				continue;
			}

			const chatTriggerParams = validChatTriggerParamsShape.safeParse(chatTrigger.parameters).data;
			if (!chatTriggerParams) {
				continue;
			}

			const agentNodes = activeVersion.nodes?.filter(
				(node) => node.type === AGENT_LANGCHAIN_NODE_TYPE,
			);

			// Agents older than this can't do streaming
			if (agentNodes.some((node) => node.typeVersion < 2.1)) {
				continue;
			}

			const inputModalities = this.chatHubWorkflowService.parseInputModalities(
				chatTriggerParams.options,
			);

			models.push({
				name: chatTriggerParams.agentName ?? activeVersion.name ?? 'Unknown Agent',
				description: chatTriggerParams.agentDescription ?? null,
				model: {
					provider: 'n8n',
					workflowId: id,
				},
				createdAt: activeVersion.createdAt ? activeVersion.createdAt.toISOString() : null,
				updatedAt: activeVersion.updatedAt ? activeVersion.updatedAt.toISOString() : null,
				metadata: {
					inputModalities,
					capabilities: {
						functionCalling: false,
					},
				},
			});
		}

		return {
			models,
		};
	}

	private transformAndFilterModels(
		rawModels: INodePropertyOptions[],
		provider: ChatHubLLMProvider,
	): ChatModelDto[] {
		return rawModels.map((model) => {
			const id = String(model.value);

			return {
				id,
				name: model.name,
				description: model.description ?? null,
				model: {
					provider,
					model: id,
				},
				createdAt: null,
				updatedAt: null,
				metadata: getModelMetadata(provider, id),
			};
		});
	}
}
