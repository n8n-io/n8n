import { Container } from '@n8n/di';
import { In } from '@n8n/typeorm';

import { User } from '../../entities';
import { mockEntityManager } from '../../utils/test-utils/mock-entity-manager';
import { UserRepository } from '../user.repository';

describe('UserRepository', () => {
	const entityManager = mockEntityManager(User);
	const repository = Container.get(UserRepository);

	beforeEach(() => {
		vi.resetAllMocks();
	});

	describe('findMany', () => {
		it('applies offset pagination in stable id order', async () => {
			entityManager.find.mockResolvedValueOnce([]);

			await repository.findMany({ includeRole: true, offset: 10, limit: 5 });

			expect(entityManager.find).toHaveBeenCalledWith(User, {
				skip: 10,
				take: 5,
				relations: ['role'],
				order: { id: 'ASC' },
			});
		});
	});

	describe('findManyByIds', () => {
		it('applies offset pagination in stable id order', async () => {
			entityManager.find.mockResolvedValueOnce([]);

			await repository.findManyByIds(['user-2', 'user-1'], {
				includeRole: true,
				offset: 0,
				limit: 2,
			});

			expect(entityManager.find).toHaveBeenCalledWith(User, {
				where: { id: In(['user-2', 'user-1']) },
				skip: 0,
				take: 2,
				relations: ['role'],
				order: { id: 'ASC' },
			});
		});
	});
});
