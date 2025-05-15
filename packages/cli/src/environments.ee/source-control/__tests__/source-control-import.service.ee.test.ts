import type { WorkflowEntity } from '@n8n/db';
import type { FolderRepository } from '@n8n/db';
import type { WorkflowRepository } from '@n8n/db';
import * as fastGlob from 'fast-glob';
import { mock } from 'jest-mock-extended';
import { type InstanceSettings } from 'n8n-core';
import fsp from 'node:fs/promises';

import { SourceControlImportService } from '../source-control-import.service.ee';
import type { ExportableFolder } from '../types/exportable-folders';

jest.mock('fast-glob');

describe('SourceControlImportService', () => {
	const workflowRepository = mock<WorkflowRepository>();
	const folderRepository = mock<FolderRepository>();
	const service = new SourceControlImportService(
		mock(),
		mock(),
		mock(),
		mock(),
		mock(),
		mock(),
		mock(),
		mock(),
		mock(),
		mock(),
		mock(),
		workflowRepository,
		mock(),
		mock(),
		mock(),
		mock(),
		folderRepository,
		mock<InstanceSettings>({ n8nFolder: '/mock/n8n' }),
	);

	const globMock = fastGlob.default as unknown as jest.Mock<Promise<string[]>, string[]>;
	const fsReadFile = jest.spyOn(fsp, 'readFile');

	beforeEach(() => jest.clearAllMocks());

	describe('getRemoteVersionIdsFromFiles', () => {
		const mockWorkflowFile = '/mock/workflow1.json';
		it('should parse workflow files correctly', async () => {
			globMock.mockResolvedValue([mockWorkflowFile]);

			const mockWorkflowData = {
				id: 'workflow1',
				versionId: 'v1',
				name: 'Test Workflow',
			};

			fsReadFile.mockResolvedValue(JSON.stringify(mockWorkflowData));

			const result = await service.getRemoteVersionIdsFromFiles();
			expect(fsReadFile).toHaveBeenCalledWith(mockWorkflowFile, { encoding: 'utf8' });

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual(
				expect.objectContaining({
					id: 'workflow1',
					versionId: 'v1',
					name: 'Test Workflow',
				}),
			);
		});

		it('should filter out files without valid workflow data', async () => {
			globMock.mockResolvedValue(['/mock/invalid.json']);

			fsReadFile.mockResolvedValue('{}');

			const result = await service.getRemoteVersionIdsFromFiles();

			expect(result).toHaveLength(0);
		});
	});

	describe('getRemoteCredentialsFromFiles', () => {
		it('should parse credential files correctly', async () => {
			globMock.mockResolvedValue(['/mock/credential1.json']);

			const mockCredentialData = {
				id: 'cred1',
				name: 'Test Credential',
				type: 'oauth2',
			};

			fsReadFile.mockResolvedValue(JSON.stringify(mockCredentialData));

			const result = await service.getRemoteCredentialsFromFiles();

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual(
				expect.objectContaining({
					id: 'cred1',
					name: 'Test Credential',
					type: 'oauth2',
				}),
			);
		});

		it('should filter out files without valid credential data', async () => {
			globMock.mockResolvedValue(['/mock/invalid.json']);
			fsReadFile.mockResolvedValue('{}');

			const result = await service.getRemoteCredentialsFromFiles();

			expect(result).toHaveLength(0);
		});
	});

	describe('getRemoteVariablesFromFile', () => {
		it('should parse variables file correctly', async () => {
			globMock.mockResolvedValue(['/mock/variables.json']);

			const mockVariablesData = [
				{ key: 'VAR1', value: 'value1' },
				{ key: 'VAR2', value: 'value2' },
			];

			fsReadFile.mockResolvedValue(JSON.stringify(mockVariablesData));

			const result = await service.getRemoteVariablesFromFile();

			expect(result).toEqual(mockVariablesData);
		});

		it('should return empty array if no variables file found', async () => {
			globMock.mockResolvedValue([]);

			const result = await service.getRemoteVariablesFromFile();

			expect(result).toHaveLength(0);
		});
	});

	describe('getRemoteTagsAndMappingsFromFile', () => {
		it('should parse tags and mappings file correctly', async () => {
			globMock.mockResolvedValue(['/mock/tags.json']);

			const mockTagsData = {
				tags: [{ id: 'tag1', name: 'Tag 1' }],
				mappings: [{ workflowId: 'workflow1', tagId: 'tag1' }],
			};

			fsReadFile.mockResolvedValue(JSON.stringify(mockTagsData));

			const result = await service.getRemoteTagsAndMappingsFromFile();

			expect(result.tags).toEqual(mockTagsData.tags);
			expect(result.mappings).toEqual(mockTagsData.mappings);
		});

		it('should return empty tags and mappings if no file found', async () => {
			globMock.mockResolvedValue([]);

			const result = await service.getRemoteTagsAndMappingsFromFile();

			expect(result.tags).toHaveLength(0);
			expect(result.mappings).toHaveLength(0);
		});
	});

	describe('getRemoteFoldersAndMappingsFromFile', () => {
		it('should parse folders and mappings file correctly', async () => {
			globMock.mockResolvedValue(['/mock/folders.json']);

			const now = new Date();

			const mockFoldersData: {
				folders: ExportableFolder[];
			} = {
				folders: [
					{
						id: 'folder1',
						name: 'folder 1',
						parentFolderId: null,
						homeProjectId: 'project1',
						createdAt: now.toISOString(),
						updatedAt: now.toISOString(),
					},
				],
			};

			fsReadFile.mockResolvedValue(JSON.stringify(mockFoldersData));

			const result = await service.getRemoteFoldersAndMappingsFromFile();

			expect(result.folders).toEqual(mockFoldersData.folders);
		});

		it('should return empty folders and mappings if no file found', async () => {
			globMock.mockResolvedValue([]);

			const result = await service.getRemoteFoldersAndMappingsFromFile();

			expect(result.folders).toHaveLength(0);
		});
	});

	describe('getLocalVersionIdsFromDb', () => {
		const now = new Date();
		jest.useFakeTimers({ now });

		it('should replace invalid updatedAt with current timestamp', async () => {
			const mockWorkflows = [
				{
					id: 'workflow1',
					name: 'Test Workflow',
					updatedAt: 'invalid-date',
				},
			] as unknown as WorkflowEntity[];

			workflowRepository.find.mockResolvedValue(mockWorkflows);

			const result = await service.getLocalVersionIdsFromDb();

			expect(result[0].updatedAt).toBe(now.toISOString());
		});
	});

	describe('getLocalFoldersAndMappingsFromDb', () => {
		it('should return data from DB', async () => {
			// Arrange

			folderRepository.find.mockResolvedValue([
				mock({ createdAt: new Date(), updatedAt: new Date() }),
			]);
			workflowRepository.find.mockResolvedValue([mock()]);

			// Act

			const result = await service.getLocalFoldersAndMappingsFromDb();

			// Assert

			expect(result.folders).toHaveLength(1);
			expect(result.folders[0]).toHaveProperty('id');
			expect(result.folders[0]).toHaveProperty('name');
			expect(result.folders[0]).toHaveProperty('parentFolderId');
			expect(result.folders[0]).toHaveProperty('homeProjectId');
		});
	});

	describe('importFoldersFromWorkFolder', () => {
		// add tests for this.
	});
});
