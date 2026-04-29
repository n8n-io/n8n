import type {
	BuiltAgent,
	CredentialProvider,
	GenerateResult,
	StreamChunk,
	ToolDescriptor,
} from '@n8n/agents';
import type { ChatIntegrationDescriptor } from '@n8n/api-types';
import * as agents from '@n8n/agents';
import { AGENT_SCHEDULE_TRIGGER_TYPE, isAgentScheduleIntegration } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Time } from '@n8n/constants';
import {
	ExecutionRepository,
	ProjectRelationRepository,
	UserRepository,
	WorkflowRepository,
} from '@n8n/db';
import { Container, Service } from '@n8n/di';
import { In } from '@n8n/typeorm';
import { extractFromAIInputSchema, OperationalError, UserError } from 'n8n-workflow';
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
import { AgentExecutionService } from './agent-execution.service';
import { AgentsToolsService } from './agents-tools.service';
import { AGENT_THREAD_PREFIX } from './builder/builder-tool-names';
import { Agent } from './entities/agent.entity';
import { ExecutionRecorder } from './execution-recorder';
import { ChatIntegrationRegistry } from './integrations/agent-chat-integration';
import { N8NCheckpointStorage } from './integrations/n8n-checkpoint-storage';
import { N8nMemory } from './integrations/n8n-memory';
import { AgentJsonConfigSchema, isNodeToolsEnabled } from './json-config/agent-json-config';
import type {
	AgentJsonConfig,
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
import { withoutStaticNodeToolDescription } from './tools/node-tool-config-utils';

interface InjectRuntimeDependenciesParams {
	agent: agents.Agent;
	agentId: string;
	projectId: string;
	credentialProvider: CredentialProvider;
	nodeToolsEnabled: boolean;
	/** Chat platform the runtime is being reconstructed for — drives the rich_interaction tool's capability profile. */
	integrationType?: string;
}

/** Derive a stable thread ID for the test-chat of a given agent. */
export function chatThreadId(agentId: string): string {
	return `${AGENT_THREAD_PREFIX.TEST}${agentId}`;
}

export interface ExecuteAgentData {
	response: string;
	structuredOutput: unknown;
	usage: { promptTokens: number; completionTokens: number; totalTokens: number } | null;
	toolCalls: Array<{ toolName: string; input: unknown; result: unknown }>;
	finishReason: string;
}

@Service()
export class AgentsService {
	/**
	 * Cached agent runtimes keyed by `agentId` or `agentId:userId`.
	 * TTL = 30 minutes — entries are evicted when the agent is idle so that
	 * memory is freed without requiring an explicit shutdown step.
	 */
	private readonly runtimes = new TtlMap<
		string,
		{ agent: agents.Agent; agentId: string; userId?: string }
	>(30 * Time.minutes.toMilliseconds);

	/**
	 * Stash of user messages for suspended tool calls.
	 * When executeForChat suspends, we store the original message here so
	 * resumeForChat can record it against the execution.
	 */
	private readonly pendingUserMessages = new Map<string, string>();

	/** Build a cache key that includes the user and integration type so different contexts get isolated runtimes. */
	private runtimeKey(agentId: string, userId?: string, integrationType?: string): string {
		const parts = [agentId];
		if (userId) parts.push(userId);
		if (integrationType) parts.push(integrationType);
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

	/**
	 * Start a new draft if the agent is currently in sync with the published snapshot.
	 * Any mutation that changes how the agent would run must call this so that
	 * `hasUnpublishedChanges` (derived from versionId vs publishedFromVersionId) stays accurate.
	 */
	private markDraftDirty(agent: Agent): void {
		if (
			agent.versionId !== null &&
			agent.versionId === agent.publishedVersion?.publishedFromVersionId
		) {
			agent.versionId = uuid();
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
		this.markDraftDirty(agent);
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
		this.markDraftDirty(agent);
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

	getRuntime(agentId: string): { agent: agents.Agent; agentId: string } | undefined {
		return this.findRuntimeForAgent(agentId);
	}

	hasRuntime(agentId: string): boolean {
		return this.findRuntimeForAgent(agentId) !== undefined;
	}

	/** Find any cached runtime for an agent (regardless of user). */
	private findRuntimeForAgent(
		agentId: string,
	): { agent: agents.Agent; agentId: string; userId?: string } | undefined {
		for (const [key, runtime] of this.runtimes) {
			if (key === agentId || key.startsWith(`${agentId}:`)) {
				return runtime;
			}
		}
		return undefined;
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
		if (integration && integration.supportedComponents !== undefined) {
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
	async *resumeForChat(
		agentId: string,
		runId: string,
		toolCallId: string,
		resumeData: unknown,
		threadId?: string,
		userId?: string,
		projectId?: string,
	): AsyncGenerator<StreamChunk> {
		const runtime = this.findRuntimeForAgent(agentId);
		if (!runtime) {
			throw new UserError(`Agent ${agentId} is not compiled — cannot resume`);
		}

		const agentInstance = runtime.agent;

		const checkpointStatus = await this.n8nCheckpointStorage.getStatus(runId);
		if (checkpointStatus === 'expired') {
			throw new UserError(`Checkpoint ${runId} is expired and cannot be resumed`);
		}

		if (checkpointStatus === 'not-found') {
			throw new UserError(`Checkpoint ${runId} not found and cannot be resumed`);
		}

		const recorder = new ExecutionRecorder();

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
		if (threadId && userId && projectId) {
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
					userId,
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

		if (!config.instructions || !config.instructions.trim()) {
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

		return { missing };
	}

	/**
	 * Execute a compiled SDK agent for a chat integration and yield stream chunks.
	 * Uses userId as the resourceId so each user gets their own memory context.
	 *
	 * When the runtime is not cached (e.g. after server restart), it loads the
	 * agent from DB and reconstructs from the persisted schema — no compile() call.
	 */
	async *executeForChat(
		agentId: string,
		message: string,
		threadId: string,
		userId: string,
		projectId: string,
		credentialProvider: CredentialProvider,
		integrationType?: string,
	): AsyncGenerator<StreamChunk> {
		const key = this.runtimeKey(agentId, userId, integrationType);
		let runtime = this.runtimes.get(key);
		if (!runtime) {
			// Scope the lookup to the project so an agent from a different project
			// cannot be driven by supplying an arbitrary agentId (IDOR).
			const agentEntity = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
			if (!agentEntity) throw new NotFoundError(`Agent ${agentId} not found`);

			const reconstructed = await this.reconstructFromConfig(
				agentEntity,
				credentialProvider,
				userId,
				integrationType,
			);

			// Cache the runtime for subsequent calls
			this.runtimes.set(key, { agent: reconstructed, agentId, userId });
			runtime = this.runtimes.get(key);
			if (!runtime) throw new Error(`Agent ${agentId} failed to reconstruct`);
		}

		yield* this.streamChatResponse(runtime.agent, agentId, message, threadId, userId, projectId, {
			source: integrationType,
			resourceId: userId,
		});
	}

	/**
	 * Return persisted test-chat messages for an agent scoped to the current
	 * user. The test-chat thread is shared across users (keyed on agentId) but
	 * each message is tagged with the originating user's id as resourceId, so
	 * we filter here to give every user their own private conversation view.
	 */
	async getTestChatMessages(agentId: string, userId: string) {
		return await this.n8nMemory.getMessages(chatThreadId(agentId), { resourceId: userId });
	}

	/**
	 * Clear the current user's test-chat messages for an agent. The thread row
	 * stays so other users' histories on the same thread are preserved.
	 */
	async clearTestChatMessages(agentId: string, userId: string) {
		await this.n8nMemory.deleteMessagesByThread(chatThreadId(agentId), userId);
	}

	/** Delete all test-chat messages + the thread row — used when the agent itself is deleted. */
	async clearAllTestChatMessages(agentId: string) {
		const threadId = chatThreadId(agentId);
		await this.n8nMemory.deleteMessagesByThread(threadId);
		await this.n8nMemory.deleteThread(threadId);
	}

	/**
	 * Execute a published agent for a chat integration (Slack, Discord, etc.).
	 *
	 * Mirrors the live-webhooks pattern: load the published snapshot and run that,
	 * never the current draft. Throws NotFoundError if the agent is not published.
	 */
	async *executeForChatPublished(
		agentId: string,
		message: string,
		threadId: string,
		userId: string,
		projectId: string,
		credentialProvider: CredentialProvider,
		integrationType?: string,
	): AsyncGenerator<StreamChunk> {
		const agentEntity = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!agentEntity) throw new NotFoundError(`Agent ${agentId} not found`);

		const publishedSchema = agentEntity.publishedVersion?.schema;
		if (!publishedSchema) {
			throw new NotFoundError(`Agent ${agentId} is not published`);
		}

		// Reconstruct from the published snapshot and cache the runtime so that
		// a follow-up `resumeForChat` (HITL button click) can find it via
		// `findRuntimeForAgent`. Integration traffic only ever runs the published
		// version — drafts stay in their own cache under different keys.
		const key = this.runtimeKey(agentId, userId, integrationType);
		let runtime = this.runtimes.get(key);
		if (!runtime) {
			const publishedAgentData = { ...agentEntity, schema: publishedSchema } as Agent;
			const agentInstance = await this.reconstructFromConfig(
				publishedAgentData,
				credentialProvider,
				userId,
				integrationType,
			);
			this.runtimes.set(key, { agent: agentInstance, agentId, userId });
			runtime = this.runtimes.get(key);
			if (!runtime) throw new Error(`Agent ${agentId} failed to reconstruct`);
		}

		yield* this.streamChatResponse(runtime.agent, agentId, message, threadId, userId, projectId, {
			source: integrationType,
			resourceId: userId,
		});
	}

	/**
	 * Execute a published agent for the local schedule trigger.
	 *
	 * Scheduled runs compile with a project user identity for RBAC/tool access,
	 * but persist against a per-run resourceId so no memory is shared across runs.
	 */
	async *executeForSchedulePublished(
		agentId: string,
		message: string,
		threadId: string,
		userId: string,
		projectId: string,
		credentialProvider: CredentialProvider,
		resourceId: string,
	): AsyncGenerator<StreamChunk> {
		const agentEntity = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!agentEntity) throw new NotFoundError(`Agent ${agentId} not found`);

		const publishedSchema = agentEntity.publishedVersion?.schema;
		if (!publishedSchema) {
			throw new NotFoundError(`Agent ${agentId} is not published`);
		}

		const key = this.runtimeKey(agentId, userId, AGENT_SCHEDULE_TRIGGER_TYPE);
		let runtime = this.runtimes.get(key);
		if (!runtime) {
			const publishedAgentData = { ...agentEntity, schema: publishedSchema } as Agent;
			const agentInstance = await this.reconstructFromConfig(
				publishedAgentData,
				credentialProvider,
				userId,
				AGENT_SCHEDULE_TRIGGER_TYPE,
			);
			this.runtimes.set(key, { agent: agentInstance, agentId, userId });
			runtime = this.runtimes.get(key);
			if (!runtime) throw new Error(`Agent ${agentId} failed to reconstruct`);
		}

		yield* this.streamChatResponse(runtime.agent, agentId, message, threadId, userId, projectId, {
			source: AGENT_SCHEDULE_TRIGGER_TYPE,
			resourceId,
		});
	}

	/**
	 * Read from an agent's streaming response, record it, and yield each chunk.
	 * Logs `tool-call-suspended` chunks so we can observe human-in-the-loop pauses,
	 * and persists the full message record via `AgentExecutionService` so chat
	 * history shows up in the executions view.
	 */
	private async *streamChatResponse(
		agentInstance: agents.Agent,
		agentId: string,
		message: string,
		threadId: string,
		userId: string,
		projectId: string,
		options?: {
			source?: string;
			resourceId?: string;
		},
	): AsyncGenerator<StreamChunk> {
		const recorder = new ExecutionRecorder();
		const resourceId = options?.resourceId ?? userId;

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
				userId,
				userMessage: message,
				record: messageRecord,
				hitlStatus: recorder.suspended ? 'suspended' : undefined,
				source: options?.source,
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
		userId?: string,
	): Promise<{ ok: boolean; agent?: BuiltAgent; error?: string }> {
		if (!agentEntity.schema) {
			return { ok: false, error: 'Agent has no JSON config. Create a config first.' };
		}

		try {
			const reconstructed = await this.reconstructFromConfig(
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
	 * Compiles a fresh isolated agent per call for credential isolation
	 * (does not use or affect the shared runtime cache).
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

		const result = await compiled.agent.generate(message, {
			persistence: {
				resourceId: executionId,
				threadId,
			},
		});

		// Check for errors
		if (result.error) {
			const errorMessage =
				result.error instanceof Error
					? result.error.message
					: typeof result.error === 'string'
						? result.error
						: JSON.stringify(result.error);
			throw new OperationalError(`Agent execution failed: ${errorMessage}`);
		}

		if (result.finishReason === 'error') {
			throw new OperationalError('Agent execution finished with an error.');
		}

		if (result.pendingSuspend && result.pendingSuspend.length > 0) {
			const toolNames = result.pendingSuspend
				.map((s: { toolName: string }) => s.toolName)
				.join(', ');
			throw new OperationalError(
				`Agent execution suspended waiting for tool approval: ${toolNames}. ` +
					'Suspend/resume is not supported in workflow execution context.',
			);
		}

		return {
			response: this.extractTextResponse(result),
			structuredOutput: result.structuredOutput ?? null,
			usage: result.usage
				? {
						promptTokens: result.usage.promptTokens,
						completionTokens: result.usage.completionTokens,
						totalTokens: result.usage.totalTokens,
					}
				: null,
			toolCalls: (result.toolCalls ?? []).map(
				(tc: { tool: string; input: unknown; output: unknown }) => ({
					toolName: tc.tool,
					input: tc.input,
					result: tc.output,
				}),
			),
			finishReason: result.finishReason ?? 'stop',
		};
	}

	/**
	 * Extract the text response from the last assistant message in a GenerateResult.
	 */
	private extractTextResponse(result: GenerateResult): string {
		for (let i = result.messages.length - 1; i >= 0; i--) {
			const msg = result.messages[i];
			if (msg.type !== 'custom' && msg.role === 'assistant' && Array.isArray(msg.content)) {
				const textParts = (msg.content as Array<{ type: string; text?: string }>)
					.filter((c): c is { type: 'text'; text: string } => c.type === 'text')
					.map((c) => c.text);
				if (textParts.length > 0) {
					return textParts.join('');
				}
			}
		}
		return '';
	}

	/**
	 * Get the JSON config for an agent.
	 */
	async getConfig(agentId: string, projectId: string): Promise<AgentJsonConfig> {
		const entity = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!entity) throw new NotFoundError('Agent not found');
		if (!entity.schema) {
			throw new UserError('Agent has no JSON config yet.');
		}
		return entity.schema;
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

		let config = parsed.data;

		try {
			config = this.normalizeNodeToolConfigs(config);
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

	private normalizeNodeToolConfigs(config: AgentJsonConfig): AgentJsonConfig {
		if (!config.tools) return config;

		let changed = false;
		const tools = config.tools.map((tool) => {
			if (tool.type !== 'node') return tool;

			const normalizedTool = withoutStaticNodeToolDescription(tool);
			extractFromAIInputSchema(normalizedTool.node.nodeParameters ?? {});
			if (normalizedTool === tool) return tool;

			changed = true;
			return normalizedTool;
		});

		return changed ? { ...config, tools } : config;
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

		entity.schema = result.config;
		entity.name = result.config.name;
		entity.description = result.config.description ?? null;
		this.markDraftDirty(entity);

		// Remove tool entries that are no longer referenced in the config
		const referencedIds = new Set(
			(result.config.tools ?? [])
				.filter((t): t is { type: 'custom'; id: string } => t.type === 'custom')
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

		// Invalidate runtime caches
		this.clearRuntimes(agentId);

		const saved = await this.agentRepository.save(entity);
		this.logger.debug('Updated agent JSON config', { agentId, projectId });

		return {
			config: result.config,
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
		toolId: string,
		code: string,
		descriptor: ToolDescriptor,
	): Promise<{ ok: boolean; descriptor: ToolDescriptor }> {
		const entity = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!entity) throw new NotFoundError('Agent not found');

		// Store tool code + descriptor. Registering the tool in the agent config
		// (adding `{ type: "custom", id }` to `schema.tools`) is the caller's
		// responsibility — typically via a follow-up patch_config / write_config —
		// so this method does not touch `entity.schema`.
		entity.tools = {
			...entity.tools,
			[toolId]: { code, descriptor },
		};

		this.markDraftDirty(entity);
		this.clearRuntimes(agentId);
		await this.agentRepository.save(entity);

		this.logger.debug('Built custom tool', { agentId, projectId, toolId });

		return { ok: true, descriptor };
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

		this.markDraftDirty(entity);
		this.clearRuntimes(agentId);
		await this.agentRepository.save(entity);

		this.logger.debug('Deleted custom tool', { agentId, projectId, toolId });
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

	/**
	 * Reconstruct an agent from its JSON config using buildFromJson().
	 * This is the new execution path for JSON-config agents.
	 */
	private async reconstructFromConfig(
		agentEntity: Agent,
		credentialProvider: CredentialProvider,
		userId?: string,
		integrationType?: string,
	): Promise<agents.Agent> {
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

		const reconstructed = await buildFromJson(config, toolDescriptors, {
			toolExecutor,
			credentialProvider,
			resolveTool: async (ref) => {
				return await toolResolver(ref);
			},
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

		return reconstructed;
	}
}
