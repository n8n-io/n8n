import {
	executeWorkflow,
	loadWorkflow,
	loadWorkflows,
	mockNode,
	type WorkflowDefinition,
	type WorkflowHandle,
} from '../src';
import formatName from './fixtures/format-name.json';
import newSignup from './fixtures/new-signup.json';
import notifySales from './fixtures/notify-sales.json';

const options = {
	input: { body: { customerId: 42 } },
	variables: { crmBaseUrl: 'https://crm.example.com' },
};
const enterprise = { id: 42, name: 'Ada', plan: 'enterprise' };

function changeNode(
	definition: WorkflowDefinition,
	name: string,
	parameters: Record<string, unknown>,
): WorkflowDefinition {
	const copy = structuredClone(definition);
	const node = copy.nodes.find((candidate) => candidate.name === name)!;
	node.parameters = { ...node.parameters, ...parameters } as typeof node.parameters;
	return copy;
}

function mockParentServices(parent: WorkflowHandle) {
	mockNode(parent.node('Get customer'), [enterprise]);
	mockNode(parent.node('Send welcome email'), [{ sent: true }]);
}

function loadSales(
	parent: WorkflowDefinition = newSignup,
	child: WorkflowDefinition = notifySales,
) {
	const workflows = loadWorkflows([parent, child]);
	const parentHandle = workflows.get('New signup');
	mockParentServices(parentHandle);
	return { parent: parentHandle, child: workflows.get('Notify sales') };
}

test('runs the child from the set and records the calling node', async () => {
	const { parent, child } = loadSales();
	mockNode(child.node('Post to Slack'), [{ ok: true }]);

	const result = await executeWorkflow(parent, options);

	const [salesRun] = result.workflow('Notify sales').runs;
	expect(salesRun.calledBy).toEqual({ workflow: 'New signup', node: 'Run sales workflow' });
	expect(salesRun.node('Post to Slack').parameters[0]).toMatchObject({
		text: 'New enterprise signup: Ada',
	});
});

test('returns the output of the mocked child node to the parent', async () => {
	const { parent, child } = loadSales();
	mockNode(child.node('Post to Slack'), [{ ok: true }]);

	const result = await executeWorkflow(parent, options);

	expect(result.node('Run sales workflow').output).toEqual([{ ok: true }]);
});

test('does not run the child when the calling node has a mock', async () => {
	const { parent } = loadSales();
	mockNode(parent.node('Run sales workflow'), [{ notified: true }]);

	const result = await executeWorkflow(parent, options);

	expect(result.workflow('Notify sales').runs).toHaveLength(0);
});

test('fails a call to a child that the set does not hold', async () => {
	const workflow = loadWorkflow(newSignup);
	mockParentServices(workflow);

	await expect(executeWorkflow(workflow, options)).rejects.toMatchObject({
		code: 'SUB_WORKFLOW_NOT_IN_SET',
		workflow: 'New signup',
		node: 'Run sales workflow',
		message:
			'New signup → "Run sales workflow" calls the workflow ID "notify-sales-1" (stored name "Notify sales"), which the set does not hold. Workflows in the set: New signup. Add the child to the set, or mock the node with mockNode().',
	});
});

test('rejects with the child workflow and node when the child fails', async () => {
	const { parent, child } = loadSales();
	mockNode(child.node('Post to Slack'), { error: { message: 'Slack is unavailable' } });

	await expect(executeWorkflow(parent, options)).rejects.toMatchObject({
		code: 'NODE_FAILED',
		workflow: 'Notify sales',
		node: 'Post to Slack',
	});
});

test('waits for a child that the parent does not wait for, and rejects when it fails', async () => {
	const { parent, child } = loadSales(
		changeNode(newSignup, 'Run sales workflow', { options: { waitForSubWorkflow: false } }),
	);
	mockNode(child.node('Post to Slack'), { error: { message: 'Slack is unavailable' } });

	await expect(executeWorkflow(parent, options)).rejects.toMatchObject({
		code: 'NODE_FAILED',
		workflow: 'Notify sales',
		node: 'Post to Slack',
	});
});

test('records one run for each call to the child', async () => {
	const { parent, child } = loadSales(
		changeNode(newSignup, 'Run sales workflow', { mode: 'each' }),
	);
	mockNode(parent.node('Get customer'), [enterprise, { ...enterprise, name: 'Grace' }]);
	mockNode(child.node('Post to Slack'), [{ ok: true }]);

	const result = await executeWorkflow(parent, options);

	const texts = result
		.workflow('Notify sales')
		.runs.map((run) => run.node('Post to Slack').parameters[0].text);
	expect(texts).toEqual(['New enterprise signup: Ada', 'New enterprise signup: Grace']);
});

test('gives each child run the next execution ID', async () => {
	const { parent, child } = loadSales(
		changeNode(newSignup, 'Run sales workflow', { mode: 'each' }),
		changeNode(notifySales, 'Post to Slack', { text: '={{ $execution.id }}' }),
	);
	mockNode(parent.node('Get customer'), [enterprise, enterprise]);
	mockNode(child.node('Post to Slack'), [{ ok: true }]);

	const result = await executeWorkflow(parent, options);

	const ids = result
		.workflow('Notify sales')
		.runs.map((run) => run.node('Post to Slack').parameters[0].text);
	expect(ids).toEqual(['test-execution-2', 'test-execution-3']);
});

test('runs an inline child with no set', async () => {
	const inline = { ...formatName, name: 'Inline format' };
	const workflow = loadWorkflow(
		changeNode(newSignup, 'Run sales workflow', {
			source: 'parameter',
			workflowJson: JSON.stringify(inline),
			workflowId: undefined,
			workflowInputs: undefined,
		}),
	);
	mockParentServices(workflow);
	mockNode(workflow.node('Get customer'), [{ first: 'Ada', last: 'Lovelace', plan: 'enterprise' }]);

	const result = await executeWorkflow(workflow, options);

	expect(result.node('Run sales workflow').output).toEqual([{ fullName: 'Ada Lovelace' }]);
	expect(result.workflow('Inline format').runs).toHaveLength(1);
});

test('fails a child that loads from a URL', async () => {
	const workflow = loadWorkflow(
		changeNode(newSignup, 'Run sales workflow', {
			source: 'url',
			workflowUrl: 'https://workflows.example.com/notify-sales.json',
		}),
	);
	mockParentServices(workflow);

	await expect(executeWorkflow(workflow, options)).rejects.toMatchObject({
		code: 'SUB_WORKFLOW_SOURCE_NOT_SUPPORTED',
		node: 'Run sales workflow',
	});
});

function continueOnError(definition: WorkflowDefinition, name: string): WorkflowDefinition {
	const copy = structuredClone(definition);
	copy.nodes.find((node) => node.name === name)!.onError = 'continueRegularOutput';
	return copy;
}

function changeType(
	definition: WorkflowDefinition,
	name: string,
	type: string,
	typeVersion: number,
) {
	const copy = structuredClone(definition);
	Object.assign(copy.nodes.find((node) => node.name === name)!, { type, typeVersion });
	return copy;
}

test('rejects a call to a child with no Execute Workflow Trigger when the calling node continues on error', async () => {
	const { parent } = loadSales(
		continueOnError(newSignup, 'Run sales workflow'),
		changeType(notifySales, 'When called by another workflow', 'n8n-nodes-base.webhook', 2),
	);

	await expect(executeWorkflow(parent, options)).rejects.toMatchObject({
		code: 'INVALID_WORKFLOW',
		workflow: 'Notify sales',
	});
});

test('rejects a call to a child with a node type that is not installed when the calling node continues on error', async () => {
	const { parent } = loadSales(
		continueOnError(newSignup, 'Run sales workflow'),
		changeType(notifySales, 'Post to Slack', 'n8n-nodes-acme.lookup', 1),
	);

	await expect(executeWorkflow(parent, options)).rejects.toMatchObject({
		code: 'NODE_TYPE_NOT_INSTALLED',
		workflow: 'Notify sales',
		node: 'Post to Slack',
	});
});

test('pairs the items that a child returns with the parent items that it received', async () => {
	const node = (name: string, type: string, typeVersion: number, parameters = {}) => ({
		id: name,
		name,
		type,
		typeVersion,
		position: [0, 0],
		parameters,
	});
	const toNode = (target: string) => ({ main: [[{ node: target, type: 'main', index: 0 }]] });
	const parent: WorkflowDefinition = {
		name: 'Parent',
		nodes: [
			node('Start', 'n8n-nodes-base.manualTrigger', 1),
			node('Run child', 'n8n-nodes-base.executeWorkflow', 1.2, {
				workflowId: { __rl: true, value: 'largest-1', mode: 'id' },
				options: {},
			}),
			node('Read start', 'n8n-nodes-base.set', 3.4, {
				assignments: {
					assignments: [
						{ id: 'a', name: 'start', value: "={{ $('Start').item.json.n }}", type: 'number' },
					],
				},
				options: {},
			}),
		],
		connections: { Start: toNode('Run child'), 'Run child': toNode('Read start') },
	};
	const child: WorkflowDefinition = {
		id: 'largest-1',
		name: 'Largest',
		nodes: [
			node('When called', 'n8n-nodes-base.executeWorkflowTrigger', 1.1, {
				inputSource: 'passthrough',
			}),
			node('Sort', 'n8n-nodes-base.sort', 1, {
				sortFieldsUi: { sortField: [{ fieldName: 'n', order: 'descending' }] },
			}),
			node('First', 'n8n-nodes-base.limit', 1, { maxItems: 1 }),
		],
		connections: { 'When called': toNode('Sort'), Sort: toNode('First') },
	};

	const result = await executeWorkflow(loadWorkflows([parent, child]).get('Parent'), {
		input: [{ n: 1 }, { n: 2 }],
	});

	expect(result.output).toEqual([{ start: 2 }]);
});
