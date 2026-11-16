import { createCredential, executeWorkflow, loadPackage, mockNode } from '../src';
import { copySalesPackage, packArchive, SALES_PACKAGE } from './support/package-fixture';

const enterprise = { id: 42, name: 'Ada', plan: 'enterprise' };
const input = { body: { customerId: 42 } };
const variables = { crmBaseUrl: 'https://crm.example.com' };

test('loads the workflows of a package directory', () => {
	const workflows = loadPackage(SALES_PACKAGE);

	expect(workflows.workflows.map((workflow) => workflow.name)).toEqual([
		'New signup',
		'Notify sales',
	]);
});

test('loads the workflows of a .n8np file', () => {
	const workflows = loadPackage(packArchive(SALES_PACKAGE));

	expect(workflows.get('Notify sales').id).toBe('NotifySales001');
});

test('gets a workflow by its manifest target', () => {
	const workflows = loadPackage(SALES_PACKAGE);

	expect(workflows.get('workflows/new-signup-NewSignup0001').name).toBe('New signup');
});

test('runs a real child from the package', async () => {
	const workflows = loadPackage(SALES_PACKAGE);
	const parent = workflows.get('New signup');
	mockNode(parent.node('Get customer'), [enterprise]);
	mockNode(workflows.get('Notify sales').node('Post to Slack'), [{ ok: true }]);

	const result = await executeWorkflow(parent, { input, variables });

	expect(result.workflow('Notify sales').runs[0].node('Post to Slack').parameters[0]).toMatchObject(
		{ text: 'New enterprise signup: Ada' },
	);
});

test('ignores the variable values in the package', async () => {
	const workflows = loadPackage(SALES_PACKAGE);
	const parent = workflows.get('New signup');
	mockNode(parent.node('Send welcome email'), [{ sent: true }]);

	await expect(
		executeWorkflow(parent, {
			input,
			credentials: {
				'CRM API key': createCredential('httpHeaderAuth', { name: 'X-Api-Key', value: 'k' }),
			},
		}),
	).rejects.toMatchObject({ code: 'VARIABLE_NOT_SUPPLIED' });
});

test('gives each load call its own mocks', async () => {
	const mocked = loadPackage(SALES_PACKAGE).get('New signup');
	mockNode(mocked.node('Get customer'), [enterprise]);
	const fresh = loadPackage(SALES_PACKAGE).get('New signup');

	await expect(executeWorkflow(fresh, { input, variables })).rejects.toMatchObject({
		code: 'CREDENTIAL_NOT_SUPPLIED',
		node: 'Get customer',
	});
});

test('throws a clear error for an invalid manifest', () => {
	const directory = copySalesPackage((manifest) => {
		Object.assign(manifest, { packageFormatVersion: '2' });
	});

	expect(() => loadPackage(directory)).toThrow(
		expect.objectContaining({
			code: 'INVALID_PACKAGE',
			message: expect.stringContaining('invalid file manifest.json. packageFormatVersion'),
		}),
	);
});

test('throws INVALID_PACKAGE for a path that does not exist', () => {
	expect(() => loadPackage('/no/such/package')).toThrow(
		expect.objectContaining({
			code: 'INVALID_PACKAGE',
			message: expect.stringContaining('/no/such/package'),
		}),
	);
});
