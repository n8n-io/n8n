import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Test DiscordV2, member => kick', () => {
	// Uses the "Other" reason path, asserting the custom reason reaches the audit log header
	beforeEach(() => {
		nock('https://discord.com/api/v10', {
			reqheaders: {
				'x-audit-log-reason': 'Posting%20phishing%20links',
			},
		})
			.persist()
			.delete('/guilds/1168516062791340136/members/470936827994570762')
			.reply(200, { success: true });
	});

	afterEach(() => {
		nock.cleanAll();
	});

	new NodeTestHarness().setupTests({
		workflowFiles: ['kick.workflow.json'],
	});
});
