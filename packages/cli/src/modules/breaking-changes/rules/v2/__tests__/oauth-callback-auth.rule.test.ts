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

		it.each(['true', 'false', '1', '0'])(
			'should not be affected when N8N_SKIP_AUTH_ON_OAUTH_CALLBACK is set to %s',
			async (value) => {
				process.env.N8N_SKIP_AUTH_ON_OAUTH_CALLBACK = value;

				const result = await rule.detect();

				expect(result.isAffected).toBe(false);
				expect(result.instanceIssues).toHaveLength(0);
				expect(result.recommendations).toHaveLength(0);
			},
		);
	});
});
