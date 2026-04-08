import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Test DiscordV2, channel => update', () => {
	nock('https://discord.com/api/v10').patch('/channels/1168516240332034067').reply(200, {
		id: '1168516240332034067',
		type: 0,
		last_message_id: null,
		flags: 0,
		guild_id: '1168516062791340136',
		name: 'first-channel',
		parent_id: '1168516063340789831',
		rate_limit_per_user: 30,
		topic: 'This is channel topic',
		position: 3,
		permission_overwrites: [],
		nsfw: true,
	});

	new NodeTestHarness().setupTests({
		workflowFiles: ['update.workflow.json'],
	});
});
