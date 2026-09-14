import { generateNanoId, type OperationContext, type TransactionRunner } from '@n8n/db';
import { UnexpectedError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { mockEntityManager } from '@test/mocking';

import { TypeAvailabilityPolicyScope } from '../../entities/type-availability-policy-scope.entity';
import { TypeAvailabilityPolicy } from '../../entities/type-availability-policy.entity';
import { TypeAvailabilityPolicyScopeRepository } from '../type-availability-policy-scope.repository';
import { TypeAvailabilityPolicyRepository } from '../type-availability-policy.repository';

vi.mock('@n8n/db', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/db')>()),
	generateNanoId: vi.fn(),
}));

const ROOT: OperationContext = {};

function setDriver(
	entityManager: ReturnType<typeof mockEntityManager>,
	type: 'postgres' | 'sqlite',
) {
	Object.assign(entityManager.connection, { options: { type } });
}

/**
 * The row lock is Postgres-only (see `forUpdateLock`'s doc comment): SQLite's single writer
 * connection already serialises transactions, so a row lock there would be a no-op at best.
 * These exercise both sides of that branch directly, since the integration suite runs against
 * whichever driver the job configured and cannot be relied on to cover both.
 */
describe('row locks depend on the driver', () => {
	describe('TypeAvailabilityPolicyScopeRepository', () => {
		const entityManager = mockEntityManager(TypeAvailabilityPolicyScope);
		const transactionRunner = mock<TransactionRunner>();
		const repository = new TypeAvailabilityPolicyScopeRepository(
			entityManager.connection,
			transactionRunner,
		);

		beforeEach(() => {
			vi.clearAllMocks();
			transactionRunner.run.mockImplementation(async (_ctx, fn) => await fn(ROOT));
			entityManager.findOne.mockResolvedValue(null);
			entityManager.find.mockResolvedValue([]);
		});

		it('does not lock a plain read, even on Postgres', async () => {
			setDriver(entityManager, 'postgres');

			await repository.findScopeByKindAndProject('node-types', null, ROOT);

			expect(entityManager.findOne).toHaveBeenCalledWith(TypeAvailabilityPolicyScope, {
				where: { kind: 'node-types', projectId: expect.anything() },
			});
		});

		it('does not lock on SQLite even when forUpdate is requested', async () => {
			setDriver(entityManager, 'sqlite');

			await repository.findScopeByKindAndProject('node-types', null, ROOT, true);

			expect(entityManager.findOne).toHaveBeenCalledWith(TypeAvailabilityPolicyScope, {
				where: { kind: 'node-types', projectId: expect.anything() },
			});
		});

		it('locks the row on Postgres when forUpdate is requested', async () => {
			setDriver(entityManager, 'postgres');

			await repository.findScopeByKindAndProject('node-types', null, ROOT, true);

			expect(entityManager.findOne).toHaveBeenCalledWith(TypeAvailabilityPolicyScope, {
				where: { kind: 'node-types', projectId: expect.anything() },
				lock: { mode: 'pessimistic_write' },
			});
		});

		it('locks findScopeById on Postgres when forUpdate is requested', async () => {
			setDriver(entityManager, 'postgres');

			await repository.findScopeById('scope-1', ROOT, true);

			expect(entityManager.findOne).toHaveBeenCalledWith(TypeAvailabilityPolicyScope, {
				where: { id: 'scope-1' },
				lock: { mode: 'pessimistic_write' },
			});
		});

		it('does not lock findScopeById without forUpdate, even on Postgres', async () => {
			setDriver(entityManager, 'postgres');

			await repository.findScopeById('scope-1', ROOT);

			expect(entityManager.findOne).toHaveBeenCalledWith(TypeAvailabilityPolicyScope, {
				where: { id: 'scope-1' },
			});
		});

		it('locks every batch on Postgres when locking several scopes', async () => {
			setDriver(entityManager, 'postgres');
			entityManager.find.mockResolvedValue([{ id: 'a' }, { id: 'b' }] as never);

			const found = await repository.lockScopesByIds(['b', 'a'], ROOT);

			expect(entityManager.find).toHaveBeenCalledWith(
				TypeAvailabilityPolicyScope,
				expect.objectContaining({ lock: { mode: 'pessimistic_write' } }),
			);
			expect(found).toEqual(['a', 'b']);
		});

		it('does not lock while locking scopes on SQLite', async () => {
			setDriver(entityManager, 'sqlite');

			await repository.lockScopesByIds(['a'], ROOT);

			expect(entityManager.find).toHaveBeenCalledWith(
				TypeAvailabilityPolicyScope,
				expect.not.objectContaining({ lock: expect.anything() }),
			);
		});

		it('returns null from updateDefaultAction when the scope does not exist', async () => {
			entityManager.findOneBy.mockResolvedValue(null);

			expect(await repository.updateDefaultAction('missing', 'deny', 'user-1', ROOT)).toBeNull();
			expect(entityManager.update).not.toHaveBeenCalled();
		});

		it('bumps every batch when more ids are named than fit in one query', async () => {
			// One batch per ID_QUERY_BATCH_SIZE (10,000) ids, so this forces a second batch.
			const ids = Array.from({ length: 10_001 }, (_, i) => `id-${i}`);

			await repository.bumpVersions(ids, ROOT);

			expect(entityManager.increment).toHaveBeenCalledTimes(2);
		});

		describe('containsProjectScope', () => {
			it('is false for an empty id list without querying', async () => {
				expect(await repository.containsProjectScope([], ROOT)).toBe(false);
				expect(entityManager.count).not.toHaveBeenCalled();
			});

			it('counts only rows with a non-null projectId', async () => {
				entityManager.count.mockResolvedValue(0);

				expect(await repository.containsProjectScope(['a', 'b'], ROOT)).toBe(false);

				expect(entityManager.count).toHaveBeenCalledWith(TypeAvailabilityPolicyScope, {
					where: { id: expect.anything(), projectId: expect.anything() },
				});
			});

			it('stops at the first batch that contains a project scope', async () => {
				entityManager.count.mockResolvedValueOnce(1);
				const ids = Array.from({ length: 10_001 }, (_, i) => `id-${i}`);

				expect(await repository.containsProjectScope(ids, ROOT)).toBe(true);

				expect(entityManager.count).toHaveBeenCalledTimes(1);
			});

			it('checks every batch when none contains a project scope', async () => {
				entityManager.count.mockResolvedValue(0);
				const ids = Array.from({ length: 10_001 }, (_, i) => `id-${i}`);

				expect(await repository.containsProjectScope(ids, ROOT)).toBe(false);

				expect(entityManager.count).toHaveBeenCalledTimes(2);
			});
		});

		describe('createScopeIfAbsent', () => {
			const queryBuilder = {
				insert: vi.fn().mockReturnThis(),
				into: vi.fn().mockReturnThis(),
				values: vi.fn().mockReturnThis(),
				orIgnore: vi.fn().mockReturnThis(),
				execute: vi.fn().mockResolvedValue(undefined),
			};

			beforeEach(() => {
				queryBuilder.insert.mockClear().mockReturnThis();
				queryBuilder.into.mockClear().mockReturnThis();
				queryBuilder.values.mockClear().mockReturnThis();
				queryBuilder.orIgnore.mockClear().mockReturnThis();
				queryBuilder.execute.mockClear().mockResolvedValue(undefined);
				entityManager.createQueryBuilder.mockReturnValue(queryBuilder as never);
				vi.mocked(generateNanoId).mockReturnValue('generated-id');
			});

			it('reports created when the read-back row is the one just inserted', async () => {
				const inserted = Object.assign(new TypeAvailabilityPolicyScope(), { id: 'generated-id' });
				entityManager.findOne.mockResolvedValue(inserted);

				const { scope, created } = await repository.createScopeIfAbsent(
					{ kind: 'node-types', projectId: null, defaultAction: 'allow', updatedBy: 'user-1' },
					ROOT,
				);

				expect(created).toBe(true);
				expect(scope).toBe(inserted);
			});

			it('reports not created when a concurrent first write already exists', async () => {
				const winner = Object.assign(new TypeAvailabilityPolicyScope(), { id: 'other-id' });
				entityManager.findOne.mockResolvedValue(winner);

				const { scope, created } = await repository.createScopeIfAbsent(
					{ kind: 'node-types', projectId: null, defaultAction: 'allow', updatedBy: 'user-1' },
					ROOT,
				);

				expect(created).toBe(false);
				expect(scope).toBe(winner);
			});

			it('throws when the read-back finds no row at all', async () => {
				entityManager.findOne.mockResolvedValue(null);

				await expect(
					repository.createScopeIfAbsent(
						{ kind: 'node-types', projectId: null, defaultAction: 'allow', updatedBy: 'user-1' },
						ROOT,
					),
				).rejects.toThrow(UnexpectedError);
			});
		});
	});

	describe('TypeAvailabilityPolicyRepository', () => {
		const entityManager = mockEntityManager(TypeAvailabilityPolicy);
		const transactionRunner = mock<TransactionRunner>();
		const repository = new TypeAvailabilityPolicyRepository(
			entityManager.connection,
			transactionRunner,
		);

		beforeEach(() => {
			vi.clearAllMocks();
			entityManager.findOne.mockResolvedValue(null);
		});

		it('does not lock without forUpdate, even on Postgres', async () => {
			setDriver(entityManager, 'postgres');

			await repository.findById('policy-1', ROOT);

			expect(entityManager.findOne).toHaveBeenCalledWith(TypeAvailabilityPolicy, {
				where: { id: 'policy-1' },
			});
		});

		it('does not lock on SQLite even when forUpdate is requested', async () => {
			setDriver(entityManager, 'sqlite');

			await repository.findById('policy-1', ROOT, true);

			expect(entityManager.findOne).toHaveBeenCalledWith(TypeAvailabilityPolicy, {
				where: { id: 'policy-1' },
			});
		});

		it('locks the row on Postgres when forUpdate is requested', async () => {
			setDriver(entityManager, 'postgres');

			await repository.findById('policy-1', ROOT, true);

			expect(entityManager.findOne).toHaveBeenCalledWith(TypeAvailabilityPolicy, {
				where: { id: 'policy-1' },
				lock: { mode: 'pessimistic_write' },
			});
		});

		it('returns an empty list without querying for an empty id list', async () => {
			expect(await repository.findManyByIds([], ROOT)).toEqual([]);
			expect(entityManager.find).not.toHaveBeenCalled();
		});

		it('does not lock findManyByIds without forUpdate, even on Postgres', async () => {
			setDriver(entityManager, 'postgres');
			entityManager.find.mockResolvedValue([]);

			await repository.findManyByIds(['b', 'a'], ROOT);

			expect(entityManager.find).toHaveBeenCalledWith(
				TypeAvailabilityPolicy,
				expect.not.objectContaining({ lock: expect.anything() }),
			);
		});

		it('locks findManyByIds in id order on Postgres when forUpdate is requested', async () => {
			setDriver(entityManager, 'postgres');
			entityManager.find.mockResolvedValue([]);

			await repository.findManyByIds(['b', 'a'], ROOT, true);

			expect(entityManager.find).toHaveBeenCalledWith(TypeAvailabilityPolicy, {
				where: { id: expect.anything() },
				order: { id: 'ASC' },
				lock: { mode: 'pessimistic_write' },
			});
		});

		it('does not lock findManyByIds on SQLite even when forUpdate is requested', async () => {
			setDriver(entityManager, 'sqlite');
			entityManager.find.mockResolvedValue([]);

			await repository.findManyByIds(['a'], ROOT, true);

			expect(entityManager.find).toHaveBeenCalledWith(
				TypeAvailabilityPolicy,
				expect.not.objectContaining({ lock: expect.anything() }),
			);
		});

		it('reads every batch when more ids are named than fit in one query', async () => {
			entityManager.find.mockResolvedValue([]);
			const ids = Array.from({ length: 10_001 }, (_, i) => `id-${i}`);

			await repository.findManyByIds(ids, ROOT, true);

			expect(entityManager.find).toHaveBeenCalledTimes(2);
		});
	});
});
