import type {
	ChatHubUpdateAgentRequest,
	ChatHubCreateAgentRequest,
	ChatModelDto,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { EntityManager, User } from '@n8n/db';
import { Service } from '@n8n/di';
import { v4 as uuidv4 } from 'uuid';

import { NotFoundError } from '@/errors/response-errors/not-found.error';

import type { ChatHubAgent, IChatHubAgent } from './chat-hub-agent.entity';
import { ChatHubAgentRepository } from './chat-hub-agent.repository';
import { ChatHubCredentialsService } from './chat-hub-credentials.service';
import { getModelMetadata } from './chat-hub.constants';
import { ChatHubAttachmentService } from './chat-hub.attachment.service';
import type { IBinaryData } from 'n8n-workflow';

@Service()
export class ChatHubAgentService {
	constructor(
		private readonly logger: Logger,
		private readonly chatAgentRepository: ChatHubAgentRepository,
		private readonly chatHubCredentialsService: ChatHubCredentialsService,
		private readonly chatHubAttachmentService: ChatHubAttachmentService,
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
		});

		this.logger.debug(`Chat agent created: ${id} by user ${user.id}`);
		return agent;

		// TODO: revert files on error
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

			for (const file of updates.files) {
				if (file.id) {
					// Skip existing file
					continue;
				}

				const f = await this.chatHubAttachmentService.storeAgentAttachment(id, file);
				updatedFiles.push(f);
			}

			if (filesToDelete.length > 0) {
				await this.chatHubAttachmentService.deleteAttachments(filesToDelete);
			}

			updateData.files = updatedFiles;
		}

		const agent = await this.chatAgentRepository.updateAgent(id, updateData);

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

		this.logger.debug(`Chat agent deleted: ${id} by user ${userId}`);
	}
}
