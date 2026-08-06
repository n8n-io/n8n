import { testDb, testModules } from '@n8n/backend-test-utils';
import { AuthIdentity, AuthIdentityRepository, UserRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { OidcService } from '@/modules/sso-oidc/oidc.service.ee';
import {
	IdentityResolutionService,
	qualifiedProviderId,
} from '@/modules/token-exchange/services/identity-resolution.service';
import { TrustedKeyService } from '@/modules/token-exchange/services/trusted-key.service';

import { createUser } from './shared/db/users';

/**
 * Cross-surface resolution against a real database.
 *
 * Both login surfaces now share one resolution algorithm but still key
 * `AuthIdentity` differently — OIDC on the raw `sub`, token-exchange on
 * `sha256(iss)::sub` — until the key is modelled properly. The risk that
 * matters is an account fork: a row written by one surface silently stops
 * resolving and the user gets a fresh, empty account. These tests seed rows in
 * the exact format each surface writes and assert the same user comes back.
 */

const ISSUER = 'https://sso.example.com';

let oidcService: OidcService;
let identityResolution: IdentityResolutionService;
let authIdentityRepository: AuthIdentityRepository;
let userRepository: UserRepository;
let trustedKeyService: TrustedKeyService;

/** Resolve through the OIDC login path, skipping only the openid-client flow. */
async function resolveViaOidc(sub: string, userInfo: Record<string, unknown>) {
	// @ts-expect-error - resolveUserFromClaims is private; the openid-client
	// flow above it is not what these tests guard.
	return await oidcService.resolveUserFromClaims({ sub, iss: ISSUER }, userInfo);
}

/** Resolve through token-exchange, which is where the SSO bridge lives. */
async function resolveViaTokenExchange(sub: string, email?: string) {
	return await identityResolution.resolve(
		{
			sub,
			iss: ISSUER,
			aud: 'n8n',
			iat: Math.floor(Date.now() / 1000),
			exp: Math.floor(Date.now() / 1000) + 30,
			jti: `jti-${sub}`,
			email,
			email_verified: true,
		},
		undefined,
		{ kid: 'kid-1', issuer: ISSUER, requireVerifiedEmail: false },
		true,
	);
}

beforeAll(async () => {
	await testModules.loadModules(['identity-substrate', 'token-exchange']);
	await testDb.init();

	oidcService = Container.get(OidcService);
	identityResolution = Container.get(IdentityResolutionService);
	authIdentityRepository = Container.get(AuthIdentityRepository);
	userRepository = Container.get(UserRepository);
	trustedKeyService = Container.get(TrustedKeyService);
});

afterAll(async () => {
	await testDb.terminate();
});

beforeEach(async () => {
	await testDb.truncate(['AuthIdentity', 'ProjectRelation', 'Project', 'User']);
	// Role provisioning is exercised in the OIDC service's own tests; here it
	// would only add settings-table setup noise to a resolution test.
	// @ts-expect-error - applySsoProvisioning is private
	oidcService.applySsoProvisioning = vi.fn().mockResolvedValue(undefined);
	vi.spyOn(trustedKeyService, 'isSsoIssuer').mockResolvedValue(true);
	vi.spyOn(trustedKeyService, 'hasSingleTrustedIssuer').mockResolvedValue(false);
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe('an OIDC identity written before the refactor', () => {
	it('still resolves to the same account on the OIDC login path', async () => {
		const user = await createUser({ email: 'legacy-sso@example.com' });
		// Exactly what the pre-refactor OIDC code wrote: the raw `sub`.
		await authIdentityRepository.save(AuthIdentity.create(user, 'sso-subject-1', 'oidc'));

		const resolved = await resolveViaOidc('sso-subject-1', { email: 'legacy-sso@example.com' });

		expect(resolved.id).toBe(user.id);
		// No fork: still exactly one account and one binding.
		await expect(userRepository.count()).resolves.toBe(1);
		await expect(authIdentityRepository.count()).resolves.toBe(1);
	});

	it('still resolves to the same account through the token-exchange SSO bridge', async () => {
		const user = await createUser({ email: 'bridged@example.com' });
		await authIdentityRepository.save(AuthIdentity.create(user, 'sso-subject-2', 'oidc'));

		const resolved = await resolveViaTokenExchange('sso-subject-2', 'bridged@example.com');

		expect(resolved.id).toBe(user.id);
		await expect(userRepository.count()).resolves.toBe(1);
	});

	it('resolves even when the account email no longer matches the claim', async () => {
		// The binding, not the email, is what identifies the user — an email
		// change in the IdP must not fork the account.
		const user = await createUser({ email: 'old-address@example.com' });
		await authIdentityRepository.save(AuthIdentity.create(user, 'sso-subject-3', 'oidc'));

		const resolved = await resolveViaOidc('sso-subject-3', { email: 'new-address@example.com' });

		expect(resolved.id).toBe(user.id);
		await expect(userRepository.count()).resolves.toBe(1);
	});
});

describe('the two surfaces converge on one account', () => {
	it('reuses the OIDC-provisioned account when the same human arrives via token exchange', async () => {
		const provisioned = await resolveViaOidc('shared-subject-1', {
			email: 'converge-a@example.com',
			given_name: 'Ada',
			family_name: 'Lovelace',
		});

		const viaTokenExchange = await resolveViaTokenExchange(
			'shared-subject-1',
			'converge-a@example.com',
		);

		expect(viaTokenExchange.id).toBe(provisioned.id);
		await expect(userRepository.count()).resolves.toBe(1);
	});

	it('reuses the token-exchange-provisioned account when the same human logs in via OIDC', async () => {
		const provisioned = await resolveViaTokenExchange('shared-subject-2', 'converge-b@example.com');

		const viaOidc = await resolveViaOidc('shared-subject-2', {
			email: 'converge-b@example.com',
		});

		expect(viaOidc.id).toBe(provisioned.id);
		await expect(userRepository.count()).resolves.toBe(1);
	});
});

describe('the two key formats stay distinct', () => {
	it('writes the raw sub for OIDC and the qualified sub for token exchange', async () => {
		// Distinct subjects, so the SSO bridge does not reuse one row for both.
		await resolveViaOidc('oidc-only-subject', { email: 'formats-oidc@example.com' });
		await resolveViaTokenExchange('te-only-subject', 'formats-te@example.com');

		const identities = await authIdentityRepository.find();
		const byType = Object.fromEntries(identities.map((i) => [i.providerType, i.providerId]));

		expect(byType.oidc).toBe('oidc-only-subject');
		expect(byType['token-exchange']).toBe(qualifiedProviderId(ISSUER, 'te-only-subject'));
	});

	it('bridges to the existing oidc row instead of writing a second binding', async () => {
		const provisioned = await resolveViaOidc('bridge-subject', {
			email: 'bridge-once@example.com',
		});

		await resolveViaTokenExchange('bridge-subject', 'bridge-once@example.com');

		const identities = await authIdentityRepository.find();
		expect(identities).toHaveLength(1);
		expect(identities[0]).toMatchObject({
			providerType: 'oidc',
			providerId: 'bridge-subject',
			userId: provisioned.id,
		});
	});

	it('does not let the SSO bridge shadow an existing token-exchange binding', async () => {
		const oidcUser = await createUser({ email: 'shadow-oidc@example.com' });
		const tokenExchangeUser = await createUser({ email: 'shadow-te@example.com' });
		await authIdentityRepository.save(AuthIdentity.create(oidcUser, 'shadow-subject', 'oidc'));
		await authIdentityRepository.save(
			AuthIdentity.create(
				tokenExchangeUser,
				qualifiedProviderId(ISSUER, 'shadow-subject'),
				'token-exchange',
			),
		);

		const resolved = await resolveViaTokenExchange('shadow-subject');

		expect(resolved.id).toBe(tokenExchangeUser.id);
	});
});

describe('a revoked binding fails closed on both surfaces', () => {
	it('refuses an OIDC login', async () => {
		const user = await createUser({ email: 'revoked-sso@example.com' });
		const identity = AuthIdentity.create(user, 'revoked-subject', 'oidc');
		identity.status = 'revoked';
		await authIdentityRepository.save(identity);

		await expect(
			resolveViaOidc('revoked-subject', { email: 'revoked-sso@example.com' }),
		).rejects.toThrow();
		// Rejected, not forked into a second account.
		await expect(userRepository.count()).resolves.toBe(1);
	});

	it('refuses a token exchange', async () => {
		const user = await createUser({ email: 'revoked-te@example.com' });
		const identity = AuthIdentity.create(
			user,
			qualifiedProviderId(ISSUER, 'revoked-te-subject'),
			'token-exchange',
		);
		identity.status = 'revoked';
		await authIdentityRepository.save(identity);

		await expect(resolveViaTokenExchange('revoked-te-subject')).rejects.toThrow();
		await expect(userRepository.count()).resolves.toBe(1);
	});
});
