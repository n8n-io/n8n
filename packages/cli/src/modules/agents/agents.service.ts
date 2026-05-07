import type {
	BuiltAgent,
	BuiltTool,
	CredentialProvider,
	StreamChunk,
	ToolDescriptor,
} from '@n8n/agents';
import {
	AGENT_SCHEDULE_TRIGGER_TYPE,
	AGENT_WORKFLOW_TRIGGER_TYPE,
	isAgentCredentialIntegration,
	isAgentScheduleIntegration,
	type AgentSkill,
	type AgentSkillMutationResponse,
	type ChatIntegrationDescriptor,
} from '@n8n/api-types';
import * as agents from '@n8n/agents';
import { extractFromAIParameters } from '@n8n/ai-utilities';
import { Logger } from '@n8n/backend-common';
import { Time } from '@n8n/constants';
import {
	CredentialsRepository,
	ExecutionRepository,
	ProjectRelationRepository,
	UserRepository,
	WorkflowRepository,
} from '@n8n/db';
import { Container, Service } from '@n8n/di';
import { In } from '@n8n/typeorm';
import {
	deepCopy,
	OperationalError,
	UserError,
	type ExecuteAgentData,
	type INodeParameters,
} from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { ActiveExecutions } from '@/active-executions';
import { CredentialsService } from '@/credentials/credentials.service';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { resolveBuiltinNodeDefinitionDirs } from '@/modules/instance-ai/node-definition-resolver';
import { EphemeralNodeExecutor } from '@/node-execution';
import { UrlService } from '@/services/url.service';
import { TtlMap } from '@/utils/ttl-map';
import { WorkflowRunner } from '@/workflow-runner';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { AgentsCredentialProvider } from './adapters/agents-credential-provider';
import { markAgentDraftDirty } from './utils/agent-draft.utils';
import { generateAgentResourceId } from './utils/agent-resource-id';
import { AgentExecutionService } from './agent-execution.service';
import { AgentSkillsService } from './agent-skills.service';
import { AgentsToolsService } from './agents-tools.service';
import { AGENT_THREAD_PREFIX } from './builder/builder-tool-names';
import { Agent } from './entities/agent.entity';
import { ExecutionRecorder } from './execution-recorder';
import { ChatIntegrationRegistry } from './integrations/agent-chat-integration';
import { syncAgentIntegrations } from './integrations/integrations-sync';
import { N8NCheckpointStorage } from './integrations/n8n-checkpoint-storage';
import { N8nMemory } from './integrations/n8n-memory';
import { composeJsonConfig, decomposeJsonConfig } from './json-config/agent-config-composition';
import { AgentJsonConfigSchema, isNodeToolsEnabled } from './json-config/agent-json-config';
import type {
	AgentJsonConfig,
	AgentJsonConfigRef,
	AgentJsonMemoryConfig,
	AgentJsonToolConfig,
} from './json-config/agent-json-config';
import {
	buildFromJson,
	type MemoryFactory,
	type ToolResolver,
} from './json-config/from-json-config';
import { AgentPublishedVersionRepository } from './repositories/agent-published-version.repository';
import { AgentRepository } from './repositories/agent.repository';
import { AgentSecureRuntime } from './runtime/agent-secure-runtime';
import { buildToolRegistry, type ToolRegistry } from './tool-registry';

type AgentToolEntries = Agent['tools'];

interface InjectRuntimeDependenciesParams {
	agent: agents.Agent;
	agentId: string;
	projectId: string;
	credentialProvider: CredentialProvider;
	nodeToolsEnabled: boolean;
	/** Chat platform the runtime is being reconstructed for — drives the rich_interaction tool's capability profile. */
	integrationType?: string;
}

/** Derive a stable thread ID for the test-chat of a given agent and user. */
export function chatThreadId(agentId: string, userId?: string): string {
	const baseThreadId = `${AGENT_THREAD_PREFIX.TEST}${agentId}`;
	return userId ? `${baseThreadId}:${userId}` : baseThreadId;
}

/** Scopes the agent's memory to a specific conversation context. */
export interface AgentMemoryScope {
	threadId: string;
	resourceId: string;
}

export interface ExecuteForChatConfig {
	agentId: string;
	projectId: string;
	message: string;
	/** n8n user ID — used for RBAC / credential resolution. */
	userId: string;
	/** Memory scope — resourceId is the chat platform user (e.g. Slack / Telegram user ID). */
	memory: AgentMemoryScope;
}

export interface ExecuteForChatPublishedConfig {
	agentId: string;
	projectId: string;
	message: string;
	/** Memory scope — resourceId is the chat platform user (e.g. Slack / Telegram user ID). */
	memory: AgentMemoryScope;
	integrationType?: string;
}

export interface ResumeForChatConfig {
	agentId: string;
	projectId: string;
	runId: string;
	toolCallId: string;
	resumeData: unknown;
	/**
	 * Required when the suspended turn invoked a platform-injected tool
	 * (e.g. `rich_interaction`). Without it, `getRuntime` rebuilds the agent
	 * with only its configured tools, and `runtime.resume` throws because the
	 * persisted tool call references a tool the rebuilt runtime doesn't know.
	 */
	integrationType?: string;
}

export interface ExecuteForSchedulePublishedConfig {
	agentId: string;
	projectId: string;
	message: string;
	/** Memory scope — resourceId isolates per-run memory. */
	memory: AgentMemoryScope;
}

interface StreamChatResponseConfig {
	agentInstance: agents.Agent;
	toolRegistry: ToolRegistry;
	agentId: string;
	message: string;
	memory: AgentMemoryScope;
	projectId: string;
	source?: string;
}

interface GetRuntimeParams {
	agentId: string;
	projectId: string;
	n8nUserId?: string;
	integrationType?: string;
	/** When true, load the published snapshot; n8nUserId is derived from publishedById when omitted. */
	usePublishedVersion?: boolean;
}

@Service()
export class AgentsService {
	/**
	 * Cached agent runtimes.  Keys follow the pattern:
	 *   Draft:     `{agentId}:draft:{n8nUserId}`
	 *   Published: `{agentId}:published[:{integrationType}]`
	 *
	 * TTL = 30 minutes — entries are evicted when the agent is idle so that
	 * memory is freed without requiring an explicit shutdown step.
	 *
	 * Separating draft and published with explicit prefixes prevents a draft
	 * runtime from being mistakenly returned to a published-agent execution.
	 */
	private readonly runtimes = new TtlMap<
		string,
		{ agent: agents.Agent; agentId: string; toolRegistry: ToolRegistry; projectId: string }
	>(30 * Time.minutes.toMilliseconds);

	/**
	 * Stash of user messages for suspended tool calls.
	 * When executeForChat suspends, we store the original message here so
	 * resumeForChat can record it against the execution.
	 */
	private readonly pendingUserMessages = new Map<string, string>();

	private computeRuntimeCacheKey(params: GetRuntimeParams): string {
		if (params.usePublishedVersion) {
			const parts = [params.agentId, 'published'];
			if (params.integrationType) parts.push(params.integrationType);
			return parts.join(':');
		}
		const parts = [params.agentId, 'draft'];
		if (params.n8nUserId) parts.push(params.n8nUserId);
		return parts.join(':');
	}

	/** Remove all cached draft runtimes for an agent (all users). */
	private clearRuntimes(agentId: string): void {
		for (const key of this.runtimes.keys()) {
			if (key === agentId || key.startsWith(`${agentId}:`)) {
				this.runtimes.delete(key);
			}
		}
	}

	constructor(
		private readonly logger: Logger,
		private readonly agentRepository: AgentRepository,
		private readonly projectRelationRepository: ProjectRelationRepository,
		private readonly workflowRunner: WorkflowRunner,
		private readonly activeExecutions: ActiveExecutions,
		private readonly executionRepository: ExecutionRepository,
		private readonly workflowRepository: WorkflowRepository,
		private readonly userRepository: UserRepository,
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly urlService: UrlService,
		private readonly n8nCheckpointStorage: N8NCheckpointStorage,
		private readonly secureRuntime: AgentSecureRuntime,
		private readonly ephemeralNodeExecutor: EphemeralNodeExecutor,
		private readonly agentsToolsService: AgentsToolsService,
		private readonly n8nMemory: N8nMemory,
		private readonly agentExecutionService: AgentExecutionService,
		private readonly agentPublishedVersionRepository: AgentPublishedVersionRepository,
		private readonly agentSkillsService: AgentSkillsService,
	) {}

	/**
	 * Return the list of registered chat platform integrations with their
	 * FE display metadata. Used by `GET /agents/integrations`.
	 */
	listChatIntegrations(): ChatIntegrationDescriptor[] {
		return Container.get(ChatIntegrationRegistry)
			.list()
			.map((i) => ({
				type: i.type,
				label: i.displayLabel,
				icon: i.displayIcon,
				credentialTypes: i.credentialTypes,
			}));
	}

	async create(projectId: string, name: string): Promise<Agent> {
		// New agents start with no instructions so the home screen routes the
		// first user message to the builder (/build) instead of to the chat
		// endpoint. The builder fills in instructions and credentials.
		const defaultConfig: AgentJsonConfig = {
			name,
			model: 'anthropic/claude-sonnet-4-5',
			credential: '',
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

	async findById(agentId: string, projectId: string): Promise<Agent | null> {
		return await this.agentRepository.findByIdAndProjectId(agentId, projectId);
	}

	async updateName(agentId: string, projectId: string, name: string): Promise<Agent | null> {
		const agent = await this.agentRepository.findByIdAndProjectId(agentId, projectId);

		if (!agent) {
			return null;
		}

		agent.name = name;
		// Keep the JSON config name in sync so a subsequent config save doesn't
		// revert the entity name back to the stale config value.
		if (agent.schema) {
			agent.schema = { ...agent.schema, name };
		}
		markAgentDraftDirty(agent);
		const saved = await this.agentRepository.save(agent);
		this.logger.debug('Updated SDK agent name', { agentId, projectId, name });
		return saved;
	}

	async updateDescription(
		agentId: string,
		projectId: string,
		description: string,
		updatedAt?: string,
	): Promise<Agent | null> {
		const agent = await this.agentRepository.findByIdAndProjectId(agentId, projectId);

		if (!agent) {
			return null;
		}

		if (updatedAt && agent.updatedAt.toISOString() !== updatedAt) {
			throw new ConflictError('Agent has been modified');
		}

		agent.description = description;
		if (agent.schema) {
			agent.schema = { ...agent.schema, description };
		}
		markAgentDraftDirty(agent);
		const saved = await this.agentRepository.save(agent);
		this.logger.debug('Updated SDK agent description', { agentId, projectId });
		return saved;
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
	 * Same scoping as {@link findByUser}, but only returns agents that have a
	 * `publishedVersion`. Used by the MessageAnAgent node's listSearch so the
	 * dropdown can't surface unpublished agents — `executeForWorkflow` rejects
	 * those at runtime, and showing them would just lead to a confusing
	 * "Agent is not published" error after the user picks one.
	 */
	async findPublishedByUser(userId: string): Promise<Agent[]> {
		const projectRelations = await this.projectRelationRepository.findAllByUser(userId);
		const projectIds = projectRelations.map((pr) => pr.projectId);

		if (projectIds.length === 0) return [];

		const agents = await this.agentRepository.find({
			where: { projectId: In(projectIds) },
			relations: { publishedVersion: true },
			order: { updatedAt: 'DESC' },
		});

		return agents.filter((agent) => agent.publishedVersion);
	}

	async publishAgent(agentId: string, projectId: string, userId: string): Promise<Agent> {
		const agent = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!agent) {
			throw new NotFoundError(`Agent "${agentId}" not found`);
		}

		await this.agentRepository.manager.transaction(async (trx) => {
			// publishedFromVersionId is non-null — ensure the agent has a versionId before snapshotting.
			if (!agent.versionId) {
				agent.versionId = uuid();
				await trx.save(agent);
			}

			agent.publishedVersion = await this.agentPublishedVersionRepository.savePublishedVersion(
				{
					agentId: agent.id,
					schema: agent.schema,
					tools: this.snapshotConfiguredTools(agent.schema, agent.tools ?? {}),
					skills: this.agentSkillsService.snapshotConfiguredSkills(
						agent.schema,
						agent.skills ?? {},
					),
					publishedFromVersionId: agent.versionId,
					model: agent.model,
					provider: agent.provider,
					credentialId: agent.credentialId,
					publishedById: userId,
				},
				trx,
			);
		});

		// Evict any cached draft runtime so integration executions pick up
		// the new published snapshot on their next request.
		this.clearRuntimes(agentId);

		// Wake up any chat integrations that were persisted while the agent
		// was a draft. ChatIntegrationService.syncToConfig gates connect on
		// publish, so the entries sat dormant on agent.integrations; passing
		// previous=[] makes every persisted integration an addition.
		const credentialIntegrations = (agent.integrations ?? []).filter(isAgentCredentialIntegration);
		if (credentialIntegrations.length > 0) {
			// eslint-disable-next-line import-x/no-cycle
			const { ChatIntegrationService } = await import('./integrations/chat-integration.service');
			await Container.get(ChatIntegrationService)
				.syncToConfig(agent, [], credentialIntegrations)
				.catch((error) =>
					this.logger.warn('Failed to connect integrations on publish', {
						agentId,
						error,
					}),
				);
		}

		this.logger.debug('Published SDK agent', { agentId, projectId, userId });

		return agent;
	}

	async unpublishAgent(agentId: string, projectId: string): Promise<Agent> {
		const agent = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!agent) {
			throw new NotFoundError(`Agent "${agentId}" not found`);
		}

		await this.agentRepository.manager.transaction(async (trx) => {
			await this.agentPublishedVersionRepository.deleteByAgentId(agentId, trx);
			agent.publishedVersion = null;

			const hasActiveSchedule = (agent.integrations ?? []).some(
				(integration) => isAgentScheduleIntegration(integration) && integration.active,
			);

			if (hasActiveSchedule) {
				agent.integrations = (agent.integrations ?? []).map((integration) =>
					isAgentScheduleIntegration(integration) ? { ...integration, active: false } : integration,
				);
				await trx.save(agent);
			}
		});

		this.clearRuntimes(agentId);

		// Drop any live chat-integration connections so webhook endpoints stop
		// accepting events immediately — before the 30-minute TTL would have expired.
		// Lazy import avoids the circular DI dependency (ChatIntegrationService → AgentsService).
		// eslint-disable-next-line import-x/no-cycle
		const { ChatIntegrationService } = await import('./integrations/chat-integration.service');
		await Container.get(ChatIntegrationService).disconnect(agentId);

		const { AgentScheduleService } = await import('./integrations/agent-schedule.service');
		Container.get(AgentScheduleService).deregister(agentId);

		this.logger.debug('Unpublished SDK agent', { agentId, projectId });
		return agent;
	}

	async revertToPublishedAgent(agentId: string, projectId: string): Promise<Agent> {
		const agent = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!agent) {
			throw new NotFoundError(`Agent "${agentId}" not found`);
		}

		const publishedVersion = agent.publishedVersion;
		if (!publishedVersion) {
			throw new ConflictError(`Agent "${agentId}" is not published`);
		}

		await this.agentRepository.manager.transaction(async (trx) => {
			agent.schema = publishedVersion.schema ? deepCopy(publishedVersion.schema) : null;
			agent.tools = deepCopy(publishedVersion.tools ?? {});
			agent.skills = deepCopy(publishedVersion.skills ?? {});
			agent.model = publishedVersion.model;
			agent.provider = publishedVersion.provider;
			agent.credentialId = publishedVersion.credentialId;
			agent.versionId = publishedVersion.publishedFromVersionId;

			if (agent.schema) {
				agent.name = agent.schema.name;
				agent.description = agent.schema.description ?? null;
			}

			await trx.save(agent);
		});

		this.clearRuntimes(agentId);

		this.logger.debug('Reverted SDK agent to published version', { agentId, projectId });
		return agent;
	}

	async delete(agentId: string, projectId: string): Promise<boolean> {
		const agent = await this.agentRepository.findByIdAndProjectId(agentId, projectId);

		if (!agent) {
			return false;
		}

		await this.agentRepository.remove(agent);

		this.clearRuntimes(agentId);

		try {
			const { AgentScheduleService } = await import('./integrations/agent-schedule.service');
			Container.get(AgentScheduleService).deregister(agentId);
		} catch (error) {
			this.logger.warn('Failed to stop schedule on agent delete', {
				agentId,
				error: error instanceof Error ? error.message : error,
			});
		}

		// Remove the test-chat thread + its messages so deleting an agent
		// doesn't leave orphaned rows in agents_threads / agents_messages.
		// Swallow errors — the agent is already gone; best-effort cleanup.
		// Log at warn level so orphaned rows are observable in production.
		try {
			await this.clearAllTestChatMessages(agentId);
		} catch (error) {
			this.logger.warn('Failed to clear test chat on agent delete', {
				agentId,
				error: error instanceof Error ? error.message : error,
			});
		}

		this.logger.debug('Deleted SDK agent', { agentId, projectId });

		return true;
	}

	/** Return persisted chat messages for a given session/thread. */
	async getChatMessages(threadId: string) {
		return await this.n8nMemory.getMessages(threadId);
	}

	private getMemoryFactory(): MemoryFactory {
		return (params: AgentJsonMemoryConfig) => {
			if (params.storage === 'n8n') {
				return this.n8nMemory;
			}
			if (params.storage === 'sqlite') {
				return new agents.SqliteMemory(agents.SqliteMemoryConfigSchema.parse(params));
			}
			throw new Error(`Unsupported memory storage: ${params.storage}`);
		};
	}

	/** Create a credential provider scoped to a project. */
	private createCredentialProvider(projectId: string): AgentsCredentialProvider {
		return new AgentsCredentialProvider(Container.get(CredentialsService), projectId);
	}

	/**
	 * Return a cached runtime, or reconstruct one from the DB.
	 */
	private async getRuntime(params: GetRuntimeParams): Promise<{
		agent: agents.Agent;
		agentId: string;
		toolRegistry: ToolRegistry;
		projectId: string;
	}> {
		const { agentId, projectId, integrationType, usePublishedVersion } = params;

		const cacheKey = this.computeRuntimeCacheKey(params);

		const cached = this.runtimes.get(cacheKey);
		if (cached) return cached;

		const agentEntity = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!agentEntity) throw new NotFoundError(`Agent ${agentId} not found`);

		let n8nUserId = params.n8nUserId;
		let agentData: Agent = agentEntity;

		if (usePublishedVersion) {
			const publishedSchema = agentEntity.publishedVersion?.schema;
			if (!publishedSchema) {
				throw new NotFoundError(`Agent ${agentId} is not published`);
			}
			agentData = {
				...agentEntity,
				schema: publishedSchema,
				tools: agentEntity.publishedVersion?.tools ?? agentEntity.tools ?? {},
				skills: agentEntity.publishedVersion?.skills ?? agentEntity.skills ?? {},
			} as Agent;

			// Resolve n8n user from publishedById when not provided by the caller.
			n8nUserId ??= agentEntity.publishedVersion?.publishedById ?? undefined;
		}

		if (!n8nUserId) {
			throw new UserError('Agent user owner id is required');
		}

		const credentialProvider = this.createCredentialProvider(projectId);
		const { agent: agentInstance, toolRegistry } = await this.reconstructFromConfig(
			agentData,
			credentialProvider,
			n8nUserId,
			integrationType,
		);

		this.runtimes.set(cacheKey, { agent: agentInstance, agentId, toolRegistry, projectId });
		const runtime = this.runtimes.get(cacheKey);
		if (!runtime) throw new Error(`Agent ${agentId} failed to reconstruct`);
		return runtime;
	}

	/**
	 * Returns a `resolveTool` callback for `Agent.fromSchema()` that converts
	 * non-editable tool schema entries into functional `BuiltTool` implementations.
	 *
	 * Detects the tool type via `metadata.workflowTool` / `metadata.nodeTool` and
	 * delegates to the appropriate factory. Returns `null` for unknown types so that
	 * `fromSchema` falls back to a passthrough marker.
	 */
	private makeToolResolver(projectId: string, userId?: string): ToolResolver {
		return async (ref: AgentJsonToolConfig) => {
			if (ref.type === 'workflow') {
				if (!userId) {
					throw new UserError('userId is required when agent uses workflow tools');
				}
				const { resolveWorkflowTool } = await import('./tools/workflow-tool-factory');
				return await resolveWorkflowTool(ref, {
					workflowRepository: this.workflowRepository,
					workflowRunner: this.workflowRunner,
					activeExecutions: this.activeExecutions,
					executionRepository: this.executionRepository,
					workflowFinderService: this.workflowFinderService,
					userRepository: this.userRepository,
					userId,
					projectId,
					webhookBaseUrl: this.urlService.getWebhookBaseUrl(),
				});
			}

			if (ref.type === 'node') {
				const { resolveNodeTool } = await import('./tools/node-tool-factory');
				return await resolveNodeTool(ref, {
					executor: this.ephemeralNodeExecutor,
					projectId,
				});
			}

			return null;
		};
	}

	/**
	 * Inject platform-level tools and storage into an agent instance.
	 * Workflow and node tools are resolved earlier via `makeToolResolver()` inside
	 * `fromSchema()`, so this method only handles host-side singletons.
	 *
	 * `nodeToolsEnabled` comes from the agent's `config.nodeTools.enabled` flag
	 * (opt-in, defaults to false) — see {@link isNodeToolsEnabled}.
	 */
	private async injectRuntimeDependencies(params: InjectRuntimeDependenciesParams): Promise<void> {
		const { agent, agentId, projectId, credentialProvider, nodeToolsEnabled, integrationType } =
			params;

		// Inject get_environment unconditionally. It surfaces info the model
		// can't know on its own (current date, instance timezone, day of week)
		// via a tool call rather than the system prompt — so values that change
		// per request don't bust system-prompt prompt caching.
		try {
			const { createGetEnvironmentTool } = await import('./tools/environment-tool');
			agent.tool(createGetEnvironmentTool());
		} catch (toolError) {
			this.logger.warn('Failed to inject get_environment tool', {
				agentId,
				error: toolError instanceof Error ? toolError.message : String(toolError),
			});
		}

		// Inject the rich_interaction tool only for platforms that can actually
		// render its suspend/resume HITL cards. Two gates:
		//   - A registered integration in ChatIntegrationRegistry. The in-app
		//     test chat uses `integrationType = 'chat'`, which isn't registered,
		//     and the compile/validate path passes no integrationType at all —
		//     neither has a bridge to render the card or resume the suspended
		//     turn, so letting the model call the tool there would hang the
		//     agent.
		//   - The integration must declare `supportedComponents`. Platforms
		//     that omit it (e.g. Linear) have explicitly opted out of
		//     rich_interaction.
		const integration = integrationType
			? Container.get(ChatIntegrationRegistry).get(integrationType)
			: undefined;
		if (integration?.supportedComponents !== undefined) {
			try {
				const { createRichInteractionTool } = await import('./integrations/rich-interaction-tool');
				agent.tool(createRichInteractionTool(integrationType));
			} catch (toolError) {
				this.logger.warn('Failed to inject rich_interaction tool', {
					agentId,
					error: toolError instanceof Error ? toolError.message : String(toolError),
				});
			}
		}

		if (nodeToolsEnabled) {
			this.attachNodeToolChain(agent, credentialProvider, projectId);
		}

		// Inject checkpoint storage
		if (!agent.hasCheckpointStorage()) {
			agent.checkpoint(this.n8nCheckpointStorage);
		}
	}

	/**
	 * Attaches the built-in node tool chain (search_nodes, get_node_types,
	 * list_credentials, run_node_tool) so the agent can discover and execute
	 * n8n nodes on demand. Sourced from {@link AgentsToolsService}, which in
	 * turn delegates to `NodeCatalogService`.
	 */
	private attachNodeToolChain(
		agent: agents.Agent,
		credentialProvider: CredentialProvider,
		projectId: string,
	): void {
		agent.tool(this.agentsToolsService.getRuntimeTools(credentialProvider, projectId));
	}

	/**
	 * Resume a suspended tool call and yield the resulting stream chunks.
	 * Used by chat integration handlers to continue an agent run after
	 * a human-in-the-loop action (button click, modal submission).
	 */
	async *resumeForChat(config: ResumeForChatConfig): AsyncGenerator<StreamChunk> {
		const { agentId, projectId, runId, toolCallId, resumeData, integrationType } = config;

		const checkpointStatus = await this.n8nCheckpointStorage.getStatus(runId);
		if (checkpointStatus.status === 'expired') {
			throw new UserError(`Checkpoint ${runId} is expired and cannot be resumed`);
		}

		if (checkpointStatus.status === 'not-found') {
			throw new UserError(`Checkpoint ${runId} not found and cannot be resumed`);
		}

		const memoryScope = checkpointStatus.checkpoint?.persistence;
		if (!memoryScope) {
			throw new UserError(`Checkpoint ${runId} has no memory data and cannot be resumed`);
		}

		const threadId = memoryScope.threadId;

		const runtime = await this.getRuntime({
			agentId,
			projectId,
			usePublishedVersion: true,
			integrationType,
		});

		const { agent: agentInstance, toolRegistry } = runtime;
		const recorder = new ExecutionRecorder(toolRegistry);

		const resultStream = await agentInstance.resume('stream', resumeData, {
			runId,
			toolCallId,
		});

		const reader = resultStream.stream.getReader();
		try {
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				recorder.record(value);
				yield value;
			}
		} finally {
			reader.releaseLock();
		}

		// Always record resumed executions — even if they suspend again (chained HITL).
		// Don't repeat the original user message — the pre-suspension execution already has it.
		if (!recorder.suspended) {
			this.pendingUserMessages.delete(agentId);
		}
		const messageRecord = recorder.getMessageRecord();
		void this.agentExecutionService
			.recordMessage({
				threadId,
				agentId,
				agentName: agentInstance.name,
				projectId,
				userMessage: '',
				record: messageRecord,
				hitlStatus: 'resumed',
			})
			.catch((error) => {
				this.logger.warn('Failed to record resumed agent execution', {
					agentId,
					threadId,
					error: error instanceof Error ? error.message : String(error),
				});
			});
	}

	/**
	 * Check whether an agent has the minimum config it needs to be run.
	 * Returns the list of missing/invalid fields, if any.
	 *
	 * `missing` items correspond to user-facing concepts:
	 *   - "instructions": empty or whitespace-only instructions string
	 *   - "model":        missing model or one that fails the provider/model regex
	 *   - "credential":   credential name is set in config but doesn't resolve to
	 *                     a real credential in the project
	 *   - "skill:<id>":   config references a skill id with no stored body
	 */
	async validateAgentIsRunnable(
		agentId: string,
		projectId: string,
		credentialProvider: CredentialProvider,
	): Promise<{ missing: string[] }> {
		const agentEntity = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!agentEntity) {
			return { missing: ['agent'] };
		}
		// Schema is persisted as JSON — double-cast rehydrates to the typed config.
		const config = agentEntity.schema as unknown as AgentJsonConfig | null;
		const missing: string[] = [];

		if (!config) {
			return { missing: ['instructions', 'model'] };
		}

		if (!config.instructions?.trim()) {
			missing.push('instructions');
		}

		const modelSchema = AgentJsonConfigSchema.shape.model;
		if (!config.model || !modelSchema.safeParse(config.model).success) {
			missing.push('model');
		}

		if (config.credential) {
			try {
				const credentialName = config.credential;
				const creds = await credentialProvider.list();
				const exists = creds.some(
					(c) => c.id === credentialName || c.name.toLowerCase() === credentialName.toLowerCase(),
				);
				if (!exists) missing.push('credential');
			} catch {
				// If listing fails (e.g. permissions), don't flag as misconfigured —
				// the runtime will surface the real error path on execute.
			}
		}

		missing.push(
			...this.agentSkillsService
				.getMissingSkillIds(config, agentEntity.skills ?? {})
				.map((skillId) => `skill:${skillId}`),
		);

		return { missing };
	}

	/**
	 * Execute an agent for the in-app test chat and yield stream chunks.
	 *
	 * `userId` is the authenticated n8n user (used for RBAC / credential
	 * resolution).  `memory.resourceId` scopes the agent's memory so each
	 * user sees their own conversation; for test-chat both equal userId.
	 *
	 */
	async *executeForChat(config: ExecuteForChatConfig): AsyncGenerator<StreamChunk> {
		const { agentId, projectId, message, userId, memory } = config;

		const runtime = await this.getRuntime({ agentId, projectId, n8nUserId: userId });

		yield* this.streamChatResponse({
			agentInstance: runtime.agent,
			toolRegistry: runtime.toolRegistry,
			agentId,
			message,
			memory,
			projectId: runtime.projectId,
		});
	}

	/**
	 * Return persisted test-chat messages for an agent scoped to the current
	 * user. Test-chat threads are keyed by agent and user so thread-scoped
	 * working memory stays isolated.
	 */
	async getTestChatMessages(agentId: string, userId: string) {
		return await this.n8nMemory.getMessages(chatThreadId(agentId, userId), {
			resourceId: userId,
		});
	}

	/**
	 * Clear the current user's test-chat messages for an agent.
	 */
	async clearTestChatMessages(agentId: string, userId: string) {
		await this.n8nMemory.deleteMessagesByThread(chatThreadId(agentId, userId), userId);
	}

	/** Delete all test-chat messages + the thread row — used when the agent itself is deleted. */
	async clearAllTestChatMessages(agentId: string) {
		const threadId = chatThreadId(agentId);
		await this.n8nMemory.deleteThreadsByPrefix(threadId);
		await this.n8nMemory.deleteMessagesByThread(threadId);
		await this.n8nMemory.deleteThread(threadId);
	}

	/**
	 * Execute a published agent for a chat integration (Slack, Telegram, …).
	 *
	 * Loads the published snapshot — never the draft.
	 */
	async *executeForChatPublished(
		config: ExecuteForChatPublishedConfig,
	): AsyncGenerator<StreamChunk> {
		const { agentId, projectId, message, memory, integrationType } = config;

		const runtime = await this.getRuntime({
			agentId,
			projectId,
			integrationType,
			usePublishedVersion: true,
		});

		yield* this.streamChatResponse({
			agentInstance: runtime.agent,
			toolRegistry: runtime.toolRegistry,
			agentId,
			message,
			memory,
			projectId: runtime.projectId,
			source: integrationType,
		});
	}

	/**
	 * Execute a published agent for the local schedule trigger.
	 *
	 * The n8n user identity for RBAC is resolved from
	 * `publishedVersion.publishedById`.  Each scheduled run uses its own
	 * memory scope so no conversation history is shared across runs.
	 * `projectId` is resolved from the agent entity.
	 */
	async *executeForSchedulePublished(
		config: ExecuteForSchedulePublishedConfig,
	): AsyncGenerator<StreamChunk> {
		const { agentId, projectId, message, memory } = config;

		// One shared compiled runtime per agent for all schedule runs.
		const runtime = await this.getRuntime({
			agentId,
			projectId,
			integrationType: AGENT_SCHEDULE_TRIGGER_TYPE,
			usePublishedVersion: true,
		});

		yield* this.streamChatResponse({
			agentInstance: runtime.agent,
			toolRegistry: runtime.toolRegistry,
			agentId,
			message,
			memory,
			projectId: runtime.projectId,
			source: AGENT_SCHEDULE_TRIGGER_TYPE,
		});
	}

	/**
	 * Stream an agent response, record it, and yield each chunk.
	 *
	 * `config.memory.resourceId` is passed as `persistence.resourceId` to
	 * `agentInstance.stream()` to scope memory per chat user — it is
	 * deliberately distinct from the n8n user ID used for RBAC.
	 */
	private async *streamChatResponse(config: StreamChatResponseConfig): AsyncGenerator<StreamChunk> {
		const { agentInstance, toolRegistry, agentId, message, memory, projectId, source } = config;
		const { threadId, resourceId } = memory;

		const recorder = new ExecutionRecorder(toolRegistry);

		const resultStream = await agentInstance.stream(message, {
			persistence: { threadId, resourceId },
		});

		const reader = resultStream.stream.getReader();
		try {
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				recorder.record(value);
				if (value.type === 'tool-call-suspended') {
					this.logger.info('Chat: tool-call-suspended chunk received', {
						agentId,
						toolCallId: value.toolCallId,
						toolName: value.toolName,
					});
				}
				yield value;
			}
		} finally {
			reader.releaseLock();
		}

		// Always record — even if suspended, the pre-suspension response text
		// and tool calls are valuable. Usage/model will be null for suspended runs.
		if (recorder.suspended) {
			this.pendingUserMessages.set(agentId, message);
		}

		const messageRecord = recorder.getMessageRecord();
		void this.agentExecutionService
			.recordMessage({
				threadId,
				agentId,
				agentName: agentInstance.name,
				projectId,
				userMessage: message,
				record: messageRecord,
				hitlStatus: recorder.suspended ? 'suspended' : undefined,
				source,
			})
			.catch((error) => {
				this.logger.warn('Failed to record agent execution', {
					agentId,
					threadId,
					error: error instanceof Error ? error.message : String(error),
				});
			});
	}

	/**
	 * Compile an agent in isolation without writing to the shared runtime cache.
	 * Used by executeForWorkflow so that concurrent Slack / chat executions
	 * are not affected.
	 */
	private async compileIsolated(
		agentEntity: Agent,
		credentialProvider: CredentialProvider,
		userId: string,
	): Promise<{ ok: boolean; agent?: BuiltAgent; error?: string }> {
		if (!agentEntity.schema) {
			return { ok: false, error: 'Agent has no JSON config. Create a config first.' };
		}

		try {
			const { agent: reconstructed } = await this.reconstructFromConfig(
				agentEntity,
				credentialProvider,
				userId,
			);
			return { ok: true, agent: reconstructed as BuiltAgent };
		} catch (e) {
			return {
				ok: false,
				error: e instanceof Error ? e.message : 'Unknown compilation error',
			};
		}
	}

	/**
	 * Execute an SDK agent within a workflow execution context.
	 *
	 * Streams the run rather than calling `.generate()` so the same
	 * `ExecutionRecorder` used by chat/Slack/schedule paths can collect a full
	 * `MessageRecord` (timeline, tool calls, usage). Without this, sessions
	 * triggered from a workflow node never appear in the agent's session list
	 * because nothing creates the agent execution thread row.
	 *
	 * Compiles a fresh isolated agent per call for credential isolation (does
	 * not use or affect the shared runtime cache).
	 */
	async executeForWorkflow(
		agentId: string,
		message: string,
		executionId: string,
		threadId: string,
		userId: string,
		projectId: string,
	): Promise<ExecuteAgentData> {
		const agentEntity = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!agentEntity) {
			throw new OperationalError('Agent not found or not accessible.');
		}

		if (!agentEntity.publishedVersion) {
			throw new OperationalError(
				'Agent is not published. Publish the agent before using it in a workflow.',
			);
		}

		const credentialProvider = new AgentsCredentialProvider(
			Container.get(CredentialsService),
			projectId,
		);

		const compiled = await this.compileIsolated(agentEntity, credentialProvider, userId);
		if (!compiled.ok || !compiled.agent) {
			throw new OperationalError(`Failed to compile agent: ${compiled.error ?? 'unknown error'}`);
		}

		const agentInstance = compiled.agent;
		const recorder = new ExecutionRecorder();

		// `structuredOutput` and `toolCalls` aren't surfaced by the recorder —
		// pull them off the `finish` chunk and the discrete `tool-result` chunks
		// directly so the workflow node receives the same shape as before.
		let structuredOutput: unknown | null = null;
		const toolCalls: ExecuteAgentData['toolCalls'] = [];
		const toolInputs = new Map<string, { toolName: string; input: unknown }>();

		const resultStream = await agentInstance.stream(message, {
			persistence: { resourceId: executionId, threadId },
		});

		const reader = resultStream.stream.getReader();
		try {
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				recorder.record(value);

				if (value.type === 'tool-call') {
					toolInputs.set(value.toolCallId, { toolName: value.toolName, input: value.input });
				} else if (value.type === 'tool-result') {
					const pending = toolInputs.get(value.toolCallId);
					toolCalls.push({
						toolName: value.toolName,
						input: pending?.input ?? null,
						result: value.output,
					});
					toolInputs.delete(value.toolCallId);
				} else if (value.type === 'finish' && value.structuredOutput !== undefined) {
					structuredOutput = value.structuredOutput;
				}
			}
		} finally {
			reader.releaseLock();
		}

		const messageRecord = recorder.getMessageRecord();

		// Persist the thread + execution row + metadata so the session is
		// listed under the agent (mirrors chat/slack/schedule recording).
		// Fire-and-forget with .catch so a recording failure doesn't fail the
		// workflow node — the response is already in hand.
		void this.agentExecutionService
			.recordMessage({
				threadId,
				agentId,
				agentName: agentInstance.name,
				projectId,
				userMessage: message,
				record: messageRecord,
				source: AGENT_WORKFLOW_TRIGGER_TYPE,
			})
			.catch((error) => {
				this.logger.warn('Failed to record agent execution from workflow', {
					agentId,
					threadId,
					error: error instanceof Error ? error.message : String(error),
				});
			});

		if (recorder.suspended) {
			throw new OperationalError(
				'Agent execution suspended waiting for tool approval. ' +
					'Suspend/resume is not supported in workflow execution context.',
			);
		}

		if (messageRecord.error) {
			throw new OperationalError(`Agent execution failed: ${messageRecord.error}`);
		}

		if (messageRecord.finishReason === 'error') {
			throw new OperationalError('Agent execution finished with an error.');
		}

		return {
			response: messageRecord.assistantResponse,
			structuredOutput: structuredOutput ?? null,
			usage: messageRecord.usage
				? {
						promptTokens: messageRecord.usage.promptTokens,
						completionTokens: messageRecord.usage.completionTokens,
						totalTokens: messageRecord.usage.totalTokens,
					}
				: null,
			toolCalls,
			finishReason: messageRecord.finishReason,
			session: {
				agentId,
				projectId,
				sessionId: threadId,
			},
		};
	}

	/**
	 * Get the JSON config for an agent.
	 */
	async getConfig(agentId: string, projectId: string): Promise<AgentJsonConfig> {
		const entity = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!entity) throw new NotFoundError('Agent not found');
		const config = composeJsonConfig(entity);
		if (!config) {
			throw new UserError('Agent has no JSON config yet.');
		}
		return config;
	}

	/**
	 * Validate an AgentJsonConfig: runs Zod schema validation and checks any
	 * node tool configurations against their JSON-Schema definitions.
	 *
	 * Returns `{ valid: true, config }` on success, or `{ valid: false, error }`
	 * with a human-readable message on failure.
	 */
	async validateConfig(
		raw: unknown,
	): Promise<{ valid: true; config: AgentJsonConfig } | { valid: false; error: string }> {
		const parsed = AgentJsonConfigSchema.safeParse(raw);
		if (!parsed.success) {
			return { valid: false, error: parsed.error.message };
		}

		const config = parsed.data;

		try {
			this.validateNodeToolExpressions(config);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return {
				valid: false,
				error: `Invalid $fromAI expression in node tool config: ${message}`,
			};
		}

		const nodeError = await this.validateNodeToolConfigs(config);
		if (nodeError) {
			return { valid: false, error: nodeError };
		}

		return { valid: true, config };
	}

	private validateNodeToolExpressions(config: AgentJsonConfig): void {
		for (const tool of config.tools ?? []) {
			if (tool.type !== 'node') continue;

			extractFromAIParameters((tool.node.nodeParameters ?? {}) as INodeParameters);
		}
	}

	/**
	 * Backfill `credentialName` on credential integrations that were created
	 * before the field was required. Looks up the name by `credentialId` and
	 * splices it into the config; integrations that already have a name, or
	 * aren't credential integrations at all, pass through untouched.
	 *
	 * If a credential id no longer resolves, the integration is left as-is —
	 * validation will then fail with a clear "credentialName required" error
	 * pointing at the orphaned integration, which is the correct outcome.
	 */
	private async healIntegrationCredentialNames(rawConfig: unknown): Promise<unknown> {
		if (!rawConfig || typeof rawConfig !== 'object') return rawConfig;
		const cfg = rawConfig as { integrations?: unknown };
		if (!Array.isArray(cfg.integrations)) return rawConfig;

		const missingIds = new Set<string>();
		for (const integration of cfg.integrations) {
			if (!integration || typeof integration !== 'object') continue;
			const i = integration as { credentialId?: unknown; credentialName?: unknown };
			if (typeof i.credentialId === 'string' && i.credentialName === undefined) {
				missingIds.add(i.credentialId);
			}
		}
		if (missingIds.size === 0) return rawConfig;

		const credentials = await Container.get(CredentialsRepository).findBy({
			id: In(Array.from(missingIds)),
		});
		const namesById = new Map(credentials.map((c) => [c.id, c.name]));

		const integrations: unknown[] = cfg.integrations;
		return {
			...cfg,
			integrations: integrations.map((integration: unknown): unknown => {
				if (!integration || typeof integration !== 'object') return integration;
				const i = integration as { credentialId?: unknown; credentialName?: unknown };
				if (typeof i.credentialId !== 'string' || i.credentialName !== undefined) {
					return integration;
				}
				const name = namesById.get(i.credentialId);
				return name ? { ...integration, credentialName: name } : integration;
			}),
		};
	}

	/**
	 * Persist a new AgentJsonConfig (full replace).
	 */
	async updateConfig(
		agentId: string,
		projectId: string,
		config: unknown,
	): Promise<{ config: AgentJsonConfig; updatedAt: string; versionId: string | null }> {
		const entity = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!entity) throw new NotFoundError('Agent not found');

		// Repair integrations missing `credentialName`. Agents created before
		// the field was added to the schema return integrations of the form
		// `{ type, credentialId }` from `findById`; the UI sends them back
		// unchanged on save and validation rejects them as invalid. Look the
		// names up by id once here so the next save persists the full shape.
		const healedConfig = await this.healIntegrationCredentialNames(config);

		const result = await this.validateConfig(healedConfig);
		if (!result.valid) {
			throw new UserError(`Invalid agent config: ${result.error}`);
		}

		this.validateConfigRefs(result.config, entity);

		const previousIntegrations = entity.integrations ?? [];
		const { schemaConfig, integrations: nextIntegrations } = decomposeJsonConfig(result.config);

		entity.schema = schemaConfig as AgentJsonConfig;
		entity.name = result.config.name;
		entity.description = result.config.description ?? null;
		entity.integrations = nextIntegrations;
		markAgentDraftDirty(entity);

		// Remove tool entries that are no longer referenced in the config
		const referencedIds = new Set(
			(result.config.tools ?? [])
				.filter((t): t is Extract<AgentJsonConfigRef, { type: 'custom' }> => t.type === 'custom')
				.map((t) => t.id),
		);
		const orphanIds = Object.keys(entity.tools).filter((id) => !referencedIds.has(id));
		if (orphanIds.length > 0) {
			const tools = { ...entity.tools };
			for (const id of orphanIds) {
				delete tools[id];
			}
			entity.tools = tools;
		}

		this.agentSkillsService.removeUnreferencedSkills(entity, result.config);

		// Invalidate runtime caches
		this.clearRuntimes(agentId);

		const saved = await this.agentRepository.save(entity);
		this.logger.debug('Updated agent JSON config', { agentId, projectId });

		await syncAgentIntegrations(saved, previousIntegrations, nextIntegrations, this.logger);

		return {
			config: composeJsonConfig(saved) ?? result.config,
			updatedAt: saved.updatedAt.toISOString(),
			versionId: saved.versionId,
		};
	}

	/**
	 * Validate and persist a custom tool for an agent.
	 * The tool code is described in an isolate, and the descriptor + code
	 * are stored in the agent's `tools` column.
	 */
	async buildCustomTool(
		agentId: string,
		projectId: string,
		code: string,
		descriptor: ToolDescriptor,
	): Promise<{ ok: boolean; id: string; descriptor: ToolDescriptor }> {
		const entity = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!entity) throw new NotFoundError('Agent not found');

		const toolId = generateAgentResourceId('tool', Object.keys(entity.tools ?? {}));

		// Store tool code + descriptor. Registering the tool in the agent config
		// (adding `{ type: "custom", id }` to `schema.tools`) is the caller's
		// responsibility — typically via a follow-up patch_config / write_config —
		// so this method does not touch `entity.schema`.
		entity.tools = {
			...entity.tools,
			[toolId]: { code, descriptor },
		};

		markAgentDraftDirty(entity);
		this.clearRuntimes(agentId);
		await this.agentRepository.save(entity);

		this.logger.debug('Built custom tool', { agentId, projectId, toolId });

		return { ok: true, id: toolId, descriptor };
	}

	async listSkills(agentId: string, projectId: string): Promise<Record<string, AgentSkill>> {
		return await this.agentSkillsService.listSkills(agentId, projectId);
	}

	async getSkill(agentId: string, projectId: string, skillId: string): Promise<AgentSkill> {
		return await this.agentSkillsService.getSkill(agentId, projectId, skillId);
	}

	async createSkill(
		agentId: string,
		projectId: string,
		skill: AgentSkill,
	): Promise<AgentSkillMutationResponse> {
		const result = await this.agentSkillsService.createSkill(agentId, projectId, skill);
		this.clearRuntimes(agentId);
		return result;
	}

	async createAndAttachSkill(
		agentId: string,
		projectId: string,
		skill: AgentSkill,
	): Promise<AgentSkillMutationResponse> {
		const result = await this.agentSkillsService.createAndAttachSkill(agentId, projectId, skill);
		this.clearRuntimes(agentId);
		return result;
	}

	async updateSkill(
		agentId: string,
		projectId: string,
		skillId: string,
		updates: Partial<AgentSkill>,
	): Promise<AgentSkillMutationResponse> {
		const result = await this.agentSkillsService.updateSkill(agentId, projectId, skillId, updates);
		this.clearRuntimes(agentId);
		return result;
	}

	/**
	 * Remove a custom tool from an agent.
	 */
	async deleteCustomTool(agentId: string, projectId: string, toolId: string): Promise<void> {
		const entity = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!entity) throw new NotFoundError('Agent not found');

		const tools = { ...entity.tools };
		delete tools[toolId];
		entity.tools = tools;

		// Remove from config tools array
		if (entity.schema?.tools) {
			entity.schema.tools = entity.schema.tools.filter(
				(t: AgentJsonConfigRef) => !(t.type === 'custom' && 'id' in t && t.id === toolId),
			);
		}

		markAgentDraftDirty(entity);
		this.clearRuntimes(agentId);
		await this.agentRepository.save(entity);

		this.logger.debug('Deleted custom tool', { agentId, projectId, toolId });
	}

	async deleteSkill(agentId: string, projectId: string, skillId: string): Promise<void> {
		await this.agentSkillsService.deleteSkill(agentId, projectId, skillId);
		this.clearRuntimes(agentId);
	}

	/**
	 * Validate the node configurations for any node-type tools in an AgentJsonConfig.
	 *
	 * Node tool schemas are validated on the host (not in the sandbox) because the
	 * real Zod schemas are only available in the host process.
	 *
	 * @returns A formatted error string if any node config is invalid, or null if all pass.
	 */
	private async validateNodeToolConfigs(config: AgentJsonConfig): Promise<string | null> {
		const nodeTools = (config.tools ?? []).filter(
			(t): t is Extract<AgentJsonToolConfig, { type: 'node' }> => t.type === 'node',
		);

		if (nodeTools.length === 0) return null;

		const { setSchemaBaseDirs, validateNodeConfig } = await import('@n8n/workflow-sdk');

		const dirs = resolveBuiltinNodeDefinitionDirs();
		if (dirs.length > 0) {
			setSchemaBaseDirs(dirs);
		}

		const errors: string[] = [];

		for (const tool of nodeTools) {
			const nodeType: string = tool.node.nodeType;
			const nodeTypeVersion: number = tool.node.nodeTypeVersion;
			const nodeParameters = tool.node.nodeParameters ?? {};

			const result = validateNodeConfig(
				nodeType,
				nodeTypeVersion,
				{ parameters: nodeParameters },
				{ isToolNode: true },
			);

			if (!result.valid) {
				const messages = result.errors
					.map((e: { path: string; message: string }) => e.message)
					.join('; ');
				errors.push(`Node tool "${tool.name}" (${nodeType}@${nodeTypeVersion}): ${messages}`);
			}
		}

		return errors.length > 0 ? errors.join('\n') : null;
	}

	private validateConfigRefs(config: AgentJsonConfig, entity: Agent) {
		const missingSkillIds = this.agentSkillsService.getMissingSkillIds(config, entity.skills ?? {});
		if (missingSkillIds.length > 0) {
			throw new UserError(
				`Invalid agent config: Missing skill bodies: ${missingSkillIds.join(', ')}`,
			);
		}

		const missingToolIds = this.getMissingCustomToolIds(config, entity.tools ?? {});
		if (missingToolIds.length > 0) {
			throw new UserError(
				`Invalid agent config: Missing custom tool definitions: ${missingToolIds.join(', ')}`,
			);
		}

		// Mirror AgentScheduleService.activate(): a schedule integration cannot be
		// active until the agent has a published version. Otherwise the persisted
		// config can claim active=true while the cron registration silently
		// refuses to register.
		const activeUnpublishedSchedule = (config.integrations ?? []).some(
			(integration) => isAgentScheduleIntegration(integration) && integration.active,
		);
		if (activeUnpublishedSchedule && !entity.publishedVersion) {
			throw new UserError(
				'Invalid agent config: schedule integration cannot be active until the agent is published',
			);
		}
	}

	private getMissingCustomToolIds(
		config: AgentJsonConfig | null,
		tools: AgentToolEntries,
	): string[] {
		const refs = (config?.tools ?? []).filter(
			(ref): ref is Extract<AgentJsonConfigRef, { type: 'custom' }> => ref.type === 'custom',
		);
		const seen = new Set<string>();
		const missing: string[] = [];

		for (const ref of refs) {
			if (seen.has(ref.id)) continue;
			seen.add(ref.id);
			if (!tools[ref.id]) missing.push(ref.id);
		}

		return missing;
	}

	private snapshotConfiguredTools(
		config: AgentJsonConfig | null,
		tools: AgentToolEntries,
	): AgentToolEntries | null {
		if (!config) return null;
		const missing = this.getMissingCustomToolIds(config, tools);
		if (missing.length > 0) {
			throw new UserError(`Cannot publish agent with missing custom tools: ${missing.join(', ')}`);
		}

		const snapshot: AgentToolEntries = {};
		for (const ref of config.tools ?? []) {
			if (ref.type !== 'custom') continue;
			const tool = tools[ref.id];
			if (tool) snapshot[ref.id] = tool;
		}
		return snapshot;
	}

	/**
	 * Reconstruct an agent from its JSON config using buildFromJson().
	 * This is the new execution path for JSON-config agents.
	 */
	private async reconstructFromConfig(
		agentEntity: Agent,
		credentialProvider: CredentialProvider,
		userId: string,
		integrationType?: string,
	): Promise<{ agent: agents.Agent; toolRegistry: ToolRegistry }> {
		const config = agentEntity.schema;
		if (!config) {
			throw new UserError('Agent has no JSON config.');
		}

		// Build toolsByName map: { toolName -> code }
		const toolsByName: Record<string, string> = {};
		for (const [_toolId, toolEntry] of Object.entries(agentEntity.tools ?? {})) {
			toolsByName[toolEntry.descriptor.name] = toolEntry.code;
		}

		// Build toolDescriptors map: { toolId -> descriptor }
		const toolDescriptors: Record<string, ToolDescriptor> = {};
		for (const [toolId, toolEntry] of Object.entries(agentEntity.tools ?? {})) {
			toolDescriptors[toolId] = toolEntry.descriptor;
		}

		const toolExecutor = this.secureRuntime.createToolExecutor(toolsByName);

		const toolResolver = this.makeToolResolver(agentEntity.projectId, userId);

		const resolvedTools: BuiltTool[] = [];

		const reconstructed = await buildFromJson(config, toolDescriptors, {
			toolExecutor,
			credentialProvider,
			resolveTool: async (ref) => {
				const resolved = await toolResolver(ref);
				if (resolved) resolvedTools.push(resolved);
				return resolved;
			},
			skills: agentEntity.skills ?? {},
			memoryFactory: this.getMemoryFactory(),
		});

		await this.injectRuntimeDependencies({
			agent: reconstructed,
			agentId: agentEntity.id,
			projectId: agentEntity.projectId,
			credentialProvider,
			nodeToolsEnabled: isNodeToolsEnabled(config.config),
			integrationType,
		});

		const toolRegistry = buildToolRegistry(resolvedTools);
		return { agent: reconstructed, toolRegistry };
	}
}
