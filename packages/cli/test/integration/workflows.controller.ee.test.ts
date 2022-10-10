import express from 'express';

import * as utils from './shared/utils';
import * as testDb from './shared/testDb';
import { createWorkflow } from './shared/testDb';
import * as UserManagementHelpers from '../../src/UserManagement/UserManagementHelper';
import { v4 as uuid } from 'uuid';

import type { Role } from '../../src/databases/entities/Role';
import config from '../../config';
import type { AuthAgent } from './shared/types';

jest.mock('../../src/telemetry');

// mock whether sharing is enabled or not
jest.spyOn(UserManagementHelpers, 'isSharingEnabled').mockReturnValue(true);

let app: express.Application;
let testDbName = '';

let globalOwnerRole: Role;
let globalMemberRole: Role;
let authAgent: AuthAgent;

beforeAll(async () => {
	app = await utils.initTestServer({
		endpointGroups: ['workflows'],
		applyAuth: true,
	});
	const initResult = await testDb.init();
	testDbName = initResult.testDbName;

	globalOwnerRole = await testDb.getGlobalOwnerRole();
	globalMemberRole = await testDb.getGlobalMemberRole();

	authAgent = utils.createAuthAgent(app);

	utils.initTestLogger();
	utils.initTestTelemetry();

	config.set('enterprise.workflowSharingEnabled', true);
});

beforeEach(async () => {
	await testDb.truncate(['User', 'Workflow', 'SharedWorkflow'], testDbName);
});

afterAll(async () => {
	await testDb.terminate(testDbName);
});

describe('PUT /workflows/:id', () => {
	test('PUT /workflows/:id/share should save sharing with new users', async () => {
		const owner = await testDb.createUser({ globalRole: globalOwnerRole });
		const member = await testDb.createUser({ globalRole: globalMemberRole });
		const workflow = await createWorkflow({}, owner);

		const response = await authAgent(owner)
			.put(`/workflows/${workflow.id}/share`)
			.send({ shareWithIds: [member.id] });

		expect(response.statusCode).toBe(200);

		const sharedWorkflows = await testDb.getWorkflowSharing(workflow);
		expect(sharedWorkflows).toHaveLength(2);
	});

	test('PUT /workflows/:id/share should not fail when sharing with invalid user-id', async () => {
		const owner = await testDb.createUser({ globalRole: globalOwnerRole });
		const workflow = await createWorkflow({}, owner);

		const response = await authAgent(owner)
			.put(`/workflows/${workflow.id}/share`)
			.send({ shareWithIds: [uuid()] });

		expect(response.statusCode).toBe(200);

		const sharedWorkflows = await testDb.getWorkflowSharing(workflow);
		expect(sharedWorkflows).toHaveLength(1);
	});

	test('PUT /workflows/:id/share should allow sharing with multiple users', async () => {
		const owner = await testDb.createUser({ globalRole: globalOwnerRole });
		const member = await testDb.createUser({ globalRole: globalMemberRole });
		const anotherMember = await testDb.createUser({ globalRole: globalMemberRole });
		const workflow = await createWorkflow({}, owner);

		const response = await authAgent(owner)
			.put(`/workflows/${workflow.id}/share`)
			.send({ shareWithIds: [member.id, anotherMember.id] });

		expect(response.statusCode).toBe(200);

		const sharedWorkflows = await testDb.getWorkflowSharing(workflow);
		expect(sharedWorkflows).toHaveLength(3);
	});

	test('PUT /workflows/:id/share should override sharing', async () => {
		const owner = await testDb.createUser({ globalRole: globalOwnerRole });
		const member = await testDb.createUser({ globalRole: globalMemberRole });
		const anotherMember = await testDb.createUser({ globalRole: globalMemberRole });
		const workflow = await createWorkflow({}, owner);

		const authOwnerAgent = authAgent(owner);

		const response = await authOwnerAgent
			.put(`/workflows/${workflow.id}/share`)
			.send({ shareWithIds: [member.id, anotherMember.id] });

		expect(response.statusCode).toBe(200);

		const sharedWorkflows = await testDb.getWorkflowSharing(workflow);
		expect(sharedWorkflows).toHaveLength(3);

		const secondResponse = await authOwnerAgent
			.put(`/workflows/${workflow.id}/share`)
			.send({ shareWithIds: [member.id] });
		expect(secondResponse.statusCode).toBe(200);

		const secondSharedWorkflows = await testDb.getWorkflowSharing(workflow);
		expect(secondSharedWorkflows).toHaveLength(2);
	});
});

describe('GET /workflows/:id', () => {
	test('GET should fail with invalid id', async () => {
		const owner = await testDb.createUser({ globalRole: globalOwnerRole });
		const authOwnerAgent = utils.createAgent(app, { auth: true, user: owner });

		const response = await authOwnerAgent.get('/workflows/potatoes');

		expect(response.statusCode).toBe(400);
	});

	test('GET should return a workflow with owner', async () => {
		const owner = await testDb.createUser({ globalRole: globalOwnerRole });
		const workflow = await createWorkflow({}, owner);
		const authOwnerAgent = utils.createAgent(app, { auth: true, user: owner });

		const response = await authOwnerAgent.get(`/workflows/${workflow.id}`);

		expect(response.statusCode).toBe(200);
		expect(response.body.data.ownedBy).toMatchObject({
			id: owner.id,
			email: owner.email,
			firstName: owner.firstName,
			lastName: owner.lastName,
		});

		expect(response.body.data.sharedWith).toHaveLength(0);
	});

	test('GET should return shared workflow with user data', async () => {
		const owner = await testDb.createUser({ globalRole: globalOwnerRole });
		const member = await testDb.createUser({ globalRole: globalMemberRole });
		const workflow = await createWorkflow({}, owner);
		const authOwnerAgent = utils.createAgent(app, { auth: true, user: owner });
		await testDb.shareWorkflowWithUsers(workflow, [member]);

		const response = await authOwnerAgent.get(`/workflows/${workflow.id}`);

		expect(response.statusCode).toBe(200);
		expect(response.body.data.ownedBy).toMatchObject({
			id: owner.id,
			email: owner.email,
			firstName: owner.firstName,
			lastName: owner.lastName,
		});

		expect(response.body.data.sharedWith).toHaveLength(1);
		expect(response.body.data.sharedWith[0]).toMatchObject({
			id: member.id,
			email: member.email,
			firstName: member.firstName,
			lastName: member.lastName,
		});
	});

	test('GET should return all sharees', async () => {
		const owner = await testDb.createUser({ globalRole: globalOwnerRole });
		const member1 = await testDb.createUser({ globalRole: globalMemberRole });
		const member2 = await testDb.createUser({ globalRole: globalMemberRole });
		const workflow = await createWorkflow({}, owner);
		const authOwnerAgent = utils.createAgent(app, { auth: true, user: owner });
		await testDb.shareWorkflowWithUsers(workflow, [member1, member2]);

		const response = await authOwnerAgent.get(`/workflows/${workflow.id}`);

		expect(response.statusCode).toBe(200);
		expect(response.body.data.ownedBy).toMatchObject({
			id: owner.id,
			email: owner.email,
			firstName: owner.firstName,
			lastName: owner.lastName,
		});

		expect(response.body.data.sharedWith).toHaveLength(2);
	});
});
