import type { User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { McpRegistryService } from '@/modules/mcp-registry/registry/mcp-registry.service';

import type { AgentExecutionService, ThreadListItem } from '../agent-execution.service';
import type { AgentIntegrationPersistenceService } from '../agent-integration-persistence.service';
import type { AgentSkillsService } from '../agent-skills.service';
import type { AgentTaskService } from '../agent-task.service';
import type { AgentsToolsService } from '../agents-tools.service';
import type { AgentsService } from '../agents.service';
import type { AttachableWorkflowsService } from '../attachable-workflows.service';
import type { Agent } from '../entities/agent.entity';
import { InstanceAiAgentContextAdapterService } from '../instance-ai-agent-context.adapter';

function makeService() {
	const agentsService = mock<AgentsService>();
	const agentExecutionService = mock<AgentExecutionService>();
	const service = new InstanceAiAgentContextAdapterService(
		agentsService,
		mock<AgentSkillsService>(),
		mock<AgentTaskService>(),
		agentExecutionService,
		mock<AgentIntegrationPersistenceService>(),
		mock<AttachableWorkflowsService>(),
		mock<McpRegistryService>(),
		mock<AgentsToolsService>(),
	);
	return { service, agentsService, agentExecutionService };
}

const user = mock<User>();
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
	it('labels config as the current draft and includes publication state', async () => {
		const { service, agentsService } = makeService();
		agentsService.findById.mockResolvedValue(agent);

		const result = await service.createReader(user, 'project-1').lookup({
			type: 'config',
			agentId: 'agent-1',
		});

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
			5,
			undefined,
			{ status: 'error' },
		);
		expect(result).toMatchObject({ sessions: [{ threadId: 'thread-1', status: 'error' }] });
	});
});
