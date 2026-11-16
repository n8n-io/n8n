import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const contactId = '1234567890';

describe('Drift > Workflows', () => {
	const credentials = { driftApi: { accessToken: 'fake-access-token' } };
	const mock = nock('https://driftapi.com').matchHeader(
		'authorization',
		'Bearer fake-access-token',
	);

	beforeAll(() => {
		mock
			.post('/contacts', {
				attributes: { email: 'nathan@example.com', name: 'Nathan' },
			})
			.reply(200, { data: { id: 1234567890 } });
		mock
			.patch(`/contacts/${contactId}`, { attributes: { phone: '+15550100' } })
			.reply(200, { data: { id: 1234567890 } });
		mock.get(`/contacts/${contactId}`).reply(200, { data: { id: 1234567890 } });
		mock.get('/contacts/attributes').reply(200, { data: { properties: [{ name: 'company' }] } });
		mock.delete(`/contacts/${contactId}`).reply(200, {});
	});

	afterAll(() => {
		expect(mock.isDone()).toBe(true);
	});

	new NodeTestHarness().setupTests({ credentials, workflowFiles: ['requests.workflow.json'] });
});
