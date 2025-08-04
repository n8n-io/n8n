'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const config_1 = require('@n8n/config');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const jest_mock_extended_1 = require('jest-mock-extended');
const n8n_workflow_1 = require('n8n-workflow');
const uuid_1 = require('uuid');
const constants_1 = require('@/security-audit/constants');
const security_audit_service_1 = require('@/security-audit/security-audit.service');
const utils_1 = require('@/security-audit/utils');
const utils_2 = require('./utils');
let securityAuditService;
beforeAll(async () => {
	await backend_test_utils_1.testDb.init();
	securityAuditService = new security_audit_service_1.SecurityAuditService(
		di_1.Container.get(db_1.WorkflowRepository),
		(0, jest_mock_extended_1.mock)(),
	);
	(0, utils_2.simulateUpToDateInstance)();
});
beforeEach(async () => {
	await backend_test_utils_1.testDb.truncate(['WorkflowEntity']);
});
afterAll(async () => {
	await backend_test_utils_1.testDb.terminate();
});
test('should report webhook lacking authentication', async () => {
	const targetNodeId = (0, uuid_1.v4)();
	const details = {
		id: (0, db_1.generateNanoId)(),
		name: 'My Test Workflow',
		active: true,
		nodeTypes: {},
		connections: {},
		nodes: [
			{
				parameters: {
					path: (0, uuid_1.v4)(),
					options: {},
				},
				id: targetNodeId,
				name: 'Webhook',
				type: 'n8n-nodes-base.webhook',
				typeVersion: 1,
				position: [0, 0],
				webhookId: (0, uuid_1.v4)(),
			},
		],
	};
	await di_1.Container.get(db_1.WorkflowRepository).save(details);
	const testAudit = await securityAuditService.run(['instance']);
	const section = (0, utils_2.getRiskSection)(
		testAudit,
		constants_1.INSTANCE_REPORT.RISK,
		constants_1.INSTANCE_REPORT.SECTIONS.UNPROTECTED_WEBHOOKS,
	);
	if (!section.location) {
		fail('Expected section to have locations');
	}
	expect(section.location).toHaveLength(1);
	expect(section.location[0].nodeId).toBe(targetNodeId);
});
test('should not report webhooks having basic or header auth', async () => {
	const promises = ['basicAuth', 'headerAuth'].map(async (authType) => {
		const details = {
			id: (0, db_1.generateNanoId)(),
			name: 'My Test Workflow',
			active: true,
			nodeTypes: {},
			connections: {},
			nodes: [
				{
					parameters: {
						path: (0, uuid_1.v4)(),
						authentication: authType,
						options: {},
					},
					id: (0, uuid_1.v4)(),
					name: 'Webhook',
					type: 'n8n-nodes-base.webhook',
					typeVersion: 1,
					position: [0, 0],
					webhookId: (0, uuid_1.v4)(),
				},
			],
		};
		return await di_1.Container.get(db_1.WorkflowRepository).save(details);
	});
	await Promise.all(promises);
	const testAudit = await securityAuditService.run(['instance']);
	if (Array.isArray(testAudit)) fail('Audit is empty');
	const report = testAudit[(0, utils_1.toReportTitle)('instance')];
	if (!report) {
		fail('Expected test audit to have instance risk report');
	}
	for (const section of report.sections) {
		expect(section.title).not.toBe(constants_1.INSTANCE_REPORT.SECTIONS.UNPROTECTED_WEBHOOKS);
	}
});
test('should not report webhooks validated by direct children', async () => {
	const promises = [...constants_1.WEBHOOK_VALIDATOR_NODE_TYPES].map(async (nodeType) => {
		const details = {
			id: (0, db_1.generateNanoId)(),
			name: 'My Test Workflow',
			active: true,
			nodeTypes: {},
			nodes: [
				{
					parameters: {
						path: (0, uuid_1.v4)(),
						options: {},
					},
					id: (0, uuid_1.v4)(),
					name: 'Webhook',
					type: 'n8n-nodes-base.webhook',
					typeVersion: 1,
					position: [0, 0],
					webhookId: (0, uuid_1.v4)(),
				},
				{
					id: (0, uuid_1.v4)(),
					name: 'My Node',
					type: nodeType,
					typeVersion: 1,
					position: [0, 0],
				},
			],
			connections: {
				Webhook: {
					main: [
						[
							{
								node: 'My Node',
								type: n8n_workflow_1.NodeConnectionTypes.Main,
								index: 0,
							},
						],
					],
				},
			},
		};
		return await di_1.Container.get(db_1.WorkflowRepository).save(details);
	});
	await Promise.all(promises);
	const testAudit = await securityAuditService.run(['instance']);
	if (Array.isArray(testAudit)) fail('audit is empty');
	const report = testAudit[(0, utils_1.toReportTitle)('instance')];
	if (!report) {
		fail('Expected test audit to have instance risk report');
	}
	for (const section of report.sections) {
		expect(section.title).not.toBe(constants_1.INSTANCE_REPORT.SECTIONS.UNPROTECTED_WEBHOOKS);
	}
});
test('should not report non-webhook node', async () => {
	await (0, utils_2.saveManualTriggerWorkflow)();
	const testAudit = await securityAuditService.run(['instance']);
	if (Array.isArray(testAudit)) fail('audit is empty');
	const report = testAudit[(0, utils_1.toReportTitle)('instance')];
	if (!report) {
		fail('Expected test audit to have instance risk report');
	}
	for (const section of report.sections) {
		expect(section.title).not.toBe(constants_1.INSTANCE_REPORT.SECTIONS.UNPROTECTED_WEBHOOKS);
	}
});
test('should report outdated instance when outdated', async () => {
	(0, utils_2.simulateOutdatedInstanceOnce)();
	const testAudit = await securityAuditService.run(['instance']);
	const section = (0, utils_2.getRiskSection)(
		testAudit,
		constants_1.INSTANCE_REPORT.RISK,
		constants_1.INSTANCE_REPORT.SECTIONS.OUTDATED_INSTANCE,
	);
	if (!section.nextVersions) {
		fail('Expected section to have next versions');
	}
	expect(section.nextVersions).toHaveLength(1);
	expect(section.nextVersions[0].name).toBe(utils_2.MOCK_09990_N8N_VERSION.name);
});
test('should not report outdated instance when up to date', async () => {
	const testAudit = await securityAuditService.run(['instance']);
	if (Array.isArray(testAudit)) fail('audit is empty');
	const report = testAudit[(0, utils_1.toReportTitle)('instance')];
	if (!report) {
		fail('Expected test audit to have instance risk report');
	}
	for (const section of report.sections) {
		expect(section.title).not.toBe(constants_1.INSTANCE_REPORT.SECTIONS.OUTDATED_INSTANCE);
	}
});
test('should report security settings', async () => {
	di_1.Container.get(config_1.GlobalConfig).diagnostics.enabled = true;
	const testAudit = await securityAuditService.run(['instance']);
	const section = (0, utils_2.getRiskSection)(
		testAudit,
		constants_1.INSTANCE_REPORT.RISK,
		constants_1.INSTANCE_REPORT.SECTIONS.SECURITY_SETTINGS,
	);
	expect(section.settings).toMatchObject({
		features: {
			communityPackagesEnabled: true,
			versionNotificationsEnabled: true,
			templatesEnabled: true,
			publicApiEnabled: false,
		},
		nodes: { nodesExclude: 'none', nodesInclude: 'none' },
		telemetry: { diagnosticsEnabled: true },
	});
});
//# sourceMappingURL=instance-risk-reporter.test.js.map
