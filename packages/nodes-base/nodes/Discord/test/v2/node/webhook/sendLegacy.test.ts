import nock from 'nock';

import { testWorkflows } from '@test/nodes/Helpers';

describe('Test DiscordV2, webhook => sendLegacy', () => {
	nock('https://discord.com')
		.post('/webhook?wait=true')
		.reply(200, {
			id: '1168768986385747999',
			type: 0,
			content: 'TEST Message',
			channel_id: '1074646335082479626',
			author: {
				id: '1153265494955135077',
				username: 'TEST_USER',
				avatar: null,
				discriminator: '0000',
				public_flags: 0,
				flags: 0,
				bot: true,
				global_name: null,
			},
			attachments: [],
			embeds: [
				{
					type: 'rich',
					description: 'some description',
					color: 10930459,
					timestamp: '2023-10-17T21:00:00+00:00',
					author: {
						name: 'Michael',
					},
				},
			],
			mentions: [],
			mention_roles: [],
			pinned: false,
			mention_everyone: false,
			tts: true,
			timestamp: '2023-10-31T04:30:41.032000+00:00',
			edited_timestamp: null,
			flags: 4096,
			components: [],
			webhook_id: '1153265494955135077',
		});

	const workflows = ['nodes/Discord/test/v2/node/webhook/sendLegacy.workflow.json'];
	testWorkflows(workflows);
});
