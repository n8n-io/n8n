import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const page = { id: '123456', title: 'Release plan', status: 'current' };
const label = { id: '789012', name: 'release', prefix: 'global' };
const comment = { id: '456789', status: 'current', title: 'Re: Release plan' };
const attachment = { id: 'att345678', title: 'notes.txt', mediaType: 'text/plain' };
const space = { id: '98765', key: 'DOCS', name: 'Documentation' };

describe('Confluence > Workflows', () => {
	const credentials = {
		confluenceCloudOAuth2Api: {
			grantType: 'authorizationCode',
			authUrl: 'https://auth.atlassian.com/authorize',
			accessTokenUrl: 'https://auth.atlassian.com/oauth/token',
			clientId: 'CLIENTID',
			clientSecret: 'CLIENTSECRET',
			scope: '',
			authentication: 'body',
			oauthTokenData: {
				access_token: 'ACCESSTOKEN',
				refresh_token: 'REFRESHTOKEN',
				token_type: 'Bearer',
				expires_in: 3600,
			},
		},
	};

	describe('Run workflow', () => {
		beforeAll(() => {
			const mock = nock(
				'https://api.atlassian.com/ex/confluence/a1b2c3d4-1234-5678-9abc-def012345678/wiki',
			);
			mock
				.get('/api/v2/pages/123456')
				.query({ 'body-format': 'storage' })
				.times(2)
				.reply(200, {
					...page,
					version: { number: 3 },
					body: { storage: { value: '<p>Plan</p>', representation: 'storage' } },
				});
			mock
				.get('/api/v2/pages/123456/descendants')
				.query(true)
				.reply(200, { results: [], _links: {} });
			mock
				.put('/api/v2/pages/123456', (body: { title?: string }) => body.title === 'Release plan v2')
				.reply(200, { ...page, title: 'Release plan v2', version: { number: 4 } });
			mock.delete('/api/v2/pages/123456').reply(204);
			mock.post('/rest/api/content/123456/label').reply(200, { results: [label] });
			mock.delete('/rest/api/content/123456/label').query({ name: 'release' }).reply(204);
			mock
				.get('/api/v2/pages/123456/labels')
				.query(true)
				.reply(200, { results: [label], _links: {} });
			mock
				.get('/api/v2/pages/123456/footer-comments')
				.query(true)
				.reply(200, { results: [comment], _links: {} });
			mock.delete('/api/v2/footer-comments/456789').reply(204);
			mock
				.get('/api/v2/labels/789012/pages')
				.query(true)
				.reply(200, { results: [page], _links: {} });
			mock
				.get('/api/v2/pages/123456/attachments')
				.query(true)
				.reply(200, { results: [attachment], _links: {} });
			mock.delete('/api/v2/attachments/att345678').reply(204);
			mock.put('/rest/api/content/123456/child/attachment').reply(200, { results: [attachment] });
			mock.get('/api/v2/spaces/98765').reply(200, space);
		});

		afterAll(() => {
			expect(nock.isDone()).toBe(true);
		});

		new NodeTestHarness().setupTests({ credentials });
	});
});
