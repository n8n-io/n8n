import {
	createWriteTodosTool,
	type Agent as RuntimeAgent,
	BuiltTool,
	CredentialProvider,
	ModelConfig,
	ToolDescriptor,
} from '@n8n/agents';
import {
	isNodeToolsEnabled,
	N8N_CHAT_ACTION_TOOL_NAME,
	N8N_CHAT_CONTEXT_TOOL_NAME,
	N8N_CHAT_INTEGRATION_TYPE,
	SUB_AGENT_MAX_CHILDREN_DEFAULT,
	SUB_AGENT_TASK_DIFFICULTIES,
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
import { OutboundHttp } from '@n8n/backend-network';
import { AgentsConfig } from '@n8n/config';
import { UserRepository, WorkflowRepository } from '@n8n/db';
import { Container, Service } from '@n8n/di';
import { UserError } from 'n8n-workflow';

import { ActiveExecutions } from '@/active-executions';
import { EphemeralNodeExecutor } from '@/node-execution';
import { OauthService } from '@/oauth/oauth.service';
import { UrlService } from '@/services/url.service';
import { createAiProxyFetch } from '@/utils/ai-proxy-fetch';
import { WorkflowRunner } from '@/workflow-runner';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { AgentsToolsService } from './agents-tools.service';
import { Agent } from './entities/agent.entity';
import { ChatIntegrationRegistry } from './integrations/agent-chat-integration';
import { ChatIntegrationActionExecutor } from './integrations/integration-action-executor';
import { ChatIntegrationContextQueryExecutor } from './integrations/integration-context-query-executor';
import { IntegrationMessageContextService } from './integrations/integration-message-context.service';
import {
	createIntegrationActionTool,
	createIntegrationContextTool,
	getIntegrationToolConnectionDescriptors,
} from './integrations/integration-tools';
import { N8NCheckpointStorage } from './integrations/n8n-checkpoint-storage';
import { N8nMemory } from './integrations/n8n-memory';
import {
	buildFromJson,
	buildProviderToolsForModel,
	type MemoryFactory,
	type ToolResolver,
} from './json-config/from-json-config';
import { buildMcpClientForServer } from './json-config/mcp-client-factory';
import { resolveCredentialAwareModelConfig } from './json-config/model-config';
import { AgentFileRepository } from './repositories/agent-file.repository';
import { AgentRepository } from './repositories/agent.repository';
import { AgentSecureRuntime } from './runtime/agent-secure-runtime';
import { isAgentKnowledgeBaseEnabled } from './agent-knowledge-gate';
import { AgentKnowledgeSandboxService } from './agent-knowledge-sandbox.service';
import { createN8nDelegateSubAgentTool } from './sub-agents/delegate-sub-agent-tool';
import { SubAgentForegroundRunner } from './sub-agents/sub-agent-foreground-runner';
import { buildToolRegistry, type ToolRegistry } from './tool-registry';
import { createGetEnvironmentTool } from './tools/environment-tool';
export type AgentRuntimeProfile = 'top-level' | 'sub-agent';

export interface SubAgentDelegationConfig {
	sourcesById: Record<string, SubAgentSource>;
	availableSubAgents: Array<{ id: string; name: string; description?: string }>;
}

export interface ReconstructAgentRuntimeParams {
	config: AgentJsonConfig;
	memoryOwnerAgentId: string;
	projectId: string;
	credentialProvider: CredentialProvider;
	toolDescriptors: Record<string, ToolDescriptor>;
	toolCodeByName: Record<string, string>;
	skills: Record<string, AgentSkill>;
	/** Required for workflow tool resolution. */
	userId: string;
	runtimeProfile: AgentRuntimeProfile;
	/** Delegating parent agent id for sub-agent runs; defaults to memoryOwnerAgentId for top-level. */
	parentAgentIdForDelegation?: string;
	/** Top-level chat/integration runtimes only. */
	integrationType?: string;
	/** Top-level chat/integration runtimes only. */
	credentialIntegrations?: AgentIntegrationConfig[];
}

@Service()
export class AgentRuntimeReconstructionService {
	constructor(
		private readonly logger: Logger,
		private readonly agentRepository: AgentRepository,
		private readonly agentFileRepository: AgentFileRepository,
		private readonly workflowRunner: WorkflowRunner,
		private readonly activeExecutions: ActiveExecutions,
		private readonly workflowRepository: WorkflowRepository,
		private readonly userRepository: UserRepository,
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly urlService: UrlService,
		private readonly n8nCheckpointStorage: N8NCheckpointStorage,
		private readonly secureRuntime: AgentSecureRuntime,
		private readonly ephemeralNodeExecutor: EphemeralNodeExecutor,
		private readonly agentsToolsService: AgentsToolsService,
		private readonly n8nMemory: N8nMemory,
		private readonly oauthService: OauthService,
		private readonly agentsConfig: AgentsConfig,
		private readonly outboundHttp: OutboundHttp,
		private readonly agentKnowledgeSandboxService: AgentKnowledgeSandboxService,
	) {}

	async reconstructFromAgentEntity(
		agentEntity: Agent,
		credentialProvider: CredentialProvider,
		userId: string,
		integrationType?: string,
	): Promise<{ agent: RuntimeAgent; toolRegistry: ToolRegistry }> {
		const config = agentEntity.schema;
		if (!config) {
			throw new UserError('Agent has no JSON config.');
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
			userId,
			runtimeProfile: 'top-level',
			parentAgentIdForDelegation: agentEntity.id,
			integrationType,
			credentialIntegrations: agentEntity.integrations ?? [],
			subAgentDelegation,
		});
	}

	async reconstructFromResolvedSource(
		params: ReconstructAgentRuntimeParams,
	): Promise<{ agent: RuntimeAgent; toolRegistry: ToolRegistry }> {
		const subAgentDelegation = await this.createSubAgentDelegationConfig(
			params.config,
			params.projectId,
		);

		return await this.reconstructRuntime({
			...params,
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
		userId: string;
		runtimeProfile: AgentRuntimeProfile;
		parentAgentIdForDelegation?: string;
		integrationType?: string;
		credentialIntegrations: AgentIntegrationConfig[];
		subAgentDelegation: SubAgentDelegationConfig;
	}): Promise<{ agent: RuntimeAgent; toolRegistry: ToolRegistry }> {
		const {
			config,
			memoryOwnerAgentId,
			projectId,
			credentialProvider,
			toolDescriptors,
			toolCodeByName,
			skills,
			userId,
			runtimeProfile,
			parentAgentIdForDelegation,
			integrationType,
			credentialIntegrations,
			subAgentDelegation,
		} = options;

		const toolExecutor = this.secureRuntime.createToolExecutor(toolCodeByName);
		const toolResolver = this.makeToolResolver(projectId, userId);
		const resolvedTools: BuiltTool[] = [];

		// One proxy-aware transport shared by the agent's model and all its MCP
		// connections, so they reuse a single connection pool.
		const aiProxyFetch = createAiProxyFetch(this.outboundHttp);

		const buildMcpClient = async (server: AgentJsonMcpServerConfig) =>
			await buildMcpClientForServer(server, {
				credentialProvider,
				oauthService: this.oauthService,
				projectId,
				proxyFetch: aiProxyFetch,
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
			modelFetch: aiProxyFetch,
		});

		await this.injectRuntimeDependencies({
			agent: reconstructed,
			agentId: memoryOwnerAgentId,
			projectId,
			credentialProvider,
			userId,
			runtimeProfile,
			config,
			nodeToolsEnabled: this.shouldAttachNodeTools(config.config),
			subAgentDelegation,
			parentAgentIdForDelegation: parentAgentIdForDelegation ?? memoryOwnerAgentId,
			integrationType,
			credentialIntegrations,
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

		for (const { agentId, agent } of await this.fetchUniqueSubAgents(configuredAgents, projectId)) {
			if (!agent?.activeVersionId) continue;

			sourcesById[agentId] = { agentId, versionId: agent.activeVersionId };
			availableSubAgents.push({
				id: agentId,
				name: agent.name,
				...(agent.description ? { description: agent.description } : {}),
			});
		}

		return { sourcesById, availableSubAgents };
	}

	private async fetchUniqueSubAgents(
		refs: Array<{ agentId: string }>,
		projectId: string,
	): Promise<Array<{ agentId: string; agent: Agent | null }>> {
		const seen = new Set<string>();
		const resolved: Array<{ agentId: string; agent: Agent | null }> = [];
		for (const { agentId } of refs) {
			if (seen.has(agentId)) continue;
			seen.add(agentId);
			resolved.push({
				agentId,
				agent: await this.agentRepository.findByIdAndProjectId(agentId, projectId),
			});
		}
		return resolved;
	}

	private getMemoryFactory(agentId: string): MemoryFactory {
		return (_params: AgentJsonMemoryConfig) => this.n8nMemory.getImplementation(agentId);
	}

	private shouldAttachNodeTools(config: AgentJsonConfig['config']): boolean {
		return this.isNodeToolsModuleEnabled() && isNodeToolsEnabled(config);
	}

	private isNodeToolsModuleEnabled(): boolean {
		return this.agentsConfig.modules.includes('node-tools-searcher');
	}

	private makeToolResolver(projectId: string, userId: string): ToolResolver {
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

	private async injectRuntimeDependencies(params: {
		agent: RuntimeAgent;
		agentId: string;
		projectId: string;
		credentialProvider: CredentialProvider;
		userId: string;
		runtimeProfile: AgentRuntimeProfile;
		config: AgentJsonConfig;
		nodeToolsEnabled: boolean;
		subAgentDelegation: SubAgentDelegationConfig;
		parentAgentIdForDelegation: string;
		integrationType?: string;
		credentialIntegrations: AgentIntegrationConfig[];
	}): Promise<void> {
		const {
			agent,
			agentId,
			projectId,
			credentialProvider,
			userId,
			runtimeProfile,
			config,
			nodeToolsEnabled,
			subAgentDelegation,
			parentAgentIdForDelegation,
			integrationType,
			credentialIntegrations,
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
					userId,
					sandboxService: this.agentKnowledgeSandboxService,
				}),
			);
		}

		if (runtimeProfile === 'top-level') {
			const includeN8nChat = integrationType === N8N_CHAT_INTEGRATION_TYPE;

			if (credentialIntegrations.length > 0 || includeN8nChat) {
				const integrationRegistry = Container.get(ChatIntegrationRegistry);
				const messageContextStore = Container.get(IntegrationMessageContextService);
				const actionExecutor = Container.get(ChatIntegrationActionExecutor);
				const queryExecutor = Container.get(ChatIntegrationContextQueryExecutor);

				const descriptors = getIntegrationToolConnectionDescriptors(
					credentialIntegrations,
					agentId,
					(integrationConfig) => {
						const integrationDef = integrationRegistry.get(integrationConfig.type);
						return {
							contextQueries: integrationDef?.contextQueries,
							actions: integrationDef?.actions,
						};
					},
				);

				if (includeN8nChat) {
					// Implicit in-app chat channel: credential-less, per-run, fixed
					// tool names (exactly one n8n_chat per run — no suffixing).
					const n8nChat = integrationRegistry.require(N8N_CHAT_INTEGRATION_TYPE);
					descriptors.push({
						agentId,
						integration: { type: N8N_CHAT_INTEGRATION_TYPE },
						integrationConnectionId: N8N_CHAT_INTEGRATION_TYPE,
						contextToolName: N8N_CHAT_CONTEXT_TOOL_NAME,
						actionToolName: N8N_CHAT_ACTION_TOOL_NAME,
						contextQueries: [...n8nChat.contextQueries],
						actions: [...n8nChat.actions],
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

		if (nodeToolsEnabled) {
			agent.tool(this.agentsToolsService.getRuntimeTools(credentialProvider, projectId));
		}

		if (runtimeProfile === 'top-level') {
			await this.attachSubAgentDelegationTool({
				agent,
				config,
				parentAgentId: parentAgentIdForDelegation,
				projectId,
				credentialProvider,
				userId,
				delegation: subAgentDelegation,
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
		userId: string;
		delegation: SubAgentDelegationConfig;
	}): Promise<void> {
		const { agent, config, parentAgentId, projectId, credentialProvider, userId, delegation } =
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
				userId,
				credentialProvider,
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
