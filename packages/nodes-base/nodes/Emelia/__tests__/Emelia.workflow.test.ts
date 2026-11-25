import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Emelia', () => {
	const credentials = { emeliaApi: { apiKey: 'fake-api-key' } };

	beforeAll(() => {
		const api = nock('https://graphql.emelia.io');
		api
			.post('/graphql', (body: { operationName: string }) => body.operationName === 'campaign')
			.reply(200, { data: { campaign: { _id: '64b7f1c2e4b0a1d2c3e4f5a6', name: 'Onboarding' } } });
		api
			.post('/graphql', (body: { operationName: string }) => body.operationName === 'contact_lists')
			.reply(200, {
				data: { contact_lists: [{ _id: '64b7f1c2e4b0a1d2c3e4f5b7', name: 'Leads' }] },
			});
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.isDone()).toBe(true),
	});
});
