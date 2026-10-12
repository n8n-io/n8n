import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Test DiscordV2, member => unban', () => {
	beforeEach(() => {
		nock('https://discord.com/api/v10')
			.persist()
			.delete('/guilds/1168516062791340136/bans/470936827994570762')
			.reply(200, { success: true });
	});

	afterEach(() => {
		nock.cleanAll();
	});

	new NodeTestHarness().setupTests({
		workflowFiles: ['unban.workflow.json'],
	});
});
