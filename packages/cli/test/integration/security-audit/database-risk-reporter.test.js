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
test('should report expressions in queries', async () => {
	const map = [...constants_1.SQL_NODE_TYPES].reduce((acc, cur) => {
		return (acc[cur] = (0, uuid_1.v4)()), acc;
	}, {});
	const promises = Object.entries(map).map(async ([nodeType, nodeId]) => {
		const details = {
			id: (0, db_1.generateNanoId)(),
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
					position: [0, 0],
				},
			],
		};
		return await di_1.Container.get(db_1.WorkflowRepository).save(details);
	});
	await Promise.all(promises);
	const testAudit = await securityAuditService.run(['database']);
	const section = (0, utils_1.getRiskSection)(
		testAudit,
		constants_1.DATABASE_REPORT.RISK,
		constants_1.DATABASE_REPORT.SECTIONS.EXPRESSIONS_IN_QUERIES,
	);
	expect(section.location).toHaveLength(constants_1.SQL_NODE_TYPES.size);
	for (const loc of section.location) {
		if (loc.kind === 'node') {
			expect(loc.nodeId).toBe(map[loc.nodeType]);
		}
	}
});
test('should report expressions in query params', async () => {
	const map = [...constants_1.SQL_NODE_TYPES_WITH_QUERY_PARAMS].reduce((acc, cur) => {
		return (acc[cur] = (0, uuid_1.v4)()), acc;
	}, {});
	const promises = Object.entries(map).map(async ([nodeType, nodeId]) => {
		const details = {
			id: (0, db_1.generateNanoId)(),
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
						query: 'SELECT * FROM users WHERE id = $1;',
						additionalFields: {
							queryParams: '={{ $json.userId }}',
						},
					},
					typeVersion: 1,
					position: [0, 0],
				},
			],
		};
		return await di_1.Container.get(db_1.WorkflowRepository).save(details);
	});
	await Promise.all(promises);
	const testAudit = await securityAuditService.run(['database']);
	const section = (0, utils_1.getRiskSection)(
		testAudit,
		constants_1.DATABASE_REPORT.RISK,
		constants_1.DATABASE_REPORT.SECTIONS.EXPRESSIONS_IN_QUERY_PARAMS,
	);
	expect(section.location).toHaveLength(constants_1.SQL_NODE_TYPES_WITH_QUERY_PARAMS.size);
	for (const loc of section.location) {
		if (loc.kind === 'node') {
			expect(loc.nodeId).toBe(map[loc.nodeType]);
		}
	}
});
test('should report unused query params', async () => {
	const map = [...constants_1.SQL_NODE_TYPES_WITH_QUERY_PARAMS].reduce((acc, cur) => {
		return (acc[cur] = (0, uuid_1.v4)()), acc;
	}, {});
	const promises = Object.entries(map).map(async ([nodeType, nodeId]) => {
		const details = {
			id: (0, db_1.generateNanoId)(),
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
						query: 'SELECT * FROM users WHERE id = 123;',
					},
					typeVersion: 1,
					position: [0, 0],
				},
			],
		};
		return await di_1.Container.get(db_1.WorkflowRepository).save(details);
	});
	await Promise.all(promises);
	const testAudit = await securityAuditService.run(['database']);
	const section = (0, utils_1.getRiskSection)(
		testAudit,
		constants_1.DATABASE_REPORT.RISK,
		constants_1.DATABASE_REPORT.SECTIONS.UNUSED_QUERY_PARAMS,
	);
	expect(section.location).toHaveLength(constants_1.SQL_NODE_TYPES_WITH_QUERY_PARAMS.size);
	for (const loc of section.location) {
		if (loc.kind === 'node') {
			expect(loc.nodeId).toBe(map[loc.nodeType]);
		}
	}
});
test('should not report non-database node', async () => {
	await (0, utils_1.saveManualTriggerWorkflow)();
	const testAudit = await securityAuditService.run(['database']);
	expect(testAudit).toBeEmptyArray();
});
//# sourceMappingURL=database-risk-reporter.test.js.map
