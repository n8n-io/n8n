import { loadPackage } from '../src';
import { copySalesPackage, SALES_PACKAGE } from './support/package-fixture';

test('reports no issues for a complete package', async () => {
	expect((await loadPackage(SALES_PACKAGE)).issues()).toEqual([]);
});

test('reports a child that the package does not hold one time', async () => {
	const directory = copySalesPackage((manifest) => {
		manifest.workflows = manifest.workflows?.filter(({ name }) => name !== 'Notify sales');
	});

	expect((await loadPackage(directory)).issues()).toEqual([
		expect.objectContaining({
			code: 'SUB_WORKFLOW_NOT_IN_SET',
			workflow: 'New signup',
			node: 'Run sales workflow',
		}),
	]);
});

test('reports a workflow reference from the manifest that no node holds', async () => {
	const directory = copySalesPackage((manifest) => {
		manifest.requirements?.workflows?.push({
			id: 'ErrorHandler01',
			name: 'Error handler',
			usedBy: [{ kind: 'workflow', id: 'NewSignup0001' }],
		});
	});

	expect((await loadPackage(directory)).issues()).toEqual([
		{
			code: 'SUB_WORKFLOW_NOT_IN_SET',
			workflow: 'New signup',
			message:
				'New signup references the workflow ID "ErrorHandler01" (stored name "Error handler"), which the package does not hold. Workflows in the package: New signup, Notify sales.',
		},
	]);
});

test('reports a node type that is not installed', async () => {
	const directory = copySalesPackage((manifest) => {
		manifest.requirements?.nodeTypes?.push({
			type: 'n8n-nodes-acme.lookup',
			typeVersion: 1,
			usedBy: [{ kind: 'workflow', id: 'NotifySales001' }],
		});
	});

	expect((await loadPackage(directory)).issues()).toEqual([
		expect.objectContaining({ code: 'NODE_TYPE_NOT_INSTALLED', workflow: 'Notify sales' }),
	]);
});

test('reads the requirements from the manifest', async () => {
	const { requirements } = await loadPackage(SALES_PACKAGE);

	expect(requirements).toMatchObject({
		credentials: [
			{
				id: 'CrmApiKey0001',
				name: 'CRM API key',
				type: 'httpHeaderAuth',
				workflows: ['New signup'],
			},
			{ id: 'MailServer001', name: 'Mail server', type: 'smtp', workflows: ['New signup'] },
			{ id: 'SlackAccount1', name: 'Slack account', type: 'slackApi', workflows: ['Notify sales'] },
		],
		variables: [{ name: 'crmBaseUrl', workflows: ['New signup'] }],
		dataTables: [],
		workflows: [{ id: 'NotifySales001', name: 'Notify sales', workflows: ['New signup'] }],
		nodeTypes: expect.arrayContaining([
			{ type: 'n8n-nodes-base.httpRequest', version: 4.2, workflows: ['New signup'] },
			{ type: 'n8n-nodes-base.slack', version: 2.2, workflows: ['Notify sales'] },
		]),
	});
});
