import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const apiKey = 'fake-api-key';
const forum = 'n8n-community';
const cursor = '1700000000000000:0:0';

describe('Disqus > Workflows', () => {
	const credentials = { disqusApi: { accessToken: apiKey } };
	const mock = nock('https://disqus.com/api/3.0');

	beforeAll(() => {
		mock
			.get('/forums/details.json')
			.query({
				forum,
				attach: ['counters', 'followsForum'],
				related: 'author',
				api_key: apiKey,
			})
			.reply(200, { response: { id: forum, name: 'n8n Community' } });
		mock
			.get('/forums/listPosts.json')
			.query({ forum, limit: 100, api_key: apiKey })
			.reply(200, {
				cursor: { id: cursor, more: true, hasNext: true },
				response: [{ id: '5001' }],
			});
		mock
			.get('/forums/listPosts.json')
			.query({ forum, limit: 100, api_key: apiKey, cursor })
			.reply(200, {
				cursor: { id: null, more: false, hasNext: false },
				response: [{ id: '5002' }],
			});
		mock
			.get('/forums/listCategories.json')
			.query({ forum, limit: 2, api_key: apiKey })
			.reply(200, { response: [{ id: '3001', title: 'General' }] });
		mock
			.get('/forums/listThreads.json')
			.query({
				forum,
				limit: 5,
				related: ['author', 'forum'],
				include: ['closed', 'open'],
				order: 'asc',
				api_key: apiKey,
			})
			.reply(200, { response: [{ id: '7001', title: 'Welcome' }] });
	});

	afterAll(() => {
		expect(mock.isDone()).toBe(true);
	});

	new NodeTestHarness().setupTests({ credentials, workflowFiles: ['requests.workflow.json'] });
});
