import { Container } from '@n8n/di';
import { In } from '@n8n/typeorm';

import { CredentialDependency } from '../../entities';
import { mockEntityManager } from '../../utils/test-utils/mock-entity-manager';
import {
	addCredentialDependencyExistsFilter,
	CredentialDependencyRepository,
} from '../credential-dependency.repository';

describe('CredentialDependencyRepository', () => {
	const entityManager = mockEntityManager(CredentialDependency);
	const repository = Container.get(CredentialDependencyRepository);

	beforeEach(() => {
		jest.resetAllMocks();
	});

	describe('findCredentialIdsByDependencyId', () => {
		it('returns matching credential ids', async () => {
			entityManager.find.mockResolvedValueOnce([
				{ credentialId: 'cred-1' } as CredentialDependency,
				{ credentialId: 'cred-2' } as CredentialDependency,
			]);

			const result = await repository.findCredentialIdsByDependencyId(
				'externalSecretProvider',
				'provider-1',
			);

			expect(entityManager.find).toHaveBeenCalledWith(CredentialDependency, {
				select: ['credentialId'],
				where: { dependencyType: 'externalSecretProvider', dependencyId: 'provider-1' },
			});
			expect(result).toEqual(['cred-1', 'cred-2']);
		});
	});

	describe('upsertDependenciesForCredential', () => {
		it('deduplicates ids and inserts once with orIgnore', async () => {
			const qb = {
				insert: jest.fn().mockReturnThis(),
				into: jest.fn().mockReturnThis(),
				values: jest.fn().mockReturnThis(),
				orIgnore: jest.fn().mockReturnThis(),
				execute: jest.fn().mockResolvedValue(undefined),
			};
			entityManager.createQueryBuilder.mockReturnValue(qb as never);

			await repository.upsertDependenciesForCredential({
				credentialId: 'cred-1',
				dependencyType: 'externalSecretProvider',
				dependencyIds: ['provider-1', 'provider-1', 'provider-2'],
				entityManager,
			});

			expect(qb.values).toHaveBeenCalledWith([
				{
					credentialId: 'cred-1',
					dependencyType: 'externalSecretProvider',
					dependencyId: 'provider-1',
				},
				{
					credentialId: 'cred-1',
					dependencyType: 'externalSecretProvider',
					dependencyId: 'provider-2',
				},
			]);
			expect(qb.orIgnore).toHaveBeenCalled();
			expect(qb.execute).toHaveBeenCalled();
		});

		it('returns early when there is nothing to insert', async () => {
			await repository.upsertDependenciesForCredential({
				credentialId: 'cred-1',
				dependencyType: 'externalSecretProvider',
				dependencyIds: [],
				entityManager,
			});

			expect(entityManager.createQueryBuilder).not.toHaveBeenCalled();
		});
	});

	describe('syncDependenciesForCredential', () => {
		it('deletes removed ids and inserts new ids', async () => {
			entityManager.findBy.mockResolvedValueOnce([
				{ dependencyId: 'provider-old' } as CredentialDependency,
				{ dependencyId: 'provider-keep' } as CredentialDependency,
			]);

			const upsertSpy = jest
				.spyOn(repository, 'upsertDependenciesForCredential')
				.mockResolvedValue(undefined);

			await repository.syncDependenciesForCredential({
				credentialId: 'cred-1',
				dependencyType: 'externalSecretProvider',
				dependencyIds: ['provider-keep', 'provider-new'],
				entityManager,
			});

			expect(entityManager.delete).toHaveBeenCalledWith(CredentialDependency, {
				credentialId: 'cred-1',
				dependencyType: 'externalSecretProvider',
				dependencyId: In(['provider-old']),
			});
			expect(upsertSpy).toHaveBeenCalledWith({
				credentialId: 'cred-1',
				dependencyType: 'externalSecretProvider',
				dependencyIds: ['provider-new'],
				entityManager,
			});
		});
	});

	describe('deleteByDependency', () => {
		it('deletes all dependency rows by type and id', async () => {
			await repository.deleteByDependency({
				dependencyType: 'externalSecretProvider',
				dependencyId: 'provider-1',
				entityManager,
			});

			expect(entityManager.delete).toHaveBeenCalledWith(CredentialDependency, {
				dependencyType: 'externalSecretProvider',
				dependencyId: 'provider-1',
			});
		});
	});

	describe('deleteByDependencies', () => {
		it('deletes all dependency rows by type and ids', async () => {
			await repository.deleteByDependencies({
				dependencyType: 'externalSecretProvider',
				dependencyIds: ['provider-1', 'provider-2'],
				entityManager,
			});

			expect(entityManager.delete).toHaveBeenCalledWith(CredentialDependency, {
				dependencyType: 'externalSecretProvider',
				dependencyId: In(['provider-1', 'provider-2']),
			});
		});

		it('returns early when there is nothing to delete', async () => {
			await repository.deleteByDependencies({
				dependencyType: 'externalSecretProvider',
				dependencyIds: [],
				entityManager,
			});

			expect(entityManager.delete).not.toHaveBeenCalled();
		});
	});
});

describe('addCredentialDependencyExistsFilter', () => {
	it('applies the EXISTS dependency filter using andWhere', () => {
		const qb = {
			andWhere: jest.fn().mockReturnThis(),
		};
		const filter = {
			dependencyType: 'externalSecretProvider',
			dependencyId: 'provider-1',
		} as const;

		const result = addCredentialDependencyExistsFilter(qb as never, filter);

		expect(qb.andWhere).toHaveBeenCalledWith(
			expect.stringContaining('FROM credential_dependency cd'),
			filter,
		);
		expect(result).toBe(qb);
	});
});
