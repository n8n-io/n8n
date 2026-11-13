import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const entry = { fields: { name: 'Nyan Cat' } };
const asset = { fields: { title: 'Nyan Cat image' } };

describe('Contentful > Workflows', () => {
	const credentials = {
		contentfulApi: {
			spaceId: 'cfexampleapi',
			ContentDeliveryaccessToken: 'fake-delivery-token',
			ContentPreviewaccessToken: 'fake-preview-token',
		},
	};

	beforeAll(() => {
		const delivery = { access_token: 'fake-delivery-token' };
		const cdn = nock('https://cdn.contentful.com');
		cdn.get('/spaces/cfexampleapi').query(delivery).reply(200, { name: 'Acme Corp' });
		cdn
			.get('/spaces/cfexampleapi/environments/master/content_types/cat')
			.query(delivery)
			.reply(200, { fields: [{ id: 'name' }] });
		cdn
			.get('/spaces/cfexampleapi/environments/master/entries/nyancat')
			.query(delivery)
			.reply(200, entry);
		cdn
			.get('/spaces/cfexampleapi/environments/master/entries')
			.query({ ...delivery, limit: 1 })
			.reply(200, { items: [entry] });
		cdn
			.get('/spaces/cfexampleapi/environments/master/entries')
			.query({ ...delivery, limit: 100, skip: 0 })
			.reply(200, { items: [entry], total: 1 });
		cdn
			.get('/spaces/cfexampleapi/environments/master/assets')
			.query({ ...delivery, limit: 1 })
			.reply(200, { items: [asset] });
		cdn
			.get('/spaces/cfexampleapi/environments/master/locales')
			.query({ ...delivery, limit: 1 })
			.reply(200, { items: [{ code: 'en-US' }] });

		nock('https://preview.contentful.com')
			.get('/spaces/cfexampleapi/environments/master/entries/happycat')
			.query({ access_token: 'fake-preview-token' })
			.reply(200, { fields: { name: 'Happy Cat' } });
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
