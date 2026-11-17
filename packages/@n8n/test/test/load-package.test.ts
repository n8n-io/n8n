import { PackageImportConfig } from 'n8n/dist/testing.js';
import { readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { createCredential, executeWorkflow, loadPackage, mockNode } from '../src';
import { copySalesPackage, packArchive, SALES_PACKAGE } from './support/package-fixture';

const enterprise = { id: 42, name: 'Ada', plan: 'enterprise' };
const input = { body: { customerId: 42 } };
const variables = { crmBaseUrl: 'https://crm.example.com' };

test.skipIf(process.platform === 'win32')(
	'validates the directory inventory before reading its manifest',
	async () => {
		const directory = copySalesPackage((manifest) => {
			Object.assign(manifest, { packageFormatVersion: '2' });
		});
		symlinkSync('manifest.json', path.join(directory, 'linked.json'));

		await expect(loadPackage(directory)).rejects.toMatchObject({
			code: 'INVALID_PACKAGE',
			message: expect.stringContaining('disallowed entry type'),
		});
	},
);

test('uses the production limit for each package entry', async () => {
	const directory = copySalesPackage(() => {});
	const limits = new PackageImportConfig();
	writeFileSync(path.join(directory, 'large.txt'), Buffer.alloc(limits.maxEntryBytes + 1));

	await expect(loadPackage(directory)).rejects.toMatchObject({
		code: 'INVALID_PACKAGE',
		message: expect.stringContaining('exceeds the maximum allowed uncompressed size per entry'),
	});
});

test('loads the workflows of a package directory', async () => {
	const workflows = await loadPackage(SALES_PACKAGE);

	expect(workflows.workflows.map((workflow) => workflow.name)).toEqual([
		'New signup',
		'Notify sales',
	]);
});

test('loads the workflows of a .n8np file', async () => {
	const workflows = await loadPackage(packArchive(SALES_PACKAGE));

	expect(workflows.get('Notify sales').id).toBe('NotifySales001');
});

test('gets a workflow by its manifest target', async () => {
	const workflows = await loadPackage(SALES_PACKAGE);

	expect(workflows.get('workflows/new-signup-NewSignup0001').name).toBe('New signup');
});

test('runs a real child from the package', async () => {
	const workflows = await loadPackage(SALES_PACKAGE);
	const parent = workflows.get('New signup');
	mockNode(parent.node('Get customer'), [enterprise]);
	mockNode(workflows.get('Notify sales').node('Post to Slack'), [{ ok: true }]);

	const result = await executeWorkflow(parent, { input, variables });

	expect(result.workflow('Notify sales').runs[0].node('Post to Slack').parameters[0]).toMatchObject(
		{ text: 'New enterprise signup: Ada' },
	);
});

test('ignores the variable values in the package', async () => {
	const workflows = await loadPackage(SALES_PACKAGE);
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
	const mocked = (await loadPackage(SALES_PACKAGE)).get('New signup');
	mockNode(mocked.node('Get customer'), [enterprise]);
	const fresh = (await loadPackage(SALES_PACKAGE)).get('New signup');

	await expect(executeWorkflow(fresh, { input, variables })).rejects.toMatchObject({
		code: 'CREDENTIAL_NOT_SUPPLIED',
		node: 'Get customer',
	});
});

test('throws a clear error for an invalid manifest', async () => {
	const directory = copySalesPackage((manifest) => {
		Object.assign(manifest, { packageFormatVersion: '2' });
	});

	await expect(loadPackage(directory)).rejects.toThrow(
		expect.objectContaining({
			code: 'INVALID_PACKAGE',
			message: expect.stringContaining('Package manifest failed validation'),
		}),
	);
});

test('throws INVALID_PACKAGE for a path that does not exist', async () => {
	await expect(loadPackage('/no/such/package')).rejects.toThrow(
		expect.objectContaining({
			code: 'INVALID_PACKAGE',
			message: expect.stringContaining('/no/such/package'),
		}),
	);
});

test('throws INVALID_PACKAGE for a .n8np file that is not complete', async () => {
	const archive = packArchive(SALES_PACKAGE);
	writeFileSync(archive, readFileSync(archive).subarray(0, 300));

	await expect(loadPackage(archive)).rejects.toThrow(
		expect.objectContaining({
			code: 'INVALID_PACKAGE',
			message: expect.stringContaining('Failed to read package archive'),
		}),
	);
});
