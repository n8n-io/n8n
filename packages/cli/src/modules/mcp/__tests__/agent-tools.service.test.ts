import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { AgentJsonConfig } from '@n8n/api-types';
import { mockInstance } from '@n8n/backend-test-utils';
import { OutboundHttp, SsrfProtectionService } from '@n8n/backend-network';
import { SsrfProtectionConfig } from '@n8n/config';
import { User } from '@n8n/db';
import type { Mock } from 'vitest';

vi.mock('@/permissions.ee/check-access', () => ({
	userHasScopes: vi.fn(),
}));

import { CredentialsService } from '@/credentials/credentials.service';
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
import { AgentSecureRuntime } from '@/modules/agents/runtime/agent-secure-runtime';
import { getAgentConfigHash } from '@/modules/agents/utils/agent-config-hash';
import { McpRegistryService } from '@/modules/mcp-registry/registry/mcp-registry.service';
import { OauthService } from '@/oauth/oauth.service';
import { userHasScopes } from '@/permissions.ee/check-access';
import { UrlService } from '@/services/url.service';
import { Telemetry } from '@/telemetry';

import { USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import { McpAgentToolsService } from '../tools/agents/agent-tools.service';

const userHasScopesMock = userHasScopes as Mock;

type ToolResult = {
	content: Array<{ type: string; text: string }>;
	structuredContent: Record<string, unknown>;
	isError?: boolean;
};

type RegisteredTool = {
	config: { description?: string; annotations?: Record<string, unknown> };
	handler: (input: Record<string, unknown>) => Promise<ToolResult>;
};

const user = Object.assign(new User(), { id: 'user-1' });

const baseConfig: AgentJsonConfig = {
	name: 'My Agent',
	model: 'anthropic/claude',
	instructions: 'Help out.',
	tools: [],
	skills: [],
};

const agentEntity = (overrides: Record<string, unknown> = {}): Agent =>
	({
		id: 'agent-1',
		name: 'My Agent',
		projectId: 'project-1',
		versionId: 'v1',
		activeVersionId: null,
		createdAt: new Date('2026-01-01T00:00:00.000Z'),
		updatedAt: new Date('2026-01-02T00:00:00.000Z'),
		schema: baseConfig,
		integrations: [],
		...overrides,
	}) as unknown as Agent;

describe('McpAgentToolsService', () => {
	const telemetry = mockInstance(Telemetry);
	const credentialsService = mockInstance(CredentialsService);
	const agentsService = mockInstance(AgentsService);
	const agentConfigService = mockInstance(AgentConfigService);
	const agentValidationService = mockInstance(AgentValidationService);
	const agentPublishService = mockInstance(AgentPublishService);
	const agentSkillsService = mockInstance(AgentSkillsService);
	const agentTaskService = mockInstance(AgentTaskService);
	const agentCustomToolsService = mockInstance(AgentCustomToolsService);
	const agentSecureRuntime = mockInstance(AgentSecureRuntime);
	const integrationPersistenceService = mockInstance(AgentIntegrationPersistenceService);
	const chatIntegrationService = mockInstance(ChatIntegrationService);
	const urlService = mockInstance(UrlService);

	const service = new McpAgentToolsService(
		telemetry,
		credentialsService,
		agentsService,
		agentConfigService,
		agentValidationService,
		agentPublishService,
		agentSkillsService,
		agentTaskService,
		agentCustomToolsService,
		agentSecureRuntime,
		integrationPersistenceService,
		chatIntegrationService,
		mockInstance(ChatIntegrationRegistry),
		mockInstance(AgentModelCatalogService),
		mockInstance(AttachableWorkflowsService),
		mockInstance(McpRegistryService),
		mockInstance(OauthService),
		mockInstance(OutboundHttp),
		mockInstance(SsrfProtectionConfig),
		mockInstance(SsrfProtectionService),
		urlService,
	);

	let tools: Map<string, RegisteredTool>;
	let registerResource: Mock;

	beforeEach(() => {
		vi.clearAllMocks();
		userHasScopesMock.mockResolvedValue(true);
		urlService.getInstanceBaseUrl.mockReturnValue('https://n8n.test');

		tools = new Map();
		registerResource = vi.fn();
		const server = {
			registerTool: (name: string, config: RegisteredTool['config'], handler: unknown) => {
				tools.set(name, { config, handler: handler as RegisteredTool['handler'] });
			},
			resource: registerResource,
		} as unknown as McpServer;
		service.registerTools(server, user);
	});

	const callTool = async (name: string, input: Record<string, unknown>): Promise<ToolResult> => {
		const tool = tools.get(name);
		if (!tool) throw new Error(`Tool "${name}" is not registered`);
		return await tool.handler(input);
	};

	describe('registerTools', () => {
		it('registers all agent tools and the reference resource', () => {
			expect([...tools.keys()].sort()).toEqual(
				[
					'create_agent',
					'delete_agent',
					'discover_agent_assets',
					'get_agent',
					'get_agent_builder_reference',
					'mutate_agent',
					'publish_agent',
					'search_agents',
					'unpublish_agent',
					'update_agent_integration',
					'validate_agent',
					'verify_agent_mcp_server',
				].sort(),
			);
			expect(registerResource).toHaveBeenCalledWith(
				'agent-builder-reference',
				'n8n://agents/reference',
				expect.any(Object),
				expect.any(Function),
			);
		});
	});

	describe('scope enforcement', () => {
		const identity = { projectId: 'project-1', agentId: 'agent-1' };

		test.each<[string, string, Record<string, unknown>]>([
			['search_agents', 'agent:list', { projectId: 'project-1' }],
			['get_agent', 'agent:read', identity],
			['create_agent', 'agent:create', { projectId: 'project-1', name: 'My Agent' }],
			[
				'mutate_agent',
				'agent:update',
				{
					...identity,
					baseConfigHash: 'hash',
					operation: { type: 'config.replace', config: {} },
				},
			],
			['validate_agent', 'agent:read', identity],
			['publish_agent', 'agent:publish', identity],
			['unpublish_agent', 'agent:unpublish', identity],
			['delete_agent', 'agent:delete', identity],
			['discover_agent_assets', 'agent:read', { projectId: 'project-1', kind: 'models' }],
			[
				'verify_agent_mcp_server',
				'agent:read',
				{
					projectId: 'project-1',
					name: 'srv',
					url: 'https://mcp.test',
					transport: 'streamableHttp',
					authentication: 'none',
				},
			],
			[
				'update_agent_integration',
				'agent:update',
				{ ...identity, action: 'connect', type: 'slack', credentialId: 'cred-1' },
			],
		])('%s denies access without the %s scope', async (toolName, scope, input) => {
			userHasScopesMock.mockResolvedValue(false);

			const result = await callTool(toolName, input);

			expect(userHasScopesMock).toHaveBeenCalledWith(user, [scope], false, {
				projectId: 'project-1',
			});
			expect(result.isError).toBe(true);
			expect(result.structuredContent).toEqual({
				ok: false,
				code: 'agent_tool_error',
				error: 'You do not have permission to access agents in this project.',
			});
		});
	});

	describe('mutate_agent', () => {
		const mutateInput = (operation: Record<string, unknown>, baseConfigHash?: string) => ({
			projectId: 'project-1',
			agentId: 'agent-1',
			baseConfigHash: baseConfigHash ?? getAgentConfigHash(baseConfig),
			operation,
		});

		beforeEach(() => {
			agentConfigService.getConfig.mockResolvedValue(baseConfig);
		});

		it('rejects a stale baseConfigHash without applying the mutation', async () => {
			const result = await callTool(
				'mutate_agent',
				mutateInput({ type: 'config.replace', config: { name: 'B' } }, 'stale-hash'),
			);

			expect(result.isError).toBe(true);
			expect(result.structuredContent).toEqual({
				ok: false,
				code: 'stale_config',
				agentId: 'agent-1',
				configHash: getAgentConfigHash(baseConfig),
				message: 'Call get_agent before retrying the mutation.',
			});
			expect(agentConfigService.updateConfig).not.toHaveBeenCalled();
			expect(telemetry.track).toHaveBeenCalledWith(
				USER_CALLED_MCP_TOOL_EVENT,
				expect.objectContaining({
					user_id: 'user-1',
					tool_name: 'mutate_agent',
					results: { success: false },
				}),
			);
		});

		it('applies config.replace and returns the hash of the stored config', async () => {
			const stored = { ...baseConfig, name: 'Renamed' };
			agentConfigService.updateConfig.mockResolvedValue({
				config: stored,
				updatedAt: 'now',
				versionId: 'v2',
			});

			const result = await callTool(
				'mutate_agent',
				mutateInput({ type: 'config.replace', config: { name: 'Renamed' } }),
			);

			expect(agentConfigService.updateConfig).toHaveBeenCalledWith(
				'agent-1',
				'project-1',
				{ name: 'Renamed' },
				user,
			);
			// The stale-check config is reused; the response hash comes from
			// updateConfig's return value, not a re-fetch.
			expect(agentConfigService.getConfig).toHaveBeenCalledTimes(1);
			expect(result.structuredContent).toEqual({
				ok: true,
				agentId: 'agent-1',
				operation: 'config.replace',
				configHash: getAgentConfigHash(stored),
			});
			expect(telemetry.track).toHaveBeenCalledWith(
				USER_CALLED_MCP_TOOL_EVENT,
				expect.objectContaining({ tool_name: 'mutate_agent', results: { success: true } }),
			);
		});

		it('applies a valid config.patch to the current config', async () => {
			agentConfigService.updateConfig.mockResolvedValue({
				config: { ...baseConfig, name: 'Patched' },
				updatedAt: 'now',
				versionId: 'v2',
			});

			const result = await callTool(
				'mutate_agent',
				mutateInput({
					type: 'config.patch',
					patch: [{ op: 'replace', path: '/name', value: 'Patched' }],
				}),
			);

			expect(agentConfigService.updateConfig).toHaveBeenCalledWith(
				'agent-1',
				'project-1',
				{ ...baseConfig, name: 'Patched' },
				user,
			);
			expect(result.structuredContent).toMatchObject({ ok: true, operation: 'config.patch' });
		});

		it('rejects an invalid config.patch without writing', async () => {
			const result = await callTool(
				'mutate_agent',
				mutateInput({
					type: 'config.patch',
					patch: [{ op: 'replace', path: '/missing/deep', value: 1 }],
				}),
			);

			expect(result.isError).toBe(true);
			expect(agentConfigService.updateConfig).not.toHaveBeenCalled();
		});

		it('rejects a config.replace that carries integrations', async () => {
			const result = await callTool(
				'mutate_agent',
				mutateInput({
					type: 'config.replace',
					config: { ...baseConfig, integrations: [{ type: 'telegram', credentialId: '' }] },
				}),
			);

			expect(result.isError).toBe(true);
			expect(result.structuredContent).toMatchObject({
				error: expect.stringContaining('update_agent_integration'),
			});
			expect(agentConfigService.updateConfig).not.toHaveBeenCalled();
		});

		it('rejects a config.patch that targets integrations', async () => {
			const config = { ...baseConfig, integrations: [] };
			agentConfigService.getConfig.mockResolvedValue(config);

			const result = await callTool(
				'mutate_agent',
				mutateInput(
					{
						type: 'config.patch',
						patch: [
							{ op: 'add', path: '/integrations/-', value: { type: 'telegram', credentialId: '' } },
						],
					},
					getAgentConfigHash(config) ?? undefined,
				),
			);

			expect(result.isError).toBe(true);
			expect(result.structuredContent).toMatchObject({
				error: expect.stringContaining('update_agent_integration'),
			});
			expect(agentConfigService.updateConfig).not.toHaveBeenCalled();
		});

		it('rejects a config.patch that injects integrations via a whole-document replace', async () => {
			const config = { ...baseConfig, integrations: [] };
			agentConfigService.getConfig.mockResolvedValue(config);

			const result = await callTool(
				'mutate_agent',
				mutateInput(
					{
						type: 'config.patch',
						patch: [
							{
								op: 'replace',
								path: '',
								value: { ...baseConfig, integrations: [{ type: 'telegram', credentialId: '' }] },
							},
						],
					},
					getAgentConfigHash(config) ?? undefined,
				),
			);

			expect(result.isError).toBe(true);
			expect(result.structuredContent).toMatchObject({
				error: expect.stringContaining('update_agent_integration'),
			});
			expect(agentConfigService.updateConfig).not.toHaveBeenCalled();
		});

		it('creates and attaches a skill when no skillId is given', async () => {
			agentSkillsService.createAndAttachSkill.mockResolvedValue({ id: 'skill-1' } as never);

			const result = await callTool(
				'mutate_agent',
				mutateInput({ type: 'skill.upsert', skill: { name: 'Skill', body: 'do it' } }),
			);

			expect(agentSkillsService.createAndAttachSkill).toHaveBeenCalledWith('agent-1', 'project-1', {
				name: 'Skill',
				body: 'do it',
			});
			expect(result.structuredContent).toMatchObject({
				ok: true,
				resource: { type: 'skill', id: 'skill-1' },
			});
		});

		it('updates an existing skill when skillId is given', async () => {
			agentSkillsService.updateSkill.mockResolvedValue({ id: 'skill-1' } as never);

			const result = await callTool(
				'mutate_agent',
				mutateInput({
					type: 'skill.upsert',
					skillId: 'skill-1',
					skill: { name: 'Skill', body: 'v2' },
				}),
			);

			expect(agentSkillsService.updateSkill).toHaveBeenCalledWith(
				'agent-1',
				'project-1',
				'skill-1',
				{ name: 'Skill', body: 'v2' },
			);
			expect(result.structuredContent).toMatchObject({
				resource: { type: 'skill', id: 'skill-1' },
			});
		});

		it('creates a task enabled by default', async () => {
			agentTaskService.create.mockResolvedValue({ id: 'task-1' } as never);

			const result = await callTool(
				'mutate_agent',
				mutateInput({
					type: 'task.upsert',
					task: { name: 'Daily', objective: 'report', cronExpression: '0 9 * * *' },
				}),
			);

			expect(agentTaskService.create).toHaveBeenCalledWith('agent-1', {
				name: 'Daily',
				objective: 'report',
				cronExpression: '0 9 * * *',
				enabled: true,
			});
			expect(result.structuredContent).toMatchObject({
				resource: { type: 'task', id: 'task-1' },
			});
		});

		it('builds a custom tool and attaches its config reference once', async () => {
			const descriptor = { name: 'my_tool' };
			agentSecureRuntime.describeToolSecurely.mockResolvedValue(descriptor as never);
			agentCustomToolsService.buildCustomTool.mockResolvedValue({
				ok: true,
				id: 'my_tool',
				descriptor,
			} as never);
			const stored = { ...baseConfig, tools: [{ type: 'custom' as const, id: 'my_tool' }] };
			agentConfigService.updateConfig.mockResolvedValue({
				config: stored,
				updatedAt: 'now',
				versionId: 'v2',
			});

			const result = await callTool(
				'mutate_agent',
				mutateInput({ type: 'customTool.upsert', code: 'export default new Tool("my_tool")' }),
			);

			expect(agentCustomToolsService.buildCustomTool).toHaveBeenCalledWith(
				'agent-1',
				'project-1',
				'export default new Tool("my_tool")',
				descriptor,
			);
			expect(agentConfigService.updateConfig).toHaveBeenCalledWith(
				'agent-1',
				'project-1',
				expect.objectContaining({ tools: [{ type: 'custom', id: 'my_tool' }] }),
				user,
			);
			expect(result.structuredContent).toMatchObject({
				resource: { type: 'customTool', id: 'my_tool' },
				configHash: getAgentConfigHash(stored),
			});
		});

		it('skips the config write when the custom tool reference already exists', async () => {
			const configWithTool = { ...baseConfig, tools: [{ type: 'custom' as const, id: 'my_tool' }] };
			agentConfigService.getConfig.mockResolvedValue(configWithTool);
			agentSecureRuntime.describeToolSecurely.mockResolvedValue({ name: 'my_tool' } as never);
			agentCustomToolsService.buildCustomTool.mockResolvedValue({
				ok: true,
				id: 'my_tool',
				descriptor: { name: 'my_tool' },
			} as never);

			const result = await callTool(
				'mutate_agent',
				mutateInput(
					{ type: 'customTool.upsert', code: 'code' },
					getAgentConfigHash(configWithTool) ?? undefined,
				),
			);

			expect(agentConfigService.updateConfig).not.toHaveBeenCalled();
			expect(result.structuredContent).toMatchObject({
				ok: true,
				configHash: getAgentConfigHash(configWithTool),
			});
		});

		test.each<[string, Record<string, unknown>, () => unknown]>([
			[
				'skill.delete',
				{ type: 'skill.delete', skillId: 'skill-1' },
				() =>
					expect(agentSkillsService.deleteSkill).toHaveBeenCalledWith(
						'agent-1',
						'project-1',
						'skill-1',
					),
			],
			[
				'task.delete',
				{ type: 'task.delete', taskId: 'task-1' },
				() => expect(agentTaskService.delete).toHaveBeenCalledWith('agent-1', 'task-1'),
			],
			[
				'customTool.delete',
				{ type: 'customTool.delete', toolId: 'tool-1' },
				() =>
					expect(agentCustomToolsService.deleteCustomTool).toHaveBeenCalledWith(
						'agent-1',
						'project-1',
						'tool-1',
					),
			],
		])('routes %s to its sidecar service', async (_name, operation, assertion) => {
			const result = await callTool('mutate_agent', mutateInput(operation));

			assertion();
			expect(result.structuredContent).toMatchObject({ ok: true });
		});
	});

	describe('create_agent', () => {
		beforeEach(() => {
			agentsService.create.mockResolvedValue(agentEntity());
		});

		it('validates, creates, and stores the initial config with the name injected', async () => {
			const initialConfig = { model: 'anthropic/claude', instructions: 'Help.' };
			agentConfigService.validateConfig.mockResolvedValue({
				valid: true,
				config: baseConfig,
			});
			agentConfigService.updateConfig.mockResolvedValue({
				config: baseConfig,
				updatedAt: 'now',
				versionId: 'v2',
			});

			const result = await callTool('create_agent', {
				projectId: 'project-1',
				name: 'My Agent',
				config: initialConfig,
			});

			expect(agentConfigService.validateConfig).toHaveBeenCalledWith({
				...initialConfig,
				name: 'My Agent',
			});
			expect(agentConfigService.updateConfig).toHaveBeenCalledWith(
				'agent-1',
				'project-1',
				{ ...initialConfig, name: 'My Agent' },
				user,
			);
			expect(result.structuredContent).toEqual({
				ok: true,
				agent: {
					id: 'agent-1',
					name: 'My Agent',
					projectId: 'project-1',
					published: false,
					versionId: 'v2',
					activeVersionId: null,
				},
				configHash: getAgentConfigHash(baseConfig),
				url: 'https://n8n.test/projects/project-1/agents/agent-1',
			});
		});

		it('rejects an invalid initial config before creating the agent', async () => {
			agentConfigService.validateConfig.mockResolvedValue({ valid: false, error: 'bad model' });

			const result = await callTool('create_agent', {
				projectId: 'project-1',
				name: 'My Agent',
				config: { model: 'nope' },
			});

			expect(result.isError).toBe(true);
			expect(result.structuredContent).toMatchObject({
				error: 'Invalid initial Agent config: bad model',
			});
			expect(agentsService.create).not.toHaveBeenCalled();
		});

		it('deletes the created agent when storing the initial config fails', async () => {
			agentConfigService.validateConfig.mockResolvedValue({
				valid: true,
				config: baseConfig,
			});
			agentConfigService.updateConfig.mockRejectedValue(new Error('write failed'));

			const result = await callTool('create_agent', {
				projectId: 'project-1',
				name: 'My Agent',
				config: { model: 'anthropic/claude' },
			});

			expect(agentsService.delete).toHaveBeenCalledWith('agent-1', 'project-1');
			expect(result.isError).toBe(true);
			expect(result.structuredContent).toMatchObject({ error: 'write failed' });
		});
	});

	describe('search_agents', () => {
		it('only returns agents from projects where the user has agent:list', async () => {
			agentsService.findByUser.mockResolvedValue([
				agentEntity({ id: 'agent-1', projectId: 'project-1' }),
				agentEntity({ id: 'agent-2', projectId: 'project-2' }),
			]);
			userHasScopesMock.mockImplementation(
				async (
					_user: User,
					_scopes: string[],
					_global: boolean,
					{ projectId }: { projectId: string },
				) => projectId === 'project-1',
			);

			const result = await callTool('search_agents', {});

			expect(result.structuredContent).toMatchObject({ ok: true, count: 1 });
			expect(result.structuredContent.data).toEqual([
				expect.objectContaining({ id: 'agent-1', projectId: 'project-1' }),
			]);
		});

		it('applies query, publishedOnly, excludeAgentId, and limit filters', async () => {
			agentsService.findByProjectId.mockResolvedValue([
				agentEntity({ id: 'agent-1', name: 'Sales Helper', activeVersionId: 'v1' }),
				agentEntity({ id: 'agent-2', name: 'Sales Draft', activeVersionId: null }),
				agentEntity({ id: 'agent-3', name: 'Sales Excluded', activeVersionId: 'v1' }),
				agentEntity({ id: 'agent-4', name: 'Support Bot', activeVersionId: 'v1' }),
			]);

			const result = await callTool('search_agents', {
				projectId: 'project-1',
				query: 'sales',
				publishedOnly: true,
				excludeAgentId: 'agent-3',
				limit: 10,
			});

			expect(result.structuredContent.data).toEqual([
				expect.objectContaining({ id: 'agent-1', published: true }),
			]);
		});
	});

	describe('publish_agent', () => {
		beforeEach(() => {
			agentsService.findById.mockResolvedValue(agentEntity());
			agentConfigService.validateConfig.mockResolvedValue({ valid: true, config: baseConfig });
			agentTaskService.list.mockResolvedValue([]);
			credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([] as never);
		});

		it('refuses to publish an agent that is not runnable', async () => {
			agentValidationService.validateAgentIsRunnable.mockResolvedValue({
				missing: ['credential:model'],
			} as never);

			const result = await callTool('publish_agent', {
				projectId: 'project-1',
				agentId: 'agent-1',
			});

			expect(result.isError).toBe(true);
			expect(result.structuredContent).toMatchObject({
				error: 'Agent is not runnable: credential:model',
			});
			expect(agentPublishService.publishAgent).not.toHaveBeenCalled();
		});

		it('publishes a valid agent', async () => {
			agentValidationService.validateAgentIsRunnable.mockResolvedValue({ missing: [] } as never);
			agentPublishService.publishAgent.mockResolvedValue(
				agentEntity({ versionId: 'v2', activeVersionId: 'v2' }),
			);

			const result = await callTool('publish_agent', {
				projectId: 'project-1',
				agentId: 'agent-1',
			});

			expect(agentPublishService.publishAgent).toHaveBeenCalledWith('agent-1', 'project-1', user);
			expect(result.structuredContent).toEqual({
				ok: true,
				agentId: 'agent-1',
				published: true,
				versionId: 'v2',
				activeVersionId: 'v2',
				url: 'https://n8n.test/projects/project-1/agents/agent-1',
			});
		});
	});

	describe('get_agent', () => {
		it('returns the agent snapshot with sidecars and configHash', async () => {
			const config = {
				...baseConfig,
				tools: [{ type: 'custom' as const, id: 'my_tool' }],
				tasks: [{ type: 'task' as const, id: 'task-1', enabled: true }],
			};
			agentsService.findById.mockResolvedValue(
				agentEntity({
					schema: config,
					tools: { my_tool: { code: 'code', descriptor: { name: 'my_tool' } } },
				}),
			);
			agentValidationService.validateAgentIsRunnable.mockResolvedValue({
				missing: ['credential:model'],
			} as never);
			agentSkillsService.listSkills.mockResolvedValue([{ id: 'skill-1' }] as never);
			agentTaskService.list.mockResolvedValue([
				{ id: 'task-1', name: 'Daily' },
				{ id: 'task-2', name: 'Detached' },
			] as never);

			const result = await callTool('get_agent', { projectId: 'project-1', agentId: 'agent-1' });

			expect(result.structuredContent).toMatchObject({
				ok: true,
				agent: expect.objectContaining({ id: 'agent-1', published: false }),
				configHash: getAgentConfigHash({ ...config, integrations: [] }),
				isRunnable: false,
				missing: ['credential:model'],
				skills: [{ id: 'skill-1' }],
				tasks: [
					{ id: 'task-1', name: 'Daily', enabled: true },
					{ id: 'task-2', name: 'Detached', enabled: false },
				],
				customTools: [{ id: 'my_tool', descriptor: { name: 'my_tool' } }],
			});
		});

		it('reports integrations separately and omits them from the editable config', async () => {
			const integration = { type: 'telegram', credentialId: 'cred-1' };
			agentsService.findById.mockResolvedValue(
				agentEntity({ activeVersionId: 'v1', integrations: [integration] }),
			);
			agentValidationService.validateAgentIsRunnable.mockResolvedValue({ missing: [] } as never);
			agentSkillsService.listSkills.mockResolvedValue([] as never);
			agentTaskService.list.mockResolvedValue([] as never);

			const result = await callTool('get_agent', { projectId: 'project-1', agentId: 'agent-1' });

			expect(result.structuredContent.integrations).toEqual([integration]);
			expect(result.structuredContent.config).not.toHaveProperty('integrations');
		});

		it('returns an error result for an unknown agent', async () => {
			agentsService.findById.mockResolvedValue(null);

			const result = await callTool('get_agent', { projectId: 'project-1', agentId: 'nope' });

			expect(result.isError).toBe(true);
			expect(result.structuredContent).toMatchObject({ error: 'Agent "nope" not found' });
		});
	});

	describe('projectId resolution', () => {
		beforeEach(() => {
			agentValidationService.validateAgentIsRunnable.mockResolvedValue({ missing: [] } as never);
			agentSkillsService.listSkills.mockResolvedValue([] as never);
			agentTaskService.list.mockResolvedValue([] as never);
		});

		it('resolves the project from agentId when projectId is omitted', async () => {
			agentsService.findByIdForUser.mockResolvedValue(agentEntity({ projectId: 'project-9' }));
			agentsService.findById.mockResolvedValue(agentEntity({ projectId: 'project-9' }));

			const result = await callTool('get_agent', { agentId: 'agent-1' });

			expect(agentsService.findByIdForUser).toHaveBeenCalledWith('agent-1', 'user-1');
			expect(userHasScopesMock).toHaveBeenCalledWith(user, ['agent:read'], false, {
				projectId: 'project-9',
			});
			expect(result.structuredContent).toMatchObject({ ok: true });
		});

		it('skips resolution when projectId is supplied', async () => {
			agentsService.findById.mockResolvedValue(agentEntity());

			await callTool('get_agent', { projectId: 'project-1', agentId: 'agent-1' });

			expect(agentsService.findByIdForUser).not.toHaveBeenCalled();
		});

		it('returns an error when the agentId resolves to no accessible agent', async () => {
			agentsService.findByIdForUser.mockResolvedValue(null);

			const result = await callTool('get_agent', { agentId: 'ghost' });

			expect(result.isError).toBe(true);
			expect(result.structuredContent).toMatchObject({ error: 'Agent "ghost" not found' });
		});

		it('applies a mutation against the resolved project when projectId is omitted', async () => {
			agentsService.findByIdForUser.mockResolvedValue(agentEntity({ projectId: 'project-9' }));
			agentConfigService.getConfig.mockResolvedValue(baseConfig);
			agentConfigService.updateConfig.mockResolvedValue({
				config: baseConfig,
				updatedAt: 'now',
				versionId: 'v2',
			});

			const result = await callTool('mutate_agent', {
				agentId: 'agent-1',
				baseConfigHash: getAgentConfigHash(baseConfig),
				operation: { type: 'config.replace', config: { name: 'My Agent' } },
			});

			expect(agentConfigService.updateConfig).toHaveBeenCalledWith(
				'agent-1',
				'project-9',
				{ name: 'My Agent' },
				user,
			);
			expect(result.structuredContent).toMatchObject({ ok: true });
		});
	});

	describe('update_agent_integration disconnect', () => {
		const input = {
			projectId: 'project-1',
			agentId: 'agent-1',
			action: 'disconnect',
			type: 'slack',
			credentialId: 'cred-1',
		};

		beforeEach(() => {
			agentConfigService.getConfig.mockResolvedValue(baseConfig);
		});

		it('disconnects a persisted integration and removes its record', async () => {
			const persisted = { type: 'slack', credentialId: 'cred-1' };
			agentsService.findById.mockResolvedValue(agentEntity({ integrations: [persisted] }));

			const result = await callTool('update_agent_integration', input);

			expect(chatIntegrationService.disconnectChannel).toHaveBeenCalledWith('agent-1', persisted);
			expect(chatIntegrationService.disconnect).not.toHaveBeenCalled();
			expect(integrationPersistenceService.removeCredentialIntegration).toHaveBeenCalledWith(
				expect.objectContaining({ id: 'agent-1' }),
				'slack',
				'cred-1',
				{ broadcast: false },
			);
			expect(result.structuredContent).toMatchObject({ ok: true, connected: false });
		});

		it('still tears down the runtime channel when no persisted integration matches', async () => {
			agentsService.findById.mockResolvedValue(agentEntity({ integrations: [] }));

			const result = await callTool('update_agent_integration', input);

			expect(chatIntegrationService.disconnectChannel).toHaveBeenCalledWith('agent-1', {
				type: 'slack',
				credentialId: 'cred-1',
			});
			expect(integrationPersistenceService.removeCredentialIntegration).toHaveBeenCalled();
			expect(result.structuredContent).toMatchObject({ ok: true, connected: false });
		});

		it('falls back to a plain disconnect for an unknown integration type', async () => {
			agentsService.findById.mockResolvedValue(agentEntity({ integrations: [] }));

			await callTool('update_agent_integration', { ...input, type: 'bogus' });

			expect(chatIntegrationService.disconnectChannel).not.toHaveBeenCalled();
			expect(chatIntegrationService.disconnect).toHaveBeenCalledWith('agent-1', {
				type: 'bogus',
				credentialId: 'cred-1',
			});
			expect(integrationPersistenceService.removeCredentialIntegration).toHaveBeenCalled();
		});
	});

	describe('delete_agent', () => {
		it('deletes an existing agent', async () => {
			agentsService.delete.mockResolvedValue(true);

			const result = await callTool('delete_agent', { projectId: 'project-1', agentId: 'agent-1' });

			expect(agentsService.delete).toHaveBeenCalledWith('agent-1', 'project-1');
			expect(result.structuredContent).toEqual({ ok: true, deleted: true, agentId: 'agent-1' });
		});

		it('returns an error result when the agent does not exist', async () => {
			agentsService.delete.mockResolvedValue(false);

			const result = await callTool('delete_agent', { projectId: 'project-1', agentId: 'nope' });

			expect(result.isError).toBe(true);
			expect(result.structuredContent).toMatchObject({ error: 'Agent "nope" not found' });
		});
	});
});
