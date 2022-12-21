import { v4 as uuid } from 'uuid';
import * as Db from '@/Db';
import * as testDb from '../../test/integration/shared/testDb';
import { reportSqlInjection } from './sqlInjectionRisk.report';
import { REPORT_TITLES, SQL_NODE_TYPES } from './constants';

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

test('should report workflows with qualifying nodes', async () => {
	const map = SQL_NODE_TYPES.reduce<{ [nodeType: string]: string }>((acc, cur) => {
		return (acc[cur] = uuid()), acc;
	}, {});

	const promises = Object.entries(map).map(async ([nodeTypeName, nodeId]) => {
		const details = {
			name: 'My test workflow',
			active: false,
			connections: {},
			nodeTypes: {},
			nodes: [
				{
					id: nodeId,
					name: 'Postgres',
					type: nodeTypeName,
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
		fail(`Report ${REPORT_TITLES.SQL_INJECTION_RISK} should not be null`);
	}

	expect(report.risk).toBe(REPORT_TITLES.SQL_INJECTION_RISK);
	expect(report.locations).toHaveLength(SQL_NODE_TYPES.length);

	for (const location of report.locations) {
		expect(location.nodeId).toBe(map[location.nodeType]);
	}
});

test('should not report workflow without qualifying node', async () => {
	const details = {
		id: 1,
		name: 'My test workflow',
		active: false,
		connections: {},
		nodeTypes: {},
		nodes: [
			{
				id: uuid(),
				name: 'Postgres',
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
