import type {
	ChatHubUpdateAgentRequest,
	ChatHubCreateAgentRequest,
	ChatHubAgentDto,
	ChatModelDto,
	ChatHubAgentKnowledgeItem,
	ChatAttachment,
	ChatHubLLMProvider,
} from '@n8n/api-types';
import { PROVIDER_CREDENTIAL_TYPE_MAP } from '@n8n/api-types';

import { Logger } from '@n8n/backend-common';
import type { EntityManager, User } from '@n8n/db';
import { Service } from '@n8n/di';
import { v4 as uuidv4 } from 'uuid';

import type { ChatHubAgent, IChatHubAgent } from './chat-hub-agent.entity';
import { ChatHubAgentRepository } from './chat-hub-agent.repository';
import { ChatHubCredentialsService } from './chat-hub-credentials.service';
import { getModelMetadata } from './chat-hub.constants';
import { ChatHubAttachmentService } from './chat-hub.attachment.service';
import { type IBinaryData } from 'n8n-workflow';
import { ChatHubWorkflowService } from './chat-hub-workflow.service';
import { WorkflowExecutionService } from '@/workflows/workflow-execution.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ChatHubSettingsService } from './chat-hub.settings.service';
import type { ProviderAndCredentialId } from './chat-hub.types';
import { ChatHubToolService } from './chat-hub-tool.service';

import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { ChatHubExecutionService } from './chat-hub-execution.service';
import { DynamicNodeParametersService } from '@/services/dynamic-node-parameters.service';
import { getBase } from '@/workflow-execute-additional-data';
import { VECTOR_STORE_PG_VECTOR_SCOPED_NODE_TYPE } from 'n8n-workflow';

@Service()
export class ChatHubAgentService {
	constructor(
		private readonly logger: Logger,
		private readonly chatAgentRepository: ChatHubAgentRepository,
		private readonly chatHubCredentialsService: ChatHubCredentialsService,
		private readonly chatHubAttachmentService: ChatHubAttachmentService,
		private readonly chatHubWorkflowService: ChatHubWorkflowService,
		private readonly chatHubExecutionService: ChatHubExecutionService,
		private readonly workflowExecutionService: WorkflowExecutionService,
		private readonly chatHubSettingsService: ChatHubSettingsService,
		private readonly dynamicNodeParametersService: DynamicNodeParametersService,
		private readonly chatHubToolService: ChatHubToolService,
	) {
		this.logger = this.logger.scoped('chat-hub');
	}

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
	 * Uses the embedding credential configured in Chat Hub settings.
	 */
	async determineEmbeddingProvider(user: User): Promise<ProviderAndCredentialId | null> {
		const embeddingCredential = await this.chatHubSettingsService.getEmbeddingCredential();
		if (!embeddingCredential) return null;

		await this.chatHubCredentialsService.ensureCredentialAccess(user, embeddingCredential.id);

		const credentialTypeToProvider = Object.fromEntries(
			Object.entries(PROVIDER_CREDENTIAL_TYPE_MAP).map(([provider, credType]) => [
				credType,
				provider as ChatHubLLMProvider,
			]),
		);

		const provider = credentialTypeToProvider[embeddingCredential.type];
		if (!provider) return null;

		return { provider, credentialId: embeddingCredential.id };
	}

	async getAgentsByUserId(userId: string): Promise<ChatHubAgent[]> {
		return await this.chatAgentRepository.getManyByUserId(userId);
	}

	async getAgentsByUserIdAsDtos(userId: string): Promise<ChatHubAgentDto[]> {
		const agents = await this.chatAgentRepository.getManyByUserIdWithToolIds(userId);
		return agents.map((agent) =>
			this.toDto(
				agent,
				(agent.tools ?? []).map((t) => t.id),
			),
		);
	}

	async getAgentById(id: string, userId: string, trx?: EntityManager): Promise<ChatHubAgent> {
		const agent = await this.chatAgentRepository.getOneById(id, userId, trx);
		if (!agent) {
			throw new NotFoundError('Chat agent not found');
		}
		return agent;
	}

	async getAgentByIdAsDto(id: string, userId: string): Promise<ChatHubAgentDto> {
		const agent = await this.getAgentById(id, userId);
		const toolIds = await this.chatHubToolService.getToolIdsForAgent(agent.id);

		return this.toDto(agent, toolIds);
	}

	async createAgent(user: User, data: ChatHubCreateAgentRequest): Promise<ChatHubAgentDto> {
		// Ensure user has access to the credential being saved
		await this.chatHubCredentialsService.ensureCredentialAccess(user, data.credentialId);

		const id = uuidv4();
		const embeddingModel = await this.determineEmbeddingProvider(user);
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
			files,
		});

		if (data.toolIds.length > 0) {
			await this.chatHubToolService.setAgentTools(id, data.toolIds);
		}

		this.logger.debug(`Chat agent created: ${id} by user ${user.id}`);
		return this.toDto(agent, data.toolIds);
	}

	async updateAgent(
		id: string,
		user: User,
		updates: ChatHubUpdateAgentRequest,
	): Promise<ChatHubAgentDto> {
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

		const newEmbeddingModel = await this.determineEmbeddingProvider(user);

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

		if (updates.toolIds !== undefined) {
			await this.chatHubToolService.setAgentTools(id, updates.toolIds);
		}

		this.logger.debug(`Chat agent updated: ${id} by user ${user.id}`);
		const toolIds = await this.chatHubToolService.getToolIdsForAgent(agent.id);

		return this.toDto(agent, toolIds);
	}

	private toDto(agent: ChatHubAgent, toolIds: string[]): ChatHubAgentDto {
		return {
			id: agent.id,
			name: agent.name,
			description: agent.description,
			icon: agent.icon,
			systemPrompt: agent.systemPrompt,
			ownerId: agent.ownerId,
			credentialId: agent.credentialId,
			provider: agent.provider,
			model: agent.model,
			files: agent.files,
			toolIds,
			createdAt: agent.createdAt.toISOString(),
			updatedAt: agent.updatedAt.toISOString(),
		};
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

	getAgentMemoryKey(agentId: string): string {
		return `chat-hub-agent-files-${agentId}`;
	}

	async ensureVectorStoreCredential(_user: User) {
		const credentialId = await this.chatHubSettingsService.getVectorStoreCredentialId();

		if (credentialId === null) {
			throw new BadRequestError(
				'No PGVector credential configured. Please set up a vector store credential in the Chat Hub settings.',
			);
		}

		return { id: credentialId };
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

		const cred = await this.ensureVectorStoreCredential(user);

		const { workflowData, executionData } = await this.chatAgentRepository.manager.transaction(
			async (trx) => {
				const project = await this.chatHubCredentialsService.findPersonalProject(user, trx);

				return await this.chatHubWorkflowService.createEmbeddingsInsertionWorkflow(
					user,
					project.id,
					files,
					{
						agentId,
						embeddingModel,
						credentialId: cred.id,
					},
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

		await this.chatHubExecutionService.waitForExecutionCompletion(execution.executionId);
		await this.chatHubExecutionService.ensureWasSuccessfulOrThrow(execution.executionId);
		//await this.chatHubWorkflowService.deleteWorkflow(workflowData.id);
	}

	private async deleteEmbeddings(user: User, agentId: string): Promise<void> {
		const cred = await this.ensureVectorStoreCredential(user);
		const additionalData = await getBase({ userId: user.id });
		await this.dynamicNodeParametersService.getActionResult(
			'deleteDocuments',
			'',
			additionalData,
			{ name: VECTOR_STORE_PG_VECTOR_SCOPED_NODE_TYPE, version: 1 },
			{},
			JSON.stringify({ filter: { agentId } }),
			{ vectorStorePGVectorScopedApi: { id: cred.id, name: '' } },
		);
		this.logger.debug(`Deleted embeddings for agent ${agentId} from vector store`);
	}

	private async deleteEmbeddingsByFileNames(
		user: User,
		agentId: string,
		fileNames: string[],
	): Promise<void> {
		if (fileNames.length === 0) {
			return;
		}

		const cred = await this.ensureVectorStoreCredential(user);
		const additionalData = await getBase({ userId: user.id });
		await this.dynamicNodeParametersService.getActionResult(
			'deleteDocuments',
			'',
			additionalData,
			{ name: VECTOR_STORE_PG_VECTOR_SCOPED_NODE_TYPE, version: 1 },
			{},
			JSON.stringify({ filter: { agentId, fileName: fileNames } }),
			{ vectorStorePGVectorScopedApi: { id: cred.id, name: '' } },
		);
		this.logger.debug(
			`Deleted embeddings for ${fileNames.length} files from vector store (agentId: ${agentId}, fileNames: ${fileNames.join(', ')})`,
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
