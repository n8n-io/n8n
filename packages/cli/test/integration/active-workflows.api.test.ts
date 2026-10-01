import {
	createActiveWorkflow,
	createTeamProject,
	linkUserToProject,
	shareWorkflowWithProjects,
	shareWorkflowWithUsers,
	testDb,
} from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';

import { createMember, createOwner } from './shared/db/users';
import type { SuperAgentTest } from './shared/types';
import * as utils from './shared/utils/';

let owner: User;
let member: User;
let anotherMember: User;
let authOwnerAgent: SuperAgentTest;
let authMemberAgent: SuperAgentTest;

const testServer = utils.setupTestServer({ endpointGroups: ['activeWorkflows'] });

beforeEach(async () => {
	await testDb.truncate([
		'WorkflowEntity',
		'SharedWorkflow',
		'WorkflowHistory',
		'ProjectRelation',
		'Project',
		'User',
	]);

	owner = await createOwner();
	member = await createMember();
	anotherMember = await createMember();
	authOwnerAgent = testServer.authAgentFor(owner);
	authMemberAgent = testServer.authAgentFor(member);
});

describe('GET /active-workflows', () => {
	it('returns every active workflow id to a global owner', async () => {
		const firstWorkflow = await createActiveWorkflow({}, member);
		const secondWorkflow = await createActiveWorkflow({}, anotherMember);

		const response = await authOwnerAgent.get('/active-workflows').expect(200);

		expect(response.body.data).toEqual(
			expect.arrayContaining([firstWorkflow.id, secondWorkflow.id]),
		);
		expect(response.body.data).toHaveLength(2);
	});

	it('returns only active workflow ids the member can list', async () => {
		const ownWorkflow = await createActiveWorkflow({}, member);

		const sharedWorkflow = await createActiveWorkflow({}, anotherMember);
		await shareWorkflowWithUsers(sharedWorkflow, [member]);

		const teamProject = await createTeamProject('Team Project', anotherMember);
		await linkUserToProject(member, teamProject, 'project:viewer');
		const teamWorkflow = await createActiveWorkflow({}, teamProject);

		const inaccessiblePersonalWorkflow = await createActiveWorkflow({}, anotherMember);
		const inaccessibleProject = await createTeamProject('Other Team Project', anotherMember);
		const inaccessibleProjectWorkflow = await createActiveWorkflow({}, inaccessibleProject);

		const response = await authMemberAgent.get('/active-workflows').expect(200);

		expect(response.body.data).toHaveLength(3);
		expect(response.body.data).toEqual(
			expect.arrayContaining([ownWorkflow.id, sharedWorkflow.id, teamWorkflow.id]),
		);
		expect(response.body.data).not.toContain(inaccessiblePersonalWorkflow.id);
		expect(response.body.data).not.toContain(inaccessibleProjectWorkflow.id);
	});

	// `project:chatUser` is the only built-in project role without `workflow:list`
	it('does not return active workflow ids from a project the member belongs to but cannot list', async () => {
		const chatOnlyProject = await createTeamProject('Chat Only Project', anotherMember);
		await linkUserToProject(member, chatOnlyProject, 'project:chatUser');
		const chatOnlyWorkflow = await createActiveWorkflow({}, chatOnlyProject);

		const response = await authMemberAgent.get('/active-workflows').expect(200);

		expect(response.body.data).toEqual([]);
		expect(response.body.data).not.toContain(chatOnlyWorkflow.id);
	});

	it('returns an active workflow id once when it is shared with several projects the member can list', async () => {
		const workflow = await createActiveWorkflow({}, member);
		const teamProject = await createTeamProject('Team Project', member);
		await shareWorkflowWithProjects(workflow, [{ project: teamProject, role: 'workflow:editor' }]);

		const response = await authMemberAgent.get('/active-workflows').expect(200);

		expect(response.body.data).toEqual([workflow.id]);
	});
});
