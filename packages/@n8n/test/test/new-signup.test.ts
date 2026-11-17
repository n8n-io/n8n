import { executeWorkflow, loadWorkflow, mockNode } from '../src';
import definition from './fixtures/new-signup.json';

const input = { body: { customerId: 42 } };
const variables = { crmBaseUrl: 'https://crm.example.com' };
const enterprise = { id: 42, name: 'Ada', plan: 'enterprise' };
const free = { id: 42, name: 'Ada', email: 'ada@example.com', plan: 'free' };

test('sends an enterprise signup to sales', async () => {
	const workflow = loadWorkflow(definition);
	mockNode(workflow.node('Get customer'), [enterprise]);
	mockNode(workflow.node('Run sales workflow'), [{ notified: true }]);

	const result = await executeWorkflow(workflow, { input, variables });

	expect(result.node('Get customer').input).toEqual([input]);
	expect(result.node('Is enterprise?').outputs).toEqual([[enterprise], []]);
	expect(result.node('Run sales workflow').input).toEqual([enterprise]);
	expect(result.node('Send welcome email').runs).toHaveLength(0);
	expect(result.output).toEqual([{ notified: true }]);
});

test('resolves the parameters of a mocked node for each item', async () => {
	const workflow = loadWorkflow(definition);
	mockNode(workflow.node('Get customer'), [free]);
	const sendEmail = workflow.node('Send welcome email');
	mockNode(sendEmail, [{ sent: true }]);

	const result = await executeWorkflow(workflow, { input, variables });

	expect(result.node(sendEmail).parameters).toEqual([
		expect.objectContaining({
			toEmail: 'ada@example.com',
			subject: 'Welcome, Ada',
			text: 'Hello Ada, welcome to the free plan.',
		}),
	]);
});

test('retries when the CRM fails one time', async () => {
	const workflow = loadWorkflow(definition);
	mockNode(
		workflow.node('Get customer'),
		vi.fn().mockRejectedValueOnce(new Error('CRM is unavailable')).mockResolvedValue([free]),
	);
	mockNode(workflow.node('Send welcome email'), [{ sent: true }]);

	const result = await executeWorkflow(workflow, { input, variables });

	expect(result.node('Send welcome email').runs).toHaveLength(1);
});

test('fails when the CRM is unavailable', async () => {
	const workflow = loadWorkflow(definition);
	mockNode(workflow.node('Get customer'), { error: { message: 'CRM is unavailable' } });

	const execution = executeWorkflow(workflow, { input, variables });

	await expect(execution).rejects.toMatchObject({
		code: 'NODE_FAILED',
		workflow: 'New signup',
		node: 'Get customer',
		message: 'Node "Get customer" failed: CRM is unavailable',
	});
	const error = await execution.catch((caught: unknown) => caught);
	expect(error).toHaveProperty('result');
});

test('resolves when the workflow handles the error', async () => {
	const workflow = loadWorkflow(definition);
	mockNode(workflow.node('Get customer'), [free]);
	mockNode(workflow.node('Send welcome email'), { error: { message: 'SMTP is down' } });

	const result = await executeWorkflow(workflow, { input, variables });

	expect(result.node('Send welcome email').error).toEqual({ message: 'SMTP is down' });
});

test('throws on result.output when two end nodes ran, and lists them', async () => {
	const workflow = loadWorkflow(definition);
	mockNode(workflow.node('Get customer'), [enterprise]);
	mockNode(workflow.node('Is enterprise?'), { outputs: [[enterprise], [enterprise]] });
	mockNode(workflow.node('Run sales workflow'), [{ notified: true }]);
	mockNode(workflow.node('Send welcome email'), [{ sent: true }]);

	const result = await executeWorkflow(workflow, { input, variables });

	expect(() => result.output).toThrow(
		'More than one end node ran: Run sales workflow, Send welcome email.',
	);
});

test('fails a node that needs a credential and has no mock', async () => {
	const workflow = loadWorkflow(definition);

	await expect(executeWorkflow(workflow, { input, variables })).rejects.toMatchObject({
		code: 'CREDENTIAL_NOT_SUPPLIED',
		node: 'Get customer',
		message: expect.stringContaining(
			'Node "Get customer" needs the credential "CRM API key" (httpHeaderAuth).',
		),
	});
});
