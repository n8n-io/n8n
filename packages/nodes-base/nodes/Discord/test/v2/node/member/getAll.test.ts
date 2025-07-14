import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Test DiscordV2, member => getAll', () => {
	nock('https://discord.com/api/v10')
		.get('/guilds/1168516062791340136/members?limit=2')
		.reply(200, [
			{
				user: {
					id: '470936827994570762',
					username: 'michael',
					avatar: null,
					discriminator: '0',
					public_flags: 0,
					premium_type: 0,
					flags: 0,
					banner: null,
					accent_color: null,
					global_name: 'Michael',
					avatar_decoration_data: null,
					banner_color: null,
				},
				roles: [],
			},
			{
				user: {
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
				roles: ['1168518368526077992'],
			},
		]);

	new NodeTestHarness().setupTests({
		workflowFiles: ['getAll.workflow.json'],
	});
});
