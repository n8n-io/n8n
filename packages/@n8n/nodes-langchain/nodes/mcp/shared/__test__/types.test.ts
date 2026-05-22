import { isMcpOAuth2Authentication } from '../types';

describe('isMcpOAuth2Authentication', () => {
	it('returns true for the base mcpOAuth2Api credential', () => {
		expect(isMcpOAuth2Authentication('mcpOAuth2Api')).toBe(true);
	});

	it('returns true for service-specific MCP OAuth2 credential names', () => {
		expect(isMcpOAuth2Authentication('notionMcpOAuth2Api')).toBe(true);
		expect(isMcpOAuth2Authentication('linearMcpOAuth2Api')).toBe(true);
	});

	it('returns true for existing n8n OAuth2 credential names', () => {
		expect(isMcpOAuth2Authentication('googleCalendarOAuth2Api')).toBe(true);
		expect(isMcpOAuth2Authentication('googleDriveOAuth2Api')).toBe(true);
		expect(isMcpOAuth2Authentication('gmailOAuth2')).toBe(true);
		expect(isMcpOAuth2Authentication('jiraSoftwareCloudOAuth2Api')).toBe(true);
	});

	it('returns false for non-OAuth2 authentication types', () => {
		expect(isMcpOAuth2Authentication('none')).toBe(false);
		expect(isMcpOAuth2Authentication('headerAuth')).toBe(false);
		expect(isMcpOAuth2Authentication('bearerAuth')).toBe(false);
		expect(isMcpOAuth2Authentication('multipleHeadersAuth')).toBe(false);
	});

	it('returns false for unrelated credential names that do not contain OAuth2', () => {
		expect(isMcpOAuth2Authentication('slackApi')).toBe(false);
		expect(isMcpOAuth2Authentication('githubApi')).toBe(false);
		expect(isMcpOAuth2Authentication('')).toBe(false);
	});
});
