import nock from 'nock';

import { testWorkflows } from '@test/nodes/Helpers';

describe('Test DiscordV2, channel => get', () => {
	nock('https://discord.com/api/v10')
		.persist()
		.get('/users/@me/guilds')
		.reply(200, [{ id: '1168516062791340136' }])
		.get('/channels/1168516240332034067')
		.reply(200, {
			id: '1168516240332034067',
			type: 0,
			last_message_id: null,
			flags: 0,
			guild_id: '1168516062791340136',
			name: 'first',
			parent_id: '1168516063340789831',
			rate_limit_per_user: 0,
			topic: null,
			position: 1,
			permission_overwrites: [],
			nsfw: false,
		});

	const workflows = ['nodes/Discord/test/v2/node/channel/get.workflow.json'];
	testWorkflows(workflows);
});
