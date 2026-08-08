import { LicenseState } from '@n8n/backend-common';
import { testDb } from '@n8n/backend-test-utils';
import type { AuthenticatedRequest } from '@n8n/db';
import { InvalidAuthTokenRepository, UserRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { AuthService } from '@/auth/auth.service';
import { AUTH_COOKIE_NAME } from '@/constants';
import { createOwner } from '@test-integration/db/users';

import { SessionCookieAuthStrategy } from '../session-cookie-auth.strategy';

// MFA enforcement gates inside AuthService.authenticateUserBasedOnToken call into the
// license state; stub it so any feature check returns "not licensed".
const licenseMock = mock<LicenseState>();
licenseMock.isLicensed.mockReturnValue(false);
Container.set(LicenseState, licenseMock);

const mockReqWith = (token: string): AuthenticatedRequest => {
	const req = mock<AuthenticatedRequest>({ path: '/test', method: 'GET' });
	// Override the deep-mock proxy so the cookie lookup returns the exact value.
	req.cookies = { [AUTH_COOKIE_NAME]: token };
	return req;
};

const mockReqWithoutCookie = (): AuthenticatedRequest => {
	const req = mock<AuthenticatedRequest>({ path: '/test', method: 'GET' });
	// Override the deep-mock proxy so the cookie lookup returns undefined.
	req.cookies = {};
	return req;
};

let authService: AuthService;
let authenticator: SessionCookieAuthStrategy;

describe('SessionCookieAuthStrategy', () => {
	beforeAll(async () => {
		await testDb.init();
		authService = Container.get(AuthService);
		authenticator = new SessionCookieAuthStrategy(authService);
	});

	beforeEach(async () => {
		await testDb.truncate(['User']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	it('returns null when no session cookie is present', async () => {
		expect(await authenticator.authenticate(mockReqWithoutCookie())).toBeNull();
	});

	it('returns true and populates req.user + req.tokenGrant on success', async () => {
		const owner = await createOwner();
		const token = authService.issueJWT(owner, false);
		const req = mockReqWith(token);

		expect(await authenticator.authenticate(req)).toBe(true);
		expect(req.user.id).toBe(owner.id);
		expect(req.tokenGrant?.subject.id).toBe(owner.id);
		expect(req.tokenGrant?.scopes.length).toBeGreaterThan(0);
		expect(req.tokenGrant?.apiKeyScopes?.length).toBeGreaterThan(0);
	});

	it('returns false for an invalid session cookie', async () => {
		expect(await authenticator.authenticate(mockReqWith('not-a-jwt'))).toBe(false);
	});

	it('returns false for a revoked token', async () => {
		const owner = await createOwner();
		const token = authService.issueJWT(owner, false);
		await Container.get(InvalidAuthTokenRepository).insert({
			token,
			expiresAt: new Date(Date.now() + 60_000),
		});

		expect(await authenticator.authenticate(mockReqWith(token))).toBe(false);
	});

	it('returns false for a disabled user', async () => {
		const owner = await createOwner();
		const token = authService.issueJWT(owner, false);
		await Container.get(UserRepository).update({ id: owner.id }, { disabled: true });

		expect(await authenticator.authenticate(mockReqWith(token))).toBe(false);
	});

	it('buildTokenGrant always abstains — session cookies must never satisfy audience-scoped bearer-token checks', async () => {
		expect(await authenticator.buildTokenGrant('anything')).toBeNull();
		expect(await authenticator.buildTokenGrant('')).toBeNull();

		// Even a genuinely valid session JWT, passed as a raw bearer token with an
		// audience mirroring a real scoped-token check, must still be refused.
		const owner = await createOwner();
		const validSessionJwt = authService.issueJWT(owner, false);
		expect(
			await authenticator.buildTokenGrant(validSessionJwt, { audience: 'mcp-server-api' }),
		).toBeNull();
	});
});
