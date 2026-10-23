import type { ProjectScopeService } from '@n8n/backend-services';
import type { User } from '@n8n/db';
import { ForbiddenError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import type { AgentTaskService } from '@/modules/agents/agent-task.service';
import type { AgentsService } from '@/modules/agents/agents.service';

import { looseAgentsFixture } from '../../../__tests__/fixtures/agent-package-fixtures';
import { serializedAgentSchema } from '../../../spec/serialized/agent.schema';
import { AgentImportMatchService } from '../agent-import-match.service';

function setup() {
	const projects = mock<ProjectScopeService>();
	projects.getProjectIds.mockResolvedValue(null);
	const agents = mock<AgentsService>();
	agents.findImportCandidates.mockResolvedValue([]);
	agents.findImportIdOwners.mockResolvedValue([]);
	const tasks = mock<AgentTaskService>();
	tasks.findImportIdOwners.mockResolvedValue([]);
	return {
		projects,
		agents,
		tasks,
		context: { user: mock<User>(), projectId: 'destination' },
		service: new AgentImportMatchService(projects, agents, tasks),
	};
}

describe('AgentImportMatchService', () => {
	it('checks project read access before reading destination Agents', async () => {
		const { service, projects, agents, context } = setup();
		projects.getProjectIds.mockResolvedValue(['different-project']);
		await expect(service.findBySourceAgentIds(context, ['source'])).rejects.toThrow(ForbiddenError);
		expect(projects.getProjectIds).toHaveBeenCalledWith(context.user, ['agent:read']);
		expect(agents.findImportCandidates).not.toHaveBeenCalled();
	});

	it('omits both task mappings when two proposed owners use one ID', async () => {
		const { service, context } = setup();
		const content = serializedAgentSchema.parse(
			looseAgentsFixture().files['agents/support/agent.json'],
		);
		const tasks = { shared_task: content.tasks.support_source_task };
		const sources = ['first', 'second'].map((sourceAgentId) => ({ sourceAgentId, tasks }));
		const identities = await service.allocateAgentIds(
			await service.findBySourceAgentIds(context, ['first', 'second']),
		);
		const result = await service.mapTaskIds(sources, identities);
		expect([...result.taskIdsBySourceAgentId.values()].map((map) => map.size)).toEqual([0, 0]);
		expect(result.idConflicts).toEqual([
			{
				sourceAgentId: 'first',
				targetAgentId: 'first',
				sourceTaskId: 'shared_task',
				targetTaskId: 'shared_task',
				conflictingAgentId: 'second',
			},
			{
				sourceAgentId: 'second',
				targetAgentId: 'second',
				sourceTaskId: 'shared_task',
				targetTaskId: 'shared_task',
				conflictingAgentId: 'first',
			},
		]);
	});
});
