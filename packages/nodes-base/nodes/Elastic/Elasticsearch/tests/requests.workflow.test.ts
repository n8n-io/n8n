import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Elasticsearch', () => {
	const credentials = {
		elasticsearchApi: {
			username: 'user',
			password: 'password',
			baseUrl: 'https://elastic.local:9200/',
			ignoreSSLIssues: false,
		},
	};

	const hit = { _index: 'my-index', _id: 'doc1', _score: 1, _source: { name: 'Nathan' } };

	beforeAll(() => {
		const api = nock('https://elastic.local:9200');
		api.delete('/my-index/_doc/doc1').reply(200, {
			_index: 'my-index',
			_id: 'doc1',
			result: 'deleted',
		});
		api.get('/my-index/_doc/doc1').reply(200, {
			_index: 'my-index',
			_id: 'doc1',
			_version: 1,
			found: true,
			_source: { name: 'Nathan' },
		});
		api
			.post('/my-index/_search')
			.query({ size: 5 })
			.reply(200, { hits: { hits: [hit] } });
		api
			.post('/my-index/_search')
			.query({ size: 10000 })
			.reply(200, { hits: { hits: [hit] } });
		api.post('/my-index/_pit').query({ keep_alive: '1m' }).reply(200, { id: 'pit-1' });
		api
			.post('/_search')
			.query({ sort: 'name:asc', _source: true, size: 10000 })
			.reply(200, { pit_id: 'pit-2', hits: { hits: [{ ...hit, sort: ['Nathan'] }] } });
		api
			.post('/_search')
			.query({ sort: 'name:asc', _source: true, size: 10000 })
			.reply(200, { pit_id: 'pit-2', hits: { hits: [] } });
		api.delete('/_pit', { id: 'pit-2' }).reply(200, { succeeded: true, num_freed: 1 });
		api.put('/my-index/_doc/doc1', { name: 'Nathan' }).reply(201, {
			_index: 'my-index',
			_id: 'doc1',
			_version: 1,
			result: 'created',
		});
		api.post('/my-index/_doc', { name: 'Jan' }).reply(201, {
			_index: 'my-index',
			_id: 'Xk2pB4sB7dQ1',
			_version: 1,
			result: 'created',
		});
		api.post('/_bulk').reply(200, {
			items: [
				{ index: { _index: 'my-index', _id: 'Yb7qC5tC8eR2', result: 'created', status: 201 } },
			],
		});
		api.post('/my-index/_update/doc1', { doc: { name: 'Jan' } }).reply(200, {
			_index: 'my-index',
			_id: 'doc1',
			_version: 2,
			result: 'updated',
		});
		api.put('/my-index').reply(200, {
			acknowledged: true,
			shards_acknowledged: true,
			index: 'my-index',
		});
		api.delete('/my-index').reply(200, { acknowledged: true });
		api.get('/my-index').reply(200, { 'my-index': { aliases: {} } });
		api.get('/_aliases').reply(200, { 'my-index': { aliases: {} } });
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.isDone()).toBe(true),
	});
});
