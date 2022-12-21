import { v4 as uuid } from 'uuid';
import * as Db from '@/Db';
import * as testDb from '../../test/integration/shared/testDb';
import { reportInactiveCreds } from './inactiveCreds.report';
import { RISKS } from './constants';
import config from '@/config';

let testDbName = '';

beforeAll(async () => {
	const initResult = await testDb.init();
	testDbName = initResult.testDbName;
});

beforeEach(async () => {
	await testDb.truncate(['Workflow', 'Credentials', 'Execution'], testDbName);
});

afterAll(async () => {
	await testDb.terminate(testDbName);
});

test('should report credential not in any use', async () => {
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

	const workflows = await Db.collections.Workflow.find();

	const report = await reportInactiveCreds(workflows);

	if (report === null) {
		throw new Error(`Report "${RISKS.INACTIVE_CREDS}" should not be null`);
	}

	expect(report.risk).toBe(RISKS.INACTIVE_CREDS);

	expect(report.riskTypes).toHaveLength(2); // not in any use, not in active use

	const [notInAnyUse] = report.riskTypes;

	expect(notInAnyUse.riskType).toBe(RISKS.CREDS_NOT_IN_ANY_USE);
	expect(notInAnyUse.credentials).toHaveLength(1);
	expect(notInAnyUse.credentials[0]).toMatchObject({
		id: '1',
		name: 'My Slack Credential',
	});
});

test('should report credential not in active use', async () => {
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
						id: credential.id.toString(),
						name: credential.name,
					},
				},
			},
		],
	};

	await Db.collections.Workflow.save(workflowDetails);

	const workflows = await Db.collections.Workflow.find();

	const report = await reportInactiveCreds(workflows);

	if (report === null) {
		throw new Error(`Report "${RISKS.INACTIVE_CREDS}" should not be null`);
	}

	expect(report.risk).toBe(RISKS.INACTIVE_CREDS);

	expect(report.riskTypes).toHaveLength(1);

	const [notInActiveUse] = report.riskTypes;

	expect(notInActiveUse.riskType).toBe(RISKS.CREDS_NOT_IN_ACTIVE_USE);
	expect(notInActiveUse.credentials).toHaveLength(1);
	expect(notInActiveUse.credentials[0]).toMatchObject({
		id: credential.id.toString(),
		name: credential.name,
	});
});

test('should report credential only used in abandoned workflow', async () => {
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
						id: credential.id.toString(),
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
		workflowId: workflow.id.toString(),
		waitTill: null,
	});

	const workflows = await Db.collections.Workflow.find();

	const report = await reportInactiveCreds(workflows);

	if (report === null) {
		throw new Error(`Report "${RISKS.INACTIVE_CREDS}" should not be null`);
	}

	expect(report.riskTypes).toHaveLength(2); // not in active use, used in abandoned workflow

	const [_, inAbandonedWorkflows] = report.riskTypes;

	expect(inAbandonedWorkflows.riskType).toBe(RISKS.CREDS_ONLY_USED_IN_ABANDONED_WORKFLOWS);
	expect(inAbandonedWorkflows.credentials).toHaveLength(1);
	expect(inAbandonedWorkflows.credentials[0]).toMatchObject({
		id: credential.id.toString(),
		name: credential.name,
	});
});
