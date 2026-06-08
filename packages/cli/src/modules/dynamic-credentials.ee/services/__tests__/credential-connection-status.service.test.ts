import type { SharedCredentialsRepository, User, UserRepository } from '@n8n/db';
import type { EntityManager } from '@n8n/typeorm';
import { mock } from 'jest-mock-extended';

import type { RoleService } from '@/services/role.service';

import { DynamicCredentialUserEntry } from '../../database/entities/dynamic-credential-user-entry';
import type { DynamicCredentialUserEntryRepository } from '../../database/repositories/dynamic-credential-user-entry.repository';
import { CredentialConnectionStatusService } from '../credential-connection-status.service';

/** Build a minimal User-shaped object that satisfies `hasGlobalScope`. */
const makeUser = (id: string, globalScopes: string[] = []): User =>
	({ id, role: { scopes: globalScopes.map((slug) => ({ slug })) } }) as unknown as User;

const makeEntry = (credentialId: string, userId: string): DynamicCredentialUserEntry => {
	const e = new DynamicCredentialUserEntry();
	e.credentialId = credentialId;
	e.userId = userId;
	return e;
};

describe('CredentialConnectionStatusService', () => {
	const repository = mock<DynamicCredentialUserEntryRepository>();
	const userRepository = mock<UserRepository>();
	const sharedCredentialsRepository = mock<SharedCredentialsRepository>();
	const roleService = mock<RoleService>();
	const em = mock<EntityManager>();

	const service = new CredentialConnectionStatusService(
		repository,
		userRepository,
		sharedCredentialsRepository,
		roleService,
	);

	const CRED_ID = 'cred-1';
	const VALID_CRED_ROLES = ['credential:owner', 'credential:user'];

	beforeEach(() => {
		jest.clearAllMocks();
		roleService.rolesWithScope.mockResolvedValue(VALID_CRED_ROLES);
	});

	// ─────────────────────────── early-exit guards ────────────────────────────

	describe('cleanupOrphanedEntriesForUsers', () => {
		it('is a no-op when userIds is empty', async () => {
			await service.cleanupOrphanedEntriesForUsers([], em);

			expect(em.find).not.toHaveBeenCalled();
			expect(repository.deleteByPairs).not.toHaveBeenCalled();
		});

		it('is a no-op when no entries exist for the given users', async () => {
			em.find.mockResolvedValueOnce([]);

			await service.cleanupOrphanedEntriesForUsers(['user-1'], em);

			expect(repository.deleteByPairs).not.toHaveBeenCalled();
		});
	});

	// ───────────── selectOrphanedPairs — decision matrix ─────────────────────

	describe('selectOrphanedPairs (via cleanupOrphanedEntriesForUsers)', () => {
		it('marks pair as orphaned when the user has been deleted from the DB', async () => {
			// ARRANGE
			em.find.mockResolvedValueOnce([makeEntry(CRED_ID, 'deleted-user')]);
			userRepository.find.mockResolvedValueOnce([]); // user no longer exists

			// ACT
			await service.cleanupOrphanedEntriesForUsers(['deleted-user'], em);

			// ASSERT — deleted user → always orphaned
			expect(repository.deleteByPairs).toHaveBeenCalledWith(
				[{ credentialId: CRED_ID, userId: 'deleted-user' }],
				em,
			);
		});

		it('retains pair for a global admin (has credential:update in global role scopes)', async () => {
			// ARRANGE
			const admin = makeUser('admin-1', ['credential:update']);
			em.find.mockResolvedValueOnce([makeEntry(CRED_ID, 'admin-1')]);
			userRepository.find.mockResolvedValueOnce([admin]);
			// Even if the project check returned nothing, admin is retained in-memory
			sharedCredentialsRepository.findPairsWithCredentialAccess.mockResolvedValueOnce([]);

			// ACT
			await service.cleanupOrphanedEntriesForUsers(['admin-1'], em);

			// ASSERT — hasGlobalScope is true → pair retained → nothing deleted
			expect(repository.deleteByPairs).not.toHaveBeenCalled();
		});

		it('retains pair for a member who still has project-level credential:update', async () => {
			// ARRANGE
			const member = makeUser('member-1'); // no global scope
			em.find.mockResolvedValueOnce([makeEntry(CRED_ID, 'member-1')]);
			userRepository.find.mockResolvedValueOnce([member]);
			// DB check confirms the project path is still alive
			sharedCredentialsRepository.findPairsWithCredentialAccess.mockResolvedValueOnce([
				{ credentialId: CRED_ID, userId: 'member-1' },
			]);

			// ACT
			await service.cleanupOrphanedEntriesForUsers(['member-1'], em);

			// ASSERT — project path still valid → pair retained
			expect(repository.deleteByPairs).not.toHaveBeenCalled();
		});

		it('deletes pair for a member who lost all credential:update access paths', async () => {
			// ARRANGE
			const member = makeUser('member-1'); // no global scope
			em.find.mockResolvedValueOnce([makeEntry(CRED_ID, 'member-1')]);
			userRepository.find.mockResolvedValueOnce([member]);
			// No retained pairs — member was unshared / removed / role downgraded
			sharedCredentialsRepository.findPairsWithCredentialAccess.mockResolvedValueOnce([]);

			// ACT
			await service.cleanupOrphanedEntriesForUsers(['member-1'], em);

			// ASSERT — no access path survives → pair is orphaned
			expect(repository.deleteByPairs).toHaveBeenCalledWith(
				[{ credentialId: CRED_ID, userId: 'member-1' }],
				em,
			);
		});

		it('retains pair for a multi-path consumer when at least one project path survives', async () => {
			// ARRANGE — user has entries for the same credential under two resolvers;
			// deduplication in deleteOrphanedPairs collapses them to one logical pair.
			const member = makeUser('member-1');
			em.find.mockResolvedValueOnce([
				makeEntry(CRED_ID, 'member-1'), // resolver A
				makeEntry(CRED_ID, 'member-1'), // resolver B (duplicate pair)
			]);
			userRepository.find.mockResolvedValueOnce([member]);
			// One project path was removed, but the second survives
			sharedCredentialsRepository.findPairsWithCredentialAccess.mockResolvedValueOnce([
				{ credentialId: CRED_ID, userId: 'member-1' },
			]);

			// ACT
			await service.cleanupOrphanedEntriesForUsers(['member-1'], em);

			// ASSERT — surviving path keeps the entry
			expect(repository.deleteByPairs).not.toHaveBeenCalled();
		});

		it('handles mixed batch: deletes orphaned pair and retains the one with access', async () => {
			// ARRANGE
			const lostMember = makeUser('user-lost');
			const activeMember = makeUser('user-active');
			const CRED_A = 'cred-a';
			const CRED_B = 'cred-b';

			em.find.mockResolvedValueOnce([
				makeEntry(CRED_A, 'user-lost'),
				makeEntry(CRED_B, 'user-active'),
			]);
			userRepository.find.mockResolvedValueOnce([lostMember, activeMember]);
			// Only user-active retains access
			sharedCredentialsRepository.findPairsWithCredentialAccess.mockResolvedValueOnce([
				{ credentialId: CRED_B, userId: 'user-active' },
			]);

			// ACT
			await service.cleanupOrphanedEntriesForUsers(['user-lost', 'user-active'], em);

			// ASSERT — only the orphaned pair is deleted
			expect(repository.deleteByPairs).toHaveBeenCalledWith(
				[{ credentialId: CRED_A, userId: 'user-lost' }],
				em,
			);
		});
	});

	describe('deleteOrphanedPairs — DB check scope', () => {
		it('skips the project DB check when every user has been deleted', async () => {
			// ARRANGE — no user record in DB → pairsToCheck is empty → DB query skipped
			em.find.mockResolvedValueOnce([makeEntry(CRED_ID, 'ghost-user')]);
			userRepository.find.mockResolvedValueOnce([]);

			// ACT
			await service.cleanupOrphanedEntriesForUsers(['ghost-user'], em);

			// ASSERT
			expect(sharedCredentialsRepository.findPairsWithCredentialAccess).not.toHaveBeenCalled();
			expect(repository.deleteByPairs).toHaveBeenCalledWith(
				[{ credentialId: CRED_ID, userId: 'ghost-user' }],
				em,
			);
		});
	});
});
