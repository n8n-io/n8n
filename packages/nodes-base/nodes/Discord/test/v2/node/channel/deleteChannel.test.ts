import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Test DiscordV2, channel => deleteChannel', () => {
	nock('https://discord.com/api/v10')
		.delete('/channels/1168528323006181417')
		.reply(200, { success: true });

	new NodeTestHarness().setupTests({
		workflowFiles: ['deleteChannel.workflow.json'],
	});
});
