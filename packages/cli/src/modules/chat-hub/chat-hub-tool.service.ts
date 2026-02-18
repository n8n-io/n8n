import type {
	ChatHubCreateToolRequest,
	ChatHubUpdateToolRequest,
	ChatHubToolDto,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { EntityManager, withTransaction, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import type { INode } from 'n8n-workflow';
import { findDisallowedChatToolExpressions } from 'n8n-workflow';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import type { ChatHubTool } from './chat-hub-tool.entity';
import { ChatHubToolRepository } from './chat-hub-tool.repository';

@Service()
export class ChatHubToolService {
	constructor(
		private readonly logger: Logger,
		private readonly chatToolRepository: ChatHubToolRepository,
	) {
		this.logger = this.logger.scoped('chat-hub');
	}

	async getToolsByUserId(userId: string): Promise<ChatHubTool[]> {
		return await this.chatToolRepository.getManyByUserId(userId);
	}

	async getEnabledTools(userId: string, trx?: EntityManager): Promise<ChatHubTool[]> {
		return await this.chatToolRepository.getEnabledByUserId(userId, trx);
	}

	async getToolDefinitionsForSession(sessionId: string, trx?: EntityManager): Promise<INode[]> {
		const tools = await this.chatToolRepository.getToolsForSession(sessionId, trx);
		return tools.map((t) => t.definition);
	}

	async getToolDefinitionsForAgent(agentId: string, trx?: EntityManager): Promise<INode[]> {
		const tools = await this.chatToolRepository.getToolsForAgent(agentId, trx);
		return tools.map((t) => t.definition);
	}

	async getToolIdsForSession(sessionId: string, trx?: EntityManager): Promise<string[]> {
		return await this.chatToolRepository.getToolIdsForSession(sessionId, trx);
	}

	async getToolIdsForAgent(agentId: string, trx?: EntityManager): Promise<string[]> {
		return await this.chatToolRepository.getToolIdsForAgent(agentId, trx);
	}

	async setSessionTools(sessionId: string, toolIds: string[], trx?: EntityManager): Promise<void> {
		await this.chatToolRepository.setSessionTools(sessionId, toolIds, trx);
	}

	async setAgentTools(agentId: string, toolIds: string[], trx?: EntityManager): Promise<void> {
		await this.chatToolRepository.setAgentTools(agentId, toolIds, trx);
	}

	private validateToolExpressions(definition: INode) {
		const violations = findDisallowedChatToolExpressions(definition.parameters);
		if (violations.length > 0) {
			const paths = violations.map((v) => v.path).join(', ');
			throw new BadRequestError(
				`Expressions are not supported in tool parameters (found at: ${paths}). Only $fromAI() expressions are supported.`,
			);
		}
	}

	async createTool(user: User, data: ChatHubCreateToolRequest): Promise<ChatHubTool> {
		const definition = data.definition;
		this.validateToolExpressions(definition);

		const tool = await this.chatToolRepository.createTool({
			id: definition.id,
			name: definition.name,
			type: definition.type,
			typeVersion: definition.typeVersion ?? 1,
			ownerId: user.id,
			definition,
			enabled: true,
		});

		this.logger.debug(`Chat hub tool created: ${tool.id} by user ${user.id}`);
		return tool;
	}

	async updateTool(
		id: string,
		user: User,
		updates: ChatHubUpdateToolRequest,
		trx?: EntityManager,
	): Promise<ChatHubTool> {
		const tool = await withTransaction(this.chatToolRepository.manager, trx, async (em) => {
			const existingTool = await this.chatToolRepository.getOneById(id, user.id, em);
			if (!existingTool) {
				throw new NotFoundError('Chat hub tool not found');
			}

			const updateData: Partial<ChatHubTool> = {};

			if (updates.definition !== undefined) {
				this.validateToolExpressions(updates.definition);
				updateData.definition = updates.definition;
				updateData.name = updates.definition.name;
				updateData.type = updates.definition.type;
				updateData.typeVersion = updates.definition.typeVersion ?? 1;
			}
			if (updates.enabled !== undefined) {
				updateData.enabled = updates.enabled;
			}

			return await this.chatToolRepository.updateTool(id, updateData, em);
		});

		this.logger.debug(`Chat hub tool updated: ${id} by user ${user.id}`);
		return tool;
	}

	async deleteTool(id: string, userId: string, trx?: EntityManager): Promise<void> {
		await withTransaction(this.chatToolRepository.manager, trx, async (em) => {
			const existingTool = await this.chatToolRepository.getOneById(id, userId, em);
			if (!existingTool) {
				throw new NotFoundError('Chat hub tool not found');
			}

			await this.chatToolRepository.deleteTool(id, em);
		});

		this.logger.debug(`Chat hub tool deleted: ${id} by user ${userId}`);
	}

	static toDto(tool: ChatHubTool): ChatHubToolDto {
		return {
			definition: tool.definition,
			enabled: tool.enabled,
		};
	}
}
