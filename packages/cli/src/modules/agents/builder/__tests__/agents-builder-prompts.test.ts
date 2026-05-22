import { INTEGRATIONS_SECTION } from '../agents-builder-prompts';

describe('agents builder integrations prompt', () => {
	it('does not tell the builder to prefer Slack OAuth credentials for chat integrations', () => {
		expect(INTEGRATIONS_SECTION).not.toContain('slackOAuth2Api');
		expect(INTEGRATIONS_SECTION).not.toContain('prefer the OAuth variant');
	});
});
