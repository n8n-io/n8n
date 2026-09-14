import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Test DiscordV2, member => ban', () => {
	beforeEach(() => {
		nock('https://discord.com/api/v10', {
			reqheaders: {
				'x-audit-log-reason': 'Suspicious%20or%20spam%20account',
			},
		})
			.persist()
			.put('/guilds/1168516062791340136/bans/470936827994570762', {
				delete_message_seconds: 86400,
			})
			.reply(200, { success: true });
	});

	afterEach(() => {
		nock.cleanAll();
	});

	new NodeTestHarness().setupTests({
		workflowFiles: ['ban.workflow.json'],
	});
});
