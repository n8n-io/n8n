import type { Project, User } from '@n8n/db';
import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';
import { Readable } from 'node:stream';

import type { ProjectService } from '@/services/project.service.ee';

import type { ProjectExporter } from '../project/project.exporter';
import { ImportExportService } from '../import-export.service';
import type { ManifestProjectEntry } from '../import-export.types';

// Mock the TarPackageWriter and constants
jest.mock('../tar-package-writer', () => ({
	TarPackageWriter: jest.fn().mockImplementation(() => ({
		writeFile: jest.fn(),
		writeDirectory: jest.fn(),
		finalize: jest.fn().mockReturnValue(
			new Readable({
				read() {
					this.push(null);
				},
			}),
		),
	})),
}));

jest.mock('@/constants', () => ({
	N8N_VERSION: '2.10.0',
}));

describe('ImportExportService', () => {
	let service: ImportExportService;
	let mockProjectService: MockProxy<ProjectService>;
	let mockProjectExporter: MockProxy<ProjectExporter>;
	let mockInstanceSettings: MockProxy<InstanceSettings>;
	let mockUser: MockProxy<User>;

	beforeEach(() => {
		jest.clearAllMocks();

		mockProjectService = mock<ProjectService>();
		mockProjectExporter = mock<ProjectExporter>();
		mockInstanceSettings = mock<InstanceSettings>({ instanceId: 'test-instance-id' });
		mockUser = mock<User>();

		service = new ImportExportService(
			mockProjectService,
			mockProjectExporter,
			mockInstanceSettings,
		);
	});

	describe('exportPackage', () => {
		it('should validate permissions for all projects', async () => {
			const projectIds = ['project-1', 'project-2'];
			const project1 = mock<Project>();
			const project2 = mock<Project>();

			mockProjectService.getProjectWithScope
				.mockResolvedValueOnce(project1)
				.mockResolvedValueOnce(project2);

			mockProjectExporter.export.mockResolvedValue([]);

			await service.exportPackage({ user: mockUser, projectIds });

			expect(mockProjectService.getProjectWithScope).toHaveBeenCalledTimes(2);
			expect(mockProjectService.getProjectWithScope).toHaveBeenCalledWith(mockUser, 'project-1', [
				'project:read',
			]);
			expect(mockProjectService.getProjectWithScope).toHaveBeenCalledWith(mockUser, 'project-2', [
				'project:read',
			]);
		});

		it('should throw NotFoundError when user lacks access to a project', async () => {
			mockProjectService.getProjectWithScope.mockResolvedValue(null);

			await expect(
				service.exportPackage({ user: mockUser, projectIds: ['missing-project'] }),
			).rejects.toThrow('not found or you do not have access');
		});

		it('should return a readable stream', async () => {
			mockProjectService.getProjectWithScope.mockResolvedValue(mock<Project>());
			mockProjectExporter.export.mockResolvedValue([]);

			const result = await service.exportPackage({
				user: mockUser,
				projectIds: ['project-1'],
			});

			expect(result).toBeInstanceOf(Readable);
		});

		it('should run the project exporter and write the manifest', async () => {
			const projectEntries: ManifestProjectEntry[] = [
				{ id: 'project-1', name: 'billing', target: 'projects/billing-projec' },
			];

			mockProjectService.getProjectWithScope.mockResolvedValue(mock<Project>());
			mockProjectExporter.export.mockResolvedValue(projectEntries);

			await service.exportPackage({
				user: mockUser,
				projectIds: ['project-1'],
			});

			expect(mockProjectExporter.export).toHaveBeenCalledTimes(1);

			// Verify the manifest was written via the TarPackageWriter
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
			const { TarPackageWriter } = jest.requireMock('../tar-package-writer') as {
				TarPackageWriter: jest.Mock;
			};
			const writerInstance = TarPackageWriter.mock.results[0].value;
			expect(writerInstance.writeFile).toHaveBeenCalledWith(
				'manifest.json',
				expect.stringContaining('"formatVersion"'),
			);

			const manifestJson = JSON.parse(String(writerInstance.writeFile.mock.calls[0][1]));
			expect(manifestJson).toMatchObject({
				formatVersion: '1',
				n8nVersion: '2.10.0',
				source: 'test-instance-id',
				projects: projectEntries,
			});
			expect(manifestJson.exportedAt).toBeDefined();
		});
	});
});
