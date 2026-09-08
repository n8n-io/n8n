import { In } from '@n8n/typeorm';

import { Folder } from '../../entities';
import { mockEntityManager } from '../../utils/test-utils/mock-entity-manager';
import { FolderRepository } from '../folder.repository';

describe('FolderRepository', () => {
	const entityManager = mockEntityManager(Folder);
	const repository = new FolderRepository(entityManager.connection);

	beforeEach(() => {
		vi.resetAllMocks();
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
