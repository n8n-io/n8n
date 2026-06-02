import type {
	Agent as RuntimeAgent,
	AgentExecutionCounter,
	BuiltAgent,
	BuiltTool,
	CredentialProvider,
	StreamChunk,
	ToolDescriptor,
} from '@n8n/agents';
import {
	AGENT_WORKFLOW_TRIGGER_TYPE,
	AgentIntegrationSchema,
	AgentJsonConfigSchema,
	isNodeToolsEnabled,
	AgentModelSchema,
	type AgentIntegrationConfig,
	type AgentJsonConfig,
	type AgentJsonMcpServerConfig,
	type AgentJsonMemoryConfig,
	type AgentJsonToolConfig,
	type AgentSkill,
	type AgentSkillMutationResponse,
	type AgentVersionListItemDto,
	type ChatIntegrationDescriptor,
	AgentPersistedMessageDto,
} from '@n8n/api-types';
import { extractFromAIParameters } from '@n8n/ai-utilities/fromai-helpers';
import { Logger } from '@n8n/backend-common';
import { AgentsConfig, GlobalConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import {
	ExecutionRepository,
	In,
	ProjectRelationRepository,
	User,
	UserRepository,
	WorkflowRepository,
} from '@n8n/db';
import { OnPubSubEvent } from '@n8n/decorators';
import { Container, Service } from '@n8n/di';
import type { EntityManager } from '@n8n/typeorm';
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
import { OauthService } from '@/oauth/oauth.service';
import type { PubSubCommandMap } from '@/scaling/pubsub/pubsub.event-map';
import { Publisher } from '@/scaling/pubsub/publisher.service';
import { UrlService } from '@/services/url.service';
import { Telemetry } from '@/telemetry';
import { TtlMap } from '@/utils/ttl-map';
import { WorkflowRunner } from '@/workflow-runner';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { AgentsCredentialProvider } from './adapters/agents-credential-provider';
import { markAgentDraftDirty } from './utils/agent-draft.utils';
import { draftChatMemoryResourceId } from './utils/agent-memory-scope';
import { executionsToMessagesDto } from './utils/execution-to-message-mapper';
import { generateAgentResourceId } from './utils/agent-resource-id';
import { AgentExecutionService } from './agent-execution.service';
import { AgentSkillsService } from './agent-skills.service';
import { AgentsToolsService } from './agents-tools.service';
import { AGENT_THREAD_PREFIX } from './builder/builder-tool-names';
import { LLM_PROVIDER_DEFAULTS } from './builder/interactive/llm-provider-defaults';
import { Agent } from './entities/agent.entity';
import { AgentTask } from './entities/agent-task.entity';
import { ExecutionRecorder } from './execution-recorder';
import { ChatIntegrationRegistry } from './integrations/agent-chat-integration';
import { ChatIntegrationActionExecutor } from './integrations/integration-action-executor';
import { ChatIntegrationContextQueryExecutor } from './integrations/integration-context-query-executor';
import { IntegrationMessageContextService } from './integrations/integration-message-context.service';
import {
	createIntegrationActionTool,
	createIntegrationContextTool,
	getIntegrationToolConnectionDescriptors,
} from './integrations/integration-tools';
import { syncAgentIntegrations } from './integrations/integrations-sync';
import { N8NCheckpointStorage } from './integrations/n8n-checkpoint-storage';
import { N8nMemory } from './integrations/n8n-memory';
import { createGetEnvironmentTool } from './tools/environment-tool';
import { createRichInteractionTool } from './integrations/rich-interaction-tool';
import { composeJsonConfig, decomposeJsonConfig } from './json-config/agent-config-composition';
import {
	buildFromJson,
	type MemoryFactory,
	type ToolResolver,
} from './json-config/from-json-config';
import { buildMcpClientForServer } from './json-config/mcp-client-factory';
import { AgentHistoryRepository } from './repositories/agent-history.repository';
import { AgentTaskSnapshotRepository } from './repositories/agent-task-snapshot.repository';
import { AgentTaskRepository } from './repositories/agent-task.repository';
import { AgentRepository } from './repositories/agent.repository';
import { AgentSecureRuntime } from './runtime/agent-secure-runtime';
import { buildToolRegistry, type ToolRegistry } from './tool-registry';
import { ChatIntegrationService } from './integrations/chat-integration.service';
import { AgentKnowledgeCommandService } from './agent-knowledge-command.service';
import { AgentKnowledgeService } from './agent-knowledge.service';

type AgentToolEntries = Agent['tools'];

interface InjectRuntimeDependenciesParams {
	agent: RuntimeAgent;
	agentId: string;
	projectId: string;
	credentialProvider: CredentialProvider;
	nodeToolsEnabled: boolean;
	credentialIntegrations: AgentIntegrationConfig[];
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

export interface ExecuteForTaskPublishedConfig {
	agentId: string;
	projectId: string;
	message: string;
	/** Memory scope — resourceId isolates per-run memory. */
	memory: AgentMemoryScope;
	/** The scheduled task this run belongs to; stamped on the session for traceability. */
	taskId: string;
	/** Published agent_history version that supplied the scheduled task snapshot. */
	taskVersionId: string;
}

export interface ExecuteForTaskNowConfig {
	agentId: string;
	projectId: string;
	/** n8n user ID — used for RBAC / credential resolution and recorded on the session. */
	userId: string;
	message: string;
	/** Memory scope — resourceId isolates per-run memory. */
	memory: AgentMemoryScope;
	/** The task this manual run belongs to; stamped on the session for traceability. */
	taskId: string;
}

interface StreamChatResponseConfig {
	agentInstance: RuntimeAgent;
	toolRegistry: ToolRegistry;
	agentId: string;
	userId?: string;
	message: string;
	memory: AgentMemoryScope;
	projectId: string;
	source?: string;
	taskId?: string;
	taskVersionId?: string;
}

interface GetRuntimeParams {
	agentId: string;
	projectId: string;
	n8nUserId?: string;
	integrationType?: string;
	/** When true, load the published snapshot; n8nUserId is derived from publishedById when omitted. */
	usePublishedVersion?: boolean;
}

interface PublishAgentOptions {
	syncIntegrations?: boolean;
}

interface SaveCredentialIntegrationOptions {
	broadcast?: boolean;
}

function getMaxIterationsChunks(): StreamChunk[] {
	const id = crypto.randomUUID();
	return [
		{ type: 'text-start', id },
		{
			type: 'text-delta',
			id,
			delta: 'The agent has reached the maximum number of iterations and has stopped.',
		},
		{ type: 'text-end', id },
	];
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
		{ agent: RuntimeAgent; agentId: string; toolRegistry: ToolRegistry; projectId: string }
	>(30 * Time.minutes.toMilliseconds);

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

	/**
	 * Drop all cached runtimes (draft and published) for an agent and, in
	 * multi-main mode, broadcast the invalidation to peer mains so their
	 * caches stay in sync.
	 *
	 * Pass `skipBroadcast: true` from the pubsub handler to avoid a re-publish
	 * loop when applying an event received from another main.
	 */
	private clearRuntimes(agentId: string, options: { skipBroadcast?: boolean } = {}): void {
		for (const key of this.runtimes.keys()) {
			if (key === agentId || key.startsWith(`${agentId}:`)) {
				const entry = this.runtimes.get(key);
				this.runtimes.delete(key);
				if (entry) this.closeAgentResources(entry.agent, agentId);
			}
		}

		if (options.skipBroadcast) return;
		if (!this.globalConfig.multiMainSetup.enabled) return;

		void this.publisher
			.publishCommand({
				command: 'agent-config-changed',
				payload: { agentId },
			})
			.catch((error) => {
				this.logger.warn(`[AgentsService] Failed to publish agent-config-changed for ${agentId}`, {
					error: error instanceof Error ? error.message : String(error),
				});
			});
	}

	/**
	 * Reconcile the local runtime cache when a peer main reports that an
	 * agent's configuration changed. The originating main has already cleared
	 * its own cache synchronously before publishing — this handler runs on
	 * every other main so the next request rebuilds the runtime from the
	 * current DB state.
	 */
	@OnPubSubEvent('agent-config-changed', { instanceType: 'main' })
	handleAgentConfigChanged(payload: PubSubCommandMap['agent-config-changed']): void {
		this.clearRuntimes(payload.agentId, { skipBroadcast: true });
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
		private readonly agentHistoryRepository: AgentHistoryRepository,
		private readonly agentSkillsService: AgentSkillsService,
		private readonly agentTaskRepository: AgentTaskRepository,
		private readonly agentTaskSnapshotRepository: AgentTaskSnapshotRepository,
		private readonly publisher: Publisher,
		private readonly agentsConfig: AgentsConfig,
		private readonly globalConfig: GlobalConfig,
		private readonly telemetry: Telemetry,
		private readonly chatIntegrationService: ChatIntegrationService,
		private readonly agentKnowledgeService: AgentKnowledgeService,
		private readonly agentKnowledgeCommandService: AgentKnowledgeCommandService,
		private readonly oauthService: OauthService,
	) {}

	private isNodeToolsModuleEnabled(): boolean {
		return this.agentsConfig.modules.includes('node-tools-searcher');
	}

	/**
	 * Whether the agent knowledge base sub-feature is enabled via
	 * `N8N_AGENTS_MODULES`. Gates the file endpoints and the `search_knowledge`
	 * runtime tool. Public so the controller can guard its file endpoints.
	 */
	isKnowledgeBaseModuleEnabled(): boolean {
		return this.agentsConfig.modules.includes('knowledge-base');
	}

	/**
	 * Best-effort close of an agent instance. Delegates to `agent.close()`
	 * which disposes the runtime and disconnects any attached MCP clients.
	 * Errors are logged but never thrown.
	 */
	private closeAgentResources(agent: { close(): Promise<void> }, agentId: string): void {
		agent.close().catch((error) => {
			this.logger.warn('[AgentsService] Failed to close agent resources on eviction', {
				agentId,
				error: error instanceof Error ? error.message : String(error),
			});
		});
	}

	private createAgentExecutionCounter({
		agentId,
		userId,
	}: {
		agentId: string;
		userId?: string;
	}): AgentExecutionCounter {
		const attribution = userId ? { user_id: userId } : {};
		return {
			incrementMessageCount: () =>
				this.telemetry.trackAgentExecution({
					agent_id: agentId,
					...attribution,
					message_count: 1,
				}),
			incrementTokenCount: (tokenCount) =>
				this.telemetry.trackAgentExecution({
					agent_id: agentId,
					...attribution,
					token_count: tokenCount,
				}),
			incrementToolCallCount: () =>
				this.telemetry.trackAgentExecution({
					agent_id: agentId,
					...attribution,
					tool_call_count: 1,
				}),
		};
	}

	private shouldAttachNodeTools(config: AgentJsonConfig['config']): boolean {
		return this.isNodeToolsModuleEnabled() && isNodeToolsEnabled(config);
	}

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
				...(i.builderGuidance
					? {
							capabilities: i.builderGuidance.capabilities,
							useIntegrationWhen: i.builderGuidance.useIntegrationWhen,
							useNodeToolWhen: i.builderGuidance.useNodeToolWhen,
						}
					: {}),
			}));
	}

	async create(projectId: string, name: string): Promise<Agent> {
		// New agents start with no instructions so the home screen routes the
		// first user message to the builder (/build) instead of to the chat
		// endpoint. The builder or manual model picker fills in the LLM config.
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
	 * Same scoping as {@link findByUser}, but only returns agents that have an
	 * `activeVersion`. Used by the MessageAnAgent node's listSearch so the
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
			relations: { activeVersion: true },
			order: { updatedAt: 'DESC' },
		});

		return agents.filter((agent) => agent.activeVersionId !== null);
	}

	async publishAgent(
		agentId: string,
		projectId: string,
		user: User,
		versionId?: string,
		options: PublishAgentOptions = {},
	): Promise<Agent> {
		const agent = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!agent) {
			throw new NotFoundError(`Agent "${agentId}" not found`);
		}

		// Idempotent fast-path: the agent is already published at this exact
		// versionId, so there's nothing to snapshot and no pointer to flip.
		// Without this, re-publishing without an intervening save or unpublish
		// would attempt to insert a second history row under the same PK and
		// trip the UNIQUE constraint.
		if (!versionId && agent.versionId !== null && agent.versionId === agent.activeVersionId) {
			return agent;
		}

		// Idempotent fast-path for re-publishing the already-active version —
		// no pointer to flip, no need to disturb the draft's versionId.
		if (versionId !== undefined && versionId === agent.activeVersionId) {
			return agent;
		}

		await this.agentRepository.manager.transaction(async (trx) => {
			if (versionId) {
				const existing = await this.agentHistoryRepository.findByVersionAndAgentId(
					versionId,
					agentId,
					trx,
				);
				if (!existing) {
					throw new NotFoundError(`Version "${versionId}" not found for agent "${agentId}"`);
				}
				agent.activeVersionId = existing.versionId;
				agent.activeVersion = existing;
				// The previously-active versionId may already own a history row
				// (e.g. the draft was in sync with the old active version). Bump
				// to a fresh UUID so the next regular publish writes a new row
				// instead of colliding on that PK.
				agent.versionId = uuid();
			} else {
				// Snapshot the current draft. agent.versionId is the snapshot's PK,
				// so make sure it's set before inserting.
				agent.versionId ??= uuid();

				agent.activeVersion = await this.agentHistoryRepository.saveVersion(
					{
						versionId: agent.versionId,
						agentId: agent.id,
						schema: agent.schema,
						tools: this.snapshotConfiguredTools(agent.schema, agent.tools ?? {}),
						skills: this.agentSkillsService.snapshotConfiguredSkills(
							agent.schema,
							agent.skills ?? {},
						),
						publishedBy: user,
					},
					trx,
				);
				await this.snapshotConfiguredTasks(trx, agent.versionId, agent.id, agent.schema);
				agent.activeVersionId = agent.versionId;
			}

			await trx.save(agent);
		});

		// Evict any cached draft runtime so integration executions pick up
		// the new published snapshot on their next request.
		this.clearRuntimes(agentId);

		// Wake up any chat integrations that were persisted while the agent
		// was a draft. ChatIntegrationService.syncToConfig gates connect on
		// publish, so the entries sat dormant on agent.integrations; passing
		// previous=[] makes every persisted integration an addition.
		const credentialIntegrations = agent.integrations ?? [];
		if (credentialIntegrations.length > 0 && options.syncIntegrations !== false) {
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

		// Register any enabled tasks now that the agent is published and can run.
		// Routed through requestReconcile so the leader owns the cron even when a
		// follower handled this publish request (multi-main).
		// eslint-disable-next-line import-x/no-cycle
		const { AgentTaskService } = await import('./agent-task.service');
		await Container.get(AgentTaskService)
			.requestReconcile(agentId)
			.catch((error) =>
				this.logger.warn('Failed to register agent tasks on publish', { agentId, error }),
			);

		this.logger.debug('Published SDK agent', { agentId, projectId, userId: user.id });

		return agent;
	}

	async unpublishAgent(agentId: string, projectId: string): Promise<Agent> {
		const agent = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!agent) {
			throw new NotFoundError(`Agent "${agentId}" not found`);
		}

		await this.agentRepository.manager.transaction(async (trx) => {
			agent.activeVersionId = null;
			agent.activeVersion = null;
			// Bump versionId so the next publish gets a fresh PK. The just-
			// unpublished snapshot still occupies its versionId in agent_history,
			// and re-publishing the same id would collide with that row.
			agent.versionId = uuid();

			await trx.save(agent);
		});

		this.clearRuntimes(agentId);

		// Drop any live chat-integration connections so webhook endpoints stop
		// accepting events immediately — before the 30-minute TTL would have expired.
		// Lazy import avoids the circular DI dependency (ChatIntegrationService → AgentsService).
		// eslint-disable-next-line import-x/no-cycle
		const { ChatIntegrationService } = await import('./integrations/chat-integration.service');
		await Container.get(ChatIntegrationService).disconnect(agentId);

		// eslint-disable-next-line import-x/no-cycle
		const { AgentTaskService } = await import('./agent-task.service');
		await Container.get(AgentTaskService)
			.requestReconcile(agentId)
			.catch((error) =>
				this.logger.warn('Failed to stop agent tasks on unpublish', { agentId, error }),
			);

		this.logger.debug('Unpublished SDK agent', { agentId, projectId });
		return agent;
	}

	async revertToPublishedAgent(agentId: string, projectId: string): Promise<Agent> {
		const agent = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!agent) {
			throw new NotFoundError(`Agent "${agentId}" not found`);
		}

		const activeVersion = agent.activeVersion;
		if (!activeVersion) {
			throw new ConflictError(`Agent "${agentId}" is not published`);
		}

		await this.agentRepository.manager.transaction(async (trx) => {
			agent.schema = activeVersion.schema ? deepCopy(activeVersion.schema) : null;
			agent.tools = deepCopy(activeVersion.tools ?? {});
			agent.skills = deepCopy(activeVersion.skills ?? {});
			agent.versionId = activeVersion.versionId;

			if (agent.schema) {
				agent.name = agent.schema.name;
				agent.description = agent.schema.description ?? null;
			}

			await trx.save(agent);
			await this.restoreTasksFromSnapshot(trx, agentId, activeVersion.versionId);
		});

		this.clearRuntimes(agentId);

		// No task reconcile needed: scheduling follows `activeVersion`, which revert
		// leaves untouched. The restore above only brings the draft task definition
		// rows back in line with the published snapshot so the UI matches.

		this.logger.debug('Reverted SDK agent to published version', { agentId, projectId });
		return agent;
	}

	async revertToVersion(agentId: string, projectId: string, versionId: string): Promise<Agent> {
		const agent = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!agent) {
			throw new NotFoundError(`Agent "${agentId}" not found`);
		}

		await this.agentRepository.manager.transaction(async (trx) => {
			const target = await this.agentHistoryRepository.findByVersionAndAgentId(
				versionId,
				agentId,
				trx,
			);
			if (!target) {
				throw new NotFoundError(`Version "${versionId}" not found`);
			}

			agent.schema = target.schema ? deepCopy(target.schema) : null;
			agent.tools = deepCopy(target.tools ?? {});
			agent.skills = deepCopy(target.skills ?? {});
			// Fresh UUID so a follow-up publish writes a new history row.
			// Re-using target.versionId would collide on the snapshot insert
			// (target already owns that PK), and leaving the previous
			// versionId in place could equal activeVersionId — that hits the
			// idempotent fast-path in publishAgent and silently discards the
			// revert.
			agent.versionId = uuid();

			if (agent.schema) {
				agent.name = agent.schema.name;
				agent.description = agent.schema.description ?? null;
			}

			await trx.save(agent);
		});

		this.clearRuntimes(agentId);

		this.logger.debug('Reverted SDK agent to a specific version', {
			agentId,
			projectId,
			versionId,
		});
		return agent;
	}

	/**
	 * Cheap existence check used by the editor to gate the version-history
	 * panel button. Survives unpublish, unlike `agent.activeVersionId`.
	 */
	async hasPublishHistory(agentId: string): Promise<boolean> {
		return await this.agentHistoryRepository.existsForAgent(agentId);
	}

	async listPublishHistory(
		agentId: string,
		projectId: string,
		take: number,
		skip: number,
	): Promise<AgentVersionListItemDto[]> {
		const agent = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!agent) {
			throw new NotFoundError(`Agent "${agentId}" not found`);
		}

		const versions = await this.agentHistoryRepository.findByAgentId(agentId, take, skip);

		return versions.map((v) => ({
			versionId: v.versionId,
			agentId: v.agentId,
			createdAt: v.createdAt.toISOString(),
			updatedAt: v.updatedAt.toISOString(),
			author: v.author,
			isActive: v.versionId === agent.activeVersionId,
		}));
	}

	async delete(agentId: string, projectId: string): Promise<boolean> {
		const agent = await this.agentRepository.findByIdAndProjectId(agentId, projectId);

		if (!agent) {
			return false;
		}

		// Best-effort, non-transactional cleanup: deleteAllFilesForAgent removes
		// binary blobs from the filesystem/object store, which a DB transaction
		// can't roll back. The agent_files rows are removed via the agentId FK's
		// ON DELETE CASCADE when the agent is removed below, so a failure here
		// only risks orphaned blobs (logged) and must not block agent deletion.
		try {
			await this.agentKnowledgeService.deleteAllFilesForAgent(agentId);
		} catch (error) {
			this.logger.warn('Failed to delete knowledge files on agent delete', {
				agentId,
				error: error instanceof Error ? error.message : error,
			});
		}
		await this.agentRepository.remove(agent);

		this.clearRuntimes(agentId);

		try {
			// eslint-disable-next-line import-x/no-cycle
			const { AgentTaskService } = await import('./agent-task.service');
			await Container.get(AgentTaskService).requestReconcile(agentId);
		} catch (error) {
			this.logger.warn('Failed to stop tasks on agent delete', {
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

	/**
	 * Return user-visible conversation history for a persisted chat thread.
	 *
	 * Execution records are the source of truth for the UI transcript. SDK
	 * memory is runtime context for the agent: it can be disabled, windowed, or
	 * shaped for model input rather than for user-facing history.
	 */
	async getConversationHistory(params: {
		threadId: string;
		projectId: string;
		agentId: string;
	}): Promise<AgentPersistedMessageDto[] | null> {
		const { threadId, projectId, agentId } = params;
		const detail = await this.agentExecutionService.getThreadDetail(threadId, projectId, agentId);
		if (!detail) return null;
		return executionsToMessagesDto(detail.executions);
	}

	private getMemoryFactory(agentId: string): MemoryFactory {
		return (_params: AgentJsonMemoryConfig) => this.n8nMemory.getImplementation(agentId);
	}

	/** Create a credential provider scoped to a project. */
	private createCredentialProvider(projectId: string): AgentsCredentialProvider {
		return new AgentsCredentialProvider(Container.get(CredentialsService), projectId);
	}

	/**
	 * Return a cached runtime, or reconstruct one from the DB.
	 */
	private async getRuntime(params: GetRuntimeParams): Promise<{
		agent: RuntimeAgent;
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
			const activeVersionSchema = agentEntity.activeVersion?.schema;
			if (!activeVersionSchema) {
				throw new NotFoundError(`Agent ${agentId} is not published`);
			}
			agentData = {
				...agentEntity,
				schema: activeVersionSchema,
				tools: agentEntity.activeVersion?.tools ?? agentEntity.tools ?? {},
				skills: agentEntity.activeVersion?.skills ?? agentEntity.skills ?? {},
			} as Agent;

			// Resolve n8n user from publishedById when not provided by the caller.
			n8nUserId ??= agentEntity.activeVersion?.publishedById ?? undefined;
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
	 * (opt-in, defaults to false) — see {@link shouldAttachNodeTools}.
	 */
	private async injectRuntimeDependencies(params: InjectRuntimeDependenciesParams): Promise<void> {
		const {
			agent,
			agentId,
			projectId,
			credentialProvider,
			nodeToolsEnabled,
			credentialIntegrations,
			integrationType,
		} = params;

		// Inject get_environment unconditionally. It surfaces info the model
		// can't know on its own (current date, instance timezone, day of week)
		// via a tool call rather than the system prompt — so values that change
		// per request don't bust system-prompt prompt caching.
		agent.tool(createGetEnvironmentTool());

		// search_knowledge is gated behind the `knowledge-base` agents module.
		// It's also an optional capability: if wiring it up fails (e.g. dynamic
		// import or service construction error), degrade gracefully and keep the
		// rest of the runtime usable rather than failing the whole agent. The
		// failure is logged so it stays observable.
		if (this.isKnowledgeBaseModuleEnabled()) {
			try {
				const { createSearchKnowledgeTool } = await import('./tools/knowledge/tool');
				agent.tool(
					createSearchKnowledgeTool({
						agentId,
						projectId,
						knowledgeService: this.agentKnowledgeService,
						commandService: this.agentKnowledgeCommandService,
					}),
				);
			} catch (toolError) {
				this.logger.warn('Failed to inject search_knowledge tool', {
					agentId,
					error: toolError instanceof Error ? toolError.message : String(toolError),
				});
			}
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
		const integrationRegistry = Container.get(ChatIntegrationRegistry);
		const integration = integrationType ? integrationRegistry.get(integrationType) : undefined;
		if (integration?.supportedComponents !== undefined) {
			agent.tool(createRichInteractionTool(integrationType));
		}

		if (credentialIntegrations.length > 0) {
			const messageContextStore = Container.get(IntegrationMessageContextService);
			const actionExecutor = Container.get(ChatIntegrationActionExecutor);
			const queryExecutor = Container.get(ChatIntegrationContextQueryExecutor);

			for (const descriptor of getIntegrationToolConnectionDescriptors(
				credentialIntegrations,
				agentId,
				(integrationConfig) => {
					const integrationDef = integrationRegistry.get(integrationConfig.type);
					return {
						contextQueries: integrationDef?.contextQueries,
						actions: integrationDef?.actions,
					};
				},
			)) {
				agent.tool(
					createIntegrationContextTool({ descriptor, messageContextStore, queryExecutor }),
				);
				agent.tool(
					createIntegrationActionTool({ descriptor, messageContextStore, actionExecutor }),
				);
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
		agent: RuntimeAgent,
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
			executionCounter: this.createAgentExecutionCounter({ agentId }),
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
	 *   - "episodicMemory.credential": configured Episodic Memory credential
	 *                     does not resolve to a real credential in the project
	 *   - "memory.*.*Model.credential": configured memory worker model
	 *                     credential does not resolve or does not match the model provider
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
			return { missing: ['instructions', 'model', 'credential'] };
		}

		if (!config.instructions?.trim()) {
			missing.push('instructions');
		}

		if (!config.model?.trim() || !AgentModelSchema.safeParse(config.model).success) {
			missing.push('model');
		}

		let credentialList: Awaited<ReturnType<CredentialProvider['list']>> | undefined;
		const findCredential = async (credentialId: string) => {
			credentialList ??= await credentialProvider.list();
			return credentialList.find((credential) => credential.id === credentialId);
		};
		const credentialExists = async (credentialId: string) => {
			return (await findCredential(credentialId)) !== undefined;
		};

		if (!config.credential?.trim()) {
			missing.push('credential');
		} else {
			try {
				const credentialId = config.credential.trim();
				if (!(await credentialExists(credentialId))) missing.push('credential');
			} catch {
				// If listing fails (e.g. permissions), don't flag as misconfigured —
				// the runtime will surface the real error path on execute.
			}
		}

		const episodicMemory = config.memory?.episodicMemory;
		if (config.memory?.enabled) {
			try {
				await this.validateMemoryWorkerModel(
					config.memory.observationalMemory?.observerModel,
					'memory.observationalMemory.observerModel',
					findCredential,
					missing,
				);
				await this.validateMemoryWorkerModel(
					config.memory.observationalMemory?.reflectorModel,
					'memory.observationalMemory.reflectorModel',
					findCredential,
					missing,
				);
				if (episodicMemory?.enabled === true) {
					if (!(await credentialExists(episodicMemory.credential.trim()))) {
						missing.push('episodicMemory.credential');
					}
					await this.validateMemoryWorkerModel(
						episodicMemory.extractorModel,
						'memory.episodicMemory.extractorModel',
						findCredential,
						missing,
					);
					await this.validateMemoryWorkerModel(
						episodicMemory.reflectorModel,
						'memory.episodicMemory.reflectorModel',
						findCredential,
						missing,
					);
				}
			} catch {
				// Same behavior as the main model credential: runtime reconstruction
				// surfaces permission/listing failures with the concrete error.
			}
		}

		const webSearch = config.config?.webSearch;
		if (
			webSearch?.enabled &&
			(webSearch.provider === 'brave' || webSearch.provider === 'searxng')
		) {
			const webSearchCredentialId = webSearch.credential?.trim();
			if (!webSearchCredentialId) {
				missing.push('webSearch.credential');
			} else {
				try {
					if (!(await credentialExists(webSearchCredentialId))) {
						missing.push('webSearch.credential');
					}
				} catch {
					// Keep the same behavior as other credential checks: runtime execution
					// surfaces list/permission failures with the concrete error.
				}
			}
		}

		missing.push(
			...this.agentSkillsService
				.getMissingSkillIds(config, agentEntity.skills ?? {})
				.map((skillId) => `skill:${skillId}`),
		);

		return { missing };
	}

	private async validateMemoryWorkerModel(
		modelConfig: { model?: string | null; credential?: string | null } | string | null | undefined,
		path: string,
		findCredential: (
			credentialId: string,
		) => Promise<Awaited<ReturnType<CredentialProvider['list']>>[number] | undefined>,
		missing: string[],
	) {
		if (modelConfig === undefined || modelConfig === null) return;

		if (typeof modelConfig === 'string') {
			missing.push(`${path}.credential`);
			return;
		}

		if (!modelConfig.model?.trim() || !AgentModelSchema.safeParse(modelConfig.model).success) {
			missing.push(`${path}.model`);
		}

		const credentialId = modelConfig.credential?.trim();
		if (!credentialId) {
			missing.push(`${path}.credential`);
			return;
		}

		const credential = await findCredential(credentialId);
		if (
			!credential ||
			!this.workerCredentialSupportsModel(credential.type, modelConfig.model ?? '')
		) {
			missing.push(`${path}.credential`);
		}
	}

	private workerCredentialSupportsModel(credentialType: string, model: string) {
		return LLM_PROVIDER_DEFAULTS[credentialType]?.provider === getProviderPrefix(model);
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
			userId,
			message,
			memory,
			projectId: runtime.projectId,
		});
	}

	/**
	 * Return persisted test-chat messages for an agent scoped to the current
	 * user. Test-chat threads are keyed by agent and user so memory stays isolated.
	 */
	async getTestChatMessages(agentId: string, userId: string) {
		return await this.n8nMemory
			.getImplementation(agentId)
			.getMessages(chatThreadId(agentId, userId), {
				resourceId: draftChatMemoryResourceId(userId),
			});
	}

	/**
	 * Clear the current user's test-chat messages for an agent.
	 */
	async clearTestChatMessages(agentId: string, userId: string) {
		await this.n8nMemory.getImplementation(agentId).deleteThread(chatThreadId(agentId, userId));
	}

	/** Delete all test-chat messages + the thread row — used when the agent itself is deleted. */
	async clearAllTestChatMessages(agentId: string) {
		const threadId = chatThreadId(agentId);
		const memory = this.n8nMemory.getImplementation(agentId);
		await memory.deleteThreadsByPrefix(threadId);
		await memory.deleteMessagesByThread(threadId);
		await memory.deleteThread(threadId);
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
	 * Execute a published agent for a scheduled task, stamping `source='task'`
	 * and the originating `taskId` on the recorded session for traceability.
	 */
	async *executeForTaskPublished(
		config: ExecuteForTaskPublishedConfig,
	): AsyncGenerator<StreamChunk> {
		const { agentId, projectId, message, memory, taskId, taskVersionId } = config;

		const runtime = await this.getRuntime({
			agentId,
			projectId,
			integrationType: 'task',
			usePublishedVersion: true,
		});

		yield* this.streamChatResponse({
			agentInstance: runtime.agent,
			toolRegistry: runtime.toolRegistry,
			agentId,
			message,
			memory,
			projectId: runtime.projectId,
			source: 'task',
			taskId,
			taskVersionId,
		});
	}

	/**
	 * Execute a task on demand against the current (draft) config as the
	 * requesting user. Unlike `executeForTaskPublished` this does not require a
	 * published version, so it works while the agent is still being built. The
	 * run is stamped with `source='task'` + `taskId` for session traceability.
	 */
	async *executeForTaskNow(config: ExecuteForTaskNowConfig): AsyncGenerator<StreamChunk> {
		const { agentId, projectId, userId, message, memory, taskId } = config;

		const runtime = await this.getRuntime({ agentId, projectId, n8nUserId: userId });

		yield* this.streamChatResponse({
			agentInstance: runtime.agent,
			toolRegistry: runtime.toolRegistry,
			agentId,
			userId,
			message,
			memory,
			projectId: runtime.projectId,
			source: 'task',
			taskId,
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
		const {
			agentInstance,
			toolRegistry,
			agentId,
			userId,
			message,
			memory,
			projectId,
			source,
			taskId,
			taskVersionId,
		} = config;
		const { threadId, resourceId } = memory;

		const recorder = new ExecutionRecorder(toolRegistry);

		const resultStream = await agentInstance.stream(message, {
			persistence: { threadId, resourceId },
			executionCounter: this.createAgentExecutionCounter({ agentId, userId }),
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
				if (value.type === 'finish' && value.finishReason === 'max-iterations') {
					for (const chunk of getMaxIterationsChunks()) {
						yield chunk;
					}
				}
				yield value;
			}
		} finally {
			reader.releaseLock();
		}

		// Always record — even if suspended, the pre-suspension response text
		// and tool calls are valuable. Usage/model will be null for suspended runs.
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
				taskId,
				taskVersionId,
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

	async executeForWorkflow(
		agentId: string,
		message: string,
		executionId: string,
		threadId: string,
		userId: string,
		projectId: string,
		telemetryUserId?: string,
	): Promise<ExecuteAgentData> {
		const agentEntity = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!agentEntity) {
			throw new OperationalError('Agent not found or not accessible.');
		}

		if (!agentEntity.activeVersionId) {
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
			executionCounter: this.createAgentExecutionCounter({ agentId, userId: telemetryUserId }),
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

		if (isNodeToolsEnabled(config.config) && !this.isNodeToolsModuleEnabled()) {
			return {
				valid: false,
				error:
					'config.nodeTools.enabled requires the node-tools-searcher agents module to be enabled.',
			};
		}

		const mcpServers = config.mcpServers ?? [];
		for (const server of mcpServers) {
			if (server.authentication !== 'none' && !server.credential) {
				return {
					valid: false,
					error: `MCP server "${server.name}" requires a credential when authentication is not "none".`,
				};
			}
		}

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
	 * Persist a new AgentJsonConfig (full replace).
	 */
	async updateConfig(
		agentId: string,
		projectId: string,
		config: unknown,
	): Promise<{ config: AgentJsonConfig; updatedAt: string; versionId: string | null }> {
		const entity = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!entity) throw new NotFoundError('Agent not found');

		const result = await this.validateConfig(config);
		if (!result.valid) {
			throw new UserError(`Invalid agent config: ${result.error}`);
		}

		this.validateConfigRefs(result.config, entity);

		// Task refs resolve against task definition bodies (a separate table), so
		// validate them here where the DB is reachable. Orphan bodies are pruned
		// after the save below. `tasksProvided` also gates the schema overlay.
		const tasksProvided = result.config.tasks !== undefined;
		const existingTaskIds = tasksProvided
			? (await this.agentTaskRepository.findByAgentId(agentId)).map((task) => task.id)
			: [];
		if (tasksProvided) {
			const existingTaskIdSet = new Set(existingTaskIds);
			for (const ref of result.config.tasks ?? []) {
				if (!existingTaskIdSet.has(ref.id)) {
					throw new UserError(`Invalid agent config: Missing task body: ${ref.id}`);
				}
			}
		}

		// All optional fields on `AgentJsonConfigSchema` are treated as
		// "preserve when omitted, replace when provided." A missing key on the
		// inbound config means "the client isn't touching this", not "clear
		// it" — without this distinction, a partial save (e.g. just
		// `instructions`) would silently wipe integrations / tools / skills /
		// memory and tear down anything wired to them. Required fields
		// (`name`, `model`, `instructions`) are always present; Zod rejects
		// payloads missing them, so we always overwrite.
		//
		// Zod's `.optional()` outputs `undefined` when a key is absent, which
		// also matches "key sent as undefined" — both should preserve the
		// stored value, so the `!== undefined` check is the right signal.
		const previousIntegrations = entity.integrations ?? [];
		const previousSchema = entity.schema ?? null;

		const integrationsProvided = result.config.integrations !== undefined;
		const toolsProvided = result.config.tools !== undefined;
		const skillsProvided = result.config.skills !== undefined;
		const descriptionProvided = result.config.description !== undefined;
		const credentialProvided = result.config.credential !== undefined;
		const memoryProvided = result.config.memory !== undefined;
		const providerToolsProvided = result.config.providerTools !== undefined;
		const configBlockProvided = result.config.config !== undefined;
		const mcpServersProvided = result.config.mcpServers !== undefined;

		const { schemaConfig: decomposedSchema, integrations: decomposedIntegrations } =
			decomposeJsonConfig(result.config);

		const nextIntegrations = integrationsProvided ? decomposedIntegrations : previousIntegrations;

		// Overlay provided fields on the previous schema so omitted optionals
		// keep their persisted value. Required fields (always present) are
		// taken from the inbound directly.
		const nextSchema: AgentJsonConfig = {
			...(previousSchema ?? ({} as AgentJsonConfig)),
			name: decomposedSchema.name,
			model: decomposedSchema.model,
			instructions: decomposedSchema.instructions,
			...(descriptionProvided ? { description: decomposedSchema.description } : {}),
			...(credentialProvided ? { credential: decomposedSchema.credential } : {}),
			...(memoryProvided ? { memory: decomposedSchema.memory } : {}),
			...(toolsProvided ? { tools: decomposedSchema.tools } : {}),
			...(skillsProvided ? { skills: decomposedSchema.skills } : {}),
			...(tasksProvided ? { tasks: decomposedSchema.tasks } : {}),
			...(providerToolsProvided ? { providerTools: decomposedSchema.providerTools } : {}),
			...(configBlockProvided ? { config: decomposedSchema.config } : {}),
			...(mcpServersProvided ? { mcpServers: decomposedSchema.mcpServers } : {}),
		};

		entity.schema = nextSchema;
		entity.name = result.config.name;
		if (descriptionProvided) entity.description = result.config.description ?? null;
		entity.integrations = nextIntegrations;
		markAgentDraftDirty(entity);

		// Tool body pruning is gated on the client actually rewriting the
		// tools refs — otherwise a partial save would orphan every persisted
		// custom tool body because the empty `tools ?? []` makes them all
		// look unreferenced.
		if (toolsProvided) {
			const referencedIds = new Set(
				(result.config.tools ?? [])
					.filter((t): t is Extract<AgentJsonToolConfig, { type: 'custom' }> => t.type === 'custom')
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
		}

		// Same gating applies to skill bodies.
		if (skillsProvided) {
			this.agentSkillsService.removeUnreferencedSkills(entity, result.config);
		}

		// Invalidate runtime caches
		this.clearRuntimes(agentId);

		const saved = await this.agentRepository.save(entity);
		this.logger.debug('Updated agent JSON config', { agentId, projectId });

		// Prune task bodies whose ref the client removed. Done after the save so a
		// failure leaves an orphan row (harmless) rather than a dangling ref.
		if (tasksProvided) {
			const referencedTaskIds = new Set((result.config.tasks ?? []).map((ref) => ref.id));
			const orphanTaskIds = existingTaskIds.filter((id) => !referencedTaskIds.has(id));
			if (orphanTaskIds.length > 0) {
				await this.agentTaskRepository.delete(orphanTaskIds);
			}
		}

		// Skip integration reconciliation entirely when the client didn't send
		// an `integrations` field — `previousIntegrations` and `nextIntegrations`
		// are identical references, so even with the guard above, taking the
		// diff would be wasted work and risks accidental disconnects if any
		// future code path mutates the array in-place.
		if (integrationsProvided) {
			await syncAgentIntegrations(saved, previousIntegrations, nextIntegrations, this.logger);
		}

		return {
			config: composeJsonConfig(saved) ?? result.config,
			updatedAt: saved.updatedAt.toISOString(),
			versionId: saved.versionId,
		};
	}

	/**
	 * Persist a credential integration on the agent after validation.
	 * Replaces an existing entry with the same type+credentialId or appends a new one.
	 */
	async saveCredentialIntegration(
		agent: Agent,
		integration: AgentIntegrationConfig,
		options: SaveCredentialIntegrationOptions = {},
	): Promise<Agent> {
		const parseResult = AgentIntegrationSchema.safeParse(integration);
		if (!parseResult.success) {
			throw new UserError(`Invalid credential integration: ${parseResult.error.message}`);
		}
		const validated = parseResult.data;
		const { type, credentialId } = validated;

		const existing = agent.integrations ?? [];
		const alreadyExists = existing.some((i) => i.type === type && i.credentialId === credentialId);

		agent.integrations = alreadyExists
			? existing.map((existingIntegration) =>
					existingIntegration.type === type && existingIntegration.credentialId === credentialId
						? validated
						: existingIntegration,
				)
			: [...existing, validated];

		markAgentDraftDirty(agent);
		this.clearRuntimes(agent.id);
		const result = await this.agentRepository.save(agent);
		if (options.broadcast !== false) {
			await this.chatIntegrationService.broadcastIntegrationChange(
				agent.id,
				integration,
				'connect',
			);
		}
		return result;
	}

	/**
	 * Remove a credential integration from the agent.
	 */
	async removeCredentialIntegration(
		agent: Agent,
		type: string,
		credentialId: string,
	): Promise<Agent> {
		if (!agent.integrations?.length) return agent;
		const integration = agent.integrations.find(
			(i) => i.type === type && i.credentialId === credentialId,
		);
		if (!integration) return agent;
		// filter by ref
		agent.integrations = agent.integrations.filter((i) => i !== integration);

		markAgentDraftDirty(agent);
		this.clearRuntimes(agent.id);
		const result = await this.agentRepository.save(agent);
		await this.chatIntegrationService.broadcastIntegrationChange(
			agent.id,
			integration,
			'disconnect',
		);
		return result;
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
				(t: AgentJsonToolConfig) => !(t.type === 'custom' && 'id' in t && t.id === toolId),
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
	}

	private getMissingCustomToolIds(
		config: AgentJsonConfig | null,
		tools: AgentToolEntries,
	): string[] {
		const refs = (config?.tools ?? []).filter(
			(ref): ref is Extract<AgentJsonToolConfig, { type: 'custom' }> => ref.type === 'custom',
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
	 * Freeze the referenced task bodies (enabled/name/objective/cron) into
	 * published snapshot rows so scheduled runs read publish-time content, not
	 * live draft edits. Bodies are read through the publish transaction for
	 * consistency; throws if a referenced task has no body.
	 */
	private async snapshotConfiguredTasks(
		trx: EntityManager,
		versionId: string,
		agentId: string,
		config: AgentJsonConfig | null,
	): Promise<void> {
		if (!config) return;
		const refs = config.tasks ?? [];
		if (refs.length === 0) return;

		const bodies = await trx.getRepository(AgentTask).findBy({ agentId });
		const byId = new Map(bodies.map((body) => [body.id, body]));
		const missing = refs.filter((ref) => !byId.has(ref.id)).map((ref) => ref.id);
		if (missing.length > 0) {
			throw new UserError(`Cannot publish agent with missing task bodies: ${missing.join(', ')}`);
		}

		await this.agentTaskSnapshotRepository.saveForVersion(
			refs.map((ref) => {
				const body = byId.get(ref.id);
				if (!body) {
					throw new UserError(`Cannot publish agent with missing task body: ${ref.id}`);
				}
				return {
					versionId,
					taskId: ref.id,
					enabled: ref.enabled,
					name: body.name,
					objective: body.objective,
					cronExpression: body.cronExpression,
				};
			}),
			trx,
		);
	}

	/**
	 * Bring the draft task definition rows back in line with a published snapshot
	 * on revert: drop rows added since publish, restore name/objective/cron on
	 * rows that still exist, and re-insert any that were deleted in the draft.
	 * Runs inside the revert transaction.
	 */
	private async restoreTasksFromSnapshot(
		trx: EntityManager,
		agentId: string,
		versionId: string,
	): Promise<void> {
		const repo = trx.getRepository(AgentTask);
		const existing = await repo.findBy({ agentId });
		const snapshots = await this.agentTaskSnapshotRepository.findByVersionId(versionId, trx);
		const snapshotIds = new Set(snapshots.map((snapshot) => snapshot.taskId));

		const orphanIds = existing.filter((row) => !snapshotIds.has(row.id)).map((row) => row.id);
		if (orphanIds.length > 0) await repo.delete(orphanIds);

		const existingIds = new Set(existing.map((row) => row.id));
		for (const snapshot of snapshots) {
			if (existingIds.has(snapshot.taskId)) {
				await repo.update(snapshot.taskId, {
					name: snapshot.name,
					objective: snapshot.objective,
					cronExpression: snapshot.cronExpression,
				});
			} else {
				await repo.insert({
					id: snapshot.taskId,
					agentId,
					name: snapshot.name,
					objective: snapshot.objective,
					cronExpression: snapshot.cronExpression,
				});
			}
		}
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
	): Promise<{ agent: RuntimeAgent; toolRegistry: ToolRegistry }> {
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

		const buildMcpClient = async (server: AgentJsonMcpServerConfig) =>
			await buildMcpClientForServer(server, {
				credentialProvider,
				oauthService: this.oauthService,
				projectId: agentEntity.projectId,
			});

		const reconstructed = await buildFromJson(config, toolDescriptors, {
			toolExecutor,
			credentialProvider,
			resolveTool: async (ref) => {
				const resolved = await toolResolver(ref);
				if (resolved) resolvedTools.push(resolved);
				return resolved;
			},
			skills: agentEntity.skills ?? {},
			memoryFactory: this.getMemoryFactory(agentEntity.id),
			buildMcpClient,
		});

		await this.injectRuntimeDependencies({
			agent: reconstructed,
			agentId: agentEntity.id,
			projectId: agentEntity.projectId,
			credentialProvider,
			nodeToolsEnabled: this.shouldAttachNodeTools(config.config),
			credentialIntegrations: agentEntity.integrations ?? [],
			integrationType,
		});

		const toolRegistry = buildToolRegistry(resolvedTools);
		return { agent: reconstructed, toolRegistry };
	}
}

function getProviderPrefix(modelId: string): string {
	const slashIdx = modelId.indexOf('/');
	return slashIdx === -1 ? '' : modelId.slice(0, slashIdx);
}
