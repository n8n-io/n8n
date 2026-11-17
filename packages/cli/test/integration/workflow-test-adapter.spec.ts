import { createActiveWorkflow, createWorkflow, testDb } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import nock from 'nock';
import { createRequire } from 'node:module';
import type { INode } from 'n8n-workflow';
import { createRunExecutionData } from 'n8n-workflow';

import type * as TestAdapter from '../../../@n8n/test/dist';

import { ActiveExecutions } from '@/active-executions';
import { WorkflowRunner } from '@/workflow-runner';

import { createOwner } from './shared/db/users';
import { initBinaryDataService, initNodeTypes } from './shared/utils';
import { loadNodesFromDist } from './shared/utils/node-types-data';

const entry = process.env.N8N_TEST_ADAPTER_ENTRY;
if (!entry) throw new Error('Run this comparison with vitest.application.config.ts');
const adapter = createRequire(__filename)(entry) as typeof TestAdapter;

beforeAll(async () => {
	await testDb.init();
	await initNodeTypes(
		loadNodesFromDist([
			'n8n-nodes-base.manualTrigger',
			'n8n-nodes-base.httpRequest',
			'n8n-nodes-base.executeWorkflow',
			'n8n-nodes-base.executeWorkflowTrigger',
		]),
	);
	await initBinaryDataService();
});

afterEach(() => nock.cleanAll());
afterAll(async () => await testDb.terminate());

test('matches application root and child HTTP effects after asynchronous execution configuration', async () => {
	const owner = await createOwner();
	const child = await createActiveWorkflow(
		{
			name: 'Child comparison',
			nodes: [
				{
					id: 'child-start',
					name: 'Child start',
					type: 'n8n-nodes-base.executeWorkflowTrigger',
					typeVersion: 1.1,
					position: [0, 0],
					parameters: { inputSource: 'passthrough' },
				},
				{
					id: 'child-request',
					name: 'Child request',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 4.2,
					position: [220, 0],
					parameters: {
						url: '=https://workflow.example.com/child/{{ $json.region }}',
						options: {},
					},
				},
			],
			connections: {
				'Child start': { main: [[{ node: 'Child request', type: 'main', index: 0 }]] },
			},
			settings: { executionOrder: 'v1', saveDataSuccessExecution: 'all' },
		},
		owner,
	);
	const nodes: INode[] = [
		{
			id: 'start',
			name: 'Start',
			type: 'n8n-nodes-base.manualTrigger',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		},
		{
			id: 'request',
			name: 'Request',
			type: 'n8n-nodes-base.httpRequest',
			typeVersion: 4.2,
			position: [220, 0],
			parameters: { url: '=https://workflow.example.com/items/{{ $vars.region }}', options: {} },
		},
		{
			id: 'call-child',
			name: 'Call child',
			type: 'n8n-nodes-base.executeWorkflow',
			typeVersion: 1.2,
			position: [440, 0],
			parameters: {
				workflowId: { __rl: true, value: child.id, mode: 'id' },
				options: { waitForSubWorkflow: true },
			},
		},
	];
	const workflow = await createWorkflow(
		{
			name: 'Execution comparison',
			nodes,
			connections: {
				Start: { main: [[{ node: 'Request', type: 'main', index: 0 }]] },
				Request: { main: [[{ node: 'Call child', type: 'main', index: 0 }]] },
			},
			settings: { executionOrder: 'v1', saveDataSuccessExecution: 'all' },
		},
		owner,
	);
	const requests: string[] = [];
	nock('https://workflow.example.com')
		.get('/items/eu')
		.twice()
		.reply(200, function () {
			requests.push(this.req.path);
			return { region: 'eu', count: 42 };
		});
	nock('https://workflow.example.com')
		.get('/child/eu')
		.twice()
		.reply(200, function () {
			requests.push(this.req.path);
			return { received: true };
		});
	const configuring = createDeferredPromise<undefined>();
	const configured = createDeferredPromise<undefined>();
	const started = Container.get(WorkflowRunner).run({
		workflowData: workflow,
		userId: owner.id,
		executionMode: 'trigger',
		executionData: createRunExecutionData({
			executionData: {
				nodeExecutionStack: [{ node: nodes[0], data: { main: [[{ json: {} }]] }, source: null }],
			},
		}),
		configureAdditionalData: async (additionalData) => {
			configuring.resolve(undefined);
			await configured.promise;
			additionalData.variables = { region: 'eu' };
		},
	});
	await configuring.promise;
	expect(requests).toEqual([]);
	configured.resolve(undefined);
	const executionId = await started;
	const application = await Container.get(ActiveExecutions).getPostExecutePromise(executionId);
	expect(application?.data.resultData.error).toBeUndefined();
	expect(application?.status).toBe('success');
	expect(requests).toEqual(['/items/eu', '/child/eu']);

	const workflows = adapter.loadWorkflows([workflow, child]);
	const tested = await adapter.executeWorkflow(workflows.get(workflow.id), {
		variables: { region: 'eu' },
	});
	const applicationOutput = application?.data.resultData.runData.Request[0].data?.main[0]?.map(
		(item) => item.json,
	);
	expect(tested.node('Request').output).toEqual(applicationOutput);
	const applicationChildOutput = application?.data.resultData.runData[
		'Call child'
	][0].data?.main[0]?.map((item) => item.json);
	expect(tested.output).toEqual(applicationChildOutput);
	expect(tested.workflow(child.name).runs[0].node('Child request').output).toEqual(
		applicationChildOutput,
	);
	expect(tested.output).toEqual([{ received: true }]);
	expect(requests).toEqual(['/items/eu', '/child/eu', '/items/eu', '/child/eu']);
	expect(nock.isDone()).toBe(true);
});
