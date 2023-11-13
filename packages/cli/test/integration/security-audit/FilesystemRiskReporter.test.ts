import { v4 as uuid } from 'uuid';
import { SecurityAuditService } from '@/security-audit/SecurityAudit.service';
import { FILESYSTEM_INTERACTION_NODE_TYPES, FILESYSTEM_REPORT } from '@/security-audit/constants';
import { getRiskSection, saveManualTriggerWorkflow } from './utils';
import * as testDb from '../shared/testDb';
import { WorkflowRepository } from '@db/repositories/workflow.repository';
import Container from 'typedi';

let securityAuditService: SecurityAuditService;

beforeAll(async () => {
	await testDb.init();

	securityAuditService = new SecurityAuditService(Container.get(WorkflowRepository));
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
		const details = Container.get(WorkflowRepository).create({
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

		return Container.get(WorkflowRepository).save(details);
	});

	await Promise.all(promises);

	const testAudit = await securityAuditService.run(['filesystem']);

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

	const testAudit = await securityAuditService.run(['filesystem']);

	expect(testAudit).toBeEmptyArray();
});
