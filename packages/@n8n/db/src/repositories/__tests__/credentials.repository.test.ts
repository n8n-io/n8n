import { Container } from '@n8n/di';
import type { EntityManager, SelectQueryBuilder } from '@n8n/typeorm';
import { In, Not, QueryFailedError } from '@n8n/typeorm';
import { mock } from 'vitest-mock-extended';

import { CredentialsEntity } from '../../entities';
import { TypeOrmTransaction } from '../../services/typeorm-transaction';
import { mockEntityManager } from '../../utils/test-utils/mock-entity-manager';
import { CredentialsRepository } from '../credentials.repository';
import { InstanceCredentialAssignmentRepository } from '../instance-credential-assignment.repository';

describe('CredentialsRepository', () => {
	const entityManager = mockEntityManager(CredentialsEntity);
	const credentialsRepository = Container.get(CredentialsRepository);
	const assignmentRepository = Container.get(InstanceCredentialAssignmentRepository);

	beforeEach(() => {
		vi.resetAllMocks();
	});

	it('finds non-project credentials by ID', async () => {
		entityManager.find.mockResolvedValueOnce([]);

		await credentialsRepository.findNonProjectCredentialsByIds(['credential-id']);

		expect(entityManager.find).toHaveBeenCalledWith(CredentialsEntity, {
			where: { id: In(['credential-id']), usageScope: Not('project') },
			select: ['id'],
		});
	});

	it('finds only dangling project credentials', async () => {
		const queryBuilder = mock<SelectQueryBuilder<CredentialsEntity>>();
		queryBuilder.leftJoinAndSelect.mockReturnValue(queryBuilder);
		queryBuilder.where.mockReturnValue(queryBuilder);
		queryBuilder.andWhere.mockReturnValue(queryBuilder);
		queryBuilder.getMany.mockResolvedValue([]);
		vi.spyOn(credentialsRepository, 'createQueryBuilder').mockReturnValue(queryBuilder);

		await credentialsRepository.findDanglingProjectCredentials();

		expect(queryBuilder.andWhere).toHaveBeenCalledWith('credentials.usageScope = :usageScope', {
			usageScope: 'project',
		});
	});

	it('uses the operation transaction for instance credential writes', async () => {
		const transactionManager = mock<EntityManager>();
		const ctx = { trx: new TypeOrmTransaction(transactionManager) };
		const credential = mock<CredentialsEntity>({
			id: 'credential-id',
			usageScope: 'instance',
		});
		transactionManager.save.mockResolvedValue(credential);
		transactionManager.findOneBy.mockResolvedValue(credential);
		transactionManager.find.mockResolvedValue([]);
		transactionManager.delete.mockRejectedValue(
			new QueryFailedError('DELETE', [], new Error('foreign key constraint')),
		);

		await credentialsRepository.saveInstanceCredential(credential, ctx);
		await credentialsRepository.updateInstanceCredential(
			credential.id,
			{ ...credential, name: 'Updated', type: 'openAiApi', data: 'encrypted' },
			ctx,
		);
		await expect(
			credentialsRepository.deleteInstanceCredentialIfUnassigned(credential.id, ctx),
		).rejects.toThrow('foreign key constraint');

		expect(transactionManager.save).toHaveBeenCalledWith(CredentialsEntity, credential);
		expect(transactionManager.update).toHaveBeenCalledWith(
			CredentialsEntity,
			{ id: credential.id, usageScope: 'instance' },
			expect.objectContaining({ name: 'Updated' }),
		);
		expect(transactionManager.delete).toHaveBeenCalledWith(CredentialsEntity, {
			id: credential.id,
			usageScope: 'instance',
		});
		expect(transactionManager.find).toHaveBeenCalledTimes(1);
		expect(entityManager.save).not.toHaveBeenCalled();
	});

	it('keeps instance credentials that are assigned', async () => {
		const credential = mock<CredentialsEntity>({ id: 'credential-id', usageScope: 'instance' });
		entityManager.findOneBy.mockResolvedValue(credential);
		vi.spyOn(assignmentRepository, 'findCredentialUseIds').mockResolvedValue([
			'example:primary',
			'example:secondary',
		]);

		await expect(
			credentialsRepository.deleteInstanceCredentialIfUnassigned(credential.id),
		).resolves.toEqual({
			status: 'assigned',
			credentialUseIds: ['example:primary', 'example:secondary'],
		});
		expect(entityManager.delete).not.toHaveBeenCalled();
	});

	it('reports an assignment created concurrently with deletion', async () => {
		const credential = mock<CredentialsEntity>({ id: 'credential-id', usageScope: 'instance' });
		entityManager.findOneBy.mockResolvedValue(credential);
		vi.spyOn(assignmentRepository, 'findCredentialUseIds')
			.mockResolvedValueOnce([])
			.mockResolvedValueOnce(['example:primary']);
		entityManager.delete.mockRejectedValue(
			new QueryFailedError('DELETE', [], new Error('foreign key constraint')),
		);

		await expect(
			credentialsRepository.deleteInstanceCredentialIfUnassigned(credential.id),
		).resolves.toEqual({
			status: 'assigned',
			credentialUseIds: ['example:primary'],
		});
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

	describe('findAllGlobalCredentials', () => {
		it('applies dependency filter through query builder when provided', async () => {
			const andWhereSpy = vi.fn().mockReturnThis();
			const getManySpy = vi.fn().mockResolvedValue([]);
			const qb = mock<SelectQueryBuilder<CredentialsEntity>>({
				andWhere: andWhereSpy,
				getMany: getManySpy,
			});
			vi.spyOn(credentialsRepository, 'createQueryBuilder').mockReturnValue(qb);

			await credentialsRepository.findAllGlobalCredentials({
				filters: {
					dependency: {
						dependencyType: 'externalSecretProvider',
						dependencyId: 'provider-1',
					},
				},
			});

			expect(andWhereSpy).toHaveBeenCalledWith(
				expect.stringContaining('FROM credential_dependency cd'),
				{
					dependencyType: 'externalSecretProvider',
					dependencyId: 'provider-1',
				},
			);
			expect(getManySpy).toHaveBeenCalledTimes(1);
			expect(entityManager.find).not.toHaveBeenCalled();
		});
	});
});
