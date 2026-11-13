/* eslint-disable n8n-nodes-base/node-param-display-name-miscased */
import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const contactId = '5629499534213120';
const companyId = '5707702298738688';
const dealId = '5649050225344512';
const contact = {
	id: 5629499534213120,
	type: 'PERSON',
	properties: [{ type: 'SYSTEM', name: 'first_name', value: 'Nathan' }],
};
const company = {
	id: 5707702298738688,
	type: 'COMPANY',
	properties: [{ type: 'SYSTEM', name: 'name', value: 'Acme Corp' }],
};
const deal = { id: 5649050225344512, name: 'Renewal', expected_value: 500, probability: 50 };

describe('AgileCrm > Workflows', () => {
	const credentials = {
		agileCrmApi: {
			email: 'nathan@example.com',
			apiKey: 'fake-api-key',
			subdomain: 'acme',
		},
	};

	let mock: nock.Scope;

	beforeAll(() => {
		mock = nock('https://acme.agilecrm.com/dev/api').matchHeader(
			'authorization',
			`Basic ${Buffer.from('nathan@example.com:fake-api-key').toString('base64')}`,
		);
		mock.get(`/contacts/${contactId}`).reply(200, contact);
		mock.delete(`/contacts/${contactId}`).reply(200, {});
		mock
			.post('/filters/filter/dynamic-filter', {
				filterJson: '{"contact_type":"PERSON"}',
				page_size: '2',
			})
			.reply(200, [contact]);
		mock
			.post('/contacts', {
				properties: [{ type: 'SYSTEM', name: 'first_name', value: 'Nathan' }],
			})
			.reply(200, contact);
		mock
			.put('/contacts/edit-properties', {
				id: contactId,
				properties: [{ type: 'SYSTEM', name: 'first_name', value: 'Nathan' }],
			})
			.reply(200, contact);
		mock.put('/contacts/edit/lead-score', { id: contactId, lead_score: 10 }).reply(200, contact);
		mock.put('/contacts/edit/tags', { id: contactId, tags: ['lead'] }).reply(200, contact);
		mock.put('/contacts/edit/add-star', { id: contactId, star_value: 3 }).reply(200, contact);
		mock.get(`/contacts/${companyId}`).reply(200, company);
		mock.get(`/opportunity/${dealId}`).reply(200, deal);
		mock.delete(`/opportunity/${dealId}`).reply(200, {});
		mock.get('/opportunity').query({ page_size: 2 }).reply(200, [deal]);
		mock.post('/opportunity', { name: 'Renewal', expected_value: 500 }).reply(200, deal);
		mock
			.put('/opportunity/partial-update', { id: 5649050225344512, probability: 50 })
			.reply(200, deal);
	});

	afterAll(() => {
		expect(mock.pendingMocks()).toEqual([]);
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
	});
});
