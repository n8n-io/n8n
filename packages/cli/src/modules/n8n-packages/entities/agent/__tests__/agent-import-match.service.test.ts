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

	it('reports both proposed owners when they use one task ID', async () => {
		const { service } = setup();
		const content = serializedAgentSchema.parse(
			looseAgentsFixture().files['agents/support/agent.json'],
		);
		const tasks = { shared_task: content.tasks.support_source_task };
		const sources = ['first', 'second'].map((sourceAgentId) => ({ sourceAgentId, tasks }));
		const result = await service.findTaskIdConflicts(sources);
		expect(result).toEqual([
			{
				sourceAgentId: 'first',
				sourceTaskId: 'shared_task',
				conflictingAgentId: 'second',
			},
			{
				sourceAgentId: 'second',
				sourceTaskId: 'shared_task',
				conflictingAgentId: 'first',
			},
		]);
	});
});
