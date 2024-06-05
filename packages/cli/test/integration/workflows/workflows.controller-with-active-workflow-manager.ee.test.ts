import type { User } from '@db/entities/User';

import * as utils from '../shared/utils/';
import * as testDb from '../shared/testDb';
import { createUser } from '../shared/db/users';
import { createWorkflowWithTrigger } from '../shared/db/workflows';
import { createTeamProject } from '../shared/db/projects';
import { mockInstance } from '../../shared/mocking';
import { WaitTracker } from '@/WaitTracker';

let member: User;
let anotherMember: User;

const testServer = utils.setupTestServer({
	endpointGroups: ['workflows'],
	enabledFeatures: ['feat:sharing', 'feat:advancedPermissions'],
});

// This is necessary for the tests to shutdown cleanly.
mockInstance(WaitTracker);

beforeAll(async () => {
	member = await createUser({ role: 'global:member' });
	anotherMember = await createUser({ role: 'global:member' });

	await utils.initNodeTypes();
});

beforeEach(async () => {
	await testDb.truncate(['Workflow', 'SharedWorkflow']);
});

describe('PUT /:workflowId/transfer', () => {
	// This tests does not mock the ActiveWorkflowManager, which helps catching
	// possible deadlocks when using transactions wrong.
	test('can transfer an active workflow', async () => {
		//
		// ARRANGE
		//
		const destinationProject = await createTeamProject('Team Project', member);

		const workflow = await createWorkflowWithTrigger({ active: true }, member);

		//
		// ACT
		//
		const response = await testServer
			.authAgentFor(member)
			.put(`/workflows/${workflow.id}/transfer`)
			.send({ destinationProjectId: destinationProject.id })
			.expect(200);

		//
		// ASSERT
		//
		expect(response.body).toEqual({});
	});
});
