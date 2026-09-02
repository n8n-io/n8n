import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Elasticsearch', () => {
	const credentials = {
		elasticsearchApi: {
			username: 'user',
			password: 'password',
			baseUrl: 'https://elastic.local',
			ignoreSSLIssues: false,
		},
	};

	beforeAll(() => {
		// The interceptor only matches if the expression-supplied value lands as a single
		// plain string value in the body, quotes and all, and if `queryParameters` is kept
		// out of the request's query string.
		nock('https://elastic.local')
			.post('/my-index/_search', {
				query: { term: { 'user.id': 'john", "boost": "2' } },
			})
			.query({ _source: 'true', size: '10' })
			.reply(200, {
				hits: {
					hits: [
						{
							_index: 'my-index',
							_id: 'doc1',
							_score: 1,
							_source: { 'user.id': 'john' },
						},
					],
				},
			});
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['document-getAll-queryParameters.workflow.json'],
	});
});
