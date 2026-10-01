import {
	createTeamProject,
	createWorkflow,
	linkUserToProject,
	mockInstance,
	shareWorkflowWithUsers,
	testDb,
} from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';

import { TestWebhooks } from '@/webhooks/test-webhooks';

import { createMember, createOwner } from '../shared/db/users';
import { setupTestServer } from '../shared/utils';

const testWebhooks = mockInstance(TestWebhooks);

const testServer = setupTestServer({
	endpointGroups: ['test-webhooks'],
	enabledFeatures: ['feat:sharing'],
	quotas: {
		'quota:maxTeamProjects': -1,
	},
});

let owner: User;
let member: User;

beforeEach(async () => {
	await testDb.truncate(['SharedWorkflow', 'ProjectRelation', 'WorkflowEntity', 'Project', 'User']);
	testWebhooks.cancelWebhook.mockReset();
	testWebhooks.cancelWebhook.mockResolvedValue(true);
	owner = await createOwner();
	member = await createMember();
});

describe('DELETE /test-webhook/:workflowId', () => {
	test('rejects unauthenticated requests', async () => {
		const workflow = await createWorkflow({}, owner);

		await testServer.authlessAgent.delete(`/test-webhook/${workflow.id}`).expect(401);

		expect(testWebhooks.cancelWebhook).not.toHaveBeenCalled();
	});

	test('rejects callers without access to the workflow', async () => {
		const workflow = await createWorkflow({}, owner);

		await testServer.authAgentFor(member).delete(`/test-webhook/${workflow.id}`).expect(403);

		expect(testWebhooks.cancelWebhook).not.toHaveBeenCalled();
	});

	test('rejects callers with project access but no workflow:execute scope', async () => {
		const teamProject = await createTeamProject(undefined, owner);
		await linkUserToProject(member, teamProject, 'project:viewer');
		const workflow = await createWorkflow({}, teamProject);

		await testServer.authAgentFor(member).delete(`/test-webhook/${workflow.id}`).expect(403);

		expect(testWebhooks.cancelWebhook).not.toHaveBeenCalled();
	});

	test('cancels the test webhook for callers with workflow:execute scope', async () => {
		const workflow = await createWorkflow({}, owner);
		await shareWorkflowWithUsers(workflow, [member]);

		await testServer.authAgentFor(member).delete(`/test-webhook/${workflow.id}`).expect(200);

		expect(testWebhooks.cancelWebhook).toHaveBeenCalledTimes(1);
		expect(testWebhooks.cancelWebhook).toHaveBeenCalledWith(workflow.id);
	});

	test('returns 404 when the workflow does not exist', async () => {
		await testServer
			.authAgentFor(member)
			.delete('/test-webhook/00000000-0000-0000-0000-000000000000')
			.expect(404);

		expect(testWebhooks.cancelWebhook).not.toHaveBeenCalled();
	});
});
