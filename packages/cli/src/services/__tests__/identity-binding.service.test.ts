import type { Logger } from '@n8n/backend-common';
import type { AuthIdentity, AuthIdentityRepository, User, UserRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { IdentityBindingService } from '../identity-binding.service';
import {
	IdentityResolutionError,
	type IdentityPolicy,
	type IdentitySource,
} from '../identity-binding.types';
import type { VerifiedIdentityClaim } from '../identity-resolution-proxy.service';

const logger = mock<Logger>({ scoped: vi.fn().mockReturnThis() });
const userRepository = mock<UserRepository>();
const authIdentityRepository = mock<AuthIdentityRepository>();

const service = new IdentityBindingService(logger, userRepository, authIdentityRepository);

function makeUser(overrides: Partial<User> = {}): User {
	return {
		...mock<User>(),
		id: 'user-id',
		email: 'user@example.com',
		firstName: 'Ada',
		lastName: 'Lovelace',
		...overrides,
	} as User;
}

function makeClaims(overrides: Partial<VerifiedIdentityClaim> = {}): VerifiedIdentityClaim {
	return {
		iss: 'https://issuer.example.com',
		sub: 'external-user-1',
		email: 'user@example.com',
		email_verified: true,
		...overrides,
	};
}

function makeIdentity(user: User, overrides: Partial<AuthIdentity> = {}): AuthIdentity {
	return {
		...mock<AuthIdentity>(),
		providerId: 'external-user-1',
		providerType: 'token-exchange',
		userId: user.id,
		user,
		status: 'active',
		...overrides,
	} as AuthIdentity;
}

const source: IdentitySource = {
	providerType: 'token-exchange',
	keyFor: (claims) => `qualified::${claims.sub}`,
};

function makePolicy(overrides: Partial<IdentityPolicy> = {}): IdentityPolicy {
	return {
		assertEmailVerified: vi.fn(),
		roleForNewUser: vi.fn().mockResolvedValue({ slug: 'global:member' }),
		profileSync: 'on-provision',
		...overrides,
	};
}

beforeEach(() => {
	vi.clearAllMocks();
	authIdentityRepository.findOne.mockResolvedValue(null);
	userRepository.findOne.mockResolvedValue(null);
});

describe('path 1 — known subject', () => {
	it('resolves by the primary key without touching the email path', async () => {
		const user = makeUser();
		authIdentityRepository.findOne.mockResolvedValueOnce(makeIdentity(user));
		const policy = makePolicy();

		const result = await service.resolve(source, makeClaims(), policy, {
			allowProvisioning: true,
		});

		expect(result).toBe(user);
		expect(authIdentityRepository.findOne).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { providerId: 'qualified::external-user-1', providerType: 'token-exchange' },
			}),
		);
		expect(userRepository.findOne).not.toHaveBeenCalled();
		expect(policy.assertEmailVerified).not.toHaveBeenCalled();
	});

	it('runs the pre-write gates before returning', async () => {
		const user = makeUser();
		authIdentityRepository.findOne.mockResolvedValueOnce(makeIdentity(user));
		const policy = makePolicy({
			assertMayActAs: vi.fn(),
			assertClaimAcceptable: vi.fn().mockResolvedValue(undefined),
		});

		await service.resolve(source, makeClaims(), policy, { allowProvisioning: true });

		expect(policy.assertMayActAs).toHaveBeenCalledWith(user);
		expect(policy.assertClaimAcceptable).toHaveBeenCalledWith(user, expect.anything());
	});

	it('does not apply key-scoped gates on the read-only path', async () => {
		const user = makeUser();
		authIdentityRepository.findOne.mockResolvedValueOnce(makeIdentity(user));
		const policy = makePolicy({
			assertMayActAs: vi.fn(),
			assertClaimAcceptable: vi.fn().mockResolvedValue(undefined),
			onResolved: vi.fn(),
		});

		const result = await service.resolve(source, makeClaims(), policy, {
			allowProvisioning: false,
		});

		expect(result).toBe(user);
		expect(policy.assertMayActAs).not.toHaveBeenCalled();
		expect(policy.assertClaimAcceptable).not.toHaveBeenCalled();
		expect(policy.onResolved).not.toHaveBeenCalled();
	});
});

describe('non-active bindings', () => {
	it.each(['suspended', 'revoked'] as const)(
		'throws on a %s binding when logging in',
		async (status) => {
			authIdentityRepository.findOne.mockResolvedValueOnce(makeIdentity(makeUser(), { status }));

			await expect(
				service.resolve(source, makeClaims(), makePolicy(), { allowProvisioning: true }),
			).rejects.toThrow(IdentityResolutionError);
		},
	);

	it.each(['suspended', 'revoked'] as const)(
		'returns null on a %s binding on the read-only path',
		async (status) => {
			authIdentityRepository.findOne.mockResolvedValueOnce(makeIdentity(makeUser(), { status }));

			await expect(
				service.resolve(source, makeClaims(), makePolicy(), { allowProvisioning: false }),
			).resolves.toBeNull();
		},
	);

	it('does not fall through to the email path', async () => {
		authIdentityRepository.findOne.mockResolvedValueOnce(
			makeIdentity(makeUser(), { status: 'revoked' }),
		);

		await expect(
			service.resolve(source, makeClaims(), makePolicy(), { allowProvisioning: true }),
		).rejects.toThrow();

		expect(userRepository.findOne).not.toHaveBeenCalled();
		expect(userRepository.createUserWithExternalIdentity).not.toHaveBeenCalled();
	});
});

describe('fallback lookups', () => {
	const legacyUser = makeUser({ id: 'legacy-user' });

	it('tries fallbacks only after the primary key misses, in order', async () => {
		const rebind = vi.fn();
		const withFallbacks: IdentitySource = {
			...source,
			fallbacks: [
				{ providerId: 'legacy-sub', providerType: 'token-exchange', rebind },
				{ providerId: 'bridged-sub', providerType: 'oidc' },
			],
		};
		authIdentityRepository.findOne
			.mockResolvedValueOnce(null) // primary
			.mockResolvedValueOnce(makeIdentity(legacyUser)); // first fallback

		const result = await service.resolve(withFallbacks, makeClaims(), makePolicy(), {
			allowProvisioning: true,
		});

		expect(result).toBe(legacyUser);
		expect(rebind).toHaveBeenCalled();
		// The second fallback is never queried once the first one hits.
		expect(authIdentityRepository.findOne).toHaveBeenCalledTimes(2);
	});

	it('skips the lookup entirely when a pre-query guard says it does not apply', async () => {
		const applies = vi.fn().mockResolvedValue(false);
		const withFallbacks: IdentitySource = {
			...source,
			fallbacks: [{ providerId: 'bridged-sub', providerType: 'oidc', applies }],
		};
		userRepository.findOne.mockResolvedValue(makeUser());

		await service.resolve(withFallbacks, makeClaims(), makePolicy(), {
			allowProvisioning: true,
		});

		expect(applies).toHaveBeenCalled();
		// Only the primary lookup ran.
		expect(authIdentityRepository.findOne).toHaveBeenCalledTimes(1);
	});

	it('discards a matched row when a post-query guard rejects it', async () => {
		const accepts = vi.fn().mockResolvedValue(false);
		const withFallbacks: IdentitySource = {
			...source,
			fallbacks: [{ providerId: 'legacy-sub', providerType: 'token-exchange', accepts }],
		};
		const emailUser = makeUser({ id: 'by-email' });
		authIdentityRepository.findOne
			.mockResolvedValueOnce(null)
			.mockResolvedValueOnce(makeIdentity(legacyUser));
		userRepository.findOne.mockResolvedValue(emailUser);

		const result = await service.resolve(withFallbacks, makeClaims(), makePolicy(), {
			allowProvisioning: true,
		});

		expect(accepts).toHaveBeenCalled();
		// Rejected, so resolution continues to the email path.
		expect(result).toBe(emailUser);
	});

	it('does not rebind on the read-only path', async () => {
		const rebind = vi.fn();
		const withFallbacks: IdentitySource = {
			...source,
			fallbacks: [{ providerId: 'legacy-sub', providerType: 'token-exchange', rebind }],
		};
		authIdentityRepository.findOne
			.mockResolvedValueOnce(null)
			.mockResolvedValueOnce(makeIdentity(legacyUser));

		await service.resolve(withFallbacks, makeClaims(), makePolicy(), {
			allowProvisioning: false,
		});

		expect(rebind).not.toHaveBeenCalled();
	});
});

describe('path 2 — link by email', () => {
	it('links the subject to the existing account and reports it', async () => {
		const existing = makeUser();
		userRepository.findOne.mockResolvedValue(existing);
		const policy = makePolicy({ onLinked: vi.fn() });

		const result = await service.resolve(source, makeClaims(), policy, {
			allowProvisioning: true,
		});

		expect(result).toBe(existing);
		expect(policy.assertEmailVerified).toHaveBeenCalled();
		expect(authIdentityRepository.save).toHaveBeenCalledWith(
			expect.objectContaining({
				providerId: 'qualified::external-user-1',
				providerType: 'token-exchange',
				userId: existing.id,
			}),
		);
		expect(policy.onLinked).toHaveBeenCalledWith(existing, expect.anything());
	});

	it('lowercases the claim email before looking the account up', async () => {
		userRepository.findOne.mockResolvedValue(makeUser());

		await service.resolve(source, makeClaims({ email: 'User@Example.COM' }), makePolicy(), {
			allowProvisioning: true,
		});

		expect(userRepository.findOne).toHaveBeenCalledWith(
			expect.objectContaining({ where: { email: 'user@example.com' } }),
		);
	});

	it('writes nothing when a pre-write gate rejects the claim', async () => {
		userRepository.findOne.mockResolvedValue(makeUser());
		const policy = makePolicy({
			assertClaimAcceptable: vi.fn().mockRejectedValue(new Error('role not allowed')),
		});

		await expect(
			service.resolve(source, makeClaims(), policy, { allowProvisioning: true }),
		).rejects.toThrow('role not allowed');

		expect(authIdentityRepository.save).not.toHaveBeenCalled();
	});

	it('writes nothing when the email is not verified', async () => {
		userRepository.findOne.mockResolvedValue(makeUser());
		const policy = makePolicy({
			assertEmailVerified: vi.fn().mockImplementation(() => {
				throw new Error('email not verified');
			}),
		});

		await expect(
			service.resolve(source, makeClaims(), policy, { allowProvisioning: true }),
		).rejects.toThrow('email not verified');

		expect(authIdentityRepository.save).not.toHaveBeenCalled();
	});
});

describe('path 3 — JIT provision', () => {
	it('creates the user, project and binding atomically', async () => {
		const created = makeUser({ id: 'new-user' });
		userRepository.createUserWithExternalIdentity.mockResolvedValue(created);
		const policy = makePolicy({ onProvisioned: vi.fn() });

		const result = await service.resolve(source, makeClaims(), policy, {
			allowProvisioning: true,
		});

		expect(result).toBe(created);
		expect(userRepository.createUserWithExternalIdentity).toHaveBeenCalledWith(
			expect.objectContaining({
				email: 'user@example.com',
				role: { slug: 'global:member' },
			}),
			{ providerId: 'qualified::external-user-1', providerType: 'token-exchange' },
		);
		expect(policy.onProvisioned).toHaveBeenCalledWith(created, expect.anything(), 'global:member');
	});

	it('asserts the email is verified before provisioning', async () => {
		const policy = makePolicy({
			assertEmailVerified: vi.fn().mockImplementation(() => {
				throw new Error('email not verified');
			}),
		});

		await expect(
			service.resolve(source, makeClaims(), policy, { allowProvisioning: true }),
		).rejects.toThrow('email not verified');

		expect(userRepository.createUserWithExternalIdentity).not.toHaveBeenCalled();
	});

	it('resolves the role before opening the transaction', async () => {
		const calls: string[] = [];
		userRepository.createUserWithExternalIdentity.mockImplementation(async () => {
			calls.push('create');
			return makeUser();
		});
		const policy = makePolicy({
			roleForNewUser: vi.fn().mockImplementation(async () => {
				calls.push('role');
				return { slug: 'global:admin' };
			}),
		});

		await service.resolve(source, makeClaims(), policy, { allowProvisioning: true });

		expect(calls).toEqual(['role', 'create']);
	});

	it('truncates names to the column length', async () => {
		userRepository.createUserWithExternalIdentity.mockResolvedValue(makeUser());

		await service.resolve(
			source,
			makeClaims({ given_name: 'x'.repeat(50), family_name: 'y'.repeat(50) }),
			makePolicy(),
			{ allowProvisioning: true },
		);

		expect(userRepository.createUserWithExternalIdentity).toHaveBeenCalledWith(
			expect.objectContaining({ firstName: 'x'.repeat(32), lastName: 'y'.repeat(32) }),
			expect.anything(),
		);
	});

	it('throws when there is no email to key off', async () => {
		await expect(
			service.resolve(source, makeClaims({ email: undefined }), makePolicy(), {
				allowProvisioning: true,
			}),
		).rejects.toThrow(IdentityResolutionError);
	});

	it('returns null instead of provisioning on the read-only path', async () => {
		await expect(
			service.resolve(source, makeClaims(), makePolicy(), { allowProvisioning: false }),
		).resolves.toBeNull();

		expect(userRepository.findOne).not.toHaveBeenCalled();
		expect(userRepository.createUserWithExternalIdentity).not.toHaveBeenCalled();
	});
});

describe('profile sync', () => {
	it('leaves names alone under on-provision', async () => {
		authIdentityRepository.findOne.mockResolvedValueOnce(makeIdentity(makeUser()));

		await service.resolve(
			source,
			makeClaims({ given_name: 'Grace', family_name: 'Hopper' }),
			makePolicy({ profileSync: 'on-provision' }),
			{ allowProvisioning: true },
		);

		expect(userRepository.update).not.toHaveBeenCalled();
	});

	it('writes back changed names under every-resolution and returns the reloaded user', async () => {
		const reloaded = makeUser({ firstName: 'Grace', lastName: 'Hopper' });
		authIdentityRepository.findOne.mockResolvedValueOnce(makeIdentity(makeUser()));
		userRepository.findOneOrFail.mockResolvedValue(reloaded);

		const result = await service.resolve(
			source,
			makeClaims({ given_name: 'Grace', family_name: 'Hopper' }),
			makePolicy({ profileSync: 'every-resolution' }),
			{ allowProvisioning: true },
		);

		expect(userRepository.update).toHaveBeenCalledWith('user-id', {
			firstName: 'Grace',
			lastName: 'Hopper',
		});
		expect(result).toBe(reloaded);
	});

	it('does not write when the claim matches what is stored', async () => {
		authIdentityRepository.findOne.mockResolvedValueOnce(makeIdentity(makeUser()));

		await service.resolve(
			source,
			makeClaims({ given_name: 'Ada', family_name: 'Lovelace' }),
			makePolicy({ profileSync: 'every-resolution' }),
			{ allowProvisioning: true },
		);

		expect(userRepository.update).not.toHaveBeenCalled();
	});
});

describe('onResolved', () => {
	it('is called with the path and can substitute the returned user', async () => {
		const substituted = makeUser({ id: 'substituted' });
		authIdentityRepository.findOne.mockResolvedValueOnce(makeIdentity(makeUser()));
		const policy = makePolicy({ onResolved: vi.fn().mockResolvedValue(substituted) });

		const result = await service.resolve(source, makeClaims(), policy, {
			allowProvisioning: true,
		});

		expect(policy.onResolved).toHaveBeenCalledWith(
			expect.anything(),
			expect.anything(),
			'known-subject',
		);
		expect(result).toBe(substituted);
	});

	it.each([
		['linked-by-email', () => userRepository.findOne.mockResolvedValue(makeUser())],
		[
			'provisioned',
			() => userRepository.createUserWithExternalIdentity.mockResolvedValue(makeUser()),
		],
	])('reports the %s path', async (path, arrange) => {
		arrange();
		const policy = makePolicy({ onResolved: vi.fn().mockImplementation(async (user) => user) });

		await service.resolve(source, makeClaims(), policy, { allowProvisioning: true });

		expect(policy.onResolved).toHaveBeenCalledWith(expect.anything(), expect.anything(), path);
	});
});
