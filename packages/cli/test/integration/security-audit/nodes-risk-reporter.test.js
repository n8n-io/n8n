'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const jest_mock_extended_1 = require('jest-mock-extended');
const uuid_1 = require('uuid');
const load_nodes_and_credentials_1 = require('@/load-nodes-and-credentials');
const node_types_1 = require('@/node-types');
const constants_1 = require('@/security-audit/constants');
const security_audit_service_1 = require('@/security-audit/security-audit.service');
const utils_1 = require('@/security-audit/utils');
const community_packages_service_1 = require('@/community-packages/community-packages.service');
const utils_2 = require('./utils');
const nodesAndCredentials = (0, backend_test_utils_1.mockInstance)(
	load_nodes_and_credentials_1.LoadNodesAndCredentials,
);
nodesAndCredentials.getCustomDirectories.mockReturnValue([]);
(0, backend_test_utils_1.mockInstance)(node_types_1.NodeTypes);
const communityPackagesService = (0, backend_test_utils_1.mockInstance)(
	community_packages_service_1.CommunityPackagesService,
);
di_1.Container.set(community_packages_service_1.CommunityPackagesService, communityPackagesService);
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
	jest.resetAllMocks();
});
test('should report risky official nodes', async () => {
	communityPackagesService.getAllInstalledPackages.mockResolvedValue(utils_2.MOCK_PACKAGE);
	const map = [...constants_1.OFFICIAL_RISKY_NODE_TYPES].reduce((acc, cur) => {
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
	const testAudit = await securityAuditService.run(['nodes']);
	const section = (0, utils_2.getRiskSection)(
		testAudit,
		constants_1.NODES_REPORT.RISK,
		constants_1.NODES_REPORT.SECTIONS.OFFICIAL_RISKY_NODES,
	);
	expect(section.location).toHaveLength(constants_1.OFFICIAL_RISKY_NODE_TYPES.size);
	for (const loc of section.location) {
		if (loc.kind === 'node') {
			expect(loc.nodeId).toBe(map[loc.nodeType]);
		}
	}
});
test('should not report non-risky official nodes', async () => {
	communityPackagesService.getAllInstalledPackages.mockResolvedValue(utils_2.MOCK_PACKAGE);
	await (0, utils_2.saveManualTriggerWorkflow)();
	const testAudit = await securityAuditService.run(['nodes']);
	if (Array.isArray(testAudit)) return;
	const report = testAudit[(0, utils_1.toReportTitle)('nodes')];
	if (!report) return;
	for (const section of report.sections) {
		expect(section.title).not.toBe(constants_1.NODES_REPORT.SECTIONS.OFFICIAL_RISKY_NODES);
	}
});
test('should report community nodes', async () => {
	communityPackagesService.getAllInstalledPackages.mockResolvedValue(utils_2.MOCK_PACKAGE);
	const testAudit = await securityAuditService.run(['nodes']);
	const section = (0, utils_2.getRiskSection)(
		testAudit,
		constants_1.NODES_REPORT.RISK,
		constants_1.NODES_REPORT.SECTIONS.COMMUNITY_NODES,
	);
	expect(section.location).toHaveLength(1);
	if (section.location[0].kind === 'community') {
		expect(section.location[0].nodeType).toBe(utils_2.MOCK_PACKAGE[0].installedNodes[0].type);
	}
});
//# sourceMappingURL=nodes-risk-reporter.test.js.map
