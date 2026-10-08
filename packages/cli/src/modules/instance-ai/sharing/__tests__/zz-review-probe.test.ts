import type { Project, User, UserRepository } from '@n8n/db';
import type { Scope } from '@n8n/permissions';
import { mock } from 'vitest-mock-extended';

import type { ProjectService } from '@/services/project.service.ee';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import type { AgentExecutionThread } from '../../../agents/entities/agent-execution-thread.entity';
import { ASSISTANT_AGENT_ID } from '../../assistant-turn-options';
import { SharedThreadPolicy } from '../shared-thread-policy';

const EDITOR: Scope[] = ['instanceAi:message', 'project:read', 'workflow:update'];
const owner = mock<User>({ id: 'owner-1', firstName: 'A', lastName: 'B', role: { slug: 'global:member', scopes: [] } });
const teammate = mock<User>({ id: 'tm-1', firstName: 'C', lastName: 'D', role: { slug: 'global:member', scopes: [] } });
const teamProject = mock<Project>({ id: 'project-1', name: 'Finance', type: 'team' });
const thread = mock<AgentExecutionThread>({
	id: 'thread-1', agentId: ASSISTANT_AGENT_ID, projectId: 'project-1', accessScope: 'project', ownerId: 'owner-1', parentThreadId: null,
});

describe('probe', () => {
	it.each([
		{ toolName: 'credentials', input: { action: 'delete', credentialId: 'owner-personal-cred' } },
		{ toolName: 'data-tables', input: { action: 'delete', dataTableId: 'dt-x', projectId: 'other-project' } },
		{ toolName: 'workspace', input: { action: 'delete-folder', folderId: 'f-1', projectId: 'other-project' } },
	])('editor in thread project approves $toolName card on a resource outside it', async (call) => {
		const projectService = mock<ProjectService>();
		const users = mock<UserRepository>();
		const workflowFinder = mock<WorkflowFinderService>();
		projectService.findProject.mockResolvedValue(teamProject);
		projectService.getProjectScopesForUser.mockImplementation(async (_u, pid) => (pid === 'project-1' ? EDITOR : []));
		const policy = new SharedThreadPolicy(projectService, users, workflowFinder);
		const answer = await policy.authorizeAnswer(teammate, thread, call, { kind: 'approval', approved: true });
		expect(answer).toEqual({ kind: 'approval', approved: true });
		expect(workflowFinder.findWorkflowHeadForUser).not.toHaveBeenCalled();
		expect(projectService.getProjectScopesForUser).toHaveBeenCalledTimes(1);
		expect(projectService.getProjectScopesForUser).toHaveBeenCalledWith(teammate, 'project-1');
	});
});
