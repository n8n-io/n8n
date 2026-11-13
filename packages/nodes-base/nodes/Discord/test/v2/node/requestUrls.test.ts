import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Test DiscordV2, request URLs', () => {
	const credentials = {
		discordBotApi: {
			botToken: 'bot-token',
		},
		discordWebhookApi: {
			webhookUri:
				'https://discord.com/api/webhooks/1153265494955135077/webhook-token?thread_id=1168516240332034067',
		},
	};

	nock('https://discord.com/api/v10')
		.post('/users/@me/channels', { recipient_id: '470936827994570762' })
		.reply(200, { id: '1168790000000000001' })
		.post('/channels/1168790000000000001/messages', { content: 'Hello' })
		.reply(200, { id: '1168784010269433999', channel_id: '1168790000000000001', content: 'Hello' });

	nock('https://discord.com')
		.post('/api/webhooks/1153265494955135077/webhook-token')
		.query({ thread_id: '1168516240332034067', wait: 'true' })
		.reply(200, {
			id: '1168768986385748000',
			channel_id: '1168516240332034067',
			content: 'Thread message',
		});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requestUrls.workflow.json'],
		customAssertions: () => expect(nock.isDone()).toBe(true),
	});
});
