import type { FolderRepository } from '@n8n/db';
import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';

import type { ImportScope } from '../../import-export.types';
import type { PackageReader } from '../../package-reader';
import { FolderImporter } from '../folder.importer';
import type { ManifestEntry } from '../../import-export.types';

describe('FolderImporter', () => {
	let importer: FolderImporter;
	let mockFolderRepository: MockProxy<FolderRepository>;
	let mockReader: MockProxy<PackageReader>;
	let scope: ImportScope;

	beforeEach(() => {
		jest.clearAllMocks();

		mockFolderRepository = mock<FolderRepository>();
		mockReader = mock<PackageReader>();

		importer = new FolderImporter(mockFolderRepository);

		scope = {
			user: mock(),
			targetProjectId: 'new-project-1',
			reader: mockReader,
			entityOptions: {},
			state: {
				folderIdMap: new Map(),
				credentialBindings: new Map(),
				subWorkflowBindings: new Map(),
			},
		};
	});

	it('should do nothing when entries is empty', async () => {
		await importer.import(scope, []);

		expect(scope.state.folderIdMap.size).toBe(0);
	});

	it('should create a root folder when no existing match', async () => {
		const entries: ManifestEntry[] = [
			{ id: 'source-folder-1', name: 'invoices', target: 'projects/billing/folders/invoices' },
		];

		mockReader.readFile.mockReturnValue(
			JSON.stringify({ id: 'source-folder-1', name: 'invoices', parentFolderId: null }),
		);
		mockFolderRepository.findOne.mockResolvedValue(null);
		mockFolderRepository.create.mockReturnValue({ id: 'new-folder-1' } as never);
		mockFolderRepository.save.mockResolvedValue({ id: 'new-folder-1' } as never);

		await importer.import(scope, entries);

		expect(mockFolderRepository.save).toHaveBeenCalled();
		expect(scope.state.folderIdMap.get('source-folder-1')).toBe('new-folder-1');
	});

	it('should reuse an existing folder with the same name and parent', async () => {
		const entries: ManifestEntry[] = [
			{ id: 'source-folder-1', name: 'invoices', target: 'projects/billing/folders/invoices' },
		];

		mockReader.readFile.mockReturnValue(
			JSON.stringify({ id: 'source-folder-1', name: 'invoices', parentFolderId: null }),
		);
		mockFolderRepository.findOne.mockResolvedValue({ id: 'existing-folder-1' } as never);

		await importer.import(scope, entries);

		expect(scope.state.folderIdMap.get('source-folder-1')).toBe('existing-folder-1');
	});

	it('should import nested folders in correct order (parent before child)', async () => {
		const entries: ManifestEntry[] = [
			{ id: 'child', name: 'q1', target: 'projects/billing/folders/invoices/q1' },
			{ id: 'parent', name: 'invoices', target: 'projects/billing/folders/invoices' },
		];

		mockReader.readFile
			.mockReturnValueOnce(JSON.stringify({ id: 'child', name: 'q1', parentFolderId: 'parent' }))
			.mockReturnValueOnce(
				JSON.stringify({ id: 'parent', name: 'invoices', parentFolderId: null }),
			);

		mockFolderRepository.findOne.mockResolvedValue(null);
		mockFolderRepository.create.mockImplementation((data) => data as never);
		mockFolderRepository.save
			.mockResolvedValueOnce({ id: 'new-parent' } as never)
			.mockResolvedValueOnce({ id: 'new-child' } as never);

		await importer.import(scope, entries);

		expect(scope.state.folderIdMap.get('parent')).toBe('new-parent');
		expect(scope.state.folderIdMap.get('child')).toBe('new-child');
	});

	describe('assignNewIds', () => {
		beforeEach(() => {
			scope.assignNewIds = true;
		});

		it('should save folders with deterministic IDs', async () => {
			const entries: ManifestEntry[] = [
				{ id: 'folder-1', name: 'invoices', target: 'folders/invoices' },
			];

			mockReader.readFile.mockReturnValue(
				JSON.stringify({ id: 'folder-1', name: 'invoices', parentFolderId: null }),
			);
			mockFolderRepository.create.mockReturnValue({ id: 'new-project-1-folder-1' } as never);
			mockFolderRepository.save.mockResolvedValue({ id: 'new-project-1-folder-1' } as never);

			await importer.import(scope, entries);

			expect(mockFolderRepository.create).toHaveBeenCalledWith({
				id: 'new-project-1-folder-1',
				name: 'invoices',
				parentFolderId: null,
				homeProject: { id: 'new-project-1' },
			});
			expect(mockFolderRepository.save).toHaveBeenCalled();
			expect(scope.state.folderIdMap.get('folder-1')).toBe('new-project-1-folder-1');
		});

		it('should save nested folders with remapped parent IDs', async () => {
			const entries: ManifestEntry[] = [
				{ id: 'child', name: 'q1', target: 'folders/invoices/q1' },
				{ id: 'parent', name: 'invoices', target: 'folders/invoices' },
			];

			mockReader.readFile
				.mockReturnValueOnce(JSON.stringify({ id: 'child', name: 'q1', parentFolderId: 'parent' }))
				.mockReturnValueOnce(
					JSON.stringify({ id: 'parent', name: 'invoices', parentFolderId: null }),
				);

			mockFolderRepository.create.mockImplementation((data) => data as never);
			mockFolderRepository.save.mockImplementation((data) => Promise.resolve(data) as never);

			await importer.import(scope, entries);

			// Parent first
			expect(mockFolderRepository.create).toHaveBeenNthCalledWith(
				1,
				expect.objectContaining({ id: 'new-project-1-parent', parentFolderId: null }),
			);
			// Child uses remapped parent ID
			expect(mockFolderRepository.create).toHaveBeenNthCalledWith(
				2,
				expect.objectContaining({
					id: 'new-project-1-child',
					parentFolderId: 'new-project-1-parent',
				}),
			);
		});
	});

	it('should handle deeply nested folders', async () => {
		const entries: ManifestEntry[] = [
			{ id: 'leaf', name: 'leaf', target: 'projects/p/folders/root/mid/leaf' },
			{ id: 'root', name: 'root', target: 'projects/p/folders/root' },
			{ id: 'mid', name: 'mid', target: 'projects/p/folders/root/mid' },
		];

		mockReader.readFile
			.mockReturnValueOnce(JSON.stringify({ id: 'leaf', name: 'leaf', parentFolderId: 'mid' }))
			.mockReturnValueOnce(JSON.stringify({ id: 'root', name: 'root', parentFolderId: null }))
			.mockReturnValueOnce(JSON.stringify({ id: 'mid', name: 'mid', parentFolderId: 'root' }));

		mockFolderRepository.findOne.mockResolvedValue(null);
		mockFolderRepository.create.mockImplementation((data) => data as never);
		mockFolderRepository.save
			.mockResolvedValueOnce({ id: 'new-root' } as never)
			.mockResolvedValueOnce({ id: 'new-mid' } as never)
			.mockResolvedValueOnce({ id: 'new-leaf' } as never);

		await importer.import(scope, entries);

		expect(scope.state.folderIdMap.get('root')).toBe('new-root');
		expect(scope.state.folderIdMap.get('mid')).toBe('new-mid');
		expect(scope.state.folderIdMap.get('leaf')).toBe('new-leaf');
	});
});
