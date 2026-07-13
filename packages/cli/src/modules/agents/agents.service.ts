import { splitModelId } from '@n8n/ai-utilities/agent-config';
import {
	type AgentCapabilitySummary,
	type AgentCapabilityTool,
	type AgentJsonConfig,
	type ListAgentsQueryDto,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { In, ProjectRelationRepository } from '@n8n/db';
import { Container, Service } from '@n8n/di';
import { v4 as uuid } from 'uuid';

import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { AgentKnowledgeService } from './agent-knowledge.service';
import { AgentRuntimeCacheService } from './agent-runtime-cache.service';
import { AgentTestChatService } from './agent-test-chat.service';
import { Agent } from './entities/agent.entity';
import { ChatIntegrationService } from './integrations/chat-integration.service';
import { AgentTaskRepository } from './repositories/agent-task.repository';
import { AgentRepository } from './repositories/agent.repository';
import { SubAgentCleanupService } from './sub-agents/sub-agent-cleanup.service';
import { EventService } from '@/events/event.service';

@Service()
export class AgentsService {
	constructor(
		private readonly logger: Logger,
		private readonly agentRepository: AgentRepository,
		private readonly projectRelationRepository: ProjectRelationRepository,
		private readonly agentKnowledgeService: AgentKnowledgeService,
		private readonly runtimeCacheService: AgentRuntimeCacheService,
		private readonly testChatService: AgentTestChatService,
		private readonly agentTaskRepository: AgentTaskRepository,
		private readonly subAgentCleanupService: SubAgentCleanupService,
		private readonly eventService: EventService,
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

	/**
	 * Lightweight capability metadata for the AI Agent node card: the agent's
	 * model plus per-item labels for channels / tools / skills / tasks. Reads the
	 * live draft config so the card stays in sync with edits, and avoids shipping
	 * the full `AgentJsonConfig`.
	 */
	async getCapabilitySummary(agentId: string, projectId: string): Promise<AgentCapabilitySummary> {
		const entity = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!entity) throw new NotFoundError('Agent not found');

		const schema = entity.schema;

		const modelId = schema?.model ?? '';
		const model: AgentCapabilitySummary['model'] = modelId ? splitModelId(modelId) : null;

		const channels = (entity.integrations ?? []).map((integration) => ({
			type: integration.type,
		}));

		const tools = (schema?.tools ?? []).flatMap<AgentCapabilityTool>((tool) => {
			switch (tool.type) {
				case 'custom':
					return [{ type: 'custom', name: entity.tools[tool.id]?.descriptor?.name ?? tool.id }];
				case 'workflow':
					return [{ type: 'workflow', name: tool.name ?? tool.workflow }];
				case 'node':
					return [
						{
							type: 'node',
							name: tool.name,
							nodeType: tool.node?.nodeType,
							nodeTypeVersion: tool.node?.nodeTypeVersion,
						},
					];
				default:
					// Unknown tool type from an unvalidated persisted config (import,
					// history restore, version skew): drop it rather than emit an
					// `undefined` chip the card would choke on.
					return [];
			}
		});

		const skills = (schema?.skills ?? []).map((skill) => ({
			id: skill.id,
			name: entity.skills[skill.id]?.name ?? skill.id,
		}));

		const taskRefs = schema?.tasks ?? [];
		let taskNamesById: Record<string, string> = {};
		if (taskRefs.length > 0) {
			const taskBodies = await this.agentTaskRepository.findByAgentId(agentId);
			taskNamesById = Object.fromEntries(taskBodies.map((task) => [task.id, task.name]));
		}
		const tasks = taskRefs.map((task) => ({
			id: task.id,
			name: taskNamesById[task.id] ?? task.id,
			enabled: task.enabled,
		}));

		return {
			id: entity.id,
			name: entity.name,
			model,
			channels,
			tools,
			skills,
			tasks,
		};
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

		this.eventService.emit('agent-deleted', { agentId, projectId });

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
