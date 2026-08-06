import type { Logger } from '@n8n/backend-common';
import {
	GLOBAL_MEMBER_ROLE,
	type AuthIdentity,
	type AuthIdentityRepository,
	type User,
	type UserRepository,
} from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { EventService } from '@/events/event.service';
import { IdentityBindingService } from '@/services/identity-binding.service';
import type { RoleService } from '@/services/role.service';
import type { UserService } from '@/services/user.service';

import type { TokenExchangeConfig } from '../../token-exchange.config';
import { TokenExchangeAuthError } from '../../token-exchange.errors';
import type { ExternalTokenClaims } from '../../token-exchange.schemas';
import { TokenExchangeFailureReason } from '../../token-exchange.types';
import { IdentityResolutionService, qualifiedProviderId } from '../identity-resolution.service';
import type { TrustedKeyService } from '../trusted-key.service';

const logger = mock<Logger>({ scoped: vi.fn().mockReturnThis() });
const userRepository = mock<UserRepository>();
const authIdentityRepository = mock<AuthIdentityRepository>();
const eventService = mock<EventService>();
const userService = mock<UserService>();
const trustedKeyService = mock<TrustedKeyService>();
const roleService = mock<RoleService>();
const config = mock<TokenExchangeConfig>();

// The shared core is wired for real, against mocked repositories, so these
// stay end-to-end regression tests of the resolution behaviour rather than
// tests of the delegation.
const identityBinding = new IdentityBindingService(logger, userRepository, authIdentityRepository);

const service = new IdentityResolutionService(
	logger,
	userRepository,
	authIdentityRepository,
	eventService,
	userService,
	trustedKeyService,
	roleService,
	config,
	identityBinding,
);

const CUSTOM_ROLE = 'global:custom-abc123';

function makeUser(roleSlug: string): User {
	return {
		...mock<User>(),
		id: 'user-id',
		email: 'user@example.com',
		role: { ...mock<User['role']>(), slug: roleSlug },
	} as User;
}

function makeClaims(overrides: Partial<ExternalTokenClaims> = {}): ExternalTokenClaims {
	return {
		sub: 'external-user-1',
		iss: 'https://issuer.example.com',
		aud: 'n8n',
		iat: 1_700_000_000,
		exp: 1_700_000_030,
		jti: 'unique-jti-1',
		email: 'user@example.com',
		...overrides,
	};
}

function ctx(requireVerifiedEmail = false) {
	return { kid: 'kid-1', issuer: 'https://issuer.example.com', requireVerifiedEmail };
}

describe('IdentityResolutionService', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		roleService.isGlobalRole.mockResolvedValue(true);
		roleService.isRoleLicensed.mockReturnValue(true);
		config.excludeOwner = false;
		// Default: no linked identity, no existing user (JIT territory unless overridden).
		authIdentityRepository.findOne.mockResolvedValue(null);
		userRepository.findOne.mockResolvedValue(null);
		// Default: claim issuer isn't SSO-derived, so the bridge is never consulted.
		trustedKeyService.isSsoIssuer.mockResolvedValue(false);
	});

	describe('JIT provisioning (new user)', () => {
		const identity = { providerId: expect.any(String), providerType: 'token-exchange' };

		beforeEach(() => {
			// No existing identity, no existing user by email → JIT path.
			authIdentityRepository.findOne.mockResolvedValue(null);
			userRepository.findOne.mockResolvedValue(null);
			userRepository.createUserWithExternalIdentity.mockResolvedValue(
				mock<User>({ id: 'new-user-1' }),
			);
		});

		it('provisions a licensed custom global role', async () => {
			const user = await service.resolve(makeClaims({ role: CUSTOM_ROLE }), undefined, ctx(), true);

			expect(user.id).toBe('new-user-1');
			expect(userRepository.createUserWithExternalIdentity).toHaveBeenCalledWith(
				expect.objectContaining({ role: { slug: CUSTOM_ROLE } }),
				identity,
			);
			expect(eventService.emit).toHaveBeenCalledWith(
				'token-exchange-user-provisioned',
				expect.objectContaining({ role: CUSTOM_ROLE }),
			);
		});

		it('provisions a built-in global role without a license check', async () => {
			await service.resolve(makeClaims({ role: 'global:member' }), undefined, ctx(), true);

			expect(roleService.isRoleLicensed).not.toHaveBeenCalled();
			expect(userRepository.createUserWithExternalIdentity).toHaveBeenCalledWith(
				expect.objectContaining({ role: { slug: 'global:member' } }),
				identity,
			);
		});

		it('defaults to global:member when no role claim is present', async () => {
			await service.resolve(makeClaims(), undefined, ctx(), true);

			expect(userRepository.createUserWithExternalIdentity).toHaveBeenCalledWith(
				expect.objectContaining({ role: GLOBAL_MEMBER_ROLE }),
				identity,
			);
			expect(eventService.emit).toHaveBeenCalledWith(
				'token-exchange-user-provisioned',
				expect.objectContaining({ role: GLOBAL_MEMBER_ROLE.slug }),
			);
		});

		it('keys the binding on the qualified sub, not the raw one', async () => {
			await service.resolve(makeClaims(), undefined, ctx(), true);

			expect(userRepository.createUserWithExternalIdentity).toHaveBeenCalledWith(
				expect.anything(),
				{
					providerId: qualifiedProviderId('https://issuer.example.com', 'external-user-1'),
					providerType: 'token-exchange',
				},
			);
		});

		it('throws when the role is not an existing global role', async () => {
			roleService.isGlobalRole.mockResolvedValue(false);

			await expect(
				service.resolve(makeClaims({ role: 'global:nonexistent' }), undefined, ctx(), true),
			).rejects.toThrow(TokenExchangeAuthError);
			expect(userRepository.createUserWithExternalIdentity).not.toHaveBeenCalled();
		});

		it('throws when a custom role is unlicensed', async () => {
			roleService.isRoleLicensed.mockReturnValue(false);

			await expect(
				service.resolve(makeClaims({ role: CUSTOM_ROLE }), undefined, ctx(), true),
			).rejects.toThrow(TokenExchangeAuthError);
			expect(userRepository.createUserWithExternalIdentity).not.toHaveBeenCalled();
		});

		it('throws on a global:owner role claim', async () => {
			await expect(
				service.resolve(makeClaims({ role: 'global:owner' }), undefined, ctx(), true),
			).rejects.toThrow(TokenExchangeAuthError);
		});

		it('throws when the role is not in the key allowedRoles', async () => {
			await expect(
				service.resolve(makeClaims({ role: CUSTOM_ROLE }), ['global:member'], ctx(), true),
			).rejects.toThrow(TokenExchangeAuthError);
		});

		it('provisions when the role is in the key allowedRoles', async () => {
			await service.resolve(makeClaims({ role: CUSTOM_ROLE }), [CUSTOM_ROLE], ctx(), true);

			expect(userRepository.createUserWithExternalIdentity).toHaveBeenCalledWith(
				expect.objectContaining({ role: { slug: CUSTOM_ROLE } }),
				identity,
			);
		});
	});

	describe('role sync (existing user resolved by identity)', () => {
		function mockLinkedUser(currentRoleSlug: string) {
			const user = mock<User>({ id: 'existing-1', role: { slug: currentRoleSlug } });
			authIdentityRepository.findOne.mockResolvedValueOnce(
				mock<AuthIdentity>({ user, status: 'active' }),
			);
			userRepository.findOneOrFail.mockResolvedValue(user);
			return user;
		}

		it('changes to a licensed custom role and emits an update event', async () => {
			mockLinkedUser('global:member');

			await service.resolve(makeClaims({ role: CUSTOM_ROLE }), undefined, ctx(), true);

			expect(userService.changeUserRole).toHaveBeenCalledWith(expect.anything(), {
				newRoleName: CUSTOM_ROLE,
			});
			expect(eventService.emit).toHaveBeenCalledWith(
				'token-exchange-role-updated',
				expect.objectContaining({ previousRole: 'global:member', newRole: CUSTOM_ROLE }),
			);
		});

		it('ignores an unknown role claim', async () => {
			mockLinkedUser('global:member');
			roleService.isGlobalRole.mockResolvedValue(false);

			await service.resolve(makeClaims({ role: 'global:nonexistent' }), undefined, ctx(), true);

			expect(userService.changeUserRole).not.toHaveBeenCalled();
		});

		it('throws when a custom role is unlicensed', async () => {
			mockLinkedUser('global:member');
			roleService.isRoleLicensed.mockReturnValue(false);

			await expect(
				service.resolve(makeClaims({ role: CUSTOM_ROLE }), undefined, ctx(), true),
			).rejects.toThrow(TokenExchangeAuthError);
			expect(userService.changeUserRole).not.toHaveBeenCalled();
		});

		it('never changes the role of an existing owner', async () => {
			mockLinkedUser('global:owner');

			await service.resolve(makeClaims({ role: CUSTOM_ROLE }), undefined, ctx(), true);

			expect(userService.changeUserRole).not.toHaveBeenCalled();
		});

		it('ignores a global:owner role claim', async () => {
			mockLinkedUser('global:member');

			await service.resolve(makeClaims({ role: 'global:owner' }), undefined, ctx(), true);

			expect(userService.changeUserRole).not.toHaveBeenCalled();
		});

		it('throws when the custom role is not in the key allowedRoles', async () => {
			mockLinkedUser('global:member');

			await expect(
				service.resolve(makeClaims({ role: CUSTOM_ROLE }), ['global:member'], ctx(), true),
			).rejects.toThrow(TokenExchangeAuthError);
			expect(userService.changeUserRole).not.toHaveBeenCalled();
		});
	});

	describe('allowedRoles authority ceiling', () => {
		it('rejects when a key authenticates as an existing user whose role exceeds allowedRoles (email match)', async () => {
			userRepository.findOne.mockResolvedValue(makeUser('global:owner'));

			await expect(
				service.resolve(makeClaims(), ['global:member'], ctx(), true),
			).rejects.toMatchObject({
				reason: TokenExchangeFailureReason.RoleNotAllowed,
			});
		});

		it('rejects when an already-linked identity resolves to a user whose role exceeds allowedRoles', async () => {
			authIdentityRepository.findOne.mockResolvedValueOnce(
				mock<AuthIdentity>({ user: makeUser('global:owner'), status: 'active' }),
			);

			await expect(
				service.resolve(makeClaims(), ['global:member'], ctx(), true),
			).rejects.toBeInstanceOf(TokenExchangeAuthError);
		});

		it('resolves the existing user when its role is within allowedRoles', async () => {
			const member = makeUser('global:member');
			userRepository.findOne.mockResolvedValue(member);

			await expect(service.resolve(makeClaims(), ['global:member'], ctx(), true)).resolves.toBe(
				member,
			);
		});

		it('resolves any existing user when allowedRoles is undefined (unrestricted)', async () => {
			const owner = makeUser('global:owner');
			userRepository.findOne.mockResolvedValue(owner);

			await expect(service.resolve(makeClaims(), undefined, ctx(), true)).resolves.toBe(owner);
		});
	});

	describe('excludeOwner lockout', () => {
		it('rejects an owner even when allowedRoles explicitly permits it', async () => {
			config.excludeOwner = true;
			userRepository.findOne.mockResolvedValue(makeUser('global:owner'));

			await expect(
				service.resolve(makeClaims(), ['global:owner'], ctx(), true),
			).rejects.toMatchObject({
				reason: TokenExchangeFailureReason.RoleNotAllowed,
			});
		});
	});

	describe('requireVerifiedEmail', () => {
		it('rejects email-fallback linking when email_verified is missing', async () => {
			userRepository.findOne.mockResolvedValue(makeUser('global:member'));

			await expect(
				service.resolve(makeClaims(), ['global:member'], ctx(true), true),
			).rejects.toMatchObject({ reason: TokenExchangeFailureReason.EmailNotVerified });
		});

		it('rejects JIT provisioning when email_verified is missing', async () => {
			// No existing identity and no existing user → JIT path.
			await expect(
				service.resolve(makeClaims(), ['global:member'], ctx(true), true),
			).rejects.toMatchObject({ reason: TokenExchangeFailureReason.EmailNotVerified });
		});

		it('links an existing user when email_verified is true', async () => {
			const member = makeUser('global:member');
			userRepository.findOne.mockResolvedValue(member);

			await expect(
				service.resolve(makeClaims({ email_verified: true }), ['global:member'], ctx(true), true),
			).resolves.toBe(member);
		});

		it('links without an email_verified claim when the key does not require it', async () => {
			const member = makeUser('global:member');
			userRepository.findOne.mockResolvedValue(member);

			await expect(
				service.resolve(makeClaims(), ['global:member'], ctx(false), true),
			).resolves.toBe(member);
		});
	});

	describe('SSO bridge (oidc → token-exchange)', () => {
		function mockOidcBoundUser(): User {
			const user = mock<User>({ id: 'oidc-user-1' });
			// 1st call: qualified token-exchange sub → miss. 2nd: legacy sub → miss.
			// 3rd: the bridge lookup, providerType 'oidc' → hit.
			authIdentityRepository.findOne
				.mockResolvedValueOnce(null)
				.mockResolvedValueOnce(null)
				.mockResolvedValueOnce(mock<AuthIdentity>({ user, status: 'active' }));
			return user;
		}

		it('resolves a user bound only via OIDC SSO login when the claim issuer matches', async () => {
			const user = mockOidcBoundUser();
			trustedKeyService.isSsoIssuer.mockResolvedValue(true);
			userRepository.findOneOrFail.mockResolvedValue(user);

			await expect(service.resolve(makeClaims(), undefined, ctx(), true)).resolves.toEqual(user);

			expect(authIdentityRepository.findOne).toHaveBeenCalledWith(
				expect.objectContaining({ where: { providerId: 'external-user-1', providerType: 'oidc' } }),
			);
			expect(userRepository.createUserWithExternalIdentity).not.toHaveBeenCalled();
		});

		it('resolves via the bridge with allowProvisioning: false, performing no writes', async () => {
			const user = mockOidcBoundUser();
			trustedKeyService.isSsoIssuer.mockResolvedValue(true);

			await expect(service.resolve(makeClaims(), undefined, ctx(), false)).resolves.toEqual(user);

			expect(userRepository.createUserWithExternalIdentity).not.toHaveBeenCalled();
			expect(authIdentityRepository.save).not.toHaveBeenCalled();
			expect(authIdentityRepository.update).not.toHaveBeenCalled();
			expect(userService.changeUserRole).not.toHaveBeenCalled();
			expect(eventService.emit).not.toHaveBeenCalled();
		});

		it('does not consult the bridge when the claim issuer is not SSO-derived', async () => {
			// Only the qualified + legacy token-exchange lookups are reached (both miss);
			// the bridge lookup itself must never be queried, so don't queue a 3rd value for it.
			authIdentityRepository.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
			trustedKeyService.isSsoIssuer.mockResolvedValue(false);

			await expect(service.resolve(makeClaims(), undefined, ctx(), false)).resolves.toBeNull();

			expect(authIdentityRepository.findOne).not.toHaveBeenCalledWith(
				expect.objectContaining({ where: expect.objectContaining({ providerType: 'oidc' }) }),
			);
		});

		it('does not consult the bridge when a token-exchange binding already matches', async () => {
			const user = mock<User>({ id: 'existing-1' });
			authIdentityRepository.findOne.mockResolvedValueOnce(
				mock<AuthIdentity>({ user, status: 'active' }),
			);
			userRepository.findOneOrFail.mockResolvedValue(user);
			trustedKeyService.isSsoIssuer.mockResolvedValue(true);

			await expect(service.resolve(makeClaims(), undefined, ctx(), true)).resolves.toEqual(user);

			expect(trustedKeyService.isSsoIssuer).not.toHaveBeenCalled();
		});
	});

	describe('allowProvisioning: false (per-access resolution)', () => {
		it('returns null for an unknown (iss, sub) without creating a user', async () => {
			await expect(service.resolve(makeClaims(), undefined, ctx(), false)).resolves.toBeNull();

			expect(userRepository.createUserWithExternalIdentity).not.toHaveBeenCalled();
			expect(authIdentityRepository.save).not.toHaveBeenCalled();
			expect(eventService.emit).not.toHaveBeenCalled();
		});

		it('does not fall back to email matching when unbound', async () => {
			userRepository.findOne.mockResolvedValue(makeUser('global:member'));

			await expect(service.resolve(makeClaims(), undefined, ctx(), false)).resolves.toBeNull();

			expect(userRepository.findOne).not.toHaveBeenCalled();
		});

		it('resolves an already-bound identity without syncing profile or role', async () => {
			const user = mock<User>({ id: 'existing-1', role: { slug: 'global:member' } });
			authIdentityRepository.findOne.mockResolvedValueOnce(
				mock<AuthIdentity>({ user, status: 'active' }),
			);

			await expect(
				service.resolve(makeClaims({ role: CUSTOM_ROLE }), undefined, ctx(), false),
			).resolves.toEqual(user);

			expect(userService.changeUserRole).not.toHaveBeenCalled();
			expect(userRepository.update).not.toHaveBeenCalled();
		});

		it('never throws for an unbound identity — resolves to null', async () => {
			await expect(
				service.resolve(makeClaims({ role: 'global:owner' }), undefined, ctx(), false),
			).resolves.toBeNull();
		});

		it.each(['suspended', 'revoked'] as const)(
			'returns null for a %s binding instead of the bound user',
			async (status) => {
				const user = mock<User>({ id: 'existing-1' });
				authIdentityRepository.findOne.mockResolvedValueOnce(mock<AuthIdentity>({ user, status }));

				await expect(service.resolve(makeClaims(), undefined, ctx(), false)).resolves.toBeNull();
			},
		);
	});
});
