import nock from 'nock';

import { testWorkflows } from '@test/nodes/Helpers';

describe('Test DiscordV2, channel => create', () => {
	nock('https://discord.com/api/v10')
		.post('/guilds/1168516062791340136/channels', { name: 'third', type: '0' })
		.reply(200, {
			id: '1168528323006181417',
			type: 0,
			last_message_id: null,
			flags: 0,
			guild_id: '1168516062791340136',
			name: 'third',
			parent_id: null,
			rate_limit_per_user: 0,
			topic: null,
			position: 3,
			permission_overwrites: [],
			nsfw: false,
		});

	const workflows = ['nodes/Discord/test/v2/node/channel/create.workflow.json'];
	testWorkflows(workflows);
});
