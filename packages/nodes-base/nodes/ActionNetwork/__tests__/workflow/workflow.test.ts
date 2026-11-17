import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('ActionNetwork > Workflows', () => {
	const credentials = {
		actionNetworkApi: {
			apiKey: 'test-api-key',
		},
	};

	const eventId = 'a1b2c3d4-0001-4e5f-8a9b-0c1d2e3f4a01';
	const petitionId = 'd4e5f6a7-0001-4b8c-9d2e-3f4a5b6c7d01';
	const tagId = 'f6a7b8c9-0001-4d0e-9f4a-5b6c7d8e9f01';
	const listing = { perPage: 25, page: 1 };

	beforeAll(() => {
		const mock = nock('https://actionnetwork.org/api/v2').matchHeader(
			'OSDI-API-Token',
			'test-api-key',
		);
		mock.post(`/events/${eventId}/attendances`).reply(200, { id: 'attendance-created' });
		mock
			.get(`/events/${eventId}/attendances/b2c3d4e5-0001-4f6a-9b0c-1d2e3f4a5b01`)
			.reply(200, { id: 'attendance-get' });
		mock
			.get(`/events/${eventId}/attendances`)
			.query(listing)
			.reply(200, { _embedded: { 'osdi:attendances': [{ id: 'attendance-list' }] } });
		mock.post('/events').reply(200, { id: 'event-created' });
		mock.get('/events/a1b2c3d4-0002-4e5f-8a9b-0c1d2e3f4a02').reply(200, { id: 'event-get' });
		mock
			.get('/events')
			.query(listing)
			.reply(200, { _embedded: { 'osdi:events': [{ id: 'event-list' }] } });
		mock.post('/people').reply(200, { id: 'person-created' });
		mock.get('/people/c3d4e5f6-0001-4a7b-8c1d-2e3f4a5b6c01').reply(200, { id: 'person-get' });
		mock
			.get('/people')
			.query(listing)
			.reply(200, { _embedded: { 'osdi:people': [{ id: 'person-list' }] } });
		mock
			.put('/people/c3d4e5f6-0002-4a7b-8c1d-2e3f4a5b6c02', { given_name: 'Ada' })
			.reply(200, { id: 'person-updated' });
		mock.post('/petitions').reply(200, { id: 'petition-created' });
		mock.get(`/petitions/${petitionId}`).reply(200, { id: 'petition-get' });
		mock
			.get('/petitions')
			.query(listing)
			.reply(200, { _embedded: { 'osdi:petitions': [{ id: 'petition-list' }] } });
		mock
			.put('/petitions/d4e5f6a7-0002-4b8c-9d2e-3f4a5b6c7d02', { petition_text: 'Updated' })
			.reply(200, { id: 'petition-updated' });
		mock.post(`/petitions/${petitionId}/signatures`).reply(200, { id: 'signature-created' });
		mock
			.get(`/petitions/${petitionId}/signatures/e5f6a7b8-0001-4c9d-8e3f-4a5b6c7d8e01`)
			.reply(200, { id: 'signature-get' });
		mock
			.get(`/petitions/${petitionId}/signatures`)
			.query(listing)
			.reply(200, { _embedded: { 'osdi:signatures': [{ id: 'signature-list' }] } });
		mock
			.put(`/petitions/${petitionId}/signatures/e5f6a7b8-0002-4c9d-8e3f-4a5b6c7d8e02`, {
				comments: 'Done',
			})
			.reply(200, { id: 'signature-updated' });
		mock.post('/tags', { name: 'volunteer' }).reply(200, { id: 'tag-created' });
		mock.get(`/tags/${tagId}`).reply(200, { id: 'tag-get' });
		mock
			.get('/tags')
			.query(listing)
			.reply(200, { _embedded: { 'osdi:tags': [{ id: 'tag-list' }] } });
		mock.post(`/tags/${tagId}/taggings`).reply(200, { id: 'tagging-created' });
		mock
			.delete(`/tags/${tagId}/taggings/a7b8c9d0-0001-4e1f-8a5b-6c7d8e9f0a01`)
			.reply(200, { notice: 'deleted' });
	});

	new NodeTestHarness().setupTests({
		credentials,
		customAssertions: () => expect(nock.isDone()).toBe(true),
	});
});
