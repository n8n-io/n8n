import { Container } from '@n8n/di';
import { In, IsNull, Not } from '@n8n/typeorm';
import type { EntityManager, FindOperator } from '@n8n/typeorm';
import { mock } from 'vitest-mock-extended';

import { AiPreference } from '../../entities';
import { TypeOrmTransaction } from '../../services/typeorm-transaction';
import { mockEntityManager } from '../../utils/test-utils/mock-entity-manager';
import { AiPreferenceRepository } from '../ai-preference.repository';

describe('AiPreferenceRepository', () => {
	const entityManager = mockEntityManager(AiPreference);
	const repository = Container.get(AiPreferenceRepository);

	beforeEach(() => {
		vi.resetAllMocks();
	});

	describe('findByIdWithRelations', () => {
		it('uses the default manager when no context is supplied', async () => {
			entityManager.findOne.mockResolvedValueOnce(null);

			await expect(repository.findByIdWithRelations('preference-1')).resolves.toBeNull();

			expect(entityManager.findOne).toHaveBeenCalledWith(AiPreference, {
				where: { id: 'preference-1' },
				relations: { project: true, user: true, createdBy: true },
			});
		});

		it('loads the row and relations through the transaction manager', async () => {
			const manager = mock<EntityManager>();
			const preference = mock<AiPreference>({ id: 'preference-1' });
			manager.findOne.mockResolvedValueOnce(preference);
			const ctx = { trx: new TypeOrmTransaction(manager) };

			await expect(repository.findByIdWithRelations(preference.id, ctx)).resolves.toBe(preference);

			expect(manager.findOne).toHaveBeenCalledWith(AiPreference, {
				where: { id: preference.id },
				relations: { project: true, user: true, createdBy: true },
			});
			expect(entityManager.findOne).not.toHaveBeenCalled();
		});
	});

	describe('findApplicable', () => {
		it('reads instance, user and project rows in one query, oldest first', async () => {
			entityManager.find.mockResolvedValueOnce([]);

			await repository.findApplicable({ userId: 'user-1', projectIds: ['p-1', 'p-2'] });

			expect(entityManager.find).toHaveBeenCalledWith(AiPreference, {
				where: [
					{ userId: IsNull(), projectId: IsNull() },
					{ userId: 'user-1' },
					{ projectId: In(['p-1', 'p-2']) },
				],
				order: { createdAt: 'ASC', id: 'ASC' },
			});
		});

		it('omits the project clause when the user has no projects', async () => {
			entityManager.find.mockResolvedValueOnce([]);

			await repository.findApplicable({ userId: 'user-1', projectIds: [] });

			expect(entityManager.find).toHaveBeenCalledWith(AiPreference, {
				where: [{ userId: IsNull(), projectId: IsNull() }, { userId: 'user-1' }],
				order: { createdAt: 'ASC', id: 'ASC' },
			});
		});
	});

	describe('findPageVisible', () => {
		it('narrows every visibility branch to the requested ids', async () => {
			entityManager.findAndCount.mockResolvedValueOnce([[], 0]);

			await repository.findPageVisible({
				userId: 'user-1',
				projectIds: ['p-1'],
				allUsers: false,
				skip: 0,
				take: 2,
				ids: ['a', 'b'],
			});

			expect(entityManager.findAndCount).toHaveBeenCalledWith(AiPreference, {
				where: [
					{ userId: IsNull(), projectId: IsNull(), id: In(['a', 'b']) },
					{ userId: 'user-1', id: In(['a', 'b']) },
					{ projectId: In(['p-1']), id: In(['a', 'b']) },
				],
				relations: { project: true, user: true, createdBy: true },
				order: { createdAt: 'ASC', id: 'ASC' },
				skip: 0,
				take: 2,
			});
		});

		it('narrows the admin and all-projects branches the same way', async () => {
			entityManager.findAndCount.mockResolvedValueOnce([[], 0]);

			await repository.findPageVisible({
				userId: 'admin-1',
				projectIds: 'all',
				allUsers: true,
				skip: 0,
				take: 2,
				ids: ['a'],
			});

			expect(entityManager.findAndCount).toHaveBeenCalledWith(
				AiPreference,
				expect.objectContaining({
					where: [
						{ userId: IsNull(), projectId: IsNull(), id: In(['a']) },
						{ userId: Not(IsNull()), id: In(['a']) },
						{ projectId: Not(IsNull()), id: In(['a']) },
					],
				}),
			);
		});

		it('leaves the visibility branches alone when no ids are given', async () => {
			entityManager.findAndCount.mockResolvedValueOnce([[], 0]);

			await repository.findPageVisible({
				userId: 'user-1',
				projectIds: [],
				allUsers: false,
				skip: 0,
				take: 10,
			});

			expect(entityManager.findAndCount).toHaveBeenCalledWith(
				AiPreference,
				expect.objectContaining({
					where: [{ userId: IsNull(), projectId: IsNull() }, { userId: 'user-1' }],
				}),
			);
		});

		it('narrows every visibility branch to the content search', async () => {
			entityManager.findAndCount.mockResolvedValueOnce([[], 0]);

			await repository.findPageVisible({
				userId: 'user-1',
				projectIds: ['p-1'],
				allUsers: false,
				skip: 0,
				take: 10,
				search: '100%_Off',
			});

			const [, options] = entityManager.findAndCount.mock.calls[0];
			const where = options?.where;
			if (!Array.isArray(where)) throw new Error('expected one where clause per branch');
			expect(where).toHaveLength(3);
			for (const branch of where) {
				const operator = branch.content as FindOperator<string>;
				expect(operator.type).toBe('raw');
				expect(operator.objectLiteralParameters).toEqual({ contentSearch: '%100\\%\\_Off%' });
				expect((operator.getSql as (column: string) => string)('"AiPreference"."content"')).toBe(
					'LOWER("AiPreference"."content") LIKE LOWER(:contentSearch) ESCAPE \'\\\'',
				);
			}
		});

		it('orders the page by the requested sort', async () => {
			entityManager.findAndCount.mockResolvedValueOnce([[], 0]);

			await repository.findPageVisible({
				userId: 'user-1',
				projectIds: [],
				allUsers: false,
				skip: 0,
				take: 10,
				sortBy: 'updatedAt:desc',
			});

			expect(entityManager.findAndCount).toHaveBeenCalledWith(
				AiPreference,
				expect.objectContaining({ order: { updatedAt: 'DESC', id: 'DESC' } }),
			);
		});
	});

	/**
	 * Counts the target of a write, not what the caller may see: the cap belongs to the
	 * scope, so an admin writing into somebody else's scope fills the same bucket.
	 */
	describe('countForTarget', () => {
		it('counts one project', async () => {
			entityManager.count.mockResolvedValueOnce(3);

			const count = await repository.countForTarget({ scope: 'project', projectId: 'p-1' });

			expect(count).toBe(3);
			expect(entityManager.count).toHaveBeenCalledWith(AiPreference, {
				where: { projectId: 'p-1' },
			});
		});

		it('counts one user', async () => {
			entityManager.count.mockResolvedValueOnce(1);

			await repository.countForTarget({ scope: 'user', userId: 'user-1' });

			expect(entityManager.count).toHaveBeenCalledWith(AiPreference, {
				where: { userId: 'user-1' },
			});
		});

		it('counts the instance rows, which are the rows with neither target', async () => {
			entityManager.count.mockResolvedValueOnce(0);

			await repository.countForTarget({ scope: 'instance' });

			expect(entityManager.count).toHaveBeenCalledWith(AiPreference, {
				where: { userId: IsNull(), projectId: IsNull() },
			});
		});
	});
});
