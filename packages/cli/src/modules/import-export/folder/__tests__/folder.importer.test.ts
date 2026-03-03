import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';

import type { FolderService } from '@/services/folder.service';

import type { ProjectImportContext } from '../../import-export.types';
import type { PackageReader } from '../../package-reader';
import { FolderImporter } from '../folder.importer';
import type { ManifestFolderEntry } from '../folder.types';

describe('FolderImporter', () => {
	let importer: FolderImporter;
	let mockFolderService: MockProxy<FolderService>;
	let mockReader: MockProxy<PackageReader>;
	let ctx: ProjectImportContext;

	beforeEach(() => {
		jest.clearAllMocks();

		mockFolderService = mock<FolderService>();
		mockReader = mock<PackageReader>();

		importer = new FolderImporter(mockFolderService);

		ctx = {
			user: mock(),
			projectId: 'new-project-1',
			projectEntry: mock(),
			folderIdMap: new Map(),
			reader: mockReader,
		};
	});

	it('should do nothing when entries is empty', async () => {
		await importer.importForProject(ctx, []);

		expect(mockFolderService.createFolder).not.toHaveBeenCalled();
	});

	it('should import a root folder', async () => {
		const entries: ManifestFolderEntry[] = [
			{ id: 'source-folder-1', name: 'invoices', target: 'projects/billing/folders/invoices' },
		];

		mockReader.readFile.mockReturnValue(
			JSON.stringify({ id: 'source-folder-1', name: 'invoices', parentFolderId: null }),
		);

		mockFolderService.createFolder.mockResolvedValue({ id: 'new-folder-1' } as never);

		await importer.importForProject(ctx, entries);

		expect(mockFolderService.createFolder).toHaveBeenCalledWith(
			{ name: 'invoices', parentFolderId: undefined },
			'new-project-1',
		);
		expect(ctx.folderIdMap.get('source-folder-1')).toBe('new-folder-1');
	});

	it('should import nested folders in correct order (parent before child)', async () => {
		const entries: ManifestFolderEntry[] = [
			{ id: 'child', name: 'q1', target: 'projects/billing/folders/invoices/q1' },
			{ id: 'parent', name: 'invoices', target: 'projects/billing/folders/invoices' },
		];

		mockReader.readFile
			.mockReturnValueOnce(JSON.stringify({ id: 'child', name: 'q1', parentFolderId: 'parent' }))
			.mockReturnValueOnce(
				JSON.stringify({ id: 'parent', name: 'invoices', parentFolderId: null }),
			);

		mockFolderService.createFolder
			.mockResolvedValueOnce({ id: 'new-parent' } as never)
			.mockResolvedValueOnce({ id: 'new-child' } as never);

		await importer.importForProject(ctx, entries);

		// Parent should be created first
		expect(mockFolderService.createFolder).toHaveBeenNthCalledWith(
			1,
			{ name: 'invoices', parentFolderId: undefined },
			'new-project-1',
		);
		// Child should use remapped parent ID
		expect(mockFolderService.createFolder).toHaveBeenNthCalledWith(
			2,
			{ name: 'q1', parentFolderId: 'new-parent' },
			'new-project-1',
		);

		expect(ctx.folderIdMap.get('parent')).toBe('new-parent');
		expect(ctx.folderIdMap.get('child')).toBe('new-child');
	});

	it('should handle deeply nested folders', async () => {
		const entries: ManifestFolderEntry[] = [
			{ id: 'leaf', name: 'leaf', target: 'projects/p/folders/root/mid/leaf' },
			{ id: 'root', name: 'root', target: 'projects/p/folders/root' },
			{ id: 'mid', name: 'mid', target: 'projects/p/folders/root/mid' },
		];

		mockReader.readFile
			.mockReturnValueOnce(JSON.stringify({ id: 'leaf', name: 'leaf', parentFolderId: 'mid' }))
			.mockReturnValueOnce(JSON.stringify({ id: 'root', name: 'root', parentFolderId: null }))
			.mockReturnValueOnce(JSON.stringify({ id: 'mid', name: 'mid', parentFolderId: 'root' }));

		mockFolderService.createFolder
			.mockResolvedValueOnce({ id: 'new-root' } as never)
			.mockResolvedValueOnce({ id: 'new-mid' } as never)
			.mockResolvedValueOnce({ id: 'new-leaf' } as never);

		await importer.importForProject(ctx, entries);

		const calls = mockFolderService.createFolder.mock.calls;
		expect(calls[0][0].name).toBe('root');
		expect(calls[1][0].name).toBe('mid');
		expect(calls[2][0].name).toBe('leaf');
	});
});
