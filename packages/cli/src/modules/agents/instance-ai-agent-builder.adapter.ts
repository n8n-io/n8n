import type { ToolContext, ToolDescriptor } from '@n8n/agents';
import type {
	AgentBuilderSkill,
	AgentConfigSnapshot,
	AgentModelOption,
	AttachableWorkflow,
	ChatIntegrationInfo,
	InstanceAiAgentBuilderService,
	McpServerSearchResult,
	McpServerVerifyParams,
	McpServerVerifyResult,
	ModelLookupConfig,
	ProjectAgentSummary,
} from '@n8n/instance-ai';
import type { AgentJsonConfig, AgentJsonMcpServerConfig } from '@n8n/api-types';
import { OutboundHttp, SsrfProtectionService } from '@n8n/backend-network';
import { SsrfProtectionConfig } from '@n8n/config';
import { WorkflowRepository, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { type Scope } from '@n8n/permissions';
import { camelCase } from 'change-case';

import { CredentialsService } from '@/credentials/credentials.service';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { McpRegistryService } from '@/modules/mcp-registry/registry/mcp-registry.service';
import type { McpRegistryServer } from '@/modules/mcp-registry/registry/mcp-registry.types';
import { MCP_REGISTRY_PACKAGE_NAME } from '@/modules/mcp-registry/node-description-transform';
import { NodeCatalogService } from '@/node-catalog/node-catalog.service';
import { NodeTypes } from '@/node-types';
import { OauthService } from '@/oauth/oauth.service';
import { userHasScopes } from '@/permissions.ee/check-access';
import { DynamicNodeParametersService } from '@/services/dynamic-node-parameters.service';
import { ProjectService } from '@/services/project.service.ee';
import { createAiMcpFetch } from '@/utils/ai-proxy-fetch';

import { AgentConfigService } from './agent-config.service';
import { AgentCustomToolsService } from './agent-custom-tools.service';
import { AgentIntegrationPersistenceService } from './agent-integration-persistence.service';
import { AgentSkillsService } from './agent-skills.service';
import { AgentTaskService } from './agent-task.service';
import { AgentsService } from './agents.service';
import { isAgentToolNodeType } from './agents-tools.service';
import { BuilderModelLookupService } from './builder/builder-model-lookup.service';
import { buildGetResourceLocatorOptionsTool } from './builder/get-resource-locator-options.tool';
import { composeJsonConfig } from './json-config/agent-config-composition';
import { buildMcpClientForServer } from './json-config/mcp-client-factory';
import { AgentSecureRuntime } from './runtime/agent-secure-runtime';
import { createAgentCredentialProvider } from './utils/agent-credential-provider';

function pickPreferredRemote(
	server: McpRegistryServer,
): { type: 'streamableHttp' | 'sse'; url: string } | null {
	const streamable = server.remotes.find((remote) => remote.type === 'streamable-http');
	if (streamable) return { type: 'streamableHttp', url: streamable.url };
	const sse = server.remotes.find((remote) => remote.type === 'sse');
	if (sse) return { type: 'sse', url: sse.url };
	return null;
}

function registryServerToResult(server: McpRegistryServer): McpServerSearchResult | null {
	const remote = pickPreferredRemote(server);
	if (!remote) return null;
	const credentialType = `${camelCase(server.slug)}McpOAuth2Api`;
	return {
		name: camelCase(server.slug),
		title: server.title,
		description: server.tagline,
		url: remote.url,
		transport: remote.type,
		authentication: credentialType,
		credentialType,
		tools: server.tools.map((tool) => ({
			name: tool.name,
			...(tool.title ? { title: tool.title } : {}),
		})),
		metadata: { nodeTypeName: `${MCP_REGISTRY_PACKAGE_NAME}.${camelCase(server.slug)}` },
	};
}

function matchesQuery(server: McpRegistryServer, normalizedQueries: string[]): boolean {
	const fields = [
		server.slug,
		camelCase(server.slug),
		server.title,
		server.description,
		server.tagline,
	]
		.filter((field): field is string => typeof field === 'string')
		.map((field) => field.toLowerCase());
	return normalizedQueries.some((query) => fields.some((field) => field.includes(query)));
}

/**
 * Host implementation of the instance-ai agent-builder port. Delegates to the
 * existing agents-module services. `createAdapter` returns a per-request object
 * bound to the calling user + session project (mirrors the per-user adapters in
 * `InstanceAiAdapterService`).
 */
@Service()
export class InstanceAiAgentBuilderAdapterService {
	constructor(
		private readonly agentsService: AgentsService,
		private readonly agentConfigService: AgentConfigService,
		private readonly agentSkillsService: AgentSkillsService,
		private readonly agentTaskService: AgentTaskService,
		private readonly agentCustomToolsService: AgentCustomToolsService,
		private readonly secureRuntime: AgentSecureRuntime,
		private readonly agentIntegrationPersistenceService: AgentIntegrationPersistenceService,
		private readonly builderModelLookupService: BuilderModelLookupService,
		private readonly mcpRegistryService: McpRegistryService,
		private readonly oauthService: OauthService,
		private readonly credentialsService: CredentialsService,
		private readonly projectService: ProjectService,
		private readonly outboundHttp: OutboundHttp,
		private readonly ssrfConfig: SsrfProtectionConfig,
		private readonly ssrfProtectionService: SsrfProtectionService,
		private readonly nodeCatalogService: NodeCatalogService,
		private readonly nodeTypes: NodeTypes,
		private readonly dynamicNodeParametersService: DynamicNodeParametersService,
		private readonly workflowRepository: WorkflowRepository,
	) {}

	createAdapter(user: User, sessionProjectId?: string): InstanceAiAgentBuilderService {
		const resolveProjectId = async (projectId?: string): Promise<string> => {
			if (projectId) return projectId;
			if (sessionProjectId) return sessionProjectId;
			const personal = await this.projectService.getPersonalProject(user);
			if (!personal) throw new Error('No project available to create the agent in.');
			return personal.id;
		};

		// Mirror the `@ProjectScope('agent:*')` guards on the agent REST routes. The
		// adapter calls the agents services directly, bypassing the controller
		// middleware, so a user reaching agent-building via Instance AI must still
		// hold the corresponding project scope before any agent mutation.
		const assertProjectScope = async (scope: Scope, projectId: string): Promise<void> => {
			if (!(await userHasScopes(user, [scope], false, { projectId }))) {
				throw new ForbiddenError('You do not have permission to modify agents in this project.');
			}
		};

		const proxyFetch = createAiMcpFetch(
			this.outboundHttp,
			this.ssrfConfig,
			this.ssrfProtectionService,
		);

		return {
			createAgent: async (name, projectId) => {
				const resolvedProjectId = await resolveProjectId(projectId);
				await assertProjectScope('agent:create', resolvedProjectId);
				const agent = await this.agentsService.create(resolvedProjectId, name);
				return { agentId: agent.id, projectId: resolvedProjectId, name: agent.name };
			},

			getConfigSnapshot: async (agentId, projectId): Promise<AgentConfigSnapshot> => {
				const agent = await this.agentsService.findById(agentId, projectId);
				if (!agent) return { config: null, updatedAt: null, versionId: null };
				return {
					config: composeJsonConfig(agent),
					updatedAt: agent.updatedAt.toISOString(),
					versionId: agent.versionId,
				};
			},

			updateConfig: async (
				agentId,
				projectId,
				config: AgentJsonConfig,
			): Promise<AgentConfigSnapshot> => {
				await assertProjectScope('agent:update', projectId);
				const result = await this.agentConfigService.updateConfig(agentId, projectId, config);
				return { config: result.config, updatedAt: result.updatedAt, versionId: result.versionId };
			},

			createSkill: async (agentId, projectId, skill: AgentBuilderSkill) => {
				await assertProjectScope('agent:update', projectId);
				const created = await this.agentSkillsService.createSkill(agentId, projectId, skill);
				return { id: created.id, skill: created.skill };
			},

			createTask: async (agentId, projectId, task) => {
				await assertProjectScope('agent:update', projectId);
				const created = await this.agentTaskService.create(agentId, {
					name: task.name,
					objective: task.objective,
					cronExpression: task.cronExpression,
					enabled: task.enabled,
				});
				return {
					id: created.id,
					name: created.name,
					objective: created.objective,
					cronExpression: created.cronExpression,
				};
			},

			describeCustomTool: async (code): Promise<ToolDescriptor> =>
				await this.secureRuntime.describeToolSecurely(code),

			buildCustomTool: async (agentId, projectId, code, descriptor) => {
				await assertProjectScope('agent:update', projectId);
				const built = await this.agentCustomToolsService.buildCustomTool(
					agentId,
					projectId,
					code,
					descriptor,
				);
				return { id: built.id };
			},

			listChatIntegrations: async (): Promise<ChatIntegrationInfo[]> =>
				this.agentIntegrationPersistenceService.listChatIntegrations().map((integration) => ({
					type: integration.type,
					credentialTypes: integration.credentialTypes,
					...(integration.capabilities ? { capabilities: integration.capabilities } : {}),
					...(integration.useIntegrationWhen
						? { useIntegrationWhen: integration.useIntegrationWhen }
						: {}),
					...(integration.useNodeToolWhen ? { useNodeToolWhen: integration.useNodeToolWhen } : {}),
				})),

			listProjectAgents: async (projectId, excludeAgentId): Promise<ProjectAgentSummary[]> => {
				const agents = await this.agentsService.findByProjectId(projectId);
				return agents
					.filter((agent) => agent.id !== excludeAgentId && agent.activeVersionId !== null)
					.map((agent) => ({ agentId: agent.id, name: agent.name }));
			},

			listModels: async (
				credentialId,
				credentialType,
				lookup: ModelLookupConfig,
			): Promise<AgentModelOption[]> =>
				await this.builderModelLookupService.list(user, credentialId, credentialType, lookup),

			searchMcpServers: async (queries): Promise<McpServerSearchResult[]> => {
				const normalized = queries
					.map((query) => query.trim().toLowerCase())
					.filter((query) => query.length > 0);
				if (normalized.length === 0) return [];
				const servers = await this.mcpRegistryService.getAll();
				return servers.flatMap((server) => {
					if (!matchesQuery(server, normalized)) return [];
					const result = registryServerToResult(server);
					return result ? [result] : [];
				});
			},

			verifyMcpServer: async (params: McpServerVerifyParams): Promise<McpServerVerifyResult> => {
				const projectId = await resolveProjectId();
				const credentialProvider = createAgentCredentialProvider(
					this.credentialsService,
					projectId,
					user,
				);
				const serverConfig: AgentJsonMcpServerConfig = {
					name: params.name,
					url: params.url,
					transport: params.transport,
					authentication: params.authentication,
					...(params.credentialId ? { credential: params.credentialId } : {}),
					...(params.connectionTimeoutMs !== undefined
						? { connectionTimeoutMs: params.connectionTimeoutMs }
						: {}),
				};
				let client;
				try {
					client = await buildMcpClientForServer(serverConfig, {
						credentialProvider,
						oauthService: this.oauthService,
						projectId,
						proxyFetch,
					});
					const tools = await client.listTools();
					return {
						ok: true,
						tools: tools.map((tool) => ({ name: tool.name, description: tool.description ?? '' })),
					};
				} catch (error) {
					return { ok: false, error: error instanceof Error ? error.message : String(error) };
				} finally {
					await client?.close().catch(() => {});
				}
			},

			searchNodes: async (queries): Promise<unknown> => {
				await this.nodeCatalogService.initialize();
				const { results } = await this.nodeCatalogService.searchNodes(queries, {
					nodeFilter: isAgentToolNodeType,
				});
				return { results };
			},

			resolveResourceLocatorOptions: async (params): Promise<unknown> => {
				const projectId = await resolveProjectId();
				const tool = buildGetResourceLocatorOptionsTool({
					dynamicNodeParametersService: this.dynamicNodeParametersService,
					nodeTypes: this.nodeTypes,
					user,
					projectId,
				});
				return await tool.handler!(params, {} as ToolContext);
			},

			listAttachableWorkflows: async (projectId): Promise<AttachableWorkflow[]> => {
				const resolvedProjectId = await resolveProjectId(projectId);
				const workflows = await this.workflowRepository.find({
					select: ['id', 'name', 'nodes', 'active', 'updatedAt'],
					where: { shared: { projectId: resolvedProjectId } },
					relations: ['shared'],
					order: { updatedAt: 'DESC' },
					take: 100,
				});

				// Keys are dotted n8n node type IDs; the naming-convention rule doesn't apply.
				/* eslint-disable @typescript-eslint/naming-convention */
				const SUPPORTED_TRIGGERS: Record<string, string> = {
					'n8n-nodes-base.manualTrigger': 'manual',
					'n8n-nodes-base.executeWorkflowTrigger': 'executeWorkflow',
					'n8n-nodes-base.chatTrigger': 'chat',
					'n8n-nodes-base.scheduleTrigger': 'schedule',
					'n8n-nodes-base.formTrigger': 'form',
				};
				/* eslint-enable @typescript-eslint/naming-convention */

				return workflows.flatMap((wf) => {
					const triggerNode = (wf.nodes ?? []).find((n) => SUPPORTED_TRIGGERS[n.type]);
					if (!triggerNode) return [];
					return [
						{ name: wf.name, active: wf.active, triggerType: SUPPORTED_TRIGGERS[triggerNode.type] },
					];
				});
			},
		};
	}
}
