import { getAgentRuntimeDefinitionHash } from './utils/agent-config-hash';
import {
	createWriteTodosTool,
	raceWithAbort,
	throwIfAborted,
	CORE_WORKSPACE_TOOL_NAMES,
	DELEGATE_SUB_AGENT_TOOL_NAME,
	FLAG_MEMORY_TOOL_NAME,
	RECALL_MEMORY_TOOL_NAME,
	WRITE_TODOS_TOOL_NAME,
	type Agent as RuntimeAgent,
	type CreateDelegateSubAgentToolOptions,
	BuiltTool,
	createModel,
	CredentialProvider,
	ModelConfig,
	type Workspace,
} from '@n8n/agents';
import { wrapToolForApproval } from '@n8n/agents/tool';
import { isRecord } from '@n8n/utils/is-record';
import { actionNeedsApproval } from './integrations/integration-tool-definitions';
import { getProviderPrefix } from '@n8n/ai-utilities/agent-config';
import type { LanguageModel } from 'ai';
import {
	AI_GATEWAY_MANAGED_TAG,
	N8N_CHAT_ACTION_TOOL_NAME,
	N8N_CHAT_CONTEXT_TOOL_NAME,
	N8N_CHAT_INTEGRATION_TYPE,
	SUB_AGENT_MAX_CHILDREN_DEFAULT,
	SUB_AGENT_TASK_DIFFICULTIES,
	buildProxyHeaders,
	hasChannelRuntime,
	isCredentialAgentIntegration,
	type AgentApprovalRoute,
	type AgentIntegrationConfig,
	type AgentToolGuardrailConfig,
	type AgentToolGuardrailKind,
	type BudgetGuardrailConfig,
	type AgentJsonConfig,
	type AgentJsonMcpServerConfig,
	type AgentJsonMemoryConfig,
	type AgentJsonToolConfig,
	type AgentSkill,
	type SubAgentRunPolicy,
	type SubAgentSource,
	type SubAgentTaskDifficulty,
} from '@n8n/api-types';
import { getN8nVersion, Logger } from '@n8n/backend-common';
import { OutboundHttp } from '@n8n/backend-network';
import { AgentsConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { WorkflowRepository } from '@n8n/db';
import { Container, Service } from '@n8n/di';
import { UnexpectedError, UserError } from '@n8n/errors';
import { nanoid } from 'nanoid';

import { ActiveExecutions } from '@/active-executions';
import { CredentialsFinderService } from '@n8n/backend-services';
import { sanitizeSandboxErrorDetail } from '@n8n/utils/redaction/sanitize-sandbox-error-detail';
import { CredentialsService } from '@/credentials/credentials.service';
import { SubworkflowPolicyChecker } from '@/executions/pre-execution-checks';
import { EphemeralNodeExecutor } from '@/node-execution';
import { OauthService } from '@/oauth/oauth.service';
import { McpRegistryService } from '@/modules/mcp-registry/registry/mcp-registry.service';
import { userHasScopes } from '@/permissions.ee/check-access';
import { AiService } from '@/services/ai.service';
import { ProxyTokenManager } from '@/services/proxy-token-manager';
import { createAiMcpFetch, createAiProxyFetch, createWebSearchFetch } from '@/utils/ai-proxy-fetch';
import { KnowledgeAvailabilityService } from '@/modules/knowledge/knowledge-availability.service';
import type { KnowledgeConsumerScope } from '@/modules/knowledge/knowledge-consumer-scope';
import { KnowledgeRetrievalService } from '@/modules/knowledge/retrieval/knowledge-retrieval.service';
import { WorkflowsInSkillsFlagGate } from '@/modules/skills';
import type { EmbeddingProviderOptions } from '@/modules/knowledge/vector-stores/embedding-credential';
import { WorkflowRunner } from '@/workflow-runner';
import { CallableWorkflowLoader } from '@/workflows/callable/callable-workflow-loader.service';
import { CallableWorkflowUnavailableError } from '@/workflows/callable/callable-workflow-unavailable.error';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { AgentChatAttachmentService } from './agent-chat-attachment.service';
import type { AgentCredentialProvider } from './agent-credential-provider.contracts';
import { AgentKnowledgeUsageTracker } from './agent-knowledge-usage-tracker';
import type { AgentSandboxPrincipalHash } from './agent-sandbox-principal';
import {
	AgentSandboxRuntimeService,
	type AgentSandboxRuntime,
} from './agent-sandbox-runtime.service';
import type { AgentRunTelemetryType } from './agent-telemetry.types';
import { AgentWorkspaceService } from './agent-workspace.service';
import type { AgentRuntimeInstrumentation } from './evaluation/agent-evaluation.contracts';
import { ChatIntegrationRegistry } from './integrations/agent-chat-integration';
import { buildFileUploadGuidance } from './integrations/integration-tool-descriptions';
import { createConversationTools } from './integrations/conversation-tools';
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
	type ToolResolver,
} from './json-config/from-json-config';
import { toAgentDocument } from './json-config/agent-document';
import { buildMcpClientForServer } from './json-config/mcp-client-factory';
import { resolveCredentialAwareModelConfig } from './json-config/model-config';
import { AgentRepository } from './repositories/agent.repository';
import { AgentSecureRuntime } from './runtime/agent-secure-runtime';
import { createN8nDelegateSubAgentTool } from './sub-agents/delegate-sub-agent-tool';
import { SubAgentRunner } from './sub-agents/sub-agent-runner';
import { buildToolRegistry, type ReferencedToolKind, type ToolRegistry } from './tool-registry';
import { AGENT_PLAN_TOOL_NAMES } from './plans/agent-plan.schema';
import { BACKGROUND_JOBS_TOOL_NAME } from './background/background-job-messages';
import { createGetEnvironmentTool, GET_ENVIRONMENT_TOOL_NAME } from './tools/environment-tool';
import {
	createMarkSessionFailedTool,
	MARK_SESSION_FAILED_TOOL_NAME,
} from './tools/mark-session-failed.tool';
import {
	createReadBinaryDataTool,
	READ_BINARY_DATA_TOOL_NAME,
} from './tools/read-binary-data.tool';
import type { WorkflowToolContext, WorkflowToolExecutionMode } from './tools/workflow-tool-factory';
import {
	findWorkflowToolWorkflow,
	findWorkflowToolWorkflows,
} from './tools/workflow-tool-workflow-resolver';
import type { AgentDecisionWorkflowService } from './approval/agent-decision-workflow.service';
import { withApprovalDescription } from './approval/approval-description';
import type { AgentRunSource } from './utils/agent-published-snapshot';
import { extractAgentWorkflowRefs } from './utils/extract-agent-workflow-refs';
import { getAgentRuntimeAssets, type AgentRuntimeAssets } from './utils/agent-runtime-assets';
import { withSkillWorkflowTools } from './utils/skill-workflow-tools';
import { resolveUniqueSubAgents } from './utils/sub-agent-resolver';
import {
	AgentSandboxFilesService,
	SANDBOX_FILES_INSTRUCTIONS,
} from './agent-sandbox-files.service';
import { createImportFilesTool, IMPORT_FILES_TOOL_NAME } from './tools/import-files.tool';
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
	/** Saved budget config, including a turned-off guardrail. Absent when unset. */
	budget?: BudgetGuardrailConfig;
	/**
	 * The main model credential is the Gateway credits marker: the run debits
	 * the shared wallet, so the budget guardrail also attaches the gateway 402
	 * classifier — a depleted wallet ends the run with `budget.credits`.
	 */
	modelCredentialGatewayManaged?: boolean;
	/** Saved tool guardrail config. Absent when the agent has none. */
	toolGuardrails?: AgentToolGuardrailConfig[];
	/**
	 * A model instance for the jailbreak/nsfw/topicalAlignment
	 * guardrail kinds, resolved from the agent's own model and credential the
	 * same way the run's model is. Absent when no model kind is configured.
	 */
	guardrailModel?: LanguageModel;
	/**
	 * The callable-workflow machinery that `workflow`-kind guardrail checks
	 * run with. Absent when no workflow guardrail is configured.
	 */
	guardrailWorkflowContext?: WorkflowToolContext;
}

export interface SubAgentDelegationConfig {
	sourcesById: Record<string, SubAgentSource>;
	availableSubAgents: NonNullable<CreateDelegateSubAgentToolOptions['availableSubAgents']>;
}

export interface ReconstructAgentRuntimeParams extends AgentRuntimeAssets {
	supportsHitl?: boolean;
	allowBackgroundTasks?: boolean;
	allowPlanTools?: boolean;
	config: AgentJsonConfig;
	memoryOwnerAgentId: string;
	projectId: string;
	credentialProvider: AgentCredentialProvider;
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
	/**
	 * The stored agent's service account (`agents.identityId`). Workflow tools stamp it
	 * for attribution in log events only. Absent for inline agents.
	 */
	agentServiceAccountId?: string;
	/** Runtime seams inherited from the delegating parent run (see {@link AgentRuntimeInstrumentation}). */
	instrumentation?: AgentRuntimeInstrumentation;
	abortSignal?: AbortSignal;
	sandboxPrincipalHash?: AgentSandboxPrincipalHash;
	/**
	 * Parent run's live workspace sandbox handle for delegated sub-agent runs.
	 * The child scopes into `<workspaceRoot>/subagents/<delegationThreadId>`
	 * instead of acquiring its own sandbox.
	 */
	parentWorkspace?: { handle: AgentSandboxRuntime; delegationThreadId: string };
	/**
	 * Root session bucket for a delegated run. Descendants keep this id and cap
	 * instead of the child thread id.
	 */
	rootSessionId?: string;
	rootSessionCapUsd?: number;
	budgetForwarded?: boolean;
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
	allowPlanTools?: boolean;
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
	> {
	agent: RuntimeAgent;
	toolCodeByName: AgentRuntimeAssets['toolCodeByName'];
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
	agentServiceAccountId?: string;
	delegatingAgentId?: string;
	supportsHitl: boolean;
	backgroundTasksEnabled: boolean;
}

/**
 * Harness tools stay eager, so the model sees their schemas without a tool search.
 * The user's own tools (workflow, node, integration, MCP) stay deferred.
 */
function harnessEagerToolNames(params: RuntimeDependencies): string[] {
	return [
		...CORE_WORKSPACE_TOOL_NAMES,
		'load_skill',
		MARK_SESSION_FAILED_TOOL_NAME,
		DELEGATE_SUB_AGENT_TOOL_NAME,
		WRITE_TODOS_TOOL_NAME,
		READ_BINARY_DATA_TOOL_NAME,
		GET_ENVIRONMENT_TOOL_NAME,
		RECALL_MEMORY_TOOL_NAME,
		FLAG_MEMORY_TOOL_NAME,
		...Object.values(AGENT_PLAN_TOOL_NAMES),
		// Only top-level runs with background tasks get these tools.
		...(params.backgroundTasksEnabled ? [BACKGROUND_JOBS_TOOL_NAME] : []),
	];
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
 * The access grants verified when a runtime's tools and draft integrations
 * were filtered for a user. Cached runtimes re-check these grants
 * periodically so access revoked after the build stops being honored (see
 * `AgentRuntimeCacheService`).
 */
export interface UserToolAccessSnapshot {
	/** Credential ids that passed a `credential:read` check. */
	credentialIds: string[];
	/** Workflow ids that passed a `workflow:execute` check. */
	workflowIds: string[];
	/** Draft integration credential ids that passed the agent-usable check. */
	integrationCredentialIds?: string[];
	/**
	 * False when no node/workflow tool was kept. Kept tools always require
	 * `workflow:execute` on the project, integrations do not.
	 */
	requiresWorkflowExecute?: boolean;
}

/** Add the kept draft integration credentials to the snapshot so cached runtimes re-check them. */
function withIntegrationCredentials(
	snapshot: UserToolAccessSnapshot | undefined,
	integrations: AgentIntegrationConfig[],
): UserToolAccessSnapshot | undefined {
	const integrationCredentialIds = integrations
		.filter(isCredentialAgentIntegration)
		.map((integration) => integration.credentialId);
	if (integrationCredentialIds.length === 0) return snapshot;
	return {
		...(snapshot ?? { credentialIds: [], workflowIds: [], requiresWorkflowExecute: false }),
		integrationCredentialIds,
	};
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

/** Ids that workflow tools stamp for log attribution. The run does not act as the account. */
function workflowToolAttribution({
	agentServiceAccountId,
	runtimeProfile,
	parentAgentIdForDelegation,
}: RuntimeReconstructionOptions): Pick<
	ToolRunIdentity,
	'agentServiceAccountId' | 'delegatingAgentId'
> {
	if (!agentServiceAccountId || !Container.get(AgentsConfig).serviceAccountsEnabled) return {};
	return {
		agentServiceAccountId,
		// Only a sub-agent runtime has a delegating agent; delegation is one level deep.
		...(runtimeProfile === 'sub-agent' && parentAgentIdForDelegation
			? { delegatingAgentId: parentAgentIdForDelegation }
			: {}),
	};
}

/** The guardrail kinds whose check runs on an LLM rather than a local pattern. */
const MODEL_BASED_KINDS = new Set<AgentToolGuardrailKind>([
	'jailbreak',
	'nsfw',
	'topicalAlignment',
]);

function isModelBasedKind(guardrail: AgentToolGuardrailConfig): boolean {
	return MODEL_BASED_KINDS.has(guardrail.kind);
}

/** A `workflow`-kind guardrail needs the callable-workflow machinery on the runtime. */
function hasWorkflowGuardrail(config: AgentJsonConfig): boolean {
	return (
		config.config?.guardrails?.tools?.some((guardrail) => guardrail.kind === 'workflow') === true
	);
}

@Service()
export class AgentRuntimeReconstructionService {
	constructor(
		private readonly logger: Logger,
		private readonly agentRepository: AgentRepository,
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
		private readonly knowledgeRetriever: KnowledgeRetrievalService,
		private readonly credentialsFinderService: CredentialsFinderService,
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly agentChatAttachmentService: AgentChatAttachmentService,
		private readonly credentialsService: CredentialsService,
		private readonly knowledgeUsageTracker: AgentKnowledgeUsageTracker,
		private readonly knowledgeAvailabilityService: KnowledgeAvailabilityService,
		private readonly sandboxFiles: AgentSandboxFilesService,
		private readonly workflowsInSkillsFlagGate: WorkflowsInSkillsFlagGate,
	) {}

	async reconstructFromAgentEntity(
		{ agent: agentEntity, skillRefs, skills }: AgentRunSource,
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
			allowPlanTools = true,
			attributionUserId,
			abortSignal,
		}: {
			/** Pass false when the caller cannot resume a suspended run (workflow executions). */
			supportsHitl?: boolean;
			/** Set by the in-app preview chat only — see `BuildFromJsonOptions.previewChat`. */
			previewChat?: boolean;
			/** Disable background jobs for task-triggered runtimes. */
			allowBackgroundTasks?: boolean;
			allowPlanTools?: boolean;
			attributionUserId?: string;
			abortSignal?: AbortSignal;
		} = {},
	): Promise<ReconstructedAgentRuntime & { userToolAccessSnapshot?: UserToolAccessSnapshot }> {
		if (!agentEntity.schema) {
			throw new UserError('Agent has no JSON config.');
		}
		let config = await this.withSkillWorkflowTools(
			toAgentDocument(agentEntity.schema, skillRefs),
			skills,
			agentEntity.projectId,
		);

		// Published/integration runs have no interactive n8n user and keep
		// today's project-scoped trust boundary. When a user is present (in-app
		// chat, resume, task-now), drop node/workflow tools the user can't
		// execute or lacks credential/workflow access to before the runtime is
		// built, so denied tools never reach the LLM or the executor.
		let userToolAccessSnapshot: UserToolAccessSnapshot | undefined;
		let unavailableTools: UnavailableTool[] = [];
		if (user && config.tools?.length) {
			const tools = config.tools;
			const filtered = await raceWithAbort(
				async () => await this.filterToolsForUser(tools, agentEntity.projectId, user),
				abortSignal,
			);
			config = { ...config, tools: filtered.tools };
			userToolAccessSnapshot = filtered.snapshot;
			unavailableTools = filtered.unavailable;
		}

		let credentialIntegrations = agentEntity.integrations ?? [];
		if (user && runType === 'test') {
			const integrations = credentialIntegrations;
			credentialIntegrations = await raceWithAbort(
				async () => await this.filterIntegrationsForUser(integrations, agentEntity.projectId, user),
				abortSignal,
			);
			userToolAccessSnapshot = withIntegrationCredentials(
				userToolAccessSnapshot,
				credentialIntegrations,
			);
		}

		const { toolDescriptors, toolCodeByName } = getAgentRuntimeAssets(agentEntity, skills);
		const subAgentDelegation = await raceWithAbort(
			async () => await this.createSubAgentDelegationConfig(config, agentEntity.projectId),
			abortSignal,
		);

		const runtime = await this.reconstructRuntime({
			config,
			memoryOwnerAgentId: agentEntity.id,
			projectId: agentEntity.projectId,
			credentialProvider,
			toolDescriptors,
			toolCodeByName,
			skills,
			runtimeProfile: 'top-level',
			supportsHitl,
			runType,
			workflowToolExecutionMode,
			parentAgentIdForDelegation: agentEntity.id,
			integrationType,
			credentialIntegrations,
			subAgentDelegation,
			user,
			attributionUserId,
			...(agentEntity.identityId ? { agentServiceAccountId: agentEntity.identityId } : {}),
			instrumentation,
			abortSignal,
			sandboxPrincipalHash,
			unavailableTools,
			allowBackgroundTasks,
			allowPlanTools,
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
		// Load once per pass, and only when a node tool uses credentials.
		let usableIdsLoad: Promise<Set<string>> | undefined;
		const loadUsableIds = async () =>
			await (usableIdsLoad ??= this.loadAgentUsableCredentialIds(projectId, user));
		const filtered: AgentJsonToolConfig[] = [];
		const unavailable: UnavailableTool[] = [];
		const grantedCredentialIds = new Set<string>();
		const grantedWorkflowIds = new Set<string>();
		let keptGatedTool = false;

		for (const ref of tools) {
			if (ref.enabled === false) continue;
			if (ref.type === 'custom') {
				filtered.push(ref);
				continue;
			}
			const access = await this.checkToolAccess(ref, projectId, user, canExecute, loadUsableIds);
			if ('reason' in access) {
				unavailable.push(access);
				continue;
			}
			filtered.push(ref);
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

	/**
	 * Drop draft integrations whose credential the calling user can't use, the
	 * same credential rule `filterToolsForUser` applies to node tools. Published
	 * runs keep the integrations the publisher configured.
	 */
	private async filterIntegrationsForUser(
		integrations: AgentIntegrationConfig[],
		projectId: string,
		user: User,
	): Promise<AgentIntegrationConfig[]> {
		if (!integrations.some(isCredentialAgentIntegration)) return integrations;
		const usableIds = await this.loadAgentUsableCredentialIds(projectId, user);
		return integrations.filter(
			(integration) =>
				!isCredentialAgentIntegration(integration) || usableIds.has(integration.credentialId),
		);
	}

	/** Returns the credential IDs agents can use. */
	private async loadAgentUsableCredentialIds(projectId: string, user: User): Promise<Set<string>> {
		const usable = await this.credentialsService.getCredentialsAUserCanUseInAWorkflow(user, {
			projectId,
			excludePersonalRoute: true,
			excludeResolvable: true,
		});
		return new Set(usable.map((credential) => credential.id));
	}

	private async checkToolAccess(
		ref: Exclude<AgentJsonToolConfig, { type: 'custom' }>,
		projectId: string,
		user: User,
		canExecute: boolean,
		loadUsableIds: () => Promise<Set<string>>,
	): Promise<UserToolAccessSnapshot | UnavailableTool> {
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
			const usableIds = credentialIds.length > 0 ? await loadUsableIds() : undefined;
			if (usableIds && !credentialIds.every((id) => usableIds.has(id))) {
				return denied('The tool uses a credential that agents cannot use yet');
			}
			return { credentialIds, workflowIds: [] };
		}

		const workflow = await findWorkflowToolWorkflow(this.workflowRepository, ref, projectId);
		// Missing workflows stay in the list so the tool factory can return a stub.
		if (!workflow) return { credentialIds: [], workflowIds: [] };
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
		const requiresExecute = snapshot.requiresWorkflowExecute !== false;
		if (
			requiresExecute &&
			!(await userHasScopes(user, ['workflow:execute'], false, { projectId }))
		) {
			return false;
		}

		const credentials = await Promise.all(
			snapshot.credentialIds.map(
				async (id) =>
					await this.credentialsFinderService.findCredentialForUser(id, user, ['credential:read']),
			),
		);
		if (credentials.some((credential) => credential === null)) return false;
		const agentCredentialIds = [
			...snapshot.credentialIds,
			...(snapshot.integrationCredentialIds ?? []),
		];
		if (agentCredentialIds.length > 0) {
			const usableIds = await this.loadAgentUsableCredentialIds(projectId, user);
			if (!agentCredentialIds.every((id) => usableIds.has(id))) return false;
		}

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
		let config =
			params.runtimeProfile === 'inline'
				? params.config
				: await this.withSkillWorkflowTools(params.config, params.skills, params.projectId);
		let unavailableTools: UnavailableTool[] = [];
		if (params.user && config.tools?.length) {
			// Sub-agent runtimes are built per delegation and never cached, so the
			// grant snapshot is not needed here.
			const user = params.user;
			const tools = config.tools;
			const filtered = await raceWithAbort(
				async () => await this.filterToolsForUser(tools, params.projectId, user),
				params.abortSignal,
			);
			config = { ...config, tools: filtered.tools };
			unavailableTools = filtered.unavailable;
		}

		const subAgentDelegation = await raceWithAbort(
			async () => await this.createSubAgentDelegationConfig(config, params.projectId),
			params.abortSignal,
		);

		return await this.reconstructRuntime({
			...params,
			config,
			credentialIntegrations: params.credentialIntegrations ?? [],
			subAgentDelegation,
			unavailableTools,
		});
	}

	private async withSkillWorkflowTools(
		config: AgentJsonConfig,
		skills: Record<string, AgentSkill>,
		projectId: string,
	): Promise<AgentJsonConfig> {
		if (!config.skills?.length || !(await this.workflowsInSkillsFlagGate.isEnabled())) {
			return config;
		}
		const legacyRefs = extractAgentWorkflowRefs(config).filter(
			(ref) => ref.workflowId === undefined,
		);
		const legacyWorkflows = await findWorkflowToolWorkflows(
			this.workflowRepository,
			legacyRefs,
			projectId,
		);
		return withSkillWorkflowTools(config, skills, legacyWorkflows);
	}

	private async reconstructRuntime(
		options: RuntimeReconstructionOptions,
	): Promise<ReconstructedAgentRuntime> {
		const unavailable = [...(options.unavailableTools ?? [])];
		const backgroundTasksEnabled =
			options.runtimeProfile === 'top-level' &&
			(options.allowBackgroundTasks ?? true) &&
			Container.get(AgentsConfig).backgroundTasksEnabled;
		const runtime = await this.buildCancellableRuntime(
			options,
			backgroundTasksEnabled,
			unavailable,
		);
		if (unavailable.length > 0) {
			this.logger.warn('Agent runtime built with unavailable tools', {
				agentId: options.memoryOwnerAgentId,
				runType: options.runType,
				tools: unavailable,
			});
		}
		try {
			await raceWithAbort(
				async () =>
					await this.injectRuntimeDependencies({
						...options,
						agent: runtime.agent,
						agentId: options.memoryOwnerAgentId,
						workflowToolExecutionMode: options.workflowToolExecutionMode ?? 'manual',
						parentAgentIdForDelegation:
							options.parentAgentIdForDelegation ?? options.memoryOwnerAgentId,
						backgroundTasksEnabled,
					}),
				options.abortSignal,
			);
			throwIfAborted(options.abortSignal);
		} catch (error) {
			if (options.abortSignal?.aborted) void this.closeCancelledRuntime(runtime.agent);
			throw error;
		}
		const guardrailWorkflowContext = hasWorkflowGuardrail(options.config)
			? await this.buildWorkflowToolContext(
					this.toolRunIdentity(options, backgroundTasksEnabled),
					options.instrumentation?.configureToolAdditionalData,
					options.user,
				)
			: undefined;
		return {
			agent: runtime.agent,
			toolRegistry: buildToolRegistry(runtime.resolvedTools),
			mcpServerAttributions: runtime.mcpServerAttributions,
			...(options.config.config?.guardrails?.budget !== undefined
				? { budget: options.config.config.guardrails.budget }
				: {}),
			...(options.config.credential === AI_GATEWAY_MANAGED_TAG
				? { modelCredentialGatewayManaged: true }
				: {}),
			...(options.config.config?.guardrails?.tools?.length
				? { toolGuardrails: options.config.config.guardrails.tools }
				: {}),
			...(runtime.guardrailModel !== undefined ? { guardrailModel: runtime.guardrailModel } : {}),
			...(guardrailWorkflowContext !== undefined ? { guardrailWorkflowContext } : {}),
		};
	}

	private async buildCancellableRuntime(
		options: RuntimeReconstructionOptions,
		backgroundTasksEnabled: boolean,
		unavailable: UnavailableTool[],
	) {
		return await raceWithAbort(async () => {
			const runtime = await this.buildConfiguredRuntime(
				options,
				backgroundTasksEnabled,
				unavailable,
			);
			if (options.abortSignal?.aborted) await this.closeCancelledRuntime(runtime.agent);
			throwIfAborted(options.abortSignal);
			return runtime;
		}, options.abortSignal);
	}

	private async closeCancelledRuntime(agent: RuntimeAgent) {
		try {
			await agent.close();
		} catch (error) {
			this.logger.warn('Failed to close cancelled Agent runtime', {
				error: error instanceof Error ? error.message : String(error),
			});
		}
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
		const aiMcpFetch = createAiMcpFetch(this.outboundHttp);
		const webSearchFetch = createWebSearchFetch(this.outboundHttp);
		const needsDecisionWorkflows =
			(options.supportsHitl ?? options.runtimeProfile === 'top-level') &&
			[...(config.tools ?? []), ...(config.mcpServers ?? [])].some(
				({ approvalRoute }) => approvalRoute?.type === 'configuration',
			);
		let decisionWorkflows: AgentDecisionWorkflowService | undefined;
		if (needsDecisionWorkflows) {
			const { AgentDecisionWorkflowService } = await import(
				'./approval/agent-decision-workflow.service.js'
			);
			decisionWorkflows = Container.get(AgentDecisionWorkflowService);
		}
		const wrapApproval = (tool: BuiltTool, route: AgentApprovalRoute | undefined) =>
			this.wrapConfiguredApproval(tool, route, options, decisionWorkflows);
		const buildMcpClient = this.makeMcpClientFactory(
			options,
			aiMcpFetch,
			mcpServerAttributions,
			wrapApproval,
		);
		const modelFetch = instrumentation?.modelFetch ?? aiProxyFetch;
		const guardrailModel = await this.resolveGuardrailModel(config, credentialProvider, modelFetch);
		const reconstructed = await buildFromJson(config, toolDescriptors, {
			wrapApproval: (tool, ref) => wrapApproval(tool, ref.approvalRoute),
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
			onVectorStoreSearch: (runId) =>
				this.knowledgeUsageTracker.startToolCall(runId, 'vector_store_search'),
			modelFetch: credentialProvider.createAiGatewayTokenRefreshFetch?.(modelFetch) ?? modelFetch,
			fallbackWebSearch: instrumentation?.webSearch,
			disableProviderTools: instrumentation?.disableProviderTools,
			// Only the mock MCP transport makes attaching auth-pending servers safe.
			attachAuthPendingMcpServers: instrumentation?.mcpFetch !== undefined,
			webSearchFetch,
			previewChat,
		});
		if (instrumentation?.toolCallInterceptor) {
			reconstructed.toolCallInterceptor(instrumentation.toolCallInterceptor);
		}
		return {
			agent: reconstructed,
			resolvedTools,
			mcpServerAttributions,
			...(guardrailModel !== undefined ? { guardrailModel } : {}),
		};
	}

	private async resolveGuardrailModel(
		config: AgentJsonConfig,
		credentialProvider: AgentCredentialProvider,
		modelFetch: ReturnType<typeof createAiProxyFetch>,
	): Promise<LanguageModel | undefined> {
		const guardrails = config.config?.guardrails?.tools;
		if (!guardrails?.some(isModelBasedKind) || config.model.trim() === '') return undefined;

		try {
			const modelConfig = config.credential
				? await resolveCredentialAwareModelConfig(
						config.model,
						config.credential,
						credentialProvider,
					)
				: config.model;
			return createModel(
				modelConfig,
				credentialProvider.createAiGatewayTokenRefreshFetch?.(modelFetch) ?? modelFetch,
			);
		} catch (error) {
			this.logger.warn('Failed to resolve the guardrail model; model-based guardrails skip', {
				model: config.model,
				error: error instanceof Error ? error.message : String(error),
			});
			return undefined;
		}
	}

	private createRuntimeToolResolver(
		options: RuntimeReconstructionOptions,
		backgroundTasksEnabled: boolean,
		unavailable: UnavailableTool[],
	): ToolResolver {
		return this.makeToolResolver(
			this.toolRunIdentity(options, backgroundTasksEnabled),
			options.instrumentation,
			unavailable,
		);
	}

	private toolRunIdentity(
		options: RuntimeReconstructionOptions,
		backgroundTasksEnabled: boolean,
	): ToolRunIdentity {
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
		} = options;
		const canResume = supportsHitl ?? runtimeProfile === 'top-level';
		return {
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
			...workflowToolAttribution(options),
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
		};
	}

	private wrapConfiguredApproval(
		tool: BuiltTool,
		route: AgentApprovalRoute | undefined,
		options: RuntimeReconstructionOptions,
		decisionWorkflows: AgentDecisionWorkflowService | undefined,
	): BuiltTool {
		const effective = route;
		if (!effective || effective.type === 'conversation') {
			return withApprovalDescription(wrapToolForApproval(tool, { requireApproval: true }));
		}
		// A review suspends the run. Do not start one that the caller cannot resume.
		if (!(options.supportsHitl ?? options.runtimeProfile === 'top-level')) {
			return {
				...tool,
				handler: async () => {
					throw new UserError(
						'Human review needs a run that can pause, such as Message an Agent version 4',
					);
				},
			};
		}
		if (!decisionWorkflows)
			throw new UnexpectedError('Configured Agent approval service is unavailable');
		return withApprovalDescription(
			decisionWorkflows.wrap(
				tool,
				effective,
				options.config,
				{
					agentId: options.memoryOwnerAgentId,
					projectId: options.projectId,
					published: options.runType === 'production',
					integrations: options.credentialIntegrations,
					integrationType: options.integrationType,
					userId: options.attributionUserId ?? options.user?.id,
					previewChat: options.previewChat,
					publishedN8nChat:
						options.runType === 'production' &&
						options.integrationType === N8N_CHAT_INTEGRATION_TYPE &&
						options.attributionUserId !== undefined,
				},
				options.toolCodeByName,
			),
		);
	}

	private makeMcpClientFactory(
		options: RuntimeReconstructionOptions,
		aiMcpFetch: ReturnType<typeof createAiMcpFetch>,
		mcpServerAttributions: Map<string, string>,
		wrapApproval: (tool: BuiltTool, route: AgentApprovalRoute | undefined) => BuiltTool,
	) {
		const { credentialProvider, projectId, memoryOwnerAgentId, instrumentation, runtimeProfile } =
			options;
		return async (server: AgentJsonMcpServerConfig) =>
			await buildMcpClientForServer(server, {
				wrapApproval: (tool) => wrapApproval(tool, server.approvalRoute),
				credentialProvider,
				// Inline agents have no checkpoint storage, and their schema rejects approval policies.
				nonInterrupting: runtimeProfile === 'inline',
				oauthService: this.oauthService,
				projectId,
				proxyFetch: aiMcpFetch,
				// A test run or an eval answers MCP itself: no stored credential is read and no
				// token is refreshed.
				simulatedFetch: instrumentation?.mcpFetch?.(server.name),
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
		const configuredAgents = (config.subAgents?.agents ?? []).filter(
			(ref) => ref.enabled !== false,
		);
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
	): Promise<EmbeddingProviderOptions | null> {
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
					buildProxyHeaders({ feature: 'agent-builder', n8nVersion: getN8nVersion() }),
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
					agentId: runIdentity.agentId,
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
		const { resolveWorkflowTool, buildUnavailableWorkflowTool } = await import(
			'./tools/workflow-tool-factory.js'
		);
		const context = await this.buildWorkflowToolContext(runIdentity, instrumentToolAdditionalData);
		try {
			return await resolveWorkflowTool(ref, context);
		} catch (error) {
			// A missing or incompatible workflow costs the agent one tool call, not
			// the whole run: the stub keeps the tool listed and reports the reason.
			if (!(error instanceof CallableWorkflowUnavailableError)) throw error;
			unavailable.push({
				toolName: toolRefName(ref),
				toolType: 'workflow',
				reason: error.reason,
				message: error.message,
			});
			return buildUnavailableWorkflowTool(ref, context);
		}
	}

	/** The callable-workflow machinery a workflow tool or guardrail check runs with. */
	private async buildWorkflowToolContext(
		runIdentity: ToolRunIdentity,
		instrumentToolAdditionalData?: AgentRuntimeInstrumentation['configureToolAdditionalData'],
		/** Interactive user. Absent for published and integration runs. */
		workflowAccessUser?: User,
	): Promise<WorkflowToolContext> {
		const {
			projectId,
			workflowToolExecutionMode,
			usePublishedWorkflowVersion,
			agentId,
			integrationType,
			userId,
			previewChat,
			publishedN8nChat,
			agentServiceAccountId,
			delegatingAgentId,
			supportsHitl,
			backgroundTasksEnabled,
		} = runIdentity;
		return {
			workflowLoader: Container.get(CallableWorkflowLoader),
			executor: this.ephemeralNodeExecutor,
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
			previewChat,
			publishedN8nChat,
			agentServiceAccountId,
			delegatingAgentId,
			supportsHitl,
			backgroundTasksEnabled,
			...(workflowAccessUser && {
				canExecuteWorkflow: async (workflowId: string) => {
					if (
						!(await userHasScopes(workflowAccessUser, ['workflow:execute'], false, {
							projectId,
						}))
					) {
						return false;
					}
					return Boolean(
						await this.workflowFinderService.findWorkflowForUser(workflowId, workflowAccessUser, [
							'workflow:execute',
						]),
					);
				},
			}),
		};
	}

	private async injectRuntimeDependencies(params: RuntimeDependencies): Promise<void> {
		const { agent, agentId, projectId, runtimeProfile, config, abortSignal } = params;

		throwIfAborted(abortSignal);
		agent.nativeToolDeferral({ eagerToolNames: harnessEagerToolNames(params) });

		agent.tool(createGetEnvironmentTool());
		const parentWorkspaceHandle = await this.attachWorkspaceAndKnowledge(params);
		throwIfAborted(abortSignal);
		if (runtimeProfile === 'top-level') {
			await this.attachIntegrationTools(params);
			throwIfAborted(abortSignal);
			await this.attachTopLevelTools(params, parentWorkspaceHandle);
		}
		throwIfAborted(abortSignal);
		// Inline agents have no entity for checkpoint or attachment rows.
		if (runtimeProfile === 'inline') return;
		if (!agent.hasCheckpointStorage()) {
			agent.checkpoint(
				this.n8nCheckpointStorage.getStorage(
					agentId,
					getAgentRuntimeDefinitionHash(
						config,
						params.toolCodeByName,
						params.credentialIntegrations,
					),
				),
			);
		}
		const provider = getProviderPrefix(config.model);
		agent.fileStore(this.agentChatAttachmentService.getFileStore({ agentId, projectId }, provider));
		agent.tool(
			createReadBinaryDataTool({
				projectId,
				provider,
				attachmentService: this.agentChatAttachmentService,
			}),
		);
	}

	private async attachWorkspaceAndKnowledge(params: RuntimeDependencies) {
		if (params.runtimeProfile === 'inline' || !this.agentSandboxRuntimeService.isEnabled())
			return undefined;
		const parentWorkspaceHandle = await this.attachWorkspace(params);
		throwIfAborted(params.abortSignal);
		const { agent, agentId, projectId } = params;
		const scope: KnowledgeConsumerScope = { kind: 'agent', projectId, agentId };
		// Module check first, so the file repository is not touched while knowledge is off.
		const hasFiles =
			this.knowledgeAvailabilityService.isModuleActive() &&
			(await this.knowledgeRetriever.hasFiles(scope));
		throwIfAborted(params.abortSignal);
		if (hasFiles) {
			const { createKnowledgeRetrievalTools } = await import(
				'./tools/knowledge/search-knowledge.tool.js'
			);
			throwIfAborted(params.abortSignal);
			agent.tool(
				createKnowledgeRetrievalTools({
					scope,
					retriever: this.knowledgeRetriever,
					startToolCall: (runId, call) => this.knowledgeUsageTracker.startToolCall(runId, call),
				}),
			);
		}
		return parentWorkspaceHandle;
	}

	private async attachWorkspaceTools(params: RuntimeDependencies, workspace: Workspace) {
		const { agent, projectId } = params;
		agent.workspace(workspace);
		if (!(await this.sandboxFiles.isEnabled())) return;
		const getInstructions = workspace.getInstructions.bind(workspace);
		workspace.getInstructions = () =>
			[getInstructions(), SANDBOX_FILES_INSTRUCTIONS].filter(Boolean).join('\n\n');
		agent.tool(createImportFilesTool({ projectId, workspace, sandboxFiles: this.sandboxFiles }));
		// Eager only when attached, so a user tool with the same name stays deferred.
		agent.nativeToolDeferral({
			eagerToolNames: [...harnessEagerToolNames(params), IMPORT_FILES_TOOL_NAME],
		});
	}

	private async attachWorkspace(
		params: RuntimeDependencies,
	): Promise<AgentSandboxRuntime | undefined> {
		const { agentId, projectId, runtimeProfile, parentWorkspace, sandboxPrincipalHash } = params;
		if (runtimeProfile === 'sub-agent') {
			// Delegated runs use the parent's sandbox only.
			if (parentWorkspace) {
				await this.attachWorkspaceTools(
					params,
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
			const sandboxEgress = params.config.config?.sandboxEgress;
			const { workspace, handle } =
				sandboxEgress !== undefined
					? await this.agentWorkspaceService.getAgentWorkspace(
							projectId,
							agentId,
							sandboxPrincipalHash,
							{ sandboxEgress },
						)
					: await this.agentWorkspaceService.getAgentWorkspace(
							projectId,
							agentId,
							sandboxPrincipalHash,
						);
			throwIfAborted(params.abortSignal);
			await this.attachWorkspaceTools(params, workspace);
			return handle;
		} catch (error) {
			throwIfAborted(params.abortSignal);
			this.logger.warn('Failed to attach agent workspace', {
				projectId,
				agentId,
				error: sanitizeSandboxErrorDetail(error instanceof Error ? error.message : String(error)),
			});
		}
		return undefined;
	}

	private async attachIntegrationTools(params: RuntimeDependencies): Promise<void> {
		const { agent, agentId, projectId, integrationType, credentialIntegrations } = params;
		const includeN8nChat = integrationType === N8N_CHAT_INTEGRATION_TYPE;
		if (credentialIntegrations.length === 0 && !includeN8nChat) return;
		const integrationRegistry = Container.get(ChatIntegrationRegistry);
		const { messageContextStore, actionExecutor, queryExecutor } =
			await getChatIntegrationToolServices();

		const descriptors = this.createIntegrationDescriptors(
			agentId,
			credentialIntegrations.filter(hasChannelRuntime),
			integrationRegistry,
		);

		if (includeN8nChat) {
			descriptors.push(this.createN8nChatDescriptor(agentId, integrationRegistry));
		}

		// Tagged so a test run can tell them apart from the SDK's own tools.
		const integrationTool = (tool: { build(): BuiltTool }): BuiltTool => ({
			...tool.build(),
			metadata: { kind: 'integration' },
		});
		for (const descriptor of descriptors) {
			agent.tool(integrationTool(createIntegrationContextTool({ descriptor, queryExecutor })));
			const actionTool = integrationTool(
				createIntegrationActionTool({
					descriptor,
					projectId,
					messageContextStore,
					actionExecutor,
				}),
			);
			agent.tool(
				descriptor.approval
					? withApprovalDescription(actionTool, (input) => {
							if (!isRecord(input)) return false;
							const action = descriptor.actionToolDefinitions.find(
								(entry) => entry.name === input.action,
							)?.name;
							return action !== undefined && actionNeedsApproval(descriptor.approval, action);
						})
					: actionTool,
			);
		}
		for (const tool of createConversationTools({
			descriptors,
			messageContextStore,
			actionExecutor,
			projectId,
		})) {
			agent.tool(integrationTool(tool));
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
					conversationTools: integrationDef?.conversationTools,
					supportedComponents: integrationDef?.supportedComponents,
					contextToolDefinitions: integrationDef?.contextToolDefinitions,
					actionToolDefinitions: integrationDef?.actionToolDefinitions,
					contextQueries: integrationDef?.contextQueries,
					actions: integrationDef?.actions,
					contextToolGuidance: integrationDef?.contextToolGuidance,
					actionToolGuidance: [
						...(integrationDef?.actionToolGuidance ?? []),
						...(integrationDef?.fileUploadLimits
							? [
									buildFileUploadGuidance(
										integrationDef.fileUploadLimits,
										!integrationDef.disableStreaming,
										this.agentChatAttachmentService.maxStoredFileBytes,
									),
								]
							: []),
					],
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
			conversationTools: n8nChat.conversationTools,
			supportedComponents: n8nChat.supportedComponents,
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
			abortSignal: params.abortSignal,
		};
		let runBackgroundSubAgent: CreateDelegateSubAgentToolOptions['runBackgroundSubAgent'];

		if (backgroundTasksEnabled) {
			// Background tools attach only to the root agent, so its cap is the root cap.
			const budget = config.config?.guardrails?.budget;
			const sessionCap = budget?.enabled ? budget.sessionCostCapUsd : undefined;
			const rootSessionCapUsd = sessionCap !== undefined && sessionCap > 0 ? sessionCap : undefined;
			runBackgroundSubAgent = await this.attachBackgroundJobTools({
				...delegationParams,
				// Same condition as the plan tools: a run with plans can link background jobs to them.
				planTasksEnabled:
					params.allowPlanTools !== false && Container.get(AgentsConfig).planToolsEnabled,
				...(parentWorkspaceHandle !== undefined ? { parentWorkspaceHandle } : {}),
				...(rootSessionCapUsd !== undefined ? { rootSessionCapUsd } : {}),
			});
		}

		throwIfAborted(params.abortSignal);
		await this.attachSubAgentDelegationTool({
			...delegationParams,
			config,
			parentWorkspaceHandle,
			rootSessionId: params.rootSessionId,
			rootSessionCapUsd: params.rootSessionCapUsd,
			budgetForwarded: params.budgetForwarded,
			runBackgroundSubAgent,
		});
		throwIfAborted(params.abortSignal);
		if (params.allowPlanTools !== false && Container.get(AgentsConfig).planToolsEnabled) {
			const { AgentPlanService } = await import('./agent-plan.service.js');
			const { createAgentPlanTools } = await import('./plans/agent-plan-tools.js');
			throwIfAborted(params.abortSignal);
			agent.tool(createAgentPlanTools(Container.get(AgentPlanService)));
		} else {
			this.attachWriteTodosTool(agent, agentId);
		}
		agent.tool(createMarkSessionFailedTool());
		if (!backgroundTasksEnabled) return;
		// Append updates as context cues instead of volatile system instructions so the
		// conversation prompt cache stays valid when background jobs settle mid-turn.
		agent.contextCueProvider(async ({ persistence, sentCueIds }) => {
			if (!persistence?.threadId) return [];
			const { AgentWakeService } = await import('./background/agent-wake.service.js');
			return await Container.get(AgentWakeService).getBackgroundUpdateCues(
				persistence.threadId,
				persistence.resourceId,
				sentCueIds,
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
		rootSessionId?: string;
		rootSessionCapUsd?: number;
		budgetForwarded?: boolean;
		runBackgroundSubAgent?: CreateDelegateSubAgentToolOptions['runBackgroundSubAgent'];
		abortSignal?: AbortSignal;
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
			rootSessionId,
			rootSessionCapUsd,
			budgetForwarded,
			runBackgroundSubAgent,
			abortSignal,
		} = params;
		const inlineSubAgentModelsByDifficulty = await this.resolveInlineSubAgentModelsByDifficulty(
			config,
			credentialProvider,
			abortSignal,
		);
		throwIfAborted(abortSignal);
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
				parentBudget: config.config?.guardrails?.budget,
				runBackgroundSubAgent,
				...(budgetForwarded ? { rootSessionId, rootSessionCapUsd, budgetForwarded: true } : {}),
				policy: this.buildSubAgentPolicy(config),
				...(inlineSubAgentModelsByDifficulty !== undefined
					? { inlineSubAgentModelsByDifficulty }
					: {}),
				// Provider tools run inside the provider's call, out of the test run's reach. Without
				// the resolver, the delegate tool also tells the model that children get none.
				...(instrumentation?.disableProviderTools
					? {}
					: {
							resolveInlineSubAgentProviderTools: (modelConfig: ModelConfig) =>
								buildProviderToolsForModel(config, modelConfig),
						}),
			}),
		);
		this.logger.debug('Injected delegate_subagent tool', { agentId: parentAgentId });
	}

	private async resolveInlineSubAgentModelsByDifficulty(
		config: AgentJsonConfig,
		credentialProvider: CredentialProvider,
		abortSignal?: AbortSignal,
	): Promise<Partial<Record<SubAgentTaskDifficulty, ModelConfig>> | undefined> {
		const mappings = config.subAgents?.modelsByDifficulty;
		if (!mappings) return undefined;

		const resolved: Partial<Record<SubAgentTaskDifficulty, ModelConfig>> = {};
		for (const difficulty of SUB_AGENT_TASK_DIFFICULTIES) {
			const mapping = mappings[difficulty];
			if (!mapping) continue;
			resolved[difficulty] = await raceWithAbort(
				async () =>
					await resolveCredentialAwareModelConfig(
						mapping.model,
						mapping.credential,
						credentialProvider,
					),
				abortSignal,
			);
		}

		return Object.keys(resolved).length > 0 ? resolved : undefined;
	}

	private attachWriteTodosTool(agent: RuntimeAgent, agentId: string): void {
		agent.tool(createWriteTodosTool());
		this.logger.debug('Injected write_todos tool', { agentId });
	}

	private async attachBackgroundJobTools(params: {
		planTasksEnabled: boolean;
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
		rootSessionCapUsd?: number;
		abortSignal?: AbortSignal;
	}): Promise<NonNullable<CreateDelegateSubAgentToolOptions['runBackgroundSubAgent']>> {
		const {
			agent,
			parentAgentId,
			projectId,
			delegation,
			planTasksEnabled,
			abortSignal,
			...runContext
		} = params;
		const { createBackgroundSubAgentHandler, createBackgroundJobsTool } = await import(
			'./background/background-job-tools.js'
		);
		const { AgentBackgroundJobService } = await import(
			'./background/agent-background-job.service.js'
		);
		const { SubAgentBackgroundRunner } = await import(
			'./background/sub-agent-background-runner.js'
		);
		throwIfAborted(abortSignal);
		const jobService = Container.get(AgentBackgroundJobService);

		agent.tool(
			createBackgroundJobsTool({
				jobService,
				backgroundRunner: Container.get(SubAgentBackgroundRunner),
				projectId,
				parentAgentId,
				runContext,
			}),
		);

		this.logger.debug('Injected background jobs tool', { agentId: parentAgentId });

		return createBackgroundSubAgentHandler({
			planTasksEnabled,
			jobService,
			backgroundRunner: Container.get(SubAgentBackgroundRunner),
			sourcesById: delegation.sourcesById,
			availableSubAgents: delegation.availableSubAgents,
			projectId,
			parentAgentId,
			runContext,
		});
	}

	private buildSubAgentPolicy(config: AgentJsonConfig): SubAgentRunPolicy {
		return {
			maxChildren: config.subAgents?.maxChildren ?? SUB_AGENT_MAX_CHILDREN_DEFAULT,
		};
	}
}
