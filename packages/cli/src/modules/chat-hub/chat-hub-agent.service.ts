import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { v4 as uuidv4 } from 'uuid';

import { NotFoundError } from '@/errors/response-errors/not-found.error';

import type { ChatHubAgent } from './chat-agent.entity';
import { ChatHubAgentRepository } from './chat-hub-agent.repository';

@Service()
export class ChatHubAgentService {
	constructor(
		private readonly logger: Logger,
		private readonly chatAgentRepository: ChatHubAgentRepository,
	) {}

	async getAgentsByUserId(userId: string): Promise<ChatHubAgent[]> {
		return await this.chatAgentRepository.getManyByUserId(userId);
	}

	async getAgentById(id: string, userId: string): Promise<ChatHubAgent> {
		const agent = await this.chatAgentRepository.getOneById(id, userId);
		if (!agent) {
			throw new NotFoundError('Chat agent not found');
		}
		return agent;
	}

	async createAgent(
		userId: string,
		data: {
			name: string;
			description?: string;
			systemPrompt: string;
			provider?: string;
			model?: string;
			workflowId?: string;
		},
	): Promise<ChatHubAgent> {
		const id = uuidv4();

		const agent = await this.chatAgentRepository.createAgent({
			id,
			name: data.name,
			description: data.description ?? null,
			systemPrompt: data.systemPrompt,
			ownerId: userId,
			provider: (data.provider as ChatHubAgent['provider']) ?? null,
			model: data.model ?? null,
			workflowId: data.workflowId ?? null,
		});

		this.logger.info(`Chat agent created: ${id} by user ${userId}`);
		return agent;
	}

	async updateAgent(
		id: string,
		userId: string,
		updates: {
			name?: string;
			description?: string;
			systemPrompt?: string;
			provider?: string;
			model?: string;
			workflowId?: string;
		},
	): Promise<ChatHubAgent> {
		// First check if the agent exists and belongs to the user
		const existingAgent = await this.chatAgentRepository.getOneById(id, userId);
		if (!existingAgent) {
			throw new NotFoundError('Chat agent not found');
		}

		const updateData: Partial<ChatHubAgent> = {};
		if (updates.name !== undefined) updateData.name = updates.name;
		if (updates.description !== undefined) updateData.description = updates.description ?? null;
		if (updates.systemPrompt !== undefined) updateData.systemPrompt = updates.systemPrompt;
		if (updates.provider !== undefined)
			updateData.provider = updates.provider as ChatHubAgent['provider'];
		if (updates.model !== undefined) updateData.model = updates.model ?? null;
		if (updates.workflowId !== undefined) updateData.workflowId = updates.workflowId ?? null;

		const agent = await this.chatAgentRepository.updateAgent(id, updateData);

		this.logger.info(`Chat agent updated: ${id} by user ${userId}`);
		return agent;
	}

	async deleteAgent(id: string, userId: string): Promise<void> {
		// First check if the agent exists and belongs to the user
		const existingAgent = await this.chatAgentRepository.getOneById(id, userId);
		if (!existingAgent) {
			throw new NotFoundError('Chat agent not found');
		}

		await this.chatAgentRepository.deleteAgent(id);

		this.logger.info(`Chat agent deleted: ${id} by user ${userId}`);
	}
}
