import { v4 as uuid } from 'uuid';
import * as Db from '@/Db';
import * as testDb from '../../test/integration/shared/testDb';
import { reportSqlInjection } from './sqlInjectionRisk.report';
import { RISKS, SQL_NODE_TYPES } from './constants';

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

test('should report workflows with nodes risking SQL injection', async () => {
	const map = SQL_NODE_TYPES.reduce<{ [nodeType: string]: string }>((acc, cur) => {
		return (acc[cur] = uuid()), acc;
	}, {});

	const promises = Object.entries(map).map(async ([nodeType, nodeId]) => {
		const details = {
			name: 'My Test Workflow',
			active: false,
			connections: {},
			nodeTypes: {},
			nodes: [
				{
					id: nodeId,
					name: 'My Node',
					type: nodeType,
					parameters: {
						operation: 'executeQuery',
						query: '=SELECT * FROM {{ $json.table }}',
						additionalFields: {},
					},
					typeVersion: 1,
					position: [0, 0] as [number, number],
				},
			],
		};

		return Db.collections.Workflow.save(details);
	});

	await Promise.all(promises);

	const workflows = await Db.collections.Workflow.find();
	const report = await reportSqlInjection(workflows);

	if (report === null) {
		throw new Error(`Report "${RISKS.SQL_INJECTION}" should not be null`);
	}

	expect(report.risk).toBe(RISKS.SQL_INJECTION);
	expect(report.locations).toHaveLength(SQL_NODE_TYPES.length);

	for (const location of report.locations) {
		expect(location.nodeId).toBe(map[location.nodeType]);
	}
});

test('should not report workflow without node risking SQL injection', async () => {
	const details = {
		name: 'My Test Workflow',
		active: false,
		connections: {},
		nodeTypes: {},
		nodes: [
			{
				id: uuid(),
				name: 'My Node',
				type: 'n8n-nodes-base.postgres',
				typeVersion: 1,
				position: [0, 0] as [number, number],
			},
		],
	};

	await Db.collections.Workflow.save(details);

	const workflows = await Db.collections.Workflow.find();
	const report = await reportSqlInjection(workflows);

	expect(report).toBeNull();
});
