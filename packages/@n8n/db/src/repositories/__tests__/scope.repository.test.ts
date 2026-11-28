import type { Logger } from '@n8n/backend-common';
import { In, type EntityManager } from '@n8n/typeorm';
import { mock } from 'vitest-mock-extended';

import { Scope } from '../../entities';
import type { TransactionRunner } from '../../services/transaction';
import { TypeOrmTransaction } from '../../services/typeorm-transaction';
import { mockEntityManager } from '../../utils/test-utils/mock-entity-manager';
import { ScopeRepository } from '../scope.repository';

describe('ScopeRepository', () => {
	const entityManager = mockEntityManager(Scope);
	const logger = mock<Logger>();
	let repository: ScopeRepository;

	const readScope = Object.assign(new Scope(), { slug: 'workflow:read' as const });
	const updateScope = Object.assign(new Scope(), { slug: 'workflow:update' as const });

	beforeEach(() => {
		vi.resetAllMocks();
		repository = new ScopeRepository(entityManager.connection, mock<TransactionRunner>(), logger);
	});

	describe('findByList', () => {
		it('queries scopes matching the requested slugs through the default manager', async () => {
			entityManager.findBy.mockResolvedValueOnce([readScope, updateScope]);

			const result = await repository.findByList(['workflow:read', 'workflow:update'], {});

			expect(entityManager.findBy).toHaveBeenCalledWith(Scope, {
				slug: In(['workflow:read', 'workflow:update']),
			});
			expect(result).toEqual([readScope, updateScope]);
		});

		it('uses the active transaction manager when provided in the context', async () => {
			const transactionManager = mock<EntityManager>();
			transactionManager.findBy.mockResolvedValueOnce([readScope]);
			const ctx = { trx: new TypeOrmTransaction(transactionManager) };

			const result = await repository.findByList(['workflow:read'], ctx);

			expect(transactionManager.findBy).toHaveBeenCalledWith(Scope, {
				slug: In(['workflow:read']),
			});
			expect(entityManager.findBy).not.toHaveBeenCalled();
			expect(result).toEqual([readScope]);
		});
	});

	describe('findByListOrFail', () => {
		it('queries deduplicated slugs and returns matching scopes', async () => {
			entityManager.findBy.mockResolvedValueOnce([readScope, updateScope]);

			const result = await repository.findByListOrFail(
				['workflow:read', 'workflow:update', 'workflow:read'],
				{},
			);

			expect(entityManager.findBy).toHaveBeenCalledWith(Scope, {
				slug: In(['workflow:read', 'workflow:update']),
			});
			expect(result).toEqual([readScope, updateScope]);
		});

		it('uses the active transaction manager when provided in the context', async () => {
			const transactionManager = mock<EntityManager>();
			transactionManager.findBy.mockResolvedValueOnce([readScope]);
			const ctx = { trx: new TypeOrmTransaction(transactionManager) };

			const result = await repository.findByListOrFail(['workflow:read'], ctx);

			expect(transactionManager.findBy).toHaveBeenCalledWith(Scope, {
				slug: In(['workflow:read']),
			});
			expect(entityManager.findBy).not.toHaveBeenCalled();
			expect(result).toEqual([readScope]);
		});

		it('logs and throws an error naming the missing scopes when not all slugs exist', async () => {
			entityManager.findBy.mockResolvedValueOnce([readScope]);

			await expect(
				repository.findByListOrFail(['workflow:read', 'workflow:delete'], {}),
			).rejects.toThrow('The following scopes are invalid: workflow:delete');
			expect(logger.error).toHaveBeenCalledWith(
				'The following scopes are invalid: workflow:delete',
			);
		});
	});
});
