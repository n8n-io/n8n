import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const baseUrl = 'https://api.bamboohr.com/api/gateway.php/acme/v1';
const employee = { id: '112', firstName: 'Nathan', lastName: 'Smith' };

describe('BambooHR > Workflows', () => {
	const credentials = {
		bambooHrApi: {
			subdomain: 'acme',
			apiKey: 'fake-api-key',
		},
	};

	beforeAll(() => {
		const api = nock(baseUrl).matchHeader(
			'authorization',
			`Basic ${Buffer.from('fake-api-key:x').toString('base64')}`,
		);
		api
			.get('/reports/18/')
			.query({ format: 'JSON', fd: 'true', onlyCurrent: 'true' })
			.reply(200, { title: 'Headcount', employees: [{ id: '112' }] });
		api.post('/employees').reply(201, '', { location: `${baseUrl}/employees/112` });
		api.get('/employees/112').query({ fields: 'firstName,lastName' }).reply(200, employee);
		api.get('/employees/directory').reply(200, { employees: [{ id: '112', firstName: 'Nathan' }] });
		api.post('/employees/112', { firstName: 'Nate', address: {} }).reply(200, {});
		api.get('/employees/112/files/view/').reply(200, {
			categories: [{ id: 17, name: 'Contracts', files: [{ id: 345, name: 'contract.pdf' }] }],
		});
		api
			.get('/employees/112/files/345/')
			.reply(200, 'file content', { 'content-type': 'application/pdf' });
		api
			.post('/employees/112/files/345', { name: 'contract-2026.pdf', shareWithEmployee: 'no' })
			.reply(200, {});
		api.delete('/employees/112/files/345').reply(200, {});
		api
			.post('/employees/112/files')
			.reply(201, '', { location: `${baseUrl}/employees/112/files/346` });
		api.get('/files/view').reply(200, {
			categories: [{ id: 21, name: 'Policies', files: [{ id: 501, name: 'handbook.pdf' }] }],
		});
		api.get('/files/501/').reply(200, 'file content', { 'content-type': 'application/pdf' });
		api.post('/files/501', { shareWithEmployee: 'yes' }).reply(200, {});
		api.delete('/files/501').reply(200, {});
		api.post('/files').reply(201, '', { location: `${baseUrl}/files/502` });
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
