import nock from 'nock';

import {
	executeWorkflow,
	loadWorkflow,
	loadWorkflows,
	mockNode,
	type WorkflowDefinition,
} from '../src';

const crm = 'https://crm.example.com';

afterEach(() => nock.cleanAll());

function codeWorkflow(
	jsCode: string,
	options: { mode?: string; onError?: string } = {},
): WorkflowDefinition {
	return {
		id: 'code-1',
		name: 'Code',
		nodes: [
			{
				id: '1',
				name: 'Start',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
			{
				id: '2',
				name: 'Transform',
				type: 'n8n-nodes-base.code',
				typeVersion: 2,
				position: [220, 0],
				parameters: { jsCode, ...(options.mode && { mode: options.mode }) },
				...(options.onError && { onError: options.onError }),
			},
		],
		connections: { Start: { main: [[{ node: 'Transform', type: 'main', index: 0 }]] } },
		settings: { executionOrder: 'v1' },
	};
}

async function runCode(jsCode: string, options: Parameters<typeof codeWorkflow>[1] = {}) {
	return await executeWorkflow(loadWorkflow(codeWorkflow(jsCode, options)), {
		input: [
			{ name: 'ada', n: 2 },
			{ name: 'grace', n: 5 },
		],
	});
}

test('runs the code once for all items with $input', async () => {
	const result = await runCode(
		'return $input.all().map((item) => ({ json: { name: item.json.name.toUpperCase() } }));',
	);

	expect(result.output).toEqual([{ name: 'ADA' }, { name: 'GRACE' }]);
});

test('runs the code once for each item with $json', async () => {
	const result = await runCode('return { json: { double: $json.n * 2 } };', {
		mode: 'runOnceForEachItem',
	});

	expect(result.output).toEqual([{ double: 4 }, { double: 10 }]);
});

test("reads the output of an earlier node with $('Node')", async () => {
	const result = await runCode("return [{ json: { first: $('Start').first().json.name } }];");

	expect(result.output).toEqual([{ first: 'ada' }]);
});

test('fails the node that throws and names it', async () => {
	await expect(runCode("throw new Error('Bad customer');")).rejects.toMatchObject({
		code: 'NODE_FAILED',
		node: 'Transform',
		message: expect.stringContaining('Bad customer'),
	});
});

test('continues with the error as output when the node continues on error', async () => {
	const result = await runCode("throw new Error('Bad customer');", {
		onError: 'continueRegularOutput',
	});

	expect(result.node('Transform').output).toEqual([{ error: 'Bad customer [line 1]' }]);
});

test('returns the static data that the code writes', async () => {
	const result = await runCode(
		"$getWorkflowStaticData('global').lastName = $input.first().json.name; return [];",
	);

	expect(result.staticData).toEqual({ global: { lastName: 'ada' } });
});

test('applies Code task state before the next node executes', async () => {
	const definition = codeWorkflow(
		"$getWorkflowStaticData('global').cursor = 42; $execution.customData.set('source', 'code'); return [{ json: {} }];",
	);
	definition.nodes.push({
		id: 'read',
		name: 'Read state',
		type: 'n8n-nodes-base.code',
		typeVersion: 2,
		position: [440, 0],
		parameters: {
			jsCode:
				"return [{ json: { cursor: $getWorkflowStaticData('global').cursor, source: $execution.customData.get('source') } }];",
		},
	});
	definition.connections.Transform = { main: [[{ node: 'Read state', type: 'main', index: 0 }]] };
	const result = await executeWorkflow(loadWorkflow(definition));
	expect(result.output).toEqual([{ cursor: 42, source: 'code' }]);
});

test('records a request that the code sends through httpRequest', async () => {
	nock(crm).get('/customers/42').reply(200, { id: 42 });

	const result = await runCode(
		`const customer = await this.helpers.httpRequest({ url: '${crm}/customers/42' });
		return [{ json: customer }];`,
	);

	expect(result.output).toEqual([{ id: 42 }]);
	expect(result.node('Transform').requests).toMatchObject([
		{ method: 'GET', url: `${crm}/customers/42` },
	]);
});

test('fails a request from the code that matches no nock mock', async () => {
	await expect(
		runCode(`await this.helpers.httpRequest({ url: '${crm}/customers/42' }); return [];`),
	).rejects.toMatchObject({ code: 'HTTP_NOT_MOCKED', node: 'Transform' });
});

test('reads a supplied variable with $vars', async () => {
	const result = await executeWorkflow(
		loadWorkflow(codeWorkflow('return [{ json: { base: $vars.crmBaseUrl } }];')),
		{ variables: { crmBaseUrl: crm } },
	);

	expect(result.output).toEqual([{ base: crm }]);
});

test('fails a require of a module that is not allowed, as in production', async () => {
	await expect(runCode("require('fs'); return [];")).rejects.toMatchObject({
		code: 'NODE_FAILED',
		node: 'Transform',
		message: expect.stringContaining("Module 'fs' is disallowed"),
	});
});

test('runs a Code node inside a real child workflow', async () => {
	const child: WorkflowDefinition = {
		id: 'child-1',
		name: 'Child',
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
				name: 'Greet',
				type: 'n8n-nodes-base.code',
				typeVersion: 2,
				position: [220, 0],
				parameters: { jsCode: "return [{ json: { greeting: 'Hi ' + $json.name } }];" },
			},
		],
		connections: { 'When called': { main: [[{ node: 'Greet', type: 'main', index: 0 }]] } },
	};
	const parent = codeWorkflow('return [];');
	parent.nodes[1] = {
		id: '2',
		name: 'Run child',
		type: 'n8n-nodes-base.executeWorkflow',
		typeVersion: 1.2,
		position: [220, 0],
		parameters: { workflowId: { __rl: true, value: 'child-1', mode: 'id' }, options: {} },
	};
	parent.connections = { Start: { main: [[{ node: 'Run child', type: 'main', index: 0 }]] } };
	const workflows = loadWorkflows([parent, child]);

	const result = await executeWorkflow(workflows.get('Code'), { input: { name: 'Ada' } });

	expect(result.workflow('Child').runs[0].node('Greet').output).toEqual([{ greeting: 'Hi Ada' }]);
	expect(result.output).toEqual([{ greeting: 'Hi Ada' }]);
});

test('still runs a mocked Code node from its mock', async () => {
	const workflow = loadWorkflow(codeWorkflow("throw new Error('not run');"));
	mockNode(workflow.node('Transform'), [{ mocked: true }]);

	const result = await executeWorkflow(workflow);

	expect(result.output).toEqual([{ mocked: true }]);
});
