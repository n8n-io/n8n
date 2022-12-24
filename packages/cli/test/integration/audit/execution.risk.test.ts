import { v4 as uuid } from 'uuid';
import * as Db from '@/Db';
import { audit } from '@/audit';
import * as packageModel from '@/CommunityNodes/packageModel';
import { BASE_RISKY_NODE_TYPES, EXECUTION_REPORT } from '@/audit/constants';
import { getRiskSection, MOCK_PACKAGE, saveManualTriggerWorkflow } from './utils';
import * as testDb from '../shared/testDb';
import { toReportTitle } from '@/audit/utils';

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

test('should report risky nodes from n8n-nodes-base', async () => {
	const map = BASE_RISKY_NODE_TYPES.reduce<{ [nodeType: string]: string }>((acc, cur) => {
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
					typeVersion: 1,
					position: [0, 0] as [number, number],
				},
			],
		};

		return Db.collections.Workflow.save(details);
	});

	await Promise.all(promises);

	const testAudit = await audit(['execution']);

	const section = getRiskSection(
		testAudit,
		EXECUTION_REPORT.RISK,
		EXECUTION_REPORT.SECTIONS.OFFICIAL_RISKY_NODES,
	);

	expect(section.location).toHaveLength(BASE_RISKY_NODE_TYPES.length);

	for (const loc of section.location) {
		if (loc.kind === 'node') {
			expect(loc.nodeId).toBe(map[loc.nodeType]);
		}
	}
});

test('should not report non-risky nodes from n8n-nodes-base', async () => {
	await saveManualTriggerWorkflow();

	const testAudit = await audit(['execution']);

	const report = testAudit?.[toReportTitle('execution')];

	if (!report) {
		fail('Expected test audit to have instance risk report');
	}

	for (const section of report.sections) {
		expect(section.title).not.toBe(EXECUTION_REPORT.SECTIONS.OFFICIAL_RISKY_NODES);
	}
});

test('should report community nodes', async () => {
	jest.spyOn(packageModel, 'getAllInstalledPackages').mockResolvedValueOnce(MOCK_PACKAGE);

	const testAudit = await audit(['execution']);

	const section = getRiskSection(
		testAudit,
		EXECUTION_REPORT.RISK,
		EXECUTION_REPORT.SECTIONS.COMMUNITY_NODES,
	);

	expect(section.location).toHaveLength(1);

	if (section.location[0].kind === 'community') {
		expect(section.location[0].nodeType).toBe(MOCK_PACKAGE[0].installedNodes[0].type);
	}
});
