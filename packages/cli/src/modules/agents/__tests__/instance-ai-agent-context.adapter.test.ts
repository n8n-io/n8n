import type { User } from '@n8n/db';
import type { AgentTaskDto } from '@n8n/api-types';
import { beforeEach, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { UserError } from 'n8n-workflow';

import type { McpRegistryService } from '@/modules/mcp-registry/registry/mcp-registry.service';
import { userHasScopes } from '@/permissions.ee/check-access';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

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
	const agentIntegrationService = mock<AgentIntegrationPersistenceService>();
	const attachableWorkflowsService = mock<AttachableWorkflowsService>();
	const mcpRegistryService = mock<McpRegistryService>();
	const agentsToolsService = mock<AgentsToolsService>();
	const service = new InstanceAiAgentContextAdapterService(
		agentsService,
		agentSkillsService,
		agentTaskService,
		agentExecutionService,
		agentIntegrationService,
		attachableWorkflowsService,
		mcpRegistryService,
		agentsToolsService,
	);
	return {
		service,
		agentsService,
		agentSkillsService,
		agentTaskService,
		agentExecutionService,
		agentIntegrationService,
		attachableWorkflowsService,
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
			config: { name: 'Support Agent', model: '', instructions: 'Help users.' },
			configHash: expect.stringMatching(/^[a-f0-9]{64}$/),
			agent: {
				id: 'agent-1',
				published: true,
				draftVersionId: 'draft-1',
				activeVersionId: 'published-1',
			},
		});
	});

	it('lists agents in the bound project', async () => {
		const { service, agentsService } = makeService();
		agentsService.findByProjectId.mockResolvedValue([
			agent,
			{ ...agent, id: 'agent-2', name: 'Research Agent', activeVersionId: null },
		]);

		const result = await service.createReader(user, 'project-1').lookup({ type: 'agents' });

		expect(agentsService.findByProjectId).toHaveBeenCalledWith('project-1');
		expect(result).toEqual({
			agents: [
				{
					agentId: 'agent-1',
					name: 'Support Agent',
					published: true,
					updatedAt: '2026-09-17T10:00:00.000Z',
				},
				{
					agentId: 'agent-2',
					name: 'Research Agent',
					published: false,
					updatedAt: '2026-09-17T10:00:00.000Z',
				},
			],
		});
	});

	it('lists chat channels and searches callable integrations', async () => {
		const { service, agentIntegrationService, mcpRegistryService, agentsToolsService } =
			makeService();
		const channels = [
			{
				type: 'linear',
				label: 'Linear',
				icon: 'linear',
				credentialTypes: ['linearOAuth2Api'],
				capabilities: ['Receive Linear issue/comment events'],
				useIntegrationWhen: ['The agent receives Linear issue comments'],
				useNodeToolWhen: ['The agent creates Linear tickets'],
			},
		];
		agentIntegrationService.listChatIntegrations.mockReturnValue(channels);
		mcpRegistryService.search.mockResolvedValue([]);
		agentsToolsService.searchAgentToolNodes.mockResolvedValue({
			results: '',
			queriesWithNoResults: ['linear'],
		});
		const reader = service.createReader(user, 'project-1');

		expect(await reader.lookup({ type: 'integrations' })).toEqual({ channels });
		expect(await reader.lookup({ type: 'integrations', queries: ['linear'] })).toEqual({
			kind: 'node',
			results: '',
			queriesWithNoResults: ['linear'],
		});
		expect(mcpRegistryService.search).toHaveBeenCalledWith(['linear']);
	});

	it('lists attachable workflows using the search term', async () => {
		const { service, attachableWorkflowsService } = makeService();
		const workflows = [
			{ id: 'wf-1', name: 'Billing follow-up', published: true, triggerType: 'executeWorkflow' },
		];
		attachableWorkflowsService.list.mockResolvedValue(workflows);

		const result = await service.createReader(user, 'project-1').lookup({
			type: 'attachable-workflows',
			searchTerm: 'billing',
		});

		expect(attachableWorkflowsService.list).toHaveBeenCalledWith(user, 'project-1', 'billing');
		expect(result).toEqual({ workflows });
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

	it.each([
		['missing', new NotFoundError('Skill not found')],
		['inaccessible', new ForbiddenError('Skill is not accessible')],
	])('returns an actionable error for skill access (%s)', async (_kind, error) => {
		const { service, agentsService, agentSkillsService } = makeService();
		agentsService.findById.mockResolvedValue(agent);
		agentSkillsService.getSkill.mockRejectedValue(error);

		const lookup = service.createReader(user, 'project-1').lookup({
			type: 'skill',
			agentId: 'agent-1',
			skillId: 'unknown',
		});
		await expect(lookup).rejects.toBeInstanceOf(UserError);
		await expect(lookup).rejects.toThrow(error.message);
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
