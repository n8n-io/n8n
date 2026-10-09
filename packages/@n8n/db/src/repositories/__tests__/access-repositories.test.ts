import { mock } from 'vitest-mock-extended';
import { In, IsNull, type SelectQueryBuilder } from '@n8n/typeorm';

import { CredentialsEntity, Folder, Role, SharedCredentials } from '../../entities';
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

		it('loads roles for access checks', async () => {
			const role = Object.assign(new Role(), { slug: 'project:custom', scopes: [] });
			manager.find.mockResolvedValue([role]);

			await expect(repository.findRolesForAccessCheck()).resolves.toEqual([role]);
			expect(manager.find).toHaveBeenCalledWith(Role, { relations: ['scopes'] });
		});

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

		it('filters global credential lists by scope and pending authorization', async () => {
			manager.find.mockResolvedValue([]);

			await repository.findGlobalProjectCredentials();

			expect(manager.find).toHaveBeenCalledWith(CredentialsEntity, {
				where: {
					isGlobal: true,
					usageScope: 'project',
					pendingAuthorizationExpiresAt: IsNull(),
				},
				relations: { shared: true },
			});
		});

		it('loads shared projects for a global credential only when requested', async () => {
			manager.findOne.mockResolvedValue(null);

			await repository.findGlobalProjectCredentialById('credential-1', true);

			expect(manager.findOne).toHaveBeenCalledWith(CredentialsEntity, {
				where: { id: 'credential-1', isGlobal: true, usageScope: 'project' },
				relations: { shared: { project: true } },
			});
		});

		it('restricts a default id lookup to project credentials', async () => {
			manager.findOne.mockResolvedValue(null);

			await repository.findCredentialById('credential-1', {
				includeInstanceCredentials: false,
				includeSharedProject: false,
			});

			expect(manager.findOne).toHaveBeenCalledWith(CredentialsEntity, {
				where: { id: 'credential-1', usageScope: 'project' },
				relations: undefined,
			});
		});

		it('supports instance credentials and shared projects in an id lookup', async () => {
			manager.findOne.mockResolvedValue(null);

			await repository.findCredentialById('credential-1', {
				includeInstanceCredentials: true,
				includeSharedProject: true,
			});

			const options = manager.findOne.mock.calls[0]?.[1];
			expect(options).toEqual(
				expect.objectContaining({
					where: expect.objectContaining({
						id: 'credential-1',
						usageScope: In(['project', 'instance']),
					}),
					relations: { shared: { project: true } },
				}),
			);
		});

		it('queries instance credentials by id and usage scope', async () => {
			manager.findOneBy.mockResolvedValue(null);

			await repository.findInstanceCredentialById('credential-1');

			expect(manager.findOneBy).toHaveBeenCalledWith(CredentialsEntity, {
				id: 'credential-1',
				usageScope: 'instance',
			});
		});

		it('ignores stale sharing rows for instance credentials', async () => {
			manager.findOne.mockResolvedValue(
				Object.assign(new SharedCredentials(), {
					credentials: Object.assign(new CredentialsEntity(), { usageScope: 'instance' }),
				}),
			);

			await expect(
				repository.findProjectCredentialForUser('credential-1', null),
			).resolves.toBeNull();
		});

		it('returns the project credential from an accessible sharing row', async () => {
			const credential = Object.assign(new CredentialsEntity(), {
				id: 'credential-1',
				usageScope: 'project',
			});
			manager.findOne.mockResolvedValue(
				Object.assign(new SharedCredentials(), { credentials: credential }),
			);

			await expect(repository.findProjectCredentialForUser('credential-1', null)).resolves.toBe(
				credential,
			);
		});

		it('applies access roles to a single project credential lookup', async () => {
			manager.findOne.mockResolvedValue(null);

			await repository.findProjectCredentialForUser('credential-1', {
				userId: 'user-1',
				projectRoles: ['project:editor'],
				credentialRoles: ['credential:user'],
			});

			const options = manager.findOne.mock.calls[0]?.[1];
			expect(options?.where).toEqual(
				expect.objectContaining({
					role: In(['credential:user']),
					project: expect.objectContaining({
						projectRelations: expect.objectContaining({
							role: In(['project:editor']),
							userId: 'user-1',
						}),
					}),
				}),
			);
		});

		it('applies access roles when listing all project credentials', async () => {
			manager.find.mockResolvedValue([]);

			await repository.findAllProjectCredentialsForUser({
				userId: 'user-1',
				projectRoles: ['project:editor'],
				credentialRoles: ['credential:user'],
			});

			const options = manager.find.mock.calls[0]?.[1];
			expect(options?.where).toEqual(
				expect.objectContaining({
					role: In(['credential:user']),
					project: expect.objectContaining({
						projectRelations: expect.objectContaining({
							role: In(['project:editor']),
							userId: 'user-1',
						}),
					}),
				}),
			);
		});

		it('chunks credential id access queries', async () => {
			const credentialIds = Array.from({ length: 10_001 }, (_, index) => `credential-${index}`);
			manager.find.mockResolvedValue([]);

			await repository.findProjectCredentialIdsForUser(credentialIds, null);

			expect(manager.find).toHaveBeenCalledTimes(2);
		});

		it('returns accessible credential ids from sharing rows', async () => {
			manager.find.mockResolvedValue([
				Object.assign(new SharedCredentials(), { credentialsId: 'credential-1' }),
			]);

			await expect(
				repository.findProjectCredentialIdsForUser(['credential-1'], {
					userId: 'user-1',
					projectRoles: ['project:editor'],
					credentialRoles: ['credential:user'],
				}),
			).resolves.toEqual(new Set(['credential-1']));
		});

		it('filters global ids to resolvable credentials when requested', async () => {
			manager.find.mockResolvedValue([]);

			await repository.findGlobalProjectCredentialIds(['credential-1'], true);

			expect(manager.find).toHaveBeenCalledWith(
				CredentialsEntity,
				expect.objectContaining({
					where: expect.objectContaining({
						isGlobal: true,
						isResolvable: true,
						usageScope: 'project',
					}),
				}),
			);
		});

		it('does not add a resolvable filter for global read access', async () => {
			manager.find.mockResolvedValue([{ id: 'credential-1' }]);

			await expect(
				repository.findGlobalProjectCredentialIds(['credential-1'], false),
			).resolves.toEqual(['credential-1']);

			const options = manager.find.mock.calls[0]?.[1];
			expect(options?.where).not.toEqual(expect.objectContaining({ isResolvable: true }));
		});

		it('returns credential names for error descriptions', async () => {
			manager.find.mockResolvedValue([{ id: 'credential-1', name: 'Credential' }]);

			await expect(repository.findCredentialNames(['credential-1'])).resolves.toEqual([
				{ id: 'credential-1', name: 'Credential' },
			]);
			expect(manager.find).toHaveBeenCalledWith(CredentialsEntity, {
				select: { id: true, name: true },
				where: { id: In(['credential-1']) },
			});
		});

		it('short-circuits empty credential name and existence reads', async () => {
			await expect(repository.findCredentialNames([])).resolves.toEqual([]);
			await expect(repository.findExistingCredentialIds([])).resolves.toEqual([]);

			expect(manager.find).not.toHaveBeenCalled();
		});

		it('returns existing credential ids', async () => {
			manager.find.mockResolvedValue([{ id: 'credential-1' }]);

			await expect(repository.findExistingCredentialIds(['credential-1'])).resolves.toEqual([
				'credential-1',
			]);
			expect(manager.find).toHaveBeenCalledWith(CredentialsEntity, {
				select: { id: true },
				where: { id: In(['credential-1']) },
			});
		});

		it('maps owner projects by credential id', async () => {
			const project = { id: 'project-1' };
			manager.find.mockResolvedValue([
				Object.assign(new SharedCredentials(), {
					credentialsId: 'credential-1',
					project,
				}),
			]);

			const projects = await repository.findOwnerProjectsByCredentialIds(['credential-1']);

			expect(projects.get('credential-1')).toBe(project);
			expect(manager.find).toHaveBeenCalledWith(
				SharedCredentials,
				expect.objectContaining({
					where: expect.objectContaining({ role: 'credential:owner' }),
					relations: { project: true },
				}),
			);
		});

		it('filters credential ids by user and role slugs', async () => {
			manager.find.mockResolvedValue([
				Object.assign(new SharedCredentials(), { credentialsId: 'credential-1' }),
			]);

			await expect(
				repository.findCredentialIdsByUserAndRoles(
					['user-1'],
					['project:editor'],
					['credential:user'],
				),
			).resolves.toEqual(['credential-1']);
			const options = manager.find.mock.calls[0]?.[1];
			expect(options?.where).toEqual(
				expect.objectContaining({
					role: In(['credential:user']),
					project: expect.objectContaining({
						projectRelations: expect.objectContaining({
							userId: In(['user-1']),
							role: { slug: In(['project:editor']) },
						}),
					}),
				}),
			);
		});
	});

	describe('FolderAccessRepository', () => {
		const manager = mockEntityManager(Folder);
		const repository = new FolderAccessRepository(manager.connection, transactionRunner);

		beforeEach(() => vi.resetAllMocks());

		it('loads roles for folder access checks', async () => {
			const role = Object.assign(new Role(), { slug: 'project:custom', scopes: [] });
			manager.find.mockResolvedValue([role]);

			await expect(repository.findRolesForAccessCheck()).resolves.toEqual([role]);
			expect(manager.find).toHaveBeenCalledWith(Role, { relations: ['scopes'] });
		});

		it('uses the operation context transaction for folder reads', async () => {
			const transactionManager = mockEntityManager(Folder);
			transactionManager.find.mockResolvedValue([]);

			await repository.findFoldersByIdsForUser(['folder-1'], null, {
				trx: new TypeOrmTransaction(transactionManager),
			});

			expect(transactionManager.find).toHaveBeenCalledWith(
				Folder,
				expect.objectContaining({
					where: expect.objectContaining({ id: In(['folder-1']) }),
				}),
			);
			expect(manager.find).not.toHaveBeenCalled();
		});

		it('applies project access to folder reads', async () => {
			const folder = Object.assign(new Folder(), { id: 'folder-1' });
			manager.find.mockResolvedValue([folder]);

			await expect(
				repository.findFoldersByIdsForUser(['folder-1'], {
					userId: 'user-1',
					projectRoles: ['project:editor'],
				}),
			).resolves.toEqual([folder]);

			expect(manager.find).toHaveBeenCalledWith(
				Folder,
				expect.objectContaining({
					where: expect.objectContaining({
						id: In(['folder-1']),
						homeProject: expect.objectContaining({
							projectRelations: expect.objectContaining({
								role: In(['project:editor']),
								userId: 'user-1',
							}),
						}),
					}),
				}),
			);
		});

		it('chunks folder reads and merges distinct results', async () => {
			const first = Object.assign(new Folder(), { id: 'first' });
			const last = Object.assign(new Folder(), { id: 'last' });
			const folderIds = [
				...Array.from({ length: 10_000 }, (_, index) => `folder-${index}`),
				last.id,
			];
			manager.find.mockResolvedValueOnce([first]).mockResolvedValueOnce([first, last]);

			await expect(repository.findFoldersByIdsForUser(folderIds, null)).resolves.toEqual([
				first,
				last,
			]);
			expect(manager.find).toHaveBeenCalledTimes(2);
			expect(manager.find).toHaveBeenNthCalledWith(
				2,
				Folder,
				expect.objectContaining({
					where: expect.objectContaining({ id: In([last.id]) }),
				}),
			);
		});

		it('chunks existing folder id reads', async () => {
			const folderIds = Array.from({ length: 10_001 }, (_, index) => `folder-${index}`);
			manager.find.mockResolvedValue([]);

			await repository.findExistingFolderIds(folderIds);

			expect(manager.find).toHaveBeenCalledTimes(2);
		});

		it('returns existing folder ids', async () => {
			manager.find.mockResolvedValue([{ id: 'folder-1' }]);

			await expect(repository.findExistingFolderIds(['folder-1'])).resolves.toEqual(
				new Set(['folder-1']),
			);
		});

		it('lists folder ids in a project', async () => {
			manager.find.mockResolvedValue([{ id: 'folder-1' }]);

			await expect(repository.findFolderIdsInProject('project-1')).resolves.toEqual(['folder-1']);
			expect(manager.find).toHaveBeenCalledWith(Folder, {
				select: { id: true },
				where: { homeProject: { id: 'project-1' } },
			});
		});

		it('queries all descendants with a recursive CTE', async () => {
			const baseQuery = mock<SelectQueryBuilder<Folder>>();
			const recursiveQuery = mock<SelectQueryBuilder<Folder>>();
			const query = mock<SelectQueryBuilder<Folder>>();
			for (const builder of [baseQuery, recursiveQuery, query]) {
				builder.select.mockReturnValue(builder);
				builder.where.mockReturnValue(builder);
				builder.innerJoin.mockReturnValue(builder);
				builder.addCommonTableExpression.mockReturnValue(builder);
				builder.from.mockReturnValue(builder);
				builder.setParameters.mockReturnValue(builder);
			}
			baseQuery.getQuery.mockReturnValue('base query');
			baseQuery.getParameters.mockReturnValue({ parentFolderIds: ['folder-1'] });
			recursiveQuery.getQuery.mockReturnValue('recursive query');
			query.getRawMany.mockResolvedValue([{ id: 'child-1' }, { id: 'child-2' }]);
			manager.createQueryBuilder
				.mockReturnValueOnce(baseQuery)
				.mockReturnValueOnce(recursiveQuery)
				.mockReturnValueOnce(query);

			await expect(repository.findDescendantIds(['folder-1'])).resolves.toEqual([
				'child-1',
				'child-2',
			]);
			expect(query.addCommonTableExpression).toHaveBeenCalledWith(
				'base query UNION ALL recursive query',
				'folder_tree',
				{ recursive: true },
			);
		});

		it('short-circuits an empty descendant query', async () => {
			await expect(repository.findDescendantIds([])).resolves.toEqual([]);
			expect(manager.createQueryBuilder).not.toHaveBeenCalled();
		});
	});
});
