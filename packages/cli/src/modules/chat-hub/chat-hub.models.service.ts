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
import { Scope } from '@n8n/permissions';
import {
	CHAT_TRIGGER_NODE_TYPE,
	type INodeCredentials,
	type INodePropertyOptions,
	type IWorkflowExecuteAdditionalData,
} from 'n8n-workflow';

import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { DynamicNodeParametersService } from '@/services/dynamic-node-parameters.service';
import { getBase } from '@/workflow-execute-additional-data';
import { WorkflowService } from '@/workflows/workflow.service';

import { ChatHubAgentService } from './chat-hub-agent.service';
import { fetchLLMProviderModels, LLM_PROVIDER_FETCH_CONFIGS } from './chat-hub-model-fetchers';
import { ChatHubWorkflowService } from './chat-hub-workflow.service';
import { getModelMetadata } from './chat-hub.constants';
import { chatTriggerParamsShape, type ChatTriggerParams } from './chat-hub.types';

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
		credentialIds: Partial<Record<ChatHubProvider, string | null>>,
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
		if (provider === 'n8n') {
			return { models: await this.fetchAgentWorkflowsAsModels(user) };
		}
		if (provider === 'custom-agent') {
			return { models: await this.chatHubAgentService.getAgentsByUserIdAsModels(user.id) };
		}

		const config = LLM_PROVIDER_FETCH_CONFIGS[provider];
		const rawModels = await fetchLLMProviderModels(
			config,
			provider,
			credentials,
			additionalData,
			this.nodeParametersService,
		);
		return { models: this.transformAndFilterModels(rawModels, provider) };
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

		const { allowFileUploads, allowedFilesMimeTypes } =
			this.chatHubWorkflowService.resolveWorkflowAttachmentPolicy(activeVersion.nodes ?? []);

		const agentName =
			chatTriggerParams.agentName && chatTriggerParams.agentName.trim().length > 0
				? chatTriggerParams.agentName
				: name;

		const suggestedPrompts = this.parseSuggestedPrompts(chatTriggerParams.suggestedPrompts);
		const { groupName, groupIcon } = this.resolveOwnerProject(shared);

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
				allowFileUploads,
				allowedFilesMimeTypes,
				capabilities: {
					functionCalling: false,
				},
				available: true,
				scopes,
			},
			groupName,
			groupIcon,
			...(suggestedPrompts.length > 0 ? { suggestedPrompts } : {}),
		};
	}

	private parseSuggestedPrompts(
		raw: ChatTriggerParams['suggestedPrompts'],
	): NonNullable<ChatModelDto['suggestedPrompts']> {
		return (
			raw?.prompts
				?.filter((p) => p.text.trim().length > 0)
				.map((p) => ({ text: p.text, ...(p.icon ? { icon: p.icon } : {}) })) ?? []
		);
	}

	private resolveOwnerProject(shared: WorkflowEntity['shared']) {
		const ownerProject = shared?.find((sw) => sw.role === 'workflow:owner')?.project;

		return {
			// Use null for personal projects so the frontend can display a localized label
			groupName: ownerProject?.type === 'personal' ? null : (ownerProject?.name ?? null),
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
