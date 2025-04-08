import nock from 'nock';

import { testWorkflows } from '@test/nodes/Helpers';

describe('Test DiscordV2, member => roleAdd', () => {
	nock('https://discord.com/api/v10')
		.put('/guilds/1168516062791340136/members/470936827994570762/roles/1168772374540320890')
		.reply(200, { success: true });

	const workflows = ['nodes/Discord/test/v2/node/member/roleAdd.workflow.json'];
	testWorkflows(workflows);
});
