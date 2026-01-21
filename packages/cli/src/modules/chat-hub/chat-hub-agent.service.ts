import type {
	ChatHubUpdateAgentRequest,
	ChatHubCreateAgentRequest,
	ChatModelDto,
	ChatHubLLMProvider,
} from '@n8n/api-types';
import { PROVIDER_CREDENTIAL_TYPE_MAP, chatHubLLMProviderSchema } from '@n8n/api-types';
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
import { type IBinaryData, type INodeCredentials } from 'n8n-workflow';
import { ChatHubWorkflowService } from './chat-hub-workflow.service';
import { WorkflowExecutionService } from '@/workflows/workflow-execution.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ChatHubSettingsService } from './chat-hub.settings.service';

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
	private async determineEmbeddingProvider(
		user: User,
		chatProvider: ChatHubLLMProvider,
		chatCredentialId: string,
	): Promise<{ provider: ChatHubLLMProvider; credentialId: string } | null> {
		// Check if the chat provider supports embeddings
		if (EMBEDDINGS_NODE_TYPE_MAP[chatProvider]) {
			return {
				provider: chatProvider,
				credentialId: chatCredentialId,
			};
		}

		// Chat provider doesn't support embeddings, find a fallback from settings
		const allSettings = await this.chatHubSettingsService.getAllProviderSettings();

		for (const provider of chatHubLLMProviderSchema.options) {
			const settings = allSettings[provider];

			// Check if provider supports embeddings
			if (!EMBEDDINGS_NODE_TYPE_MAP[provider]) {
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

		const embeddingProvider = await this.determineEmbeddingProvider(
			user,
			data.provider,
			data.credentialId,
		);

		const id = uuidv4();
		const files: IBinaryData[] = [];

		for (const file of data.files) {
			files.push(await this.chatHubAttachmentService.storeAgentAttachment(id, file));
		}

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
			embeddingProvider: embeddingProvider?.provider ?? null,
			embeddingCredentialId: embeddingProvider?.credentialId ?? null,
		});

		this.logger.debug(`Chat agent created: ${id} by user ${user.id}`);

		// TODO: revert files on error

		await this.insertDocuments(
			user,
			agent,
			data.files.filter((f) => f.mimeType === 'application/pdf'),
		);

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

		// Track if we need to recreate embeddings
		let needsEmbeddingRecreation = false;
		let newEmbeddingProvider: ChatHubLLMProvider | null = null;
		let newEmbeddingCredentialId: string | null = null;

		// If provider or credential changes, update embedding provider too
		if (updates.provider !== undefined || updates.credentialId !== undefined) {
			const newProvider = updates.provider ?? existingAgent.provider;
			const newCredentialId = (updates.credentialId ?? existingAgent.credentialId)!;

			const embeddingProvider = await this.determineEmbeddingProvider(
				user,
				newProvider,
				newCredentialId,
			);

			// Check if embedding provider actually changed (not just credential)
			// Only provider change affects embedding dimensions
			if (embeddingProvider !== existingAgent.embeddingProvider) {
				needsEmbeddingRecreation = true;
				newEmbeddingProvider = embeddingProvider?.provider ?? null;
				newEmbeddingCredentialId = embeddingProvider?.credentialId ?? null;
			}

			updateData.embeddingProvider = embeddingProvider?.provider ?? null;
			updateData.embeddingCredentialId = embeddingProvider?.credentialId ?? null;
		}
		if (updates.files !== undefined) {
			const existingFiles = existingAgent.files;
			const updatedFiles: IBinaryData[] = [];
			const filesToDelete: IBinaryData[] = [];
			const updateFileIds = new Set(updates.files.flatMap((f) => (f.id ? [f.id] : [])));

			for (const existingFile of existingFiles) {
				if (existingFile.id && updateFileIds.has(existingFile.id)) {
					updatedFiles.push(existingFile);
				} else {
					filesToDelete.push(existingFile);
				}
			}

			const newFiles: IBinaryData[] = [];
			for (const file of updates.files) {
				if (file.id) {
					// Skip existing file
					continue;
				}

				const f = await this.chatHubAttachmentService.storeAgentAttachment(id, file);
				updatedFiles.push(f);
				newFiles.push(file);
			}

			if (filesToDelete.length > 0) {
				await this.chatHubAttachmentService.deleteAttachments(filesToDelete);
			}

			updateData.files = updatedFiles;

			// Sync vector store if any PDF files were added or removed
			const deletedPdfFiles = filesToDelete.filter((f) => f.mimeType === 'application/pdf');
			const newPdfFiles = newFiles.filter((f) => f.mimeType === 'application/pdf');

			// Delete removed PDF files from vector store
			if (deletedPdfFiles.length > 0) {
				const fileNamesToDelete = deletedPdfFiles
					.map((f) => f.fileName)
					.filter((name): name is string => !!name);

				if (fileNamesToDelete.length > 0) {
					await this.deleteDocumentsByFileNames(user.id, id, fileNamesToDelete);
				}
			}

			// Insert new PDF files
			if (newPdfFiles.length > 0) {
				const agentForInsertion = {
					...existingAgent,
					...updateData,
				} as ChatHubAgent;
				await this.insertDocuments(user, agentForInsertion, newPdfFiles);
			}
		}

		const agent = await this.chatAgentRepository.updateAgent(id, updateData);

		// If embedding provider changed, recreate all embeddings
		if (needsEmbeddingRecreation && newEmbeddingProvider && newEmbeddingCredentialId) {
			this.logger.debug(
				`Embedding provider changed for agent ${id}, recreating all embeddings with provider ${newEmbeddingProvider}`,
			);

			// Delete all existing embeddings
			await this.deleteDocuments(user.id, id);

			// Re-insert all PDF files with new embedding provider
			const pdfFiles = agent.files.filter((f) => f.mimeType === 'application/pdf');
			if (pdfFiles.length > 0) {
				await this.insertDocuments(user, agent, pdfFiles);
			}
		}

		this.logger.debug(`Chat agent updated: ${id} by user ${user.id}`);
		return agent;
	}

	async deleteAgent(id: string, userId: string): Promise<void> {
		// First check if the agent exists and belongs to the user
		const existingAgent = await this.chatAgentRepository.getOneById(id, userId);
		if (!existingAgent) {
			throw new NotFoundError('Chat agent not found');
		}

		await this.chatHubAttachmentService.deleteAgentAttachmentById(id);
		await this.chatAgentRepository.deleteAgent(id);

		// Delete all embeddings for this agent from vector store
		await this.deleteDocuments(userId, id);

		this.logger.debug(`Chat agent deleted: ${id} by user ${userId}`);
	}

	private async insertDocuments(user: User, agent: ChatHubAgent, files: IBinaryData[]) {
		if (files.length === 0) {
			return;
		}

		if (!agent.embeddingProvider || !agent.embeddingCredentialId) {
			throw new BadRequestError(
				'Agent must have embedding provider configured to insert documents for RAG',
			);
		}

		// Use the agent's stored embedding provider
		const embeddingCredentialType = PROVIDER_CREDENTIAL_TYPE_MAP[agent.embeddingProvider];
		const credentials: INodeCredentials = {
			[embeddingCredentialType]: {
				id: agent.embeddingCredentialId,
				name: '',
			},
		};

		const { workflowData, executionData } = await this.chatAgentRepository.manager.transaction(
			async (trx) => {
				const project = await this.chatHubCredentialsService.findPersonalProject(user, trx);
				return await this.chatHubWorkflowService.createDocumentsInsertionWorkflow(
					user,
					agent.id,
					project.id,
					files,
					agent.embeddingProvider!,
					credentials,
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
		} finally {
			//await this.chatHubWorkflowService.deleteWorkflow(workflowData.id);
		}
	}

	private async deleteDocuments(userId: string, agentId: string): Promise<void> {
		const memoryKey = this.chatHubWorkflowService.getAgentMemoryKey(userId, agentId);

		// Delete all embeddings for this agent from the vector store
		await this.vectorStoreDataRepository.clearStore(memoryKey);

		this.logger.debug(
			`Deleted embeddings for agent ${agentId} from vector store (memoryKey: ${memoryKey})`,
		);
	}

	private async deleteDocumentsByFileNames(
		userId: string,
		agentId: string,
		fileNames: string[],
	): Promise<void> {
		if (fileNames.length === 0) {
			return;
		}

		const memoryKey = this.chatHubWorkflowService.getAgentMemoryKey(userId, agentId);

		// Delete embeddings for specific files from the vector store
		const deletedCount = await this.vectorStoreDataRepository.deleteByFileNames(
			memoryKey,
			fileNames,
		);

		this.logger.debug(
			`Deleted ${deletedCount} embeddings for ${fileNames.length} files from vector store (memoryKey: ${memoryKey}, fileNames: ${fileNames.join(', ')})`,
		);
	}
}
