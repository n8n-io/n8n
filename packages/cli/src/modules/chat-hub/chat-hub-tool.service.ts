import type {
	ChatHubCreateToolRequest,
	ChatHubUpdateToolRequest,
	ChatHubToolDto,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { EntityManager, withTransaction, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import type { ExpressionViolation, INode } from 'n8n-workflow';
import { collectExpressionDefaults, findDisallowedChatToolExpressions } from 'n8n-workflow';

import { BadRequestError, NotFoundError } from '@n8n/errors';
import { NodeTypesProviderMissingError, NodeTypesProxy } from '@n8n/backend-services';
import { DeprecatedNodesValidationService } from '@/workflows/deprecated-nodes-validation.service';

import type { ChatHubTool } from './chat-hub-tool.entity';
import { ChatHubToolRepository } from './chat-hub-tool.repository';

@Service()
export class ChatHubToolService {
	constructor(
		private readonly logger: Logger,
		private readonly chatToolRepository: ChatHubToolRepository,
		private readonly nodeTypes: NodeTypesProxy,
		private readonly deprecatedNodesValidationService: DeprecatedNodesValidationService,
	) {
		this.logger = this.logger.scoped('chat-hub');
	}

	async getToolsByUserId(userId: string): Promise<ChatHubTool[]> {
		return await this.chatToolRepository.getManyByUserId(userId);
	}

	async getEnabledTools(userId: string, trx?: EntityManager): Promise<ChatHubTool[]> {
		return await this.chatToolRepository.getEnabledByUserId(userId, trx);
	}

	async getEnabledToolDefinitions(userId: string, trx?: EntityManager): Promise<INode[]> {
		const tools = await this.chatToolRepository.getEnabledByUserId(userId, trx);
		return this.toRunnableDefinitions(tools);
	}

	async getToolDefinitionsForSession(sessionId: string, trx?: EntityManager): Promise<INode[]> {
		const tools = await this.chatToolRepository.getToolsForSession(sessionId, trx);
		return this.toRunnableDefinitions(tools);
	}

	async getToolDefinitionsForAgent(agentId: string, trx?: EntityManager): Promise<INode[]> {
		const tools = await this.chatToolRepository.getToolsForAgent(agentId, trx);
		return this.toRunnableDefinitions(tools);
	}

	/**
	 * Skips stored tools that do not pass the current expression rules. Tools saved
	 * before a rule change are otherwise run as stored. Editing or enabling a skipped
	 * tool validates it again.
	 */
	private toRunnableDefinitions(tools: ChatHubTool[]): INode[] {
		return tools
			.filter((tool) => {
				const violations = this.findExpressionViolations(tool.definition);
				if (violations.length === 0) return true;

				this.logger.warn('Skipping chat hub tool with unsupported expressions', {
					toolId: tool.id,
					paths: violations.map((v) => v.path),
				});
				return false;
			})
			.map((tool) => tool.definition);
	}

	async getToolIdsForSession(sessionId: string, trx?: EntityManager): Promise<string[]> {
		return await this.chatToolRepository.getToolIdsForSession(sessionId, trx);
	}

	async getToolIdsForAgent(agentId: string, trx?: EntityManager): Promise<string[]> {
		return await this.chatToolRepository.getToolIdsForAgent(agentId, trx);
	}

	async setSessionTools(
		sessionId: string,
		ownerId: string,
		toolIds: string[],
		trx?: EntityManager,
	): Promise<void> {
		await this.ensureToolsOwnedBy(ownerId, toolIds, trx);
		await this.chatToolRepository.setSessionTools(sessionId, [...new Set(toolIds)], trx);
	}

	async setAgentTools(
		agentId: string,
		ownerId: string,
		toolIds: string[],
		trx?: EntityManager,
	): Promise<void> {
		await this.ensureToolsOwnedBy(ownerId, toolIds, trx);
		await this.chatToolRepository.setAgentTools(agentId, [...new Set(toolIds)], trx);
	}

	/**
	 * Throws `NotFoundError` unless the user owns every tool in `toolIds`.
	 */
	private async ensureToolsOwnedBy(
		userId: string,
		toolIds: string[],
		trx?: EntityManager,
	): Promise<void> {
		const uniqueIds = [...new Set(toolIds)];
		if (uniqueIds.length === 0) return;

		const ownedTools = await this.chatToolRepository.getByIds(uniqueIds, userId, trx);
		if (ownedTools.length !== uniqueIds.length) {
			throw new NotFoundError('Chat hub tool not found');
		}
	}

	private findExpressionViolations(definition: INode): ExpressionViolation[] {
		let allowedExpressions: Set<string> | undefined;

		try {
			const nodeType = this.nodeTypes.getByNameAndVersion(definition.type, definition.typeVersion);
			allowedExpressions = collectExpressionDefaults(nodeType.description.properties);
		} catch (error) {
			if (error instanceof NodeTypesProviderMissingError) throw error;
			// If node type lookup fails assume no allowed expressions
		}

		return findDisallowedChatToolExpressions(definition.parameters, '', allowedExpressions);
	}

	private validateToolExpressions(definition: INode) {
		const violations = this.findExpressionViolations(definition);
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
		this.deprecatedNodesValidationService.validateOnCreate([definition]);

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
		// oxlint-disable-next-line typescript/no-deprecated
		const tool = await withTransaction(this.chatToolRepository.manager, trx, async (em) => {
			const existingTool = await this.chatToolRepository.getOneById(id, user.id, em);
			if (!existingTool) {
				throw new NotFoundError('Chat hub tool not found');
			}

			const updateData: Partial<ChatHubTool> = {};

			if (updates.definition !== undefined) {
				this.validateToolExpressions(updates.definition);
				this.deprecatedNodesValidationService.validateOnUpdate(
					[updates.definition],
					[existingTool.definition],
				);
				updateData.definition = updates.definition;
				updateData.name = updates.definition.name;
				updateData.type = updates.definition.type;
				updateData.typeVersion = updates.definition.typeVersion ?? 1;
			}
			if (updates.enabled !== undefined) {
				if (updates.enabled) {
					const definition = updates.definition ?? existingTool.definition;
					this.validateToolExpressions(definition);
					this.deprecatedNodesValidationService.validateOnCreate([definition]);
				}
				updateData.enabled = updates.enabled;
			}

			return await this.chatToolRepository.updateTool(id, updateData, em);
		});

		this.logger.debug(`Chat hub tool updated: ${id} by user ${user.id}`);
		return tool;
	}

	async deleteTool(id: string, userId: string, trx?: EntityManager): Promise<void> {
		// oxlint-disable-next-line typescript/no-deprecated
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
