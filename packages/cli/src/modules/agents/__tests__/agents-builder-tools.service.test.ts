import type { CredentialProvider } from '@n8n/agents';
import { AGENT_SKILL_INSTRUCTIONS_MAX_LENGTH, type AgentJsonConfig } from '@n8n/api-types';
import type { User, WorkflowRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import type { AgentsToolsService } from '../agents-tools.service';
import type { AgentsService } from '../agents.service';
import type { AgentTaskService } from '../agent-task.service';
import {
	AgentsBuilderToolsService,
	getAgentConfigHash,
} from '../builder/agents-builder-tools.service';
import type { BuilderModelLookupService } from '../builder/builder-model-lookup.service';
import { BUILDER_TOOLS } from '../builder/builder-tool-names';
import type { Agent } from '../entities/agent.entity';
import type { AgentSecureRuntime } from '../runtime/agent-secure-runtime';

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
	const agentTaskService = mock<AgentTaskService>();
	agentsToolsService.getSharedTools.mockReturnValue([]);

	const service = new AgentsBuilderToolsService(
		agentsService,
		secureRuntime,
		workflowRepository,
		agentsToolsService,
		builderModelLookupService,
		agentTaskService,
	);

	return { service, agentsService, secureRuntime, agentTaskService };
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

		it('patch_config applies a patch when baseConfigHash matches', async () => {
			const { service, agentsService } = makeService();
			const currentConfig = { ...baseConfig, integrations: [] };
			const updatedConfig = { ...currentConfig, description: 'Updated description' };
			agentsService.findById.mockResolvedValue(makeAgent(baseConfig));
			agentsService.updateConfig.mockResolvedValue({
				config: updatedConfig,
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

			expect(agentsService.updateConfig).toHaveBeenCalledWith(agentId, projectId, updatedConfig);
			expect(result).toEqual({
				ok: true,
				config: updatedConfig,
				configHash: getAgentConfigHash(updatedConfig),
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
			agentsService.findById.mockResolvedValue(makeAgent(baseConfig));
			agentsService.updateConfig.mockResolvedValue({
				config: updatedConfig,
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

			expect(agentsService.updateConfig).toHaveBeenCalledWith(agentId, projectId, updatedConfig);
			expect(result).toEqual({
				ok: true,
				config: updatedConfig,
				configHash: getAgentConfigHash(updatedConfig),
				updatedAt: '2026-01-02T00:00:00.000Z',
				versionId: 'v2',
			});
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

		it('rejects oversized names and skill bodies before creating the skill', async () => {
			const { service, agentsService } = makeService();

			const result = await getCreateSkillTool(service).handler!(
				{
					name: 'a'.repeat(129),
					description: 'Use when summarizing meeting notes',
					body: 'a'.repeat(AGENT_SKILL_INSTRUCTIONS_MAX_LENGTH + 1),
				},
				ctx,
			);

			expect(result).toEqual({
				ok: false,
				errors: expect.arrayContaining([
					expect.objectContaining({ path: 'name' }),
					expect.objectContaining({ path: 'instructions' }),
				]),
			});
			expect(agentsService.createSkill).not.toHaveBeenCalled();
		});
	});

	describe('task tools', () => {
		function getSharedTool(service: AgentsBuilderToolsService, name: string) {
			return service
				.getTools(agentId, projectId, credentialProvider, user)
				.shared.find((tool) => tool.name === name)!;
		}

		const task = {
			id: 'task-1',
			agentId,
			projectId,
			name: 'Daily digest',
			goal: 'Summarize yesterday updates.',
			cronExpression: '0 9 * * *',
			active: false,
			lastRunAt: null,
			createdAt: '2026-01-01T00:00:00.000Z',
			updatedAt: '2026-01-01T00:00:00.000Z',
		};

		it('is available to the builder with create and update guidance', () => {
			const { service } = makeService();

			const listTasks = getSharedTool(service, BUILDER_TOOLS.LIST_TASKS);
			const createTask = getSharedTool(service, BUILDER_TOOLS.CREATE_TASK);
			const updateTask = getSharedTool(service, BUILDER_TOOLS.UPDATE_TASK);

			expect(listTasks).toBeDefined();
			expect(createTask.description).toContain('inactive by default');
			expect(updateTask.description).toContain('Call list_tasks first');
		});

		it('creates inactive tasks by default and returns the saved task', async () => {
			const { service, agentTaskService } = makeService();
			agentTaskService.create.mockResolvedValue(task);

			const result = await getSharedTool(service, BUILDER_TOOLS.CREATE_TASK).handler!(
				{
					name: 'Daily digest',
					goal: 'Summarize yesterday updates.',
					cronExpression: '0 9 * * *',
				},
				ctx,
			);

			expect(agentTaskService.create).toHaveBeenCalledWith(projectId, agentId, {
				name: 'Daily digest',
				goal: 'Summarize yesterday updates.',
				cronExpression: '0 9 * * *',
				active: false,
			});
			expect(result).toEqual({ ok: true, task });
		});

		it('surfaces task service errors without throwing from create_task', async () => {
			const { service, agentTaskService } = makeService();
			agentTaskService.create.mockRejectedValue(new Error('Invalid cron expression'));

			const result = await getSharedTool(service, BUILDER_TOOLS.CREATE_TASK).handler!(
				{
					name: 'Daily digest',
					goal: 'Summarize yesterday updates.',
					cronExpression: 'not cron',
				},
				ctx,
			);

			expect(result).toEqual({
				ok: false,
				errors: [{ message: 'Invalid cron expression' }],
			});
		});

		it('requires update_task to change at least one task field', async () => {
			const { service, agentTaskService } = makeService();

			const result = await getSharedTool(service, BUILDER_TOOLS.UPDATE_TASK).handler!(
				{ taskId: 'task-1' },
				ctx,
			);

			expect(agentTaskService.update).not.toHaveBeenCalled();
			expect(result).toEqual({
				ok: false,
				errors: [{ message: 'Pass at least one task field to update.' }],
			});
		});

		it('updates an existing task and returns the saved task', async () => {
			const { service, agentTaskService } = makeService();
			const updated = { ...task, goal: 'Summarize new support tickets.' };
			agentTaskService.update.mockResolvedValue(updated);

			const result = await getSharedTool(service, BUILDER_TOOLS.UPDATE_TASK).handler!(
				{
					taskId: 'task-1',
					goal: 'Summarize new support tickets.',
				},
				ctx,
			);

			expect(agentTaskService.update).toHaveBeenCalledWith(projectId, agentId, 'task-1', {
				goal: 'Summarize new support tickets.',
			});
			expect(result).toEqual({ ok: true, task: updated });
		});
	});
});
