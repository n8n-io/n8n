import nock from 'nock';

import { testWorkflows } from '@test/nodes/Helpers';

describe('Test DiscordV2, message => react', () => {
	nock('https://discord.com/api/v10')
		.put('/channels/1168516240332034067/messages/1168777380144369718/reactions/%F0%9F%98%80/@me')
		.reply(200, { success: true });

	const workflows = ['nodes/Discord/test/v2/node/message/react.workflow.json'];
	testWorkflows(workflows);
});
