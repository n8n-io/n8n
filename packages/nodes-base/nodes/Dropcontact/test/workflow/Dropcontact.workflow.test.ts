import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Dropcontact > Workflows', () => {
	const credentials = { dropcontactApi: { apiKey: 'fake-api-key' } };
	const mock = nock('https://api.dropcontact.io');

	beforeAll(() => {
		mock
			.post('/batch', {
				data: [{ email: 'nathan@example.com' }],
				siren: false,
				language: 'en',
			})
			.reply(200, { request_id: 'Rq7Pz3Mn5Yt', success: true, error: false });
		mock
			.post('/batch', { data: [{ email: 'jan@example.com' }], siren: false, language: 'en' })
			.reply(200, { request_id: 'Hw4Vb8Nc2Ks', success: true, error: false });
		mock
			.get('/batch/Hw4Vb8Nc2Ks')
			.reply(200, { success: true, data: [{ email: [{ email: 'jan@example.com' }] }] });
		mock
			.get('/batch/kd8Fj2Lq9Xz')
			.reply(200, { success: true, data: [{ email: [{ email: 'anna@example.com' }] }] });
	});

	afterAll(() => {
		expect(mock.isDone()).toBe(true);
	});

	new NodeTestHarness().setupTests({ credentials, workflowFiles: ['requests.workflow.json'] });
});
