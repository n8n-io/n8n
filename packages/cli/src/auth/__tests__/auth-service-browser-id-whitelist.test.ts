import type { GlobalConfig } from '@n8n/config';
import type { InvalidAuthTokenRepository, UserRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

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

		it('should skip the browser ID check for project file downloads', () => {
			// The endpoint string the auth middleware builds substitutes the
			// controller prefix's :projectId from req.baseUrl but leaves the route
			// path's :fileId as-is, so the pattern has to match that mixed shape.
			const endpoint = '/rest/projects/f5xoCo9IAI8CGGlf/files/:fileId/content';

			expect((authService as any).endpointSkipsBrowserIdCheck(endpoint)).toBe(true);
		});

		it('should not skip the browser ID check for other project file routes', () => {
			// Only the byte-streaming download is browser-driven; list, upload,
			// rename and delete all go through the API client, which sends the header.
			const others = [
				'/rest/projects/f5xoCo9IAI8CGGlf/files',
				'/rest/projects/f5xoCo9IAI8CGGlf/files/:fileId',
			];

			for (const endpoint of others) {
				expect((authService as any).endpointSkipsBrowserIdCheck(endpoint)).toBe(false);
			}
		});
	});

	describe('validateBrowserId for project file downloads', () => {
		const contentEndpoint = '/rest/projects/f5xoCo9IAI8CGGlf/files/:fileId/content';
		// A browser navigation carries the auth cookie but no browser-id header.
		const jwtPayload = { browserId: 'hashed-browser-id' };

		it('accepts a GET with no browser-id header', () => {
			expect(() =>
				(authService as any).validateBrowserId(jwtPayload, undefined, contentEndpoint, 'GET'),
			).not.toThrow();
		});

		it('still rejects a non-GET on the same path', () => {
			// The skip is GET-only, so the exemption can't be reused to mutate.
			expect(() =>
				(authService as any).validateBrowserId(jwtPayload, undefined, contentEndpoint, 'POST'),
			).toThrow('Unauthorized');
		});

		it('still rejects a GET with no browser-id header on the list route', () => {
			expect(() =>
				(authService as any).validateBrowserId(
					jwtPayload,
					undefined,
					'/rest/projects/f5xoCo9IAI8CGGlf/files',
					'GET',
				),
			).toThrow('Unauthorized');
		});
	});
});
