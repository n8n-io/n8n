import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const records = [
	['companies', 1001],
	['leads', 2002],
	['opportunities', 3003],
	['people', 4004],
	['projects', 5005],
	['tasks', 6006],
] as const;

describe('Copper > Workflows', () => {
	const credentials = { copperApi: { apiKey: 'fake-api-key', email: 'nathan@example.com' } };

	beforeAll(() => {
		const mock = nock('https://api.copper.com/developer_api/v1');
		const listing = { 'x-pw-total': '1' };
		mock.post('/companies', { name: 'Acme Corp' }).reply(200, { id: 1001, name: 'Acme Corp' });
		mock
			.post('/companies/search')
			.query({ page_size: 200 })
			.reply(200, [{ id: 1001, name: 'Acme Corp' }], listing);
		mock
			.get('/customer_sources')
			.query({ page_size: 200 })
			.reply(200, [{ id: 5, name: 'Email' }], listing);
		mock
			.post('/users/search')
			.query({ page_size: 200 })
			.reply(200, [{ id: 6, name: 'Nathan' }], listing);
		for (const [path, id] of records) {
			mock.get(`/${path}/${id}`).reply(200, { id });
			mock.put(`/${path}/${id}`).reply(200, { id });
			mock.delete(`/${path}/${id}`).reply(200, { id });
		}
	});

	afterAll(() => {
		expect(nock.isDone()).toBe(true);
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
	});
});
