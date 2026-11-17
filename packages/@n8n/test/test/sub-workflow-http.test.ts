import nock from 'nock';

import { createCredential, executeWorkflow, loadWorkflows, type WorkflowDefinition } from '../src';

const crm = 'https://crm.example.com';

afterEach(() => nock.cleanAll());

const parent: WorkflowDefinition = {
	id: 'parent-1',
	name: 'Parent',
	nodes: [
		{
			id: 'p1',
			name: 'Start',
			type: 'n8n-nodes-base.manualTrigger',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		},
		{
			id: 'p2',
			name: 'Run CRM workflow',
			type: 'n8n-nodes-base.executeWorkflow',
			typeVersion: 1.2,
			position: [220, 0],
			parameters: {
				workflowId: { __rl: true, value: 'crm-child-1', mode: 'id' },
				options: {},
			},
		},
	],
	connections: {
		Start: { main: [[{ node: 'Run CRM workflow', type: 'main', index: 0 }]] },
	},
};

const child: WorkflowDefinition = {
	id: 'crm-child-1',
	name: 'CRM child',
	nodes: [
		{
			id: 'c1',
			name: 'When called',
			type: 'n8n-nodes-base.executeWorkflowTrigger',
			typeVersion: 1.1,
			position: [0, 0],
			parameters: { inputSource: 'passthrough' },
		},
		{
			id: 'c2',
			name: 'Call CRM',
			type: 'n8n-nodes-base.httpRequest',
			typeVersion: 4.2,
			position: [220, 0],
			parameters: {
				url: `${crm}/customers/42`,
				authentication: 'genericCredentialType',
				genericAuthType: 'httpHeaderAuth',
				options: {},
			},
			credentials: { httpHeaderAuth: { id: 'cred-1', name: 'CRM API key' } },
		},
	],
	connections: {
		'When called': { main: [[{ node: 'Call CRM', type: 'main', index: 0 }]] },
	},
};

const credentials = {
	'CRM API key': createCredential('httpHeaderAuth', { name: 'X-Api-Key', value: 'test-key' }),
};

test('records a request of a child node on that node and redacts its secret', async () => {
	nock(crm).get('/customers/42').reply(200, { id: 42 });

	const result = await executeWorkflow(loadWorkflows([parent, child]).get('Parent'), {
		credentials,
	});

	const [childRun] = result.workflow('CRM child').runs;
	expect(childRun.node('Call CRM').requests).toMatchObject([
		{ url: `${crm}/customers/42`, headers: { 'x-api-key': '[credential: CRM API key.value]' } },
	]);
	expect(result.node('Run CRM workflow').requests).toEqual([]);
});

test('names the child workflow and node of a request that matches no nock mock', async () => {
	await expect(
		executeWorkflow(loadWorkflows([parent, child]).get('Parent'), { credentials }),
	).rejects.toMatchObject({ code: 'HTTP_NOT_MOCKED', workflow: 'CRM child', node: 'Call CRM' });
});
