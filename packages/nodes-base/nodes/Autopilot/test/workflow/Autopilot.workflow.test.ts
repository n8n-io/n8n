import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const contactId = 'person_0A1B2C3D-4E5F-4A6B-8C7D-9E0F1A2B3C4D';
const listId = 'contactlist_06444749-9C0B-4894-9D43-1F7B5D4D0E2A';
const firstPageBookmark = 'person_11111111-2222-4333-8444-555555555555';

describe('Autopilot > Workflows', () => {
	const credentials = { autopilotApi: { apiKey: 'fake-api-key' } };
	const mock = nock('https://api2.autopilothq.com/v1').matchHeader(
		'autopilotapikey',
		'fake-api-key',
	);

	beforeAll(() => {
		mock
			.post('/contact', { contact: { Email: 'nathan@example.com' } })
			.reply(200, { contact_id: contactId });
		mock
			.get(`/contact/${contactId}`)
			.reply(200, { contact_id: contactId, Email: 'nathan@example.com' });
		mock.delete(`/contact/${contactId}`).reply(200, {});
		mock
			.get('/contacts')
			.reply(200, { contacts: [{ contact_id: firstPageBookmark }], bookmark: firstPageBookmark });
		mock
			.get(`/contacts/${firstPageBookmark}`)
			.reply(200, { contacts: [{ contact_id: 'person_66666666-7777-4888-9999-AAAAAAAAAAAA' }] });
		mock.post(`/trigger/0001/contact/${contactId}`).reply(200, {});
		mock.post(`/list/${listId}/contact/${contactId}`).reply(200, {});
		mock.get(`/list/${listId}/contact/${contactId}`).reply(200, {});
		mock.delete(`/list/${listId}/contact/${contactId}`).reply(200, {});
		mock
			.get(`/list/${listId}/contacts`)
			.query({ limit: 1 })
			.reply(200, { contacts: [{ contact_id: contactId }] });
		mock.post('/list', { name: 'Newsletter' }).reply(200, { list_id: listId });
		mock.get('/lists').reply(200, { lists: [{ list_id: listId, title: 'Newsletter' }] });
	});

	afterAll(() => {
		expect(mock.isDone()).toBe(true);
	});

	new NodeTestHarness().setupTests({ credentials, workflowFiles: ['requests.workflow.json'] });
});
