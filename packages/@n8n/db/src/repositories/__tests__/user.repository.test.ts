import { Container } from '@n8n/di';
import { User } from '../../entities';
import { mockEntityManager } from '../../utils/test-utils/mock-entity-manager';
import { UserRepository } from '../user.repository';

describe('UserRepository', () => {
	const entityManager = mockEntityManager(User);
	const userRepository = Container.get(UserRepository);

	beforeEach(() => {
		vi.resetAllMocks();
	});

	describe('findEligibleByProjectOrGlobalRoles', () => {
		it('returns no users for an empty requested selection without querying the database', async () => {
			expect(
				await userRepository.findEligibleByProjectOrGlobalRoles({
					projectId: 'project',
					projectRoleSlugs: ['project:editor'],
					globalRoleSlugs: ['global:admin'],
					userIds: [],
				}),
			).toEqual([]);
			expect(entityManager.find).not.toHaveBeenCalled();
		});
	});
});
