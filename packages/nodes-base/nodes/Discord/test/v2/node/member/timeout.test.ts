import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Test DiscordV2, member => timeout', () => {
	beforeEach(() => {
		nock('https://discord.com/api/v10', {
			reqheaders: {
				'x-audit-log-reason': 'Breaking%20server%20rules',
			},
		})
			.persist()
			.patch(
				'/guilds/1168516062791340136/members/470936827994570762',
				(body) => typeof body.communication_disabled_until === 'string',
			)
			.reply(200, { success: true });
	});

	afterEach(() => {
		nock.cleanAll();
	});

	new NodeTestHarness().setupTests({
		workflowFiles: ['timeout.workflow.json'],
	});
});
