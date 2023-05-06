import { v4 as uuid } from 'uuid';
import * as Db from '@/Db';
import config from '@/config';
import { audit } from '@/audit';
import { CREDENTIALS_REPORT } from '@/audit/constants';
import { getRiskSection } from './utils';
import * as testDb from '../shared/testDb';

beforeAll(async () => {
	await testDb.init();
});

beforeEach(async () => {
	await testDb.truncate(['Workflow', 'Credentials', 'Execution']);
});

afterAll(async () => {
	await testDb.terminate();
});

test('should report credentials not in any use', async () => {
	const credentialDetails = {
		name: 'My Slack Credential',
		data: 'U2FsdGVkX18WjITBG4IDqrGB1xE/uzVNjtwDAG3lP7E=',
		type: 'slackApi',
		nodesAccess: [{ nodeType: 'n8n-nodes-base.slack', date: '2022-12-21T11:23:00.561Z' }],
	};

	const workflowDetails = {
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
		Db.collections.Credentials.save(credentialDetails),
		Db.collections.Workflow.save(workflowDetails),
	]);

	const testAudit = await audit(['credentials']);

	const section = getRiskSection(
		testAudit,
		CREDENTIALS_REPORT.RISK,
		CREDENTIALS_REPORT.SECTIONS.CREDS_NOT_IN_ANY_USE,
	);

	expect(section.location).toHaveLength(1);
	expect(section.location[0]).toMatchObject({
		id: '1',
		name: 'My Slack Credential',
	});
});

test('should report credentials not in active use', async () => {
	const credentialDetails = {
		name: 'My Slack Credential',
		data: 'U2FsdGVkX18WjITBG4IDqrGB1xE/uzVNjtwDAG3lP7E=',
		type: 'slackApi',
		nodesAccess: [{ nodeType: 'n8n-nodes-base.slack', date: '2022-12-21T11:23:00.561Z' }],
	};

	const credential = await Db.collections.Credentials.save(credentialDetails);

	const workflowDetails = {
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

	await Db.collections.Workflow.save(workflowDetails);

	const testAudit = await audit(['credentials']);

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
		name: 'My Slack Credential',
		data: 'U2FsdGVkX18WjITBG4IDqrGB1xE/uzVNjtwDAG3lP7E=',
		type: 'slackApi',
		nodesAccess: [{ nodeType: 'n8n-nodes-base.slack', date: '2022-12-21T11:23:00.561Z' }],
	};

	const credential = await Db.collections.Credentials.save(credentialDetails);

	const workflowDetails = {
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

	const workflow = await Db.collections.Workflow.save(workflowDetails);

	const date = new Date();
	date.setDate(date.getDate() - config.getEnv('security.audit.daysAbandonedWorkflow') - 1);

	await Db.collections.Execution.save({
		data: '[]',
		finished: true,
		mode: 'manual',
		startedAt: date,
		stoppedAt: date,
		workflowData: workflow,
		workflowId: workflow.id,
		waitTill: null,
	});

	const testAudit = await audit(['credentials']);

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
		name: 'My Slack Credential',
		data: 'U2FsdGVkX18WjITBG4IDqrGB1xE/uzVNjtwDAG3lP7E=',
		type: 'slackApi',
		nodesAccess: [{ nodeType: 'n8n-nodes-base.slack', date: '2022-12-21T11:23:00.561Z' }],
	};

	const credential = await Db.collections.Credentials.save(credentialDetails);

	const workflowDetails = {
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

	const workflow = await Db.collections.Workflow.save(workflowDetails);

	const date = new Date();
	date.setDate(date.getDate() - config.getEnv('security.audit.daysAbandonedWorkflow') + 1);

	await Db.collections.Execution.save({
		data: '[]',
		finished: true,
		mode: 'manual',
		startedAt: date,
		stoppedAt: date,
		workflowData: workflow,
		workflowId: workflow.id,
		waitTill: null,
	});

	const testAudit = await audit(['credentials']);

	expect(testAudit).toBeEmptyArray();
});
