import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Autopilot > Workflows > contact ID by version', () => {
	const credentials = { autopilotApi: { apiKey: 'fake-api-key' } };
	const mock = nock('https://api2.autopilothq.com/v1');

	beforeAll(() => {
		mock.get('/contact/a%2Bb@example.com').reply(200, { version: '1' });
		mock.get('/contact/a%252Bb%2540example.com').reply(200, { version: '1.1' });
	});

	afterAll(() => {
		expect(mock.isDone()).toBe(true);
	});

	new NodeTestHarness().setupTests({ credentials, workflowFiles: ['versions.workflow.json'] });
});
