import type { Logger } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import type {
	AuthenticatedRequest,
	InvalidAuthTokenRepository,
	User,
	UserRepository,
} from '@n8n/db';
import { GLOBAL_MEMBER_ROLE, GLOBAL_OWNER_ROLE } from '@n8n/db';
import type { Scope } from '@n8n/permissions';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';

import { AuthService } from '@/auth/auth.service';
import type { License } from '@/license';
import type { MfaService } from '@/mfa/mfa.service';
import { JwtService } from '@/services/jwt.service';
import type { UrlService } from '@/services/url.service';

describe('AuthService impersonation', () => {
	const browserId = 'test-browser-id';

	const globalConfig = mock<GlobalConfig>({
		auth: { cookie: { secure: true, samesite: 'lax' } },
		userManagement: {
			jwtSecret: 'random-secret',
			jwtSessionDurationHours: 168,
			jwtRefreshTimeoutHours: 1,
		},
		endpoints: { rest: 'rest' },
	});
	const jwtService = new JwtService(mock(), globalConfig);
	const userRepository = mock<UserRepository>();
	const invalidAuthTokenRepository = mock<InvalidAuthTokenRepository>();
	const mfaService = mock<MfaService>();
	const license = mock<License>();
	const logger = mock<Logger>();

	const authService = new AuthService(
		globalConfig,
		logger,
		license,
		jwtService,
		mock<UrlService>(),
		userRepository,
		invalidAuthTokenRepository,
		mfaService,
	);

	const withScopes = (scopes: Scope[]) =>
		({ ...GLOBAL_MEMBER_ROLE, scopes: scopes.map((slug) => ({ slug })) }) as never;

	const actorRole = withScopes(['serviceAccount:impersonate']);

	/**
	 * Field set `createJWTHash` and the impersonation checks read. Kept as plain
	 * data so variants can be built by spreading *this*, never a mock — spreading a
	 * mock proxy materialises every property as a function, which breaks
	 * `mfaSecret.substring`.
	 */
	type UserFields = Pick<
		User,
		'id' | 'email' | 'password' | 'disabled' | 'mfaEnabled' | 'mfaSecret' | 'type' | 'role'
	>;

	/**
	 * Assign onto an empty mock rather than passing overrides: `mock(overrides)`
	 * deep-wraps nested objects and mutates shared role constants in place.
	 */
	const buildUser = (data: UserFields) => Object.assign(mock<User>(), data);

	const ACTOR_FIELDS: UserFields = {
		id: 'human-1',
		email: 'admin@example.com',
		password: 'passwordHash',
		disabled: false,
		mfaEnabled: false,
		mfaSecret: null,
		type: 'user',
		role: actorRole,
	};

	const SERVICE_ACCOUNT_FIELDS: UserFields = {
		id: 'sa-1',
		email: 'deploy-bot-abcd@service-accounts.invalid',
		password: null,
		disabled: false,
		mfaEnabled: false,
		mfaSecret: null,
		type: 'serviceAccount',
		role: GLOBAL_MEMBER_ROLE,
	};

	const actor = () => buildUser(ACTOR_FIELDS);
	const serviceAccount = () => buildUser(SERVICE_ACCOUNT_FIELDS);

	beforeEach(() => {
		vi.clearAllMocks();
		license.isWithinUsersLimit.mockReturnValue(true);
		mfaService.isMFAEnforced.mockResolvedValue(false);
		invalidAuthTokenRepository.existsBy.mockResolvedValue(false);
	});

	/** Resolve `id` to the SA and `act.sub` to the actor, as `validateToken` does. */
	const stubLookups = (sa: User, human: User | null) => {
		userRepository.findOne.mockImplementation(async ({ where }) => {
			const id = (where as { id: string }).id;
			if (id === sa.id) return sa;
			if (id === human?.id) return human;
			return null;
		});
	};

	describe('issueJWT', () => {
		it('emits an `act` claim carrying the actor id and the actor hash', () => {
			const human = actor();
			const sa = serviceAccount();

			const token = authService.issueJWT(sa, false, browserId, undefined, { actor: human });

			const payload = jwtService.verify(token);
			expect(payload.id).toBe(sa.id);
			expect(payload.act).toEqual({
				sub: human.id,
				// The actor's hash, not the subject's — a passwordless SA's hash can
				// never change, so it would be useless for revocation.
				hash: authService.createJWTHash(human),
			});
		});

		it('makes impersonation-transition tokens unique so a revoked one is never re-minted', () => {
			const human = actor();
			const sa = serviceAccount();

			// Same second, same subject, same everything else: without the nonce these
			// would be byte-identical, and exit would re-mint the token entry revoked.
			const first = authService.issueJWT(human, false, browserId, undefined, {
				isImpersonationTransition: true,
			});
			const second = authService.issueJWT(human, false, browserId, undefined, {
				isImpersonationTransition: true,
			});
			expect(first).not.toBe(second);

			// A plain token issued in the same second *is* identical — which is exactly
			// why the transitions need the nonce.
			expect(authService.issueJWT(human, false, browserId)).toBe(
				authService.issueJWT(human, false, browserId),
			);

			expect(
				jwtService.verify(
					authService.issueJWT(sa, false, browserId, undefined, {
						actor: human,
						isImpersonationTransition: true,
					}),
				).jti,
			).toEqual(expect.any(String));
		});

		it('omits `act` when no actor is passed', () => {
			const token = authService.issueJWT(serviceAccount(), false, browserId);

			expect(jwtService.verify(token).act).toBeUndefined();
		});
	});

	describe('issueCookie', () => {
		it('does not throw USERS_QUOTA_REACHED for a service account on a seat-capped licence', () => {
			license.isWithinUsersLimit.mockReturnValue(false);
			const sa = serviceAccount();

			expect(() => authService.issueCookie(mock<Response>(), sa, false, browserId)).not.toThrow();
		});

		it('still throws USERS_QUOTA_REACHED for a non-owner human', () => {
			license.isWithinUsersLimit.mockReturnValue(false);
			const human = buildUser({ ...ACTOR_FIELDS, role: GLOBAL_MEMBER_ROLE });

			expect(() => authService.issueCookie(mock<Response>(), human, false, browserId)).toThrow(
				'Maximum number of users reached',
			);
		});
	});

	describe('authenticateUserBasedOnToken', () => {
		const authenticate = async (token: string) =>
			await authService.authenticateUserBasedOnToken(token, 'GET', '/rest/login', browserId);

		it('resolves the service account as the principal on a valid impersonation token', async () => {
			const human = actor();
			const sa = serviceAccount();
			stubLookups(sa, human);

			const token = authService.issueJWT(sa, false, browserId, undefined, { actor: human });

			await expect(authenticate(token)).resolves.toMatchObject({ id: sa.id });
		});

		it('rejects when the actor hash no longer matches', async () => {
			const human = actor();
			const sa = serviceAccount();
			const token = authService.issueJWT(sa, false, browserId, undefined, { actor: human });

			// The operator changed their password after the token was issued.
			stubLookups(sa, buildUser({ ...ACTOR_FIELDS, password: 'newPasswordHash' }));

			await expect(authenticate(token)).rejects.toThrow('Unauthorized');
		});

		it('rejects when the actor no longer holds serviceAccount:impersonate', async () => {
			const human = actor();
			const sa = serviceAccount();
			const token = authService.issueJWT(sa, false, browserId, undefined, { actor: human });

			stubLookups(sa, buildUser({ ...ACTOR_FIELDS, role: withScopes(['user:list']) }));

			await expect(authenticate(token)).rejects.toThrow('Unauthorized');
		});

		it('rejects when the actor is disabled', async () => {
			const human = actor();
			const sa = serviceAccount();
			const token = authService.issueJWT(sa, false, browserId, undefined, { actor: human });

			stubLookups(sa, buildUser({ ...ACTOR_FIELDS, disabled: true }));

			await expect(authenticate(token)).rejects.toThrow('Unauthorized');
		});

		it('rejects when the actor is missing', async () => {
			const human = actor();
			const sa = serviceAccount();
			const token = authService.issueJWT(sa, false, browserId, undefined, { actor: human });

			stubLookups(sa, null);

			await expect(authenticate(token)).rejects.toThrow('Unauthorized');
		});

		it('rejects when the subject is not a service account', async () => {
			const human = actor();
			const target = buildUser({ ...ACTOR_FIELDS, id: 'human-2', email: 'other@example.com' });
			const token = authService.issueJWT(target, false, browserId, undefined, { actor: human });

			stubLookups(target, human);

			await expect(authenticate(token)).rejects.toThrow('Unauthorized');
		});

		it('rejects when the actor is itself a service account', async () => {
			const saActor = buildUser({
				...SERVICE_ACCOUNT_FIELDS,
				id: 'sa-actor',
				email: 'admin-bot-1234@service-accounts.invalid',
				role: actorRole,
			});
			const sa = serviceAccount();
			const token = authService.issueJWT(sa, false, browserId, undefined, { actor: saActor });

			stubLookups(sa, saActor);

			await expect(authenticate(token)).rejects.toThrow('Unauthorized');
		});
	});

	describe('resolveJwt refresh', () => {
		it('preserves the `act` claim when the token is refreshed mid-session', async () => {
			const human = actor();
			const sa = serviceAccount();
			stubLookups(sa, human);

			// A freshly issued token whose whole lifetime is shorter than the 1h
			// refresh window, so `resolveJwt` re-issues the cookie immediately.
			globalConfig.userManagement.jwtSessionDurationHours = 0.25;
			const token = authService.issueJWT(sa, false, browserId, undefined, { actor: human });

			const req = mock<AuthenticatedRequest>({ browserId, cookies: {} });
			const res = mock<Response>();

			const [user, { actor: resolvedActor }] = await authService.resolveJwt(token, req, res);

			expect(user.id).toBe(sa.id);
			expect(resolvedActor?.id).toBe(human.id);

			// The refreshed cookie must still carry `act`, otherwise the operator is
			// stranded inside the service account with no exit and no audit trail.
			expect(res.cookie).toHaveBeenCalled();
			const [, refreshedToken] = res.cookie.mock.calls[0] as [string, string];
			expect(jwtService.verify(refreshedToken).act).toEqual({
				sub: human.id,
				hash: authService.createJWTHash(human),
			});

			globalConfig.userManagement.jwtSessionDurationHours = 168;
		});
	});

	describe('createAuthMiddleware MFA gate', () => {
		it('evaluates enforced MFA against the actor, not the service account', async () => {
			// The operator has MFA enabled and used it; the SA never can.
			const human = buildUser({ ...ACTOR_FIELDS, mfaEnabled: true, mfaSecret: 'secret-value' });
			const sa = serviceAccount();
			stubLookups(sa, human);
			mfaService.isMFAEnforced.mockResolvedValue(true);

			const token = authService.issueJWT(sa, true, browserId, undefined, { actor: human });
			const req = mock<AuthenticatedRequest>({
				browserId,
				cookies: { 'n8n-auth': token },
				method: 'GET',
			});
			const res = mock<Response>();
			const next = vi.fn();

			await authService.createAuthMiddleware({ allowSkipMFA: false })(req, res, next);

			expect(next).toHaveBeenCalled();
			expect(req.user.id).toBe(sa.id);
			expect(req.authInfo?.actor?.id).toBe(human.id);
		});

		it('401s with mfaRequired when the actor has not enrolled and MFA is enforced', async () => {
			const human = actor(); // mfaEnabled: false
			const sa = serviceAccount();
			stubLookups(sa, human);
			mfaService.isMFAEnforced.mockResolvedValue(true);

			const token = authService.issueJWT(sa, false, browserId, undefined, { actor: human });
			const req = mock<AuthenticatedRequest>({
				browserId,
				cookies: { 'n8n-auth': token },
				method: 'GET',
			});
			const res = mock<Response>();
			res.status.mockReturnThis();

			await authService.createAuthMiddleware({ allowSkipMFA: false })(req, res, vi.fn());

			expect(res.status).toHaveBeenCalledWith(401);
			expect(res.json).toHaveBeenCalledWith(
				expect.objectContaining({ mfaRequired: true, status: 'error' }),
			);
		});
	});

	describe('GLOBAL_OWNER_ROLE sanity', () => {
		it('grants the owner role serviceAccount:impersonate', () => {
			expect(GLOBAL_OWNER_ROLE.scopes.map(({ slug }) => slug)).toContain(
				'serviceAccount:impersonate',
			);
		});
	});
});
