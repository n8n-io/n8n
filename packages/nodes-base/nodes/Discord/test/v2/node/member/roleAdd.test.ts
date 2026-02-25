import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Test DiscordV2, member => roleAdd', () => {
	nock('https://discord.com/api/v10')
		.put('/guilds/1168516062791340136/members/470936827994570762/roles/1168772374540320890')
		.reply(200, { success: true });

	new NodeTestHarness().setupTests({
		workflowFiles: ['roleAdd.workflow.json'],
	});
});
