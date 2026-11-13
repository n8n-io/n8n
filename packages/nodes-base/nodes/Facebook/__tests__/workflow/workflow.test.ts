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
			nock('https://graph-video.facebook.com')
				.post('/v23.0/108824017345866/videos')
				.query({ access_token: 'fake-token' })
				.reply(200, { id: '987654321012345' });
		});

		new NodeTestHarness().setupTests({ credentials });
	});
});
