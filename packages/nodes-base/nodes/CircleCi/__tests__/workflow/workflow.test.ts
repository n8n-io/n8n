import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('CircleCI > Workflows', () => {
	const credentials = { circleCiApi: { apiKey: 'test-api-key' } };

	beforeAll(() => {
		nock('https://circleci.com')
			.get('/api/v2/project/github/n8n-io%2Fn8n/pipeline/42')
			.reply(200, { id: 'pipeline-42' })
			.get('/api/v2/project/github/n8n-io%2Fn8n/pipeline')
			.query({ limit: '1' })
			.reply(200, { items: [{ id: 'pipeline-42' }] })
			.post('/api/v2/project/github/n8n-io%2Fn8n/pipeline')
			.reply(200, { id: 'pipeline-43' });
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
