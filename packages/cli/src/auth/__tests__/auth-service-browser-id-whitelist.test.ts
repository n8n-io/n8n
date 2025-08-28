import type { GlobalConfig } from '@n8n/config';
import type { InvalidAuthTokenRepository, UserRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import { AuthService } from '@/auth/auth.service';
import type { MfaService } from '@/mfa/mfa.service';
import type { JwtService } from '@/services/jwt.service';
import type { UrlService } from '@/services/url.service';

describe('AuthService Browser ID Whitelist', () => {
	let authService: AuthService;

	beforeEach(() => {
		const globalConfig = mock<GlobalConfig>({
			endpoints: { rest: 'rest' },
		});
		const jwtService = mock<JwtService>();
		const urlService = mock<UrlService>();
		const userRepository = mock<UserRepository>();
		const invalidAuthTokenRepository = mock<InvalidAuthTokenRepository>();
		const mfaService = mock<MfaService>();

		authService = new AuthService(
			globalConfig,
			mock(),
			mock(),
			jwtService,
			urlService,
			userRepository,
			invalidAuthTokenRepository,
			mfaService,
		);
	});

	describe('skipBrowserIdCheckEndpoints', () => {
		it('should include type files in the skip browser ID check endpoints', () => {
			// Access the private property for testing
			const skipEndpoints = (authService as any).skipBrowserIdCheckEndpoints;

			expect(skipEndpoints).toContain('/types/nodes.json');
			expect(skipEndpoints).toContain('/types/credentials.json');
		});

		it('should include oauth callback urls in the skip browser ID check endpoints', () => {
			// Access the private property for testing
			const skipEndpoints = (authService as any).skipBrowserIdCheckEndpoints;

			expect(skipEndpoints).toContain('/rest/oauth1-credential/callback');
			expect(skipEndpoints).toContain('/rest/oauth2-credential/callback');
		});
	});
});
