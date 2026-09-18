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
