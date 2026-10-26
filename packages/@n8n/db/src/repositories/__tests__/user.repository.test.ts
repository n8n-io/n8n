import { Container } from '@n8n/di';
import { IsNull, Not } from '@n8n/typeorm';

import { GLOBAL_OWNER_ROLE } from '../../constants';
import { ServiceAccount, User } from '../../entities';
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

	describe('isServiceAccountEmail', () => {
		it('checks for a service account with the email', async () => {
			entityManager.existsBy.mockResolvedValueOnce(true);

			expect(await userRepository.isServiceAccountEmail('sa@example.com')).toBe(true);
			expect(entityManager.existsBy).toHaveBeenCalledWith(ServiceAccount, {
				email: 'sa@example.com',
			});
		});
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
});
