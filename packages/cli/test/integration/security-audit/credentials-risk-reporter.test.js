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
const securityConfig = (0, jest_mock_extended_1.mock)({ daysAbandonedWorkflow: 90 });
beforeAll(async () => {
	await backend_test_utils_1.testDb.init();
	securityAuditService = new security_audit_service_1.SecurityAuditService(
		di_1.Container.get(db_1.WorkflowRepository),
		securityConfig,
	);
});
beforeEach(async () => {
	await backend_test_utils_1.testDb.truncate([
		'WorkflowEntity',
		'CredentialsEntity',
		'ExecutionEntity',
	]);
});
afterAll(async () => {
	await backend_test_utils_1.testDb.terminate();
});
test('should report credentials not in any use', async () => {
	const credentialDetails = {
		id: (0, db_1.generateNanoId)(),
		name: 'My Slack Credential',
		data: 'U2FsdGVkX18WjITBG4IDqrGB1xE/uzVNjtwDAG3lP7E=',
		type: 'slackApi',
	};
	const workflowDetails = {
		id: (0, db_1.generateNanoId)(),
		name: 'My Test Workflow',
		active: false,
		connections: {},
		nodeTypes: {},
		nodes: [
			{
				id: (0, uuid_1.v4)(),
				name: 'My Node',
				type: 'n8n-nodes-base.slack',
				typeVersion: 1,
				position: [0, 0],
			},
		],
	};
	await Promise.all([
		di_1.Container.get(db_1.CredentialsRepository).save(credentialDetails),
		di_1.Container.get(db_1.WorkflowRepository).save(workflowDetails),
	]);
	const testAudit = await securityAuditService.run(['credentials']);
	const section = (0, utils_1.getRiskSection)(
		testAudit,
		constants_1.CREDENTIALS_REPORT.RISK,
		constants_1.CREDENTIALS_REPORT.SECTIONS.CREDS_NOT_IN_ANY_USE,
	);
	expect(section.location).toHaveLength(1);
	expect(section.location[0]).toMatchObject({
		id: credentialDetails.id,
		name: 'My Slack Credential',
	});
});
test('should report credentials not in active use', async () => {
	const credentialDetails = {
		id: (0, db_1.generateNanoId)(),
		name: 'My Slack Credential',
		data: 'U2FsdGVkX18WjITBG4IDqrGB1xE/uzVNjtwDAG3lP7E=',
		type: 'slackApi',
	};
	const credential = await di_1.Container.get(db_1.CredentialsRepository).save(credentialDetails);
	const workflowDetails = {
		id: (0, db_1.generateNanoId)(),
		name: 'My Test Workflow',
		active: false,
		connections: {},
		nodeTypes: {},
		nodes: [
			{
				id: (0, uuid_1.v4)(),
				name: 'My Node',
				type: 'n8n-nodes-base.slack',
				typeVersion: 1,
				position: [0, 0],
			},
		],
	};
	await di_1.Container.get(db_1.WorkflowRepository).save(workflowDetails);
	const testAudit = await securityAuditService.run(['credentials']);
	const section = (0, utils_1.getRiskSection)(
		testAudit,
		constants_1.CREDENTIALS_REPORT.RISK,
		constants_1.CREDENTIALS_REPORT.SECTIONS.CREDS_NOT_IN_ACTIVE_USE,
	);
	expect(section.location).toHaveLength(1);
	expect(section.location[0]).toMatchObject({
		id: credential.id,
		name: 'My Slack Credential',
	});
});
test('should report credential in not recently executed workflow', async () => {
	const credentialDetails = {
		id: (0, db_1.generateNanoId)(),
		name: 'My Slack Credential',
		data: 'U2FsdGVkX18WjITBG4IDqrGB1xE/uzVNjtwDAG3lP7E=',
		type: 'slackApi',
	};
	const credential = await di_1.Container.get(db_1.CredentialsRepository).save(credentialDetails);
	const workflowDetails = {
		id: (0, db_1.generateNanoId)(),
		name: 'My Test Workflow',
		active: false,
		connections: {},
		nodeTypes: {},
		nodes: [
			{
				id: (0, uuid_1.v4)(),
				name: 'My Node',
				type: 'n8n-nodes-base.slack',
				typeVersion: 1,
				position: [0, 0],
				credentials: {
					slackApi: {
						id: credential.id,
						name: credential.name,
					},
				},
			},
		],
	};
	const workflow = await di_1.Container.get(db_1.WorkflowRepository).save(workflowDetails);
	const date = new Date();
	date.setDate(date.getDate() - securityConfig.daysAbandonedWorkflow - 1);
	const savedExecution = await di_1.Container.get(db_1.ExecutionRepository).save({
		finished: true,
		mode: 'manual',
		createdAt: date,
		startedAt: date,
		stoppedAt: date,
		workflowId: workflow.id,
		waitTill: null,
		status: 'success',
	});
	await di_1.Container.get(db_1.ExecutionDataRepository).save({
		execution: savedExecution,
		data: '[]',
		workflowData: workflow,
	});
	const testAudit = await securityAuditService.run(['credentials']);
	const section = (0, utils_1.getRiskSection)(
		testAudit,
		constants_1.CREDENTIALS_REPORT.RISK,
		constants_1.CREDENTIALS_REPORT.SECTIONS.CREDS_NOT_RECENTLY_EXECUTED,
	);
	expect(section.location).toHaveLength(1);
	expect(section.location[0]).toMatchObject({
		id: credential.id,
		name: credential.name,
	});
});
test('should not report credentials in recently executed workflow', async () => {
	const credentialDetails = {
		id: (0, db_1.generateNanoId)(),
		name: 'My Slack Credential',
		data: 'U2FsdGVkX18WjITBG4IDqrGB1xE/uzVNjtwDAG3lP7E=',
		type: 'slackApi',
	};
	const credential = await di_1.Container.get(db_1.CredentialsRepository).save(credentialDetails);
	const workflowDetails = {
		id: (0, db_1.generateNanoId)(),
		name: 'My Test Workflow',
		active: true,
		connections: {},
		nodeTypes: {},
		nodes: [
			{
				id: (0, uuid_1.v4)(),
				name: 'My Node',
				type: 'n8n-nodes-base.slack',
				typeVersion: 1,
				position: [0, 0],
				credentials: {
					slackApi: {
						id: credential.id,
						name: credential.name,
					},
				},
			},
		],
	};
	const workflow = await di_1.Container.get(db_1.WorkflowRepository).save(workflowDetails);
	const date = new Date();
	date.setDate(date.getDate() - securityConfig.daysAbandonedWorkflow + 1);
	const savedExecution = await di_1.Container.get(db_1.ExecutionRepository).save({
		finished: true,
		mode: 'manual',
		createdAt: date,
		startedAt: date,
		stoppedAt: date,
		workflowId: workflow.id,
		waitTill: null,
		status: 'success',
	});
	await di_1.Container.get(db_1.ExecutionDataRepository).save({
		execution: savedExecution,
		data: '[]',
		workflowData: workflow,
	});
	const testAudit = await securityAuditService.run(['credentials']);
	expect(testAudit).toBeEmptyArray();
});
//# sourceMappingURL=credentials-risk-reporter.test.js.map
