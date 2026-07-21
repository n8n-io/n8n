import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CredentialProvider } from '@n8n/agents';
import {
	AGENT_MODEL_PROVIDERS,
	AgentIntegrationSchema,
	AgentJsonConfigSchema,
	AgentTelegramSettingsSchema,
	McpAuthenticationSchemaTypes,
	agentSkillSchema,
	agentTaskSchema,
	type AgentJsonConfig,
} from '@n8n/api-types';
import { OutboundHttp, SsrfProtectionService } from '@n8n/backend-network';
import { SsrfProtectionConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import type { Scope } from '@n8n/permissions';
import { UserError } from 'n8n-workflow';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

import { CredentialsService } from '@/credentials/credentials.service';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { AgentConfigService } from '@/modules/agents/agent-config.service';
import { AgentCustomToolsService } from '@/modules/agents/agent-custom-tools.service';
import { AgentIntegrationPersistenceService } from '@/modules/agents/agent-integration-persistence.service';
import { AgentModelCatalogService } from '@/modules/agents/agent-model-catalog.service';
import { AgentPublishService } from '@/modules/agents/agent-publish.service';
import { AgentSkillsService } from '@/modules/agents/agent-skills.service';
import { AgentTaskService } from '@/modules/agents/agent-task.service';
import { AgentValidationService } from '@/modules/agents/agent-validation.service';
import { AgentsService } from '@/modules/agents/agents.service';
import { AttachableWorkflowsService } from '@/modules/agents/attachable-workflows.service';
import type { Agent } from '@/modules/agents/entities/agent.entity';
import { ChatIntegrationRegistry } from '@/modules/agents/integrations/agent-chat-integration';
import { ChatIntegrationService } from '@/modules/agents/integrations/chat-integration.service';
import { composeJsonConfig } from '@/modules/agents/json-config/agent-config-composition';
import { listMcpServerTools } from '@/modules/agents/json-config/mcp-client-factory';
import { filterOfferedAgentModelProviders } from '@/modules/agents/model-catalog';
import { AgentSecureRuntime } from '@/modules/agents/runtime/agent-secure-runtime';
import { getAgentConfigHash } from '@/modules/agents/utils/agent-config-hash';
import { createAgentCredentialProvider } from '@/modules/agents/utils/agent-credential-provider';
import { McpRegistryService } from '@/modules/mcp-registry/registry/mcp-registry.service';
import { OauthService } from '@/oauth/oauth.service';
import { userHasScopes } from '@/permissions.ee/check-access';
import { UrlService } from '@/services/url.service';
import { Telemetry } from '@/telemetry';
import { createAiMcpFetch } from '@/utils/ai-proxy-fetch';

import {
	AGENT_BUILDER_GUIDE,
	AGENT_BUILDER_REFERENCE,
	AGENT_BUILDER_REFERENCE_URI,
	AGENT_CONFIG_JSON_SCHEMA,
} from './agent-reference';
import { USER_CALLED_MCP_TOOL_EVENT } from '../../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../../mcp.types';

const MCP_SERVER_DISCOVERY_LIMIT = 20;

const INTEGRATIONS_NOT_IN_CONFIG_MESSAGE =
	'Integrations are a published runtime surface, not editable config. Use update_agent_integration to connect or disconnect Slack, Telegram, or Linear.';

function integrationsField(config: unknown): unknown {
	return typeof config === 'object' && config !== null && !Array.isArray(config)
		? (config as Record<string, unknown>).integrations
		: undefined;
}

/**
 * True when `next` alters the integrations array relative to `current`. Compared
 * structurally rather than by patch path so no operation — including an
 * ancestor or whole-document replace — can slip an integrations change through.
 */
function integrationsChanged(current: AgentJsonConfig, next: unknown): boolean {
	return (
		JSON.stringify(current.integrations ?? []) !== JSON.stringify(integrationsField(next) ?? [])
	);
}

const TELEGRAM_SETTINGS_JSON_SCHEMA = zodToJsonSchema(AgentTelegramSettingsSchema);

const httpUrlSchema = z
	.string()
	.url()
	.refine((value) => /^https?:\/\//i.test(value), { message: 'Must be a valid HTTP(S) URL' });

const agentIdentityShape = {
	projectId: z.string().min(1).describe('Project containing the Agent'),
	agentId: z.string().min(1).describe('Agent ID'),
} satisfies z.ZodRawShape;

const searchAgentsInput = {
	projectId: z.string().min(1).optional().describe('Restrict results to one project'),
	query: z.string().optional().describe('Filter by Agent name'),
	publishedOnly: z.boolean().optional().default(false),
	excludeAgentId: z.string().optional().describe('Agent ID to omit, useful for sub-agent search'),
	limit: z.number().int().min(1).max(100).optional().default(50),
} satisfies z.ZodRawShape;

const initialAgentConfigSchema = AgentJsonConfigSchema.omit({
	name: true,
	skills: true,
	tasks: true,
	// Integrations are managed only through update_agent_integration.
	integrations: true,
}).superRefine((config, ctx) => {
	if (config.tools?.some((tool) => tool.type === 'custom')) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			path: ['tools'],
			message: 'Create custom tools with mutate_agent after creating the Agent',
		});
	}
});

const createAgentInput = {
	projectId: z.string().min(1),
	name: z.string().trim().min(1).max(128),
	config: initialAgentConfigSchema
		.optional()
		.describe(
			'Optional initial Agent config without name, skills, tasks, or custom tools. The top-level name is injected into the config.',
		),
} satisfies z.ZodRawShape;

const jsonPatchValueSchema = z.union([
	z.null(),
	z.boolean(),
	z.number(),
	z.string(),
	z.array(z.unknown()),
	z.record(z.unknown()),
]);

const jsonPatchOperationSchema = z.discriminatedUnion('op', [
	z.object({ op: z.literal('add'), path: z.string(), value: jsonPatchValueSchema }),
	z.object({ op: z.literal('remove'), path: z.string() }),
	z.object({ op: z.literal('replace'), path: z.string(), value: jsonPatchValueSchema }),
	z.object({ op: z.literal('move'), from: z.string(), path: z.string() }),
	z.object({ op: z.literal('copy'), from: z.string(), path: z.string() }),
	z.object({ op: z.literal('test'), path: z.string(), value: jsonPatchValueSchema }),
]);

const mutationOperationSchema = z.discriminatedUnion('type', [
	z.object({ type: z.literal('config.replace'), config: z.record(z.unknown()) }),
	z.object({
		type: z.literal('config.patch'),
		patch: z.array(jsonPatchOperationSchema).min(1),
	}),
	z.object({
		type: z.literal('skill.upsert'),
		skillId: z.string().optional(),
		skill: agentSkillSchema,
	}),
	z.object({ type: z.literal('skill.delete'), skillId: z.string().min(1) }),
	z.object({
		type: z.literal('task.upsert'),
		taskId: z.string().optional(),
		task: agentTaskSchema,
		enabled: z.boolean().optional(),
	}),
	z.object({ type: z.literal('task.delete'), taskId: z.string().min(1) }),
	z.object({ type: z.literal('customTool.upsert'), code: z.string().min(1) }),
	z.object({ type: z.literal('customTool.delete'), toolId: z.string().min(1) }),
]);

const mutateAgentInput = {
	...agentIdentityShape,
	baseConfigHash: z
		.string()
		.min(1)
		.describe('Latest configHash returned by get_agent or a successful mutation'),
	operation: mutationOperationSchema,
} satisfies z.ZodRawShape;

const discoverAssetsInput = {
	projectId: z.string().min(1),
	kind: z.enum(['models', 'integrations', 'workflows', 'subagents', 'mcpServers']),
	query: z
		.string()
		.trim()
		.min(1)
		.optional()
		.describe('Optional filter for workflows, subagents, or MCP servers'),
	provider: z.enum(AGENT_MODEL_PROVIDERS).optional().describe('Model provider for kind=models'),
	credentialId: z
		.string()
		.min(1)
		.optional()
		.describe('Accessible credential used to verify models for the selected provider'),
	excludeAgentId: z.string().optional().describe('Agent to omit when kind=subagents'),
} satisfies z.ZodRawShape;

const verifyMcpServerInput = {
	projectId: z.string().min(1),
	name: z
		.string()
		.min(1)
		.max(64)
		.regex(/^[a-zA-Z0-9_-]+$/),
	url: httpUrlSchema.describe('HTTP(S) MCP server endpoint'),
	transport: z.enum(['sse', 'streamableHttp']).optional().default('streamableHttp'),
	authentication: z
		.union([McpAuthenticationSchemaTypes, z.string().endsWith('McpOAuth2Api')])
		.optional()
		.default('none')
		.describe('Authentication method; every value other than none requires credential'),
	credential: z
		.string()
		.min(1)
		.optional()
		.describe('Accessible credential ID; required when authentication is not none'),
	connectionTimeoutMs: z.number().int().min(1).max(120_000).optional(),
} satisfies z.ZodRawShape;

const updateIntegrationInput = {
	...agentIdentityShape,
	action: z.enum(['connect', 'disconnect']),
	type: z.string().min(1).describe('Integration type returned by discover_agent_assets'),
	credentialId: z.string().min(1).describe('Accessible credential for this integration'),
	settings: z
		.record(z.unknown())
		.optional()
		.describe('Integration settings; required for Telegram connect operations'),
} satisfies z.ZodRawShape;

const emptyInput = {} satisfies z.ZodRawShape;

type SearchAgentsInput = z.infer<z.ZodObject<typeof searchAgentsInput>>;
type CreateAgentInput = z.infer<z.ZodObject<typeof createAgentInput>>;
type MutateAgentInput = z.infer<z.ZodObject<typeof mutateAgentInput>>;
type DiscoverAssetsInput = z.infer<z.ZodObject<typeof discoverAssetsInput>>;
type VerifyMcpServerInput = z.infer<z.ZodObject<typeof verifyMcpServerInput>>;
type UpdateIntegrationInput = z.infer<z.ZodObject<typeof updateIntegrationInput>>;

type MutationResource = {
	type: 'skill' | 'task' | 'customTool';
	id: string;
};

function toolResult(data: Record<string, unknown>, isError = false) {
	return {
		content: [{ type: 'text' as const, text: JSON.stringify(data) }],
		structuredContent: data,
		...(isError ? { isError: true } : {}),
	};
}

@Service()
export class McpAgentToolsService {
	constructor(
		private readonly telemetry: Telemetry,
		private readonly credentialsService: CredentialsService,
		private readonly agentsService: AgentsService,
		private readonly agentConfigService: AgentConfigService,
		private readonly agentValidationService: AgentValidationService,
		private readonly agentPublishService: AgentPublishService,
		private readonly agentSkillsService: AgentSkillsService,
		private readonly agentTaskService: AgentTaskService,
		private readonly agentCustomToolsService: AgentCustomToolsService,
		private readonly agentSecureRuntime: AgentSecureRuntime,
		private readonly integrationPersistenceService: AgentIntegrationPersistenceService,
		private readonly chatIntegrationService: ChatIntegrationService,
		private readonly chatIntegrationRegistry: ChatIntegrationRegistry,
		private readonly agentModelCatalogService: AgentModelCatalogService,
		private readonly attachableWorkflowsService: AttachableWorkflowsService,
		private readonly mcpRegistryService: McpRegistryService,
		private readonly oauthService: OauthService,
		private readonly outboundHttp: OutboundHttp,
		private readonly ssrfConfig: SsrfProtectionConfig,
		private readonly ssrfProtectionService: SsrfProtectionService,
		private readonly urlService: UrlService,
	) {}

	/**
	 * `allowedToolNames` carries the OAuth grant's scope-derived allow-list
	 * (undefined means a non-scope-bearing credential with full access).
	 */
	registerTools(server: McpServer, user: User, allowedToolNames?: Set<string>): void {
		const registerIfAllowed = <Input extends z.ZodRawShape>(tool: ToolDefinition<Input>): void => {
			if (allowedToolNames && !allowedToolNames.has(tool.name)) return;
			this.register(server, tool);
		};

		registerIfAllowed(this.searchAgentsTool(user));
		registerIfAllowed(this.getAgentTool(user));
		registerIfAllowed(this.createAgentTool(user));
		registerIfAllowed(this.mutateAgentTool(user));
		registerIfAllowed(this.validateAgentTool(user));
		registerIfAllowed(this.publishAgentTool(user));
		registerIfAllowed(this.unpublishAgentTool(user));
		registerIfAllowed(this.deleteAgentTool(user));
		registerIfAllowed(this.discoverAssetsTool(user));
		registerIfAllowed(this.verifyMcpServerTool(user));
		registerIfAllowed(this.updateIntegrationTool(user));
		registerIfAllowed(this.referenceTool(user));

		// The reference resource complements get_agent_builder_reference, so it
		// follows that tool's scope gate.
		if (allowedToolNames && !allowedToolNames.has('get_agent_builder_reference')) return;

		server.resource(
			'agent-builder-reference',
			AGENT_BUILDER_REFERENCE_URI,
			{ description: 'Reference for creating and managing n8n Agents through MCP.' },
			() => ({
				contents: [
					{
						uri: AGENT_BUILDER_REFERENCE_URI,
						mimeType: 'text/markdown',
						text: AGENT_BUILDER_REFERENCE,
					},
				],
			}),
		);
	}

	private register<Input extends z.ZodRawShape>(
		server: McpServer,
		tool: ToolDefinition<Input>,
	): void {
		server.registerTool(tool.name, tool.config, tool.handler);
	}

	private searchAgentsTool(user: User): ToolDefinition<typeof searchAgentsInput> {
		return {
			name: 'search_agents',
			config: {
				description:
					'Search Agents the current user can access. Use publishedOnly and excludeAgentId to discover saved sub-agents. Other agent tools only operate on agents with availableInMCP: true.',
				inputSchema: searchAgentsInput,
				annotations: {
					title: 'Search Agents',
					readOnlyHint: true,
					destructiveHint: false,
					idempotentHint: true,
					openWorldHint: false,
				},
			},
			handler: async (input: SearchAgentsInput) =>
				await this.run(user, 'search_agents', { projectId: input.projectId }, async () => {
					const agents = input.projectId
						? await this.listAgentsInProject(user, input.projectId)
						: await this.listAgentsForUser(user);
					const query = input.query?.trim().toLowerCase();
					const data = agents
						.filter((agent) => !query || agent.name.toLowerCase().includes(query))
						.filter((agent) => !input.publishedOnly || agent.activeVersionId !== null)
						.filter((agent) => agent.id !== input.excludeAgentId)
						.slice(0, input.limit)
						.map((agent) => ({
							id: agent.id,
							name: agent.name,
							projectId: agent.projectId,
							published: agent.activeVersionId !== null,
							availableInMCP: agent.availableInMCP,
							updatedAt: agent.updatedAt.toISOString(),
						}));
					return { ok: true, data, count: data.length };
				}),
		};
	}

	private getAgentTool(user: User): ToolDefinition<typeof agentIdentityShape> {
		return {
			name: 'get_agent',
			config: {
				description:
					'Read an Agent draft, sidecar resources, runnable state, and configHash. Call before mutate_agent.',
				inputSchema: agentIdentityShape,
				annotations: {
					title: 'Get Agent',
					readOnlyHint: true,
					destructiveHint: false,
					idempotentHint: true,
					openWorldHint: false,
				},
			},
			handler: async ({ projectId, agentId }) =>
				await this.run(user, 'get_agent', { projectId, agentId }, async () => {
					await this.assertScope(user, projectId, 'agent:read');
					await this.assertAvailableInMcp(agentId, projectId);
					return { ok: true, ...(await this.getAgentSnapshot(user, projectId, agentId)) };
				}),
		};
	}

	private createAgentTool(user: User): ToolDefinition<typeof createAgentInput> {
		return {
			name: 'create_agent',
			config: {
				description:
					'Create an Agent draft, optionally with its initial model, credential, instructions, and ordinary tool configuration. Returns its n8n editor URL. Use mutate_agent afterward for skills, tasks, and custom tools.',
				inputSchema: createAgentInput,
				annotations: {
					title: 'Create Agent',
					readOnlyHint: false,
					destructiveHint: false,
					idempotentHint: false,
					openWorldHint: false,
				},
			},
			handler: async ({ projectId, name, config }: CreateAgentInput) =>
				await this.run(user, 'create_agent', { projectId }, async () => {
					await this.assertScope(user, projectId, 'agent:create');
					const initialConfig = config ? { ...config, name } : undefined;
					if (initialConfig) {
						const validation = await this.agentConfigService.validateConfig(initialConfig);
						if (!validation.valid) {
							throw new UserError(`Invalid initial Agent config: ${validation.error}`);
						}
					}

					// Agents created over MCP stay operable over MCP.
					const agent = await this.agentsService.create(projectId, name, {
						availableInMCP: true,
					});
					let configHash: string | null;
					let versionId = agent.versionId;
					try {
						if (initialConfig) {
							const result = await this.agentConfigService.updateConfig(
								agent.id,
								projectId,
								initialConfig,
								user,
							);
							configHash = getAgentConfigHash(result.config);
							versionId = result.versionId;
						} else {
							configHash = await this.fetchConfigHash(projectId, agent.id);
						}
					} catch (error) {
						await this.agentsService.delete(agent.id, projectId);
						throw error;
					}

					return {
						ok: true,
						agent: {
							id: agent.id,
							name: agent.name,
							projectId: agent.projectId,
							published: false,
							versionId,
							activeVersionId: agent.activeVersionId,
						},
						configHash,
						url: this.getAgentUrl(projectId, agent.id),
					};
				}),
		};
	}

	private mutateAgentTool(user: User): ToolDefinition<typeof mutateAgentInput> {
		return {
			name: 'mutate_agent',
			config: {
				description:
					'Apply one config, skill, task, or custom-tool mutation to an Agent draft. Returns the next configHash for subsequent mutations.',
				inputSchema: mutateAgentInput,
				annotations: {
					title: 'Mutate Agent',
					readOnlyHint: false,
					destructiveHint: true,
					idempotentHint: false,
					openWorldHint: false,
				},
			},
			handler: async (input: MutateAgentInput) =>
				await this.run(
					user,
					'mutate_agent',
					{ projectId: input.projectId, agentId: input.agentId, type: input.operation.type },
					async () => {
						await this.assertScope(user, input.projectId, 'agent:update');
						await this.assertAvailableInMcp(input.agentId, input.projectId);
						const config = await this.agentConfigService.getConfig(input.agentId, input.projectId);
						const configHash = getAgentConfigHash(config);
						if (configHash !== input.baseConfigHash) {
							return {
								ok: false,
								code: 'stale_config',
								agentId: input.agentId,
								configHash,
								message: 'Call get_agent before retrying the mutation.',
							};
						}

						const { resource, config: newConfig } = await this.applyMutation(user, input, config);
						return {
							ok: true,
							agentId: input.agentId,
							operation: input.operation.type,
							configHash: newConfig
								? getAgentConfigHash(newConfig)
								: await this.fetchConfigHash(input.projectId, input.agentId),
							...(resource ? { resource } : {}),
						};
					},
				),
		};
	}

	private validateAgentTool(user: User): ToolDefinition<typeof agentIdentityShape> {
		return {
			name: 'validate_agent',
			config: {
				description:
					'Validate an Agent draft, sidecar references, and user-accessible credentials. Returns its n8n editor URL.',
				inputSchema: agentIdentityShape,
				annotations: {
					title: 'Validate Agent',
					readOnlyHint: true,
					destructiveHint: false,
					idempotentHint: true,
					openWorldHint: false,
				},
			},
			handler: async ({ projectId, agentId }) =>
				await this.run(user, 'validate_agent', { projectId, agentId }, async () => {
					await this.assertScope(user, projectId, 'agent:read');
					await this.assertAvailableInMcp(agentId, projectId);
					return {
						ok: true,
						...(await this.validateAgent(user, projectId, agentId)),
						url: this.getAgentUrl(projectId, agentId),
					};
				}),
		};
	}

	private publishAgentTool(user: User): ToolDefinition<typeof agentIdentityShape> {
		return {
			name: 'publish_agent',
			config: {
				description:
					'Publish a valid Agent draft and activate its tasks and integrations. Only call after the user explicitly requests or confirms publication; completing a build does not imply approval.',
				inputSchema: agentIdentityShape,
				annotations: {
					title: 'Publish Agent',
					readOnlyHint: false,
					destructiveHint: false,
					idempotentHint: true,
					openWorldHint: true,
				},
			},
			handler: async ({ projectId, agentId }) =>
				await this.run(user, 'publish_agent', { projectId, agentId }, async () => {
					await this.assertScope(user, projectId, 'agent:publish');
					await this.assertAvailableInMcp(agentId, projectId);
					const validation = await this.validateAgent(user, projectId, agentId);
					if (!validation.valid) {
						throw new UserError(
							`Agent is not runnable: ${[...validation.errors, ...validation.missing].join(', ')}`,
						);
					}
					const { agent } = await this.agentPublishService.publishAgent(agentId, projectId, user);
					return {
						ok: true,
						agentId,
						published: true,
						versionId: agent.versionId,
						activeVersionId: agent.activeVersionId,
						url: this.getAgentUrl(projectId, agentId),
					};
				}),
		};
	}

	private unpublishAgentTool(user: User): ToolDefinition<typeof agentIdentityShape> {
		return {
			name: 'unpublish_agent',
			config: {
				description: 'Unpublish an Agent and stop its live tasks and integrations.',
				inputSchema: agentIdentityShape,
				annotations: {
					title: 'Unpublish Agent',
					readOnlyHint: false,
					destructiveHint: true,
					idempotentHint: true,
					openWorldHint: true,
				},
			},
			handler: async ({ projectId, agentId }) =>
				await this.run(user, 'unpublish_agent', { projectId, agentId }, async () => {
					await this.assertScope(user, projectId, 'agent:unpublish');
					await this.assertAvailableInMcp(agentId, projectId);
					const agent = await this.agentPublishService.unpublishAgent(agentId, projectId);
					return {
						ok: true,
						agentId,
						published: false,
						versionId: agent.versionId,
						activeVersionId: agent.activeVersionId,
					};
				}),
		};
	}

	private deleteAgentTool(user: User): ToolDefinition<typeof agentIdentityShape> {
		return {
			name: 'delete_agent',
			config: {
				description: 'Permanently delete an Agent and its associated resources.',
				inputSchema: agentIdentityShape,
				annotations: {
					title: 'Delete Agent',
					readOnlyHint: false,
					destructiveHint: true,
					idempotentHint: true,
					openWorldHint: true,
				},
			},
			handler: async ({ projectId, agentId }) =>
				await this.run(user, 'delete_agent', { projectId, agentId }, async () => {
					await this.assertScope(user, projectId, 'agent:delete');
					await this.assertAvailableInMcp(agentId, projectId);
					const deleted = await this.agentsService.delete(agentId, projectId);
					if (!deleted) throw new UserError(`Agent "${agentId}" not found`);
					return { ok: true, deleted: true, agentId };
				}),
		};
	}

	private discoverAssetsTool(user: User): ToolDefinition<typeof discoverAssetsInput> {
		return {
			name: 'discover_agent_assets',
			config: {
				description:
					'Discover model catalogs, chat integrations, attachable workflows, published sub-agents, or MCP registry servers.',
				inputSchema: discoverAssetsInput,
				annotations: {
					title: 'Discover Agent Assets',
					readOnlyHint: true,
					destructiveHint: false,
					idempotentHint: true,
					openWorldHint: true,
				},
			},
			handler: async (input: DiscoverAssetsInput) =>
				await this.run(
					user,
					'discover_agent_assets',
					{ projectId: input.projectId, kind: input.kind },
					async () => {
						await this.assertScope(user, input.projectId, 'agent:read');
						return {
							ok: true,
							kind: input.kind,
							data: await this.discoverAssets(user, input),
						};
					},
				),
		};
	}

	private verifyMcpServerTool(user: User): ToolDefinition<typeof verifyMcpServerInput> {
		return {
			name: 'verify_agent_mcp_server',
			config: {
				description:
					'Test an MCP server with a user-accessible credential and return its available tools before adding it to an Agent.',
				inputSchema: verifyMcpServerInput,
				annotations: {
					title: 'Verify Agent MCP Server',
					readOnlyHint: true,
					destructiveHint: false,
					idempotentHint: true,
					openWorldHint: true,
				},
			},
			handler: async (input: VerifyMcpServerInput) =>
				await this.run(
					user,
					'verify_agent_mcp_server',
					{ projectId: input.projectId, authentication: input.authentication },
					async () => await this.verifyMcpServer(user, input),
				),
		};
	}

	private updateIntegrationTool(user: User): ToolDefinition<typeof updateIntegrationInput> {
		return {
			name: 'update_agent_integration',
			config: {
				description:
					'Connect or disconnect a Slack, Telegram, or Linear conversation integration. This is the only way to manage integrations; config.replace and config.patch cannot touch them. Connecting publishes the current Agent draft, so only connect after explicit user confirmation.',
				inputSchema: updateIntegrationInput,
				annotations: {
					title: 'Update Agent Integration',
					readOnlyHint: false,
					destructiveHint: true,
					idempotentHint: true,
					openWorldHint: true,
				},
			},
			handler: async (input: UpdateIntegrationInput) =>
				await this.run(
					user,
					'update_agent_integration',
					{
						projectId: input.projectId,
						agentId: input.agentId,
						action: input.action,
						type: input.type,
					},
					async () => await this.updateIntegration(user, input),
				),
		};
	}

	private referenceTool(user: User): ToolDefinition<typeof emptyInput> {
		return {
			name: 'get_agent_builder_reference',
			config: {
				description:
					'Return the required reference for Agent configuration and mutate_agent operations. Read before building an Agent.',
				inputSchema: emptyInput,
				annotations: {
					title: 'Get Agent Builder Reference',
					readOnlyHint: true,
					destructiveHint: false,
					idempotentHint: true,
					openWorldHint: false,
				},
			},
			handler: async () =>
				await this.run(user, 'get_agent_builder_reference', {}, () => ({
					ok: true,
					uri: AGENT_BUILDER_REFERENCE_URI,
					guide: AGENT_BUILDER_GUIDE,
					configSchema: AGENT_CONFIG_JSON_SCHEMA,
				})),
		};
	}

	private async listAgentsInProject(user: User, projectId: string) {
		await this.assertScope(user, projectId, 'agent:list');
		return await this.agentsService.findByProjectId(projectId);
	}

	private async listAgentsForUser(user: User) {
		const agents = await this.agentsService.findByUser(user.id);
		const projectIds = [...new Set(agents.map((agent) => agent.projectId))];
		const allowed = await Promise.all(
			projectIds.map(
				async (projectId) => await userHasScopes(user, ['agent:list'], false, { projectId }),
			),
		);
		const allowedProjects = new Set(projectIds.filter((_, index) => allowed[index]));
		return agents.filter((agent) => allowedProjects.has(agent.projectId));
	}

	private async getAgentSnapshot(user: User, projectId: string, agentId: string) {
		const agent = await this.getAgentOrThrow(agentId, projectId);
		const config = this.configFromEntity(agent);
		const credentialProvider = this.credentialProvider(user, projectId);
		const [runnable, skills, tasks] = await Promise.all([
			this.agentValidationService.validateAgentIsRunnable(agentId, projectId, credentialProvider),
			this.agentSkillsService.listSkills(agentId, projectId),
			this.agentTaskService.list(agentId),
		]);
		const taskEnabled = new Map((config.tasks ?? []).map((task) => [task.id, task.enabled]));

		// The hash covers the full persisted config (integrations included) so it
		// stays consistent with mutate_agent and update_agent_integration, but the
		// config exposed to the client omits integrations: they are a read-only
		// runtime surface reported separately, not part of the editable config.
		const { integrations: _integrations, ...editableConfig } = config;

		return {
			agent: {
				id: agent.id,
				name: agent.name,
				projectId: agent.projectId,
				published: agent.activeVersionId !== null,
				versionId: agent.versionId,
				activeVersionId: agent.activeVersionId,
				createdAt: agent.createdAt.toISOString(),
				updatedAt: agent.updatedAt.toISOString(),
			},
			config: editableConfig,
			configHash: getAgentConfigHash(config),
			isRunnable: runnable.missing.length === 0,
			missing: runnable.missing,
			skills,
			tasks: tasks.map((task) => ({ ...task, enabled: taskEnabled.get(task.id) ?? false })),
			customTools: Object.entries(agent.tools ?? {}).map(([id, tool]) => ({
				id,
				descriptor: tool.descriptor,
			})),
			integrations: agent.integrations ?? [],
		};
	}

	private async fetchConfigHash(projectId: string, agentId: string) {
		return getAgentConfigHash(await this.agentConfigService.getConfig(agentId, projectId));
	}

	private async getAgentOrThrow(agentId: string, projectId: string): Promise<Agent> {
		const agent = await this.agentsService.findById(agentId, projectId);
		if (!agent) throw new UserError(`Agent "${agentId}" not found`);
		return agent;
	}

	/**
	 * Mirrors the per-workflow `availableInMCP` guard in `getMcpWorkflow`: MCP
	 * tools may only operate on agents explicitly made available in MCP.
	 * `search_agents` intentionally still sees every accessible agent so
	 * clients can tell the user what exists.
	 */
	private async assertAvailableInMcp(agentId: string, projectId: string): Promise<Agent> {
		const agent = await this.getAgentOrThrow(agentId, projectId);
		if (!agent.availableInMCP) {
			throw new UserError(
				'Agent is not available in MCP. Enable MCP access from the agents list, or from the MCP settings page.',
			);
		}
		return agent;
	}

	private configFromEntity(agent: Agent): AgentJsonConfig {
		const config = composeJsonConfig(agent);
		if (!config) throw new UserError('Agent has no JSON config yet.');
		return config;
	}

	private getAgentUrl(projectId: string, agentId: string) {
		return `${this.urlService.getInstanceBaseUrl()}/projects/${encodeURIComponent(projectId)}/agents/${encodeURIComponent(agentId)}`;
	}

	/**
	 * Applies one mutation against the stale-checked `config`. Returns the
	 * post-mutation config when the mutation itself produced it; the caller
	 * re-fetches otherwise (sidecar services update config references
	 * internally).
	 */
	private async applyMutation(
		user: User,
		input: MutateAgentInput,
		config: AgentJsonConfig,
	): Promise<{ resource?: MutationResource; config?: AgentJsonConfig }> {
		const { projectId, agentId, operation } = input;
		switch (operation.type) {
			case 'config.replace': {
				if (operation.config.integrations !== undefined) {
					throw new UserError(INTEGRATIONS_NOT_IN_CONFIG_MESSAGE);
				}
				const result = await this.agentConfigService.updateConfig(
					agentId,
					projectId,
					operation.config,
					user,
				);
				return { config: result.config };
			}
			case 'config.patch': {
				const jsonpatch = (await import('fast-json-patch')).default;
				const patchError = jsonpatch.validate(operation.patch, config);
				if (patchError) throw new UserError(patchError.message ?? 'Invalid JSON patch');
				const patched: unknown = jsonpatch.applyPatch(
					jsonpatch.deepClone(config),
					operation.patch,
				).newDocument;
				if (integrationsChanged(config, patched)) {
					throw new UserError(INTEGRATIONS_NOT_IN_CONFIG_MESSAGE);
				}
				const result = await this.agentConfigService.updateConfig(
					agentId,
					projectId,
					patched,
					user,
				);
				return { config: result.config };
			}
			case 'skill.upsert':
				if (operation.skillId) {
					const result = await this.agentSkillsService.updateSkill(
						agentId,
						projectId,
						operation.skillId,
						operation.skill,
					);
					return { resource: { type: 'skill', id: result.id } };
				} else {
					const result = await this.agentSkillsService.createAndAttachSkill(
						agentId,
						projectId,
						operation.skill,
					);
					return { resource: { type: 'skill', id: result.id } };
				}
			case 'skill.delete':
				await this.agentSkillsService.deleteSkill(agentId, projectId, operation.skillId);
				return { resource: { type: 'skill', id: operation.skillId } };
			case 'task.upsert':
				if (operation.taskId) {
					const result = await this.agentTaskService.update(
						agentId,
						operation.taskId,
						operation.task,
					);
					if (operation.enabled !== undefined) {
						await this.setTaskEnabled(
							user,
							agentId,
							projectId,
							operation.taskId,
							operation.enabled,
						);
					}
					return { resource: { type: 'task', id: result.id } };
				} else {
					const result = await this.agentTaskService.create(agentId, {
						...operation.task,
						enabled: operation.enabled ?? true,
					});
					return { resource: { type: 'task', id: result.id } };
				}
			case 'task.delete':
				await this.agentTaskService.delete(agentId, operation.taskId);
				return { resource: { type: 'task', id: operation.taskId } };
			case 'customTool.upsert': {
				const descriptor = await this.agentSecureRuntime.describeToolSecurely(operation.code);
				const built = await this.agentCustomToolsService.buildCustomTool(
					agentId,
					projectId,
					operation.code,
					descriptor,
				);
				if ((config.tools ?? []).some((tool) => tool.type === 'custom' && tool.id === built.id)) {
					return { resource: { type: 'customTool', id: built.id }, config };
				}
				const result = await this.agentConfigService.updateConfig(
					agentId,
					projectId,
					{ ...config, tools: [...(config.tools ?? []), { type: 'custom', id: built.id }] },
					user,
				);
				return { resource: { type: 'customTool', id: built.id }, config: result.config };
			}
			case 'customTool.delete':
				await this.agentCustomToolsService.deleteCustomTool(agentId, projectId, operation.toolId);
				return { resource: { type: 'customTool', id: operation.toolId } };
		}
	}

	private async setTaskEnabled(
		user: User,
		agentId: string,
		projectId: string,
		taskId: string,
		enabled: boolean,
	): Promise<void> {
		const config = await this.agentConfigService.getConfig(agentId, projectId);
		let found = false;
		config.tasks = (config.tasks ?? []).map((task) => {
			if (task.id !== taskId) return task;
			found = true;
			return { ...task, enabled };
		});
		if (!found) throw new UserError(`Task "${taskId}" is not attached to the Agent`);
		await this.agentConfigService.updateConfig(agentId, projectId, config, user);
	}

	private async validateAgent(user: User, projectId: string, agentId: string) {
		const agent = await this.getAgentOrThrow(agentId, projectId);
		const config = this.configFromEntity(agent);
		const credentialProvider = this.credentialProvider(user, projectId);
		// Serve validateAgentIsRunnable's lazy list() from the same single query.
		const credentialsPromise = credentialProvider.list();
		const cachedProvider: CredentialProvider = {
			list: async () => await credentialsPromise,
			resolve: async (credentialId) => await credentialProvider.resolve(credentialId),
		};
		const [schema, runnable, tasks, credentials] = await Promise.all([
			this.agentConfigService.validateConfig(config),
			this.agentValidationService.validateAgentIsRunnable(agentId, projectId, cachedProvider),
			this.agentTaskService.list(agentId),
			credentialsPromise,
		]);
		const errors = schema.valid ? [] : [schema.error];
		const missing = [...runnable.missing];
		const taskIds = new Set(tasks.map((task) => task.id));
		for (const task of config.tasks ?? []) {
			if (!taskIds.has(task.id)) missing.push(`task:${task.id}`);
		}
		for (const tool of config.tools ?? []) {
			if (tool.type === 'custom' && !agent.tools?.[tool.id]) missing.push(`customTool:${tool.id}`);
		}
		const credentialIds = new Set(credentials.map((credential) => credential.id));
		for (const integration of agent.integrations ?? []) {
			if (!credentialIds.has(integration.credentialId)) {
				missing.push(`integration:${integration.type}.credential`);
			}
		}
		const uniqueMissing = [...new Set(missing)];
		return {
			valid: errors.length === 0 && uniqueMissing.length === 0,
			errors,
			missing: uniqueMissing,
		};
	}

	private async discoverAssets(user: User, input: DiscoverAssetsInput): Promise<unknown> {
		switch (input.kind) {
			case 'models':
				if (input.provider) {
					return await this.agentModelCatalogService.getProviderModels(
						user,
						input.projectId,
						input.provider,
						input.credentialId,
					);
				}
				return filterOfferedAgentModelProviders(
					await (await import('@n8n/agents')).fetchProviderCatalog(),
				);
			case 'integrations':
				return this.integrationPersistenceService.listChatIntegrations().map((integration) => ({
					...integration,
					settingsRequired: integration.type === 'telegram',
					...(integration.type === 'telegram'
						? {
								settingsSchema: TELEGRAM_SETTINGS_JSON_SCHEMA,
								settingsGuidance:
									'Pass accessMode=public with allowedUsers=[], or accessMode=private with at least one Telegram user ID or username.',
							}
						: {}),
				}));
			case 'workflows':
				return await this.attachableWorkflowsService.list(user, input.projectId, input.query);
			case 'subagents': {
				const query = input.query?.trim().toLowerCase();
				return (await this.agentsService.findByProjectId(input.projectId))
					.filter((agent) => agent.activeVersionId !== null)
					.filter((agent) => agent.id !== input.excludeAgentId)
					.filter((agent) => !query || agent.name.toLowerCase().includes(query))
					.map((agent) => ({ agentId: agent.id, name: agent.name }));
			}
			case 'mcpServers':
				return input.query
					? await this.mcpRegistryService.search([input.query])
					: await this.mcpRegistryService.list(MCP_SERVER_DISCOVERY_LIMIT);
		}
	}

	private async verifyMcpServer(user: User, input: VerifyMcpServerInput) {
		await this.assertScope(user, input.projectId, 'agent:read');
		const credentialProvider = this.credentialProvider(user, input.projectId);
		if (input.authentication !== 'none') {
			if (!input.credential) {
				throw new UserError('credential is required when authentication is not none');
			}
			await this.requireAccessibleCredential(credentialProvider, input.credential);
		}

		const tools = await listMcpServerTools(
			{
				name: input.name,
				url: input.url,
				transport: input.transport,
				authentication: input.authentication,
				credential: input.credential,
				...(input.connectionTimeoutMs !== undefined
					? { connectionTimeoutMs: input.connectionTimeoutMs }
					: {}),
			},
			{
				credentialProvider,
				oauthService: this.oauthService,
				projectId: input.projectId,
				proxyFetch: createAiMcpFetch(
					this.outboundHttp,
					this.ssrfConfig,
					this.ssrfProtectionService,
				),
			},
		);
		return { ok: true, tools };
	}

	private async updateIntegration(user: User, input: UpdateIntegrationInput) {
		await this.assertScope(user, input.projectId, 'agent:update');
		const agent = await this.assertAvailableInMcp(input.agentId, input.projectId);
		return input.action === 'disconnect'
			? await this.disconnectIntegration(input, agent)
			: await this.connectIntegration(user, input, agent);
	}

	private async disconnectIntegration(input: UpdateIntegrationInput, agent: Agent) {
		const persisted = (agent.integrations ?? []).find(
			(item) => item.type === input.type && item.credentialId === input.credentialId,
		);
		// Mirrors AgentIntegrationsController.disconnectIntegration: tear down
		// the runtime channel even when persistence has no matching record
		// (e.g. the integration was removed via a config mutation).
		const parsed = AgentIntegrationSchema.safeParse({
			type: input.type,
			credentialId: input.credentialId,
		});
		const integration = persisted ?? (parsed.success ? parsed.data : undefined);
		if (integration) {
			await this.chatIntegrationService.disconnectChannel(input.agentId, integration);
		} else {
			await this.chatIntegrationService.disconnect(input.agentId, {
				type: input.type,
				credentialId: input.credentialId,
			});
		}
		await this.integrationPersistenceService.removeCredentialIntegration(
			agent,
			input.type,
			input.credentialId,
			{ broadcast: false },
		);
		return {
			ok: true,
			agentId: input.agentId,
			integration: { type: input.type, credentialId: input.credentialId },
			connected: false,
			published: agent.activeVersionId !== null,
			activeVersionId: agent.activeVersionId,
			configHash: await this.fetchConfigHash(input.projectId, input.agentId),
		};
	}

	private async connectIntegration(user: User, input: UpdateIntegrationInput, agent: Agent) {
		const candidate = {
			type: input.type,
			credentialId: input.credentialId,
			...(input.settings ? { settings: input.settings } : {}),
		};
		const parsed = AgentIntegrationSchema.safeParse(candidate);
		if (!parsed.success) throw new UserError(`Invalid integration: ${parsed.error.message}`);
		if (parsed.data.type === 'telegram' && !parsed.data.settings) {
			throw new UserError('Telegram integration settings are required');
		}

		const credential = await this.requireAccessibleCredential(
			this.credentialProvider(user, input.projectId),
			input.credentialId,
		);
		const implementation = this.chatIntegrationRegistry.require(parsed.data.type);
		if (!implementation.credentialTypes.includes(credential.type)) {
			throw new UserError(
				`${implementation.displayLabel} integrations do not support ${credential.type} credentials`,
			);
		}

		await this.integrationPersistenceService.saveCredentialIntegration(agent, parsed.data, {
			broadcast: false,
		});
		const { agent: publishedAgent } = await this.agentPublishService.publishAgent(
			input.agentId,
			input.projectId,
			user,
			undefined,
			{ syncIntegrations: false },
		);
		await this.chatIntegrationService.connect(input.agentId, parsed.data, input.projectId);
		await this.chatIntegrationService.broadcastIntegrationChange(
			input.agentId,
			parsed.data,
			'connect',
		);
		return {
			ok: true,
			agentId: input.agentId,
			integration: { type: input.type, credentialId: input.credentialId },
			connected: true,
			published: true,
			activeVersionId: publishedAgent.activeVersionId,
			configHash: await this.fetchConfigHash(input.projectId, input.agentId),
		};
	}

	private credentialProvider(user: User, projectId: string): CredentialProvider {
		return createAgentCredentialProvider(this.credentialsService, projectId, user);
	}

	private async requireAccessibleCredential(
		credentialProvider: CredentialProvider,
		credentialId: string,
	) {
		const credential = (await credentialProvider.list()).find((item) => item.id === credentialId);
		if (!credential) throw new UserError('Credential not found or not accessible');
		return credential;
	}

	private async assertScope(user: User, projectId: string, scope: Scope): Promise<void> {
		if (!(await userHasScopes(user, [scope], false, { projectId }))) {
			throw new ForbiddenError('You do not have permission to access agents in this project.');
		}
	}

	private async run(
		user: User,
		toolName: string,
		parameters: Record<string, unknown>,
		action: () => Record<string, unknown> | Promise<Record<string, unknown>>,
	) {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: toolName,
			parameters,
		};
		try {
			const data = await action();
			telemetryPayload.results = { success: data.ok !== false };
			this.telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);
			return toolResult(data, data.ok === false);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			telemetryPayload.results = { success: false, error: message };
			this.telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);
			return toolResult({ ok: false, code: 'agent_tool_error', error: message }, true);
		}
	}
}
