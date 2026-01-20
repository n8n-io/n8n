import {
	chatHubProviderSchema,
	emptyChatModelsResponse,
	PROVIDER_CREDENTIAL_TYPE_MAP,
	type ChatHubLLMProvider,
	type ChatHubProvider,
	type ChatModelDto,
	type ChatModelsResponse,
} from '@n8n/api-types';
import { In, WorkflowRepository, type User, type WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';
import {
	CHAT_TRIGGER_NODE_TYPE,
	type INodeCredentials,
	type INodePropertyOptions,
	type IWorkflowExecuteAdditionalData,
} from 'n8n-workflow';

import { ChatHubAgentService } from './chat-hub-agent.service';
import { ChatHubWorkflowService } from './chat-hub-workflow.service';
import { getModelMetadata, PROVIDER_NODE_TYPE_MAP } from './chat-hub.constants';
import { chatTriggerParamsShape } from './chat-hub.types';

import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { DynamicNodeParametersService } from '@/services/dynamic-node-parameters.service';
import { getBase } from '@/workflow-execute-additional-data';
import { WorkflowService } from '@/workflows/workflow.service';
import { Scope } from '@n8n/permissions';

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
				return { models: await this.fetchAgentWorkflowsAsModels(user) };
			case 'custom-agent':
				return { models: await this.chatHubAgentService.getAgentsByUserIdAsModels(user.id) };
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

	private async fetchAgentWorkflowsAsModels(user: User): Promise<ChatModelDto[]> {
		// Workflows are scanned by their latest version for chat trigger nodes.
		// This means that we might miss some active workflow versions that had chat triggers but
		// the latest version does not, but this trade-off is done for performance.
		const workflowsWithChatTrigger = await this.workflowService.getWorkflowsWithNodesIncluded(
			user,
			[CHAT_TRIGGER_NODE_TYPE],
			true,
		);

		const activeWorkflows = workflowsWithChatTrigger
			// Ensure the user has chat execution access to the workflow
			.filter((workflow) => workflow.scopes.includes('workflow:execute-chat'))
			// The workflow has to be active
			.filter((workflow) => !!workflow.activeVersionId);

		if (activeWorkflows.length === 0) {
			return [];
		}

		const workflows = await this.workflowRepository.find({
			select: {
				id: true,
				name: true,
				shared: {
					role: true,
					project: {
						id: true,
						name: true,
						type: true,
						icon: { type: true, value: true },
					},
				},
			},
			where: { id: In(activeWorkflows.map((workflow) => workflow.id)) },
			relations: {
				activeVersion: true,
				shared: {
					project: true,
				},
			},
		});

		return workflows.flatMap((workflow) => {
			const scopes = activeWorkflows.find((w) => w.id === workflow.id)?.scopes ?? [];
			const model = this.extractModelFromWorkflow(workflow, scopes);

			return model ? [model] : [];
		});
	}

	extractModelFromWorkflow(
		{ name, activeVersion, id, shared }: WorkflowEntity,
		scopes: Scope[],
	): ChatModelDto | null {
		if (!activeVersion) {
			return null;
		}

		const chatTrigger = activeVersion.nodes?.find((node) => node.type === CHAT_TRIGGER_NODE_TYPE);
		if (!chatTrigger) {
			return null;
		}

		const chatTriggerParams = chatTriggerParamsShape.safeParse(chatTrigger.parameters).data;
		if (!chatTriggerParams?.availableInChat) {
			return null;
		}

		const inputModalities = this.chatHubWorkflowService.parseInputModalities(
			chatTriggerParams.options,
		);

		const agentName =
			chatTriggerParams.agentName && chatTriggerParams.agentName.trim().length > 0
				? chatTriggerParams.agentName
				: name;

		// Find the owner's project (home project)
		const ownerSharedWorkflow = shared?.find((sw) => sw.role === 'workflow:owner');
		const ownerProject = ownerSharedWorkflow?.project;

		// Use null for personal projects so the frontend can display a localized label
		const groupName = ownerProject?.type === 'personal' ? null : (ownerProject?.name ?? null);

		return {
			name: agentName,
			description: chatTriggerParams.agentDescription ?? null,
			icon: chatTriggerParams.agentIcon ?? null,
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
				available: true,
				scopes,
			},
			groupName,
			groupIcon: ownerProject?.icon ?? null,
		};
	}

	private transformAndFilterModels(
		rawModels: INodePropertyOptions[],
		provider: ChatHubLLMProvider,
	): ChatModelDto[] {
		const seen = new Set<string>();

		return rawModels.flatMap((model) => {
			const id = String(model.value);
			const metadata = getModelMetadata(provider, id);

			if (!metadata.available) return [];

			// Deduplication as some providers (mistralCloud) return duplicate models
			if (seen.has(id)) return [];
			seen.add(id);

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
					metadata,
					groupName: null,
					groupIcon: null,
				},
			];
		});
	}
}
