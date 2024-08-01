import { v4 as uuid } from 'uuid';
import config from '@/config';
import { SecurityAuditService } from '@/security-audit/SecurityAudit.service';
import { CREDENTIALS_REPORT } from '@/security-audit/constants';
import { getRiskSection } from './utils';
import * as testDb from '../shared/testDb';
import { generateNanoId } from '@db/utils/generators';
import { WorkflowRepository } from '@db/repositories/workflow.repository';
import Container from 'typedi';
import { CredentialsRepository } from '@db/repositories/credentials.repository';
import { ExecutionRepository } from '@db/repositories/execution.repository';
import { ExecutionDataRepository } from '@db/repositories/executionData.repository';

let securityAuditService: SecurityAuditService;

beforeAll(async () => {
	await testDb.init();

	securityAuditService = new SecurityAuditService(Container.get(WorkflowRepository));
});

beforeEach(async () => {
	await testDb.truncate(['Workflow', 'Credentials', 'Execution']);
});

afterAll(async () => {
	await testDb.terminate();
});

test('should report credentials not in any use', async () => {
	const credentialDetails = {
		id: generateNanoId(),
		name: 'My Slack Credential',
		data: 'U2FsdGVkX18WjITBG4IDqrGB1xE/uzVNjtwDAG3lP7E=',
		type: 'slackApi',
	};

	const workflowDetails = {
		id: generateNanoId(),
		name: 'My Test Workflow',
		active: false,
		connections: {},
		nodeTypes: {},
		nodes: [
			{
				id: uuid(),
				name: 'My Node',
				type: 'n8n-nodes-base.slack',
				typeVersion: 1,
				position: [0, 0] as [number, number],
			},
		],
	};

	await Promise.all([
		Container.get(CredentialsRepository).save(credentialDetails),
		Container.get(WorkflowRepository).save(workflowDetails),
	]);

	const testAudit = await securityAuditService.run(['credentials']);

	const section = getRiskSection(
		testAudit,
		CREDENTIALS_REPORT.RISK,
		CREDENTIALS_REPORT.SECTIONS.CREDS_NOT_IN_ANY_USE,
	);

	expect(section.location).toHaveLength(1);
	expect(section.location[0]).toMatchObject({
		id: credentialDetails.id,
		name: 'My Slack Credential',
	});
});

test('should report credentials not in active use', async () => {
	const credentialDetails = {
		id: generateNanoId(),
		name: 'My Slack Credential',
		data: 'U2FsdGVkX18WjITBG4IDqrGB1xE/uzVNjtwDAG3lP7E=',
		type: 'slackApi',
	};

	const credential = await Container.get(CredentialsRepository).save(credentialDetails);

	const workflowDetails = {
		id: generateNanoId(),
		name: 'My Test Workflow',
		active: false,
		connections: {},
		nodeTypes: {},
		nodes: [
			{
				id: uuid(),
				name: 'My Node',
				type: 'n8n-nodes-base.slack',
				typeVersion: 1,
				position: [0, 0] as [number, number],
			},
		],
	};

	await Container.get(WorkflowRepository).save(workflowDetails);

	const testAudit = await securityAuditService.run(['credentials']);

	const section = getRiskSection(
		testAudit,
		CREDENTIALS_REPORT.RISK,
		CREDENTIALS_REPORT.SECTIONS.CREDS_NOT_IN_ACTIVE_USE,
	);

	expect(section.location).toHaveLength(1);
	expect(section.location[0]).toMatchObject({
		id: credential.id,
		name: 'My Slack Credential',
	});
});

test('should report credential in not recently executed workflow', async () => {
	const credentialDetails = {
		id: generateNanoId(),
		name: 'My Slack Credential',
		data: 'U2FsdGVkX18WjITBG4IDqrGB1xE/uzVNjtwDAG3lP7E=',
		type: 'slackApi',
	};

	const credential = await Container.get(CredentialsRepository).save(credentialDetails);

	const workflowDetails = {
		id: generateNanoId(),
		name: 'My Test Workflow',
		active: false,
		connections: {},
		nodeTypes: {},
		nodes: [
			{
				id: uuid(),
				name: 'My Node',
				type: 'n8n-nodes-base.slack',
				typeVersion: 1,
				position: [0, 0] as [number, number],
				credentials: {
					slackApi: {
						id: credential.id,
						name: credential.name,
					},
				},
			},
		],
	};

	const workflow = await Container.get(WorkflowRepository).save(workflowDetails);

	const date = new Date();
	date.setDate(date.getDate() - config.getEnv('security.audit.daysAbandonedWorkflow') - 1);

	const savedExecution = await Container.get(ExecutionRepository).save({
		finished: true,
		mode: 'manual',
		startedAt: date,
		stoppedAt: date,
		workflowId: workflow.id,
		waitTill: null,
		status: 'success',
	});
	await Container.get(ExecutionDataRepository).save({
		execution: savedExecution,
		data: '[]',
		workflowData: workflow,
	});

	const testAudit = await securityAuditService.run(['credentials']);

	const section = getRiskSection(
		testAudit,
		CREDENTIALS_REPORT.RISK,
		CREDENTIALS_REPORT.SECTIONS.CREDS_NOT_RECENTLY_EXECUTED,
	);

	expect(section.location).toHaveLength(1);
	expect(section.location[0]).toMatchObject({
		id: credential.id,
		name: credential.name,
	});
});

test('should not report credentials in recently executed workflow', async () => {
	const credentialDetails = {
		id: generateNanoId(),
		name: 'My Slack Credential',
		data: 'U2FsdGVkX18WjITBG4IDqrGB1xE/uzVNjtwDAG3lP7E=',
		type: 'slackApi',
	};

	const credential = await Container.get(CredentialsRepository).save(credentialDetails);

	const workflowDetails = {
		id: generateNanoId(),
		name: 'My Test Workflow',
		active: true,
		connections: {},
		nodeTypes: {},
		nodes: [
			{
				id: uuid(),
				name: 'My Node',
				type: 'n8n-nodes-base.slack',
				typeVersion: 1,
				position: [0, 0] as [number, number],
				credentials: {
					slackApi: {
						id: credential.id,
						name: credential.name,
					},
				},
			},
		],
	};

	const workflow = await Container.get(WorkflowRepository).save(workflowDetails);

	const date = new Date();
	date.setDate(date.getDate() - config.getEnv('security.audit.daysAbandonedWorkflow') + 1);

	const savedExecution = await Container.get(ExecutionRepository).save({
		finished: true,
		mode: 'manual',
		startedAt: date,
		stoppedAt: date,
		workflowId: workflow.id,
		waitTill: null,
		status: 'success',
	});

	await Container.get(ExecutionDataRepository).save({
		execution: savedExecution,
		data: '[]',
		workflowData: workflow,
	});

	const testAudit = await securityAuditService.run(['credentials']);

	expect(testAudit).toBeEmptyArray();
});
