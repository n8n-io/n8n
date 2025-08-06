import { testDb } from '@n8n/backend-test-utils';
import { WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import { v4 as uuid } from 'uuid';

import { FILESYSTEM_INTERACTION_NODE_TYPES, FILESYSTEM_REPORT } from '@/security-audit/constants';
import { SecurityAuditService } from '@/security-audit/security-audit.service';

import { getRiskSection, saveManualTriggerWorkflow } from './utils';

let securityAuditService: SecurityAuditService;

beforeAll(async () => {
	await testDb.init();

	securityAuditService = new SecurityAuditService(Container.get(WorkflowRepository), mock());
});

beforeEach(async () => {
	await testDb.truncate(['WorkflowEntity']);
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

		return await Container.get(WorkflowRepository).save(details);
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
