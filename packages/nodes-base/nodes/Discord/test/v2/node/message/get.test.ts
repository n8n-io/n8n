import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Test DiscordV2, message => get', () => {
	nock('https://discord.com/api/v10')
		.get('/channels/1168516240332034067/messages/1168777380144369718')
		.reply(200, {
			id: '1168777380144369718',
			channel_id: '1168516240332034067',
			author: {
				id: '1070667629972430879',
				username: 'n8n-node-overhaul',
				avatar: null,
				discriminator: '1037',
				public_flags: 0,
				premium_type: 0,
				flags: 0,
				bot: true,
				banner: null,
				accent_color: null,
				global_name: null,
				avatar_decoration_data: null,
				banner_color: null,
			},
			content: 'msg 3',
			timestamp: '2023-10-31T05:04:02.260000+00:00',
			type: 0,
		});

	new NodeTestHarness().setupTests({
		workflowFiles: ['get.workflow.json'],
	});
});
