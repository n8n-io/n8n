import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const entryId = '5f1a2b3c4d5e6f7a8b9c0d1e';
const entry = { _id: entryId, title: 'Hello' };

describe('Cockpit > Workflows', () => {
	const credentials = {
		cockpitApi: {
			url: 'https://cms.example.com',
			accessToken: 'fake-access-token',
		},
	};

	beforeAll(() => {
		const api = nock('https://cms.example.com/api');
		const token = { token: 'fake-access-token' };
		api
			.post('/collections/save/posts', { data: { title: 'Hello' } })
			.query(token)
			.reply(200, entry);
		api
			.post('/collections/get/posts', { limit: 10, simple: true })
			.query(token)
			.reply(200, [entry]);
		api
			.post('/collections/save/posts', { data: { _id: entryId, title: 'Hello' } })
			.query(token)
			.reply(200, entry);
		api
			.post('/forms/submit/contact', { form: { email: 'nathan@example.com' } })
			.query(token)
			.reply(200, { email: 'nathan@example.com' });
		api.get('/singletons/get/settings').query(token).reply(200, { siteName: 'Acme Corp' });
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
