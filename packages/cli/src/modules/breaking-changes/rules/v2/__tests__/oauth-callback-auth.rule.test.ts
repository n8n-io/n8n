import { OAuthCallbackAuthRule } from '../oauth-callback-auth.rule';

describe('OAuthCallbackAuthRule', () => {
	let rule: OAuthCallbackAuthRule;
	const originalEnv = process.env;

	beforeEach(() => {
		rule = new OAuthCallbackAuthRule();
		process.env = { ...originalEnv };
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	describe('detect()', () => {
		it('should be affected when N8N_SKIP_AUTH_ON_OAUTH_CALLBACK is not set', async () => {
			delete process.env.N8N_SKIP_AUTH_ON_OAUTH_CALLBACK;

			const result = await rule.detect();

			expect(result.isAffected).toBe(true);
			expect(result.instanceIssues).toHaveLength(1);
			expect(result.instanceIssues[0].title).toBe('OAuth callback authentication now required');
		});

		it('should be affected with info level when N8N_SKIP_AUTH_ON_OAUTH_CALLBACK is true', async () => {
			process.env.N8N_SKIP_AUTH_ON_OAUTH_CALLBACK = 'true';

			const result = await rule.detect();

			expect(result.isAffected).toBe(true);
			expect(result.instanceIssues).toHaveLength(1);
			expect(result.recommendations).toHaveLength(0);
		});
	});
});
