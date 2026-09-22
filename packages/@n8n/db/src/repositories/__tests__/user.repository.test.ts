import { Container } from '@n8n/di';
import { IsNull, Not } from '@n8n/typeorm';

import { GLOBAL_OWNER_ROLE } from '../../constants';
import { User } from '../../entities';
import { mockEntityManager } from '../../utils/test-utils/mock-entity-manager';
import { UserRepository } from '../user.repository';

describe('UserRepository', () => {
	const entityManager = mockEntityManager(User);
	const userRepository = Container.get(UserRepository);

	beforeEach(() => {
		vi.resetAllMocks();
	});

	describe('hasActiveInstanceOwner', () => {
		it('checks for an owner with either a login or a password, excluding the shell user', async () => {
			entityManager.exists.mockResolvedValueOnce(true);

			const result = await userRepository.hasActiveInstanceOwner();

			expect(entityManager.exists).toHaveBeenCalledWith(User, {
				where: [
					{ role: { slug: GLOBAL_OWNER_ROLE.slug }, lastActiveAt: Not(IsNull()) },
					{ role: { slug: GLOBAL_OWNER_ROLE.slug }, password: Not(IsNull()) },
				],
				relations: ['role'],
			});
			expect(result).toBe(true);
		});

		it('returns false when only the unclaimed shell owner exists', async () => {
			entityManager.exists.mockResolvedValueOnce(false);

			const result = await userRepository.hasActiveInstanceOwner();

			expect(result).toBe(false);
		});
	});
});
