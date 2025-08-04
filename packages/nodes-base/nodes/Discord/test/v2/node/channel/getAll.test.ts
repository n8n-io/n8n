import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Test DiscordV2, channel => getAll', () => {
	nock('https://discord.com/api/v10')
		.get('/guilds/1168516062791340136/channels')
		.reply(200, [
			{
				id: '1168516063340789831',
				type: 4,
				flags: 0,
				guild_id: '1168516062791340136',
				name: 'Text Channels',
				parent_id: null,
				position: 0,
				permission_overwrites: [],
			},
			{
				id: '1168516063340789832',
				type: 4,
				flags: 0,
				guild_id: '1168516062791340136',
				name: 'Voice Channels',
				parent_id: null,
				position: 0,
				permission_overwrites: [],
			},
			{
				id: '1168516063340789833',
				type: 0,
				last_message_id: '1168518371239792720',
				flags: 0,
				guild_id: '1168516062791340136',
				name: 'general',
				parent_id: '1168516063340789831',
				rate_limit_per_user: 0,
				topic: null,
				position: 0,
				permission_overwrites: [],
				nsfw: false,
				icon_emoji: {
					id: null,
					name: '👋',
				},
				theme_color: null,
			},
			{
				id: '1168516063340789834',
				type: 2,
				last_message_id: null,
				flags: 0,
				guild_id: '1168516062791340136',
				name: 'General',
				parent_id: '1168516063340789832',
				rate_limit_per_user: 0,
				bitrate: 64000,
				user_limit: 0,
				rtc_region: null,
				position: 0,
				permission_overwrites: [],
				nsfw: false,
				icon_emoji: {
					id: null,
					name: '🎙️',
				},
				theme_color: null,
			},
			{
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
			},
			{
				id: '1168516269079793766',
				type: 0,
				last_message_id: null,
				flags: 0,
				guild_id: '1168516062791340136',
				name: 'second',
				parent_id: '1168516063340789831',
				rate_limit_per_user: 0,
				topic: null,
				position: 2,
				permission_overwrites: [],
				nsfw: false,
			},
		]);

	new NodeTestHarness().setupTests({
		workflowFiles: ['getAll.workflow.json'],
	});
});
