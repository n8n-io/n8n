import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('ApiTemplateIo > Workflows', () => {
	const credentials = {
		apiTemplateIoApi: {
			apiKey: 'test-api-key',
		},
	};

	beforeAll(() => {
		const mock = nock('https://api.apitemplate.io/v1');
		mock.get('/account-information').reply(200, { status: 'success', api_calls: 12 });
		mock
			.post('/create', { name: 'Ada' })
			.query({ template_id: '79667b2b1876e347' })
			.reply(200, { status: 'success', transaction_ref: 'a0430897-2c94-40e1-a09b-57403d811ceb' });
	});

	new NodeTestHarness().setupTests({
		credentials,
		customAssertions: () => expect(nock.isDone()).toBe(true),
	});
});
