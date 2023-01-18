import express from 'express';

import * as utils from './shared/utils';
import * as testDb from './shared/testDb';
import * as UserManagementHelpers from '@/UserManagement/UserManagementHelper';

import type { Role } from '@db/entities/Role';
import type { IPinData } from 'n8n-workflow';
import { makeWorkflow, MOCK_PINDATA } from './shared/utils';

let app: express.Application;
let globalOwnerRole: Role;

// mock whether sharing is enabled or not
jest.spyOn(UserManagementHelpers, 'isSharingEnabled').mockReturnValue(false);

beforeAll(async () => {
	app = await utils.initTestServer({
		endpointGroups: ['workflows'],
		applyAuth: true,
	});
	await testDb.init();

	globalOwnerRole = await testDb.getGlobalOwnerRole();

	utils.initTestLogger();
	utils.initTestTelemetry();
});

beforeEach(async () => {
	await testDb.truncate(['User', 'Workflow', 'SharedWorkflow']);
});

afterAll(async () => {
	await testDb.terminate();
});

test('POST /workflows should store pin data for node in workflow', async () => {
	const ownerShell = await testDb.createUserShell(globalOwnerRole);
	const authOwnerAgent = utils.createAgent(app, { auth: true, user: ownerShell });

	const workflow = makeWorkflow({ withPinData: true });

	const response = await authOwnerAgent.post('/workflows').send(workflow);

	expect(response.statusCode).toBe(200);

	const { pinData } = response.body.data as { pinData: IPinData };

	expect(pinData).toMatchObject(MOCK_PINDATA);
});

test('POST /workflows should set pin data to null if no pin data', async () => {
	const ownerShell = await testDb.createUserShell(globalOwnerRole);
	const authOwnerAgent = utils.createAgent(app, { auth: true, user: ownerShell });

	const workflow = makeWorkflow({ withPinData: false });

	const response = await authOwnerAgent.post('/workflows').send(workflow);

	expect(response.statusCode).toBe(200);

	const { pinData } = response.body.data as { pinData: IPinData };

	expect(pinData).toBeNull();
});

test('GET /workflows/:id should return pin data', async () => {
	const ownerShell = await testDb.createUserShell(globalOwnerRole);
	const authOwnerAgent = utils.createAgent(app, { auth: true, user: ownerShell });

	const workflow = makeWorkflow({ withPinData: true });

	const workflowCreationResponse = await authOwnerAgent.post('/workflows').send(workflow);

	const { id } = workflowCreationResponse.body.data as { id: string };

	const workflowRetrievalResponse = await authOwnerAgent.get(`/workflows/${id}`);

	expect(workflowRetrievalResponse.statusCode).toBe(200);

	const { pinData } = workflowRetrievalResponse.body.data as { pinData: IPinData };

	expect(pinData).toMatchObject(MOCK_PINDATA);
});
