import type { ProjectScopeService } from '@n8n/backend-services';
import type { User } from '@n8n/db';
import { ForbiddenError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import type { AgentTaskRepository } from '@/modules/agents/repositories/agent-task.repository';
import type {
	AgentImportIdentity,
	AgentRepository,
} from '@/modules/agents/repositories/agent.repository';

import { looseAgentsFixture } from '../../../__tests__/fixtures/agent-package-fixtures';
import { serializedAgentSchema } from '../../../spec/serialized/agent.schema';
import { AgentImportMatchService } from '../agent-import-match.service';

function setup() {
	const projects = mock<ProjectScopeService>();
	projects.getProjectIds.mockResolvedValue(null);
	const agents = mock<AgentRepository>();
	agents.findImportCandidates.mockResolvedValue([]);
	agents.findImportIdOwners.mockResolvedValue([]);
	const tasks = mock<AgentTaskRepository>();
	tasks.findImportCandidates.mockResolvedValue([]);
	tasks.findImportIdOwners.mockResolvedValue([]);
	return {
		projects,
		agents,
		tasks,
		context: { user: mock<User>(), projectId: 'destination' },
		service: new AgentImportMatchService(projects, agents, tasks),
	};
}

function candidate(id: string, sourceAgentId: string | null): AgentImportIdentity {
	return { id, sourceAgentId, name: id, projectId: 'destination' };
}

describe('AgentImportMatchService', () => {
	it.each([
		{
			name: 'local ID fallback',
			candidates: [candidate('source', null)],
			target: 'source',
			conflicts: [],
		},
		{
			name: 'recorded identity precedence',
			candidates: [candidate('source', null), candidate('copy', 'source')],
			target: 'copy',
			conflicts: [],
		},
		{
			name: 'foreign recorded identity',
			candidates: [candidate('source', 'foreign')],
			target: undefined,
			conflicts: [],
		},
		{
			name: 'ambiguous recorded identity',
			candidates: [
				candidate('copy-2', 'source'),
				candidate('copy-1', 'source'),
				candidate('source', null),
			],
			target: undefined,
			conflicts: ['copy-1', 'copy-2'],
		},
	])('uses $name', async ({ candidates, target, conflicts }) => {
		const { service, agents, context } = setup();
		agents.findImportCandidates.mockResolvedValue(candidates);
		const matches = await service.findBySourceAgentIds(context, ['source', 'source']);
		expect(matches.sourceAgentIds).toEqual(['source']);
		expect(matches.matches.get('source')?.id).toBe(target);
		expect(
			matches.lineageConflicts.flatMap(({ existingAgents }) => existingAgents.map(({ id }) => id)),
		).toEqual(conflicts);
		if (conflicts.length > 0) {
			const identities = await service.allocateAgentIds(matches);
			expect(identities.identities.size).toBe(0);
			expect(identities.lineageConflicts).toEqual(matches.lineageConflicts);
		}
	});

	it('checks project read access before reading destination Agents', async () => {
		const { service, projects, agents, context } = setup();
		projects.getProjectIds.mockResolvedValue(['different-project']);
		await expect(service.findBySourceAgentIds(context, ['source'])).rejects.toThrow(ForbiddenError);
		expect(projects.getProjectIds).toHaveBeenCalledWith(context.user, ['agent:read']);
		expect(agents.findImportCandidates).not.toHaveBeenCalled();
	});

	it('keeps global ID checks for an authorized pending project', async () => {
		const { service, projects, agents, context } = setup();
		agents.findImportIdOwners.mockResolvedValue([{ id: 'source', projectId: 'other-project' }]);
		const matches = await service.findBySourceAgentIds(
			{ ...context, projectPendingCreation: true },
			['source'],
		);
		const result = await service.allocateAgentIds(matches);
		expect(result.identities.size).toBe(0);
		expect(result.idConflicts).toEqual([
			{ sourceAgentId: 'source', existingAgentId: 'source', existingProjectId: 'other-project' },
		]);
		expect(projects.getProjectIds).not.toHaveBeenCalled();
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
