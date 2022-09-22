import express from 'express';

import * as utils from './shared/utils';
import * as testDb from './shared/testDb';
import { createWorkflow } from './shared/testDb';
import * as UserManagementHelpers from '../../src/UserManagement/UserManagementHelper';

import type { Role } from '../../src/databases/entities/Role';

jest.mock('../../src/telemetry');

// mock whether credentialsSharing is enabled or not
const mockIsCredentialsSharingEnabled = jest.spyOn(UserManagementHelpers, 'isSharingEnabled');
mockIsCredentialsSharingEnabled.mockReturnValue(true);

let app: express.Application;
let testDbName = '';

let globalOwnerRole: Role;
let globalMemberRole: Role;

beforeAll(async () => {
	app = await utils.initTestServer({
		endpointGroups: ['workflows'],
		applyAuth: true,
	});
	const initResult = await testDb.init();
	testDbName = initResult.testDbName;

	globalOwnerRole = await testDb.getGlobalOwnerRole();
	globalMemberRole = await testDb.getGlobalMemberRole();

	utils.initConfigFile();

	utils.initTestLogger();
	utils.initTestTelemetry();
});

beforeEach(async () => {
	await testDb.truncate(['User', 'Workflow', 'SharedWorkflow'], testDbName);
});

afterAll(async () => {
	await testDb.terminate(testDbName);
});

test('PUT /workflows/:id/share should save sharing with new users', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });
	const member = await testDb.createUser({ globalRole: globalMemberRole });
	const workflow = await createWorkflow({}, owner);

	const authOwnerAgent = utils.createAgent(app, { auth: true, user: owner });

	const response = await authOwnerAgent
		.put(`/workflows/${workflow.id}/share`)
		.send({ shareWithIds: [member.id] });

	expect(response.statusCode).toBe(200);

	const sharedWorkflows = await testDb.getWorkflowSharing(workflow);
	expect(sharedWorkflows.length).toBe(2);
});

test('PUT /workflows/:id/share should not fail when sharing with invalid user-id', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });
	const workflow = await createWorkflow({}, owner);

	const authOwnerAgent = utils.createAgent(app, { auth: true, user: owner });

	const response = await authOwnerAgent
		.put(`/workflows/${workflow.id}/share`)
		.send({ shareWithIds: ['invalid-user-id'] });

	expect(response.statusCode).toBe(200);

	const sharedWorkflows = await testDb.getWorkflowSharing(workflow);
	expect(sharedWorkflows.length).toBe(1);
});

test('PUT /workflows/:id/share should allow sharing with multiple users', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });
	const member = await testDb.createUser({ globalRole: globalMemberRole });
	const anotherMember = await testDb.createUser({ globalRole: globalMemberRole });
	const workflow = await createWorkflow({}, owner);

	const authOwnerAgent = utils.createAgent(app, { auth: true, user: owner });

	const response = await authOwnerAgent
		.put(`/workflows/${workflow.id}/share`)
		.send({ shareWithIds: [member.id, anotherMember.id] });

	expect(response.statusCode).toBe(200);

	const sharedWorkflows = await testDb.getWorkflowSharing(workflow);
	expect(sharedWorkflows.length).toBe(3);
});

test('PUT /workflows/:id/share should override sharing', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });
	const member = await testDb.createUser({ globalRole: globalMemberRole });
	const anotherMember = await testDb.createUser({ globalRole: globalMemberRole });
	const workflow = await createWorkflow({}, owner);

	const authOwnerAgent = utils.createAgent(app, { auth: true, user: owner });

	const response = await authOwnerAgent
		.put(`/workflows/${workflow.id}/share`)
		.send({ shareWithIds: [member.id, anotherMember.id] });

	expect(response.statusCode).toBe(200);

	const sharedWorkflows = await testDb.getWorkflowSharing(workflow);
	expect(sharedWorkflows.length).toBe(3);

	const secondResponse = await authOwnerAgent
		.put(`/workflows/${workflow.id}/share`)
		.send({ shareWithIds: [member.id] });

	expect(secondResponse.statusCode).toBe(200);

	const secondSharedWorkflows = await testDb.getWorkflowSharing(workflow);
	expect(secondSharedWorkflows.length).toBe(2);
});
