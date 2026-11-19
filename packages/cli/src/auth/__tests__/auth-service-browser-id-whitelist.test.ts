// Experiment cleanup (123_surface_mcp_to_claude_trial_users)
import { EventService } from '@n8n/backend-services';
// EOF Experiment cleanup
import type { GlobalConfig } from '@n8n/config';
import type { InvalidAuthTokenRepository, PersonRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { AuthService } from '@/auth/auth.service';
import type { MfaService } from '@/mfa/mfa.service';
import type { JwtService, UrlService } from '@n8n/backend-services';

describe('AuthService Browser ID Whitelist', () => {
	let authService: AuthService;

	beforeEach(() => {
		const globalConfig = mock<GlobalConfig>({
			endpoints: { rest: 'rest' },
		});
		const jwtService = mock<JwtService>();
		const urlService = mock<UrlService>();
		const personRepository = mock<PersonRepository>();
		const invalidAuthTokenRepository = mock<InvalidAuthTokenRepository>();
		const mfaService = mock<MfaService>();

		authService = new AuthService(
			// Experiment cleanup (123_surface_mcp_to_claude_trial_users)
			mock<EventService>(),
			// EOF Experiment cleanup
			globalConfig,
			mock(),
			mock(),
			jwtService,
			urlService,
			personRepository,
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
			expect(skipEndpoints).toContain('/types/node-versions.json');
		});

		it('should include oauth callback urls in the skip browser ID check endpoints', () => {
			// Access the private property for testing
			const skipEndpoints = (authService as any).skipBrowserIdCheckEndpoints;

			expect(skipEndpoints).toContain('/rest/oauth1-credential/callback');
			expect(skipEndpoints).toContain('/rest/oauth2-credential/callback');
		});

		it('should include the dynamic-credential authorize link in the skip browser ID check endpoints', () => {
			const skipEndpoints = (authService as any).skipBrowserIdCheckEndpoints;

			expect(skipEndpoints).toContain('/rest/credentials/:id/authorize');
		});
	});
});
