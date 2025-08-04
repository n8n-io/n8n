'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const jest_mock_extended_1 = require('jest-mock-extended');
const uuid_1 = require('uuid');
const constants_1 = require('@/security-audit/constants');
const security_audit_service_1 = require('@/security-audit/security-audit.service');
const utils_1 = require('./utils');
let securityAuditService;
beforeAll(async () => {
	await backend_test_utils_1.testDb.init();
	securityAuditService = new security_audit_service_1.SecurityAuditService(
		di_1.Container.get(db_1.WorkflowRepository),
		(0, jest_mock_extended_1.mock)(),
	);
});
beforeEach(async () => {
	await backend_test_utils_1.testDb.truncate(['WorkflowEntity']);
});
afterAll(async () => {
	await backend_test_utils_1.testDb.terminate();
});
test('should report filesystem interaction nodes', async () => {
	const map = [...constants_1.FILESYSTEM_INTERACTION_NODE_TYPES].reduce((acc, cur) => {
		return (acc[cur] = (0, uuid_1.v4)()), acc;
	}, {});
	const promises = Object.entries(map).map(async ([nodeType, nodeId]) => {
		const details = di_1.Container.get(db_1.WorkflowRepository).create({
			name: 'My Test Workflow',
			active: false,
			connections: {},
			nodes: [
				{
					id: nodeId,
					name: 'My Node',
					type: nodeType,
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
			],
		});
		return await di_1.Container.get(db_1.WorkflowRepository).save(details);
	});
	await Promise.all(promises);
	const testAudit = await securityAuditService.run(['filesystem']);
	const section = (0, utils_1.getRiskSection)(
		testAudit,
		constants_1.FILESYSTEM_REPORT.RISK,
		constants_1.FILESYSTEM_REPORT.SECTIONS.FILESYSTEM_INTERACTION_NODES,
	);
	expect(section.location).toHaveLength(constants_1.FILESYSTEM_INTERACTION_NODE_TYPES.size);
	for (const loc of section.location) {
		if (loc.kind === 'node') {
			expect(loc.nodeId).toBe(map[loc.nodeType]);
		}
	}
});
test('should not report non-filesystem-interaction node', async () => {
	await (0, utils_1.saveManualTriggerWorkflow)();
	const testAudit = await securityAuditService.run(['filesystem']);
	expect(testAudit).toBeEmptyArray();
});
//# sourceMappingURL=filesystem-risk-reporter.test.js.map
