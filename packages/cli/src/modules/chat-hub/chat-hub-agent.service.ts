import {
	type ChatHubUpdateAgentRequest,
	type ChatHubCreateAgentRequest,
	type ChatHubAgentDto,
	type ChatModelDto,
	type ChatHubAgentKnowledgeItem,
	type ChatHubAgentKnowledgeItemStatus,
} from '@n8n/api-types';

import { Logger } from '@n8n/backend-common';
import type { EntityManager, User } from '@n8n/db';
import { Service } from '@n8n/di';
import { readFile, unlink } from 'fs/promises';
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
import { ChatHubToolService } from './chat-hub-tool.service';

import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { ChatHubExecutionService } from './chat-hub-execution.service';
import { DynamicNodeParametersService } from '@/services/dynamic-node-parameters.service';
import { getBase } from '@/workflow-execute-additional-data';
import type { SemanticSearchOptions } from './chat-hub.types';

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
		const suggestedPrompts = agent.suggestedPrompts.filter((p) => p.text.trim().length > 0);

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
			...(suggestedPrompts.length > 0 ? { suggestedPrompts } : {}),
		};
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
			suggestedPrompts: data.suggestedPrompts ?? [],
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
		if (updates.suggestedPrompts !== undefined)
			updateData.suggestedPrompts = updates.suggestedPrompts ?? [];
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
			suggestedPrompts: agent.suggestedPrompts,
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

	async deleteAgent(id: string, userId: string): Promise<void> {
		// First check if the agent exists and belongs to the user
		const existingAgent = await this.chatAgentRepository.getOneById(id, userId);
		if (!existingAgent) {
			throw new NotFoundError('Chat agent not found');
		}

		try {
			await this.deleteEmbeddingsByAgentId(userId, id);
		} catch (error) {
			this.logger.warn(
				`Could not delete embeddings from vector store for agent ${id}. Proceeding with agent deletion.`,
				{ error },
			);
		}

		await this.chatAgentRepository.deleteAgent(id);

		this.logger.debug(`Chat agent deleted: ${id} by user ${userId}`);
	}

	private async ensureSemanticSearchOptions(): Promise<SemanticSearchOptions> {
		const options = await this.chatHubSettingsService.getSemanticSearchOptions();

		if (options === null) {
			throw new BadRequestError(
				'No vector store credential configured. Please set up a vector store credential in the Chat Hub settings.',
			);
		}

		return options;
	}

	private async insertEmbeddings(
		user: User,
		agentId: string,
		files: Array<{ attachment: IBinaryData; knowledgeId: string }>,
		workflowId: string,
	) {
		if (files.length === 0) {
			return;
		}

		try {
			const settings = await this.ensureSemanticSearchOptions();

			const { workflowData, executionData } = await this.chatAgentRepository.manager.transaction(
				async (trx) => {
					const project = await this.chatHubCredentialsService.findPersonalProject(user, trx);

					return await this.chatHubWorkflowService.createEmbeddingsInsertionWorkflow(
						user,
						project.id,
						files,
						agentId,
						settings,
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
			await this.chatHubExecutionService.ensureWasSuccessfulOrThrow(
				execution.executionId,
				'Could not insert documents',
			);
		} finally {
			await this.chatHubWorkflowService.deleteChatWorkflow(workflowId);
		}
	}

	async deleteAllEmbeddingsForUser(userId: string): Promise<void> {
		const options = await this.chatHubSettingsService.getSemanticSearchOptions();
		if (!options) {
			return;
		}

		const additionalData = await getBase({ userId });

		await this.dynamicNodeParametersService.getActionResult(
			'deleteDocuments',
			'',
			additionalData,
			{ name: options.vectorStore.nodeType, version: 1 },
			{},
			JSON.stringify({ filter: {} }),
			{
				[options.vectorStore.credentialType]: { id: options.vectorStore.credentialId, name: '' },
			},
		);

		this.logger.debug(`Deleted all embeddings for user ${userId} from vector store`);
	}

	private async deleteEmbeddingsByAgentId(userId: string, agentId: string): Promise<void> {
		const settings = await this.chatHubSettingsService.getSemanticSearchOptions();
		if (!settings) {
			return;
		}
		const additionalData = await getBase({ userId });

		await this.dynamicNodeParametersService.getActionResult(
			'deleteDocuments',
			'',
			additionalData,
			{ name: settings.vectorStore.nodeType, version: 1 },
			{},
			JSON.stringify({ filter: { agentId } }),
			{
				[settings.vectorStore.credentialType]: { id: settings.vectorStore.credentialId, name: '' },
			},
		);

		this.logger.debug(`Deleted embeddings for agent ${agentId} from vector store`);
	}

	private async deleteEmbeddingsByKnowledgeId(
		user: User,
		agentId: string,
		fileKnowledgeId: string,
	): Promise<void> {
		const settings = await this.ensureSemanticSearchOptions();
		const additionalData = await getBase({ userId: user.id });

		await this.dynamicNodeParametersService.getActionResult(
			'deleteDocuments',
			'',
			additionalData,
			{ name: settings.vectorStore.nodeType, version: 1 },
			{},
			JSON.stringify({ filter: { agentId, fileKnowledgeId } }),
			{
				[settings.vectorStore.credentialType]: { id: settings.vectorStore.credentialId, name: '' },
			},
		);

		this.logger.debug(
			`Deleted embeddings from vector store (agentId: ${agentId}, knowledgeId: ${fileKnowledgeId})`,
		);
	}

	async addFilesToAgent(
		agentId: string,
		user: User,
		files: Express.Multer.File[],
	): Promise<ChatHubAgentDto> {
		const agent = await this.getAgentById(agentId, user.id);
		const { knowledgeItems, pdfFilesToInsert, workflowId } =
			await this.prepareFilesForIndexing(files);

		const updatedAgent = await this.chatAgentRepository.updateAgent(agentId, {
			files: agent.files.concat(knowledgeItems),
		});

		void this.runIndexingInBackground(
			agentId,
			knowledgeItems.map((i) => i.id),
			pdfFilesToInsert,
			workflowId,
			user,
		);

		const toolIds = await this.chatHubToolService.getToolIdsForAgent(agentId);
		this.logger.debug(`Added ${files.length} file(s) to agent ${agentId} by user ${user.id}`);
		return this.toDto(updatedAgent, toolIds);
	}

	private async runIndexingInBackground(
		agentId: string,
		knowledgeIds: string[],
		pdfFilesToInsert: Array<{ attachment: IBinaryData; knowledgeId: string }>,
		workflowId: string,
		user: User,
	): Promise<void> {
		try {
			await this.insertEmbeddings(user, agentId, pdfFilesToInsert, workflowId);
			await this.updateKnowledgeItemStatuses(agentId, knowledgeIds, 'indexed');
			this.logger.debug(`Indexed ${knowledgeIds.length} file(s) for agent ${agentId}`);
		} catch (error) {
			this.logger.error(`Failed to index files for agent ${agentId}`, { error });
			const errorMessage = error instanceof Error ? error.message : String(error);
			await this.updateKnowledgeItemStatuses(agentId, knowledgeIds, 'error', errorMessage).catch(
				(updateError) => {
					this.logger.error(`Failed to update file statuses to error for agent ${agentId}`, {
						error: updateError,
					});
				},
			);
		}
	}

	private async updateKnowledgeItemStatuses(
		agentId: string,
		knowledgeIds: string[],
		status: ChatHubAgentKnowledgeItemStatus,
		error?: string,
	): Promise<void> {
		const agent = await this.chatAgentRepository.findOne({ where: { id: agentId } });
		if (!agent) {
			return;
		}
		const updatedFiles = agent.files.map((f) =>
			knowledgeIds.includes(f.id) ? { ...f, status, error } : f,
		);
		await this.chatAgentRepository.updateAgent(agentId, { files: updatedFiles });
	}

	async deleteAgentFile(agentId: string, user: User, fileKnowledgeId: string): Promise<void> {
		const agent = await this.getAgentById(agentId, user.id);

		const fileItem = agent.files.find((f) => f.id === fileKnowledgeId);
		if (!fileItem) {
			throw new NotFoundError('File not found');
		}

		try {
			await this.deleteEmbeddingsByKnowledgeId(user, agentId, fileItem.id);
		} catch (error) {
			this.logger.warn(
				`Could not delete embeddings from vector store for file "${fileItem.fileName}" (agentId: ${agentId}, knowledgeId: ${fileItem.id}). Proceeding with file deletion.`,
				{ error },
			);
		}

		await this.chatAgentRepository.updateAgent(agentId, {
			files: agent.files.filter((f) => f.id !== fileKnowledgeId),
		});

		this.logger.debug(
			`Deleted file "${fileItem.fileName}" from agent ${agentId} by user ${user.id}`,
		);
	}

	private async prepareFilesForIndexing(files: Express.Multer.File[]): Promise<{
		knowledgeItems: ChatHubAgentKnowledgeItem[];
		pdfFilesToInsert: Array<{ attachment: IBinaryData; knowledgeId: string }>;
		workflowId: string;
	}> {
		const knowledgeItems: ChatHubAgentKnowledgeItem[] = [];
		const pdfFilesToInsert: Array<{ attachment: IBinaryData; knowledgeId: string }> = [];
		const workflowId = uuidv4();
		const settings = await this.ensureSemanticSearchOptions();

		// Ensure all file types are valid
		for (const file of files) {
			if (file.mimetype !== 'application/pdf') {
				throw new BadRequestError(`Unsupported mime-type: ${file.mimetype}`);
			}
		}

		for (const file of files) {
			// Multer/busboy parses the Content-Disposition filename as Latin-1 by default,
			// but browsers send it as UTF-8 bytes. Re-encode to get the correct string.
			const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');

			// With disk storage file.buffer is undefined; read from the temp path instead.
			const buffer = file.buffer ?? (await readFile(file.path));
			if (file.path) {
				await unlink(file.path).catch((error) => {
					this.logger.warn(`Could not unlink file in temporary path. File: ${originalName}`, {
						error,
					});
				});
			}

			const storedFile = await this.chatHubAttachmentService.storeTemporaryExecutionFile(
				workflowId,
				buffer,
				file.mimetype,
				originalName,
			);

			const knowledgeId = nanoid();

			knowledgeItems.push({
				id: knowledgeId,
				type: 'embedding',
				mimeType: file.mimetype,
				fileName: storedFile.fileName ?? originalName,
				provider: settings.embeddingModel.provider,
				status: 'indexing',
				createdAt: new Date().toISOString(),
			});
			pdfFilesToInsert.push({ attachment: storedFile, knowledgeId });
		}

		return { knowledgeItems, pdfFilesToInsert, workflowId };
	}
}
