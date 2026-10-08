import { Container } from '@n8n/di';
import type { DataSource, EntityManager } from '@n8n/typeorm';
import { IsNull, Not } from '@n8n/typeorm';
import { mock } from 'vitest-mock-extended';

import { GLOBAL_OWNER_ROLE } from '../../constants';
import { User } from '../../entities';
import type { OperationContext, TransactionRunner } from '../../services/transaction';
import { TypeOrmTransaction } from '../../services/typeorm-transaction';
import { mockEntityManager } from '../../utils/test-utils/mock-entity-manager';
import { UserRepository } from '../user.repository';

describe('UserRepository', () => {
	const entityManager = mockEntityManager(User);
	const userRepository = Container.get(UserRepository);

	beforeEach(() => {
		vi.resetAllMocks();
	});

	describe('hasClaimedInstanceOwner', () => {
		it('checks for an owner with either a login or a password, excluding the shell user', async () => {
			entityManager.exists.mockResolvedValueOnce(true);

			const result = await userRepository.hasClaimedInstanceOwner();

			expect(entityManager.exists).toHaveBeenCalledWith(User, {
				where: [
					{ role: { slug: GLOBAL_OWNER_ROLE.slug }, lastActiveAt: Not(IsNull()) },
					{ role: { slug: GLOBAL_OWNER_ROLE.slug }, password: Not(IsNull()) },
				],
				relations: ['role'],
			});
			expect(result).toBe(true);
		});
	});

	describe('updateSettingsLocked', () => {
		const transactionRunner = mock<TransactionRunner>();
		const repository = new UserRepository(entityManager.connection, transactionRunner);
		let txManager: EntityManager;

		const storedUser = (settings: User['settings']) =>
			Object.assign(new User(), { id: 'user-1', settings });

		const useDatabase = (type: 'postgres' | 'sqlite-pooled') => {
			txManager = mock<EntityManager>({
				connection: mock<DataSource>({ options: { type } }),
			});
		};

		beforeEach(() => {
			useDatabase('sqlite-pooled');
			// The runner opens the transaction that the repository must use for both queries.
			transactionRunner.run.mockImplementation(
				async (ctx: OperationContext, fn: (ctx: OperationContext) => Promise<unknown>) =>
					await fn(ctx.trx ? ctx : { ...ctx, trx: new TypeOrmTransaction(txManager) }),
			);
		});

		it('merges the patch into the stored settings and writes them in the same transaction', async () => {
			vi.mocked(txManager.findOne).mockResolvedValueOnce(
				storedUser({ isOnboarded: true, experienceMode: 'simple' }),
			);

			const result = await repository.updateSettingsLocked(
				'user-1',
				{ experienceMode: 'power', mcpJsonNudge: { impressions: 1 } },
				{},
			);

			const merged = {
				isOnboarded: true,
				experienceMode: 'power',
				mcpJsonNudge: { impressions: 1 },
			};
			expect(result).toEqual(merged);
			expect(txManager.findOne).toHaveBeenCalledWith(User, {
				where: { id: 'user-1' },
				select: ['id', 'settings'],
				lock: undefined,
			});
			expect(txManager.update).toHaveBeenCalledWith(User, { id: 'user-1' }, { settings: merged });
			expect(entityManager.findOne).not.toHaveBeenCalled();
			expect(entityManager.update).not.toHaveBeenCalled();
		});

		it('locks the row for writing on Postgres', async () => {
			useDatabase('postgres');
			vi.mocked(txManager.findOne).mockResolvedValueOnce(storedUser(null));

			await repository.updateSettingsLocked('user-1', { isOnboarded: true }, {});

			expect(txManager.findOne).toHaveBeenCalledWith(
				User,
				expect.objectContaining({ lock: { mode: 'pessimistic_write' } }),
			);
		});

		it('stores the patch as the settings when the user has none yet', async () => {
			vi.mocked(txManager.findOne).mockResolvedValueOnce(storedUser(null));

			const result = await repository.updateSettingsLocked('user-1', { isOnboarded: true }, {});

			expect(result).toEqual({ isOnboarded: true });
			expect(txManager.update).toHaveBeenCalledWith(
				User,
				{ id: 'user-1' },
				{ settings: { isOnboarded: true } },
			);
		});

		// The merge is shallow: a caller that changes one entry of a nested setting sends the whole object.
		it('replaces a nested setting as a whole', async () => {
			vi.mocked(txManager.findOne).mockResolvedValueOnce(
				storedUser({ dismissedCallouts: { first: true }, userActivated: true }),
			);

			const result = await repository.updateSettingsLocked(
				'user-1',
				{ dismissedCallouts: { second: true } },
				{},
			);

			expect(result).toEqual({ dismissedCallouts: { second: true }, userActivated: true });
		});

		it('returns null and writes nothing when the user does not exist', async () => {
			vi.mocked(txManager.findOne).mockResolvedValueOnce(null);

			const result = await repository.updateSettingsLocked('missing', { isOnboarded: true }, {});

			expect(result).toBeNull();
			expect(txManager.update).not.toHaveBeenCalled();
		});

		it('joins the transaction that the caller already has', async () => {
			const outerManager = mock<EntityManager>({
				connection: mock<DataSource>({ options: { type: 'sqlite-pooled' } }),
			});
			vi.mocked(outerManager.findOne).mockResolvedValueOnce(storedUser({ isOnboarded: false }));
			const ctx = { trx: new TypeOrmTransaction(outerManager) };

			await repository.updateSettingsLocked('user-1', { isOnboarded: true }, ctx);

			expect(transactionRunner.run).toHaveBeenCalledWith(ctx, expect.any(Function));
			expect(outerManager.update).toHaveBeenCalledWith(
				User,
				{ id: 'user-1' },
				{ settings: { isOnboarded: true } },
			);
			expect(txManager.update).not.toHaveBeenCalled();
		});

		it('passes a failed write on to the caller', async () => {
			vi.mocked(txManager.findOne).mockResolvedValueOnce(storedUser(null));
			vi.mocked(txManager.update).mockRejectedValueOnce(new Error('disk full'));

			await expect(
				repository.updateSettingsLocked('user-1', { isOnboarded: true }, {}),
			).rejects.toThrow('disk full');
		});
	});
});
