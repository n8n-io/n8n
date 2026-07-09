import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Test DiscordV2, message => react', () => {
	nock('https://discord.com/api/v10')
		.put('/channels/1168516240332034067/messages/1168777380144369718/reactions/%F0%9F%98%80/@me')
		.reply(200, { success: true });

	new NodeTestHarness().setupTests({
		workflowFiles: ['react.workflow.json'],
	});
});
