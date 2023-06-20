import { v4 as uuid } from 'uuid';
import * as Db from '@/Db';
import { audit } from '@/audit';
import * as packageModel from '@/CommunityNodes/packageModel';
import { OFFICIAL_RISKY_NODE_TYPES, NODES_REPORT } from '@/audit/constants';
import { getRiskSection, MOCK_PACKAGE, saveManualTriggerWorkflow } from './utils';
import * as testDb from '../shared/testDb';
import { toReportTitle } from '@/audit/utils';
import { mockInstance } from '../shared/utils';
import { LoadNodesAndCredentials } from '@/LoadNodesAndCredentials';
import { NodeTypes } from '@/NodeTypes';
import { WorkflowEntity } from '@/databases/entities/WorkflowEntity';

const nodesAndCredentials = mockInstance(LoadNodesAndCredentials);
nodesAndCredentials.getCustomDirectories.mockReturnValue([]);
mockInstance(NodeTypes);

beforeAll(async () => {
	await testDb.init();
});

beforeEach(async () => {
	await testDb.truncate(['Workflow']);
});

afterAll(async () => {
	await testDb.terminate();
});

test('should report risky official nodes', async () => {
	const map = [...OFFICIAL_RISKY_NODE_TYPES].reduce<{ [nodeType: string]: string }>((acc, cur) => {
		return (acc[cur] = uuid()), acc;
	}, {});

	const promises = Object.entries(map).map(async ([nodeType, nodeId]) => {
		const details = new WorkflowEntity({
			name: 'My Test Workflow',
			active: false,
			connections: {},
			nodes: [
				{
					id: nodeId,
					name: 'My Node',
					type: nodeType,
					typeVersion: 1,
					position: [0, 0] as [number, number],
					parameters: {},
				},
			],
		});

		return Db.collections.Workflow.save(details);
	});

	await Promise.all(promises);

	const testAudit = await audit(['nodes']);

	const section = getRiskSection(
		testAudit,
		NODES_REPORT.RISK,
		NODES_REPORT.SECTIONS.OFFICIAL_RISKY_NODES,
	);

	expect(section.location).toHaveLength(OFFICIAL_RISKY_NODE_TYPES.size);

	for (const loc of section.location) {
		if (loc.kind === 'node') {
			expect(loc.nodeId).toBe(map[loc.nodeType]);
		}
	}
});

test('should not report non-risky official nodes', async () => {
	await saveManualTriggerWorkflow();

	const testAudit = await audit(['nodes']);
	if (Array.isArray(testAudit)) return;

	const report = testAudit[toReportTitle('nodes')];
	if (!report) return;

	for (const section of report.sections) {
		expect(section.title).not.toBe(NODES_REPORT.SECTIONS.OFFICIAL_RISKY_NODES);
	}
});

test('should report community nodes', async () => {
	jest.spyOn(packageModel, 'getAllInstalledPackages').mockResolvedValueOnce(MOCK_PACKAGE);

	const testAudit = await audit(['nodes']);

	const section = getRiskSection(
		testAudit,
		NODES_REPORT.RISK,
		NODES_REPORT.SECTIONS.COMMUNITY_NODES,
	);

	expect(section.location).toHaveLength(1);

	if (section.location[0].kind === 'community') {
		expect(section.location[0].nodeType).toBe(MOCK_PACKAGE[0].installedNodes[0].type);
	}
});
