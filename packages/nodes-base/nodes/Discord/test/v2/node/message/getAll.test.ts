import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Test DiscordV2, message => getAll', () => {
	nock('https://discord.com/api/v10')
		.get('/channels/1168516240332034067/messages?limit=1')
		.reply(200, [
			{
				id: '1168784010269433998',
				type: 0,
				content: 'msg 4',
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
				attachments: [],
				embeds: [
					{
						type: 'rich',
						title: 'Some Title',
						description: 'description',
						color: 2112935,
						timestamp: '2023-10-30T22:00:00+00:00',
						author: {
							name: 'Me',
						},
					},
				],
				mentions: [],
				mention_roles: [],
				pinned: false,
				mention_everyone: false,
				tts: false,
				timestamp: '2023-10-31T05:30:23.005000+00:00',
				edited_timestamp: null,
				flags: 0,
				components: [],
			},
		]);

	new NodeTestHarness().setupTests({
		workflowFiles: ['getAll.workflow.json'],
	});
});
