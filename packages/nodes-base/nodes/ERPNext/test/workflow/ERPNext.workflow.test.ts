import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const invoice = { name: 'ACC-SINV-2026-00001', customer: 'Acme Corp', grand_total: 120 };
const credentials = {
	apiKey: 'fake-api-key',
	apiSecret: 'fake-api-secret',
	allowUnauthorizedCerts: false,
};

describe('ERPNext > Workflows', () => {
	describe('cloud-hosted', () => {
		beforeAll(() => {
			const api = nock('https://acme.erpnext.com/api/resource');
			api.get('/Sales%20Invoice/ACC-SINV-2026-00001').reply(200, { data: invoice });
			api
				.get('/Sales%20Invoice')
				.query({ limit_page_length: '2', limit_start: '0' })
				.reply(200, { data: [invoice] });
			api
				.get('/Customer')
				.query({ limit_page_length: '1000', limit_start: '0' })
				.reply(200, { data: [{ name: 'Acme Corp' }] });
			api
				.get('/Customer')
				.query({ limit_page_length: '1000', limit_start: '999' })
				.reply(200, { data: [] });
			api.post('/Sales%20Invoice', { customer: 'Acme Corp' }).reply(200, { data: invoice });
			api
				.put('/Sales%20Invoice/ACC-SINV-2026-00001', { customer: 'Acme Corp' })
				.reply(200, { data: invoice });
			api.delete('/Sales%20Invoice/ACC-SINV-2026-00001').reply(200, { message: 'ok' });
		});

		new NodeTestHarness().setupTests({
			credentials: {
				erpNextApi: {
					...credentials,
					environment: 'cloudHosted',
					subdomain: 'acme',
					domain: 'erpnext.com',
				},
			},
			workflowFiles: ['cloud.workflow.json'],
			customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
		});
	});

	describe('self-hosted', () => {
		beforeAll(() => {
			nock('https://erp.example.com/api/resource')
				.get('/Sales%20Invoice/ACC-SINV-2026-00001')
				.reply(200, { data: invoice });
		});

		new NodeTestHarness().setupTests({
			credentials: {
				erpNextApi: {
					...credentials,
					environment: 'selfHosted',
					domain: 'https://erp.example.com',
				},
			},
			workflowFiles: ['selfHosted.workflow.json'],
			customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
		});
	});
});
