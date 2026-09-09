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
});
