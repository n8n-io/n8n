import type { Folder, FolderRepository } from '@n8n/db';
import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';

import type { ExportScope } from '../../import-export.types';
import type { PackageWriter } from '../../package-writer';
import { FolderExporter } from '../folder.exporter';
import type { FolderSerializer } from '../folder.serializer';

describe('FolderExporter', () => {
	let exporter: FolderExporter;
	let mockFolderRepository: MockProxy<FolderRepository>;
	let mockSerializer: MockProxy<FolderSerializer>;
	let mockWriter: MockProxy<PackageWriter>;
	let scope: ExportScope;

	const basePath = 'projects/billing-550e84';

	beforeEach(() => {
		jest.clearAllMocks();

		mockFolderRepository = mock<FolderRepository>();
		mockSerializer = mock<FolderSerializer>();
		mockWriter = mock<PackageWriter>();

		exporter = new FolderExporter(mockFolderRepository, mockSerializer);

		scope = {
			basePath,
			projectId: 'project-1',
			writer: mockWriter,
			entityOptions: {},
			state: { folderPathMap: new Map(), nodesByWorkflow: [] },
		};
	});

	it('should return empty array when project has no folders', async () => {
		mockFolderRepository.find.mockResolvedValue([]);

		const result = await exporter.export(scope);

		expect(result).toEqual([]);
		expect(mockWriter.writeDirectory).not.toHaveBeenCalled();
		expect(mockWriter.writeFile).not.toHaveBeenCalled();
	});

	it('should export a root folder', async () => {
		const folder = {
			id: 'aabb1100-0000-0000-0000-000000000000',
			name: 'invoices',
			parentFolderId: null,
		} as Folder;

		mockFolderRepository.find.mockResolvedValue([folder]);
		mockSerializer.serialize.mockReturnValue({
			id: folder.id,
			name: folder.name,
			parentFolderId: null,
		});

		const result = await exporter.export(scope);

		expect(result).toHaveLength(1);
		expect(result[0].id).toBe(folder.id);
		expect(result[0].name).toBe('invoices');
		expect(result[0].target).toBe('projects/billing-550e84/folders/invoices-aabb11');

		expect(mockWriter.writeDirectory).toHaveBeenCalledWith(
			'projects/billing-550e84/folders/invoices-aabb11',
		);
		expect(mockWriter.writeFile).toHaveBeenCalledWith(
			'projects/billing-550e84/folders/invoices-aabb11/folder.json',
			expect.any(String),
		);
	});

	it('should return folderPathMap in result', async () => {
		const folder = {
			id: 'aabb1100-0000-0000-0000-000000000000',
			name: 'invoices',
			parentFolderId: null,
		} as Folder;

		mockFolderRepository.find.mockResolvedValue([folder]);
		mockSerializer.serialize.mockReturnValue({
			id: folder.id,
			name: folder.name,
			parentFolderId: null,
		});

		await exporter.export(scope);

		expect(scope.state.folderPathMap.get(folder.id)).toBe(
			'projects/billing-550e84/folders/invoices-aabb11',
		);
	});

	it('should nest child folders under their parent', async () => {
		const parentFolder = {
			id: 'aabb1100-0000-0000-0000-000000000000',
			name: 'invoices',
			parentFolderId: null,
		} as Folder;

		const childFolder = {
			id: 'eeff3300-0000-0000-0000-000000000000',
			name: 'q1-reports',
			parentFolderId: 'aabb1100-0000-0000-0000-000000000000',
		} as Folder;

		mockFolderRepository.find.mockResolvedValue([parentFolder, childFolder]);
		mockSerializer.serialize
			.mockReturnValueOnce({
				id: parentFolder.id,
				name: parentFolder.name,
				parentFolderId: null,
			})
			.mockReturnValueOnce({
				id: childFolder.id,
				name: childFolder.name,
				parentFolderId: childFolder.parentFolderId,
			});

		const result = await exporter.export(scope);

		expect(result).toHaveLength(2);

		const parentEntry = result.find((e) => e.id === parentFolder.id)!;
		const childEntry = result.find((e) => e.id === childFolder.id)!;

		expect(parentEntry.target).toBe('projects/billing-550e84/folders/invoices-aabb11');
		expect(childEntry.target).toBe(
			'projects/billing-550e84/folders/invoices-aabb11/q1-reports-eeff33',
		);
	});

	it('should export multiple root folders', async () => {
		const folders = [
			{ id: 'aabb1100-0000-0000-0000-000000000000', name: 'invoices', parentFolderId: null },
			{ id: 'ccdd2200-0000-0000-0000-000000000000', name: 'payments', parentFolderId: null },
		] as Folder[];

		mockFolderRepository.find.mockResolvedValue(folders);
		mockSerializer.serialize
			.mockReturnValueOnce({ id: folders[0].id, name: folders[0].name, parentFolderId: null })
			.mockReturnValueOnce({ id: folders[1].id, name: folders[1].name, parentFolderId: null });

		const result = await exporter.export(scope);

		expect(result).toHaveLength(2);
		expect(mockWriter.writeDirectory).toHaveBeenCalledTimes(2);
		expect(mockWriter.writeFile).toHaveBeenCalledTimes(2);
	});

	it('should serialize folder data as JSON in the written file', async () => {
		const folder = {
			id: 'aabb1100-0000-0000-0000-000000000000',
			name: 'invoices',
			parentFolderId: null,
		} as Folder;

		const serialized = { id: folder.id, name: 'invoices', parentFolderId: null };
		mockFolderRepository.find.mockResolvedValue([folder]);
		mockSerializer.serialize.mockReturnValue(serialized);

		await exporter.export(scope);

		const writtenContent = mockWriter.writeFile.mock.calls[0][1] as string;
		expect(JSON.parse(writtenContent)).toEqual(serialized);
	});

	it('should handle deeply nested folders', async () => {
		const root = {
			id: 'aabb1100-0000-0000-0000-000000000000',
			name: 'level-1',
			parentFolderId: null,
		} as Folder;

		const mid = {
			id: 'ccdd2200-0000-0000-0000-000000000000',
			name: 'level-2',
			parentFolderId: 'aabb1100-0000-0000-0000-000000000000',
		} as Folder;

		const leaf = {
			id: 'eeff3300-0000-0000-0000-000000000000',
			name: 'level-3',
			parentFolderId: 'ccdd2200-0000-0000-0000-000000000000',
		} as Folder;

		mockFolderRepository.find.mockResolvedValue([root, mid, leaf]);
		mockSerializer.serialize
			.mockReturnValueOnce({ id: root.id, name: root.name, parentFolderId: null })
			.mockReturnValueOnce({
				id: mid.id,
				name: mid.name,
				parentFolderId: mid.parentFolderId,
			})
			.mockReturnValueOnce({
				id: leaf.id,
				name: leaf.name,
				parentFolderId: leaf.parentFolderId,
			});

		const result = await exporter.export(scope);

		const leafEntry = result.find((e) => e.id === leaf.id)!;
		expect(leafEntry.target).toBe(
			'projects/billing-550e84/folders/level-1-aabb11/level-2-ccdd22/level-3-eeff33',
		);
	});

	it('should query folders by project id', async () => {
		mockFolderRepository.find.mockResolvedValue([]);

		await exporter.export(scope);

		expect(mockFolderRepository.find).toHaveBeenCalledWith({
			where: { homeProject: { id: 'project-1' } },
		});
	});

	describe('folderIds scope', () => {
		beforeEach(() => {
			scope = {
				basePath: '.',
				folderIds: ['folder-1'],
				writer: mockWriter,
				entityOptions: {},
				state: { folderPathMap: new Map(), nodesByWorkflow: [] },
			};
		});

		it('should fetch target folders and their descendants', async () => {
			const parentFolder = {
				id: 'folder-1',
				name: 'invoices',
				parentFolderId: null,
			} as Folder;

			const childFolder = {
				id: 'folder-2',
				name: 'q1',
				parentFolderId: 'folder-1',
			} as Folder;

			mockFolderRepository.getAllFolderIdsInHierarchy.mockResolvedValue(['folder-2']);
			mockFolderRepository.find.mockResolvedValue([parentFolder, childFolder]);
			mockSerializer.serialize
				.mockReturnValueOnce({ id: parentFolder.id, name: parentFolder.name, parentFolderId: null })
				.mockReturnValueOnce({
					id: childFolder.id,
					name: childFolder.name,
					parentFolderId: childFolder.parentFolderId,
				});

			const result = await exporter.export(scope);

			expect(mockFolderRepository.getAllFolderIdsInHierarchy).toHaveBeenCalledWith('folder-1');
			expect(result).toHaveLength(2);
			expect(result.map((e) => e.id).sort()).toEqual(['folder-1', 'folder-2']);
		});

		it('should deduplicate when parent and child are both selected', async () => {
			scope.folderIds = ['folder-1', 'folder-2'];

			const parentFolder = { id: 'folder-1', name: 'invoices', parentFolderId: null } as Folder;
			const childFolder = { id: 'folder-2', name: 'q1', parentFolderId: 'folder-1' } as Folder;

			// folder-1 has child folder-2; folder-2 has no children
			mockFolderRepository.getAllFolderIdsInHierarchy
				.mockResolvedValueOnce(['folder-2'])
				.mockResolvedValueOnce([]);

			mockFolderRepository.find.mockResolvedValue([parentFolder, childFolder]);
			mockSerializer.serialize
				.mockReturnValueOnce({ id: parentFolder.id, name: parentFolder.name, parentFolderId: null })
				.mockReturnValueOnce({
					id: childFolder.id,
					name: childFolder.name,
					parentFolderId: childFolder.parentFolderId,
				});

			const result = await exporter.export(scope);

			expect(result).toHaveLength(2);
			// The find should be called with both IDs (deduplicated via Set)
			expect(mockFolderRepository.find).toHaveBeenCalledTimes(1);
		});

		it('should return empty when folderIds yields no folders', async () => {
			mockFolderRepository.getAllFolderIdsInHierarchy.mockResolvedValue([]);
			mockFolderRepository.find.mockResolvedValue([]);

			const result = await exporter.export(scope);

			expect(result).toEqual([]);
		});
	});
});
