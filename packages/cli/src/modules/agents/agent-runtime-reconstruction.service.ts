import {
	createWriteTodosTool,
	type Agent as RuntimeAgent,
	BuiltTool,
	CredentialProvider,
	ModelConfig,
	ToolDescriptor,
} from '@n8n/agents';
import { proxyFetch } from '@n8n/ai-utilities/http-proxy-agent';
import {
	N8N_CHAT_ACTION_TOOL_NAME,
	N8N_CHAT_CONTEXT_TOOL_NAME,
	N8N_CHAT_INTEGRATION_TYPE,
	SUB_AGENT_MAX_CHILDREN_DEFAULT,
	SUB_AGENT_TASK_DIFFICULTIES,
	buildProxyHeaders,
	type AgentIntegrationConfig,
	type AgentJsonConfig,
	type AgentJsonMcpServerConfig,
	type AgentJsonMemoryConfig,
	type AgentJsonToolConfig,
	type AgentSkill,
	type SubAgentRunPolicy,
	type SubAgentSource,
	type SubAgentTaskDifficulty,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { OutboundHttp, SsrfProtectionService } from '@n8n/backend-network';
import { AgentsConfig, SsrfProtectionConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { WorkflowRepository } from '@n8n/db';
import { Container, Service } from '@n8n/di';
import { UserError } from 'n8n-workflow';
import { nanoid } from 'nanoid';

import { ActiveExecutions } from '@/active-executions';
import { N8N_VERSION } from '@/constants';
import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { EphemeralNodeExecutor } from '@/node-execution';
import { OauthService } from '@/oauth/oauth.service';
import { userHasScopes } from '@/permissions.ee/check-access';
import { AiService } from '@/services/ai.service';
import { ProxyTokenManager } from '@/services/proxy-token-manager';
import { UrlService } from '@/services/url.service';
import { createAiMcpFetch, createAiProxyFetch } from '@/utils/ai-proxy-fetch';
import { WorkflowRunner } from '@/workflow-runner';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { isAgentKnowledgeBaseEnabled } from './agent-knowledge-gate';
import { AgentKnowledgeSandboxService } from './agent-knowledge-sandbox.service';
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
import { SubAgentForegroundRunner } from './sub-agents/sub-agent-foreground-runner';
import { buildToolRegistry, type ToolRegistry } from './tool-registry';
import { createGetEnvironmentTool } from './tools/environment-tool';
import { resolveUniqueSubAgents } from './utils/sub-agent-resolver';
export type AgentRuntimeProfile = 'top-level' | 'sub-agent';

export interface SubAgentDelegationConfig {
	sourcesById: Record<string, SubAgentSource>;
	availableSubAgents: Array<{ id: string; name: string; useWhen?: string }>;
}

export interface ReconstructAgentRuntimeParams {
	config: AgentJsonConfig;
	memoryOwnerAgentId: string;
	projectId: string;
	credentialProvider: CredentialProvider;
	toolDescriptors: Record<string, ToolDescriptor>;
	toolCodeByName: Record<string, string>;
	skills: Record<string, AgentSkill>;
	runtimeProfile: AgentRuntimeProfile;
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
}

async function getChatIntegrationToolServices() {
	const { IntegrationMessageContextService } = await import(
		'./integrations/integration-message-context.service'
	);
	// eslint-disable-next-line import-x/no-cycle
	const { ChatIntegrationActionExecutor } = await import(
		'./integrations/integration-action-executor'
	);
	const { ChatIntegrationContextQueryExecutor } = await import(
		'./integrations/integration-context-query-executor'
	);

	return {
		messageContextStore: Container.get(IntegrationMessageContextService),
		actionExecutor: Container.get(ChatIntegrationActionExecutor),
		queryExecutor: Container.get(ChatIntegrationContextQueryExecutor),
	};
}

async function getWorkflowRunner(): Promise<WorkflowRunner> {
	const { WorkflowRunner } = await import('@/workflow-runner');
	return Container.get(WorkflowRunner);
}

@Service()
export class AgentRuntimeReconstructionService {
	constructor(
		private readonly logger: Logger,
		private readonly agentRepository: AgentRepository,
		private readonly agentFileRepository: AgentFileRepository,
		private readonly activeExecutions: ActiveExecutions,
		private readonly workflowRepository: WorkflowRepository,
		private readonly urlService: UrlService,
		private readonly n8nCheckpointStorage: N8NCheckpointStorage,
		private readonly secureRuntime: AgentSecureRuntime,
		private readonly ephemeralNodeExecutor: EphemeralNodeExecutor,
		private readonly n8nMemory: N8nMemory,
		private readonly oauthService: OauthService,
		private readonly agentsConfig: AgentsConfig,
		private readonly aiService: AiService,
		private readonly outboundHttp: OutboundHttp,
		private readonly agentKnowledgeSandboxService: AgentKnowledgeSandboxService,
		private readonly ssrfConfig: SsrfProtectionConfig,
		private readonly ssrfProtectionService: SsrfProtectionService,
		private readonly credentialsFinderService: CredentialsFinderService,
		private readonly workflowFinderService: WorkflowFinderService,
	) {}

	async reconstructFromAgentEntity(
		agentEntity: Agent,
		credentialProvider: CredentialProvider,
		integrationType?: string,
		user?: User,
	): Promise<{ agent: RuntimeAgent; toolRegistry: ToolRegistry }> {
		let config = agentEntity.schema;
		if (!config) {
			throw new UserError('Agent has no JSON config.');
		}

		// Published/integration runs have no interactive n8n user and keep
		// today's project-scoped trust boundary. When a user is present (in-app
		// chat, resume, task-now), drop node/workflow tools the user can't
		// execute or lacks credential/workflow access to before the runtime is
		// built, so denied tools never reach the LLM or the executor.
		if (user && config.tools?.length) {
			config = {
				...config,
				tools: await this.filterToolsForUser(config.tools, agentEntity.projectId, user),
			};
		}

		const toolsByName: Record<string, string> = {};
		const toolDescriptors: Record<string, ToolDescriptor> = {};
		for (const [_toolId, toolEntry] of Object.entries(agentEntity.tools ?? {})) {
			toolsByName[toolEntry.descriptor.name] = toolEntry.code;
			toolDescriptors[_toolId] = toolEntry.descriptor;
		}

		const subAgentDelegation = await this.createSubAgentDelegationConfig(
			config,
			agentEntity.projectId,
		);

		return await this.reconstructRuntime({
			config,
			memoryOwnerAgentId: agentEntity.id,
			projectId: agentEntity.projectId,
			credentialProvider,
			toolDescriptors,
			toolCodeByName: toolsByName,
			skills: agentEntity.skills ?? {},
			runtimeProfile: 'top-level',
			parentAgentIdForDelegation: agentEntity.id,
			integrationType,
			credentialIntegrations: agentEntity.integrations ?? [],
			subAgentDelegation,
			user,
		});
	}

	/**
	 * Drop node/workflow tool refs the calling user can't run: `workflow:execute`
	 * gates both kinds, and node tools additionally need `credential:read` on
	 * every credential baked into the ref. Filtering the config copy (rather
	 * than the resolved tools) means a denied ref never reaches
	 * `makeToolResolver`/`resolveToolRef`, so no inert marker tool is exposed to
	 * the LLM. Custom tools are untouched — they run n8n-authored code, not a
	 * caller-chosen node/workflow with baked credentials.
	 */
	private async filterToolsForUser(
		tools: AgentJsonToolConfig[],
		projectId: string,
		user: User,
	): Promise<AgentJsonToolConfig[]> {
		const canExecute = await userHasScopes(user, ['workflow:execute'], false, { projectId });

		const filtered: AgentJsonToolConfig[] = [];
		for (const ref of tools) {
			if (ref.type === 'custom') {
				filtered.push(ref);
				continue;
			}

			if (!canExecute) continue;

			if (ref.type === 'node') {
				const credentialIds = Object.values(ref.node.credentials ?? {})
					.map((credential) => credential.id)
					.filter((id): id is string => Boolean(id));

				const accessibleCredentials = await Promise.all(
					credentialIds.map(
						async (id) =>
							await this.credentialsFinderService.findCredentialForUser(id, user, [
								'credential:read',
							]),
					),
				);
				if (accessibleCredentials.some((credential) => credential === null)) continue;

				filtered.push(ref);
				continue;
			}

			// ref.type === 'workflow'
			const workflow = await this.workflowRepository.findOne({
				where: { name: ref.workflow, shared: { projectId } },
				relations: ['shared'],
			});
			if (!workflow) continue;

			const accessibleWorkflow = await this.workflowFinderService.findWorkflowForUser(
				workflow.id,
				user,
				['workflow:execute'],
			);
			if (!accessibleWorkflow) continue;

			filtered.push(ref);
		}

		return filtered;
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
	): Promise<{ agent: RuntimeAgent; toolRegistry: ToolRegistry }> {
		let config = params.config;
		if (params.user && config.tools?.length) {
			config = {
				...config,
				tools: await this.filterToolsForUser(config.tools, params.projectId, params.user),
			};
		}

		const subAgentDelegation = await this.createSubAgentDelegationConfig(config, params.projectId);

		return await this.reconstructRuntime({
			...params,
			config,
			credentialIntegrations: [],
			subAgentDelegation,
		});
	}

	private async reconstructRuntime(options: {
		config: AgentJsonConfig;
		memoryOwnerAgentId: string;
		projectId: string;
		credentialProvider: CredentialProvider;
		toolDescriptors: Record<string, ToolDescriptor>;
		toolCodeByName: Record<string, string>;
		skills: Record<string, AgentSkill>;
		runtimeProfile: AgentRuntimeProfile;
		parentAgentIdForDelegation?: string;
		integrationType?: string;
		credentialIntegrations: AgentIntegrationConfig[];
		subAgentDelegation: SubAgentDelegationConfig;
		user?: User;
	}): Promise<{ agent: RuntimeAgent; toolRegistry: ToolRegistry }> {
		const {
			config,
			memoryOwnerAgentId,
			projectId,
			credentialProvider,
			toolDescriptors,
			toolCodeByName,
			skills,
			runtimeProfile,
			parentAgentIdForDelegation,
			integrationType,
			credentialIntegrations,
			subAgentDelegation,
			user,
		} = options;

		const toolExecutor = this.secureRuntime.createToolExecutor(toolCodeByName);
		const toolResolver = this.makeToolResolver(projectId);
		const resolvedTools: BuiltTool[] = [];

		// Transport for LLM calls
		const aiProxyFetch = createAiProxyFetch(this.outboundHttp);
		// Transport for MCP calls
		const aiMcpFetch = createAiMcpFetch(
			this.outboundHttp,
			this.ssrfConfig,
			this.ssrfProtectionService,
		);

		const buildMcpClient = async (server: AgentJsonMcpServerConfig) =>
			await buildMcpClientForServer(server, {
				credentialProvider,
				oauthService: this.oauthService,
				projectId,
				proxyFetch: aiMcpFetch,
			});

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
			modelFetch: aiProxyFetch,
		});

		await this.injectRuntimeDependencies({
			agent: reconstructed,
			agentId: memoryOwnerAgentId,
			projectId,
			credentialProvider,
			runtimeProfile,
			config,
			subAgentDelegation,
			parentAgentIdForDelegation: parentAgentIdForDelegation ?? memoryOwnerAgentId,
			integrationType,
			credentialIntegrations,
			user,
		});

		return { agent: reconstructed, toolRegistry: buildToolRegistry(resolvedTools) };
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
			if (!agent?.activeVersionId) continue;

			// No versionId pin here: the delegate closure lives inside the
			// cached parent runtime, so pinning would freeze the child at
			// whatever was published when the parent was last built. Leaving
			// it out means SubAgentSourceResolver re-resolves the child's
			// current activeVersion on every delegation.
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
				return await proxyFetch(input as string, { ...init, headers });
			},
		};
	}
	private makeToolResolver(projectId: string): ToolResolver {
		return async (ref: AgentJsonToolConfig) => {
			if (ref.type === 'workflow') {
				const { resolveWorkflowTool } = await import('./tools/workflow-tool-factory');
				return await resolveWorkflowTool(ref, {
					workflowRepository: this.workflowRepository,
					workflowRunner: await getWorkflowRunner(),
					activeExecutions: this.activeExecutions,
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

	private async injectRuntimeDependencies(params: {
		agent: RuntimeAgent;
		agentId: string;
		projectId: string;
		credentialProvider: CredentialProvider;
		runtimeProfile: AgentRuntimeProfile;
		config: AgentJsonConfig;
		subAgentDelegation: SubAgentDelegationConfig;
		parentAgentIdForDelegation: string;
		integrationType?: string;
		credentialIntegrations: AgentIntegrationConfig[];
		user?: User;
	}): Promise<void> {
		const {
			agent,
			agentId,
			projectId,
			credentialProvider,
			runtimeProfile,
			config,
			subAgentDelegation,
			parentAgentIdForDelegation,
			integrationType,
			credentialIntegrations,
			user,
		} = params;

		agent.tool(createGetEnvironmentTool());

		if (
			isAgentKnowledgeBaseEnabled(this.agentsConfig) &&
			(await this.agentFileRepository.hasFilesForAgent(agentId))
		) {
			const { createKnowledgeRetrievalTools } = await import(
				'./tools/knowledge/search-knowledge.tool'
			);
			agent.tool(
				createKnowledgeRetrievalTools({
					projectId,
					agentId,
					sandboxService: this.agentKnowledgeSandboxService,
				}),
			);
		}

		if (runtimeProfile === 'top-level') {
			const includeN8nChat = integrationType === N8N_CHAT_INTEGRATION_TYPE;

			if (credentialIntegrations.length > 0 || includeN8nChat) {
				const integrationRegistry = Container.get(ChatIntegrationRegistry);
				const { messageContextStore, actionExecutor, queryExecutor } =
					await getChatIntegrationToolServices();

				const descriptors: IntegrationToolConnectionDescriptor[] =
					getIntegrationToolConnectionDescriptors(
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

				if (includeN8nChat) {
					// Implicit in-app chat channel: credential-less, per-run, fixed
					// tool names (exactly one n8n_chat per run — no suffixing).
					const n8nChat = integrationRegistry.require(N8N_CHAT_INTEGRATION_TYPE);
					const n8nChatIntegration = {
						type: N8N_CHAT_INTEGRATION_TYPE,
					} as unknown as IntegrationToolConnectionDescriptor['integration'];
					descriptors.push({
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
					});
				}

				for (const descriptor of descriptors) {
					agent.tool(
						createIntegrationContextTool({ descriptor, messageContextStore, queryExecutor }),
					);
					agent.tool(
						createIntegrationActionTool({ descriptor, messageContextStore, actionExecutor }),
					);
				}
			}
		}

		if (runtimeProfile === 'top-level') {
			await this.attachSubAgentDelegationTool({
				agent,
				config,
				parentAgentId: parentAgentIdForDelegation,
				projectId,
				credentialProvider,
				delegation: subAgentDelegation,
				user,
			});
			this.attachWriteTodosTool(agent, agentId);
		}

		if (!agent.hasCheckpointStorage()) {
			agent.checkpoint(this.n8nCheckpointStorage.getStorage(agentId));
		}
	}

	private async attachSubAgentDelegationTool(params: {
		agent: RuntimeAgent;
		config: AgentJsonConfig;
		parentAgentId: string;
		projectId: string;
		credentialProvider: CredentialProvider;
		delegation: SubAgentDelegationConfig;
		user?: User;
	}): Promise<void> {
		const { agent, config, parentAgentId, projectId, credentialProvider, delegation, user } =
			params;
		const inlineSubAgentModelsByDifficulty = await this.resolveInlineSubAgentModelsByDifficulty(
			config,
			credentialProvider,
		);
		agent.tool(
			createN8nDelegateSubAgentTool({
				runner: Container.get(SubAgentForegroundRunner),
				...delegation,
				projectId,
				parentAgentId,
				credentialProvider,
				user,
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

	private buildSubAgentPolicy(config: AgentJsonConfig): SubAgentRunPolicy {
		return {
			maxChildren: config.subAgents?.maxChildren ?? SUB_AGENT_MAX_CHILDREN_DEFAULT,
		};
	}
}
