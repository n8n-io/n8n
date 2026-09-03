import type { Logger } from '@n8n/backend-common';
import {
	GLOBAL_MEMBER_ROLE,
	type AuthIdentity,
	type AuthIdentityRepository,
	type EntityManager,
	type User,
	type UserRepository,
} from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { EventService } from '@/events/event.service';
import type { RoleService } from '@/services/role.service';
import type { UserService } from '@/services/user.service';

import type { TokenExchangeConfig } from '../../token-exchange.config';
import { TokenExchangeAuthError } from '../../token-exchange.errors';
import type { ExternalTokenClaims } from '../../token-exchange.schemas';
import { TokenExchangeFailureReason } from '../../token-exchange.types';
import { IdentityResolutionService } from '../identity-resolution.service';
import type { TrustedKeyService } from '../trusted-key.service';

const logger = mock<Logger>({ scoped: vi.fn().mockReturnThis() });
const entityManager = mock<EntityManager>();
const userRepository = mock<UserRepository>({ manager: entityManager });
const authIdentityRepository = mock<AuthIdentityRepository>();
const eventService = mock<EventService>();
const userService = mock<UserService>();
const trustedKeyService = mock<TrustedKeyService>();
const roleService = mock<RoleService>();
const config = mock<TokenExchangeConfig>();

const service = new IdentityResolutionService(
	logger,
	userRepository,
	authIdentityRepository,
	eventService,
	userService,
	trustedKeyService,
	roleService,
	config,
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
	});

	describe('JIT provisioning (new user)', () => {
		const trx = entityManager;

		beforeEach(() => {
			// No existing identity, no existing user by email → JIT path.
			authIdentityRepository.findOne.mockResolvedValue(null);
			userRepository.findOne.mockResolvedValue(null);
			entityManager.transaction.mockImplementation(
				// @ts-expect-error overloaded signature
				async (runInTransaction: (em: EntityManager) => Promise<unknown>) =>
					await runInTransaction(trx),
			);
			userRepository.createUserWithProject.mockResolvedValue({
				user: mock<User>({ id: 'new-user-1' }),
				project: mock(),
			});
		});

		it('provisions a licensed custom global role', async () => {
			const user = await service.resolve(makeClaims({ role: CUSTOM_ROLE }), undefined, ctx());

			expect(user.id).toBe('new-user-1');
			expect(userRepository.createUserWithProject).toHaveBeenCalledWith(
				expect.objectContaining({ role: { slug: CUSTOM_ROLE } }),
				trx,
			);
			expect(eventService.emit).toHaveBeenCalledWith(
				'token-exchange-user-provisioned',
				expect.objectContaining({ role: CUSTOM_ROLE }),
			);
		});

		it('provisions a built-in global role without a license check', async () => {
			await service.resolve(makeClaims({ role: 'global:member' }), undefined, ctx());

			expect(roleService.isRoleLicensed).not.toHaveBeenCalled();
			expect(userRepository.createUserWithProject).toHaveBeenCalledWith(
				expect.objectContaining({ role: { slug: 'global:member' } }),
				trx,
			);
		});

		it('defaults to global:member when no role claim is present', async () => {
			await service.resolve(makeClaims(), undefined, ctx());

			expect(userRepository.createUserWithProject).toHaveBeenCalledWith(
				expect.objectContaining({ role: GLOBAL_MEMBER_ROLE }),
				trx,
			);
			expect(eventService.emit).toHaveBeenCalledWith(
				'token-exchange-user-provisioned',
				expect.objectContaining({ role: GLOBAL_MEMBER_ROLE.slug }),
			);
		});

		it('throws when the role is not an existing global role', async () => {
			roleService.isGlobalRole.mockResolvedValue(false);

			await expect(
				service.resolve(makeClaims({ role: 'global:nonexistent' }), undefined, ctx()),
			).rejects.toThrow(TokenExchangeAuthError);
			expect(userRepository.createUserWithProject).not.toHaveBeenCalled();
		});

		it('throws when a custom role is unlicensed', async () => {
			roleService.isRoleLicensed.mockReturnValue(false);

			await expect(
				service.resolve(makeClaims({ role: CUSTOM_ROLE }), undefined, ctx()),
			).rejects.toThrow(TokenExchangeAuthError);
			expect(userRepository.createUserWithProject).not.toHaveBeenCalled();
		});

		it('throws on a global:owner role claim', async () => {
			await expect(
				service.resolve(makeClaims({ role: 'global:owner' }), undefined, ctx()),
			).rejects.toThrow(TokenExchangeAuthError);
		});

		it('throws when the role is not in the key allowedRoles', async () => {
			await expect(
				service.resolve(makeClaims({ role: CUSTOM_ROLE }), ['global:member'], ctx()),
			).rejects.toThrow(TokenExchangeAuthError);
		});

		it('provisions when the role is in the key allowedRoles', async () => {
			await service.resolve(makeClaims({ role: CUSTOM_ROLE }), [CUSTOM_ROLE], ctx());

			expect(userRepository.createUserWithProject).toHaveBeenCalledWith(
				expect.objectContaining({ role: { slug: CUSTOM_ROLE } }),
				trx,
			);
		});
	});

	describe('role sync (existing user resolved by identity)', () => {
		function mockLinkedUser(currentRoleSlug: string) {
			const user = mock<User>({ id: 'existing-1', role: { slug: currentRoleSlug } });
			authIdentityRepository.findOne.mockResolvedValueOnce(mock<AuthIdentity>({ user }));
			userRepository.findOneOrFail.mockResolvedValue(user);
			return user;
		}

		it('changes to a licensed custom role and emits an update event', async () => {
			mockLinkedUser('global:member');

			await service.resolve(makeClaims({ role: CUSTOM_ROLE }), undefined, ctx());

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

			await service.resolve(makeClaims({ role: 'global:nonexistent' }), undefined, ctx());

			expect(userService.changeUserRole).not.toHaveBeenCalled();
		});

		it('throws when a custom role is unlicensed', async () => {
			mockLinkedUser('global:member');
			roleService.isRoleLicensed.mockReturnValue(false);

			await expect(
				service.resolve(makeClaims({ role: CUSTOM_ROLE }), undefined, ctx()),
			).rejects.toThrow(TokenExchangeAuthError);
			expect(userService.changeUserRole).not.toHaveBeenCalled();
		});

		it('never changes the role of an existing owner', async () => {
			mockLinkedUser('global:owner');

			await service.resolve(makeClaims({ role: CUSTOM_ROLE }), undefined, ctx());

			expect(userService.changeUserRole).not.toHaveBeenCalled();
		});

		it('ignores a global:owner role claim', async () => {
			mockLinkedUser('global:member');

			await service.resolve(makeClaims({ role: 'global:owner' }), undefined, ctx());

			expect(userService.changeUserRole).not.toHaveBeenCalled();
		});

		it('throws when the custom role is not in the key allowedRoles', async () => {
			mockLinkedUser('global:member');

			await expect(
				service.resolve(makeClaims({ role: CUSTOM_ROLE }), ['global:member'], ctx()),
			).rejects.toThrow(TokenExchangeAuthError);
			expect(userService.changeUserRole).not.toHaveBeenCalled();
		});
	});

	describe('allowedRoles authority ceiling', () => {
		it('rejects when a key authenticates as an existing user whose role exceeds allowedRoles (email match)', async () => {
			userRepository.findOne.mockResolvedValue(makeUser('global:owner'));

			await expect(service.resolve(makeClaims(), ['global:member'], ctx())).rejects.toMatchObject({
				reason: TokenExchangeFailureReason.RoleNotAllowed,
			});
		});

		it('rejects when an already-linked identity resolves to a user whose role exceeds allowedRoles', async () => {
			authIdentityRepository.findOne.mockResolvedValueOnce(
				mock<AuthIdentity>({ user: makeUser('global:owner') }),
			);

			await expect(service.resolve(makeClaims(), ['global:member'], ctx())).rejects.toBeInstanceOf(
				TokenExchangeAuthError,
			);
		});

		it('resolves the existing user when its role is within allowedRoles', async () => {
			const member = makeUser('global:member');
			userRepository.findOne.mockResolvedValue(member);

			await expect(service.resolve(makeClaims(), ['global:member'], ctx())).resolves.toBe(member);
		});

		it('resolves any existing user when allowedRoles is undefined (unrestricted)', async () => {
			const owner = makeUser('global:owner');
			userRepository.findOne.mockResolvedValue(owner);

			await expect(service.resolve(makeClaims(), undefined, ctx())).resolves.toBe(owner);
		});
	});

	describe('excludeOwner lockout', () => {
		it('rejects an owner even when allowedRoles explicitly permits it', async () => {
			config.excludeOwner = true;
			userRepository.findOne.mockResolvedValue(makeUser('global:owner'));

			await expect(service.resolve(makeClaims(), ['global:owner'], ctx())).rejects.toMatchObject({
				reason: TokenExchangeFailureReason.RoleNotAllowed,
			});
		});
	});

	describe('requireVerifiedEmail', () => {
		it('rejects email-fallback linking when email_verified is missing', async () => {
			userRepository.findOne.mockResolvedValue(makeUser('global:member'));

			await expect(
				service.resolve(makeClaims(), ['global:member'], ctx(true)),
			).rejects.toMatchObject({ reason: TokenExchangeFailureReason.EmailNotVerified });
		});

		it('rejects JIT provisioning when email_verified is missing', async () => {
			// No existing identity and no existing user → JIT path.
			await expect(
				service.resolve(makeClaims(), ['global:member'], ctx(true)),
			).rejects.toMatchObject({ reason: TokenExchangeFailureReason.EmailNotVerified });
		});

		it('links an existing user when email_verified is true', async () => {
			const member = makeUser('global:member');
			userRepository.findOne.mockResolvedValue(member);

			await expect(
				service.resolve(makeClaims({ email_verified: true }), ['global:member'], ctx(true)),
			).resolves.toBe(member);
		});

		it('links without an email_verified claim when the key does not require it', async () => {
			const member = makeUser('global:member');
			userRepository.findOne.mockResolvedValue(member);

			await expect(service.resolve(makeClaims(), ['global:member'], ctx(false))).resolves.toBe(
				member,
			);
		});
	});
});
