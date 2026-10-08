import type { User, UserRepository } from '@n8n/db';
import { AuthError } from '@n8n/errors';
import type { Request } from 'express';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { mock } from 'vitest-mock-extended';

import type { AuthService } from '@/auth/auth.service';
import { userHasScopes } from '@/permissions.ee/check-access';

import { ACCESS_CHECK_TTL_MS, SandboxPreviewAccess } from '../sandbox-preview-access';
import type { SandboxPreviewEntry } from '../sandbox-preview.service';

vi.mock('@/permissions.ee/check-access', () => ({ userHasScopes: vi.fn() }));

const START = new Date('2026-10-08T10:00:00.000Z');
const SESSION_COOKIE = 'valid-session';

const entryFor = (jti: string, userId = 'user-1'): SandboxPreviewEntry => ({
	jti,
	token: `token-${jti}`,
	userId,
	projectId: 'project-1',
	scope: `scope-${jti}`,
	serviceUrl: 'http://sandbox-service.internal',
	path: '/sandboxes/sb-1/ports/5173',
	expiresAt: START.getTime() + 3_600_000,
});

/** A plain object: a deep mock would answer every cookie name. */
const requestWith = (cookie?: string) =>
	({ cookies: cookie ? { 'n8n-auth': cookie } : {} }) as unknown as Request;

describe('SandboxPreviewAccess', () => {
	const authService = mock<AuthService>();
	const userRepository = mock<UserRepository>();
	const tokenUser = mock<User>({ id: 'user-1', disabled: false });
	const sessionUser = mock<User>({ id: 'user-2', disabled: false });
	let access: SandboxPreviewAccess;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(START);
		access = new SandboxPreviewAccess(authService, userRepository);
		authService.getCookieToken.mockImplementation(
			(req) => (req.cookies as Record<string, string | undefined>)['n8n-auth'],
		);
		authService.authenticateUserByCookie.mockImplementation(async (cookie) => {
			if (cookie === SESSION_COOKIE) return await Promise.resolve(sessionUser);
			throw new AuthError('Unauthorized');
		});
		userRepository.findByIdWithRole.mockResolvedValue(tokenUser);
		vi.mocked(userHasScopes).mockResolvedValue(true);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('tokenUserAllowed', () => {
		it('checks agent:execute of the user of the URL on the project of the URL', async () => {
			await expect(access.tokenUserAllowed(entryFor('a'))).resolves.toBe(true);

			expect(userRepository.findByIdWithRole).toHaveBeenCalledWith('user-1');
			expect(userHasScopes).toHaveBeenCalledWith(tokenUser, ['agent:execute'], false, {
				projectId: 'project-1',
			});
		});

		it.each([
			['lost agent:execute', tokenUser, false],
			['is disabled', mock<User>({ id: 'user-1', disabled: true }), true],
			['no longer exists', null, true],
		])('refuses when the user of the URL %s', async (_case, user, scopes) => {
			userRepository.findByIdWithRole.mockResolvedValue(user);
			vi.mocked(userHasScopes).mockResolvedValue(scopes);

			await expect(access.tokenUserAllowed(entryFor('a'))).resolves.toBe(false);
		});

		it('does not ask a disabled or deleted user for scopes', async () => {
			userRepository.findByIdWithRole.mockResolvedValue(null);

			await access.tokenUserAllowed(entryFor('a'));

			expect(userHasScopes).not.toHaveBeenCalled();
		});

		it('trusts a passed check for thirty seconds, then checks again', async () => {
			const entry = entryFor('a');

			await access.tokenUserAllowed(entry);
			vi.setSystemTime(START.getTime() + ACCESS_CHECK_TTL_MS - 1);
			await expect(access.tokenUserAllowed(entry)).resolves.toBe(true);
			expect(userHasScopes).toHaveBeenCalledTimes(1);

			vi.mocked(userHasScopes).mockResolvedValue(false);
			vi.setSystemTime(START.getTime() + ACCESS_CHECK_TTL_MS);
			await expect(access.tokenUserAllowed(entry)).resolves.toBe(false);
			expect(userHasScopes).toHaveBeenCalledTimes(2);
		});

		it('checks again when asked for a fresh check, even within thirty seconds', async () => {
			const entry = entryFor('a');
			await access.tokenUserAllowed(entry);
			vi.mocked(userHasScopes).mockResolvedValue(false);

			await expect(access.tokenUserAllowed(entry, { fresh: false })).resolves.toBe(true);
			await expect(access.tokenUserAllowed(entry, { fresh: true })).resolves.toBe(false);
			expect(userHasScopes).toHaveBeenCalledTimes(2);
		});

		it('drops an older pass when a fresh check refuses', async () => {
			const entry = entryFor('a');
			await access.tokenUserAllowed(entry);
			vi.mocked(userHasScopes).mockResolvedValueOnce(false);
			await access.tokenUserAllowed(entry, { fresh: true });

			// The next check without `fresh` asks the database, because no pass is left.
			await expect(access.tokenUserAllowed(entry)).resolves.toBe(true);
			expect(userHasScopes).toHaveBeenCalledTimes(3);
		});

		it('starts a new thirty-second pass after a fresh check passes', async () => {
			const entry = entryFor('a');
			await access.tokenUserAllowed(entry);
			vi.setSystemTime(START.getTime() + ACCESS_CHECK_TTL_MS - 1);
			await access.tokenUserAllowed(entry, { fresh: true });
			vi.mocked(userHasScopes).mockResolvedValue(false);

			vi.setSystemTime(START.getTime() + 2 * ACCESS_CHECK_TTL_MS - 2);
			await expect(access.tokenUserAllowed(entry)).resolves.toBe(true);
			vi.setSystemTime(START.getTime() + 2 * ACCESS_CHECK_TTL_MS - 1);
			await expect(access.tokenUserAllowed(entry)).resolves.toBe(false);
			expect(userHasScopes).toHaveBeenCalledTimes(3);
		});

		it('does not keep a refusal, so access that comes back counts at once', async () => {
			const entry = entryFor('a');
			vi.mocked(userHasScopes).mockResolvedValueOnce(false);

			await expect(access.tokenUserAllowed(entry)).resolves.toBe(false);
			await expect(access.tokenUserAllowed(entry)).resolves.toBe(true);
		});

		it('keeps a passed check for each URL on its own', async () => {
			await access.tokenUserAllowed(entryFor('a'));
			await access.tokenUserAllowed(entryFor('b', 'user-3'));
			await access.tokenUserAllowed(entryFor('a'));

			expect(userRepository.findByIdWithRole.mock.calls).toEqual([['user-1'], ['user-3']]);
		});

		it('forgets passed checks once they are stale', async () => {
			const passedUntil = (access as unknown as { passedUntil: Map<string, number> }).passedUntil;
			await access.tokenUserAllowed(entryFor('a'));
			await access.tokenUserAllowed(entryFor('b'));
			expect([...passedUntil.keys()]).toEqual(['a', 'b']);

			vi.setSystemTime(START.getTime() + ACCESS_CHECK_TTL_MS);
			await access.tokenUserAllowed(entryFor('c'));

			expect([...passedUntil.keys()]).toEqual(['c']);
		});

		it('passes a database error on and keeps no answer', async () => {
			userRepository.findByIdWithRole.mockRejectedValueOnce(new Error('database not reachable'));

			await expect(access.tokenUserAllowed(entryFor('a'))).rejects.toThrow(
				'database not reachable',
			);
			await expect(access.tokenUserAllowed(entryFor('a'))).resolves.toBe(true);
			expect(userRepository.findByIdWithRole).toHaveBeenCalledTimes(2);
		});
	});

	describe('sessionUserAllowed', () => {
		it('allows a request without the n8n cookie and checks nothing', async () => {
			await expect(access.sessionUserAllowed(requestWith(), entryFor('a'))).resolves.toBe(true);

			expect(authService.authenticateUserByCookie).not.toHaveBeenCalled();
			expect(userHasScopes).not.toHaveBeenCalled();
		});

		it('checks agent:execute of the session user', async () => {
			await expect(
				access.sessionUserAllowed(requestWith(SESSION_COOKIE), entryFor('a')),
			).resolves.toBe(true);

			expect(authService.authenticateUserByCookie).toHaveBeenCalledWith(SESSION_COOKIE);
			expect(userHasScopes).toHaveBeenCalledWith(sessionUser, ['agent:execute'], false, {
				projectId: 'project-1',
			});
		});

		it('refuses a session user without access', async () => {
			vi.mocked(userHasScopes).mockResolvedValue(false);

			await expect(
				access.sessionUserAllowed(requestWith(SESSION_COOKIE), entryFor('a')),
			).resolves.toBe(false);
		});

		it.each([
			['is signed out', new AuthError('Unauthorized')],
			['has expired', new TokenExpiredError('jwt expired', new Date(START.getTime() - 1000))],
			['is malformed', new JsonWebTokenError('jwt malformed')],
		])(
			'leaves the decision to the check of the URL user when the cookie %s',
			async (_case, error) => {
				authService.authenticateUserByCookie.mockRejectedValue(error);

				await expect(
					access.sessionUserAllowed(requestWith('stale-session'), entryFor('a')),
				).resolves.toBe(true);

				expect(userHasScopes).not.toHaveBeenCalled();
			},
		);

		it('passes on a fault that is not about the cookie', async () => {
			authService.authenticateUserByCookie.mockRejectedValue(new Error('database not reachable'));

			await expect(
				access.sessionUserAllowed(requestWith(SESSION_COOKIE), entryFor('a')),
			).rejects.toThrow('database not reachable');
		});

		it('refuses a disabled session user', async () => {
			authService.authenticateUserByCookie.mockResolvedValue(
				mock<User>({ id: 'user-2', disabled: true }),
			);

			await expect(
				access.sessionUserAllowed(requestWith(SESSION_COOKIE), entryFor('a')),
			).resolves.toBe(false);
			expect(userHasScopes).not.toHaveBeenCalled();
		});

		it('checks the session on each page load, without a cache', async () => {
			const entry = entryFor('a');

			await access.sessionUserAllowed(requestWith(SESSION_COOKIE), entry);
			await access.sessionUserAllowed(requestWith(SESSION_COOKIE), entry);

			expect(authService.authenticateUserByCookie).toHaveBeenCalledTimes(2);
		});
	});
});
