import type { CredentialProvider } from '@n8n/agents';
import {
	AGENT_SKILL_INSTRUCTIONS_MAX_LENGTH,
	type AgentJsonConfig,
	type AgentTaskDto,
} from '@n8n/api-types';
import type { User, WorkflowRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import type { AgentTaskService } from '../agent-task.service';
import type { AgentsToolsService } from '../agents-tools.service';
import type { AgentsService } from '../agents.service';
import type { CredentialTypes } from '@/credential-types';
import {
	AgentsBuilderToolsService,
	getAgentConfigHash,
} from '../builder/agents-builder-tools.service';
import type { BuilderModelLookupService } from '../builder/builder-model-lookup.service';
import { BUILDER_TOOLS } from '../builder/builder-tool-names';
import type { Agent } from '../entities/agent.entity';
import type { AgentRepository } from '../repositories/agent.repository';
import type { AgentSecureRuntime } from '../runtime/agent-secure-runtime';
import type { McpRegistryService } from '@/modules/mcp-registry/registry/mcp-registry.service';

const ctx = {
	resumeData: undefined,
	suspend: jest.fn().mockResolvedValue(undefined as never),
	parentTelemetry: undefined,
};

function makeService() {
	const agentsService = mock<AgentsService>();
	const secureRuntime = mock<AgentSecureRuntime>();
	const workflowRepository = mock<WorkflowRepository>();
	const agentsToolsService = mock<AgentsToolsService>();
	const builderModelLookupService = mock<BuilderModelLookupService>();
	const credentialTypes = mock<CredentialTypes>();
	const mcpRegistryService = mock<McpRegistryService>();
	const agentTaskService = mock<AgentTaskService>();
	const agentRepository = mock<AgentRepository>();
	agentsToolsService.getSharedTools.mockReturnValue([]);
	credentialTypes.recognizes.mockReturnValue(true);
	agentsToolsService.getSharedTools.mockReturnValue([]);
	mcpRegistryService.getAll.mockResolvedValue([]);

	const service = new AgentsBuilderToolsService(
		agentsService,
		secureRuntime,
		workflowRepository,
		agentsToolsService,
		builderModelLookupService,
		mcpRegistryService,
		mock(),
		credentialTypes,
		agentTaskService,
		agentRepository,
	);

	return { service, agentsService, secureRuntime, agentTaskService, agentRepository };
}

const baseConfig: AgentJsonConfig = {
	name: 'Agent One',
	model: 'anthropic/claude-sonnet-4-5',
	credential: 'Anthropic Key',
	instructions: 'Help the user.',
	tools: [],
	skills: [],
};

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
		jest.clearAllMocks();
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

		it('patch_config applies a patch when baseConfigHash matches', async () => {
			const { service, agentsService } = makeService();
			const currentConfig = { ...baseConfig, integrations: [] };
			const updatedConfig = { ...currentConfig, description: 'Updated description' };
			const normalizedConfig = {
				...updatedConfig,
				config: { webSearch: { enabled: true } },
				providerTools: { 'anthropic.web_search': { maxUses: 5 } },
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
						{ op: 'add', path: '/description', value: 'Updated description' },
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
						{ op: 'add', path: '/description', value: 'Updated description' },
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

		it('write_config applies a full config when baseConfigHash matches', async () => {
			const { service, agentsService } = makeService();
			const currentConfig = { ...baseConfig, integrations: [] };
			const updatedConfig = { ...currentConfig, instructions: 'Help with support tickets.' };
			const normalizedConfig = {
				...updatedConfig,
				config: { webSearch: { enabled: true } },
				providerTools: { 'anthropic.web_search': { maxUses: 5 } },
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

		it('write_config adds OpenAI native web search defaults', async () => {
			const { service, agentsService } = makeService();
			const currentConfig = { ...baseConfig, integrations: [] };
			const updatedConfig = {
				...currentConfig,
				model: 'openai/gpt-5',
				credential: 'OpenAI Key',
			};
			const normalizedConfig = {
				...updatedConfig,
				config: { webSearch: { enabled: true } },
				providerTools: {
					'openai.web_search': { externalWebAccess: true, searchContextSize: 'medium' },
				},
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

			expect(agentsService.updateConfig).toHaveBeenCalledWith(agentId, projectId, normalizedConfig);
		});

		it('write_config fills missing native web search default settings', async () => {
			const { service, agentsService } = makeService();
			const currentConfig = { ...baseConfig, integrations: [] };
			const updatedConfig: AgentJsonConfig = {
				...currentConfig,
				config: { webSearch: { enabled: true } },
				providerTools: { 'anthropic.web_search': {} },
			};
			const normalizedConfig = {
				...updatedConfig,
				providerTools: { 'anthropic.web_search': { maxUses: 5 } },
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

			expect(agentsService.updateConfig).toHaveBeenCalledWith(agentId, projectId, normalizedConfig);
		});

		it('patch_config swaps native web search defaults when changing supported providers', async () => {
			const { service, agentsService } = makeService();
			const currentConfig: AgentJsonConfig = {
				...baseConfig,
				model: 'openai/gpt-5',
				credential: 'OpenAI Key',
				config: { webSearch: { enabled: true } },
				providerTools: {
					'openai.web_search': { externalWebAccess: true, searchContextSize: 'medium' },
				},
				integrations: [],
			};
			const normalizedConfig = {
				...currentConfig,
				model: 'anthropic/claude-sonnet-4-5',
				credential: 'Anthropic Key',
				providerTools: { 'anthropic.web_search': { maxUses: 5 } },
			};
			agentsService.findById.mockResolvedValue(makeAgent(currentConfig));
			agentsService.updateConfig.mockResolvedValue({
				config: normalizedConfig,
				updatedAt: '2026-01-02T00:00:00.000Z',
				versionId: 'v2',
			});

			await getJsonTool(service, BUILDER_TOOLS.PATCH_CONFIG).handler!(
				{
					baseConfigHash: getAgentConfigHash(currentConfig),
					operations: JSON.stringify([
						{ op: 'replace', path: '/model', value: 'anthropic/claude-sonnet-4-5' },
						{ op: 'replace', path: '/credential', value: 'Anthropic Key' },
					]),
				},
				ctx,
			);

			expect(agentsService.updateConfig).toHaveBeenCalledWith(agentId, projectId, normalizedConfig);
		});

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

		it('write_config preserves fallback web search config for unsupported providers', async () => {
			const { service, agentsService } = makeService();
			const currentConfig = { ...baseConfig, integrations: [] };
			const updatedConfig: AgentJsonConfig = {
				...currentConfig,
				model: 'xai/grok-4',
				config: { webSearch: { enabled: true, provider: 'brave', credential: 'brave-key' } },
				providerTools: {
					'anthropic.web_search': { maxUses: 5 },
				},
			};
			const normalizedConfig: AgentJsonConfig = {
				...currentConfig,
				model: 'xai/grok-4',
				config: { webSearch: { enabled: true, provider: 'brave', credential: 'brave-key' } },
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

			expect(agentsService.updateConfig).toHaveBeenCalledWith(agentId, projectId, normalizedConfig);
		});

		it('write_config preserves fallback web search config for native-capable providers', async () => {
			const { service, agentsService } = makeService();
			const currentConfig = { ...baseConfig, integrations: [] };
			const updatedConfig: AgentJsonConfig = {
				...currentConfig,
				config: { webSearch: { enabled: true, provider: 'brave', credential: 'brave-key' } },
				providerTools: {
					'anthropic.web_search': { maxUses: 5 },
				},
			};
			const normalizedConfig: AgentJsonConfig = {
				...currentConfig,
				config: { webSearch: { enabled: true, provider: 'brave', credential: 'brave-key' } },
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

			expect(agentsService.updateConfig).toHaveBeenCalledWith(agentId, projectId, normalizedConfig);
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
	});

	describe('build_custom_tool tool', () => {
		function getBuildCustomTool(service: AgentsBuilderToolsService) {
			return service
				.getTools(agentId, projectId, credentialProvider, user)
				.shared.find((tool) => tool.name === BUILDER_TOOLS.BUILD_CUSTOM_TOOL)!;
		}

		it('stores a custom tool and returns the generated tool id', async () => {
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
				id: 'tool_0Ab9ZkLm3Pq7Xy2N',
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
				id: 'tool_0Ab9ZkLm3Pq7Xy2N',
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
		});

		it('puts the structured body template in the body parameter', () => {
			const { service } = makeService();

			const tool = getCreateSkillTool(service);
			const bodySchema = (
				tool.inputSchema as unknown as { shape: { body: { description?: string } } }
			).shape.body;

			for (const heading of [
				'## Overview',
				'## Inputs',
				'## Steps',
				'## Rules',
				'## Example',
				'## Gotchas',
			]) {
				expect(bodySchema.description).toContain(heading);
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
					body: 'Extract decisions and action items.',
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

		it('enforces name and body size limits via the input schema', () => {
			const { service } = makeService();

			const result = (
				getCreateSkillTool(service).inputSchema as unknown as {
					safeParse: (input: unknown) => { success: boolean };
				}
			).safeParse({
				name: 'a'.repeat(129),
				description: 'Use when summarizing meeting notes',
				body: 'a'.repeat(AGENT_SKILL_INSTRUCTIONS_MAX_LENGTH + 1),
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
