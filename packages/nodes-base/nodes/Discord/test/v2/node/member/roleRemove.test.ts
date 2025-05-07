import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Test DiscordV2, member => roleRemove', () => {
	nock('https://discord.com/api/v10')
		.persist()
		.delete(/\/guilds\/1168516062791340136\/members\/470936827994570762\/roles\/\d+/)
		.reply(200, { success: true });

	new NodeTestHarness().setupTests({
		workflowFiles: ['roleRemove.workflow.json'],
	});
});
