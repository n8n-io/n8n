import { Container } from '@n8n/di';
import { In, type SelectQueryBuilder } from '@n8n/typeorm';
import { mock } from 'jest-mock-extended';

import { SharedCredentials } from '../../entities';
import { mockEntityManager } from '../../utils/test-utils/mock-entity-manager';
import { SharedCredentialsRepository } from '../shared-credentials.repository';

describe('SharedCredentialsRepository', () => {
	const entityManager = mockEntityManager(SharedCredentials);
	const sharedCredentialsRepository = Container.get(SharedCredentialsRepository);

	let queryBuilder: jest.Mocked<SelectQueryBuilder<SharedCredentials>>;

	beforeEach(() => {
		jest.resetAllMocks();

		queryBuilder = mock<SelectQueryBuilder<SharedCredentials>>();
		queryBuilder.where.mockReturnThis();
		queryBuilder.andWhere.mockReturnThis();
		queryBuilder.innerJoin.mockReturnThis();
		queryBuilder.select.mockReturnThis();

		jest.spyOn(sharedCredentialsRepository, 'createQueryBuilder').mockReturnValue(queryBuilder);
	});

	describe('findByCredentialIds', () => {
		it('should return shared credentials with project relations including role', async () => {
			const credentialIds = ['cred1', 'cred2'];
			const role = 'credential:owner';

			entityManager.find.mockResolvedValueOnce([]);

			await sharedCredentialsRepository.findByCredentialIds(credentialIds, role);

			expect(entityManager.find).toHaveBeenCalledWith(SharedCredentials, {
				relations: { credentials: true, project: { projectRelations: { user: true, role: true } } },
				where: {
					credentialsId: In(credentialIds),
					role,
				},
			});
		});
	});

	describe('getSharedPersonalCredentialsCount', () => {
		it('should return count with correct joins and filters', async () => {
			queryBuilder.getCount.mockResolvedValue(3);

			const result = await sharedCredentialsRepository.getSharedPersonalCredentialsCount();

			expect(result).toBe(3);
			expect(sharedCredentialsRepository.createQueryBuilder).toHaveBeenCalledWith('sc');
			expect(queryBuilder.innerJoin).toHaveBeenCalledWith('sc.project', 'project');
			expect(queryBuilder.where).toHaveBeenCalledWith('sc.role = :role', {
				role: 'credential:owner',
			});
			expect(queryBuilder.andWhere).toHaveBeenCalledWith('project.type = :type', {
				type: 'personal',
			});
			// EXISTS subquery callback
			expect(queryBuilder.andWhere).toHaveBeenCalledWith(expect.any(Function));
			expect(queryBuilder.getCount).toHaveBeenCalled();
		});

		it('should return 0 when no shared credentials exist', async () => {
			queryBuilder.getCount.mockResolvedValue(0);

			const result = await sharedCredentialsRepository.getSharedPersonalCredentialsCount();

			expect(result).toBe(0);
		});

		it('should return correct count for multiple shared credentials', async () => {
			queryBuilder.getCount.mockResolvedValue(8);

			const result = await sharedCredentialsRepository.getSharedPersonalCredentialsCount();

			expect(result).toBe(8);
		});
	});
});
