import express from 'express';

import * as utils from './shared/utils';
import * as testDb from './shared/testDb';
import { WorkflowEntity } from '../../src/databases/entities/WorkflowEntity';
import type { Role } from '../../src/databases/entities/Role';
import { INode } from 'n8n-workflow';

jest.mock('../../src/telemetry');

let app: express.Application;
let testDbName = '';
let globalOwnerRole: Role;

beforeAll(async () => {
	app = await utils.initTestServer({
		endpointGroups: ['workflows'],
		applyAuth: true,
	});
	const initResult = await testDb.init();
	testDbName = initResult.testDbName;

	globalOwnerRole = await testDb.getGlobalOwnerRole();

	utils.initTestLogger();
	utils.initTestTelemetry();
});

beforeEach(async () => {
	await testDb.truncate(['User', 'Workflow', 'SharedWorkflow'], testDbName);
});

afterAll(async () => {
	await testDb.terminate(testDbName);
});

test('POST /workflows should store pin data for node in workflow', async () => {
	const ownerShell = await testDb.createUserShell(globalOwnerRole);
	const authOwnerAgent = utils.createAgent(app, { auth: true, user: ownerShell });

	const workflow = makeWorkflow({ withPinData: true });

	const response = await authOwnerAgent.post('/workflows').send(workflow);

	expect(response.statusCode).toBe(200);

	const { pinData } = response.body.data;

	expect(pinData).toMatchObject({ Spotify: { myKey: 'myValue' } });
});

test('POST /workflows should set pin data to null if no pin data', async () => {
	const ownerShell = await testDb.createUserShell(globalOwnerRole);
	const authOwnerAgent = utils.createAgent(app, { auth: true, user: ownerShell });

	const workflow = makeWorkflow({ withPinData: false });

	const response = await authOwnerAgent.post('/workflows').send(workflow);

	expect(response.statusCode).toBe(200);

	const { pinData } = response.body.data;

	expect(pinData).toBeNull();
});

test('GET /workflows/:id should return pin data', async () => {
	const ownerShell = await testDb.createUserShell(globalOwnerRole);
	const authOwnerAgent = utils.createAgent(app, { auth: true, user: ownerShell });

	const workflow = makeWorkflow({ withPinData: true });

	await authOwnerAgent.post('/workflows').send(workflow);

	const response = await authOwnerAgent.get('/workflows/1');

	expect(response.statusCode).toBe(200);

	const { pinData } = response.body.data as { pinData: object };

	expect(pinData).toMatchObject({ Spotify: { myKey: 'myValue' } });
});

function makeWorkflow({ withPinData }: { withPinData: boolean }) {
	const workflow = new WorkflowEntity();

	workflow.name = 'My Workflow';
	workflow.active = false;
	workflow.connections = {};
	workflow.nodes = [
		{
			name: 'Spotify',
			type: 'n8n-nodes-base.spotify',
			parameters: { resource: 'track', operation: 'get', id: '123' },
			typeVersion: 1,
			position: [740, 240],
		},
	];

	if (withPinData) {
		workflow.pinData = { Spotify: { myKey: 'myValue' } };
	}

	return workflow;
}
