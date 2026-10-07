import { N8N_CHAT_INTEGRATION_TYPE } from '@n8n/api-types';
import { createTeamProject, linkUserToProject, mockLogger, testDb } from '@n8n/backend-test-utils';
import { UserRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { PROJECT_ADMIN_ROLE_SLUG, PROJECT_VIEWER_ROLE_SLUG } from '@n8n/permissions';
import { mock } from 'vitest-mock-extended';

import type { AgentTestRunService } from '@/modules/agents/agent-test-run.service';
import { AgentWorkflowToolResumeService } from '@/modules/agents/agent-workflow-tool-resume.service';
import { hasScopes } from '@/permissions.ee/scope-access';

import { createMember } from '../shared/db/users';

describe('Preview workflow resume permissions', () => {
	beforeAll(async () => {
		await testDb.init();
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	it.each([
		{ role: PROJECT_ADMIN_ROLE_SLUG, expected: true },
		{ role: PROJECT_VIEWER_ROLE_SLUG, expected: false },
	])('restores the workflow permissions of a stored $role user', async ({ role, expected }) => {
		const user = await createMember();
		const project = await createTeamProject();
		await linkUserToProject(user, project, role);

		let canExecute: boolean | undefined;
		const agentTestRunService = mock<AgentTestRunService>();
		agentTestRunService.resumeDraftRun.mockImplementation(async (input) => {
			canExecute = await hasScopes(input.user, ['workflow:execute'], false, {
				projectId: input.projectId,
			});
			return { status: 'session_not_found' };
		});
		const service = new AgentWorkflowToolResumeService(
			mockLogger(),
			Container.get(UserRepository),
			agentTestRunService,
			mock(),
			mock(),
			mock(),
			mock(),
			mock(),
			mock(),
			mock(),
			mock(),
			mock(),
		);

		await service.resume(
			{
				agentId: 'agent-1',
				projectId: project.id,
				threadId: 'thread-1',
				runId: 'run-1',
				toolCallId: 'tool-call-1',
				integrationType: N8N_CHAT_INTEGRATION_TYPE,
				userId: user.id,
				previewChat: true,
			},
			'success',
		);

		expect(canExecute).toBe(expected);
	});
});
