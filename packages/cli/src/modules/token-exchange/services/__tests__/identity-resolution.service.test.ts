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

import { TokenExchangeAuthError } from '../../token-exchange.errors';
import type { ExternalTokenClaims } from '../../token-exchange.schemas';
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

const service = new IdentityResolutionService(
	logger,
	userRepository,
	authIdentityRepository,
	eventService,
	userService,
	trustedKeyService,
	roleService,
);

const CUSTOM_ROLE = 'global:custom-abc123';

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

describe('IdentityResolutionService', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		roleService.isGlobalRole.mockResolvedValue(true);
		roleService.isRoleLicensed.mockReturnValue(true);
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
			const user = await service.resolve(makeClaims({ role: CUSTOM_ROLE }));

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
			await service.resolve(makeClaims({ role: 'global:member' }));

			expect(roleService.isRoleLicensed).not.toHaveBeenCalled();
			expect(userRepository.createUserWithProject).toHaveBeenCalledWith(
				expect.objectContaining({ role: { slug: 'global:member' } }),
				trx,
			);
		});

		it('defaults to global:member when no role claim is present', async () => {
			await service.resolve(makeClaims());

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

			await expect(service.resolve(makeClaims({ role: 'global:nonexistent' }))).rejects.toThrow(
				TokenExchangeAuthError,
			);
			expect(userRepository.createUserWithProject).not.toHaveBeenCalled();
		});

		it('throws when a custom role is unlicensed', async () => {
			roleService.isRoleLicensed.mockReturnValue(false);

			await expect(service.resolve(makeClaims({ role: CUSTOM_ROLE }))).rejects.toThrow(
				TokenExchangeAuthError,
			);
			expect(userRepository.createUserWithProject).not.toHaveBeenCalled();
		});

		it('throws on a global:owner role claim', async () => {
			await expect(service.resolve(makeClaims({ role: 'global:owner' }))).rejects.toThrow(
				TokenExchangeAuthError,
			);
		});

		it('throws when the role is not in the key allowedRoles', async () => {
			await expect(
				service.resolve(makeClaims({ role: CUSTOM_ROLE }), ['global:member']),
			).rejects.toThrow(TokenExchangeAuthError);
		});

		it('provisions when the role is in the key allowedRoles', async () => {
			await service.resolve(makeClaims({ role: CUSTOM_ROLE }), [CUSTOM_ROLE]);

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

			await service.resolve(makeClaims({ role: CUSTOM_ROLE }));

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

			await service.resolve(makeClaims({ role: 'global:nonexistent' }));

			expect(userService.changeUserRole).not.toHaveBeenCalled();
		});

		it('throws when a custom role is unlicensed', async () => {
			mockLinkedUser('global:member');
			roleService.isRoleLicensed.mockReturnValue(false);

			await expect(service.resolve(makeClaims({ role: CUSTOM_ROLE }))).rejects.toThrow(
				TokenExchangeAuthError,
			);
			expect(userService.changeUserRole).not.toHaveBeenCalled();
		});

		it('never changes the role of an existing owner', async () => {
			mockLinkedUser('global:owner');

			await service.resolve(makeClaims({ role: CUSTOM_ROLE }));

			expect(userService.changeUserRole).not.toHaveBeenCalled();
		});

		it('ignores a global:owner role claim', async () => {
			mockLinkedUser('global:member');

			await service.resolve(makeClaims({ role: 'global:owner' }));

			expect(userService.changeUserRole).not.toHaveBeenCalled();
		});

		it('throws when the custom role is not in the key allowedRoles', async () => {
			mockLinkedUser('global:member');

			await expect(
				service.resolve(makeClaims({ role: CUSTOM_ROLE }), ['global:member']),
			).rejects.toThrow(TokenExchangeAuthError);
			expect(userService.changeUserRole).not.toHaveBeenCalled();
		});
	});
});
