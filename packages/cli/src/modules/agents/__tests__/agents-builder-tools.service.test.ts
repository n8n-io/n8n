import type { Mocked } from 'vitest';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import {
	Agent as SdkAgent,
	type CheckpointStore,
	type CredentialProvider,
	type SerializableAgentState,
	type StreamChunk,
	zodToJsonSchema,
} from '@n8n/agents';
import { APPROVAL_RESUME_SCHEMA } from '@n8n/agents/tool';
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
import { convertArrayToReadableStream, MockLanguageModelV3 } from 'ai/test';
import { NodeConnectionTypes } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { CredentialTypes } from '@/credential-types';
import type { McpRegistryService } from '@/modules/mcp-registry/registry/mcp-registry.service';
import type { NodeTypes } from '@/node-types';
import type { AiGatewayService } from '@/services/ai-gateway.service';
import type { AiService } from '@/services/ai.service';
import type { DynamicNodeParametersService } from '@/services/dynamic-node-parameters.service';
import type { FreeAiCreditsService } from '@/services/free-ai-credits.service';
import type { Telemetry } from '@/telemetry';

import type { AgentConfigService } from '../agent-config.service';
import type { AgentCustomToolsService } from '../agent-custom-tools.service';
import type { AgentIntegrationPersistenceService } from '../agent-integration-persistence.service';
import type { AgentPublishService } from '../agent-publish.service';
import type { AgentSkillsService } from '../agent-skills.service';
import type { AgentTaskService } from '../agent-task.service';
import type { AgentTestRunService } from '../agent-test-run.service';
import type { AgentsToolsService } from '../agents-tools.service';
import type { AgentsService } from '../agents.service';
import type { AttachableWorkflowsService } from '../attachable-workflows.service';
import { AgentsBuilderToolsService } from '../builder/agents-builder-tools.service';
import type { BuilderModelLiveLookupService } from '../builder/builder-model-live-lookup.service';
import { BUILDER_TOOLS } from '../builder/builder-tool-names';
import type { Agent } from '../entities/agent.entity';
import type { AgentSecureRuntime } from '../runtime/agent-secure-runtime';
import { getAgentConfigHash } from '../utils/agent-config-hash';
import * as checkAccess from '@/permissions.ee/check-access';

const ctx = {
	resumeData: undefined,
	suspend: vi.fn().mockResolvedValue(undefined as never),
	parentTelemetry: undefined,
};

const standardApprovalResumeSchema = zodToJsonSchema(APPROVAL_RESUME_SCHEMA)!;

type BuilderPurposeServices = Pick<AgentsService, 'findById' | 'findByProjectId'> &
	Pick<AgentConfigService, 'updateConfig'> &
	Pick<AgentCustomToolsService, 'buildCustomTool'> &
	Pick<AgentIntegrationPersistenceService, 'listChatIntegrations'> &
	Pick<AgentSkillsService, 'createSkills'>;

function makeService() {
	const agentsService = mock<Pick<AgentsService, 'findById' | 'findByProjectId'>>();
	const agentConfigService = mock<Pick<AgentConfigService, 'updateConfig'>>();
	const agentCustomToolsService = mock<Pick<AgentCustomToolsService, 'buildCustomTool'>>();
	const agentIntegrationPersistenceService =
		mock<Pick<AgentIntegrationPersistenceService, 'listChatIntegrations'>>();
	const agentSkillsService = mock<Pick<AgentSkillsService, 'createSkills'>>();
	const purposeServices = {
		findById: agentsService.findById,
		findByProjectId: agentsService.findByProjectId,
		updateConfig: agentConfigService.updateConfig,
		buildCustomTool: agentCustomToolsService.buildCustomTool,
		listChatIntegrations: agentIntegrationPersistenceService.listChatIntegrations,
		createSkills: agentSkillsService.createSkills,
	} as Mocked<BuilderPurposeServices>;
	const secureRuntime = mock<AgentSecureRuntime>();
	const attachableWorkflowsService = mock<AttachableWorkflowsService>();
	const agentsToolsService = mock<AgentsToolsService>();
	const builderModelLiveLookupService = mock<BuilderModelLiveLookupService>();
	const credentialTypes = mock<CredentialTypes>();
	const mcpRegistryService = mock<McpRegistryService>();
	const agentTaskService = mock<AgentTaskService>();
	const agentPublishService = mock<AgentPublishService>();
	const agentTestRunService = mock<AgentTestRunService>();
	const telemetry = mock<Telemetry>();
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
		agentPublishService,
		agentTestRunService,
		aiService,
		mock<AiGatewayService>(),
		outboundHttp,
		dynamicNodeParametersService,
		nodeTypes,
		mock<SsrfProtectionConfig>({ enabled: true }),
		mock<SsrfProtectionService>(),
		mock<FreeAiCreditsService>(),
		telemetry,
	);

	return {
		service,
		agentsService: purposeServices,
		secureRuntime,
		attachableWorkflowsService,
		agentTaskService,
		agentPublishService,
		agentTestRunService,
		nodeTypes,
		outboundHttp,
		telemetry,
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
	const user = mock<User>({ id: 'user-1' });

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
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
			expect(toolNames).toContain(BUILDER_TOOLS.RESOLVE_INTEGRATION);
		});

		it('registers the finish_setup interactive tool in the builder toolset', () => {
			const { service } = makeService();

			const toolNames = service
				.getTools(agentId, projectId, credentialProvider, user)
				.json.map((tool) => tool.name);
			expect(toolNames).toContain(BUILDER_TOOLS.FINISH_SETUP);
		});

		it('registers publish and unpublish tools in the builder toolset', () => {
			const { service } = makeService();

			const toolNames = service
				.getTools(agentId, projectId, credentialProvider, user)
				.json.map((tool) => tool.name);
			expect(toolNames).toContain(BUILDER_TOOLS.PUBLISH_AGENT);
			expect(toolNames).toContain(BUILDER_TOOLS.UNPUBLISH_AGENT);
		});

		it('builds verify_mcp_server with OutboundHttp SSRF protection enabled', () => {
			const { service, outboundHttp } = makeService();

			service.getTools(agentId, projectId, credentialProvider, user);

			expect(outboundHttp.transport).toHaveBeenCalledWith(
				expect.not.objectContaining({ ssrf: 'disabled' }),
			);
		});

		it('read_config returns the full config and its hash, without agent metadata', async () => {
			const { service, agentsService } = makeService();
			agentsService.findById.mockResolvedValue(makeAgent());

			const result = await getJsonTool(service, BUILDER_TOOLS.READ_CONFIG).handler!({}, ctx);

			expect(result).toEqual({
				ok: true,
				config: { ...baseConfig, integrations: [] },
				configHash: getAgentConfigHash({ ...baseConfig, integrations: [] }),
			});
			expect(result).not.toHaveProperty('status');
			expect(result).not.toHaveProperty('configMutated');
		});

		it('write_config success result carries configMutated and agentId', async () => {
			const { service, agentsService } = makeService();
			const currentConfig = { ...baseConfig, integrations: [] };
			const updatedConfig = { ...currentConfig, instructions: 'Help with support tickets.' };
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

			expect(result).toEqual({ ok: true, configMutated: true, agentId });
		});

		it('write_config failure result is not stamped with configMutated', async () => {
			const { service, agentsService } = makeService();
			agentsService.findById.mockResolvedValue(makeAgent(baseConfig));

			const result = await getJsonTool(service, BUILDER_TOOLS.WRITE_CONFIG).handler!(
				{
					baseConfigHash: 'stale-hash',
					json: JSON.stringify(baseConfig),
				},
				ctx,
			);

			expect(result).toEqual(expect.objectContaining({ ok: false }));
			expect(result).not.toHaveProperty('configMutated');
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
			const description = getJsonTool(service, BUILDER_TOOLS.LIST_INTEGRATION_TYPES).description;

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
			expect(description).toContain('pass the selected integration `type` to `configure_channel`');
			expect(description).toContain('never use `ask_credential` for chat-channel credentials');
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

			expect(agentsService.updateConfig).toHaveBeenCalledWith(
				agentId,
				projectId,
				normalizedConfig,
				user,
				{ modifiedBy: 'builder' },
			);
			expect(result).toEqual({ ok: true, configMutated: true, agentId });
		});

		it('patch_config rejects stale baseConfigHash without updating or echoing the config', async () => {
			const { service, agentsService } = makeService();
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
			});
		});

		it('patch_config can remove one integration while preserving siblings', async () => {
			const { service, agentsService } = makeService();
			const currentIntegrations = [
				{ type: 'slack', credentialId: 'slack-1' },
				{ type: 'linear', credentialId: 'linear-1' },
				{
					type: 'telegram',
					credentialId: 'telegram-1',
					settings: { accessMode: 'public' as const, allowedUsers: [] },
				},
			] as NonNullable<AgentJsonConfig['integrations']>;
			const currentConfig = { ...baseConfig, integrations: currentIntegrations };
			const updatedConfig = {
				...currentConfig,
				integrations: [currentIntegrations[0], currentIntegrations[2]],
			};
			const normalizedConfig = {
				...updatedConfig,
				config: { webSearch: { enabled: true }, promptCaching: { enabled: true } },
			};
			const agent = makeAgent(baseConfig);
			agent.integrations = currentIntegrations;
			agentsService.findById.mockResolvedValue(agent);
			agentsService.updateConfig.mockResolvedValue({
				config: normalizedConfig,
				updatedAt: '2026-01-02T00:00:00.000Z',
				versionId: 'v2',
			});

			const result = await getJsonTool(service, BUILDER_TOOLS.PATCH_CONFIG).handler!(
				{
					baseConfigHash: getAgentConfigHash(currentConfig),
					operations: JSON.stringify([{ op: 'remove', path: '/integrations/1' }]),
				},
				ctx,
			);

			expect(agentsService.updateConfig).toHaveBeenCalledWith(
				agentId,
				projectId,
				expect.objectContaining({
					integrations: [currentIntegrations[0], currentIntegrations[2]],
				}),
				user,
				{ modifiedBy: 'builder' },
			);
			expect(result).toEqual({ ok: true, configMutated: true, agentId });
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
				user,
				{ modifiedBy: 'builder' },
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

			expect(agentsService.updateConfig).toHaveBeenCalledWith(
				agentId,
				projectId,
				normalizedConfig,
				user,
				{ modifiedBy: 'builder' },
			);
			expect(result).toEqual({ ok: true, configMutated: true, agentId });
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
				user,
				{ modifiedBy: 'builder' },
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

			expect(agentsService.updateConfig).toHaveBeenCalledWith(
				agentId,
				projectId,
				normalizedConfig,
				user,
				{ modifiedBy: 'builder' },
			);
			expect(result).toEqual({ ok: true, configMutated: true, agentId });
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

			expect(agentsService.updateConfig).toHaveBeenCalledWith(
				agentId,
				projectId,
				normalizedConfig,
				user,
				{ modifiedBy: 'builder' },
			);
			expect(result).toEqual({ ok: true, configMutated: true, agentId });
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

			expect(agentsService.updateConfig).toHaveBeenCalledWith(
				agentId,
				projectId,
				normalizedConfig,
				user,
				{ modifiedBy: 'builder' },
			);
			expect(result).toEqual({ ok: true, configMutated: true, agentId });
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

			expect(agentsService.updateConfig).toHaveBeenCalledWith(
				agentId,
				projectId,
				normalizedConfig,
				user,
				{ modifiedBy: 'builder' },
			);
			expect(result).toEqual({ ok: true, configMutated: true, agentId });
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

		it('write_config accepts a draft config without model and credential', async () => {
			const { service, agentsService } = makeService();
			const { credential: _credential, ...draftBase } = baseConfig;
			const currentDraftConfig = { ...draftBase, model: '', integrations: [] };
			const draftConfig = { ...currentDraftConfig, credential: undefined };
			agentsService.findById.mockResolvedValue(
				makeAgent({ ...draftBase, model: '' } as AgentJsonConfig),
			);
			agentsService.updateConfig.mockResolvedValue({
				config: { ...currentDraftConfig, model: '' },
				updatedAt: '2026-01-02T00:00:00.000Z',
				versionId: 'v2',
			});

			const result = await getJsonTool(service, BUILDER_TOOLS.WRITE_CONFIG).handler!(
				{
					baseConfigHash: getAgentConfigHash(currentDraftConfig),
					json: JSON.stringify(draftConfig),
				},
				ctx,
			);

			expect(result).toEqual({ ok: true, configMutated: true, agentId });
			expect(agentsService.updateConfig).toHaveBeenCalledWith(
				agentId,
				projectId,
				expect.objectContaining({ model: '', instructions: 'Help the user.' }),
				user,
				{ modifiedBy: 'builder' },
			);
		});

		it('write_config still rejects empty instructions on a draft', async () => {
			const { service, agentsService } = makeService();
			const { credential: _credential, ...draftBase } = baseConfig;
			const currentDraftConfig = { ...draftBase, model: '', integrations: [] };
			const draftConfig = { ...currentDraftConfig, instructions: '' };
			agentsService.findById.mockResolvedValue(
				makeAgent({ ...draftBase, model: '' } as AgentJsonConfig),
			);

			const result = await getJsonTool(service, BUILDER_TOOLS.WRITE_CONFIG).handler!(
				{
					baseConfigHash: getAgentConfigHash(currentDraftConfig),
					json: JSON.stringify(draftConfig),
				},
				ctx,
			);

			expect(result).toEqual({
				ok: false,
				errors: [expect.objectContaining({ path: '/instructions' })],
			});
			expect(agentsService.updateConfig).not.toHaveBeenCalled();
		});

		it('write_config rejects a draft payload when the agent already has a model', async () => {
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

			expect(result).toEqual({
				ok: false,
				errors: expect.arrayContaining([expect.objectContaining({ path: 'model' })]),
			});
			expect(agentsService.updateConfig).not.toHaveBeenCalled();
		});

		it('write_config rejects a non-string model with a structured error instead of throwing', async () => {
			const { service, agentsService } = makeService();
			const currentConfig = { ...baseConfig, integrations: [] };
			const malformedConfig = { ...currentConfig, model: 123 };
			agentsService.findById.mockResolvedValue(makeAgent(baseConfig));

			const result = await getJsonTool(service, BUILDER_TOOLS.WRITE_CONFIG).handler!(
				{
					baseConfigHash: getAgentConfigHash(currentConfig),
					json: JSON.stringify(malformedConfig),
				},
				ctx,
			);

			expect(result).toEqual({
				ok: false,
				errors: expect.arrayContaining([expect.objectContaining({ path: 'model' })]),
			});
			expect(agentsService.updateConfig).not.toHaveBeenCalled();
		});

		it('patch_config succeeds on a draft config without model and credential', async () => {
			const { service, agentsService } = makeService();
			const { credential: _credential, ...noCredential } = baseConfig;
			const draftBase = { ...noCredential, model: '' };
			const currentConfig = { ...draftBase, integrations: [] };
			agentsService.findById.mockResolvedValue(makeAgent(draftBase as AgentJsonConfig));
			agentsService.updateConfig.mockResolvedValue({
				config: { ...currentConfig, instructions: 'Triage Slack messages.' },
				updatedAt: '2026-01-02T00:00:00.000Z',
				versionId: 'v2',
			});

			const result = await getJsonTool(service, BUILDER_TOOLS.PATCH_CONFIG).handler!(
				{
					baseConfigHash: getAgentConfigHash(currentConfig),
					operations: JSON.stringify([
						{ op: 'replace', path: '/instructions', value: 'Triage Slack messages.' },
					]),
				},
				ctx,
			);

			expect(result).toEqual({ ok: true, configMutated: true, agentId });
			expect(agentsService.updateConfig).toHaveBeenCalledWith(
				agentId,
				projectId,
				expect.objectContaining({ model: '', instructions: 'Triage Slack messages.' }),
				user,
				{ modifiedBy: 'builder' },
			);
		});

		it('patch_config rejects clearing /model on a configured agent', async () => {
			const { service, agentsService } = makeService();
			const currentConfig = { ...baseConfig, integrations: [] };
			agentsService.findById.mockResolvedValue(makeAgent(baseConfig));

			const result = await getJsonTool(service, BUILDER_TOOLS.PATCH_CONFIG).handler!(
				{
					baseConfigHash: getAgentConfigHash(currentConfig),
					operations: JSON.stringify([{ op: 'replace', path: '/model', value: '' }]),
				},
				ctx,
			);

			expect(result).toEqual({
				ok: false,
				stage: 'schema',
				errors: expect.arrayContaining([expect.objectContaining({ path: 'model' })]),
			});
			expect(agentsService.updateConfig).not.toHaveBeenCalled();
		});

		it('write_config rejects stale baseConfigHash without updating or echoing the config', async () => {
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
					user,
					{ modifiedBy: 'builder' },
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
					user,
					{ modifiedBy: 'builder' },
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
					user,
					{ modifiedBy: 'builder' },
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
					user,
					{ modifiedBy: 'builder' },
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
				{ id: 'wf-1', name: 'Billing follow-up', active: true, triggerType: 'manual' },
			]);

			const result = await getListWorkflowsTool(service).handler!({ searchTerm: 'billing' }, ctx);

			expect(attachableWorkflowsService.list).toHaveBeenCalledWith(user, projectId, 'billing');
			expect(result).toEqual({
				workflows: [{ id: 'wf-1', name: 'Billing follow-up', active: true, triggerType: 'manual' }],
			});
		});
	});

	describe('build_custom_tool tool', () => {
		function getBuildCustomTool(service: AgentsBuilderToolsService) {
			return service
				.getTools(agentId, projectId, credentialProvider, user)
				.shared.find((tool) => tool.name === BUILDER_TOOLS.BUILD_CUSTOM_TOOL)!;
		}

		it('stores a custom tool and returns only its id and name, not the full descriptor', async () => {
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
				{ user, modifiedBy: 'builder' },
			);
			expect(result).toEqual({
				ok: true,
				id: 'seo_analyzer',
				name: 'seo_analyzer',
			});
		});

		it('soft-fails on a build error but rethrows when the run was aborted', async () => {
			const { service, secureRuntime } = makeService();
			secureRuntime.describeToolSecurely.mockRejectedValue(new Error('compile failed'));
			const controller = new AbortController();
			const abortableCtx = { ...ctx, abortSignal: controller.signal };

			await expect(
				getBuildCustomTool(service).handler!({ code: 'broken' }, abortableCtx),
			).resolves.toEqual({ ok: false, errors: [{ message: 'compile failed' }] });

			// The isolate compiles model-authored code, so an abort-shaped error from
			// the generated tool must not be read as a cancellation of the run.
			secureRuntime.describeToolSecurely.mockRejectedValue(new Error('Aborted'));

			await expect(
				getBuildCustomTool(service).handler!({ code: 'broken' }, abortableCtx),
			).resolves.toEqual({ ok: false, errors: [{ message: 'Aborted' }] });

			secureRuntime.describeToolSecurely.mockRejectedValue(new Error('compile failed'));
			controller.abort();

			await expect(
				getBuildCustomTool(service).handler!({ code: 'broken' }, abortableCtx),
			).rejects.toThrow('compile failed');
		});
	});

	describe('create_skills tool', () => {
		function getCreateSkillsTool(service: AgentsBuilderToolsService) {
			return service
				.getTools(agentId, projectId, credentialProvider, user)
				.shared.find((tool) => tool.name === BUILDER_TOOLS.CREATE_SKILLS)!;
		}

		function makeSkillInput(name: string) {
			return {
				name,
				description: 'Use when summarizing meeting notes',
				instructions: 'Extract decisions and action items.',
			};
		}

		it('is available to the builder with batch and config attachment guidance', () => {
			const { service } = makeService();

			const tool = getCreateSkillsTool(service);

			expect(tool).toBeDefined();
			expect(tool.description).toContain('does NOT attach the skills to the agent config');
			expect(tool.description).toContain('patch_config');
			expect(tool.description).toContain('all-or-nothing');
			expect(tool.description).toContain(
				'Pass every skill you currently know how to write in one `skills` array',
			);
			expect(tool.description).toContain('{ ok: true, skills:');
			expect(tool.description).toContain('{ ok: false, errors }');
		});

		it('puts quality and batching guardrails in systemInstruction, not description', () => {
			const { service } = makeService();

			const tool = getCreateSkillsTool(service);

			expect(tool.systemInstruction).toContain('vague or placeholder skill');
			expect(tool.systemInstruction).toContain('ask the user clarifying');
			expect(tool.systemInstruction).toContain('Gotchas');
			expect(tool.systemInstruction).toContain('exact target-agent tool names');
			expect(tool.systemInstruction).toContain('references are not automatically loaded');
			expect(tool.systemInstruction).toContain(
				'instructions must say exactly when to load each one',
			);
			expect(tool.systemInstruction).toContain('Do not invent tool names or reference paths');
			expect(tool.systemInstruction).toContain('Batch every skill');
			expect(tool.description).not.toContain('ask the user clarifying');
			expect(tool.description).not.toContain('Gotchas');
		});

		it('puts the structured body template in each skill instructions parameter', () => {
			const { service } = makeService();

			const tool = getCreateSkillsTool(service);
			const instructionsSchema = (
				tool.inputSchema as unknown as {
					shape: { skills: { element: { shape: { instructions: { description?: string } } } } };
				}
			).shape.skills.element.shape.instructions;

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

		it('creates multiple skills in one call and returns only ids and names, not the bodies, in order', async () => {
			const { service, agentsService } = makeService();
			const skillOne = {
				name: 'Summarize Meetings',
				description: 'Use when summarizing meeting notes',
				instructions: 'Extract decisions and action items.',
			};
			const skillTwo = {
				name: 'Draft Follow-up',
				description: 'Use when drafting a follow-up email',
				instructions: 'Summarize next steps and send a draft.',
			};
			agentsService.createSkills.mockResolvedValue([
				{ id: 'skill_0Ab9ZkLm3Pq7Xy2N', skill: skillOne, versionId: 'v2' },
				{ id: 'skill_1Cd8YkNm4Rz6Wv3M', skill: skillTwo, versionId: 'v2' },
			]);

			const result = await getCreateSkillsTool(service).handler!(
				{ skills: [skillOne, skillTwo] },
				ctx,
			);

			expect(agentsService.createSkills).toHaveBeenCalledWith(
				agentId,
				projectId,
				[skillOne, skillTwo],
				{ user, modifiedBy: 'builder' },
			);
			expect(result).toEqual({
				ok: true,
				skills: [
					{ id: 'skill_0Ab9ZkLm3Pq7Xy2N', name: skillOne.name },
					{ id: 'skill_1Cd8YkNm4Rz6Wv3M', name: skillTwo.name },
				],
			});
		});

		it('surfaces a service error (e.g. duplicate name) for the whole batch', async () => {
			const { service, agentsService } = makeService();
			agentsService.createSkills.mockRejectedValue(
				new Error('Agent already has a skill named "Summarize Meetings".'),
			);

			const result = await getCreateSkillsTool(service).handler!(
				{ skills: [makeSkillInput('Summarize Meetings')] },
				ctx,
			);

			expect(result).toEqual({
				ok: false,
				errors: [{ message: 'Agent already has a skill named "Summarize Meetings".' }],
			});
		});

		it('rejects an empty skills array via the input schema', () => {
			const { service } = makeService();

			const result = (
				getCreateSkillsTool(service).inputSchema as unknown as {
					safeParse: (input: unknown) => { success: boolean };
				}
			).safeParse({ skills: [] });

			expect(result.success).toBe(false);
		});

		it('enforces name and instruction size limits via the input schema', () => {
			const { service } = makeService();

			const result = (
				getCreateSkillsTool(service).inputSchema as unknown as {
					safeParse: (input: unknown) => { success: boolean };
				}
			).safeParse({
				skills: [
					{
						name: 'a'.repeat(129),
						description: 'Use when summarizing meeting notes',
						instructions: 'a'.repeat(AGENT_SKILL_INSTRUCTIONS_MAX_LENGTH + 1),
					},
				],
			});

			expect(result.success).toBe(false);
		});
	});

	describe('create_tasks tool', () => {
		function getCreateTasksTool(service: AgentsBuilderToolsService) {
			return service
				.getTools(agentId, projectId, credentialProvider, user)
				.shared.find((tool) => tool.name === BUILDER_TOOLS.CREATE_TASKS)!;
		}

		const taskOneInput = {
			name: 'Daily summary',
			objective: 'Summarize the team Slack #general channel from the last 24h and post a recap.',
			cronExpression: '0 9 * * *',
		};
		const taskTwoInput = {
			name: 'Weekly digest',
			objective: 'Summarize the week across #general and email a digest to the team.',
			cronExpression: '0 9 * * 1',
		};

		function makeTaskDto(overrides: Partial<AgentTaskDto> = {}): AgentTaskDto {
			return {
				id: 'task-1',
				...taskOneInput,
				createdAt: '2026-01-01T00:00:00.000Z',
				updatedAt: '2026-01-01T00:00:00.000Z',
				...overrides,
			};
		}

		it('is available to the builder with batch and config attachment guidance', () => {
			const { service } = makeService();

			const tool = getCreateTasksTool(service);

			expect(tool).toBeDefined();
			expect(tool.description).toContain('all-or-nothing');
			expect(tool.description).toContain(
				'Pass every task you currently know how to write in one `tasks` array',
			);
			expect(tool.description).toContain('config.tasks');
			expect(tool.description).toContain('{ ok: true, configMutated: true, agentId, tasks:');
			expect(tool.description).toContain('{ ok: false, errors }');
		});

		it('puts quality and batching guardrails in systemInstruction, not description', () => {
			const { service } = makeService();

			const tool = getCreateTasksTool(service);

			expect(tool.systemInstruction).toContain('vague, broad, or placeholder objective');
			expect(tool.systemInstruction).toContain('ask the user clarifying questions');
			expect(tool.systemInstruction).toContain('self-contained');
			expect(tool.systemInstruction).toContain('Success criteria');
			expect(tool.systemInstruction).toContain('A task can only use tools the agent already has');
			expect(tool.systemInstruction).toContain('Batch every task');
			expect(tool.description).not.toContain('ask the user clarifying questions');
			expect(tool.description).not.toContain('Success criteria');
		});

		it('puts the structured objective template in each task objective parameter', () => {
			const { service } = makeService();

			const tool = getCreateTasksTool(service);
			const objectiveSchema = (
				tool.inputSchema as unknown as {
					shape: { tasks: { element: { shape: { objective: { description?: string } } } } };
				}
			).shape.tasks.element.shape.objective;

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

		it('creates multiple tasks without emitting legacy builder task telemetry', async () => {
			const { service, agentsService, agentTaskService, telemetry } = makeService();
			agentsService.findById.mockResolvedValueOnce(makeAgent()).mockResolvedValueOnce(
				makeAgent({
					...baseConfig,
					tasks: [
						{ type: 'task', id: 'task-1', enabled: true },
						{ type: 'task', id: 'task-2', enabled: true },
					],
				}),
			);
			agentTaskService.createTasks.mockResolvedValue([
				makeTaskDto(),
				makeTaskDto({ id: 'task-2', ...taskTwoInput }),
			]);

			const result = await getCreateTasksTool(service).handler!(
				{ tasks: [taskOneInput, taskTwoInput] },
				ctx,
			);

			expect(agentTaskService.createTasks).toHaveBeenCalledWith(
				agentId,
				projectId,
				[
					{ ...taskOneInput, enabled: true },
					{ ...taskTwoInput, enabled: true },
				],
				{ user, modifiedBy: 'builder' },
			);
			expect(result).toEqual({
				ok: true,
				configMutated: true,
				agentId,
				tasks: [
					{ id: 'task-1', name: taskOneInput.name, enabled: true },
					{ id: 'task-2', name: taskTwoInput.name, enabled: true },
				],
			});
			expect(telemetry.track).not.toHaveBeenCalledWith(
				TELEMETRY_EVENT.AGENTS.BUILDER_ADDED_TASKS,
				expect.anything(),
			);
		});

		it('rejects an empty tasks array via the input schema', () => {
			const { service } = makeService();

			const result = (
				getCreateTasksTool(service).inputSchema as unknown as {
					safeParse: (input: unknown) => { success: boolean };
				}
			).safeParse({ tasks: [] });

			expect(result.success).toBe(false);
		});

		it('requires a non-empty objective via the input schema', () => {
			const { service } = makeService();

			const result = (
				getCreateTasksTool(service).inputSchema as unknown as {
					safeParse: (input: unknown) => { success: boolean };
				}
			).safeParse({ tasks: [{ name: 'x', objective: '', cronExpression: '0 9 * * *' }] });

			expect(result.success).toBe(false);
		});

		it('surfaces a service error (e.g. invalid cron) for the whole batch', async () => {
			const { service, agentsService, agentTaskService } = makeService();
			agentsService.findById.mockResolvedValue(makeAgent());
			agentTaskService.createTasks.mockRejectedValue(new Error('Invalid cron expression'));

			const result = await getCreateTasksTool(service).handler!({ tasks: [taskOneInput] }, ctx);

			expect(result).toEqual({ ok: false, errors: [{ message: 'Invalid cron expression' }] });
		});

		it('returns an error when the agent is not in the project', async () => {
			const { service, agentsService, agentTaskService } = makeService();
			agentsService.findById.mockResolvedValue(makeAgent());
			agentTaskService.createTasks.mockRejectedValue(new Error('Agent "agent-1" not found'));

			const result = await getCreateTasksTool(service).handler!({ tasks: [taskOneInput] }, ctx);

			expect(result).toEqual({ ok: false, errors: [{ message: 'Agent "agent-1" not found' }] });
		});
	});

	describe('call_agent tool', () => {
		function getCallAgentTool(service: AgentsBuilderToolsService) {
			return service
				.getTools(agentId, projectId, credentialProvider, user)
				.json.find((tool) => tool.name === BUILDER_TOOLS.CALL_AGENT)!;
		}

		it('denies test execution when the user lacks agent:execute', async () => {
			const { service, agentTestRunService } = makeService();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(false);

			const result = await getCallAgentTool(service).handler!({ message: 'Hello' }, ctx);

			expect(result).toEqual({
				status: 'error',
				code: 'forbidden',
				message: 'You do not have permission to run agents in this project.',
			});
			expect(agentTestRunService.executeDraftRun).not.toHaveBeenCalled();
		});

		it('suspends for a target approval and resumes the same test run with the human decision', async () => {
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(true);

			type MockStreamResult = Awaited<ReturnType<MockLanguageModelV3['doStream']>>;
			type MockStreamPart = MockStreamResult['stream'] extends ReadableStream<infer Part>
				? Part
				: never;

			const usage: Extract<MockStreamPart, { type: 'finish' }>['usage'] = {
				inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
				outputTokens: { total: 5, text: 5, reasoning: 0 },
			};
			const toolCallTurn = (
				toolCallId: string,
				toolName: string,
				input: Record<string, unknown>,
			): MockStreamResult => ({
				stream: convertArrayToReadableStream<MockStreamPart>([
					{ type: 'stream-start', warnings: [] },
					{ type: 'tool-call', toolCallId, toolName, input: JSON.stringify(input) },
					{
						type: 'finish',
						finishReason: { unified: 'tool-calls', raw: 'tool_calls' },
						usage,
					},
				]),
			});
			const textTurn = (text: string): MockStreamResult => ({
				stream: convertArrayToReadableStream<MockStreamPart>([
					{ type: 'stream-start', warnings: [] },
					{ type: 'text-start', id: 'text-1' },
					{ type: 'text-delta', id: 'text-1', delta: text },
					{ type: 'text-end', id: 'text-1' },
					{ type: 'finish', finishReason: { unified: 'stop', raw: 'stop' }, usage },
				]),
			});
			const scriptedModel = (turns: MockStreamResult[]) => {
				let nextTurn = 0;
				return new MockLanguageModelV3({
					provider: 'mock',
					modelId: 'scripted',
					doStream: async () => await Promise.resolve(turns[nextTurn++]),
				});
			};
			const collectChunks = async (stream: ReadableStream<StreamChunk>) => {
				const chunks: StreamChunk[] = [];
				const reader = stream.getReader();
				while (true) {
					const { done, value } = await reader.read();
					if (done) return chunks;
					chunks.push(value);
				}
			};
			const suspendedChunks = (chunks: StreamChunk[]) =>
				chunks.filter(
					(chunk): chunk is Extract<StreamChunk, { type: 'tool-call-suspended' }> =>
						chunk.type === 'tool-call-suspended',
				);

			class InMemoryCheckpointStore implements CheckpointStore {
				private states = new Map<string, SerializableAgentState>();

				async save(key: string, state: SerializableAgentState) {
					await Promise.resolve(this.states.set(key, structuredClone(state)));
				}

				async load(key: string) {
					const state = this.states.get(key);
					return await Promise.resolve(state ? structuredClone(state) : undefined);
				}

				async delete(key: string) {
					await Promise.resolve(this.states.delete(key));
				}
			}

			const checkpointStore = new InMemoryCheckpointStore();
			const firstApproval = {
				type: 'approval' as const,
				toolName: 'delete_record',
				displayName: 'Delete record',
				args: { id: 'record-1' },
			};
			const firstContinuation = {
				runId: 'target-run-1',
				toolCallId: 'target-tool-call-1',
				sessionId: 'session-1',
				response: 'I need approval before deleting the record.',
			};
			let outerRunId = '';
			let outerToolCallId = '';

			{
				const { service, agentTestRunService } = makeService();
				agentTestRunService.executeDraftRun.mockResolvedValue({
					status: 'suspended',
					response: firstContinuation.response,
					sessionId: firstContinuation.sessionId,
					executionId: 'execution-1',
					suspensions: [
						{
							runId: firstContinuation.runId,
							toolCallId: firstContinuation.toolCallId,
							toolName: firstApproval.toolName,
							input: firstApproval.args,
							suspendPayload: firstApproval,
							resumeSchema: standardApprovalResumeSchema,
						},
					],
				});

				const phase1Agent = new SdkAgent('agent-builder')
					.model(
						scriptedModel([
							toolCallTurn('outer-tool-call-1', BUILDER_TOOLS.CALL_AGENT, {
								message: 'Delete the record',
								sessionId: 'session-1',
							}),
						]),
					)
					.instructions('Test the target agent.')
					.tool(getCallAgentTool(service))
					.checkpoint(checkpointStore);

				const firstRun = await phase1Agent.stream('Test deleting a record');
				const firstSuspensions = suspendedChunks(await collectChunks(firstRun.stream));

				expect(firstSuspensions).toHaveLength(1);
				const firstOuterSuspension = firstSuspensions[0];
				outerRunId = firstOuterSuspension.runId;
				outerToolCallId = firstOuterSuspension.toolCallId;
				expect(firstOuterSuspension).toMatchObject({
					toolName: BUILDER_TOOLS.CALL_AGENT,
					suspendPayload: firstApproval,
				});
				expect(
					(await checkpointStore.load(outerRunId))?.pendingToolCalls[outerToolCallId],
				).toMatchObject({
					suspended: true,
					continuation: firstContinuation,
				});
			}

			const secondApproval = {
				type: 'approval' as const,
				toolName: 'notify_owner',
				displayName: 'Notify owner',
				args: { ownerId: 'owner-1' },
			};
			const secondContinuation = {
				runId: 'target-run-2',
				toolCallId: 'target-tool-call-2',
				sessionId: 'session-2',
				response: 'Deletion approved. I need approval to notify the owner.',
			};
			const { service, agentTestRunService } = makeService();
			agentTestRunService.resumeDraftRun.mockResolvedValue({
				status: 'suspended',
				response: secondContinuation.response,
				sessionId: secondContinuation.sessionId,
				executionId: 'execution-2',
				suspensions: [
					{
						runId: secondContinuation.runId,
						toolCallId: secondContinuation.toolCallId,
						toolName: secondApproval.toolName,
						input: secondApproval.args,
						suspendPayload: secondApproval,
						resumeSchema: standardApprovalResumeSchema,
					},
				],
			});
			const phase2Agent = new SdkAgent('agent-builder')
				.model(scriptedModel([textTurn('This run should remain suspended.')]))
				.instructions('Test the target agent.')
				.tool(getCallAgentTool(service))
				.checkpoint(checkpointStore);

			const resumedRun = await phase2Agent.resume(
				'stream',
				{ approved: true },
				{ runId: outerRunId, toolCallId: outerToolCallId },
			);
			const secondSuspensions = suspendedChunks(await collectChunks(resumedRun.stream));

			expect(agentTestRunService.resumeDraftRun).toHaveBeenCalledWith({
				agentId,
				projectId,
				sessionId: firstContinuation.sessionId,
				runId: firstContinuation.runId,
				toolCallId: firstContinuation.toolCallId,
				resumeData: { approved: true },
				user,
				source: 'instance-ai',
				response: firstContinuation.response,
				abortSignal: expect.any(AbortSignal),
			});
			expect(secondSuspensions).toHaveLength(1);
			const secondOuterSuspension = secondSuspensions[0];
			expect(secondOuterSuspension).toMatchObject({
				toolName: BUILDER_TOOLS.CALL_AGENT,
				suspendPayload: secondApproval,
			});
			expect(
				(await checkpointStore.load(secondOuterSuspension.runId))?.pendingToolCalls[
					secondOuterSuspension.toolCallId
				],
			).toMatchObject({
				suspended: true,
				continuation: secondContinuation,
			});
		});

		it('cancels approval-shaped custom suspensions and directs the user to Preview', async () => {
			const { service, agentTestRunService } = makeService();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(true);
			agentTestRunService.executeDraftRun.mockResolvedValue({
				status: 'suspended',
				response: 'Choose a date.',
				sessionId: 'session-1',
				executionId: 'execution-1',
				suspensions: [
					{
						runId: 'run-1',
						toolCallId: 'tool-call-1',
						toolName: 'schedule_record',
						suspendPayload: {
							type: 'approval',
							toolName: 'schedule_record',
							args: { date: 'tomorrow' },
						},
						resumeSchema: {
							...standardApprovalResumeSchema,
							allOf: [{ properties: { approved: { const: true } } }],
						},
					},
				],
			});
			agentTestRunService.cancelSuspendedRun.mockResolvedValue(true);

			const result = await getCallAgentTool(service).handler!({ message: 'Schedule it' }, ctx);

			expect(agentTestRunService.cancelSuspendedRun).toHaveBeenCalledWith({
				agentId,
				runId: 'run-1',
				userId: 'user-1',
			});
			expect(result).toEqual({
				status: 'approval_required',
				response: 'Choose a date.',
				sessionId: 'session-1',
				executionId: 'execution-1',
				suspensions: [{ runId: 'run-1', toolCallId: 'tool-call-1', toolName: 'schedule_record' }],
				previewPath: '/projects/project-1/agents/agent-1/preview',
			});
		});
	});

	describe('publish_agent / unpublish_agent tools', () => {
		function getPublishTool(service: AgentsBuilderToolsService) {
			return service
				.getTools(agentId, projectId, credentialProvider, user)
				.json.find((tool) => tool.name === BUILDER_TOOLS.PUBLISH_AGENT)!;
		}

		function getUnpublishTool(service: AgentsBuilderToolsService) {
			return service
				.getTools(agentId, projectId, credentialProvider, user)
				.json.find((tool) => tool.name === BUILDER_TOOLS.UNPUBLISH_AGENT)!;
		}

		it('publishes the bound agent draft when the user has agent:publish', async () => {
			const { service, agentPublishService } = makeService();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(true);
			agentPublishService.publishAgent.mockResolvedValue({
				agent: {
					activeVersionId: 'v-active',
					versionId: 'v-active',
				} as Agent,
			});

			const result = await getPublishTool(service).handler!({}, ctx);

			expect(checkAccess.userHasScopes).toHaveBeenCalledWith(user, ['agent:publish'], false, {
				projectId,
			});
			expect(agentPublishService.publishAgent).toHaveBeenCalledWith(
				agentId,
				projectId,
				user,
				{ by: 'builder', trigger: 'explicit' },
				undefined,
			);
			expect(result).toEqual({
				ok: true,
				configMutated: true,
				agentId,
				activeVersionId: 'v-active',
				versionId: 'v-active',
			});
		});

		it('forwards an optional versionId to publishAgent', async () => {
			const { service, agentPublishService } = makeService();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(true);
			agentPublishService.publishAgent.mockResolvedValue({
				agent: {
					activeVersionId: 'v-history',
					versionId: 'v-draft',
				} as Agent,
			});

			const result = await getPublishTool(service).handler!({ versionId: 'v-history' }, ctx);

			expect(agentPublishService.publishAgent).toHaveBeenCalledWith(
				agentId,
				projectId,
				user,
				{ by: 'builder', trigger: 'explicit' },
				'v-history',
			);
			expect(result).toEqual({
				ok: true,
				configMutated: true,
				agentId,
				activeVersionId: 'v-history',
				versionId: 'v-draft',
			});
		});

		it('denies publish when the user lacks agent:publish', async () => {
			const { service, agentPublishService } = makeService();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(false);

			const result = await getPublishTool(service).handler!({}, ctx);

			expect(result).toEqual({
				ok: false,
				errors: [{ message: 'You do not have permission to publish agents in this project.' }],
			});
			expect(agentPublishService.publishAgent).not.toHaveBeenCalled();
		});

		it('surfaces publish service errors to the model', async () => {
			const { service, agentPublishService } = makeService();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(true);
			agentPublishService.publishAgent.mockRejectedValue(
				new Error('Cannot publish agent with missing custom tools: my_tool'),
			);

			const result = await getPublishTool(service).handler!({}, ctx);

			expect(result).toEqual({
				ok: false,
				errors: [{ message: 'Cannot publish agent with missing custom tools: my_tool' }],
			});
		});

		it('unpublishes the bound agent when the user has agent:unpublish', async () => {
			const { service, agentPublishService } = makeService();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(true);
			agentPublishService.unpublishAgent.mockResolvedValue({
				activeVersionId: null,
			} as Agent);

			const result = await getUnpublishTool(service).handler!({}, ctx);

			expect(checkAccess.userHasScopes).toHaveBeenCalledWith(user, ['agent:unpublish'], false, {
				projectId,
			});
			expect(agentPublishService.unpublishAgent).toHaveBeenCalledWith(
				agentId,
				projectId,
				user,
				'builder',
			);
			expect(result).toEqual({
				ok: true,
				configMutated: true,
				agentId,
				activeVersionId: null,
			});
		});

		it('denies unpublish when the user lacks agent:unpublish', async () => {
			const { service, agentPublishService } = makeService();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(false);

			const result = await getUnpublishTool(service).handler!({}, ctx);

			expect(result).toEqual({
				ok: false,
				errors: [{ message: 'You do not have permission to unpublish agents in this project.' }],
			});
			expect(agentPublishService.unpublishAgent).not.toHaveBeenCalled();
		});

		it('surfaces unpublish service errors to the model', async () => {
			const { service, agentPublishService } = makeService();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(true);
			agentPublishService.unpublishAgent.mockRejectedValue(new Error('Agent "agent-1" not found'));

			const result = await getUnpublishTool(service).handler!({}, ctx);

			expect(result).toEqual({
				ok: false,
				errors: [{ message: 'Agent "agent-1" not found' }],
			});
		});
	});
});
