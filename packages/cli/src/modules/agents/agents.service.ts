import { splitModelId } from '@n8n/ai-utilities/agent-config';
import {
	DEFAULT_AGENT_PERSONALISATION,
	N8N_CHAT_INTEGRATION_TYPE,
	getRandomAgentPersonalisationGradient,
	sanitizeAgentJsonConfig,
	type AgentCapabilitySummary,
	type AgentActor,
	type AgentCreationState,
	type AgentCapabilityTool,
	getProviderAttachmentCapabilities,
	type AgentChatListItem,
	type AgentChatListResponse,
	type AgentIntegrationConfig,
	type AgentJsonConfig,
	type AgentModelCredentialConfig,
	type AgentN8nChatAgentDetails,
	type AgentN8nChatThreadSummary,
	type AgentN8nChatThreadsResponse,
	type AgentSkill,
	type ListAgentsQueryDto,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { EventService, ProjectScopeService } from '@n8n/backend-services';
import {
	In,
	isUniqueConstraintError,
	ProjectRelationRepository,
	TransactionRunner,
	type User,
} from '@n8n/db';
import { Container, Service } from '@n8n/di';
import { hasGlobalScope } from '@n8n/permissions';
import { generateNanoId } from '@n8n/utils/generate-nano-id';
import { v4 as uuid } from 'uuid';

// `CredentialsService` reaches `workflow-execute-additional-data`, which
// reaches back into this module to run agents from workflows — a known cycle
// in this area (see `agents-credential-provider.ts`). Resolved lazily by DI.
// eslint-disable-next-line import-x/no-cycle
import { CredentialsService } from '@/credentials/credentials.service';
import type { PolicyActor } from '@/policy/policy-enforcement-backend';
import { ConflictError } from '@n8n/errors';
import { UnexpectedError, UserError } from 'n8n-workflow';

import { getAgentOrThrow } from './utils/get-agent-or-throw';
import { AgentConfigPreparationService } from './agent-config-preparation.service';
import { AgentSaveCompletionService } from './agent-save-completion.service';
import { AgentSetupCompletionService } from './agent-setup-completion.service';
import type { AgentsCredentialProvider } from './adapters/agents-credential-provider';
import { syncAgentIntegrations } from './integrations/integrations-sync';
import { getAgentConfigHash } from './utils/agent-config-hash';
import { AgentChatAttachmentService } from './agent-chat-attachment.service';
import { AgentExecutionService } from './agent-execution.service';
import { AgentKnowledgeService } from './agent-knowledge.service';
import { AgentPolicyService } from './agent-policy.service';
import { AgentRuntimeCacheService } from './agent-runtime-cache.service';
import { AgentSkillRefsService } from './agent-skill-refs.service';
import { AgentTestChatService } from './agent-test-chat.service';
import { AgentsSettingsService } from './agents-settings.service';
import { Agent, type ProjectAgent } from './entities/agent.entity';
import { ChatIntegrationService } from './integrations/chat-integration.service';
import { N8nChatFlagService } from './integrations/platforms/n8n-chat/n8n-chat-flag.service';
import { composeJsonConfig, decomposeJsonConfig } from './json-config/agent-config-composition';
import { fromAgentDocument, type AgentSkillRefs } from './json-config/agent-document';
import { sanitizeUnknownAgentCredentials } from './json-config/sanitize-unknown-agent-credentials';
import { AgentTaskRepository } from './repositories/agent-task.repository';
import {
	AgentRepository,
	hasN8nChatChannel,
	type AgentImportIdentity,
	type AgentSummary,
	type AgentListResult,
	type AgentSummaryFilters,
} from './repositories/agent.repository';
import { toAgentRef } from './utils/agent-ref';
import { SubAgentCleanupService } from './sub-agents/sub-agent-cleanup.service';
import { createAgentCredentialProvider } from './utils/agent-credential-provider';

type CreateAgentOptions = {
	/** Who asked for the create, named on the policy block audit event. */
	actor: PolicyActor;
	availableInMCP?: boolean;
	id?: string;
	adoptOnCollision?: boolean;
	defaultModel?: AgentModelCredentialConfig;
	/** Initial configuration for an ordinary create. */
	config?: Record<string, unknown>;
	/** Product surface responsible for the insert. Internal seeds omit it. */
	createdBy?: AgentActor;
	pushRef?: string;
	/** Create with this config instead of the empty draft, so eval thread seeding
	 *  can recreate an already-built agent in one insert. */
	schema?: AgentJsonConfig;
	/** Skill bodies keyed by the ref ids of `schema`. A ref to a skills hub skill
	 *  stays a ref; a ref with only a body gets a new hub skill in this project. */
	skills?: Record<string, AgentSkill>;
	/** Creates the hub skills of refs with only a body when `user` is not set.
	 *  Without either, those refs are dropped. */
	skillCreator?: User;
	/** Opaque custom tool bodies keyed by id (passthrough from the duplicate path;
	 *  validated when the source agent was authored). */
	tools?: Record<string, unknown>;
	/** User for configuration validation and product save effects. With schema, duplicates safely. */
	user?: User;
};

export type AgentCreationResult = AgentCreationState & { agent: ProjectAgent };

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
		private readonly projectScopeService: ProjectScopeService,
		private readonly settingsService: AgentsSettingsService,
		private readonly agentPolicyService: AgentPolicyService,
		private readonly agentSkillRefs: AgentSkillRefsService,
		private readonly transactionRunner: TransactionRunner,
		private readonly configPreparation: AgentConfigPreparationService,
		private readonly saveCompletion: AgentSaveCompletionService,
		private readonly setupCompletion: AgentSetupCompletionService,
		private readonly n8nChatFlag: N8nChatFlagService,
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
	 * `InstanceAiPendingAgentService` and `InstanceAiBuilderDelegateAdapterService`).
	 *
	 * Reports creation after the insert and its skill references commit.
	 */
	async create(
		projectId: string,
		name: string,
		options: CreateAgentOptions,
	): Promise<ProjectAgent> {
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
		options: CreateAgentOptions,
	): Promise<AgentCreationResult> {
		await this.settingsService.assertEnabled();
		this.assertCreateOptions(options);
		const { schemaConfig, integrations } = await this.prepareInitialConfig(
			projectId,
			name,
			options,
		);
		// Keep the non-null project type returned by this creation path.
		const agent = Object.assign(
			this.agentRepository.create({
				id: options.id || generateNanoId(),
				name,
				projectId,
				schema: fromAgentDocument(schemaConfig).config,
				...(integrations.length > 0 ? { integrations } : {}),
				...(options.tools ? { tools: options.tools as Agent['tools'] } : {}),
				versionId: uuid(),
				availableInMCP: options.availableInMCP ?? false,
			}),
			{ projectId },
		);
		const prepared = await this.prepareAgentCreation(agent, schemaConfig, options);
		let savedRefs: AgentSkillRefs;
		try {
			savedRefs = await this.insertAgent(agent, prepared.skillRefs, options);
		} catch (error) {
			const existing = await this.adoptExistingAgent(
				options.id,
				projectId,
				options.adoptOnCollision ?? false,
				error,
			);
			return await this.getCreationResult(existing, true);
		}

		const config = composeJsonConfig(agent, savedRefs);
		const result = { agent, config, configHash: getAgentConfigHash(config), adopted: false };
		this.logger.debug('Created SDK agent', { agentId: agent.id, projectId });
		await this.completeCreation(result, savedRefs, options, prepared.credentialProvider);
		return result;
	}

	/** Compose the saved state when a pending artifact adopts an existing Agent. */
	async getCreationResult(agent: ProjectAgent, adopted: boolean): Promise<AgentCreationResult> {
		const config = composeJsonConfig(agent, await this.agentSkillRefs.refsForDraft(agent, {}));
		return { agent, config, configHash: getAgentConfigHash(config), adopted };
	}

	private assertCreateOptions({ config, schema, user, createdBy }: CreateAgentOptions): void {
		if (config !== undefined && schema !== undefined) {
			throw new UserError(
				'Use config for initial configuration or schema for duplication, not both.',
			);
		}
		if ((config !== undefined || createdBy !== undefined) && !user) {
			throw new UnexpectedError('Agent configuration and creation telemetry require a user');
		}
	}

	private async prepareAgentCreation(
		agent: ProjectAgent,
		initialSchema: AgentJsonConfig,
		options: CreateAgentOptions,
	): Promise<{ skillRefs: AgentSkillRefs; credentialProvider?: AgentsCredentialProvider }> {
		if (options.config === undefined || !options.user) {
			await this.agentPolicyService.enforceSave(
				agent.projectId,
				null,
				initialSchema,
				null,
				options.actor,
			);
			return { skillRefs: fromAgentDocument(initialSchema).skillRefs };
		}
		const { replacement, credentialProvider, validatedConfig } =
			await this.configPreparation.prepareForSave(
				agent,
				{
					...initialSchema,
					// Keeps the default channels split out of `initialSchema`; a config that sets its own wins.
					...(agent.integrations?.length ? { integrations: agent.integrations } : {}),
					...options.config,
					name: agent.name,
				},
				options.user,
				{ previousSkillRefs: [], isNew: true, actor: options.actor },
			);
		const { config, skillRefs } = fromAgentDocument(replacement.nextSchema);
		agent.schema = config;
		agent.name = validatedConfig.name;
		agent.integrations = replacement.nextIntegrations;
		return { skillRefs, credentialProvider };
	}

	private async insertAgent(agent: Agent, skillRefs: AgentSkillRefs, options: CreateAgentOptions) {
		return await this.transactionRunner.run({}, async (ctx) => {
			// Insert-only: a reused client id must not overwrite the winning draft.
			await this.agentRepository.insertNew(agent, ctx);
			if (options.config !== undefined) {
				await this.agentSkillRefs.replaceDraftRefs(agent, skillRefs, ctx);
				return await this.agentSkillRefs.refsForDraft(agent, ctx);
			}
			return await this.agentSkillRefs.createDraftRefs(
				agent,
				skillRefs,
				options.skills ?? {},
				options.user ?? options.skillCreator ?? null,
				ctx,
			);
		});
	}

	private async completeCreation(
		{ agent, config }: AgentCreationResult,
		skillRefs: AgentSkillRefs,
		{ user, createdBy, pushRef, config: initialConfig }: CreateAgentOptions,
		credentialProvider?: AgentsCredentialProvider,
	): Promise<void> {
		if (!user) return;
		if (createdBy) {
			this.saveCompletion.configurationCreated(
				{ agent, config, projectId: agent.projectId, user, by: createdBy },
				pushRef,
			);
		} else {
			this.eventService.emit('agent-saved', { agentId: agent.id });
		}
		if (initialConfig !== undefined) {
			await syncAgentIntegrations(agent, [], agent.integrations ?? [], this.logger);
		}
		try {
			const provider =
				credentialProvider ??
				createAgentCredentialProvider(this.credentialsService, agent.projectId, user);
			const emitSetupCompleted = await this.setupCompletion.recordIfSetupComplete(
				agent,
				skillRefs,
				agent.projectId,
				provider,
				user,
			);
			await emitSetupCompleted?.();
		} catch (error) {
			this.logger.warn('Failed to check setup completion after Agent creation', {
				agentId: agent.id,
				error,
			});
		}
	}

	private async prepareDuplicateConfig(
		schema: AgentJsonConfig,
		projectId: string,
		user: User,
	): Promise<{
		schemaConfig: AgentJsonConfig;
		integrations: AgentIntegrationConfig[];
	}> {
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
		const draftIntegrations = integrations.map((integration) =>
			integration.type === 'n8n_chat' ? integration : { ...integration, credentialId: '' },
		);
		return { schemaConfig, integrations: draftIntegrations };
	}

	async findByProjectId(projectId: string): Promise<Agent[]> {
		return await this.agentRepository.findByProjectId(projectId);
	}

	async findByProjectIdPaginated(
		projectId: string,
		options: ListAgentsQueryDto,
	): Promise<AgentListResult> {
		return await this.agentRepository.findByProjectIdsPaginated([projectId], options);
	}

	async findById(agentId: string, projectId: string): Promise<ProjectAgent | null> {
		return await this.agentRepository.findByIdAndProjectId(agentId, projectId);
	}

	async findImportCandidates(
		projectId: string,
		sourceAgentIds: string[],
	): Promise<AgentImportIdentity[]> {
		return await this.agentRepository.findImportCandidates(projectId, sourceAgentIds);
	}

	async findImportIdOwners(agentIds: string[]): Promise<Array<Pick<Agent, 'id' | 'projectId'>>> {
		return await this.agentRepository.findImportIdOwners(agentIds);
	}

	async isN8nChatPublished(agentId: string, projectId: string): Promise<boolean> {
		return await this.agentRepository.isN8nChatPublished(agentId, projectId);
	}

	/**
	 * Lightweight capability metadata for the AI Agent node card: the agent's
	 * model plus per-item labels for channels / tools / skills / tasks. Reads the
	 * live draft config so the card stays in sync with edits, and avoids shipping
	 * the full `AgentJsonConfig`.
	 */
	async getCapabilitySummary(agentId: string, projectId: string): Promise<AgentCapabilitySummary> {
		const entity = await getAgentOrThrow(
			this.agentRepository,
			agentId,
			projectId,
			'Agent not found',
		);

		const schema = entity.schema;

		const modelId = schema?.model ?? '';
		const model: AgentCapabilitySummary['model'] = modelId ? splitModelId(modelId) : null;

		const channels = (entity.integrations ?? []).map((integration) => ({
			type: integration.type,
		}));

		const tools = this.getCapabilityTools(entity);

		const mcpServers = (schema?.mcpServers ?? []).map((server) => ({ name: server.name }));

		const draftSkills = await this.agentSkillRefs.readDraft(entity, {});
		const skills = (draftSkills.skillRefs ?? []).map((skill) => ({
			id: skill.id,
			name: draftSkills.skills[skill.id]?.name ?? skill.id,
		}));

		const tasks = await this.getCapabilityTasks(entity);

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
	async findByIdForUser(agentId: string, user: User): Promise<ProjectAgent | null> {
		if (hasGlobalScope(user, 'agent:read')) {
			return await this.agentRepository.findById(agentId);
		}

		const projectRelations = await this.projectRelationRepository.findAllByUser(user.id);
		const projectIds = projectRelations.map((pr) => pr.projectId);

		return await this.agentRepository.findByIdInProjects(agentId, projectIds);
	}

	/**
	 * Agents the user can reach over the n8n Chat channel, meaning their
	 * **published** config carries it.
	 *
	 * Scoped to `agent:execute`, the scope the production chat route itself
	 * requires, so a `project:chatUser` sees exactly the agents they may talk
	 * to. That is only safe because the response is {@link AgentChatListItem}:
	 * the published instructions, tools and skills stay on the server. Widen
	 * the shape and this scope has to narrow again.
	 *
	 * Carries the project relation, because the chat page labels each agent
	 * with its project.
	 *
	 * Also lists every agent in the projects the user is a member of with
	 * `agent:update` and `agent:publish`, published to n8n Chat or not, so the
	 * page can offer to make it available. That audience may read the config.
	 */
	async findChatReachableByUserPaginated(
		user: User,
		options: ListAgentsQueryDto,
	): Promise<AgentChatListResponse> {
		if (!(await this.settingsService.getEnabled())) return { count: 0, data: [] };
		const [projectIds, ownedProjectIds] = await Promise.all([
			this.projectScopeService.getProjectIds(user, ['agent:execute']),
			this.projectScopeService.getMemberProjectIds(user, ['agent:update', 'agent:publish']),
		]);
		// Usage counts are only meaningful (and only needed) for the usage sort.
		const usageCounts =
			options.sortBy === 'usage:desc'
				? await this.agentExecutionService.countN8nChatThreadsByAgent(user.id, projectIds)
				: undefined;
		const { count, data } = await this.agentRepository.findN8nChatListPaginated(
			projectIds,
			ownedProjectIds,
			options,
			usageCounts,
		);
		return { count, data: data.map(toChatListItem) };
	}

	/**
	 * One agent over n8n Chat (see the controller route's doc for the audience
	 * this serves). Scoped like {@link findChatReachableByUserPaginated}.
	 * Returns `null` when missing, unreachable, or unpublished to n8n Chat —
	 * the controller turns all three into the same 404.
	 */
	async findChatReachableAgentForUser(
		agentId: string,
		user: User,
	): Promise<AgentN8nChatAgentDetails | null> {
		const projectIds = await this.projectScopeService.getProjectIds(user, ['agent:execute']);
		const agent = await this.agentRepository.findChatReachableById(agentId, projectIds);
		if (!agent) return null;

		const schema = agent.activeVersion?.schema;
		// Names are labels only: keep disabled sub-agents so older threads that
		// delegated to them still show a name. Dedupe so a repeated entry shows once.
		const subAgentIds = [
			...new Set((schema?.subAgents?.agents ?? []).map((subAgent) => subAgent.agentId)),
		];
		const namesById = new Map(
			(await this.agentRepository.findByIdsAndProjectId(subAgentIds, agent.projectId)).map(
				(row) => [row.id, row.name],
			),
		);

		return {
			...toChatListItem(agent),
			subAgents: subAgentIds.flatMap((id) => {
				const name = namesById.get(id);
				return name ? [{ id, name }] : [];
			}),
		};
	}

	/**
	 * The user's own n8n Chat threads across every agent they can currently
	 * reach over n8n Chat: a project where they hold `agent:execute`, with a
	 * published config that carries the channel. Scoping by agent id (not just
	 * project) keeps a thread out of the list the moment its agent's channel is
	 * unpublished, even if the user still belongs to the project.
	 */
	async findN8nChatThreadsForUser(
		user: User,
		options: { limit: number; cursor?: string; agentId?: string; search?: string },
	): Promise<AgentN8nChatThreadsResponse> {
		const projectIds = await this.projectScopeService.getProjectIds(user, ['agent:execute']);
		const agentIds = options.agentId
			? await this.reachableAgentIds(options.agentId, projectIds)
			: await this.agentRepository.findChatReachableIds(projectIds);
		// `options` also carries `agentId`, already consumed above; the callee only reads
		// `limit`/`cursor`/`search` off it.
		return await this.agentExecutionService.findN8nChatThreadsForAgents(user.id, agentIds, options);
	}

	/**
	 * Checks reachability for one agent directly, instead of loading every
	 * reachable id and filtering in memory. An unreachable `agentId` resolves
	 * to no agent ids, not an error — the caller already can't see that
	 * agent's threads either way.
	 */
	private async reachableAgentIds(agentId: string, projectIds: string[] | null): Promise<string[]> {
		const agent = await this.agentRepository.findChatReachableById(agentId, projectIds);
		return agent ? [agent.id] : [];
	}

	/**
	 * One of the user's own n8n Chat threads, scoped like
	 * {@link findN8nChatThreadsForUser}. Returns `null` when the thread doesn't
	 * exist, isn't owned by this user, or its agent isn't reachable over n8n
	 * Chat anymore — the controller turns all three into the same 404.
	 */
	async findN8nChatThreadForUser(
		user: User,
		threadId: string,
	): Promise<AgentN8nChatThreadSummary | null> {
		const projectIds = await this.projectScopeService.getProjectIds(user, ['agent:execute']);
		const agentIds = await this.agentRepository.findChatReachableIds(projectIds);
		return await this.agentExecutionService.findN8nChatThreadForAgents(user.id, agentIds, threadId);
	}

	/** The agents overview list: every project where the user holds `agent:list`. */
	async findListableByUserPaginated(
		user: User,
		options: ListAgentsQueryDto,
	): Promise<AgentListResult> {
		const projectIds = await this.projectScopeService.getProjectIds(user, ['agent:list']);
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

		await this.deleteKnowledgeFiles(projectId, agentId);

		await this.agentKnowledgeService.destroyKnowledgeSandbox(projectId, agentId);

		await this.deleteChatAttachments(agentId);

		const chatIntegrationService = Container.get(ChatIntegrationService);
		for (const integration of agent.integrations ?? []) {
			await chatIntegrationService.disconnectChannel(agentId, integration);
		}

		await this.agentExecutionService.deleteExecutionLogsForAgent(agentId);

		await this.agentRepository.remove(agent);

		this.runtimeCacheService.clearRuntimes(agentId);

		await this.subAgentCleanupService.removeSubAgentFromParents(agentId, projectId);

		this.eventService.emit('agent-deleted', { agentId, projectId });

		await this.stopDeletedAgentTasks(agentId);

		await this.clearDeletedAgentTestChats(agentId);

		this.logger.debug('Deleted SDK agent', { agentId, projectId });

		return true;
	}

	private async prepareInitialConfig(
		projectId: string,
		name: string,
		{ schema, user, defaultModel }: Pick<CreateAgentOptions, 'schema' | 'user' | 'defaultModel'>,
	): Promise<ReturnType<typeof decomposeJsonConfig>> {
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
		if (!schema) {
			// New agents start available in n8n Chat while their creator is in the
			// experiment. Duplicates and seeded configs keep their own channels;
			// internal creates without a user get none.
			if (user && (await this.n8nChatFlag.isEnabledFor(user))) {
				defaultConfig.integrations = [{ type: N8N_CHAT_INTEGRATION_TYPE, credentialId: '' }];
			}
			return decomposeJsonConfig(defaultConfig);
		}
		if (!user) return decomposeJsonConfig(schema);
		return await this.prepareDuplicateConfig(schema, projectId, user);
	}

	private async adoptExistingAgent(
		id: string | undefined,
		projectId: string,
		adoptOnCollision: boolean,
		error: unknown,
	): Promise<ProjectAgent> {
		if (!id || !isUniqueConstraintError(error)) throw error;
		// Never disclose whether the id exists in another project.
		const conflict = new ConflictError('An agent with this id already exists');
		if (!adoptOnCollision) throw conflict;
		// Returned as it stands: the winner may already have configured it, and
		// this call's `name`/`schema` describe a draft that never existed.
		const existing = await this.agentRepository.findByIdAndProjectId(id, projectId);
		if (!existing) throw conflict;
		this.logger.debug('Adopted concurrently created SDK agent', { agentId: id, projectId });
		return existing;
	}

	private getCapabilityTools(entity: ProjectAgent): AgentCapabilityTool[] {
		return (entity.schema?.tools ?? []).flatMap<AgentCapabilityTool>((tool) => {
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
	}

	private async getCapabilityTasks(entity: ProjectAgent): Promise<AgentCapabilitySummary['tasks']> {
		const taskRefs = entity.schema?.tasks ?? [];
		let taskNamesById: Record<string, string> = {};
		if (taskRefs.length > 0) {
			const taskBodies = await this.agentTaskRepository.findByAgentId(entity.id);
			taskNamesById = Object.fromEntries(taskBodies.map((task) => [task.id, task.name]));
		}
		return taskRefs.map((task) => ({
			id: task.id,
			name: taskNamesById[task.id] ?? task.id,
			enabled: task.enabled,
		}));
	}

	private async deleteKnowledgeFiles(projectId: string, agentId: string): Promise<void> {
		try {
			await this.agentKnowledgeService.deleteAllFilesForAgent(projectId, agentId);
		} catch (error) {
			this.logger.warn('Failed to delete knowledge files on agent delete', {
				agentId,
				error: error instanceof Error ? error.message : error,
			});
		}
	}

	private async deleteChatAttachments(agentId: string): Promise<void> {
		try {
			await this.agentChatAttachmentService.deleteByAgent(agentId);
		} catch (error) {
			this.logger.warn('Failed to delete chat attachments on agent delete', {
				agentId,
				error: error instanceof Error ? error.message : error,
			});
		}
	}

	private async stopDeletedAgentTasks(agentId: string): Promise<void> {
		try {
			const { AgentTaskService } = await import('./agent-task.service.js');
			await Container.get(AgentTaskService).requestReconcile(agentId);
		} catch (error) {
			this.logger.warn('Failed to stop tasks on agent delete', {
				agentId,
				error: error instanceof Error ? error.message : error,
			});
		}
	}

	private async clearDeletedAgentTestChats(agentId: string): Promise<void> {
		try {
			await this.testChatService.clearAllTestChatMessages(agentId);
		} catch (error) {
			this.logger.warn('Failed to clear test chat on agent delete', {
				agentId,
				error: error instanceof Error ? error.message : error,
			});
		}
	}
}

/**
 * Keeps the chat list to what the page renders: icon, blurb, and attachment support
 * from the published snapshot, or from the draft for an agent not in n8n Chat yet.
 */
function toChatListItem(agent: ProjectAgent): AgentChatListItem {
	const availableInChat = hasN8nChatChannel(agent.activeVersion?.schema?.integrations);
	const schema = availableInChat ? agent.activeVersion?.schema : agent.schema;
	const description = schema?.description;
	if (!agent.project) throw new UnexpectedError('Agent project relation is not loaded');
	return {
		...toAgentRef(agent, schema),
		...(description ? { description } : {}),
		availableInChat,
		project: { id: agent.projectId, name: agent.project.name },
		attachments: getProviderAttachmentCapabilities(
			schema?.model ? splitModelId(schema.model).provider : undefined,
		),
	};
}
