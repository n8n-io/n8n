import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Chargebee > Workflows', () => {
	const credentials = {
		chargebeeApi: {
			accountName: 'acme',
			apiKey: 'test_api_key',
		},
	};

	beforeAll(() => {
		const api = nock('https://acme.chargebee.com/api/v2').matchHeader(
			'authorization',
			`Basic ${Buffer.from('test_api_key:').toString('base64')}`,
		);
		api
			.post('/customers')
			.query({ id: 'cus_123', first_name: 'Nathan' })
			.reply(200, { customer: { id: 'cus_123', first_name: 'Nathan' } });
		api
			.get('/invoices')
			.query({ 'sort_by[desc]': 'date', limit: 10 })
			.reply(200, { list: [{ invoice: { id: 'inv_42', status: 'paid' } }] });
		api
			.post('/invoices/inv_42/pdf')
			.reply(200, { download: { download_url: 'https://files.example.com/inv_42.pdf' } });
		api
			.post('/subscriptions/sub_7/cancel', { end_of_term: true })
			.reply(200, { subscription: { id: 'sub_7', status: 'cancelled' } });
		api.post('/subscriptions/sub_7/delete').reply(200, { subscription: { id: 'sub_7' } });
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
