import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const collectionId = '3f9a1c2e-8b7d-4e6f-9a01-2b3c4d5e6f70';
const groupId = '7c2d4e6f-1a3b-4c5d-8e9f-0a1b2c3d4e5f';
const memberId = '5e6f7a8b-9c0d-4e1f-a2b3-c4d5e6f7a8b9';
const collection = { id: collectionId, object: 'collection' };
const group = { id: groupId, name: 'Support' };
const member = { id: memberId, email: 'nathan@example.com' };

const credentials = (environment: string) => ({
	bitwardenApi: {
		clientId: 'organization.fake-client-id',
		clientSecret: 'fake-client-secret',
		environment,
		domain: 'https://vault.example.com',
	},
});

describe('Bitwarden > Workflows', () => {
	describe('cloud-hosted', () => {
		beforeAll(() => {
			nock('https://identity.bitwarden.com')
				.post('/connect/token')
				.times(19)
				.reply(200, { access_token: 'fake-access-token' });

			const api = nock('https://api.bitwarden.com/public').matchHeader(
				'authorization',
				'Bearer fake-access-token',
			);
			api.get(`/collections/${collectionId}`).reply(200, collection);
			api.get('/collections').reply(200, { data: [collection] });
			api.put(`/collections/${collectionId}`, { externalId: 'ext-7' }).reply(200, collection);
			api.delete(`/collections/${collectionId}`).reply(200, {});
			api.get('/events').reply(200, { data: [{ object: 'event', type: 1000 }] });
			api.post('/groups', { name: 'Support', AccessAll: false }).reply(200, group);
			api.get(`/groups/${groupId}`).reply(200, group);
			api.get('/groups').reply(200, { data: [group] });
			api.get(`/groups/${groupId}/member-ids`).reply(200, [memberId]);
			api
				.put(`/groups/${groupId}`, { name: 'Support EU', AccessAll: false })
				.reply(200, { ...group, name: 'Support EU' });
			api.put(`/groups/${groupId}/member-ids`, { memberIds: [memberId] }).reply(200, {});
			api.delete(`/groups/${groupId}`).reply(200, {});
			api
				.post('/members/', { email: 'nathan@example.com', type: 2, AccessAll: false })
				.reply(200, member);
			api.get(`/members/${memberId}`).reply(200, member);
			api.get('/members').reply(200, { data: [member] });
			api.get(`/members/${memberId}/group-ids`).reply(200, [groupId]);
			api.put(`/members/${memberId}`, { externalId: 'ext-9' }).reply(200, member);
			api.put(`/members/${memberId}/group-ids`, { groupIds: [groupId] }).reply(200, {});
			api.delete(`/members/${memberId}`).reply(200, {});
		});

		new NodeTestHarness().setupTests({
			credentials: credentials('cloudHosted'),
			workflowFiles: ['requests.workflow.json'],
			customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
		});
	});

	describe('self-hosted', () => {
		beforeAll(() => {
			const server = nock('https://vault.example.com');
			server.post('/identity/connect/token').reply(200, { access_token: 'fake-access-token' });
			server
				.get(`/api/public/collections/${collectionId}`)
				.matchHeader('authorization', 'Bearer fake-access-token')
				.reply(200, collection);
		});

		new NodeTestHarness().setupTests({
			credentials: credentials('selfHosted'),
			workflowFiles: ['self-hosted.workflow.json'],
			customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
		});
	});
});
