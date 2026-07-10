import type { Mocked } from 'vitest';
import type { CredentialProvider } from '@n8n/agents';
import {
	AGENT_SKILL_INSTRUCTIONS_MAX_LENGTH,
	type AgentJsonConfig,
	type AgentTaskDto,
} from '@n8n/api-types';
import type {
	CustomFetch,
	HttpTransport,
	OutboundHttp,
	SsrfProtectionService,
} from '@n8n/backend-network';
import type { SsrfProtectionConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';
import { NodeConnectionTypes } from 'n8n-workflow';

import type { CredentialTypes } from '@/credential-types';
import type { McpRegistryService } from '@/modules/mcp-registry/registry/mcp-registry.service';
import type { NodeTypes } from '@/node-types';
import type { DynamicNodeParametersService } from '@/services/dynamic-node-parameters.service';

import type { AgentConfigService } from '../agent-config.service';
import type { AgentCustomToolsService } from '../agent-custom-tools.service';
import type { AgentIntegrationPersistenceService } from '../agent-integration-persistence.service';
import type { AgentSkillsService } from '../agent-skills.service';
import type { AgentTaskService } from '../agent-task.service';
import type { AgentsToolsService } from '../agents-tools.service';
import type { AgentsService } from '../agents.service';
import type { AttachableWorkflowsService } from '../attachable-workflows.service';
import {
	AgentsBuilderToolsService,
	getAgentConfigHash,
} from '../builder/agents-builder-tools.service';
import type { BuilderModelLiveLookupService } from '../builder/builder-model-live-lookup.service';
import { BUILDER_TOOLS } from '../builder/builder-tool-names';
import type { Agent } from '../entities/agent.entity';
import type { AgentRepository } from '../repositories/agent.repository';
import type { AgentSecureRuntime } from '../runtime/agent-secure-runtime';
import type { AiService } from '@/services/ai.service';

const ctx = {
	resumeData: undefined,
	suspend: vi.fn().mockResolvedValue(undefined as never),
	parentTelemetry: undefined,
};

type BuilderPurposeServices = Pick<AgentsService, 'findById' | 'findByProjectId'> &
	Pick<AgentConfigService, 'updateConfig'> &
	Pick<AgentCustomToolsService, 'buildCustomTool'> &
	Pick<AgentIntegrationPersistenceService, 'listChatIntegrations'> &
	Pick<AgentSkillsService, 'createSkill'>;

function makeService() {
	const agentsService = mock<Pick<AgentsService, 'findById' | 'findByProjectId'>>();
	const agentConfigService = mock<Pick<AgentConfigService, 'updateConfig'>>();
	const agentCustomToolsService = mock<Pick<AgentCustomToolsService, 'buildCustomTool'>>();
	const agentIntegrationPersistenceService =
		mock<Pick<AgentIntegrationPersistenceService, 'listChatIntegrations'>>();
	const agentSkillsService = mock<Pick<AgentSkillsService, 'createSkill'>>();
	const purposeServices = {
		findById: agentsService.findById,
		findByProjectId: agentsService.findByProjectId,
		updateConfig: agentConfigService.updateConfig,
		buildCustomTool: agentCustomToolsService.buildCustomTool,
		listChatIntegrations: agentIntegrationPersistenceService.listChatIntegrations,
		createSkill: agentSkillsService.createSkill,
	} as Mocked<BuilderPurposeServices>;
	const secureRuntime = mock<AgentSecureRuntime>();
	const attachableWorkflowsService = mock<AttachableWorkflowsService>();
	const agentsToolsService = mock<AgentsToolsService>();
	const builderModelLiveLookupService = mock<BuilderModelLiveLookupService>();
	const credentialTypes = mock<CredentialTypes>();
	const mcpRegistryService = mock<McpRegistryService>();
	const agentTaskService = mock<AgentTaskService>();
	const agentRepository = mock<AgentRepository>();
	const aiService = mock<AiService>();
	aiService.isProxyEnabled.mockReturnValue(false);
	const dynamicNodeParametersService = mock<DynamicNodeParametersService>();
	const nodeTypes = mock<NodeTypes>();
	agentsToolsService.getSharedTools.mockReturnValue([]);
	credentialTypes.recognizes.mockReturnValue(true);
	agentsToolsService.getSharedTools.mockReturnValue([]);
	mcpRegistryService.getAll.mockResolvedValue([]);

	const transport = mock<HttpTransport>();
	transport.asCustomFetch.mockReturnValue(vi.fn() as unknown as CustomFetch);
	const outboundHttp = mock<OutboundHttp>();
	outboundHttp.transport.mockReturnValue(transport);

	const service = new AgentsBuilderToolsService(
		agentsService as unknown as AgentsService,
		agentConfigService as unknown as AgentConfigService,
		agentCustomToolsService as unknown as AgentCustomToolsService,
		agentIntegrationPersistenceService as unknown as AgentIntegrationPersistenceService,
		agentSkillsService as unknown as AgentSkillsService,
		secureRuntime,
		attachableWorkflowsService,
		agentsToolsService,
		builderModelLiveLookupService,
		mcpRegistryService,
		mock(),
		credentialTypes,
		agentTaskService,
		agentRepository,
		aiService,
		outboundHttp,
		dynamicNodeParametersService,
		nodeTypes,
		mock<SsrfProtectionConfig>({ enabled: true }),
		mock<SsrfProtectionService>(),
	);

	return {
		service,
		agentsService: purposeServices,
		secureRuntime,
		attachableWorkflowsService,
		agentTaskService,
		agentRepository,
		nodeTypes,
		outboundHttp,
	};
}

const baseConfig: AgentJsonConfig = {
	name: 'Agent One',
	model: 'anthropic/claude-sonnet-4-5',
	credential: 'Anthropic Key',
	instructions: 'Help the user.',
	tools: [],
	skills: [],
};

const fromAiTeamId =
	"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('teamId', 'The Linear team ID to create the issue in', 'string') }}";

const fromAiTitle = "={{ $fromAI('title', 'Issue title', 'string') }}";

function makeLinearNodeTypeWithDynamicTeamId(): ReturnType<NodeTypes['getByNameAndVersion']> {
	return {
		description: {
			displayName: 'Linear Tool',
			name: 'n8n-nodes-base.linearTool',
			group: ['transform'],
			description: 'Use Linear in an agent tool.',
			version: 1.1,
			defaults: { name: 'Linear Tool' },
			inputs: [NodeConnectionTypes.Main],
			outputs: [NodeConnectionTypes.Main],
			properties: [
				{
					displayName: 'Team Name or ID',
					name: 'teamId',
					type: 'options',
					default: '',
					required: true,
					typeOptions: {
						loadOptionsMethod: 'getTeams',
					},
				},
				{
					displayName: 'Title',
					name: 'title',
					type: 'string',
					default: '',
				},
			],
		},
	} as ReturnType<NodeTypes['getByNameAndVersion']>;
}

function makeLinearToolWithFromAiTeamId(): NonNullable<AgentJsonConfig['tools']>[number] {
	return makeLinearToolWithParameters({
		resource: 'issue',
		operation: 'create',
		authentication: 'oAuth2',
		teamId: fromAiTeamId,
		title: fromAiTitle,
	});
}

function makeLinearToolWithParameters(
	nodeParameters: Record<string, unknown>,
): NonNullable<AgentJsonConfig['tools']>[number] {
	return {
		type: 'node',
		name: 'Linear: Create Issue',
		description: 'Create a Linear issue',
		node: {
			nodeType: 'n8n-nodes-base.linearTool',
			nodeTypeVersion: 1.1,
			nodeParameters,
			credentials: {
				linearOAuth2Api: {
					id: 'linear-credential-id',
					name: 'Linear account',
				},
			},
		},
	};
}

function makeAgent(config: AgentJsonConfig = baseConfig): Agent {
	return {
		schema: config,
		integrations: [],
		updatedAt: new Date('2026-01-01T00:00:00.000Z'),
		versionId: 'v1',
		tools: {},
		skills: {},
	} as unknown as Agent;
}

describe('AgentsBuilderToolsService', () => {
	const agentId = 'agent-1';
	const projectId = 'project-1';
	const credentialProvider = mock<CredentialProvider>();
	const user = mock<User>();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('JSON config tools', () => {
		function getJsonTool(service: AgentsBuilderToolsService, name: string) {
			return service
				.getTools(agentId, projectId, credentialProvider, user)
				.json.find((tool) => tool.name === name)!;
		}

		it('registers MCP-specific tools in the builder toolset', () => {
			const { service } = makeService();

			const tools = service.getTools(agentId, projectId, credentialProvider, user).json;
			const toolNames = tools.map((tool) => tool.name);
			expect(toolNames).toContain(BUILDER_TOOLS.VERIFY_MCP_SERVER);
			expect(toolNames).toContain(BUILDER_TOOLS.SEARCH_MCP_SERVERS);
		});

		it('builds verify_mcp_server with OutboundHttp SSRF protection enabled', () => {
			const { service, outboundHttp } = makeService();

			service.getTools(agentId, projectId, credentialProvider, user);

			expect(outboundHttp.transport).toHaveBeenCalledWith(
				expect.not.objectContaining({ ssrf: 'disabled' }),
			);
		});

		it('read_config returns the current config snapshot metadata', async () => {
			const { service, agentsService } = makeService();
			agentsService.findById.mockResolvedValue(makeAgent());

			const result = await getJsonTool(service, BUILDER_TOOLS.READ_CONFIG).handler!({}, ctx);

			expect(result).toEqual({
				ok: true,
				config: { ...baseConfig, integrations: [] },
				configHash: getAgentConfigHash({ ...baseConfig, integrations: [] }),
				updatedAt: '2026-01-01T00:00:00.000Z',
				versionId: 'v1',
			});
		});

		it('list_integration_types returns builder guidance for integration versus node-tool choice', async () => {
			const { service, agentsService } = makeService();
			agentsService.listChatIntegrations.mockReturnValue([
				{
					type: 'linear',
					label: 'Linear',
					icon: 'linear',
					credentialTypes: ['linearOAuth2Api'],
					capabilities: ['Receive Linear issue/comment events'],
					useIntegrationWhen: ['The agent should be chatted with from Linear issues/comments'],
					useNodeToolWhen: ['The agent only needs to create or update Linear tickets'],
				},
			]);

			const result = await getJsonTool(service, BUILDER_TOOLS.LIST_INTEGRATION_TYPES).handler!(
				{},
				ctx,
			);

			expect(result).toEqual([
				{
					type: 'linear',
					label: 'Linear',
					icon: 'linear',
					credentialTypes: ['linearOAuth2Api'],
					capabilities: ['Receive Linear issue/comment events'],
					useIntegrationWhen: ['The agent should be chatted with from Linear issues/comments'],
					useNodeToolWhen: ['The agent only needs to create or update Linear tickets'],
				},
			]);
		});

		it('list_sub_agents returns published same-project agents except the target agent', async () => {
			const { service, agentsService } = makeService();
			agentsService.findByProjectId.mockResolvedValue([
				{
					id: agentId,
					name: 'Current Agent',
					activeVersionId: 'active-current',
				},
				{
					id: 'agent-research',
					name: 'Research Agent',
					activeVersionId: 'active-research',
				},
				{
					id: 'agent-draft',
					name: 'Draft Agent',
					activeVersionId: null,
				},
				{
					id: 'agent-risk',
					name: 'Risk Agent',
					activeVersionId: 'active-risk',
				},
			] as Agent[]);

			const result = await getJsonTool(service, BUILDER_TOOLS.LIST_SUB_AGENTS).handler!({}, ctx);

			expect(agentsService.findByProjectId).toHaveBeenCalledWith(projectId);
			expect(result).toEqual({
				agents: [
					{
						agentId: 'agent-research',
						name: 'Research Agent',
					},
					{
						agentId: 'agent-risk',
						name: 'Risk Agent',
					},
				],
			});
		});

		it('patch_config applies a patch when baseConfigHash matches', async () => {
			const { service, agentsService } = makeService();
			const currentConfig = { ...baseConfig, integrations: [] };
			const updatedConfig = { ...currentConfig, instructions: 'Updated instructions' };
			// updateConfig owns web-search reconciliation now; the builder tool only
			// seeds the default-on flag, so that's all it forwards.
			const normalizedConfig = {
				...updatedConfig,
				config: { webSearch: { enabled: true }, promptCaching: { enabled: true } },
			};
			agentsService.findById.mockResolvedValue(makeAgent(baseConfig));
			agentsService.updateConfig.mockResolvedValue({
				config: normalizedConfig,
				updatedAt: '2026-01-02T00:00:00.000Z',
				versionId: 'v2',
			});

			const result = await getJsonTool(service, BUILDER_TOOLS.PATCH_CONFIG).handler!(
				{
					baseConfigHash: getAgentConfigHash(currentConfig),
					operations: JSON.stringify([
						{ op: 'replace', path: '/instructions', value: 'Updated instructions' },
					]),
				},
				ctx,
			);

			expect(agentsService.updateConfig).toHaveBeenCalledWith(agentId, projectId, normalizedConfig);
			expect(result).toEqual({
				ok: true,
				config: normalizedConfig,
				configHash: getAgentConfigHash(normalizedConfig),
				updatedAt: '2026-01-02T00:00:00.000Z',
				versionId: 'v2',
			});
		});

		it('patch_config rejects stale baseConfigHash without updating', async () => {
			const { service, agentsService } = makeService();
			const currentConfig = { ...baseConfig, integrations: [] };
			agentsService.findById.mockResolvedValue(makeAgent(baseConfig));

			const result = await getJsonTool(service, BUILDER_TOOLS.PATCH_CONFIG).handler!(
				{
					baseConfigHash: 'stale-hash',
					operations: JSON.stringify([
						{ op: 'replace', path: '/instructions', value: 'Updated instructions' },
					]),
				},
				ctx,
			);

			expect(agentsService.updateConfig).not.toHaveBeenCalled();
			expect(result).toEqual({
				ok: false,
				stage: 'stale',
				errors: expect.arrayContaining([expect.objectContaining({ path: '(root)' })]),
				config: currentConfig,
				configHash: getAgentConfigHash(currentConfig),
				updatedAt: '2026-01-01T00:00:00.000Z',
				versionId: 'v1',
			});
		});

		it('patch_config strips legacy schedule integrations from the current snapshot', async () => {
			const { service, agentsService } = makeService();
			const scheduleIntegration = {
				type: 'schedule',
				active: false,
				cronExpression: '0 8 * * 1',
			};
			const currentConfig = {
				...baseConfig,
				integrations: [scheduleIntegration],
			} as unknown as AgentJsonConfig;
			const agent = makeAgent(baseConfig);
			agent.integrations = [scheduleIntegration] as unknown as Agent['integrations'];
			agentsService.findById.mockResolvedValue(agent);
			agentsService.updateConfig.mockResolvedValue({
				config: { ...currentConfig, integrations: [], instructions: 'Updated instructions' },
				updatedAt: '2026-01-02T00:00:00.000Z',
				versionId: 'v2',
			});

			const result = await getJsonTool(service, BUILDER_TOOLS.PATCH_CONFIG).handler!(
				{
					baseConfigHash: getAgentConfigHash(currentConfig),
					operations: JSON.stringify([
						{ op: 'replace', path: '/instructions', value: 'Updated instructions' },
					]),
				},
				ctx,
			);

			expect(result).toEqual(expect.objectContaining({ ok: true }));
			expect(agentsService.updateConfig).toHaveBeenCalledWith(
				agentId,
				projectId,
				expect.objectContaining({
					integrations: [],
					instructions: 'Updated instructions',
				}),
			);
		});

		it('write_config applies a full config when baseConfigHash matches', async () => {
			const { service, agentsService } = makeService();
			const currentConfig = { ...baseConfig, integrations: [] };
			const updatedConfig = { ...currentConfig, instructions: 'Help with support tickets.' };
			// updateConfig owns web-search reconciliation now; the builder tool only
			// seeds the default-on flag, so that's all it forwards.
			const normalizedConfig = {
				...updatedConfig,
				config: { webSearch: { enabled: true }, promptCaching: { enabled: true } },
			};
			agentsService.findById.mockResolvedValue(makeAgent(baseConfig));
			agentsService.updateConfig.mockResolvedValue({
				config: normalizedConfig,
				updatedAt: '2026-01-02T00:00:00.000Z',
				versionId: 'v2',
			});

			const result = await getJsonTool(service, BUILDER_TOOLS.WRITE_CONFIG).handler!(
				{
					baseConfigHash: getAgentConfigHash(currentConfig),
					json: JSON.stringify(updatedConfig),
				},
				ctx,
			);

			expect(agentsService.updateConfig).toHaveBeenCalledWith(agentId, projectId, normalizedConfig);
			expect(result).toEqual({
				ok: true,
				config: normalizedConfig,
				configHash: getAgentConfigHash(normalizedConfig),
				updatedAt: '2026-01-02T00:00:00.000Z',
				versionId: 'v2',
			});
		});

		it('write_config strips legacy schedule integrations before saving', async () => {
			const { service, agentsService } = makeService();
			const currentConfig = { ...baseConfig, integrations: [] };
			const updatedConfig = {
				...currentConfig,
				integrations: [{ type: 'schedule', active: false, cronExpression: '0 8 * * 1' }],
			};
			agentsService.findById.mockResolvedValue(makeAgent(baseConfig));
			agentsService.updateConfig.mockResolvedValue({
				config: { ...updatedConfig, integrations: [] },
				updatedAt: '2026-01-02T00:00:00.000Z',
				versionId: 'v2',
			});

			const result = await getJsonTool(service, BUILDER_TOOLS.WRITE_CONFIG).handler!(
				{
					baseConfigHash: getAgentConfigHash(currentConfig),
					json: JSON.stringify(updatedConfig),
				},
				ctx,
			);

			expect(result).toEqual(expect.objectContaining({ ok: true }));
			expect(agentsService.updateConfig).toHaveBeenCalledWith(
				agentId,
				projectId,
				expect.objectContaining({ integrations: [] }),
			);
		});

		it('write_config rejects $fromAI on dynamic node selector parameters', async () => {
			const { service, agentsService, nodeTypes } = makeService();
			const currentConfig = { ...baseConfig, integrations: [] };
			const updatedConfig: AgentJsonConfig = {
				...currentConfig,
				tools: [makeLinearToolWithFromAiTeamId()],
			};
			agentsService.findById.mockResolvedValue(makeAgent(baseConfig));
			nodeTypes.getByNameAndVersion.mockReturnValue(makeLinearNodeTypeWithDynamicTeamId());

			const result = await getJsonTool(service, BUILDER_TOOLS.WRITE_CONFIG).handler!(
				{
					baseConfigHash: getAgentConfigHash(currentConfig),
					json: JSON.stringify(updatedConfig),
				},
				ctx,
			);

			expect(agentsService.updateConfig).not.toHaveBeenCalled();
			expect(nodeTypes.getByNameAndVersion).toHaveBeenCalledWith('n8n-nodes-base.linearTool', 1.1);
			expect(result).toEqual({
				ok: false,
				errors: [
					expect.objectContaining({
						path: '/tools/0/node/nodeParameters/teamId',
						message: expect.stringContaining('get_resource_locator_options'),
					}),
				],
			});
		});

		it('patch_config rejects $fromAI on dynamic node selector parameters', async () => {
			const { service, agentsService, nodeTypes } = makeService();
			const currentConfig = { ...baseConfig, integrations: [] };
			agentsService.findById.mockResolvedValue(makeAgent(baseConfig));
			nodeTypes.getByNameAndVersion.mockReturnValue(makeLinearNodeTypeWithDynamicTeamId());

			const result = await getJsonTool(service, BUILDER_TOOLS.PATCH_CONFIG).handler!(
				{
					baseConfigHash: getAgentConfigHash(currentConfig),
					operations: JSON.stringify([
						{ op: 'replace', path: '/tools', value: [makeLinearToolWithFromAiTeamId()] },
					]),
				},
				ctx,
			);

			expect(agentsService.updateConfig).not.toHaveBeenCalled();
			expect(result).toEqual({
				ok: false,
				stage: 'schema',
				errors: [
					expect.objectContaining({
						path: '/tools/0/node/nodeParameters/teamId',
						message: expect.stringContaining('agent-builder-resource-locators'),
					}),
				],
			});
		});

		it.each([
			[
				'top-level runtime string fields',
				{
					resource: 'issue',
					operation: 'create',
					authentication: 'oAuth2',
					teamId: 'TEAM-123',
					title: fromAiTitle,
				},
			],
			[
				'nested runtime fields',
				{
					resource: 'issue',
					operation: 'create',
					authentication: 'oAuth2',
					teamId: 'TEAM-123',
					title: fromAiTitle,
					additionalFields: {
						description: "={{ $fromAI('description', 'Issue description', 'string') }}",
					},
				},
			],
			[
				'array runtime fields',
				{
					resource: 'issue',
					operation: 'create',
					authentication: 'oAuth2',
					teamId: 'TEAM-123',
					title: fromAiTitle,
					labels: ["={{ $fromAI('label', 'Issue label', 'string') }}"],
				},
			],
		])('write_config allows $fromAI on %s', async (_caseName, nodeParameters) => {
			const { service, agentsService, nodeTypes } = makeService();
			const currentConfig = { ...baseConfig, integrations: [] };
			const updatedConfig: AgentJsonConfig = {
				...currentConfig,
				tools: [makeLinearToolWithParameters(nodeParameters)],
			};
			// updateConfig owns web-search reconciliation now; the builder tool only
			// seeds the default-on flag, so that's all it forwards.
			const normalizedConfig = {
				...updatedConfig,
				config: { webSearch: { enabled: true }, promptCaching: { enabled: true } },
			};
			agentsService.findById.mockResolvedValue(makeAgent(currentConfig));
			agentsService.updateConfig.mockResolvedValue({
				config: normalizedConfig,
				updatedAt: '2026-01-02T00:00:00.000Z',
				versionId: 'v2',
			});
			nodeTypes.getByNameAndVersion.mockReturnValue(makeLinearNodeTypeWithDynamicTeamId());

			const result = await getJsonTool(service, BUILDER_TOOLS.WRITE_CONFIG).handler!(
				{
					baseConfigHash: getAgentConfigHash(currentConfig),
					json: JSON.stringify(updatedConfig),
				},
				ctx,
			);

			expect(agentsService.updateConfig).toHaveBeenCalledWith(agentId, projectId, normalizedConfig);
			expect(result).toEqual({
				ok: true,
				config: normalizedConfig,
				configHash: getAgentConfigHash(normalizedConfig),
				updatedAt: '2026-01-02T00:00:00.000Z',
				versionId: 'v2',
			});
		});

		it('patch_config allows $fromAI on runtime fields when dynamic selectors are fixed', async () => {
			const { service, agentsService, nodeTypes } = makeService();
			const currentConfig = { ...baseConfig, integrations: [] };
			const nodeTool = makeLinearToolWithParameters({
				resource: 'issue',
				operation: 'create',
				authentication: 'oAuth2',
				teamId: 'TEAM-123',
				title: fromAiTitle,
				additionalFields: {
					description: "={{ $fromAI('description', 'Issue description', 'string') }}",
				},
			});
			const updatedConfig: AgentJsonConfig = {
				...currentConfig,
				tools: [nodeTool],
			};
			// updateConfig owns web-search reconciliation now; the builder tool only
			// seeds the default-on flag, so that's all it forwards.
			const normalizedConfig = {
				...updatedConfig,
				config: { webSearch: { enabled: true }, promptCaching: { enabled: true } },
			};
			agentsService.findById.mockResolvedValue(makeAgent(currentConfig));
			agentsService.updateConfig.mockResolvedValue({
				config: normalizedConfig,
				updatedAt: '2026-01-02T00:00:00.000Z',
				versionId: 'v2',
			});
			nodeTypes.getByNameAndVersion.mockReturnValue(makeLinearNodeTypeWithDynamicTeamId());

			const result = await getJsonTool(service, BUILDER_TOOLS.PATCH_CONFIG).handler!(
				{
					baseConfigHash: getAgentConfigHash(currentConfig),
					operations: JSON.stringify([{ op: 'replace', path: '/tools', value: [nodeTool] }]),
				},
				ctx,
			);

			expect(agentsService.updateConfig).toHaveBeenCalledWith(agentId, projectId, normalizedConfig);
			expect(result).toEqual({
				ok: true,
				config: normalizedConfig,
				configHash: getAgentConfigHash(normalizedConfig),
				updatedAt: '2026-01-02T00:00:00.000Z',
				versionId: 'v2',
			});
		});

		it('write_config allows unrelated edits when an existing dynamic selector already uses $fromAI', async () => {
			const { service, agentsService, nodeTypes } = makeService();
			const currentConfig: AgentJsonConfig = {
				...baseConfig,
				integrations: [],
				tools: [makeLinearToolWithFromAiTeamId()],
			};
			const updatedConfig = {
				...currentConfig,
				instructions: 'Help with approved support tickets.',
			};
			// updateConfig owns web-search reconciliation now; the builder tool only
			// seeds the default-on flag, so that's all it forwards.
			const normalizedConfig = {
				...updatedConfig,
				config: { webSearch: { enabled: true }, promptCaching: { enabled: true } },
			};
			agentsService.findById.mockResolvedValue(makeAgent(currentConfig));
			agentsService.updateConfig.mockResolvedValue({
				config: normalizedConfig,
				updatedAt: '2026-01-02T00:00:00.000Z',
				versionId: 'v2',
			});
			nodeTypes.getByNameAndVersion.mockReturnValue(makeLinearNodeTypeWithDynamicTeamId());

			const result = await getJsonTool(service, BUILDER_TOOLS.WRITE_CONFIG).handler!(
				{
					baseConfigHash: getAgentConfigHash(currentConfig),
					json: JSON.stringify(updatedConfig),
				},
				ctx,
			);

			expect(agentsService.updateConfig).toHaveBeenCalledWith(agentId, projectId, normalizedConfig);
			expect(result).toEqual({
				ok: true,
				config: normalizedConfig,
				configHash: getAgentConfigHash(normalizedConfig),
				updatedAt: '2026-01-02T00:00:00.000Z',
				versionId: 'v2',
			});
		});

		it('patch_config allows unrelated edits when an existing dynamic selector already uses $fromAI', async () => {
			const { service, agentsService, nodeTypes } = makeService();
			const currentConfig: AgentJsonConfig = {
				...baseConfig,
				integrations: [],
				tools: [makeLinearToolWithFromAiTeamId()],
			};
			const updatedConfig = {
				...currentConfig,
				instructions: 'Updated instructions',
			};
			// updateConfig owns web-search reconciliation now; the builder tool only
			// seeds the default-on flag, so that's all it forwards.
			const normalizedConfig = {
				...updatedConfig,
				config: { webSearch: { enabled: true }, promptCaching: { enabled: true } },
			};
			agentsService.findById.mockResolvedValue(makeAgent(currentConfig));
			agentsService.updateConfig.mockResolvedValue({
				config: normalizedConfig,
				updatedAt: '2026-01-02T00:00:00.000Z',
				versionId: 'v2',
			});
			nodeTypes.getByNameAndVersion.mockReturnValue(makeLinearNodeTypeWithDynamicTeamId());

			const result = await getJsonTool(service, BUILDER_TOOLS.PATCH_CONFIG).handler!(
				{
					baseConfigHash: getAgentConfigHash(currentConfig),
					operations: JSON.stringify([
						{ op: 'replace', path: '/instructions', value: 'Updated instructions' },
					]),
				},
				ctx,
			);

			expect(agentsService.updateConfig).toHaveBeenCalledWith(agentId, projectId, normalizedConfig);
			expect(result).toEqual({
				ok: true,
				config: normalizedConfig,
				configHash: getAgentConfigHash(normalizedConfig),
				updatedAt: '2026-01-02T00:00:00.000Z',
				versionId: 'v2',
			});
		});

		// Native web-search provider-tool derivation (add defaults, fill missing
		// settings, swap on provider change, strip stale tools for fallback
		// providers) now lives in AgentConfigService.updateConfig and is covered by
		// config-normalization.test.ts.

		it('write_config rejects native web search for unsupported providers', async () => {
			const { service, agentsService } = makeService();
			const currentConfig = { ...baseConfig, integrations: [] };
			const updatedConfig: AgentJsonConfig = {
				...currentConfig,
				model: 'xai/grok-4',
				config: { webSearch: { enabled: true }, toolCallConcurrency: 2 },
				providerTools: {
					'openai.web_search': { externalWebAccess: true, searchContextSize: 'medium' },
					'openai.image_generation': {},
				},
			};
			agentsService.findById.mockResolvedValue(makeAgent(baseConfig));

			const result = await getJsonTool(service, BUILDER_TOOLS.WRITE_CONFIG).handler!(
				{
					baseConfigHash: getAgentConfigHash(currentConfig),
					json: JSON.stringify(updatedConfig),
				},
				ctx,
			);

			expect(result).toEqual({
				ok: false,
				errors: [
					{
						path: '/config/webSearch/provider',
						message:
							'Native web search is only supported for Anthropic and OpenAI models. Use Brave or SearXNG fallback web search for this model.',
					},
				],
			});
			expect(agentsService.updateConfig).not.toHaveBeenCalled();
		});

		it('write_config rejects auto web search for unsupported providers', async () => {
			const { service, agentsService } = makeService();
			const currentConfig = { ...baseConfig, integrations: [] };
			const updatedConfig: AgentJsonConfig = {
				...currentConfig,
				model: 'xai/grok-4',
				config: { webSearch: { enabled: true, provider: 'auto' } },
			};
			agentsService.findById.mockResolvedValue(makeAgent(baseConfig));

			const result = await getJsonTool(service, BUILDER_TOOLS.WRITE_CONFIG).handler!(
				{
					baseConfigHash: getAgentConfigHash(currentConfig),
					json: JSON.stringify(updatedConfig),
				},
				ctx,
			);

			expect(result).toEqual({
				ok: false,
				errors: [
					{
						path: '/config/webSearch/provider',
						message:
							'Native web search is only supported for Anthropic and OpenAI models. Use Brave or SearXNG fallback web search for this model.',
					},
				],
			});
			expect(agentsService.updateConfig).not.toHaveBeenCalled();
		});

		it('write_config rejects draft LLM config without updating', async () => {
			const { service, agentsService } = makeService();
			const currentConfig = { ...baseConfig, integrations: [] };
			const draftConfig = { ...currentConfig, model: '', credential: undefined };
			agentsService.findById.mockResolvedValue(makeAgent(baseConfig));

			const result = await getJsonTool(service, BUILDER_TOOLS.WRITE_CONFIG).handler!(
				{
					baseConfigHash: getAgentConfigHash(currentConfig),
					json: JSON.stringify(draftConfig),
				},
				ctx,
			);

			expect(agentsService.updateConfig).not.toHaveBeenCalled();
			expect(result).toEqual({
				ok: false,
				errors: expect.arrayContaining([
					expect.objectContaining({ path: 'model' }),
					expect.objectContaining({ path: 'credential' }),
				]),
			});
		});

		it('write_config rejects stale baseConfigHash without updating', async () => {
			const { service, agentsService } = makeService();
			const currentConfig = { ...baseConfig, integrations: [] };
			const updatedConfig = { ...currentConfig, instructions: 'Help with support tickets.' };
			agentsService.findById.mockResolvedValue(makeAgent(baseConfig));

			const result = await getJsonTool(service, BUILDER_TOOLS.WRITE_CONFIG).handler!(
				{
					baseConfigHash: 'stale-hash',
					json: JSON.stringify(updatedConfig),
				},
				ctx,
			);

			expect(agentsService.updateConfig).not.toHaveBeenCalled();
			expect(result).toEqual({
				ok: false,
				stage: 'stale',
				errors: expect.arrayContaining([expect.objectContaining({ path: '(root)' })]),
				config: currentConfig,
				configHash: getAgentConfigHash(currentConfig),
				updatedAt: '2026-01-01T00:00:00.000Z',
				versionId: 'v1',
			});
		});

		describe('prompt caching defaults', () => {
			it('write_config defaults prompt caching to enabled for a supported provider when omitted', async () => {
				const { service, agentsService } = makeService();
				const currentConfig = { ...baseConfig, integrations: [] };
				// Explicitly disable web search so its own write-path normalizer
				// doesn't add unrelated config/providerTools keys to the expectation.
				const updatedConfig: AgentJsonConfig = {
					...currentConfig,
					config: { webSearch: { enabled: false } },
				};
				const normalizedConfig = {
					...currentConfig,
					config: { webSearch: { enabled: false }, promptCaching: { enabled: true } },
				};
				agentsService.findById.mockResolvedValue(makeAgent(baseConfig));
				agentsService.updateConfig.mockResolvedValue({
					config: normalizedConfig,
					updatedAt: '2026-01-02T00:00:00.000Z',
					versionId: 'v2',
				});

				await getJsonTool(service, BUILDER_TOOLS.WRITE_CONFIG).handler!(
					{
						baseConfigHash: getAgentConfigHash(currentConfig),
						json: JSON.stringify(updatedConfig),
					},
					ctx,
				);

				expect(agentsService.updateConfig).toHaveBeenCalledWith(
					agentId,
					projectId,
					normalizedConfig,
				);
			});

			it('write_config strips prompt caching when switching to an unsupported provider', async () => {
				const { service, agentsService } = makeService();
				const baseAgent = {
					...baseConfig,
					integrations: [],
					config: { promptCaching: { enabled: true } },
				};
				const currentConfig = { ...baseAgent };
				const updatedConfig: AgentJsonConfig = {
					...currentConfig,
					model: 'google/gemini-2.5-flash',
					credential: 'Google Key',
				};
				const { config: _droppedConfig, ...normalizedConfig } = updatedConfig;
				agentsService.findById.mockResolvedValue(makeAgent(baseAgent));
				agentsService.updateConfig.mockResolvedValue({
					config: normalizedConfig,
					updatedAt: '2026-01-02T00:00:00.000Z',
					versionId: 'v2',
				});

				await getJsonTool(service, BUILDER_TOOLS.WRITE_CONFIG).handler!(
					{
						baseConfigHash: getAgentConfigHash(currentConfig),
						json: JSON.stringify(updatedConfig),
					},
					ctx,
				);

				expect(agentsService.updateConfig).toHaveBeenCalledWith(
					agentId,
					projectId,
					normalizedConfig,
				);
			});

			it('write_config force-enables prompt caching even when the config says enabled: false', async () => {
				const { service, agentsService } = makeService();
				const baseAgent = {
					...baseConfig,
					model: 'openai/gpt-5',
					credential: 'OpenAI Key',
					integrations: [],
					config: { promptCaching: { enabled: false } },
				};
				const currentConfig = { ...baseAgent };
				const updatedConfig: AgentJsonConfig = {
					...currentConfig,
					model: 'anthropic/claude-sonnet-4-5',
					credential: 'Anthropic Key',
					config: { webSearch: { enabled: false }, promptCaching: { enabled: false } },
				};
				const normalizedConfig = {
					...currentConfig,
					model: 'anthropic/claude-sonnet-4-5',
					credential: 'Anthropic Key',
					config: { webSearch: { enabled: false }, promptCaching: { enabled: true } },
				};
				agentsService.findById.mockResolvedValue(makeAgent(baseAgent));
				agentsService.updateConfig.mockResolvedValue({
					config: normalizedConfig,
					updatedAt: '2026-01-02T00:00:00.000Z',
					versionId: 'v2',
				});

				await getJsonTool(service, BUILDER_TOOLS.WRITE_CONFIG).handler!(
					{
						baseConfigHash: getAgentConfigHash(currentConfig),
						json: JSON.stringify(updatedConfig),
					},
					ctx,
				);

				expect(agentsService.updateConfig).toHaveBeenCalledWith(
					agentId,
					projectId,
					normalizedConfig,
				);
			});

			it('write_config preserves an explicit Anthropic ttl', async () => {
				const { service, agentsService } = makeService();
				const baseAgent = {
					...baseConfig,
					integrations: [],
					config: { promptCaching: { enabled: true, anthropic: { ttl: '5m' as const } } },
				};
				const currentConfig = { ...baseAgent };
				const updatedConfig: AgentJsonConfig = {
					...currentConfig,
					instructions: 'Updated instructions.',
					config: {
						webSearch: { enabled: false },
						promptCaching: { enabled: true, anthropic: { ttl: '5m' } },
					},
				};
				const normalizedConfig = {
					...currentConfig,
					instructions: 'Updated instructions.',
					config: {
						webSearch: { enabled: false },
						promptCaching: { enabled: true, anthropic: { ttl: '5m' as const } },
					},
				};
				agentsService.findById.mockResolvedValue(makeAgent(baseAgent));
				agentsService.updateConfig.mockResolvedValue({
					config: normalizedConfig,
					updatedAt: '2026-01-02T00:00:00.000Z',
					versionId: 'v2',
				});

				await getJsonTool(service, BUILDER_TOOLS.WRITE_CONFIG).handler!(
					{
						baseConfigHash: getAgentConfigHash(currentConfig),
						json: JSON.stringify(updatedConfig),
					},
					ctx,
				);

				expect(agentsService.updateConfig).toHaveBeenCalledWith(
					agentId,
					projectId,
					normalizedConfig,
				);
			});
		});
	});

	describe('list_workflows tool', () => {
		function getListWorkflowsTool(service: AgentsBuilderToolsService) {
			return service
				.getTools(agentId, projectId, credentialProvider, user)
				.shared.find((tool) => tool.name === 'list_workflows')!;
		}

		it('passes the search term to the attachable workflows service', async () => {
			const { service, attachableWorkflowsService } = makeService();
			attachableWorkflowsService.list.mockResolvedValue([
				{ name: 'Billing follow-up', active: true, triggerType: 'manual' },
			]);

			const result = await getListWorkflowsTool(service).handler!({ searchTerm: 'billing' }, ctx);

			expect(attachableWorkflowsService.list).toHaveBeenCalledWith(user, projectId, 'billing');
			expect(result).toEqual({
				workflows: [{ name: 'Billing follow-up', active: true, triggerType: 'manual' }],
			});
		});
	});

	describe('build_custom_tool tool', () => {
		function getBuildCustomTool(service: AgentsBuilderToolsService) {
			return service
				.getTools(agentId, projectId, credentialProvider, user)
				.shared.find((tool) => tool.name === BUILDER_TOOLS.BUILD_CUSTOM_TOOL)!;
		}

		it('stores a custom tool and returns the tool name as id', async () => {
			const { service, agentsService, secureRuntime } = makeService();
			const descriptor = {
				name: 'seo_analyzer',
				description: 'Analyze SEO issues',
				systemInstruction: null,
				inputSchema: null,
				outputSchema: null,
				hasSuspend: false,
				hasResume: false,
				hasToMessage: false,
				requireApproval: false,
				providerOptions: null,
			};
			secureRuntime.describeToolSecurely.mockResolvedValue(descriptor);
			agentsService.buildCustomTool.mockResolvedValue({
				ok: true,
				id: 'seo_analyzer',
				descriptor,
			});

			const result = await getBuildCustomTool(service).handler!(
				{ code: 'export default new Tool("seo_analyzer")' },
				ctx,
			);

			expect(agentsService.buildCustomTool).toHaveBeenCalledWith(
				agentId,
				projectId,
				'export default new Tool("seo_analyzer")',
				descriptor,
			);
			expect(result).toEqual({
				ok: true,
				id: 'seo_analyzer',
				descriptor,
			});
		});
	});

	describe('create_skill tool', () => {
		function getCreateSkillTool(service: AgentsBuilderToolsService) {
			return service
				.getTools(agentId, projectId, credentialProvider, user)
				.shared.find((tool) => tool.name === BUILDER_TOOLS.CREATE_SKILL)!;
		}

		it('is available to the builder with config attachment guidance', () => {
			const { service } = makeService();

			const tool = getCreateSkillTool(service);

			expect(tool).toBeDefined();
			expect(tool.description).toContain('does NOT attach the skill to the agent config');
			expect(tool.description).toContain('patch_config');
			expect(tool.description).toContain('when to load it');
			expect(tool.description).toContain('ask the user clarifying');
			expect(tool.description).toContain('Gotchas');
			expect(tool.description).toContain('References are not automatically loaded');
			expect(tool.description).toContain('instructions must say exactly when to load each one');
			expect(tool.systemInstruction).toContain(
				'explicit conditions for loading each referenced file',
			);
		});

		it('puts the structured body template in the instructions parameter', () => {
			const { service } = makeService();

			const tool = getCreateSkillTool(service);
			const instructionsSchema = (
				tool.inputSchema as unknown as { shape: { instructions: { description?: string } } }
			).shape.instructions;

			for (const heading of [
				'## Overview',
				'## Inputs',
				'## Steps',
				'## Rules',
				'## Example',
				'## Gotchas',
			]) {
				expect(instructionsSchema.description).toContain(heading);
			}
		});

		it('creates a skill and returns the generated skill id', async () => {
			const { service, agentsService } = makeService();
			agentsService.createSkill.mockResolvedValue({
				id: 'skill_0Ab9ZkLm3Pq7Xy2N',
				skill: {
					name: 'Summarize Meetings',
					description: 'Use when summarizing meeting notes',
					instructions: 'Extract decisions and action items.',
				},
				versionId: 'v2',
			});

			const result = await getCreateSkillTool(service).handler!(
				{
					name: 'Summarize Meetings',
					description: 'Use when summarizing meeting notes',
					instructions: 'Extract decisions and action items.',
				},
				ctx,
			);

			expect(agentsService.createSkill).toHaveBeenCalledWith(agentId, projectId, {
				name: 'Summarize Meetings',
				description: 'Use when summarizing meeting notes',
				instructions: 'Extract decisions and action items.',
			});
			expect(result).toEqual({
				ok: true,
				id: 'skill_0Ab9ZkLm3Pq7Xy2N',
				skill: {
					name: 'Summarize Meetings',
					description: 'Use when summarizing meeting notes',
					instructions: 'Extract decisions and action items.',
				},
			});
		});

		it('enforces name and instruction size limits via the input schema', () => {
			const { service } = makeService();

			const result = (
				getCreateSkillTool(service).inputSchema as unknown as {
					safeParse: (input: unknown) => { success: boolean };
				}
			).safeParse({
				name: 'a'.repeat(129),
				description: 'Use when summarizing meeting notes',
				instructions: 'a'.repeat(AGENT_SKILL_INSTRUCTIONS_MAX_LENGTH + 1),
			});

			expect(result.success).toBe(false);
		});
	});

	describe('create_task tool', () => {
		function getCreateTaskTool(service: AgentsBuilderToolsService) {
			return service
				.getTools(agentId, projectId, credentialProvider, user)
				.shared.find((tool) => tool.name === BUILDER_TOOLS.CREATE_TASK)!;
		}

		const publishedAgent = { activeVersionId: 'v1' } as unknown as Agent;
		const unpublishedAgent = { activeVersionId: null } as unknown as Agent;

		const taskInput = {
			name: 'Daily summary',
			objective: 'Summarize the team Slack #general channel from the last 24h and post a recap.',
			cronExpression: '0 9 * * *',
		};

		function makeTaskDto(): AgentTaskDto {
			return {
				id: 'task-1',
				...taskInput,
				createdAt: '2026-01-01T00:00:00.000Z',
				updatedAt: '2026-01-01T00:00:00.000Z',
			};
		}

		it('instructs the builder to clarify before creating a task', () => {
			const { service } = makeService();

			const tool = getCreateTaskTool(service);

			expect(tool).toBeDefined();
			expect(tool.description).toContain('ask the user clarifying questions');
			expect(tool.description).toContain('self-contained');
			expect(tool.description).toContain('MUST NOT');
			expect(tool.description).toContain('Success criteria');
		});

		it('puts the structured objective template in the objective parameter', () => {
			const { service } = makeService();

			const tool = getCreateTaskTool(service);
			const objectiveSchema = (
				tool.inputSchema as unknown as { shape: { objective: { description?: string } } }
			).shape.objective;

			for (const heading of [
				'## Objective',
				'## Context',
				'## Steps',
				'## Output',
				'## Constraints',
				'## Success criteria',
			]) {
				expect(objectiveSchema.description).toContain(heading);
			}
		});

		it('creates a task with the config ref enabled by default', async () => {
			const { service, agentTaskService, agentRepository } = makeService();
			agentRepository.findByIdAndProjectId.mockResolvedValue(publishedAgent);
			agentTaskService.create.mockResolvedValue(makeTaskDto());

			const result = await getCreateTaskTool(service).handler!(taskInput, ctx);

			expect(agentRepository.findByIdAndProjectId).toHaveBeenCalledWith(agentId, projectId);
			expect(agentTaskService.create).toHaveBeenCalledWith(agentId, {
				...taskInput,
				enabled: true,
			});
			expect(result).toEqual({ ok: true, task: makeTaskDto() });
		});

		it('enables the task even when the agent is not published', async () => {
			const { service, agentTaskService, agentRepository } = makeService();
			agentRepository.findByIdAndProjectId.mockResolvedValue(unpublishedAgent);
			agentTaskService.create.mockResolvedValue(makeTaskDto());

			await getCreateTaskTool(service).handler!(taskInput, ctx);

			expect(agentTaskService.create).toHaveBeenCalledWith(agentId, {
				...taskInput,
				enabled: true,
			});
		});

		it('requires a non-empty objective via the input schema', () => {
			const { service } = makeService();

			const result = (
				getCreateTaskTool(service).inputSchema as unknown as {
					safeParse: (input: unknown) => { success: boolean };
				}
			).safeParse({ name: 'x', objective: '', cronExpression: '0 9 * * *' });

			expect(result.success).toBe(false);
		});

		it('surfaces a service error (e.g. invalid cron) to the model', async () => {
			const { service, agentTaskService, agentRepository } = makeService();
			agentRepository.findByIdAndProjectId.mockResolvedValue(publishedAgent);
			agentTaskService.create.mockRejectedValue(new Error('Invalid cron expression'));

			const result = await getCreateTaskTool(service).handler!(taskInput, ctx);

			expect(result).toEqual({ ok: false, errors: [{ message: 'Invalid cron expression' }] });
		});

		it('returns an error when the agent is not in the project', async () => {
			const { service, agentTaskService, agentRepository } = makeService();
			agentRepository.findByIdAndProjectId.mockResolvedValue(null);

			const result = await getCreateTaskTool(service).handler!(taskInput, ctx);

			expect(result).toEqual({ ok: false, errors: [{ message: 'Agent not found' }] });
			expect(agentTaskService.create).not.toHaveBeenCalled();
		});
	});
});
