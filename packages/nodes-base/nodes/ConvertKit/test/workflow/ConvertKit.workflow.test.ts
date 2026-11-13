import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const customField = { id: 7, label: 'Company' };
const subscription = { id: 55, state: 'active' };
const secret = { api_secret: 'fake-api-secret' };

describe('ConvertKit > Workflows', () => {
	const credentials = { convertKitApi: { apiSecret: 'fake-api-secret' } };

	beforeAll(() => {
		const mock = nock('https://api.convertkit.com/v3');
		mock.post('/custom_fields', { label: 'Company' }).query(secret).reply(200, customField);
		mock
			.get('/custom_fields')
			.query(secret)
			.reply(200, { custom_fields: [customField] });
		mock.put('/custom_fields/7', { label: 'Company' }).query(secret).reply(200, customField);
		mock.delete('/custom_fields/7').query(secret).reply(200, {});
		mock.post('/forms/123/subscribe').query(secret).reply(200, { subscription });
		mock
			.get('/forms')
			.query(secret)
			.reply(200, { forms: [{ id: 123, name: 'Newsletter' }] });
		mock
			.get('/forms/123/subscriptions')
			.query(secret)
			.reply(200, { subscriptions: [subscription] });
		mock.post('/sequences/42/subscribe').query(secret).reply(200, { subscription });
		mock
			.get('/sequences')
			.query(secret)
			.reply(200, { courses: [{ id: 42, name: 'Onboarding' }] });
		mock
			.get('/sequences/42/subscriptions')
			.query(secret)
			.reply(200, { subscriptions: [subscription] });
		mock
			.post('/tags', { tag: [{ name: 'vip' }] })
			.query(secret)
			.reply(200, { id: 9, name: 'vip' });
		mock
			.get('/tags')
			.query(secret)
			.reply(200, { tags: [{ id: 9, name: 'vip' }] });
		mock.post('/tags/9/subscribe').query(secret).reply(200, { subscription });
		mock
			.get('/tags/9/subscriptions')
			.query(secret)
			.reply(200, { subscriptions: [subscription] });
		mock
			.post('/tags/9%3E/unsubscribe', { email: 'nathan@example.com' })
			.query(secret)
			.reply(200, { id: 55 });
	});

	afterAll(() => {
		expect(nock.isDone()).toBe(true);
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
	});
});
