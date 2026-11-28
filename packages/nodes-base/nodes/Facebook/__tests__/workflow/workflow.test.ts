import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Facebook Graph API > Workflows', () => {
	const credentials = {
		facebookGraphApi: {
			accessToken: 'fake-token',
		},
	};

	describe('Run workflow', () => {
		beforeAll(() => {
			nock('https://graph.facebook.com')
				.get('/v23.0/me')
				.query({ access_token: 'fake-token' })
				.reply(200, { id: '1029384756', name: 'Nathan' });
			nock('https://graph.facebook.com')
				.get('/v23.0/act_1234567890/campaigns')
				.query({ access_token: 'fake-token' })
				.reply(200, { data: [{ id: '120210000000000001' }] });
			nock('https://graph.facebook.com')
				.get('/v23.0/page_json')
				.query({ access_token: 'fake-token', limit: '5' })
				.reply(200, { id: 'page_json' });
			nock('https://graph.facebook.com')
				.get('/v23.0/page_expression')
				.query({ access_token: 'fake-token', fields: 'id,name' })
				.reply(200, { id: 'page_expression' });
			nock('https://graph-video.facebook.com')
				.post('/v23.0/108824017345866/videos')
				.query({ access_token: 'fake-token' })
				.reply(200, { id: '987654321012345' });
		});

		new NodeTestHarness().setupTests({
			credentials,
			customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
		});
	});
});
