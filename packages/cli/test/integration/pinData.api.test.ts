import express from 'express';
import * as utils from './shared/utils';
import type { Role } from '../../src/databases/entities/Role';
import * as testDb from './shared/testDb';
import { Db } from '../../src';
import { WorkflowEntity } from '../../src/databases/entities/WorkflowEntity';

jest.mock('../../src/telemetry');

let app: express.Application;
let testDbName = '';
let globalOwnerRole: Role;

beforeAll(async () => {
	app = utils.initTestServer({
		endpointGroups: ['pinData'],
		applyAuth: true,
	});
	const initResult = await testDb.init();
	testDbName = initResult.testDbName;

	globalOwnerRole = await testDb.getGlobalOwnerRole();

	utils.initTestLogger();
	utils.initTestTelemetry();
});

beforeEach(async () => {
	await testDb.truncate(['User', 'Workflow'], testDbName);
});

afterAll(async () => {
	await testDb.terminate(testDbName);
});

test('POST /workflows/:id/pin-data should pin data to node', async () => {
	const ownerShell = await testDb.createUserShell(globalOwnerRole);
	const authOwnerAgent = utils.createAgent(app, { auth: true, user: ownerShell });

	await createWorkflow();

	const pinDataResponse = await authOwnerAgent.post('/workflows/1/pin-data').send({
		nodeName: 'Spotify',
		pinData: { myKey: 'myValue' },
	});

	expect(pinDataResponse.statusCode).toBe(200);
	expect(pinDataResponse.body.data.success).toBe(true);

	const workflow = await Db.collections.Workflow.findOne('1');

	const node = workflow?.nodes.find((n) => n.name === 'Spotify');

	expect(node?.pinData?.myKey).toBe('myValue'); // pinned
});

test('POST /workflows/:id/pin-data should fail with missing pin data', async () => {
	const ownerShell = await testDb.createUserShell(globalOwnerRole);
	const authOwnerAgent = utils.createAgent(app, { auth: true, user: ownerShell });

	await createWorkflow();

	const pinDataResponse = await authOwnerAgent.post('/workflows/1/pin-data').send({
		nodeName: 'Spotify',
	});

	expect(pinDataResponse.statusCode).toBe(400);

	const workflow = await Db.collections.Workflow.findOne('1');

	const node = workflow?.nodes.find((n) => n.name === 'Spotify');

	expect(node?.pinData).toBeUndefined(); // unaffected
});

test('POST /workflows/:id/pin-data should fail with missing node name', async () => {
	const ownerShell = await testDb.createUserShell(globalOwnerRole);
	const authOwnerAgent = utils.createAgent(app, { auth: true, user: ownerShell });

	await createWorkflow();

	const pinDataResponse = await authOwnerAgent.post('/workflows/1/pin-data').send({
		pinData: { myKey: 'myValue' },
	});

	expect(pinDataResponse.statusCode).toBe(400);

	const workflow = await Db.collections.Workflow.findOne('1');

	const node = workflow?.nodes.find((n) => n.name === 'Spotify');

	expect(node?.pinData).toBeUndefined(); // unaffected
});

test('POST /workflows/:id/unpin-data should unpin data from node', async () => {
	const ownerShell = await testDb.createUserShell(globalOwnerRole);
	const authOwnerAgent = utils.createAgent(app, { auth: true, user: ownerShell });

	await createWorkflow();

	await authOwnerAgent.post('/workflows/1/pin-data').send({
		nodeName: 'Spotify',
		pinData: { myKey: 'myValue' },
	});

	const unpinDataResponse = await authOwnerAgent
		.post('/workflows/1/unpin-data')
		.send({ nodeName: 'Spotify' });

	expect(unpinDataResponse.statusCode).toBe(200);
	expect(unpinDataResponse.body.data.success).toBe(true);

	const workflow = await Db.collections.Workflow.findOne('1');

	const node = workflow?.nodes.find((n) => n.name === 'Spotify');

	expect(node?.pinData).toBeUndefined(); // unpinned
});

test('POST /workflows/:id/unpin-data should fail with missing node name', async () => {
	const ownerShell = await testDb.createUserShell(globalOwnerRole);
	const authOwnerAgent = utils.createAgent(app, { auth: true, user: ownerShell });

	await createWorkflow();

	await authOwnerAgent.post('/workflows/1/pin-data').send({
		nodeName: 'Spotify',
		pinData: { myKey: 'myValue' },
	});

	const unpinDataResponse = await authOwnerAgent.post('/workflows/1/pin-data');

	expect(unpinDataResponse.statusCode).toBe(400);

	const workflow = await Db.collections.Workflow.findOne('1');

	const node = workflow?.nodes.find((n) => n.name === 'Spotify');

	expect(node?.pinData?.myKey).toBe('myValue'); // unaffected
});

async function createWorkflow() {
	const workflow = new WorkflowEntity();

	workflow.name = 'My Workflow';
	workflow.active = false;
	workflow.connections = {};
	workflow.nodes = [
		{
			parameters: {},
			name: 'Start',
			type: 'n8n-nodes-base.start',
			typeVersion: 1,
			position: [250, 300],
		},
		{
			name: 'Spotify',
			type: 'n8n-nodes-base.spotify',
			parameters: { resource: 'track', operation: 'get', id: '123' },
			typeVersion: 1,
			position: [740, 240],
		},
	];

	await Db.collections.Workflow.save(workflow);
}
