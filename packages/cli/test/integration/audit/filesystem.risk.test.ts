import { v4 as uuid } from 'uuid';
import * as Db from '@/Db';
import { audit } from '@/audit';
import { FILESYSTEM_INTERACTION_NODE_TYPES, FILESYSTEM_REPORT } from '@/audit/constants';
import { getRiskSection, saveManualTriggerWorkflow } from './utils';
import * as testDb from '../shared/testDb';

beforeAll(async () => {
	await testDb.init();
});

beforeEach(async () => {
	await testDb.truncate(['Workflow']);
});

afterAll(async () => {
	await testDb.terminate();
});

test('should report filesystem interaction nodes', async () => {
	const map = [...FILESYSTEM_INTERACTION_NODE_TYPES].reduce<{ [nodeType: string]: string }>(
		(acc, cur) => {
			return (acc[cur] = uuid()), acc;
		},
		{},
	);

	const promises = Object.entries(map).map(async ([nodeType, nodeId]) => {
		const details = Db.collections.Workflow.create({
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

	const testAudit = await audit(['filesystem']);

	const section = getRiskSection(
		testAudit,
		FILESYSTEM_REPORT.RISK,
		FILESYSTEM_REPORT.SECTIONS.FILESYSTEM_INTERACTION_NODES,
	);

	expect(section.location).toHaveLength(FILESYSTEM_INTERACTION_NODE_TYPES.size);

	for (const loc of section.location) {
		if (loc.kind === 'node') {
			expect(loc.nodeId).toBe(map[loc.nodeType]);
		}
	}
});

test('should not report non-filesystem-interaction node', async () => {
	await saveManualTriggerWorkflow();

	const testAudit = await audit(['filesystem']);

	expect(testAudit).toBeEmptyArray();
});
