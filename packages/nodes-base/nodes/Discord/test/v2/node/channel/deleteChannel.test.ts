import nock from 'nock';

import { testWorkflows } from '@test/nodes/Helpers';

describe('Test DiscordV2, channel => deleteChannel', () => {
	nock('https://discord.com/api/v10')
		.delete('/channels/1168528323006181417')
		.reply(200, { success: true });

	const workflows = ['nodes/Discord/test/v2/node/channel/deleteChannel.workflow.json'];
	testWorkflows(workflows);
});
