import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Clearbit > Workflows', () => {
	const credentials = { clearbitApi: { apiKey: 'test-api-key' } };

	beforeAll(() => {
		nock('https://person-stream.clearbit.com')
			.get('/v2/people/find')
			.query({ email: 'nathan@example.com' })
			.reply(200, { id: 'person-1' });
		nock('https://company-stream.clearbit.com')
			.get('/v2/companies/find')
			.query({ domain: 'example.com' })
			.reply(200, { id: 'company-1' });
		nock('https://autocomplete.clearbit.com')
			.get('/v1/companies/suggest')
			.query({ query: 'Acme' })
			.reply(200, [{ name: 'Acme Corp' }]);
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
