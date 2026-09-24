import {
	createWriteTodosTool,
	type Agent as RuntimeAgent,
	type CreateDelegateSubAgentToolOptions,
	BuiltTool,
	CredentialProvider,
	ModelConfig,
} from '@n8n/agents';
import { getProviderPrefix } from '@n8n/ai-utilities/agent-config';
import {
	N8N_CHAT_ACTION_TOOL_NAME,
	N8N_CHAT_CONTEXT_TOOL_NAME,
	N8N_CHAT_INTEGRATION_TYPE,
	SUB_AGENT_MAX_CHILDREN_DEFAULT,
	SUB_AGENT_TASK_DIFFICULTIES,
	buildProxyHeaders,
	isCredentialAgentIntegration,
	type AgentIntegrationConfig,
	type AgentJsonConfig,
	type AgentJsonMcpServerConfig,
	type AgentJsonMemoryConfig,
	type AgentJsonToolConfig,
	type SubAgentRunPolicy,
	type SubAgentSource,
	type SubAgentTaskDifficulty,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { OutboundHttp } from '@n8n/backend-network';
import { AgentsConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { WorkflowRepository } from '@n8n/db';
import { Container, Service } from '@n8n/di';
import { UserError } from 'n8n-workflow';
import { nanoid } from 'nanoid';

import { ActiveExecutions } from '@/active-executions';
import { N8N_VERSION } from '@/constants';
import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { SubworkflowPolicyChecker } from '@/executions/pre-execution-checks';
import type { AgentRunTelemetryType } from '@/interfaces';
import { EphemeralNodeExecutor } from '@/node-execution';
import { OauthService } from '@/oauth/oauth.service';
import { McpRegistryService } from '@/modules/mcp-registry/registry/mcp-registry.service';
import { userHasScopes } from '@/permissions.ee/check-access';
import { AiService } from '@/services/ai.service';
import { ProxyTokenManager } from '@/services/proxy-token-manager';
import { createAiMcpFetch, createAiProxyFetch, createWebSearchFetch } from '@/utils/ai-proxy-fetch';
import { WorkflowRunner } from '@/workflow-runner';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { AgentChatAttachmentService } from './agent-chat-attachment.service';
import { AgentKnowledgeMirrorService } from './agent-knowledge-mirror.service';
import type { AgentSandboxPrincipalHash } from './agent-sandbox-principal';
import {
	AgentSandboxRuntimeService,
	sanitizeSandboxErrorDetail,
	type AgentSandboxRuntime,
} from './agent-sandbox-runtime.service';
import { AgentWorkspaceService } from './agent-workspace.service';
import type { AgentRuntimeInstrumentation } from './agent-runtime-instrumentation';
import { Agent } from './entities/agent.entity';
import { ChatIntegrationRegistry } from './integrations/agent-chat-integration';
import {
	createIntegrationActionTool,
	createIntegrationContextTool,
	getIntegrationToolConnectionDescriptors,
	type IntegrationToolConnectionDescriptor,
} from './integrations/integration-tools';
import { N8NCheckpointStorage } from './integrations/n8n-checkpoint-storage';
import { N8nMemory } from './integrations/n8n-memory';
import {
	buildFromJson,
	buildProviderToolsForModel,
	type MemoryFactory,
	type ManagedEmbeddingProviderOptions,
	type ToolResolver,
} from './json-config/from-json-config';
import { buildMcpClientForServer } from './json-config/mcp-client-factory';
import { resolveCredentialAwareModelConfig } from './json-config/model-config';
import { AgentFileRepository } from './repositories/agent-file.repository';
import { AgentRepository } from './repositories/agent.repository';
import { AgentSecureRuntime } from './runtime/agent-secure-runtime';
import { createN8nDelegateSubAgentTool } from './sub-agents/delegate-sub-agent-tool';
import { SubAgentRunner } from './sub-agents/sub-agent-runner';
import { buildToolRegistry, type ReferencedToolKind, type ToolRegistry } from './tool-registry';
import { createGetEnvironmentTool } from './tools/environment-tool';
import type { WorkflowToolExecutionMode } from './tools/workflow-tool-factory';
import { WorkflowToolUnavailableError } from './tools/workflow-tool-unavailable-error';
import { findWorkflowToolWorkflow } from './tools/workflow-tool-workflow-resolver';
import { WorkflowToolWorkflowLoader } from './tools/workflow-tool-workflow-loader.service';
import { getAgentRuntimeAssets, type AgentRuntimeAssets } from './utils/agent-runtime-assets';
import { resolveUniqueSubAgents } from './utils/sub-agent-resolver';
/**
 * `inline` runs an agent defined in a workflow node's parameters: no entity
 * row exists, so anything keyed on a real agent id (checkpoints, knowledge
 * files) and top-level extras (integrations, delegation) must stay off.
 */
export type AgentRuntimeProfile = 'top-level' | 'sub-agent' | 'inline';

export interface ReconstructedAgentRuntime {
	agent: RuntimeAgent;
	toolRegistry: ToolRegistry;
	/** Maps MCP server names to attribution for replies that use their tools. */
	mcpServerAttributions: Map<string, string>;
}

export interface SubAgentDelegationConfig {
	sourcesById: Record<string, SubAgentSource>;
	availableSubAgents: NonNullable<CreateDelegateSubAgentToolOptions['availableSubAgents']>;
}

export interface ReconstructAgentRuntimeParams extends AgentRuntimeAssets {
	config: AgentJsonConfig;
	memoryOwnerAgentId: string;
	projectId: string;
	credentialProvider: CredentialProvider;
	runtimeProfile: AgentRuntimeProfile;
	/**
	 * Telemetry classification of the run this runtime serves. Baked in at build
	 * time because it is a property of the runtime itself — a draft runtime is
	 * always a test run, a published one always production — and the runtime
	 * cache keys on exactly that split. Delegated children inherit it and
	 * resolve their referenced entities to match: test runs use current drafts,
	 * production runs use published versions (sub-agents and workflow tools).
	 */
	runType: AgentRunTelemetryType;
	/**
	 * Execution classification for workflow tools. It stays separate from runType
	 * because production-classified agents can run inside a workflow execution.
	 */
	workflowToolExecutionMode?: WorkflowToolExecutionMode;
	/** Delegating parent agent id for sub-agent runs; defaults to memoryOwnerAgentId for top-level. */
	parentAgentIdForDelegation?: string;
	/** Top-level chat/integration runtimes only. */
	integrationType?: string;
	/** Top-level chat/integration runtimes only. */
	credentialIntegrations?: AgentIntegrationConfig[];
	/**
	 * The interactive n8n user of the delegating parent run, when there is one.
	 * When present, node/workflow tool refs are filtered by this user's access
	 * (same rules as reconstructFromAgentEntity). Absent for published/
	 * integration parents, which keep the project-scoped trust boundary.
	 */
	user?: User;
	attributionUserId?: string;
	/** Runtime seams inherited from the delegating parent run (see {@link AgentRuntimeInstrumentation}). */
	instrumentation?: AgentRuntimeInstrumentation;
	sandboxPrincipalHash?: AgentSandboxPrincipalHash;
	/**
	 * Parent run's live workspace sandbox handle for delegated sub-agent runs.
	 * The child scopes into `<workspaceRoot>/subagents/<delegationThreadId>`
	 * instead of acquiring its own sandbox.
	 */
	parentWorkspace?: { handle: AgentSandboxRuntime; delegationThreadId: string };
}

interface RuntimeReconstructionOptions extends ReconstructAgentRuntimeParams {
	/**
	 * Whether the caller can resume a suspended tool. False for workflow-driven
	 * runs, where HITL tools report status instead of parking forever.
	 */
	supportsHitl?: boolean;
	credentialIntegrations: AgentIntegrationConfig[];
	subAgentDelegation: SubAgentDelegationConfig;
	allowBackgroundTasks?: boolean;
	/** Tools the access filter already dropped; reported together with build-time stubs. */
	unavailableTools?: UnavailableTool[];
	/** Set by the in-app preview chat only — see `BuildFromJsonOptions.previewChat`. */
	previewChat?: boolean;
}

interface RuntimeDependencies
	extends Omit<
		RuntimeReconstructionOptions,
		| keyof AgentRuntimeAssets
		| 'memoryOwnerAgentId'
		| 'supportsHitl'
		| 'allowBackgroundTasks'
		| 'unavailableTools'
		| 'previewChat'
	> {
	agent: RuntimeAgent;
	agentId: string;
	workflowToolExecutionMode: WorkflowToolExecutionMode;
	parentAgentIdForDelegation: string;
	backgroundTasksEnabled: boolean;
}

interface ToolRunIdentity {
	projectId: string;
	workflowToolExecutionMode: WorkflowToolExecutionMode;
	usePublishedWorkflowVersion: boolean;
	agentId?: string;
	integrationType?: string;
	userId?: string;
	previewChat?: boolean;
	publishedN8nChat?: boolean;
	supportsHitl: boolean;
	backgroundTasksEnabled: boolean;
}

async function getChatIntegrationToolServices() {
	const { IntegrationMessageContextService } = await import(
		'./integrations/integration-message-context.service.js'
	);
	// eslint-disable-next-line import-x/no-cycle
	const { ChatIntegrationActionExecutor } = await import(
		'./integrations/integration-action-executor.js'
	);
	const { ChatIntegrationContextQueryExecutor } = await import(
		'./integrations/integration-context-query-executor.js'
	);

	return {
		messageContextStore: Container.get(IntegrationMessageContextService),
		actionExecutor: Container.get(ChatIntegrationActionExecutor),
		queryExecutor: Container.get(ChatIntegrationContextQueryExecutor),
	};
}

async function getWorkflowRunner(): Promise<WorkflowRunner> {
	const { WorkflowRunner } = await import('@/workflow-runner.js');
	return Container.get(WorkflowRunner);
}

/**
 * The access grants `filterToolsForUser` verified when it built a runtime's
 * tool list. Its presence implies at least one node/workflow tool was kept,
 * which always requires `workflow:execute` on the project. Cached runtimes
 * re-check these grants periodically so access revoked after the build stops
 * being honored (see `AgentRuntimeCacheService`).
 */
export interface UserToolAccessSnapshot {
	/** Credential ids that passed a `credential:read` check. */
	credentialIds: string[];
	/** Workflow ids that passed a `workflow:execute` check. */
	workflowIds: string[];
}

/**
 * A configured node/workflow tool the runtime cannot use, and why. `no_access`
 * tools are dropped; the rest stay as stubs that report the reason when called.
 */
export interface UnavailableTool {
	toolName: string;
	toolType: ReferencedToolKind;
	reason: 'not_found' | 'not_published' | 'incompatible' | 'no_access';
	message: string;
}

function toolRefName(ref: AgentJsonToolConfig): string {
	if (ref.type === 'custom') return ref.id;
	return ref.type === 'workflow' ? (ref.name ?? ref.workflow) : ref.name;
}

@Service()
export class AgentRuntimeReconstructionService {
	constructor(
		private readonly logger: Logger,
		private readonly agentRepository: AgentRepository,
		private readonly agentFileRepository: AgentFileRepository,
		private readonly activeExecutions: ActiveExecutions,
		private readonly workflowRepository: WorkflowRepository,
		private readonly n8nCheckpointStorage: N8NCheckpointStorage,
		private readonly secureRuntime: AgentSecureRuntime,
		private readonly ephemeralNodeExecutor: EphemeralNodeExecutor,
		private readonly n8nMemory: N8nMemory,
		private readonly oauthService: OauthService,
		private readonly mcpRegistryService: McpRegistryService,
		private readonly agentSandboxRuntimeService: AgentSandboxRuntimeService,
		private readonly aiService: AiService,
		private readonly outboundHttp: OutboundHttp,
		private readonly agentWorkspaceService: AgentWorkspaceService,
		private readonly agentKnowledgeMirrorService: AgentKnowledgeMirrorService,
		private readonly credentialsFinderService: CredentialsFinderService,
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly agentChatAttachmentService: AgentChatAttachmentService,
	) {}

	async reconstructFromAgentEntity(
		agentEntity: Agent,
		credentialProvider: CredentialProvider,
		runType: AgentRunTelemetryType,
		integrationType?: string,
		user?: User,
		instrumentation?: AgentRuntimeInstrumentation,
		workflowToolExecutionMode: WorkflowToolExecutionMode = 'manual',
		sandboxPrincipalHash?: AgentSandboxPrincipalHash,
		{
			supportsHitl,
			previewChat,
			allowBackgroundTasks = true,
			attributionUserId,
		}: {
			/** Pass false when the caller cannot resume a suspended run (workflow executions). */
			supportsHitl?: boolean;
			/** Set by the in-app preview chat only — see `BuildFromJsonOptions.previewChat`. */
			previewChat?: boolean;
			/** Disable background jobs for task-triggered runtimes. */
			allowBackgroundTasks?: boolean;
			attributionUserId?: string;
		} = {},
	): Promise<ReconstructedAgentRuntime & { userToolAccessSnapshot?: UserToolAccessSnapshot }> {
		let config = agentEntity.schema;
		if (!config) {
			throw new UserError('Agent has no JSON config.');
		}

		// Published/integration runs have no interactive n8n user and keep
		// today's project-scoped trust boundary. When a user is present (in-app
		// chat, resume, task-now), drop node/workflow tools the user can't
		// execute or lacks credential/workflow access to before the runtime is
		// built, so denied tools never reach the LLM or the executor.
		let userToolAccessSnapshot: UserToolAccessSnapshot | undefined;
		let unavailableTools: UnavailableTool[] = [];
		if (user && config.tools?.length) {
			const filtered = await this.filterToolsForUser(config.tools, agentEntity.projectId, user);
			config = { ...config, tools: filtered.tools };
			userToolAccessSnapshot = filtered.snapshot;
			unavailableTools = filtered.unavailable;
		}

		const { toolDescriptors, toolCodeByName } = getAgentRuntimeAssets(agentEntity);
		const subAgentDelegation = await this.createSubAgentDelegationConfig(
			config,
			agentEntity.projectId,
		);

		const runtime = await this.reconstructRuntime({
			config,
			memoryOwnerAgentId: agentEntity.id,
			projectId: agentEntity.projectId,
			credentialProvider,
			toolDescriptors,
			toolCodeByName,
			skills: agentEntity.skills ?? {},
			runtimeProfile: 'top-level',
			supportsHitl,
			runType,
			workflowToolExecutionMode,
			parentAgentIdForDelegation: agentEntity.id,
			integrationType,
			credentialIntegrations: agentEntity.integrations ?? [],
			subAgentDelegation,
			user,
			attributionUserId,
			instrumentation,
			sandboxPrincipalHash,
			unavailableTools,
			allowBackgroundTasks,
			previewChat,
		});
		return {
			...runtime,
			...(userToolAccessSnapshot !== undefined ? { userToolAccessSnapshot } : {}),
		};
	}

	/**
	 * Drop node/workflow tool refs the calling user can't run: `workflow:execute`
	 * gates both kinds, and node tools additionally need `credential:read` on
	 * every credential baked into the ref. Filtering the config copy (rather
	 * than the resolved tools) means a denied ref never reaches
	 * `makeToolResolver`/`resolveToolRef`, so no inert marker tool is exposed to
	 * the LLM. Custom tools are untouched — they run n8n-authored code, not a
	 * caller-chosen node/workflow with baked credentials. Every dropped ref is
	 * reported in `unavailable` so the build can log and track it.
	 */
	private async filterToolsForUser(
		tools: AgentJsonToolConfig[],
		projectId: string,
		user: User,
	): Promise<{
		tools: AgentJsonToolConfig[];
		snapshot?: UserToolAccessSnapshot;
		unavailable: UnavailableTool[];
	}> {
		const canExecute = await userHasScopes(user, ['workflow:execute'], false, { projectId });
		const filtered: AgentJsonToolConfig[] = [];
		const unavailable: UnavailableTool[] = [];
		const grantedCredentialIds = new Set<string>();
		const grantedWorkflowIds = new Set<string>();
		let keptGatedTool = false;

		for (const ref of tools) {
			if (ref.type === 'custom') {
				filtered.push(ref);
				continue;
			}
			const access = await this.checkToolAccess(ref, projectId, user, canExecute);
			if (access && 'reason' in access) {
				unavailable.push(access);
				continue;
			}
			filtered.push(ref);
			if (!access) continue;
			keptGatedTool = true;
			for (const id of access.credentialIds) grantedCredentialIds.add(id);
			for (const id of access.workflowIds) grantedWorkflowIds.add(id);
		}

		return {
			tools: filtered,
			unavailable,
			...(keptGatedTool
				? {
						snapshot: {
							credentialIds: [...grantedCredentialIds],
							workflowIds: [...grantedWorkflowIds],
						},
					}
				: {}),
		};
	}

	private async checkToolAccess(
		ref: Exclude<AgentJsonToolConfig, { type: 'custom' }>,
		projectId: string,
		user: User,
		canExecute: boolean,
	): Promise<UserToolAccessSnapshot | UnavailableTool | undefined> {
		const denied = (message: string): UnavailableTool => ({
			toolName: toolRefName(ref),
			toolType: ref.type,
			reason: 'no_access',
			message,
		});
		if (!canExecute) return denied('The user lacks workflow:execute on the project');

		if (ref.type === 'node') {
			const credentialIds = Object.values(ref.node.credentials ?? {})
				.map((credential) => credential.id)
				.filter((id): id is string => Boolean(id));
			const credentials = await Promise.all(
				credentialIds.map(
					async (id) =>
						await this.credentialsFinderService.findCredentialForUser(id, user, [
							'credential:read',
						]),
				),
			);
			if (credentials.some((credential) => credential === null)) {
				return denied('The user cannot read a credential the tool uses');
			}
			return { credentialIds, workflowIds: [] };
		}

		const workflow = await findWorkflowToolWorkflow(this.workflowRepository, ref, projectId);
		// Missing workflows stay in the list so the tool factory can return a stub.
		if (!workflow) return undefined;
		const accessibleWorkflow = await this.workflowFinderService.findWorkflowForUser(
			workflow.id,
			user,
			['workflow:execute'],
		);
		if (!accessibleWorkflow) {
			return denied(`The user cannot execute workflow "${workflow.name}"`);
		}
		return { credentialIds: [], workflowIds: [workflow.id] };
	}

	/**
	 * Re-run the access checks recorded in `snapshot` against current DB state.
	 * Returns false when any grant no longer holds — a runtime built from that
	 * snapshot is over-privileged and must be rebuilt so its tool list is
	 * re-filtered.
	 */
	async userStillHasToolAccess(
		snapshot: UserToolAccessSnapshot,
		projectId: string,
		user: User,
	): Promise<boolean> {
		if (!(await userHasScopes(user, ['workflow:execute'], false, { projectId }))) return false;

		const credentials = await Promise.all(
			snapshot.credentialIds.map(
				async (id) =>
					await this.credentialsFinderService.findCredentialForUser(id, user, ['credential:read']),
			),
		);
		if (credentials.some((credential) => credential === null)) return false;

		const workflows = await Promise.all(
			snapshot.workflowIds.map(
				async (id) =>
					await this.workflowFinderService.findWorkflowForUser(id, user, ['workflow:execute']),
			),
		);
		return workflows.every((workflow) => Boolean(workflow));
	}

	/**
	 * Build a sub-agent's runtime for a `delegate_subagent` call.
	 *
	 * When `params.user` is present (the delegating parent had an interactive
	 * n8n user), node/workflow tool refs are filtered by that user's access —
	 * same rules as `reconstructFromAgentEntity`. Absent for published/
	 * integration parents, which keep the project-scoped trust boundary. The
	 * sub-agent also inherits the parent's `credentialProvider` (user-scoped
	 * when the parent had a user), so raw credential access stays gated there
	 * regardless.
	 */
	async reconstructFromResolvedSource(
		params: ReconstructAgentRuntimeParams,
	): Promise<ReconstructedAgentRuntime> {
		let config = params.config;
		let unavailableTools: UnavailableTool[] = [];
		if (params.user && config.tools?.length) {
			// Sub-agent runtimes are built per delegation and never cached, so the
			// grant snapshot is not needed here.
			const filtered = await this.filterToolsForUser(config.tools, params.projectId, params.user);
			config = { ...config, tools: filtered.tools };
			unavailableTools = filtered.unavailable;
		}

		const subAgentDelegation = await this.createSubAgentDelegationConfig(config, params.projectId);

		return await this.reconstructRuntime({
			...params,
			config,
			credentialIntegrations: [],
			subAgentDelegation,
			unavailableTools,
		});
	}

	private async reconstructRuntime(
		options: RuntimeReconstructionOptions,
	): Promise<ReconstructedAgentRuntime> {
		const unavailable = [...(options.unavailableTools ?? [])];
		const backgroundTasksEnabled =
			options.runtimeProfile === 'top-level' &&
			(options.allowBackgroundTasks ?? true) &&
			Container.get(AgentsConfig).backgroundTasksEnabled;
		const runtime = await this.buildConfiguredRuntime(options, backgroundTasksEnabled, unavailable);
		if (unavailable.length > 0) {
			this.logger.warn('Agent runtime built with unavailable tools', {
				agentId: options.memoryOwnerAgentId,
				runType: options.runType,
				tools: unavailable,
			});
		}
		await this.injectRuntimeDependencies({
			...options,
			agent: runtime.agent,
			agentId: options.memoryOwnerAgentId,
			workflowToolExecutionMode: options.workflowToolExecutionMode ?? 'manual',
			parentAgentIdForDelegation: options.parentAgentIdForDelegation ?? options.memoryOwnerAgentId,
			backgroundTasksEnabled,
		});
		return {
			agent: runtime.agent,
			toolRegistry: buildToolRegistry(runtime.resolvedTools),
			mcpServerAttributions: runtime.mcpServerAttributions,
		};
	}

	private async buildConfiguredRuntime(
		options: RuntimeReconstructionOptions,
		backgroundTasksEnabled: boolean,
		unavailable: UnavailableTool[],
	) {
		const {
			config,
			memoryOwnerAgentId,
			projectId,
			credentialProvider,
			toolDescriptors,
			toolCodeByName,
			skills,
			instrumentation,
			previewChat,
		} = options;
		const toolExecutor = this.secureRuntime.createToolExecutor(toolCodeByName);
		const toolResolver = this.createRuntimeToolResolver(
			options,
			backgroundTasksEnabled,
			unavailable,
		);
		const resolvedTools: BuiltTool[] = [];
		const mcpServerAttributions = new Map<string, string>();
		const aiProxyFetch = createAiProxyFetch(this.outboundHttp);
		const aiMcpFetch = instrumentation?.mcpFetch ?? createAiMcpFetch(this.outboundHttp);
		const webSearchFetch = createWebSearchFetch(this.outboundHttp);
		const buildMcpClient = this.makeMcpClientFactory(options, aiMcpFetch, mcpServerAttributions);
		const reconstructed = await buildFromJson(config, toolDescriptors, {
			toolExecutor,
			credentialProvider,
			resolveTool: async (ref) => {
				const resolved = await toolResolver(ref);
				if (resolved) resolvedTools.push(resolved);
				return resolved;
			},
			skills,
			memoryFactory: this.getMemoryFactory(memoryOwnerAgentId),
			buildMcpClient,
			resolveManagedEmbeddingProviderOptions: async () =>
				await this.resolveManagedEmbeddingProviderOptions(projectId),
			modelFetch: instrumentation?.modelFetch ?? aiProxyFetch,
			fallbackWebSearch: instrumentation?.webSearch,
			// Only the mock MCP transport makes attaching auth-pending servers safe.
			attachAuthPendingMcpServers: instrumentation?.mcpFetch !== undefined,
			webSearchFetch,
			previewChat,
		});
		return { agent: reconstructed, resolvedTools, mcpServerAttributions };
	}

	private createRuntimeToolResolver(
		options: RuntimeReconstructionOptions,
		backgroundTasksEnabled: boolean,
		unavailable: UnavailableTool[],
	): ToolResolver {
		const {
			projectId,
			workflowToolExecutionMode = 'manual',
			runType,
			memoryOwnerAgentId,
			integrationType,
			user,
			attributionUserId,
			previewChat,
			supportsHitl,
			runtimeProfile,
			instrumentation,
		} = options;
		const canResume = supportsHitl ?? runtimeProfile === 'top-level';
		return this.makeToolResolver(
			{
				projectId,
				workflowToolExecutionMode,
				// Production runs execute published workflow versions, test runs the drafts.
				usePublishedWorkflowVersion: runType === 'production',
				agentId: memoryOwnerAgentId,
				integrationType,
				userId: attributionUserId ?? user?.id,
				previewChat,
				publishedN8nChat:
					runType === 'production' &&
					integrationType === N8N_CHAT_INTEGRATION_TYPE &&
					attributionUserId !== undefined,
				// Sub-agent checkpoints are rejected on resume and inline agents have no
				// checkpoint storage, so neither can be woken again.
				supportsHitl: canResume,
				// Only an interactive top-level agent backgrounds waiting workflows: a
				// child's job would nest under its own thread, where no check/cancel
				// tools exist; a top-level agent invoked as a workflow step
				// (supportsHitl false) or by a task (allowBackgroundTasks false) has no
				// interactive turn to hand a receipt to. Everyone else handles waits
				// the legacy way.
				backgroundTasksEnabled: backgroundTasksEnabled && canResume,
			},
			instrumentation,
			unavailable,
		);
	}

	private makeMcpClientFactory(
		options: RuntimeReconstructionOptions,
		aiMcpFetch: ReturnType<typeof createAiMcpFetch>,
		mcpServerAttributions: Map<string, string>,
	) {
		const { credentialProvider, projectId, memoryOwnerAgentId, instrumentation } = options;
		return async (server: AgentJsonMcpServerConfig) =>
			await buildMcpClientForServer(server, {
				credentialProvider,
				oauthService: this.oauthService,
				projectId,
				proxyFetch: aiMcpFetch,
				resolveRegistryConnection: async (nodeTypeName) => {
					const connection = await this.mcpRegistryService.getConnection(nodeTypeName);
					if (connection?.attribution) {
						mcpServerAttributions.set(server.name, connection.attribution);
					}
					return connection;
				},
				onConnectionFailed: (event) => {
					this.logger.warn('Skipped MCP server that failed to connect', {
						agentId: memoryOwnerAgentId,
						serverName: event.server,
						error: event.error,
					});
				},
				...(instrumentation?.onMcpToolCallSettled !== undefined && {
					onToolCallSettled: async (event) =>
						await instrumentation.onMcpToolCallSettled?.({
							serverName: server.name,
							...event,
						}),
				}),
			});
	}

	async createSubAgentDelegationConfig(
		config: AgentJsonConfig,
		projectId: string,
	): Promise<SubAgentDelegationConfig> {
		const configuredAgents = config.subAgents?.agents ?? [];
		const sourcesById: Record<string, SubAgentSource> = {};
		const availableSubAgents: SubAgentDelegationConfig['availableSubAgents'] = [];

		for (const { agentId, agent, useWhen } of await resolveUniqueSubAgents({
			refs: configuredAgents,
			projectId,
			agentRepository: this.agentRepository,
		})) {
			if (!agent) continue;

			// No versionId pin here: the delegate closure lives inside the
			// cached parent runtime, so pinning would freeze the child at
			// whatever version existed when the parent was last built. Leaving it
			// out means SubAgentSourceResolver re-resolves the child on every
			// delegation — its current draft for test runs, its published
			// version for production runs.
			sourcesById[agentId] = { agentId };
			availableSubAgents.push({
				id: agentId,
				name: agent.name,
				...(useWhen ? { useWhen } : {}),
			});
		}

		return { sourcesById, availableSubAgents };
	}

	private getMemoryFactory(agentId: string): MemoryFactory {
		return (_params: AgentJsonMemoryConfig) => this.n8nMemory.getImplementation(agentId);
	}

	/**
	 * `ownerId` is the proxy token subject — the proxy treats it as an opaque scope and
	 * does not verify it against n8n users. Agent runtimes pass their project id; a user
	 * id works equally if a caller ever has one.
	 */
	private async resolveManagedEmbeddingProviderOptions(
		ownerId: string,
	): Promise<ManagedEmbeddingProviderOptions | null> {
		if (!this.aiService.isProxyEnabled()) return null;
		// TODO: switch to n8n connect endpoints, don't use ai-proxy endpoints
		const client = await this.aiService.getClient();
		const baseURL = client.getApiProxyBaseUrl().replace(/\/$/, '') + '/openai/';
		const tokenManager = new ProxyTokenManager(async () => {
			return await client.getBuilderApiProxyToken({ id: ownerId }, { userMessageId: nanoid() });
		});
		const proxyManagedFetch = createAiProxyFetch(this.outboundHttp);

		return {
			baseURL,
			apiKey: 'proxy-managed',
			fetch: async (
				input: Parameters<typeof globalThis.fetch>[0],
				init?: Parameters<typeof globalThis.fetch>[1],
			) => {
				const headers = new Headers(init?.headers);
				const auth = await tokenManager.getAuthHeaders();
				for (const [key, value] of Object.entries(auth)) {
					headers.set(key, value);
				}
				for (const [key, value] of Object.entries(
					buildProxyHeaders({ feature: 'agent-builder', n8nVersion: N8N_VERSION }),
				)) {
					headers.set(key, value);
				}
				return await proxyManagedFetch(input, { ...init, headers });
			},
		};
	}
	private makeToolResolver(
		runIdentity: ToolRunIdentity,
		instrumentation: AgentRuntimeInstrumentation | undefined,
		unavailable: UnavailableTool[],
	): ToolResolver {
		const instrumentToolAdditionalData = instrumentation?.configureToolAdditionalData;
		return async (ref) => {
			if (ref.type === 'workflow') {
				return await this.resolveWorkflowTool(
					ref,
					runIdentity,
					instrumentToolAdditionalData,
					unavailable,
				);
			}
			if (ref.type === 'node') {
				const { resolveNodeTool } = await import('./tools/node-tool-factory.js');
				return await resolveNodeTool(ref, {
					executor: this.ephemeralNodeExecutor,
					projectId: runIdentity.projectId,
					instrumentToolAdditionalData,
				});
			}
			return null;
		};
	}

	private async resolveWorkflowTool(
		ref: Extract<AgentJsonToolConfig, { type: 'workflow' }>,
		runIdentity: ToolRunIdentity,
		instrumentToolAdditionalData: AgentRuntimeInstrumentation['configureToolAdditionalData'],
		unavailable: UnavailableTool[],
	) {
		const {
			projectId,
			workflowToolExecutionMode,
			usePublishedWorkflowVersion,
			agentId,
			integrationType,
			userId,
			supportsHitl,
			backgroundTasksEnabled,
		} = runIdentity;
		const { resolveWorkflowTool, buildUnavailableWorkflowTool } = await import(
			'./tools/workflow-tool-factory.js'
		);
		const context = {
			workflowLoader: Container.get(WorkflowToolWorkflowLoader),
			workflowRunner: await getWorkflowRunner(),
			subworkflowPolicyChecker: Container.get(SubworkflowPolicyChecker),
			activeExecutions: this.activeExecutions,
			projectId,
			executionMode: workflowToolExecutionMode,
			usePublishedWorkflowVersion,
			instrumentToolAdditionalData,
			agentId,
			integrationType,
			userId,
			supportsHitl,
			backgroundTasksEnabled,
		};
		try {
			return await resolveWorkflowTool(ref, context);
		} catch (error) {
			// A missing or incompatible workflow costs the agent one tool call, not
			// the whole run: the stub keeps the tool listed and reports the reason.
			if (!(error instanceof WorkflowToolUnavailableError)) throw error;
			unavailable.push({
				toolName: toolRefName(ref),
				toolType: 'workflow',
				reason: error.reason,
				message: error.message,
			});
			return buildUnavailableWorkflowTool(ref, context);
		}
	}

	private async injectRuntimeDependencies(params: RuntimeDependencies): Promise<void> {
		const { agent, agentId, projectId, runtimeProfile, config } = params;
		agent.tool(createGetEnvironmentTool());
		const parentWorkspaceHandle = await this.attachWorkspaceAndKnowledge(params);
		if (runtimeProfile === 'top-level') {
			await this.attachIntegrationTools(params);
			await this.attachTopLevelTools(params, parentWorkspaceHandle);
		}
		// Inline agents have no entity for checkpoint or attachment rows.
		if (runtimeProfile === 'inline') return;
		if (!agent.hasCheckpointStorage()) {
			agent.checkpoint(this.n8nCheckpointStorage.getStorage(agentId));
		}
		agent.fileStore(
			this.agentChatAttachmentService.getFileStore(
				{ agentId, projectId },
				getProviderPrefix(config.model),
			),
		);
	}

	private async attachWorkspaceAndKnowledge(params: RuntimeDependencies) {
		if (params.runtimeProfile === 'inline' || !this.agentSandboxRuntimeService.isEnabled())
			return undefined;
		const parentWorkspaceHandle = await this.attachWorkspace(params);
		const { agent, agentId, projectId } = params;
		if (await this.agentFileRepository.hasFilesForAgent(agentId)) {
			const { createKnowledgeRetrievalTools } = await import(
				'./tools/knowledge/search-knowledge.tool.js'
			);
			agent.tool(
				createKnowledgeRetrievalTools({
					projectId,
					agentId,
					knowledgeMirrorService: this.agentKnowledgeMirrorService,
				}),
			);
		}
		return parentWorkspaceHandle;
	}

	private async attachWorkspace(
		params: RuntimeDependencies,
	): Promise<AgentSandboxRuntime | undefined> {
		const { agent, agentId, projectId, runtimeProfile, parentWorkspace, sandboxPrincipalHash } =
			params;
		if (runtimeProfile === 'sub-agent') {
			// Delegated runs use the parent's sandbox only.
			if (parentWorkspace) {
				agent.workspace(
					this.agentWorkspaceService.getDelegatedAgentWorkspace(
						parentWorkspace.handle,
						parentWorkspace.delegationThreadId,
					),
				);
			}
			return undefined;
		}
		if (!sandboxPrincipalHash) {
			throw new UserError(
				'Agent workspace scope is missing and the runtime cannot be reconstructed',
			);
		}
		try {
			const { workspace, handle } = await this.agentWorkspaceService.getAgentWorkspace(
				projectId,
				agentId,
				sandboxPrincipalHash,
			);
			agent.workspace(workspace);
			return handle;
		} catch (error) {
			this.logger.warn('Failed to attach agent workspace', {
				projectId,
				agentId,
				error: sanitizeSandboxErrorDetail(error instanceof Error ? error.message : String(error)),
			});
		}
		return undefined;
	}

	private async attachIntegrationTools(params: RuntimeDependencies): Promise<void> {
		const { agent, agentId, integrationType, credentialIntegrations } = params;
		const includeN8nChat = integrationType === N8N_CHAT_INTEGRATION_TYPE;
		if (credentialIntegrations.length === 0 && !includeN8nChat) return;
		const integrationRegistry = Container.get(ChatIntegrationRegistry);
		const { messageContextStore, actionExecutor, queryExecutor } =
			await getChatIntegrationToolServices();

		const descriptors = this.createIntegrationDescriptors(
			agentId,
			credentialIntegrations.filter(isCredentialAgentIntegration),
			integrationRegistry,
		);

		if (includeN8nChat) {
			descriptors.push(this.createN8nChatDescriptor(agentId, integrationRegistry));
		}

		for (const descriptor of descriptors) {
			agent.tool(createIntegrationContextTool({ descriptor, queryExecutor }));
			agent.tool(createIntegrationActionTool({ descriptor, messageContextStore, actionExecutor }));
		}
	}

	private createIntegrationDescriptors(
		agentId: string,
		credentialIntegrations: AgentIntegrationConfig[],
		integrationRegistry: ChatIntegrationRegistry,
	): IntegrationToolConnectionDescriptor[] {
		return getIntegrationToolConnectionDescriptors(
			credentialIntegrations,
			agentId,
			(integrationConfig) => {
				const integrationDef = integrationRegistry.get(integrationConfig.type);
				return {
					contextToolDefinitions: integrationDef?.contextToolDefinitions,
					actionToolDefinitions: integrationDef?.actionToolDefinitions,
					contextQueries: integrationDef?.contextQueries,
					actions: integrationDef?.actions,
					contextToolGuidance: integrationDef?.contextToolGuidance,
					actionToolGuidance: integrationDef?.actionToolGuidance,
				};
			},
		);
	}

	private createN8nChatDescriptor(
		agentId: string,
		integrationRegistry: ChatIntegrationRegistry,
	): IntegrationToolConnectionDescriptor {
		const n8nChat = integrationRegistry.require(N8N_CHAT_INTEGRATION_TYPE);
		const n8nChatIntegration = {
			type: N8N_CHAT_INTEGRATION_TYPE,
		} as unknown as IntegrationToolConnectionDescriptor['integration'];
		return {
			agentId,
			integration: n8nChatIntegration,
			integrationConnectionId: N8N_CHAT_INTEGRATION_TYPE,
			contextToolName: N8N_CHAT_CONTEXT_TOOL_NAME,
			actionToolName: N8N_CHAT_ACTION_TOOL_NAME,
			contextQueries: [...n8nChat.contextQueries],
			actions: [...n8nChat.actions],
			contextToolDefinitions: [...n8nChat.contextToolDefinitions],
			actionToolDefinitions: [...n8nChat.actionToolDefinitions],
			contextToolGuidance: n8nChat.contextToolGuidance,
			actionToolGuidance: n8nChat.actionToolGuidance,
		};
	}

	private async attachTopLevelTools(
		params: RuntimeDependencies,
		parentWorkspaceHandle: AgentSandboxRuntime | undefined,
	): Promise<void> {
		const {
			agent,
			agentId,
			config,
			parentAgentIdForDelegation,
			projectId,
			credentialProvider,
			runType,
			workflowToolExecutionMode,
			subAgentDelegation,
			user,
			instrumentation,
			backgroundTasksEnabled,
		} = params;
		const delegationParams = {
			agent,
			parentAgentId: parentAgentIdForDelegation,
			projectId,
			credentialProvider,
			runType,
			workflowToolExecutionMode,
			delegation: subAgentDelegation,
			user,
			instrumentation,
		};
		await this.attachSubAgentDelegationTool({ ...delegationParams, config, parentWorkspaceHandle });
		this.attachWriteTodosTool(agent, agentId);
		if (!backgroundTasksEnabled) return;
		await this.attachBackgroundJobTools({
			...delegationParams,
			...(parentWorkspaceHandle !== undefined ? { parentWorkspaceHandle } : {}),
		});
		agent.volatileInstructionsProvider(async ({ persistence }) => {
			if (!persistence?.threadId) return undefined;
			const { AgentWakeService } = await import('./background/agent-wake.service.js');
			return await Container.get(AgentWakeService).getBackgroundUpdates(
				persistence.threadId,
				persistence.resourceId,
			);
		});
	}

	private async attachSubAgentDelegationTool(params: {
		agent: RuntimeAgent;
		config: AgentJsonConfig;
		parentAgentId: string;
		projectId: string;
		credentialProvider: CredentialProvider;
		runType: AgentRunTelemetryType;
		workflowToolExecutionMode: WorkflowToolExecutionMode;
		delegation: SubAgentDelegationConfig;
		parentWorkspaceHandle?: AgentSandboxRuntime;
		user?: User;
		instrumentation?: AgentRuntimeInstrumentation;
	}): Promise<void> {
		const {
			agent,
			config,
			parentAgentId,
			projectId,
			credentialProvider,
			runType,
			workflowToolExecutionMode,
			delegation,
			parentWorkspaceHandle,
			user,
			instrumentation,
		} = params;
		const inlineSubAgentModelsByDifficulty = await this.resolveInlineSubAgentModelsByDifficulty(
			config,
			credentialProvider,
		);
		agent.tool(
			createN8nDelegateSubAgentTool({
				runner: Container.get(SubAgentRunner),
				...delegation,
				projectId,
				parentAgentId,
				credentialProvider,
				runType,
				workflowToolExecutionMode,
				...(parentWorkspaceHandle !== undefined ? { parentWorkspaceHandle } : {}),
				user,
				instrumentation,
				policy: this.buildSubAgentPolicy(config),
				...(inlineSubAgentModelsByDifficulty !== undefined
					? { inlineSubAgentModelsByDifficulty }
					: {}),
				resolveInlineSubAgentProviderTools: (modelConfig: ModelConfig) =>
					buildProviderToolsForModel(config, modelConfig),
			}),
		);
		this.logger.debug('Injected delegate_subagent tool', { agentId: parentAgentId });
	}

	private async resolveInlineSubAgentModelsByDifficulty(
		config: AgentJsonConfig,
		credentialProvider: CredentialProvider,
	): Promise<Partial<Record<SubAgentTaskDifficulty, ModelConfig>> | undefined> {
		const mappings = config.subAgents?.modelsByDifficulty;
		if (!mappings) return undefined;

		const resolved: Partial<Record<SubAgentTaskDifficulty, ModelConfig>> = {};
		for (const difficulty of SUB_AGENT_TASK_DIFFICULTIES) {
			const mapping = mappings[difficulty];
			if (!mapping) continue;
			resolved[difficulty] = await resolveCredentialAwareModelConfig(
				mapping.model,
				mapping.credential,
				credentialProvider,
			);
		}

		return Object.keys(resolved).length > 0 ? resolved : undefined;
	}

	private attachWriteTodosTool(agent: RuntimeAgent, agentId: string): void {
		agent.tool(createWriteTodosTool());
		this.logger.debug('Injected write_todos tool', { agentId });
	}

	private async attachBackgroundJobTools(params: {
		agent: RuntimeAgent;
		parentAgentId: string;
		projectId: string;
		credentialProvider: CredentialProvider;
		runType: AgentRunTelemetryType;
		workflowToolExecutionMode: WorkflowToolExecutionMode;
		delegation: SubAgentDelegationConfig;
		user?: User;
		instrumentation?: AgentRuntimeInstrumentation;
		parentWorkspaceHandle?: AgentSandboxRuntime;
	}): Promise<void> {
		const { agent, parentAgentId, projectId, delegation, ...runContext } = params;
		const {
			createSpawnBackgroundSubAgentTool,
			createCheckBackgroundJobsTool,
			createCancelBackgroundJobTool,
		} = await import('./background/background-job-tools.js');
		const { AgentBackgroundJobService } = await import(
			'./background/agent-background-job.service.js'
		);
		const { SubAgentBackgroundRunner } = await import(
			'./background/sub-agent-background-runner.js'
		);
		const jobService = Container.get(AgentBackgroundJobService);

		agent.tool(createCheckBackgroundJobsTool(jobService));
		agent.tool(createCancelBackgroundJobTool(jobService));

		// Attached even with no configured sub-agents: inline self-delegation is
		// always available.
		agent.tool(
			createSpawnBackgroundSubAgentTool({
				jobService,
				backgroundRunner: Container.get(SubAgentBackgroundRunner),
				sourcesById: delegation.sourcesById,
				availableSubAgents: delegation.availableSubAgents,
				projectId,
				parentAgentId,
				runContext,
			}),
		);
		this.logger.debug('Injected background job tools', { agentId: parentAgentId });
	}

	private buildSubAgentPolicy(config: AgentJsonConfig): SubAgentRunPolicy {
		return {
			maxChildren: config.subAgents?.maxChildren ?? SUB_AGENT_MAX_CHILDREN_DEFAULT,
		};
	}
}
