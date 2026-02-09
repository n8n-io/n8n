import { Container } from '@n8n/di';
import { In } from '@n8n/typeorm';

import { CredentialsEntity } from '../../entities';
import { mockEntityManager } from '../../utils/test-utils/mock-entity-manager';
import { CredentialsRepository } from '../credentials.repository';

describe('CredentialsRepository', () => {
	const entityManager = mockEntityManager(CredentialsEntity);
	const credentialsRepository = Container.get(CredentialsRepository);

	beforeEach(() => {
		jest.resetAllMocks();
	});

	describe('findManyAndCount', () => {
		it('should call findAndCount with options from toFindManyOptions and return [entities, count]', async () => {
			const mockCredentials = [
				{ id: '1', name: 'Cred 1', type: 'githubApi' },
				{ id: '2', name: 'Cred 2', type: 'githubApi' },
			] as CredentialsEntity[];
			const count = 2;
			entityManager.findAndCount.mockResolvedValueOnce([mockCredentials, count]);

			const [credentials, total] = await credentialsRepository.findManyAndCount({
				take: 10,
				skip: 0,
			});

			expect(credentials).toEqual(mockCredentials);
			expect(total).toBe(count);
			expect(entityManager.findAndCount).toHaveBeenCalledTimes(1);
			const callArg = entityManager.findAndCount.mock.calls[0]?.[1];
			expect(callArg).toBeDefined();
			expect(callArg!.take).toBe(10);
			expect(callArg!.select).toBeDefined();
			expect(callArg!.relations).toEqual([
				'shared',
				'shared.project',
				'shared.project.projectRelations',
			]);
			expect(callArg!.order).toBeUndefined();
		});

		it('should apply credentialIds filter when provided', async () => {
			entityManager.findAndCount.mockResolvedValueOnce([[], 0]);

			await credentialsRepository.findManyAndCount({ take: 5, skip: 0 }, ['id1', 'id2']);

			expect(entityManager.findAndCount).toHaveBeenCalledTimes(1);
			const callArg = entityManager.findAndCount.mock.calls[0]?.[1];
			expect(callArg).toBeDefined();
			expect(callArg!.where).toEqual(expect.objectContaining({ id: In(['id1', 'id2']) }));
		});
	});
});
