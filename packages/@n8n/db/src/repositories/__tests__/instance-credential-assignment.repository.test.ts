import { Container } from '@n8n/di';
import { In, QueryFailedError, type EntityManager } from '@n8n/typeorm';
import { mock } from 'vitest-mock-extended';

import { CredentialsEntity, InstanceCredentialAssignment } from '../../entities';
import { TypeOrmTransaction } from '../../services/typeorm-transaction';
import { mockEntityManager } from '../../utils/test-utils/mock-entity-manager';
import { InstanceCredentialAssignmentRepository } from '../instance-credential-assignment.repository';

describe('InstanceCredentialAssignmentRepository', () => {
	const entityManager = mockEntityManager(InstanceCredentialAssignment);
	const repository = Container.get(InstanceCredentialAssignmentRepository);
	const credential = mock<CredentialsEntity>({
		id: 'credential-id',
		name: 'Primary model',
		type: 'openAiApi',
		usageScope: 'instance',
	});

	beforeEach(() => {
		vi.resetAllMocks();
	});

	it('finds available credentials by type', async () => {
		entityManager.find.mockResolvedValue([credential]);

		await expect(repository.findAvailableCredentials(['openAiApi'])).resolves.toEqual([credential]);
		expect(entityManager.find).toHaveBeenCalledWith(CredentialsEntity, {
			select: ['id', 'name', 'type'],
			where: { usageScope: 'instance', type: In(['openAiApi']) },
			order: { name: 'ASC' },
		});
	});

	it('assigns an available credential', async () => {
		const transactionManager = mock<EntityManager>({
			connection: { options: { type: 'postgres' } } as EntityManager['connection'],
		});
		transactionManager.findOne.mockResolvedValue(credential);
		const ctx = { trx: new TypeOrmTransaction(transactionManager) };

		await expect(
			repository.assignCredential('example:primary', credential.id, ['openAiApi'], ctx),
		).resolves.toBe(credential);
		expect(transactionManager.findOne).toHaveBeenCalledWith(CredentialsEntity, {
			where: {
				id: credential.id,
				usageScope: 'instance',
				type: In(['openAiApi']),
			},
			lock: { mode: 'pessimistic_write' },
		});
		expect(transactionManager.upsert).toHaveBeenCalledWith(
			InstanceCredentialAssignment,
			{
				credentialUseId: 'example:primary',
				credentialId: credential.id,
				updatedAt: expect.any(Date) as Date,
			},
			['credentialUseId'],
		);
	});

	it('returns null when the credential is deleted before assignment', async () => {
		entityManager.findOne.mockResolvedValueOnce(credential).mockResolvedValueOnce(null);
		entityManager.upsert.mockRejectedValue(
			new QueryFailedError('INSERT', [], new Error('FOREIGN KEY constraint failed')),
		);

		await expect(
			repository.assignCredential('example:primary', credential.id, ['openAiApi']),
		).resolves.toBeNull();
	});

	it('rethrows transient assignment failures', async () => {
		entityManager.findOne.mockResolvedValue(credential);
		entityManager.upsert.mockRejectedValue(
			new QueryFailedError('INSERT', [], new Error('deadlock detected')),
		);

		await expect(
			repository.assignCredential('example:primary', credential.id, ['openAiApi']),
		).rejects.toThrow('deadlock detected');
	});

	it('resolves the assigned credential', async () => {
		entityManager.findOneBy.mockResolvedValue(
			mock<InstanceCredentialAssignment>({
				credentialUseId: 'example:primary',
				credentialId: credential.id,
			}),
		);
		entityManager.findOne.mockResolvedValue(credential);

		await expect(
			repository.findAssignedCredential('example:primary', ['openAiApi']),
		).resolves.toEqual({ credentialId: credential.id, credential });
	});

	it('finds a credential use through the operation transaction', async () => {
		const transactionManager = mock<EntityManager>();
		const ctx = { trx: new TypeOrmTransaction(transactionManager) };
		transactionManager.find.mockResolvedValue([
			mock<InstanceCredentialAssignment>({ credentialUseId: 'example:primary' }),
			mock<InstanceCredentialAssignment>({ credentialUseId: 'example:secondary' }),
		]);

		await expect(repository.findCredentialUseIds(credential.id, ctx)).resolves.toEqual([
			'example:primary',
			'example:secondary',
		]);
		expect(transactionManager.find).toHaveBeenCalledWith(InstanceCredentialAssignment, {
			select: ['credentialUseId'],
			where: { credentialId: credential.id },
			order: { credentialUseId: 'ASC' },
		});
	});
});
