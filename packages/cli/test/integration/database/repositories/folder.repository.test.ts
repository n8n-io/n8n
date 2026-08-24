import { testDb } from '@n8n/backend-test-utils';
import { FolderRepository } from '@n8n/db';
import { Container } from '@n8n/di';

describe('FolderRepository', () => {
	beforeAll(async () => {
		await testDb.init();
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	it('resolves subtree ids beyond the SQLite bind-parameter limit', async () => {
		const folderIds = Array.from({ length: 32_767 }, (_, index) => `folder-${index}`);

		await expect(
			Container.get(FolderRepository).getAllFolderIdsInSubtrees(folderIds),
		).resolves.toEqual([]);
	});
});
