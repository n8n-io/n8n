import { Container } from '@n8n/di';
import { In, IsNull } from '@n8n/typeorm';

import { AiPreference } from '../../entities';
import { mockEntityManager } from '../../utils/test-utils/mock-entity-manager';
import { AiPreferenceRepository } from '../ai-preference.repository';

describe('AiPreferenceRepository', () => {
	const entityManager = mockEntityManager(AiPreference);
	const repository = Container.get(AiPreferenceRepository);

	beforeEach(() => {
		vi.resetAllMocks();
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
				relations: { project: true, user: true },
				order: { createdAt: 'ASC', id: 'ASC' },
				skip: 0,
				take: 2,
			});
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
