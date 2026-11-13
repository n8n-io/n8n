import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const jobId = 'AXt8bW1eCt7ZpQ9vYx3k';
const job = { id: jobId, status: 'Waiting' };
const report = { id: jobId, status: 'Success' };

describe('Cortex > Workflows', () => {
	const credentials = {
		cortexApi: { cortexApiKey: 'fake-api-key', host: 'https://cortex.example.com' },
	};

	beforeAll(() => {
		const mock = nock('https://cortex.example.com/api');
		mock
			.post('/analyzer/a1b2c3d4e5f6/run', { dataType: 'domain', tlp: 2, data: 'example.com' })
			.query({ force: false })
			.reply(200, job);
		mock.get(`/job/${jobId}/waitreport`).query({ atMost: '10second' }).reply(200, report);
		mock.get(`/job/${jobId}`).reply(200, job);
		mock.get(`/job/${jobId}/report`).reply(200, report);
		mock.post('/responder/f6e5d4c3b2a1/run').reply(200, job);
	});

	afterAll(() => {
		expect(nock.isDone()).toBe(true);
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
	});
});
