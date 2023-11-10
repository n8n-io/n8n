import { Container } from 'typedi';
import { DataSource, EntityManager, type EntityMetadata } from 'typeorm';
import { mock } from 'jest-mock-extended';
import type { User } from '@db/entities/User';
import type { CredentialsEntity } from '@db/entities/CredentialsEntity';
import { SharedCredentials } from '@db/entities/SharedCredentials';
import { SharedCredentialsRepository } from '@db/repositories/sharedCredentials.repository';
import { mockInstance } from '../../shared/mocking';

describe('SharedCredentialsRepository', () => {
	const entityManager = mockInstance(EntityManager);
	const dataSource = mockInstance(DataSource, {
		manager: entityManager,
		getMetadata: () => mock<EntityMetadata>({ target: SharedCredentials }),
	});
	Object.assign(entityManager, { connection: dataSource });
	const repository = Container.get(SharedCredentialsRepository);

	describe('findCredentialForUser', () => {
		const credentialsId = 'cred_123';
		const sharedCredential = mock<SharedCredentials>();
		sharedCredential.credentials = mock<CredentialsEntity>({ id: credentialsId });
		const owner = mock<User>({ isOwner: true });
		const member = mock<User>({ isOwner: false, id: 'test' });

		beforeEach(() => {
			jest.resetAllMocks();
		});

		test('should allow instance owner access to all credentials', async () => {
			entityManager.findOne.mockResolvedValueOnce(sharedCredential);
			const credential = await repository.findCredentialForUser(credentialsId, owner);
			expect(entityManager.findOne).toHaveBeenCalledWith(SharedCredentials, {
				relations: ['credentials'],
				where: { credentialsId },
			});
			expect(credential).toEqual(sharedCredential.credentials);
		});

		test('should allow members', async () => {
			entityManager.findOne.mockResolvedValueOnce(sharedCredential);
			const credential = await repository.findCredentialForUser(credentialsId, member);
			expect(entityManager.findOne).toHaveBeenCalledWith(SharedCredentials, {
				relations: ['credentials'],
				where: { credentialsId, userId: member.id },
			});
			expect(credential).toEqual(sharedCredential.credentials);
		});

		test('should return null when no shared credential is found', async () => {
			entityManager.findOne.mockResolvedValueOnce(null);
			const credential = await repository.findCredentialForUser(credentialsId, member);
			expect(entityManager.findOne).toHaveBeenCalledWith(SharedCredentials, {
				relations: ['credentials'],
				where: { credentialsId, userId: member.id },
			});
			expect(credential).toEqual(null);
		});
	});
});
