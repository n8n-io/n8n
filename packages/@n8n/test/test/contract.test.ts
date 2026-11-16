import { executeWorkflow, loadWorkflows, mockNode, type WorkflowDefinition } from '../src';
import newSignup from './fixtures/new-signup.json';
import notifySales from './fixtures/notify-sales.json';

function childWithTrigger(parameters: Record<string, unknown>): WorkflowDefinition {
	const copy = structuredClone(notifySales) as WorkflowDefinition;
	copy.nodes[0].parameters = parameters as WorkflowDefinition['nodes'][number]['parameters'];
	return copy;
}

const declaresCustomerId = childWithTrigger({
	workflowInputs: { values: [{ name: 'customerId', type: 'number' }] },
});

const mismatch = [
	'New signup → "Run sales workflow" calls Notify sales',
	'  - sends "customerName", which Notify sales does not declare',
	'  - does not send "customerId" (number), which Notify sales declares',
].join('\n');

test('reports the fields that the parent sends and the child does not declare, and the reverse', () => {
	const workflows = loadWorkflows([newSignup, declaresCustomerId]);

	expect(workflows.issues()).toEqual([
		{
			code: 'CONTRACT_MISMATCH',
			workflow: 'New signup',
			node: 'Run sales workflow',
			message: mismatch,
		},
	]);
});

test('reports a child that accepts all data as not checked', () => {
	const workflows = loadWorkflows([newSignup, childWithTrigger({ inputSource: 'passthrough' })]);

	expect(workflows.issues()).toEqual([
		{
			code: 'CONTRACT_NOT_CHECKED',
			workflow: 'New signup',
			node: 'Run sales workflow',
			message:
				'New signup → "Run sales workflow" calls Notify sales\n  - not checked: Notify sales accepts all data',
		},
	]);
});

test('reports a child with a JSON example that is not valid JSON as not checked', () => {
	const child = childWithTrigger({ inputSource: 'jsonExample', jsonExample: '{ "customerId": ' });
	const workflows = loadWorkflows([newSignup, child]);

	expect(workflows.issues()).toEqual([
		{
			code: 'CONTRACT_NOT_CHECKED',
			workflow: 'New signup',
			node: 'Run sales workflow',
			message:
				'New signup → "Run sales workflow" calls Notify sales\n  - not checked: the JSON example of Notify sales is not valid JSON',
		},
	]);
});

test('fails the execution before a child with a different contract runs', async () => {
	const workflows = loadWorkflows([newSignup, declaresCustomerId]);
	const parent = workflows.get('New signup');
	mockNode(parent.node('Get customer'), [{ id: 42, name: 'Ada', plan: 'enterprise' }]);
	mockNode(parent.node('Send welcome email'), [{ sent: true }]);

	await expect(
		executeWorkflow(parent, {
			input: { body: { customerId: 42 } },
			variables: { crmBaseUrl: 'https://crm.example.com' },
		}),
	).rejects.toMatchObject({
		code: 'CONTRACT_MISMATCH',
		workflow: 'New signup',
		node: 'Run sales workflow',
		message: mismatch,
	});
});

test('reports no issues for a consistent set', () => {
	expect(loadWorkflows([newSignup, notifySales]).issues()).toEqual([]);
});

test('lists each credential with the workflows that use it', () => {
	const { credentials } = loadWorkflows([newSignup, notifySales]).requirements;

	expect(credentials).toEqual([
		{ name: 'CRM API key', id: 'cred-crm-1', type: 'httpHeaderAuth', workflows: ['New signup'] },
		{ name: 'Mail server', id: 'cred-smtp-1', type: 'smtp', workflows: ['New signup'] },
		{ name: 'Slack account', id: 'cred-slack-1', type: 'slackApi', workflows: ['Notify sales'] },
	]);
});

test('lists only the data tables that a node references by a static id', () => {
	const tableNode = (name: string, type: string, dataTableId: Record<string, unknown>) => ({
		id: name,
		name,
		type,
		typeVersion: 1,
		position: [0, 0] as [number, number],
		parameters: { dataTableId: { __rl: true, ...dataTableId } },
	});
	const workflow: WorkflowDefinition = {
		name: 'Tables',
		connections: {},
		nodes: [
			tableNode('By id', 'n8n-nodes-base.dataTable', { mode: 'id', value: 'tbl-1' }),
			tableNode('Tool', 'n8n-nodes-base.dataTableTool', {
				mode: 'list',
				value: 'tbl-2',
				cachedResultName: 'Orders',
			}),
			tableNode('By name', 'n8n-nodes-base.dataTable', { mode: 'name', value: 'Orders' }),
			tableNode('By expression', 'n8n-nodes-base.dataTable', {
				mode: 'id',
				value: '={{ $json.table }}',
			}),
		],
	};

	expect(loadWorkflows([workflow]).requirements.dataTables).toEqual([
		{ id: 'tbl-1', name: undefined, workflows: ['Tables'] },
		{ id: 'tbl-2', name: 'Orders', workflows: ['Tables'] },
	]);
});

test('reports no missing child for a set from loadWorkflows', () => {
	expect(loadWorkflows([newSignup]).issues()).toEqual([]);
});
