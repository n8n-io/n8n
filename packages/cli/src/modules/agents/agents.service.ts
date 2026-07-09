import { type AgentJsonConfig, type ListAgentsQueryDto } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { In, ProjectRelationRepository } from '@n8n/db';
import { Container, Service } from '@n8n/di';
import { v4 as uuid } from 'uuid';

import { AgentKnowledgeService } from './agent-knowledge.service';
import { AgentRuntimeCacheService } from './agent-runtime-cache.service';
import { AgentTestChatService } from './agent-test-chat.service';
import { Agent } from './entities/agent.entity';
import { ChatIntegrationService } from './integrations/chat-integration.service';
import { AgentRepository } from './repositories/agent.repository';
import { SubAgentCleanupService } from './sub-agents/sub-agent-cleanup.service';

@Service()
export class AgentsService {
	constructor(
		private readonly logger: Logger,
		private readonly agentRepository: AgentRepository,
		private readonly projectRelationRepository: ProjectRelationRepository,
		private readonly agentKnowledgeService: AgentKnowledgeService,
		private readonly runtimeCacheService: AgentRuntimeCacheService,
		private readonly testChatService: AgentTestChatService,
		private readonly subAgentCleanupService: SubAgentCleanupService,
	) {}

	async create(projectId: string, name: string): Promise<Agent> {
		const defaultConfig: AgentJsonConfig = {
			name,
			model: '',
			instructions: '',
			tools: [],
			skills: [],
		};

		const agent = this.agentRepository.create({
			name,
			projectId,
			schema: defaultConfig,
			versionId: uuid(),
		});

		const saved = await this.agentRepository.save(agent);

		this.logger.debug('Created SDK agent', { agentId: saved.id, projectId });

		return saved;
	}

	async findByProjectId(projectId: string): Promise<Agent[]> {
		return await this.agentRepository.findByProjectId(projectId);
	}

	async findByProjectIdPaginated(
		projectId: string,
		options: ListAgentsQueryDto,
	): Promise<{ count: number; data: Agent[] }> {
		return await this.agentRepository.findByProjectIdsPaginated([projectId], options);
	}

	async findById(agentId: string, projectId: string): Promise<Agent | null> {
		return await this.agentRepository.findByIdAndProjectId(agentId, projectId);
	}

	async findByUser(userId: string): Promise<Agent[]> {
		const projectRelations = await this.projectRelationRepository.findAllByUser(userId);
		const projectIds = projectRelations.map((pr) => pr.projectId);

		if (projectIds.length === 0) return [];

		return await this.agentRepository.find({
			where: { projectId: In(projectIds) },
			order: { updatedAt: 'DESC' },
		});
	}

	async findByUserPaginated(
		userId: string,
		options: ListAgentsQueryDto,
	): Promise<{ count: number; data: Agent[] }> {
		const projectRelations = await this.projectRelationRepository.findAllByUser(userId);
		const projectIds = projectRelations.map((pr) => pr.projectId);
		return await this.agentRepository.findByProjectIdsPaginated(projectIds, options);
	}

	/**
	 * Same scoping as {@link findByUser}, but only returns agents that have an
	 * `activeVersion`.
	 */
	async findPublishedByUser(userId: string): Promise<Agent[]> {
		const projectRelations = await this.projectRelationRepository.findAllByUser(userId);
		const projectIds = projectRelations.map((pr) => pr.projectId);

		if (projectIds.length === 0) return [];

		const agents = await this.agentRepository.find({
			where: { projectId: In(projectIds) },
			relations: { activeVersion: true },
			order: { updatedAt: 'DESC' },
		});

		return agents.filter((agent) => agent.activeVersionId !== null);
	}

	async delete(agentId: string, projectId: string): Promise<boolean> {
		const agent = await this.agentRepository.findByIdAndProjectId(agentId, projectId);

		if (!agent) {
			return false;
		}

		try {
			await this.agentKnowledgeService.deleteAllFilesForAgent(projectId, agentId);
		} catch (error) {
			this.logger.warn('Failed to delete knowledge files on agent delete', {
				agentId,
				error: error instanceof Error ? error.message : error,
			});
		}

		await this.agentKnowledgeService.destroySandbox(projectId, agentId);

		const chatIntegrationService = Container.get(ChatIntegrationService);
		for (const integration of agent.integrations ?? []) {
			await chatIntegrationService.disconnectChannel(agentId, integration);
		}

		await this.agentRepository.remove(agent);

		this.runtimeCacheService.clearRuntimes(agentId);

		await this.subAgentCleanupService.removeSubAgentFromParents(agentId, projectId);

		try {
			const { AgentTaskService } = await import('./agent-task.service');
			await Container.get(AgentTaskService).requestReconcile(agentId);
		} catch (error) {
			this.logger.warn('Failed to stop tasks on agent delete', {
				agentId,
				error: error instanceof Error ? error.message : error,
			});
		}

		try {
			await this.testChatService.clearAllTestChatMessages(agentId);
		} catch (error) {
			this.logger.warn('Failed to clear test chat on agent delete', {
				agentId,
				error: error instanceof Error ? error.message : error,
			});
		}

		this.logger.debug('Deleted SDK agent', { agentId, projectId });

		return true;
	}
}
