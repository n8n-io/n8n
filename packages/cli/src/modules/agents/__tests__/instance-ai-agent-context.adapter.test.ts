import type { User } from '@n8n/db';
import type { AgentTaskDto } from '@n8n/api-types';
import { beforeEach, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { McpRegistryService } from '@/modules/mcp-registry/registry/mcp-registry.service';
import { userHasScopes } from '@/permissions.ee/check-access';

import type { AgentExecutionService, ThreadListItem } from '../agent-execution.service';
import type { AgentIntegrationPersistenceService } from '../agent-integration-persistence.service';
import type { AgentSkillsService } from '../agent-skills.service';
import type { AgentTaskService } from '../agent-task.service';
import type { AgentsToolsService } from '../agents-tools.service';
import type { AgentsService } from '../agents.service';
import type { AttachableWorkflowsService } from '../attachable-workflows.service';
import type { Agent } from '../entities/agent.entity';
import { InstanceAiAgentContextAdapterService } from '../instance-ai-agent-context.adapter';

vi.mock('@/permissions.ee/check-access', () => ({ userHasScopes: vi.fn() }));

function makeService() {
	const agentsService = mock<AgentsService>();
	const agentSkillsService = mock<AgentSkillsService>();
	const agentTaskService = mock<AgentTaskService>();
	const agentExecutionService = mock<AgentExecutionService>();
	const mcpRegistryService = mock<McpRegistryService>();
	const agentsToolsService = mock<AgentsToolsService>();
	const service = new InstanceAiAgentContextAdapterService(
		agentsService,
		agentSkillsService,
		agentTaskService,
		agentExecutionService,
		mock<AgentIntegrationPersistenceService>(),
		mock<AttachableWorkflowsService>(),
		mcpRegistryService,
		agentsToolsService,
	);
	return {
		service,
		agentsService,
		agentSkillsService,
		agentTaskService,
		agentExecutionService,
		mcpRegistryService,
		agentsToolsService,
	};
}

const user = mock<User>({ id: 'user-1' });
const agent = {
	id: 'agent-1',
	projectId: 'project-1',
	name: 'Support Agent',
	schema: { name: 'Support Agent', model: '', instructions: 'Help users.' },
	integrations: [],
	tools: {},
	skills: {},
	versionId: 'draft-1',
	activeVersionId: 'published-1',
	updatedAt: new Date('2026-09-17T10:00:00.000Z'),
} as unknown as Agent;

describe('InstanceAiAgentContextAdapterService', () => {
	beforeEach(() => {
		vi.mocked(userHasScopes).mockReset();
		vi.mocked(userHasScopes).mockResolvedValue(true);
	});

	it('labels config as the current draft and includes publication state', async () => {
		const { service, agentsService } = makeService();
		agentsService.findById.mockResolvedValue(agent);

		const result = await service.createReader(user, 'project-1').lookup({
			type: 'config',
			agentId: 'agent-1',
		});

		expect(agentsService.findById).toHaveBeenCalledWith('agent-1', 'project-1');
		expect(result).toMatchObject({
			configState: 'current-draft',
			agent: {
				id: 'agent-1',
				published: true,
				draftVersionId: 'draft-1',
				activeVersionId: 'published-1',
			},
		});
	});

	it('lists configurable fields without an Agent id', async () => {
		const { service, agentsService } = makeService();

		const result = await service.createReader(user, 'project-1').lookup({
			type: 'config-schema',
		});

		expect(result.configurableProperties).toContain('maxIterations?: integer [1..200]');
		expect(result.configurableProperties).toContain('skills?:');
		expect(result.configurableProperties).toContain('tools?:');
		expect(agentsService.findById).not.toHaveBeenCalled();
	});

	it('reads skill references through the shared projection', async () => {
		const { service, agentsService, agentSkillsService } = makeService();
		agentsService.findById.mockResolvedValue(agent);
		agentSkillsService.getSkill.mockResolvedValue({
			name: 'Support',
			description: 'Handle support requests',
			instructions: 'Read the support guide.',
			references: [
				{ path: 'guide.md', content: 'Guide' },
				{ path: 'notes.md', content: 'Notes' },
			],
		});

		const result = await service.createReader(user, 'project-1').lookup({
			type: 'skill',
			agentId: 'agent-1',
			skillId: 'support',
			referencePaths: ['guide.md'],
		});

		expect(result).toMatchObject({
			id: 'support',
			skill: {
				references: [
					{ path: 'guide.md', characterCount: 5, content: 'Guide' },
					{ path: 'notes.md', characterCount: 5 },
				],
			},
		});
	});

	it('reads task enabled state from the current Agent config', async () => {
		const { service, agentsService, agentTaskService } = makeService();
		agentsService.findById.mockResolvedValue({
			...agent,
			schema: {
				...agent.schema,
				name: 'Support Agent',
				model: '',
				instructions: 'Help users.',
				tasks: [{ type: 'task', id: 'task-1', enabled: true }],
			},
		});
		agentTaskService.list.mockResolvedValue([
			mock<AgentTaskDto>({ id: 'task-1', name: 'Daily' }),
			mock<AgentTaskDto>({ id: 'task-2', name: 'Weekly' }),
		]);

		const result = await service.createReader(user, 'project-1').lookup({
			type: 'tasks',
			agentId: 'agent-1',
		});

		expect(result.tasks).toMatchObject([
			{ id: 'task-1', enabled: true },
			{ id: 'task-2', enabled: false },
		]);
	});

	it('scopes session filters to the bound project and Agent', async () => {
		const { service, agentsService, agentExecutionService } = makeService();
		agentsService.findById.mockResolvedValue(agent);
		agentExecutionService.getThreads.mockResolvedValue({
			threads: [
				{
					id: 'thread-1',
					agentId: 'agent-1',
					agentName: 'Support Agent',
					title: 'Failed request',
					sessionNumber: 2,
					createdAt: new Date('2026-09-17T10:00:00.000Z'),
					updatedAt: new Date('2026-09-17T10:05:00.000Z'),
					status: 'error',
					source: 'preview',
					failureSummary: null,
					totalPromptTokens: 10,
					totalCompletionTokens: 5,
					totalDuration: 100,
				} as ThreadListItem,
			],
			nextCursor: null,
		});

		const result = await service.createReader(user, 'project-1').lookup({
			type: 'sessions',
			agentId: 'agent-1',
			limit: 5,
			status: 'error',
		});

		expect(agentExecutionService.getThreads).toHaveBeenCalledWith(
			'project-1',
			'agent-1',
			'user-1',
			5,
			undefined,
			{ status: 'error' },
		);
		expect(result).toMatchObject({ sessions: [{ threadId: 'thread-1', status: 'error' }] });
	});

	it('does not read context when the user lacks Agent read access', async () => {
		const { service, agentsService } = makeService();
		vi.mocked(userHasScopes).mockResolvedValue(false);

		await expect(
			service.createReader(user, 'project-1').lookup({ type: 'agents' }),
		).rejects.toThrow("You don't have permission to read Agents in this project.");
		expect(agentsService.findByProjectId).not.toHaveBeenCalled();
	});

	it('ignores templated MCP results and falls back to node tools', async () => {
		const { service, mcpRegistryService, agentsToolsService } = makeService();
		mcpRegistryService.search.mockResolvedValue([
			{
				slug: 'templated-server',
				name: 'templatedServer',
				title: 'Templated server',
				description: 'Requires a credential value in its endpoint.',
				url: '={{$self["host"]}}/mcp',
				transport: 'streamableHttp',
				authentication: 'templatedApi',
				credentialType: 'templatedApi',
				tools: [],
				metadata: { nodeTypeName: '@n8n/mcp.templatedServer' },
				isTemplated: true,
			},
		]);
		agentsToolsService.searchAgentToolNodes.mockResolvedValue({
			results: '## HTTP Request',
			queriesWithNoResults: [],
		});

		const result = await service.createReader(user, 'project-1').lookup({
			type: 'integrations',
			queries: ['HTTP'],
		});

		expect(result).toEqual({
			kind: 'node',
			results: '## HTTP Request',
			queriesWithNoResults: [],
		});
	});
});
