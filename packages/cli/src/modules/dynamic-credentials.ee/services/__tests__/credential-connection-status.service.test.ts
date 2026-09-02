import type { Logger } from '@n8n/backend-common';
import type {
	ProjectRelationRepository,
	SharedCredentialsRepository,
	User,
	UserRepository,
} from '@n8n/db';
import type { EntityManager } from '@n8n/typeorm';
import type { Cipher } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import type { RoleService } from '@/services/role.service';

import { SYSTEM_RESOLVER_ID } from '../../constants';
import { DynamicCredentialUserEntry } from '../../database/entities/dynamic-credential-user-entry';
import type { DynamicCredentialUserEntryRepository } from '../../database/repositories/dynamic-credential-user-entry.repository';
import { CredentialConnectionStatusService } from '../credential-connection-status.service';

/** Build a minimal User-shaped object that satisfies `hasGlobalScope`. */
const makeUser = (id: string, globalScopes: string[] = []): User =>
	({ id, role: { scopes: globalScopes.map((slug) => ({ slug })) } }) as unknown as User;

const makeEntry = (credentialId: string, userId: string, data = ''): DynamicCredentialUserEntry => {
	const e = new DynamicCredentialUserEntry();
	e.credentialId = credentialId;
	e.userId = userId;
	e.data = data;
	return e;
};

describe('CredentialConnectionStatusService', () => {
	const repository = mock<DynamicCredentialUserEntryRepository>();
	const userRepository = mock<UserRepository>();
	const sharedCredentialsRepository = mock<SharedCredentialsRepository>();
	const roleService = mock<RoleService>();
	const projectRelationRepository = mock<ProjectRelationRepository>();
	const cipher = mock<Cipher>();
	const logger = mock<Logger>();
	const em = mock<EntityManager>();

	const service = new CredentialConnectionStatusService(
		repository,
		userRepository,
		sharedCredentialsRepository,
		roleService,
		projectRelationRepository,
		cipher,
		logger,
	);

	const CRED_ID = 'cred-1';
	const VALID_CRED_ROLES = ['credential:owner', 'credential:user'];

	beforeEach(() => {
		vi.clearAllMocks();
		roleService.rolesWithScope.mockResolvedValue(VALID_CRED_ROLES);
	});

	// ──────────────────────────── findMyConnections ───────────────────────────

	describe('findMyConnections', () => {
		const storedToken = (tokenData: Record<string, unknown>) =>
			JSON.stringify({ oauthTokenData: tokenData });

		it('returns an empty map without querying when no credential ids are given', async () => {
			const result = await service.findMyConnections('user-1', []);

			expect(result.size).toBe(0);
			expect(repository.find).not.toHaveBeenCalled();
		});

		it('reports the provider account the stored token belongs to', async () => {
			repository.find.mockResolvedValueOnce([makeEntry(CRED_ID, 'user-1', 'encrypted')]);
			cipher.decryptV2.mockResolvedValueOnce(storedToken({ email: 'me@gmail.com' }));

			const result = await service.findMyConnections('user-1', [CRED_ID]);

			expect(result.get(CRED_ID)).toEqual({ accountIdentifier: 'me@gmail.com' });
		});

		it('scopes the lookup to the caller and the system resolver', async () => {
			repository.find.mockResolvedValueOnce([]);

			await service.findMyConnections('user-1', [CRED_ID]);

			expect(repository.find).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({ userId: 'user-1', resolverId: SYSTEM_RESOLVER_ID }),
				}),
			);
		});

		it('reports a connection with no account when the token carries no identity', async () => {
			// Gmail asks for no identity scope, so Google returns no id_token. Routine,
			// so it must stay silent rather than look like a failure.
			repository.find.mockResolvedValueOnce([makeEntry(CRED_ID, 'user-1', 'encrypted')]);
			cipher.decryptV2.mockResolvedValueOnce(storedToken({ access_token: 'tok' }));

			const result = await service.findMyConnections('user-1', [CRED_ID]);

			expect(result.has(CRED_ID)).toBe(true);
			expect(result.get(CRED_ID)?.accountIdentifier).toBeUndefined();
			expect(logger.warn).not.toHaveBeenCalled();
		});

		it('warns but still reports a connection when its entry cannot be decrypted', async () => {
			// Unreadable stored data breaks the credential at execution too, so it is
			// not the same class of event as a token without an identity claim.
			repository.find.mockResolvedValueOnce([makeEntry(CRED_ID, 'user-1', 'unreadable')]);
			cipher.decryptV2.mockRejectedValueOnce(new Error('bad decrypt'));

			const result = await service.findMyConnections('user-1', [CRED_ID]);

			expect(result.has(CRED_ID)).toBe(true);
			expect(result.get(CRED_ID)?.accountIdentifier).toBeUndefined();
			expect(logger.warn).toHaveBeenCalledWith(
				expect.stringContaining('Could not read the stored data'),
				expect.objectContaining({ credentialId: CRED_ID }),
			);
		});

		it('still reports a connection when its entry holds no token', async () => {
			repository.find.mockResolvedValueOnce([makeEntry(CRED_ID, 'user-1', 'encrypted')]);
			cipher.decryptV2.mockResolvedValueOnce(JSON.stringify({ apiKey: 'k' }));

			const result = await service.findMyConnections('user-1', [CRED_ID]);

			expect(result.has(CRED_ID)).toBe(true);
			expect(result.get(CRED_ID)?.accountIdentifier).toBeUndefined();
		});
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
			em.find.mockResolvedValueOnce([]); // user no longer exists

			// ACT
			await service.cleanupOrphanedEntriesForUsers(['deleted-user'], em);

			// ASSERT — deleted user → always orphaned
			expect(repository.deleteByPairs).toHaveBeenCalledWith(
				[{ credentialId: CRED_ID, userId: 'deleted-user' }],
				em,
			);
		});

		it('retains pair for a global admin (has credential:connect in global role scopes)', async () => {
			// ARRANGE
			const admin = makeUser('admin-1', ['credential:connect']);
			em.find.mockResolvedValueOnce([makeEntry(CRED_ID, 'admin-1')]);
			em.find.mockResolvedValueOnce([admin]);
			// Even if the project check returned nothing, admin is retained in-memory
			sharedCredentialsRepository.findPairsWithCredentialAccess.mockResolvedValueOnce([]);
			em.find.mockResolvedValueOnce([]); // no globally-connectable credentials

			// ACT
			await service.cleanupOrphanedEntriesForUsers(['admin-1'], em);

			// ASSERT — hasGlobalScope is true → pair retained → nothing deleted
			expect(repository.deleteByPairs).not.toHaveBeenCalled();
		});

		it('retains pair for a connect-only sharee (has credential:connect but not credential:update)', async () => {
			// ARRANGE — a `credential:user` sharee can still connect their own account,
			// so their per-user entry must survive even without edit rights.
			const sharee = makeUser('sharee-1'); // no global scope
			em.find.mockResolvedValueOnce([makeEntry(CRED_ID, 'sharee-1')]);
			em.find.mockResolvedValueOnce([sharee]);
			// Project path retained via credential:connect
			sharedCredentialsRepository.findPairsWithCredentialAccess.mockResolvedValueOnce([
				{ credentialId: CRED_ID, userId: 'sharee-1' },
			]);
			em.find.mockResolvedValueOnce([]); // no globally-connectable credentials

			// ACT
			await service.cleanupOrphanedEntriesForUsers(['sharee-1'], em);

			// ASSERT — retention is evaluated against credential:connect, not credential:update
			expect(roleService.rolesWithScope).toHaveBeenCalledWith(
				'credential',
				'credential:connect',
				em,
			);
			expect(sharedCredentialsRepository.findPairsWithCredentialAccess).toHaveBeenCalledWith(
				[{ credentialId: CRED_ID, userId: 'sharee-1' }],
				'credential:connect',
				VALID_CRED_ROLES,
				em,
			);
			expect(repository.deleteByPairs).not.toHaveBeenCalled();
		});

		it('retains pair for a member who still has project-level credential:update', async () => {
			// ARRANGE
			const member = makeUser('member-1'); // no global scope
			em.find.mockResolvedValueOnce([makeEntry(CRED_ID, 'member-1')]);
			em.find.mockResolvedValueOnce([member]);
			// DB check confirms the project path is still alive
			sharedCredentialsRepository.findPairsWithCredentialAccess.mockResolvedValueOnce([
				{ credentialId: CRED_ID, userId: 'member-1' },
			]);
			em.find.mockResolvedValueOnce([]); // no globally-connectable credentials

			// ACT
			await service.cleanupOrphanedEntriesForUsers(['member-1'], em);

			// ASSERT — project path still valid → pair retained
			expect(repository.deleteByPairs).not.toHaveBeenCalled();
		});

		it('deletes pair for a member who lost all credential:update access paths', async () => {
			// ARRANGE
			const member = makeUser('member-1'); // no global scope
			em.find.mockResolvedValueOnce([makeEntry(CRED_ID, 'member-1')]);
			em.find.mockResolvedValueOnce([member]);
			// No retained pairs — member was unshared / removed / role downgraded
			sharedCredentialsRepository.findPairsWithCredentialAccess.mockResolvedValueOnce([]);
			em.find.mockResolvedValueOnce([]); // no globally-connectable credentials

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
			em.find.mockResolvedValueOnce([member]);
			// One project path was removed, but the second survives
			sharedCredentialsRepository.findPairsWithCredentialAccess.mockResolvedValueOnce([
				{ credentialId: CRED_ID, userId: 'member-1' },
			]);
			em.find.mockResolvedValueOnce([]); // no globally-connectable credentials

			// ACT
			await service.cleanupOrphanedEntriesForUsers(['member-1'], em);

			// ASSERT — surviving path keeps the entry
			expect(repository.deleteByPairs).not.toHaveBeenCalled();
		});

		it('retains pair for a recipient of a global end-user credential share', async () => {
			// ARRANGE — no project share at all, only a global (isGlobal + isResolvable) share
			const recipient = makeUser('recipient-1'); // no global scope
			em.find.mockResolvedValueOnce([makeEntry(CRED_ID, 'recipient-1')]);
			em.find.mockResolvedValueOnce([recipient]);
			sharedCredentialsRepository.findPairsWithCredentialAccess.mockResolvedValueOnce([]);
			em.find.mockResolvedValueOnce([{ id: CRED_ID }]); // globally-connectable credential

			// ACT
			await service.cleanupOrphanedEntriesForUsers(['recipient-1'], em);

			// ASSERT — global end-user share retains the connection
			expect(repository.deleteByPairs).not.toHaveBeenCalled();
		});

		it('deletes pair when the credential is globally shared but not an end-user credential', async () => {
			// ARRANGE — a static global credential grants no connect access
			const recipient = makeUser('recipient-1'); // no global scope
			em.find.mockResolvedValueOnce([makeEntry(CRED_ID, 'recipient-1')]);
			em.find.mockResolvedValueOnce([recipient]);
			sharedCredentialsRepository.findPairsWithCredentialAccess.mockResolvedValueOnce([]);
			em.find.mockResolvedValueOnce([]); // not resolvable, so excluded from the query result

			// ACT
			await service.cleanupOrphanedEntriesForUsers(['recipient-1'], em);

			// ASSERT
			expect(repository.deleteByPairs).toHaveBeenCalledWith(
				[{ credentialId: CRED_ID, userId: 'recipient-1' }],
				em,
			);
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
			em.find.mockResolvedValueOnce([lostMember, activeMember]);
			// Only user-active retains access
			sharedCredentialsRepository.findPairsWithCredentialAccess.mockResolvedValueOnce([
				{ credentialId: CRED_B, userId: 'user-active' },
			]);
			em.find.mockResolvedValueOnce([]); // no globally-connectable credentials

			// ACT
			await service.cleanupOrphanedEntriesForUsers(['user-lost', 'user-active'], em);

			// ASSERT — only the orphaned pair is deleted
			expect(repository.deleteByPairs).toHaveBeenCalledWith(
				[{ credentialId: CRED_A, userId: 'user-lost' }],
				em,
			);
		});
	});

	describe('credentialId scoping', () => {
		it('scopes the entry scan to the given credential when credentialId is provided', async () => {
			em.find.mockResolvedValueOnce([]);

			await service.cleanupOrphanedEntriesForUsers(['user-1'], em, 'cred-9');

			expect(em.find).toHaveBeenCalledWith(
				DynamicCredentialUserEntry,
				expect.objectContaining({ where: expect.objectContaining({ credentialId: 'cred-9' }) }),
			);
		});

		it('does not filter by credential when credentialId is omitted', async () => {
			em.find.mockResolvedValueOnce([]);

			await service.cleanupOrphanedEntriesForUsers(['user-1'], em);

			const [, options] = em.find.mock.calls[0] as [unknown, { where: Record<string, unknown> }];
			expect(options.where).not.toHaveProperty('credentialId');
		});
	});

	describe('cleanupOrphanedEntriesForProjects', () => {
		it('is a no-op when projectIds is empty', async () => {
			await service.cleanupOrphanedEntriesForProjects('cred-1', [], em);

			expect(em.findBy).not.toHaveBeenCalled();
			expect(em.find).not.toHaveBeenCalled();
		});

		it('resolves distinct project members and prunes the credential scoped to them', async () => {
			em.findBy.mockResolvedValueOnce([
				{ userId: 'user-a' },
				{ userId: 'user-b' },
				{ userId: 'user-a' }, // duplicate across projects
			] as never);
			em.find.mockResolvedValueOnce([]); // no entries → early return

			await service.cleanupOrphanedEntriesForProjects('cred-1', ['proj-1', 'proj-2'], em);

			expect(em.findBy).toHaveBeenCalledWith(
				projectRelationRepository.target,
				expect.objectContaining({ projectId: expect.anything() }),
			);
			expect(em.find).toHaveBeenCalledWith(
				DynamicCredentialUserEntry,
				expect.objectContaining({ where: expect.objectContaining({ credentialId: 'cred-1' }) }),
			);
		});
	});

	describe('deleteOrphanedPairs — DB check scope', () => {
		it('skips the project DB check when every user has been deleted', async () => {
			// ARRANGE — no user record in DB → pairsToCheck is empty → DB query skipped
			em.find.mockResolvedValueOnce([makeEntry(CRED_ID, 'ghost-user')]);
			em.find.mockResolvedValueOnce([]);

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
