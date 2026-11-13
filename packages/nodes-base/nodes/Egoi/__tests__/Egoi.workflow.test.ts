import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('E-goi', () => {
	const credentials = { egoiApi: { apiKey: 'fake-api-key' } };

	const contact = {
		base: { contact_id: '9f3a1c2b7d', email: 'nathan@n8n.io', first_name: 'Nathan' },
		extra: [{ field_id: 1, value: 'n8n' }],
		tags: [5],
	};

	beforeAll(() => {
		const api = nock('https://api.egoiapp.com');
		api.post('/lists/4/contacts').reply(201, { contact_id: '9f3a1c2b7d' });
		api
			.post('/lists/4/contacts/actions/attach-tag', { tag_id: 5, contacts: ['9f3a1c2b7d'] })
			.reply(200, {});
		api.get('/lists/4/contacts/9f3a1c2b7d').times(2).reply(200, contact);
		api.get('/lists/4/contacts').query({ email: 'nathan@n8n.io' }).reply(200, contact);
		api
			.get('/lists/4/contacts')
			.query({ limit: 10 })
			.reply(200, { items: [contact] });
		api.get('/lists/4/fields').reply(200, [
			{ field_id: 1, name: 'Company', type: 'extra' },
			{ field_id: 'email', name: 'email', type: 'base' },
		]);
		api
			.get('/lists/4/contacts')
			.query({ offset: 0, count: 500 })
			.reply(200, { items: [contact] });
		api.get('/lists/4/contacts').query({ offset: 500, count: 500 }).reply(200, { items: [] });
		api.patch('/lists/4/contacts/9f3a1c2b7d').reply(200, { contact_id: '9f3a1c2b7d' });
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.isDone()).toBe(true),
	});
});
