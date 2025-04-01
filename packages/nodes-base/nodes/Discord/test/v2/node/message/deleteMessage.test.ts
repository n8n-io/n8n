import nock from 'nock';

import { testWorkflows } from '@test/nodes/Helpers';

describe('Test DiscordV2, message => deleteMessage', () => {
	nock('https://discord.com/api/v10')
		.delete('/channels/1168516240332034067/messages/1168776343194972210')
		.reply(200, { success: true });

	const workflows = ['nodes/Discord/test/v2/node/message/deleteMessage.workflow.json'];
	testWorkflows(workflows);
});
