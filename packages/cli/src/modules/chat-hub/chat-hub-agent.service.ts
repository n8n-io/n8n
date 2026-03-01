import type {
	ChatHubUpdateAgentRequest,
	ChatHubCreateAgentRequest,
	ChatHubAgentDto,
	ChatModelDto,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { EntityManager, User } from '@n8n/db';
import { Service } from '@n8n/di';
import { v4 as uuidv4 } from 'uuid';

import type { ChatHubAgent, IChatHubAgent } from './chat-hub-agent.entity';
import { ChatHubAgentRepository } from './chat-hub-agent.repository';
import { ChatHubCredentialsService } from './chat-hub-credentials.service';
import { ChatHubToolService } from './chat-hub-tool.service';
import { getModelMetadata } from './chat-hub.constants';

import { NotFoundError } from '@/errors/response-errors/not-found.error';

@Service()
export class ChatHubAgentService {
	constructor(
		private readonly logger: Logger,
		private readonly chatAgentRepository: ChatHubAgentRepository,
		private readonly chatHubCredentialsService: ChatHubCredentialsService,
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

		await this.chatAgentRepository.deleteAgent(id);

		this.logger.debug(`Chat agent deleted: ${id} by user ${userId}`);
	}
}
