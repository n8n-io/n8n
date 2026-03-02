import type {
	ChatHubUpdateAgentRequest,
	ChatHubCreateAgentRequest,
	ChatHubAgentDto,
	ChatModelDto,
	ChatHubAgentKnowledgeItem,
	ChatHubLLMProvider,
} from '@n8n/api-types';
import { PROVIDER_CREDENTIAL_TYPE_MAP } from '@n8n/api-types';

import { Logger } from '@n8n/backend-common';
import type { EntityManager, User } from '@n8n/db';
import { Service } from '@n8n/di';
import { nanoid } from 'nanoid';
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
			files: [],
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
		files: Array<{ attachment: IBinaryData; knowledgeId: string }>,
		workflowId: string,
	) {
		if (files.length === 0) {
			return;
		}

		try {
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
						workflowId,
					);
				},
			);

			const execution = await this.workflowExecutionService.executeChatWorkflow(
				user,
				workflowData,
				executionData,
				undefined,
				false,
				'chat',
			);

			await this.chatHubExecutionService.waitForExecutionCompletion(execution.executionId);
			await this.chatHubExecutionService.ensureWasSuccessfulOrThrow(execution.executionId);
		} finally {
			await this.chatHubWorkflowService.deleteChatWorkflow(workflowId);
		}
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

	private async deleteEmbeddingsByKnowledgeIds(
		user: User,
		agentId: string,
		knowledgeIds: string[],
	): Promise<void> {
		if (knowledgeIds.length === 0) {
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
			JSON.stringify({ filter: { agentId, fileKnowledgeId: knowledgeIds } }),
			{ vectorStorePGVectorScopedApi: { id: cred.id, name: '' } },
		);
		this.logger.debug(
			`Deleted embeddings for ${knowledgeIds.length} files from vector store (agentId: ${agentId}, knowledgeIds: ${knowledgeIds.join(', ')})`,
		);
	}

	async addFilesToAgent(
		agentId: string,
		user: User,
		files: Express.Multer.File[],
	): Promise<ChatHubAgentDto> {
		const agent = await this.getAgentById(agentId, user.id);
		const embeddingModel = await this.determineEmbeddingProvider(user);
		const newFiles = await this.processNewFilesFromMulter(user, agentId, files, embeddingModel);

		const updatedAgent = await this.chatAgentRepository.updateAgent(agentId, {
			files: [...agent.files, ...newFiles],
		});

		const toolIds = await this.chatHubToolService.getToolIdsForAgent(agentId);
		this.logger.debug(`Added ${files.length} file(s) to agent ${agentId} by user ${user.id}`);
		return this.toDto(updatedAgent, toolIds);
	}

	async deleteAgentFile(agentId: string, user: User, fileName: string): Promise<void> {
		const agent = await this.getAgentById(agentId, user.id);

		const fileItem = agent.files.find((f) => f.fileName === fileName);
		if (!fileItem) {
			throw new NotFoundError('File not found');
		}

		await this.deleteEmbeddingsByKnowledgeIds(user, agentId, [fileItem.id]);

		await this.chatAgentRepository.updateAgent(agentId, {
			files: agent.files.filter((f) => f.fileName !== fileName),
		});

		this.logger.debug(`Deleted file "${fileName}" from agent ${agentId} by user ${user.id}`);
	}

	private async processNewFilesFromMulter(
		user: User,
		agentId: string,
		files: Express.Multer.File[],
		embeddingModel: ProviderAndCredentialId | null,
	): Promise<ChatHubAgentKnowledgeItem[]> {
		const knowledgeItems: ChatHubAgentKnowledgeItem[] = [];
		const pdfFilesToInsert: Array<{ attachment: IBinaryData; knowledgeId: string }> = [];
		const workflowId = uuidv4();

		for (const file of files) {
			if (!embeddingModel) {
				throw new BadRequestError(
					'Agent must have embedding provider configured to insert embeddings for RAG',
				);
			}

			// Multer/busboy parses the Content-Disposition filename as Latin-1 by default,
			// but browsers send it as UTF-8 bytes. Re-encode to get the correct string.
			const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');

			const storedFile = await this.chatHubAttachmentService.storeAgentAttachmentFromBuffer(
				workflowId,
				file.buffer,
				file.mimetype,
				originalName,
			);

			const knowledgeId = nanoid();

			knowledgeItems.push({
				id: knowledgeId,
				type: 'embedding',
				mimeType: file.mimetype,
				fileName: storedFile.fileName ?? originalName,
				provider: embeddingModel.provider,
			});
			pdfFilesToInsert.push({ attachment: storedFile, knowledgeId });
		}

		if (pdfFilesToInsert.length > 0) {
			await this.insertEmbeddings(user, agentId, embeddingModel!, pdfFilesToInsert, workflowId);
		}

		return knowledgeItems;
	}
}
