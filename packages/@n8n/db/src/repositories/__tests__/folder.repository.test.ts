import { mock } from 'vitest-mock-extended';
import type { TransactionRunner } from '../../services/transaction';
import { In, type EntityManager } from '@n8n/typeorm';

import { Folder } from '../../entities';
import { mockEntityManager } from '../../utils/test-utils/mock-entity-manager';
import { TypeOrmTransaction } from '../../services/typeorm-transaction';
import { FolderRepository } from '../folder.repository';

describe('FolderRepository', () => {
	const entityManager = mockEntityManager(Folder);
	const repository = new FolderRepository(entityManager.connection, mock<TransactionRunner>());

	beforeEach(() => {
		vi.resetAllMocks();
	});

	it('keeps transaction primitives out of the repository contract', () => {
		expect(repository).not.toHaveProperty('managerFor');
		expect(repository).not.toHaveProperty('runInTransaction');
	});

	it('relocates children and removes the folder through the active transaction', async () => {
		const manager = mock<EntityManager>();
		const ctx = { trx: new TypeOrmTransaction(manager) };

		await repository.relocateChildrenAndDelete('source', 'project', 'agent', 'target', ctx);

		expect(manager.update).toHaveBeenCalledWith(
			Folder,
			{ parentFolderId: 'source', homeProject: { id: 'project' }, resourceType: 'agent' },
			{ parentFolderId: 'target' },
		);
		expect(manager.delete).toHaveBeenCalledWith(Folder, {
			id: 'source',
			homeProject: { id: 'project' },
			resourceType: 'agent',
		});
		expect(entityManager.update).not.toHaveBeenCalled();
		expect(entityManager.delete).not.toHaveBeenCalled();
	});

	it('removes a folder subtree through the active transaction', async () => {
		const manager = mock<EntityManager>();
		const ctx = { trx: new TypeOrmTransaction(manager) };

		await repository.deleteFolderSubtree('source', 'project', 'agent', ctx);

		expect(manager.delete).toHaveBeenCalledWith(Folder, {
			id: 'source',
			homeProject: { id: 'project' },
			resourceType: 'agent',
		});
		expect(entityManager.delete).not.toHaveBeenCalled();
	});

	it('merges folders returned from different chunks', async () => {
		const first = Object.assign(new Folder(), { id: 'first' });
		const last = Object.assign(new Folder(), { id: 'last' });
		entityManager.find.mockResolvedValueOnce([first]).mockResolvedValueOnce([last]);
		const folderIds = Array.from({ length: 10_001 }, (_, index) => `folder-${index}`);

		const result = await repository.findManyByIds(folderIds);

		expect(entityManager.find).toHaveBeenCalledTimes(2);
		expect(entityManager.find).toHaveBeenNthCalledWith(2, Folder, {
			where: { id: In(['folder-10000']) },
			relations: { homeProject: true },
		});
		expect(result).toEqual([first, last]);
	});

	it('merges existing ids returned from different chunks', async () => {
		entityManager.find
			.mockResolvedValueOnce([{ id: 'first' }])
			.mockResolvedValueOnce([{ id: 'last' }]);
		const folderIds = Array.from({ length: 10_001 }, (_, index) => `folder-${index}`);

		const result = await repository.findExistingIds(folderIds);

		expect(entityManager.find).toHaveBeenCalledTimes(2);
		expect(result).toEqual(new Set(['first', 'last']));
	});
});
