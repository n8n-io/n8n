import type {
	ChatHubUpdateAgentRequest,
	ChatHubCreateAgentRequest,
	ChatModelDto,
	ChatHubAgentKnowledgeItem,
	ChatAttachment,
	ChatHubLLMProvider,
} from '@n8n/api-types';
import { chatHubLLMProviderSchema } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { EntityManager, User } from '@n8n/db';
import { VectorStoreDataRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { v4 as uuidv4 } from 'uuid';

import { NotFoundError } from '@/errors/response-errors/not-found.error';

import type { ChatHubAgent, IChatHubAgent } from './chat-hub-agent.entity';
import { ChatHubAgentRepository } from './chat-hub-agent.repository';
import { ChatHubCredentialsService } from './chat-hub-credentials.service';
import { EMBEDDINGS_NODE_TYPE_MAP, getModelMetadata } from './chat-hub.constants';
import { ChatHubAttachmentService } from './chat-hub.attachment.service';
import { type IBinaryData } from 'n8n-workflow';
import { ChatHubWorkflowService } from './chat-hub-workflow.service';
import { WorkflowExecutionService } from '@/workflows/workflow-execution.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ChatHubSettingsService } from './chat-hub.settings.service';
import type { ProviderAndCredentialId } from './chat-hub.types';

@Service()
export class ChatHubAgentService {
	constructor(
		private readonly logger: Logger,
		private readonly chatAgentRepository: ChatHubAgentRepository,
		private readonly chatHubCredentialsService: ChatHubCredentialsService,
		private readonly chatHubAttachmentService: ChatHubAttachmentService,
		private readonly chatHubWorkflowService: ChatHubWorkflowService,
		private readonly workflowExecutionService: WorkflowExecutionService,
		private readonly vectorStoreDataRepository: VectorStoreDataRepository,
		private readonly chatHubSettingsService: ChatHubSettingsService,
	) {}

	async getAgentsByUserIdAsModels(userId: string): Promise<ChatModelDto[]> {
		const agents = await this.getAgentsByUserId(userId);

		return agents.map((agent) => this.convertAgentEntityToModel(agent));
	}

	convertAgentEntityToModel(agent: ChatHubAgent): ChatModelDto {
		return {
			name: agent.name,
			description: agent.description ?? null,
			icon: agent.icon,
			model: {
				provider: 'custom-agent',
				agentId: agent.id,
			},
			createdAt: agent.createdAt.toISOString(),
			updatedAt: agent.updatedAt.toISOString(),
			metadata: getModelMetadata(agent.provider, agent.model),
			groupName: null,
			groupIcon: null,
		};
	}

	/**
	 * Determines which embedding provider to use for the agent.
	 * If the agent's chat provider supports embeddings, use it.
	 * Otherwise, find a usable embedding provider from settings that the user has access to.
	 */
	async determineEmbeddingProvider(
		user: User,
		chatModel: ProviderAndCredentialId,
		embeddingProvider?: ChatHubLLMProvider,
	): Promise<ProviderAndCredentialId | null> {
		// Check if the chat provider supports embeddings
		if (
			EMBEDDINGS_NODE_TYPE_MAP[chatModel.provider] &&
			(!embeddingProvider || chatModel.provider === embeddingProvider)
		) {
			return chatModel;
		}

		// Chat provider doesn't support embeddings, find a fallback from settings
		const allSettings = await this.chatHubSettingsService.getAllProviderSettings();

		for (const provider of chatHubLLMProviderSchema.options) {
			const settings = allSettings[provider];

			// Check if provider supports embeddings
			if (!EMBEDDINGS_NODE_TYPE_MAP[provider]) {
				continue;
			}

			if (embeddingProvider && provider !== embeddingProvider) {
				continue;
			}

			// Check if provider is enabled
			if (!settings.enabled) {
				continue;
			}

			// Check if provider has credentials configured in the settings
			if (!settings.credentialId) {
				continue;
			}

			// Check if user has permission to use this credential
			try {
				await this.chatHubCredentialsService.ensureCredentialAccess(user, settings.credentialId);
				return {
					provider,
					credentialId: settings.credentialId,
				};
			} catch {
				// User doesn't have access to this credential, try next provider
				continue;
			}
		}

		return null;
	}

	async getAgentsByUserId(userId: string): Promise<ChatHubAgent[]> {
		return await this.chatAgentRepository.getManyByUserId(userId);
	}

	async getAgentById(id: string, userId: string, trx?: EntityManager): Promise<ChatHubAgent> {
		const agent = await this.chatAgentRepository.getOneById(id, userId, trx);
		if (!agent) {
			throw new NotFoundError('Chat agent not found');
		}
		return agent;
	}

	async createAgent(user: User, data: ChatHubCreateAgentRequest): Promise<ChatHubAgent> {
		// Ensure user has access to the credential being saved
		await this.chatHubCredentialsService.ensureCredentialAccess(user, data.credentialId);

		const id = uuidv4();
		const embeddingModel = await this.determineEmbeddingProvider(user, data);
		const files = await this.processNewFiles(user, id, data.files, embeddingModel);

		const agent = await this.chatAgentRepository.createAgent({
			id,
			name: data.name,
			description: data.description ?? null,
			icon: data.icon,
			systemPrompt: data.systemPrompt,
			ownerId: user.id,
			credentialId: data.credentialId,
			provider: data.provider,
			model: data.model,
			tools: data.tools,
			files,
		});

		this.logger.debug(`Chat agent created: ${id} by user ${user.id}`);

		// TODO: revert files on error

		return agent;
	}

	async updateAgent(
		id: string,
		user: User,
		updates: ChatHubUpdateAgentRequest,
	): Promise<ChatHubAgent> {
		// First check if the agent exists and belongs to the user
		const existingAgent = await this.chatAgentRepository.getOneById(id, user.id);
		if (!existingAgent) {
			throw new NotFoundError('Chat agent not found');
		}

		// Ensure user has access to the credential if provided
		if (updates.credentialId !== undefined && updates.credentialId !== null) {
			await this.chatHubCredentialsService.ensureCredentialAccess(user, updates.credentialId);
		}

		const updateData: Partial<IChatHubAgent> = {};

		if (updates.name !== undefined) updateData.name = updates.name;
		if (updates.description !== undefined) updateData.description = updates.description ?? null;
		if (updates.icon !== undefined) updateData.icon = updates.icon;
		if (updates.systemPrompt !== undefined) updateData.systemPrompt = updates.systemPrompt;
		if (updates.credentialId !== undefined) updateData.credentialId = updates.credentialId ?? null;
		if (updates.provider !== undefined) updateData.provider = updates.provider;
		if (updates.model !== undefined) updateData.model = updates.model ?? null;
		if (updates.tools !== undefined) updateData.tools = updates.tools;

		const newEmbeddingModel = await this.determineEmbeddingProvider(user, {
			provider: updates.provider ?? existingAgent.provider,
			credentialId: updates.credentialId ?? existingAgent.credentialId ?? '',
		});

		const filesToKeep = await this.processDeleteFiles(
			user,
			id,
			existingAgent.files,
			updates.keepFileIndices,
			newEmbeddingModel?.provider ?? null,
		);
		const newFiles = await this.processNewFiles(user, id, updates.newFiles, newEmbeddingModel);

		updateData.files = filesToKeep.concat(newFiles);

		const agent = await this.chatAgentRepository.updateAgent(id, updateData);

		this.logger.debug(`Chat agent updated: ${id} by user ${user.id}`);
		return agent;
	}

	async deleteAgent(id: string, user: User): Promise<void> {
		// First check if the agent exists and belongs to the user
		const existingAgent = await this.chatAgentRepository.getOneById(id, user.id);
		if (!existingAgent) {
			throw new NotFoundError('Chat agent not found');
		}

		await this.chatHubAttachmentService.deleteAgentAttachmentById(id);
		await this.chatAgentRepository.deleteAgent(id);
		await this.deleteEmbeddings(user, id);

		this.logger.debug(`Chat agent deleted: ${id} by user ${user.id}`);
	}

	getAgentMemoryKey(userId: string, agentId: string): string {
		return `chat-hub-agent-files-${userId}-${agentId}`;
	}

	private async insertEmbeddings(
		user: User,
		agentId: string,
		embeddingModel: ProviderAndCredentialId,
		files: IBinaryData[],
	) {
		if (files.length === 0) {
			return;
		}

		const { workflowData, executionData } = await this.chatAgentRepository.manager.transaction(
			async (trx) => {
				const project = await this.chatHubCredentialsService.findPersonalProject(user, trx);
				return await this.chatHubWorkflowService.createEmbeddingsInsertionWorkflow(
					user,
					project.id,
					files,
					{ embeddingModel, memoryKey: this.getAgentMemoryKey(user.id, agentId) },
					trx,
				);
			},
		);

		const execution = await this.workflowExecutionService.executeChatWorkflow(
			user,
			workflowData,
			executionData,
			undefined,
			false,
			'chat', // TODO: check which one to use
		);

		try {
			await this.chatHubWorkflowService.waitForExecutionCompletion(execution.executionId);
			await this.chatHubWorkflowService.ensureWasSuccessfulOrThrow(execution.executionId);
		} finally {
			//await this.chatHubWorkflowService.deleteWorkflow(workflowData.id);
		}
	}

	private async deleteEmbeddings(user: User, agentId: string): Promise<void> {
		const memoryKey = this.getAgentMemoryKey(user.id, agentId);
		const { id: projectId } = await this.chatHubCredentialsService.findPersonalProject(user);

		// Delete all embeddings for this agent from the vector store
		await this.vectorStoreDataRepository.clearStore(memoryKey, projectId);

		this.logger.debug(
			`Deleted embeddings for agent ${agentId} from vector store (memoryKey: ${memoryKey}, projectId: ${projectId})`,
		);
	}

	private async deleteEmbeddingsByFileNames(
		user: User,
		agentId: string,
		fileNames: string[],
	): Promise<void> {
		if (fileNames.length === 0) {
			return;
		}

		const memoryKey = this.getAgentMemoryKey(user.id, agentId);
		const { id: projectId } = await this.chatHubCredentialsService.findPersonalProject(user);

		// Delete embeddings for specific files from the vector store
		const deletedCount = await this.vectorStoreDataRepository.deleteByFileNames(
			memoryKey,
			projectId,
			fileNames,
		);

		this.logger.debug(
			`Deleted ${deletedCount} embeddings for ${fileNames.length} files from vector store (memoryKey: ${memoryKey}, projectId: ${projectId}, fileNames: ${fileNames.join(', ')})`,
		);
	}

	private async processNewFiles(
		user: User,
		id: string,
		binaryItems: ChatAttachment[],
		embeddingModel: ProviderAndCredentialId | null,
	): Promise<ChatHubAgentKnowledgeItem[]> {
		const files: ChatHubAgentKnowledgeItem[] = [];
		const pdfFilesToInsert: IBinaryData[] = [];

		for (const file of binaryItems) {
			const storedFile = await this.chatHubAttachmentService.storeAgentAttachment(id, file);

			if (file.mimeType === 'application/pdf') {
				if (!embeddingModel) {
					throw new BadRequestError(
						'Agent must have embedding provider configured to insert embeddings for RAG',
					);
				}

				files.push({
					type: 'embedding',
					mimeType: file.mimeType,
					fileName: file.fileName,
					provider: embeddingModel.provider,
				});
				pdfFilesToInsert.push(storedFile);
			} else {
				files.push({ type: 'file', binaryData: storedFile });
			}
		}

		if (pdfFilesToInsert.length > 0) {
			if (!embeddingModel) {
				throw new BadRequestError(
					'Agent must have embedding provider configured to insert embeddings for RAG',
				);
			}

			await this.insertEmbeddings(user, id, embeddingModel, pdfFilesToInsert);
			await this.chatHubAttachmentService.deleteAttachments(pdfFilesToInsert);
		}

		return files;
	}

	private async processDeleteFiles(
		user: User,
		agentId: string,
		existingFiles: ChatHubAgentKnowledgeItem[],
		keepFileIndices: number[],
		availableEmbeddingProvider: ChatHubLLMProvider | null,
	): Promise<ChatHubAgentKnowledgeItem[]> {
		const filesToKeep: ChatHubAgentKnowledgeItem[] = [];
		const embeddingsToDelete: string[] = [];
		const attachmentsToDelete: IBinaryData[] = [];

		for (let i = 0; i < existingFiles.length; i++) {
			const file = existingFiles[i];

			if (file.type === 'embedding') {
				if (!keepFileIndices.includes(i) || availableEmbeddingProvider !== file.provider) {
					embeddingsToDelete.push(file.fileName);
				} else {
					filesToKeep.push(file);
				}
			} else {
				if (!keepFileIndices.includes(i)) {
					attachmentsToDelete.push(file.binaryData);
				} else {
					filesToKeep.push(file);
				}
			}
		}

		await this.deleteEmbeddingsByFileNames(user, agentId, embeddingsToDelete);
		await this.chatHubAttachmentService.deleteAttachments(attachmentsToDelete);

		return filesToKeep;
	}
}
