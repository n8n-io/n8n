import { v4 as uuid } from 'uuid';
import * as Db from '@/Db';
import * as testDb from '../../test/integration/shared/testDb';
import { reportOpenWebhooks } from './openWebhooks.report';
import { RISKS, WEBHOOK_VALIDATOR_NODE_TYPES } from './constants';

let testDbName = '';

beforeAll(async () => {
	const initResult = await testDb.init();
	testDbName = initResult.testDbName;
});

beforeEach(async () => {
	await testDb.truncate(['Workflow'], testDbName);
});

afterAll(async () => {
	await testDb.terminate(testDbName);
});

test('should report workflow with webhook lacking authentication', async () => {
	const targetNodeId = uuid();

	const details = {
		name: 'My Test Workflow',
		active: true,
		nodeTypes: {},
		connections: {},
		nodes: [
			{
				parameters: {
					path: uuid(),
					options: {},
				},
				id: targetNodeId,
				name: 'Webhook',
				type: 'n8n-nodes-base.webhook',
				typeVersion: 1,
				position: [0, 0] as [number, number],
				webhookId: uuid(),
			},
		],
	};

	await Db.collections.Workflow.save(details);

	const workflows = await Db.collections.Workflow.find();
	const report = await reportOpenWebhooks(workflows);

	if (report === null) {
		throw new Error(`Report "${RISKS.OPEN_WEBHOOKS}" should not be null`);
	}

	expect(report.risk).toBe(RISKS.OPEN_WEBHOOKS);
	expect(report.locations).toHaveLength(1);

	const [location] = report.locations;

	expect(location.nodeId).toBe(targetNodeId);
});

test('should not report workflows with webhook having basic or header auth', async () => {
	const promises = ['basicAuth', 'headerAuth'].map(async (authType) => {
		const details = {
			name: 'My Test Workflow',
			active: true,
			nodeTypes: {},
			connections: {},
			nodes: [
				{
					parameters: {
						path: uuid(),
						authentication: authType,
						options: {},
					},
					id: uuid(),
					name: 'Webhook',
					type: 'n8n-nodes-base.webhook',
					typeVersion: 1,
					position: [0, 0] as [number, number],
					webhookId: uuid(),
				},
			],
		};

		return Db.collections.Workflow.save(details);
	});

	await Promise.all(promises);

	const workflows = await Db.collections.Workflow.find();
	const report = await reportOpenWebhooks(workflows);

	expect(report).toBeNull();
});

test('should not report workflows with webhooks validated by direct children', async () => {
	const promises = WEBHOOK_VALIDATOR_NODE_TYPES.map(async (nodeType) => {
		const details = {
			name: 'My Test Workflow',
			active: true,
			nodeTypes: {},
			nodes: [
				{
					parameters: {
						path: uuid(),
						options: {},
					},
					id: uuid(),
					name: 'Webhook',
					type: 'n8n-nodes-base.webhook',
					typeVersion: 1,
					position: [0, 0] as [number, number],
					webhookId: uuid(),
				},
				{
					id: uuid(),
					name: 'My Node',
					type: nodeType,
					typeVersion: 1,
					position: [0, 0] as [number, number],
				},
			],
			connections: {
				// eslint-disable-next-line @typescript-eslint/naming-convention
				Webhook: {
					main: [
						[
							{
								node: 'My Node',
								type: 'main',
								index: 0,
							},
						],
					],
				},
			},
		};

		return Db.collections.Workflow.save(details);
	});

	await Promise.all(promises);

	const workflows = await Db.collections.Workflow.find();
	const report = await reportOpenWebhooks(workflows);

	expect(report).toBeNull();
});

test('should not report workflow without webhook', async () => {
	const details = {
		id: 1,
		name: 'My Test Workflow',
		active: false,
		connections: {},
		nodeTypes: {},
		nodes: [
			{
				id: uuid(),
				name: 'My Node',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0] as [number, number],
			},
		],
	};

	await Db.collections.Workflow.save(details);

	const workflows = await Db.collections.Workflow.find();
	const report = await reportOpenWebhooks(workflows);

	expect(report).toBeNull();
});
