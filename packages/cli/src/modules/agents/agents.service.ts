import { splitModelId } from '@n8n/ai-utilities/agent-config';
import {
	DEFAULT_AGENT_PERSONALISATION,
	getRandomAgentPersonalisationGradient,
	type AgentCapabilitySummary,
	type AgentCapabilityTool,
	type AgentJsonConfig,
	type ListAgentsQueryDto,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import {
	In,
	isUniqueConstraintError,
	ProjectRelationRepository,
	type OperationContext,
	type User,
} from '@n8n/db';
import { Container, Service } from '@n8n/di';
import { hasGlobalScope } from '@n8n/permissions';
import { v4 as uuid } from 'uuid';

import { isServiceAccountsEnvFeatureFlagEnabled } from '@/constants/service-accounts';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { AgentChatAttachmentService } from './agent-chat-attachment.service';
import { AgentKnowledgeService } from './agent-knowledge.service';
import { AgentExecutionService } from './agent-execution.service';
import { AgentRuntimeCacheService } from './agent-runtime-cache.service';
import { AgentTestChatService } from './agent-test-chat.service';
import { Agent } from './entities/agent.entity';
import { ChatIntegrationService } from './integrations/chat-integration.service';
import { AgentTaskRepository } from './repositories/agent-task.repository';
import {
	AgentRepository,
	type AgentSummary,
	type AgentSummaryFilters,
} from './repositories/agent.repository';
import { SubAgentCleanupService } from './sub-agents/sub-agent-cleanup.service';
import { isUnconfiguredAgent } from './utils/agent-capabilities';
import { EventService } from '@/events/event.service';

/**
 * Global role assigned to an agent's service account. Member-tier: never an
 * owner or chat-user role (those are rejected by the service-accounts service).
 */
const AGENT_SERVICE_ACCOUNT_ROLE = 'global:member';

@Service()
export class AgentsService {
	constructor(
		private readonly logger: Logger,
		private readonly agentRepository: AgentRepository,
		private readonly projectRelationRepository: ProjectRelationRepository,
		private readonly agentChatAttachmentService: AgentChatAttachmentService,
		private readonly agentKnowledgeService: AgentKnowledgeService,
		private readonly runtimeCacheService: AgentRuntimeCacheService,
		private readonly testChatService: AgentTestChatService,
		private readonly agentTaskRepository: AgentTaskRepository,
		private readonly subAgentCleanupService: SubAgentCleanupService,
		private readonly eventService: EventService,
		private readonly agentExecutionService: AgentExecutionService,
	) {}

	/**
	 * `id` lets the caller mint the agent id before deciding to persist it, so a
	 * surface can reference the agent (an artifact tab, a thread binding) while
	 * it is still unsaved. The builder path may race the REST create on the same
	 * id; with `adoptUnconfiguredOnCollision` the loser adopts a same-project
	 * still-unconfigured row. REST stays strict (flag defaults false).
	 *
	 * Emits no telemetry: a row on its own is not a created agent, so the
	 * creation events fire from the first configuring write instead (see
	 * `AgentModificationTelemetryService`).
	 */
	async create(
		projectId: string,
		name: string,
		{
			availableInMCP = false,
			id,
			adoptUnconfiguredOnCollision = false,
		}: {
			availableInMCP?: boolean;
			id?: string;
			adoptUnconfiguredOnCollision?: boolean;
		} = {},
	): Promise<Agent> {
		const defaultConfig: AgentJsonConfig = {
			name,
			model: '',
			instructions: '',
			tools: [],
			skills: [],
			// Seeded at birth so every agent has a distinct tile, and so the builder
			// sees an existing icon name when it reads the config — without one it
			// invents its own, which the icon tile cannot render.
			personalisation: {
				icon: DEFAULT_AGENT_PERSONALISATION.icon,
				gradient: getRandomAgentPersonalisationGradient(),
			},
		};

		const agent = this.agentRepository.create({
			...(id ? { id } : {}),
			name,
			projectId,
			schema: defaultConfig,
			versionId: uuid(),
			availableInMCP,
		});

		let saved: Agent;
		try {
			saved = await this.agentRepository.save(agent);
		} catch (error) {
			if (!id || !isUniqueConstraintError(error)) throw error;
			// Never disclose whether the id exists in another project.
			const conflict = new ConflictError('An agent with this id already exists');
			if (!adoptUnconfiguredOnCollision) throw conflict;
			const existing = await this.agentRepository.findByIdAndProjectId(id, projectId);
			if (!existing || !isUnconfiguredAgent(existing.schema, existing.integrations ?? [])) {
				throw conflict;
			}
			this.logger.debug('Adopted concurrently created SDK agent', { agentId: id, projectId });
			return existing;
		}

		this.logger.debug('Created SDK agent', { agentId: saved.id, projectId });

		if (isServiceAccountsEnvFeatureFlagEnabled()) {
			try {
				await this.getOrCreateServiceAccountUserId(saved);
			} catch (error) {
				// Best-effort: a provisioning failure must not fail agent creation. The
				// runtime path lazily backfills the service account on first use.
				this.logger.warn('Failed to provision service account on agent create', {
					agentId: saved.id,
					error: error instanceof Error ? error.message : error,
				});
			}
		}

		return saved;
	}

	/**
	 * Ensures this agent has a 1:1 service-account `User` and returns its id.
	 *
	 * Idempotent: returns the existing id when already provisioned. Otherwise mints
	 * a passwordless service-account user (member-tier global role, with its own
	 * personal project) plus a client credential, persists the id on the agent, and
	 * returns it. If credential creation or the persist fails, the freshly minted
	 * service account is torn down so no orphan is left behind.
	 *
	 * `_ctx` is accepted for forward-compatible transactional threading: the
	 * provisioning steps delegate to services that each own their transaction, and
	 * the single agent persist is atomic on its own, so it is not yet threaded.
	 */
	async getOrCreateServiceAccountUserId(
		agent: Agent,
		_ctx: OperationContext = {},
	): Promise<string> {
		if (agent.serviceAccountUserId) return agent.serviceAccountUserId;

		const { ServiceAccountsService } = await import(
			'@/modules/service-accounts/service-accounts.service.js'
		);
		const { ServiceAccountCredentialService } = await import(
			'@/services/service-account-credential.service.js'
		);
		const { OwnershipService } = await import('@/services/ownership.service.js');

		const serviceAccountsService = Container.get(ServiceAccountsService);
		const serviceAccountCredentialService = Container.get(ServiceAccountCredentialService);

		// No human is in the create/backfill call chain, so the instance owner is the
		// actor recorded on the service-account audit trail.
		const actor = await Container.get(OwnershipService).getInstanceOwner();

		const serviceAccount = await serviceAccountsService.create(
			{ name: `agent:${agent.id.slice(0, 8)}`, role: AGENT_SERVICE_ACCOUNT_ROLE },
			actor,
		);

		try {
			await serviceAccountCredentialService.createForUser(serviceAccount.id, `agent:${agent.id}`);
			await this.agentRepository.update(
				{ id: agent.id },
				{ serviceAccountUserId: serviceAccount.id },
			);
		} catch (error) {
			// Compensate: a failed credential creation or persist must not leave an
			// orphan service account behind.
			await serviceAccountsService.delete(serviceAccount.id, actor).catch(() => {});
			throw error;
		}

		agent.serviceAccountUserId = serviceAccount.id;

		// Trace: an agent was durably bound to a freshly provisioned service account.
		this.logger.info('Provisioned service account for agent', {
			agentId: agent.id,
			serviceAccountUserId: serviceAccount.id,
			projectId: agent.projectId,
		});

		return serviceAccount.id;
	}

	/**
	 * Resolve the agent's acting service-account identity for outbound
	 * self-authentication. Gated behind the service-accounts feature flag; a
	 * failed lookup is logged and swallowed so the run still proceeds (mint paths
	 * then fail closed for lack of an acting identity). Every runtime entry point
	 * (workflow execution and the interactive/chat cache path) resolves through
	 * here so the identity is threaded consistently.
	 */
	async resolveActingServiceAccountUserId(agent: Agent): Promise<string | undefined> {
		if (!isServiceAccountsEnvFeatureFlagEnabled()) return undefined;

		try {
			return await this.getOrCreateServiceAccountUserId(agent);
		} catch (error) {
			this.logger.warn(
				'Failed to resolve agent service-account identity; running without outbound mint identity',
				{
					agentId: agent.id,
					error: error instanceof Error ? error.message : String(error),
				},
			);
			return undefined;
		}
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

		const mcpServers = (schema?.mcpServers ?? []).map((server) => ({ name: server.name }));

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
			mcpServers,
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

	/**
	 * Lean agent listing (no JSON config columns, no activeVersion join) with
	 * filters and limit applied in the database.
	 */
	async findSummariesInProjects(
		projectIds: string[] | null,
		options: AgentSummaryFilters = {},
	): Promise<AgentSummary[]> {
		return await this.agentRepository.findSummariesByProjectIds(projectIds, options);
	}

	/**
	 * Resolves an agent by ID within the projects the user can access. Agent IDs
	 * are globally unique, so this lets callers address an agent without knowing
	 * its project up front. Mirrors `@ProjectScope`'s access model: global agent
	 * scopes (instance owners/admins) grant access without an explicit project
	 * relation.
	 */
	async findByIdForUser(agentId: string, user: User): Promise<Agent | null> {
		if (hasGlobalScope(user, 'agent:read')) {
			return await this.agentRepository.findById(agentId);
		}

		const projectRelations = await this.projectRelationRepository.findAllByUser(user.id);
		const projectIds = projectRelations.map((pr) => pr.projectId);

		return await this.agentRepository.findByIdInProjects(agentId, projectIds);
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

		try {
			await this.agentChatAttachmentService.deleteByAgent(agentId);
		} catch (error) {
			this.logger.warn('Failed to delete chat attachments on agent delete', {
				agentId,
				error: error instanceof Error ? error.message : error,
			});
		}

		const chatIntegrationService = Container.get(ChatIntegrationService);
		for (const integration of agent.integrations ?? []) {
			await chatIntegrationService.disconnectChannel(agentId, integration);
		}

		await this.agentExecutionService.deleteExecutionLogsForAgent(agentId);

		await this.agentRepository.remove(agent);

		this.runtimeCacheService.clearRuntimes(agentId);

		await this.subAgentCleanupService.removeSubAgentFromParents(agentId, projectId);

		this.eventService.emit('agent-deleted', { agentId, projectId });

		try {
			const { AgentTaskService } = await import('./agent-task.service.js');
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

		// Best-effort teardown of the agent's service account (personal project,
		// resource cascades, client credential). Wrapped so a failure here does not
		// block the agent deletion the caller asked for.
		if (isServiceAccountsEnvFeatureFlagEnabled() && agent.serviceAccountUserId) {
			try {
				const { ServiceAccountsService } = await import(
					'@/modules/service-accounts/service-accounts.service.js'
				);
				const { OwnershipService } = await import('@/services/ownership.service.js');
				const actor = await Container.get(OwnershipService).getInstanceOwner();
				await Container.get(ServiceAccountsService).delete(agent.serviceAccountUserId, actor);
			} catch (error) {
				this.logger.warn('Failed to delete service account on agent delete', {
					agentId,
					error: error instanceof Error ? error.message : error,
				});
			}
		}

		this.logger.debug('Deleted SDK agent', { agentId, projectId });

		return true;
	}
}
