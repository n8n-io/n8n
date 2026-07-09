import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Test DiscordV2, message => deleteMessage', () => {
	nock('https://discord.com/api/v10')
		.delete('/channels/1168516240332034067/messages/1168776343194972210')
		.reply(200, { success: true });

	new NodeTestHarness().setupTests({
		workflowFiles: ['deleteMessage.workflow.json'],
	});
});
