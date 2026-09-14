import { splitModelId } from '@n8n/ai-utilities/agent-config';
import {
	DEFAULT_AGENT_PERSONALISATION,
	getRandomAgentPersonalisationGradient,
	sanitizeAgentJsonConfig,
	type AgentCapabilitySummary,
	type AgentCapabilityTool,
	type AgentIntegrationConfig,
	type AgentJsonConfig,
	type AgentSkill,
	type ListAgentsQueryDto,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { In, isUniqueConstraintError, ProjectRelationRepository, type User } from '@n8n/db';
import { Container, Service } from '@n8n/di';
import { hasGlobalScope } from '@n8n/permissions';
import { v4 as uuid } from 'uuid';

// `CredentialsService` reaches `workflow-execute-additional-data`, which
// reaches back into this module to run agents from workflows — a known cycle
// in this area (see `agents-credential-provider.ts`). Resolved lazily by DI.
// eslint-disable-next-line import-x/no-cycle
import { CredentialsService } from '@/credentials/credentials.service';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { EventService } from '@/events/event.service';

import { AgentChatAttachmentService } from './agent-chat-attachment.service';
import { AgentExecutionService } from './agent-execution.service';
import { AgentKnowledgeService } from './agent-knowledge.service';
import { AgentRuntimeCacheService } from './agent-runtime-cache.service';
import { AgentTestChatService } from './agent-test-chat.service';
import { Agent } from './entities/agent.entity';
import { ChatIntegrationService } from './integrations/chat-integration.service';
import { decomposeJsonConfig } from './json-config/agent-config-composition';
import { sanitizeUnknownAgentCredentials } from './json-config/sanitize-unknown-agent-credentials';
import { AgentTaskRepository } from './repositories/agent-task.repository';
import {
	AgentRepository,
	type AgentSummary,
	type AgentSummaryFilters,
} from './repositories/agent.repository';
import { SubAgentCleanupService } from './sub-agents/sub-agent-cleanup.service';
import { createAgentCredentialProvider } from './utils/agent-credential-provider';

type CreateAgentOptions = {
	availableInMCP?: boolean;
	id?: string;
	adoptOnCollision?: boolean;
	defaultModel?: { model: string; credential: string };
	/** Create with this config instead of the empty draft, so eval thread seeding
	 *  can recreate an already-built agent in one insert. */
	schema?: AgentJsonConfig;
	skills?: Record<string, AgentSkill>;
	/** Opaque custom tool bodies keyed by id (passthrough from the duplicate path;
	 *  validated when the source agent was authored). */
	tools?: Record<string, unknown>;
	/** When set, the create is a user-driven duplicate: the seeded config is
	 *  sanitized and credential-access-checked, channels are copied as drafts,
	 *  and the write emits `agent-saved` so the dependency index refreshes —
	 *  parity with the `AgentConfigService.updateConfig` write path. Eval
	 *  seeding omits it. The duplicate itself is reported by the frontend
	 *  "User duplicated agent" event (mirrors "User duplicated workflow"). */
	user?: User;
};

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
		private readonly credentialsService: CredentialsService,
	) {}

	/**
	 * `id` lets the caller mint the agent id before deciding to persist it, so a
	 * surface can reference the agent (an artifact tab, a thread binding) while
	 * it is still unsaved. The builder path may race the REST create on the same
	 * id; with `adoptOnCollision` the loser adopts the same-project row instead
	 * of failing, so both paths converge on one agent even once the winner has
	 * configured it. REST stays strict (flag defaults false).
	 *
	 * Adoption is an authorization decision, and this method makes none: callers
	 * pass the flag only after proving the caller may adopt this very agent (see
	 * `InstanceAiPendingAgentService` and the builder delegate).
	 *
	 * Emits no telemetry: a row on its own is not a created agent, so the
	 * creation events fire from the first configuring write instead (see
	 * `AgentModificationTelemetryService`). The duplicate path is the one
	 * exception — a seeded copy is born configured, so the first edit would
	 * otherwise report a modification, not a creation. The frontend emits a
	 * dedicated "User duplicated agent" event for that case (carrying the
	 * source agent id), mirroring "User duplicated workflow".
	 */
	async create(projectId: string, name: string, options: CreateAgentOptions = {}): Promise<Agent> {
		return (await this.createOrAdopt(projectId, name, options)).agent;
	}

	/**
	 * `create`, plus whether the id collided and an existing row was adopted — the
	 * caller cannot tell from the returned entity, and an adopted row is an
	 * existing agent being edited rather than a new one.
	 */
	async createOrAdopt(
		projectId: string,
		name: string,
		{
			availableInMCP = false,
			id,
			adoptOnCollision = false,
			defaultModel,
			schema,
			skills,
			tools,
			user,
		}: CreateAgentOptions = {},
	): Promise<{ agent: Agent; adopted: boolean }> {
		const defaultConfig: AgentJsonConfig = {
			name,
			model: '',
			instructions: '',
			...(defaultModel ?? {}),
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

		// A user-driven duplicate seeds a full config. Mirror the `updateConfig`
		// write path: sanitize the config, then blank any credential the
		// duplicating user cannot use in this project. Eval seeding (no `user`)
		// inserts the config as-is, as before.
		const { schemaConfig, integrations } = schema
			? user
				? await this.prepareDuplicateConfig(schema, projectId, user)
				: decomposeJsonConfig(schema)
			: decomposeJsonConfig(defaultConfig);

		const agent = this.agentRepository.create({
			...(id ? { id } : {}),
			name,
			projectId,
			schema: schemaConfig,
			...(integrations.length > 0 ? { integrations } : {}),
			...(skills ? { skills } : {}),
			...(tools ? { tools: tools as Agent['tools'] } : {}),
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
			if (!adoptOnCollision) throw conflict;
			// Returned as it stands: the winner may already have configured it, and
			// this call's `name`/`schema` describe a draft that never existed.
			const existing = await this.agentRepository.findByIdAndProjectId(id, projectId);
			if (!existing) throw conflict;
			this.logger.debug('Adopted concurrently created SDK agent', { agentId: id, projectId });
			return { agent: existing, adopted: true };
		}

		this.logger.debug('Created SDK agent', { agentId: saved.id, projectId });

		// A user-driven duplicate is a real config write, so give it the same
		// side effect as `updateConfig`: refresh the dependency index. Without
		// this, a duplicated agent stays un-indexed (workflow edits wouldn't
		// invalidate its runtime cache). Eval seeding stays silent, as before.
		// The duplicate is reported by the frontend "User duplicated agent"
		// event, which carries the source agent id — see `AgentsListView`.
		if (user) {
			this.eventService.emit('agent-saved', { agentId: saved.id });
		}

		return { agent: saved, adopted: false };
	}

	/**
	 * Decompose a duplicated config the way `AgentConfigService.updateConfig` does:
	 * sanitize the config, blank credentials the duplicating user cannot use in
	 * this project, then split integrations onto their own column — copied as
	 * drafts (credentialId blanked) so the clone does not claim the source's
	 * channel credential.
	 */
	private async prepareDuplicateConfig(
		schema: AgentJsonConfig,
		projectId: string,
		user: User,
	): Promise<{ schemaConfig: AgentJsonConfig; integrations: AgentIntegrationConfig[] }> {
		const accessibleCredentialIds = new Set(
			(await createAgentCredentialProvider(this.credentialsService, projectId, user).list()).map(
				(credential) => credential.id,
			),
		);
		const sanitized = sanitizeUnknownAgentCredentials(
			sanitizeAgentJsonConfig(schema),
			accessibleCredentialIds,
		) as AgentJsonConfig;

		const { schemaConfig, integrations } = decomposeJsonConfig(sanitized);
		// The credential-claim check ignores publish state, so a copy holding the
		// source's channel credentialId would block the original from republishing
		// or reconnecting (and the reconciler records that 409 on the source's row).
		const draftIntegrations = integrations.map((integration) => ({
			...integration,
			credentialId: '',
		}));
		return { schemaConfig, integrations: draftIntegrations };
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

		await this.agentKnowledgeService.destroyKnowledgeSandbox(projectId, agentId);

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

		this.logger.debug('Deleted SDK agent', { agentId, projectId });

		return true;
	}
}
