import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Discord v1 > Send', () => {
	beforeAll(() => {
		const rateLimitHeaders = { 'x-ratelimit-remaining': '5', 'x-ratelimit-reset-after': '0' };
		const webhook = nock('https://discord.com/api/webhooks');
		webhook
			.post('/123/abc', {
				content: 'From JSON',
				embeds: [{ title: 'JSON embed' }],
				components: [{ type: 1, components: [] }],
			})
			.reply(200, {}, rateLimitHeaders);
		webhook
			.post('/123/abc', {
				content: 'From expression',
				embeds: [{ title: 'Expression embed' }],
				attachments: [{ id: '0', filename: 'a.png' }],
			})
			.reply(200, {}, rateLimitHeaders);
	});

	new NodeTestHarness().setupTests({
		workflowFiles: ['send.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
