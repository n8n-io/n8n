import { mock } from 'vitest-mock-extended';

import { CredentialsEntity, Folder, SharedCredentials } from '../../entities';
import type { TransactionRunner } from '../../services/transaction';
import { TypeOrmTransaction } from '../../services/typeorm-transaction';
import { mockEntityManager } from '../../utils/test-utils/mock-entity-manager';
import { CredentialAccessRepository } from '../credential-access.repository';
import { FolderAccessRepository } from '../folder-access.repository';

describe('access repositories', () => {
	const transactionRunner = mock<TransactionRunner>();

	describe('CredentialAccessRepository', () => {
		const manager = mockEntityManager(SharedCredentials);
		const repository = new CredentialAccessRepository(manager.connection, transactionRunner);

		beforeEach(() => vi.resetAllMocks());

		it('uses the operation context transaction for reads', async () => {
			const transactionManager = mockEntityManager(SharedCredentials);
			transactionManager.findOne.mockResolvedValue(null);

			await repository.findProjectCredentialForUser('credential-1', null, {
				trx: new TypeOrmTransaction(transactionManager),
			});

			expect(transactionManager.findOne).toHaveBeenCalledWith(
				SharedCredentials,
				expect.objectContaining({
					where: { credentialsId: 'credential-1' },
				}),
			);
			expect(manager.findOne).not.toHaveBeenCalled();
		});

		it('applies user and role access to project credential reads', async () => {
			manager.find.mockResolvedValue([]);

			await repository.findProjectCredentialsForUser({
				userId: 'user-1',
				projectRoles: ['project:editor'],
				credentialRoles: ['credential:user'],
			});

			expect(manager.find).toHaveBeenCalledWith(
				CredentialsEntity,
				expect.objectContaining({
					where: expect.objectContaining({
						isGlobal: false,
						usageScope: 'project',
						shared: expect.objectContaining({
							project: expect.objectContaining({
								projectRelations: expect.objectContaining({ userId: 'user-1' }),
							}),
						}),
					}),
				}),
			);
		});

		it('returns domain-shaped credentials with their sharing project', async () => {
			const credential = Object.assign(new CredentialsEntity(), { id: 'credential-1' });
			manager.find.mockResolvedValue([
				Object.assign(new SharedCredentials(), {
					credentials: credential,
					projectId: 'project-1',
				}),
			]);

			await expect(repository.findAllProjectCredentialsForUser(null)).resolves.toEqual([
				expect.objectContaining({ id: 'credential-1', projectId: 'project-1' }),
			]);
		});
	});

	describe('FolderAccessRepository', () => {
		const manager = mockEntityManager(Folder);
		const repository = new FolderAccessRepository(manager.connection, transactionRunner);

		beforeEach(() => vi.resetAllMocks());

		it('uses the operation context transaction for folder reads', async () => {
			const transactionManager = mockEntityManager(Folder);
			transactionManager.find.mockResolvedValue([]);

			await repository.findFoldersByIdsForUser(['folder-1'], null, {
				trx: new TypeOrmTransaction(transactionManager),
			});

			expect(transactionManager.find).toHaveBeenCalledWith(
				Folder,
				expect.objectContaining({ where: expect.objectContaining({ id: expect.any(Object) }) }),
			);
			expect(manager.find).not.toHaveBeenCalled();
		});

		it('applies project access to folder reads', async () => {
			manager.find.mockResolvedValue([]);

			await repository.findFoldersByIdsForUser(['folder-1'], {
				userId: 'user-1',
				projectRoles: ['project:editor'],
			});

			expect(manager.find).toHaveBeenCalledWith(
				Folder,
				expect.objectContaining({
					where: expect.objectContaining({
						homeProject: expect.objectContaining({
							projectRelations: expect.objectContaining({ userId: 'user-1' }),
						}),
					}),
				}),
			);
		});
	});
});
