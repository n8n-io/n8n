import type { SourceControlledFile } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import {
	GLOBAL_ADMIN_ROLE,
	GLOBAL_MEMBER_ROLE,
	Project,
	type ProjectRepository,
	User,
	type UserRepository,
} from '@n8n/db';
import * as fastGlob from 'fast-glob';
import { type InstanceSettings } from 'n8n-core';
import fsp from 'node:fs/promises';

vi.mock('node:fs/promises');
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { SourceControlScopedService } from '@/modules/source-control.ee/source-control-scoped.service';
import { SourceControlContext } from '@/modules/source-control.ee/types/source-control-context';

import type { DataTableColumnRepository } from '../../data-table-column.repository';
import type { DataTableDDLService } from '../../data-table-ddl.service';
import type { DataTableSizeValidator } from '../../data-table-size-validator.service';
import type { DataTableRepository } from '../../data-table.repository';
import { DataTableSourceControlService } from '../data-table-source-control.service';

vi.mock('fast-glob');

describe('DataTableSourceControlService', () => {
	const mockLogger = mock<Logger>();
	const dataTableRepository = mock<DataTableRepository>();
	const dataTableColumnRepository = mock<DataTableColumnRepository>();
	const dataTableDDLService = mock<DataTableDDLService>();
	const dataTableSizeValidator = mock<DataTableSizeValidator>();
	const projectRepository = mock<ProjectRepository>();
	const userRepository = mock<UserRepository>();
	const sourceControlScopedService = mock<SourceControlScopedService>();

	const globalAdminContext = new SourceControlContext(
		Object.assign(new User(), { role: GLOBAL_ADMIN_ROLE }),
		[],
		[],
	);
	const globalMemberContext = new SourceControlContext(
		Object.assign(new User(), { id: 'user1', role: GLOBAL_MEMBER_ROLE }),
		[Object.assign(new Project(), { id: 'project1', name: 'Team Project 1', type: 'team' })],
		[],
	);

	const service = new DataTableSourceControlService(
		mockLogger,
		dataTableRepository,
		dataTableColumnRepository,
		dataTableDDLService,
		dataTableSizeValidator,
		projectRepository,
		userRepository,
		sourceControlScopedService,
		mock<InstanceSettings>({ n8nFolder: '/mock/n8n' }),
	);

	const globMock = fastGlob.default as unknown as Mock<(...args: string[]) => Promise<string[]>>;
	const fsReadFile = vi.spyOn(fsp, 'readFile');
	const fsWriteFile = vi.spyOn(fsp, 'writeFile');

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('exportDataTablesToWorkFolder', () => {
		it('should export data tables as individual files', async () => {
			// Arrange
			const mockDataTables = [
				{
					id: 'dt1',
					name: 'Test Table 1',
					projectId: 'project1',
					columns: [
						{ id: 'col1', name: 'Column 1', type: 'string', index: 0 },
						{ id: 'col2', name: 'Column 2', type: 'number', index: 1 },
					],
					createdAt: new Date('2024-01-01'),
					updatedAt: new Date('2024-01-02'),
					project: {
						id: 'project1',
						name: 'Team Project 1',
						type: 'team',
						projectRelations: [],
					},
				},
				{
					id: 'dt2',
					name: 'Test Table 2',
					projectId: 'project2',
					columns: [{ id: 'col3', name: 'Column 3', type: 'boolean', index: 0 }],
					createdAt: new Date('2024-01-03'),
					updatedAt: new Date('2024-01-04'),
					project: {
						id: 'project2',
						name: 'Team Project 2',
						type: 'team',
						projectRelations: [],
					},
				},
			];

			const candidates = [
				{
					id: 'dt1',
					name: 'Test Table 1',
					type: 'datatable' as const,
					status: 'created' as const,
					file: '/mock/n8n/git/datatables/dt1.json',
					location: 'local' as const,
					conflict: false,
					updatedAt: '2024-01-02T00:00:00.000Z',
				},
				{
					id: 'dt2',
					name: 'Test Table 2',
					type: 'datatable' as const,
					status: 'created' as const,
					file: '/mock/n8n/git/datatables/dt2.json',
					location: 'local' as const,
					conflict: false,
					updatedAt: '2024-01-04T00:00:00.000Z',
				},
			];

			dataTableRepository.findForSourceControlExport.mockResolvedValue(mockDataTables as any);

			// Act
			const result = await service.exportDataTablesToWorkFolder(candidates, globalAdminContext);

			// Assert
			expect(result.count).toBe(2);
			expect(result.files).toHaveLength(2);
			expect(result.files[0].name).toBe('/mock/n8n/git/datatables/dt1.json');
			expect(result.files[1].name).toBe('/mock/n8n/git/datatables/dt2.json');

			// Check first file
			expect(fsWriteFile).toHaveBeenCalledWith(
				'/mock/n8n/git/datatables/dt1.json',
				expect.any(String),
			);
			const exportedData1 = JSON.parse(
				(fsWriteFile.mock.calls.find((c) => c[0] === '/mock/n8n/git/datatables/dt1.json')?.[1] ??
					'') as string,
			);
			expect(exportedData1).toEqual({
				id: 'dt1',
				name: 'Test Table 1',
				ownedBy: {
					type: 'team',
					teamId: 'project1',
					teamName: 'Team Project 1',
				},
				columns: [
					{ id: 'col1', name: 'Column 1', type: 'string', index: 0 },
					{ id: 'col2', name: 'Column 2', type: 'number', index: 1 },
				],
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-02T00:00:00.000Z',
			});

			// Check second file
			const exportedData2 = JSON.parse(
				(fsWriteFile.mock.calls.find((c) => c[0] === '/mock/n8n/git/datatables/dt2.json')?.[1] ??
					'') as string,
			);
			expect(exportedData2).toEqual({
				id: 'dt2',
				name: 'Test Table 2',
				ownedBy: {
					type: 'team',
					teamId: 'project2',
					teamName: 'Team Project 2',
				},
				columns: [{ id: 'col3', name: 'Column 3', type: 'boolean', index: 0 }],
				createdAt: '2024-01-03T00:00:00.000Z',
				updatedAt: '2024-01-04T00:00:00.000Z',
			});
		});

		it('should return empty result when no candidates provided', async () => {
			// Arrange
			const candidates: SourceControlledFile[] = [];

			// Act
			const result = await service.exportDataTablesToWorkFolder(candidates, globalAdminContext);

			// Assert
			expect(result.count).toBe(0);
			expect(result.files).toHaveLength(0);
			expect(fsWriteFile).not.toHaveBeenCalled();
		});

		it('should scope exported data tables to projects the user can push to', async () => {
			// Arrange
			const candidates = [
				{
					id: 'dt1',
					name: 'Test Table 1',
					type: 'datatable' as const,
					status: 'created' as const,
					file: '/mock/n8n/git/datatables/dt1.json',
					location: 'local' as const,
					conflict: false,
					updatedAt: '2024-01-02T00:00:00.000Z',
				},
			];
			const scopedFilter = { id: 'authorized-project' };
			sourceControlScopedService.getProjectsWithPushScopeByContextFilter.mockReturnValue(
				scopedFilter as any,
			);
			dataTableRepository.findForSourceControlExport.mockResolvedValue([]);

			// Act
			await service.exportDataTablesToWorkFolder(candidates, globalMemberContext);

			// Assert
			expect(
				sourceControlScopedService.getProjectsWithPushScopeByContextFilter,
			).toHaveBeenCalledWith(globalMemberContext);
			expect(dataTableRepository.findForSourceControlExport).toHaveBeenCalledWith(
				['dt1'],
				scopedFilter,
			);
		});

		it('should handle export errors gracefully', async () => {
			// Arrange
			const candidates = [
				{
					id: 'dt1',
					name: 'Test Table 1',
					type: 'datatable' as const,
					status: 'created' as const,
					file: '/mock/n8n/git/datatables/dt1.json',
					location: 'local' as const,
					conflict: false,
					updatedAt: '2024-01-02T00:00:00.000Z',
				},
			];
			dataTableRepository.findForSourceControlExport.mockRejectedValue(new Error('Database error'));

			// Act & Assert
			await expect(
				service.exportDataTablesToWorkFolder(candidates, globalAdminContext),
			).rejects.toThrow('Failed to export data tables to work folder');
		});
	});

	describe('getRemoteDataTablesFromFiles', () => {
		it('should return data tables from individual files', async () => {
			// Arrange
			const mockDataTable1 = {
				id: 'dt1',
				name: 'Test Table 1',
				projectId: 'project1',
				columns: [{ id: 'col1', name: 'Column1', type: 'string', index: 0 }],
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-02T00:00:00.000Z',
			};
			const mockDataTable2 = {
				id: 'dt2',
				name: 'Test Table 2',
				projectId: 'project2',
				columns: [{ id: 'col2', name: 'Column2', type: 'number', index: 0 }],
				createdAt: '2024-01-03T00:00:00.000Z',
				updatedAt: '2024-01-04T00:00:00.000Z',
			};

			globMock.mockResolvedValue([
				'/mock/n8n/git/datatables/dt1.json',
				'/mock/n8n/git/datatables/dt2.json',
			]);
			fsReadFile
				.mockResolvedValueOnce(JSON.stringify(mockDataTable1) as any)
				.mockResolvedValueOnce(JSON.stringify(mockDataTable2) as any);

			// Act
			const result = await service.getRemoteDataTablesFromFiles(globalAdminContext);

			// Assert
			expect(result).toEqual([mockDataTable1, mockDataTable2]);
			expect(globMock).toHaveBeenCalledWith('*.json', {
				cwd: '/mock/n8n/git/datatables',
				absolute: true,
			});
		});

		it('should return empty array when no files exist', async () => {
			// Arrange
			globMock.mockResolvedValue([]);

			// Act
			const result = await service.getRemoteDataTablesFromFiles(globalAdminContext);

			// Assert
			expect(result).toEqual([]);
		});

		it('should filter out null values from invalid JSON', async () => {
			// Arrange
			const mockDataTable = {
				id: 'dt1',
				name: 'Test Table',
				projectId: 'project1',
				columns: [],
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-02T00:00:00.000Z',
			};

			globMock.mockResolvedValue([
				'/mock/n8n/git/datatables/dt1.json',
				'/mock/n8n/git/datatables/invalid.json',
			]);
			fsReadFile
				.mockResolvedValueOnce(JSON.stringify(mockDataTable) as any)
				.mockResolvedValueOnce('invalid json' as any);

			// Act
			const result = await service.getRemoteDataTablesFromFiles(globalAdminContext);

			// Assert
			expect(result).toEqual([mockDataTable]);
		});

		it('should return only data tables from authorized projects', async () => {
			// Arrange
			const authorizedDataTable = {
				id: 'dt1',
				name: 'Authorized Table',
				ownedBy: { type: 'team', teamId: 'project1', teamName: 'Team Project 1' },
				columns: [],
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-02T00:00:00.000Z',
			};
			const unauthorizedDataTable = {
				id: 'dt2',
				name: 'Unauthorized Table',
				ownedBy: { type: 'team', teamId: 'project2', teamName: 'Team Project 2' },
				columns: [],
				createdAt: '2024-01-03T00:00:00.000Z',
				updatedAt: '2024-01-04T00:00:00.000Z',
			};
			const unownedDataTable = {
				id: 'dt3',
				name: 'Unowned Table',
				ownedBy: null,
				columns: [],
				createdAt: '2024-01-05T00:00:00.000Z',
				updatedAt: '2024-01-06T00:00:00.000Z',
			};

			globMock.mockResolvedValue([
				'/mock/n8n/git/datatables/dt1.json',
				'/mock/n8n/git/datatables/dt2.json',
				'/mock/n8n/git/datatables/dt3.json',
			]);
			fsReadFile
				.mockResolvedValueOnce(JSON.stringify(authorizedDataTable) as any)
				.mockResolvedValueOnce(JSON.stringify(unauthorizedDataTable) as any)
				.mockResolvedValueOnce(JSON.stringify(unownedDataTable) as any);

			// Act
			const result = await service.getRemoteDataTablesFromFiles(globalMemberContext);

			// Assert
			expect(result).toEqual([authorizedDataTable, unownedDataTable]);
		});
	});

	describe('getLocalDataTablesFromDb', () => {
		it('should return data tables from database', async () => {
			// Arrange
			const mockDataTables = [
				{
					id: 'dt1',
					name: 'Test Table',
					projectId: 'project1',
					columns: [{ id: 'col1', name: 'Column1', type: 'string', index: 0 }],
					createdAt: new Date('2024-01-01'),
					updatedAt: new Date('2024-01-02'),
					project: {
						id: 'project1',
						name: 'Team Project 1',
						type: 'team',
						projectRelations: [],
					},
				},
			];

			sourceControlScopedService.getProjectsWithPushScopeByContextFilter.mockReturnValue(undefined);
			dataTableRepository.findForSourceControlStatus.mockResolvedValue(mockDataTables as any);

			// Act
			const result = await service.getLocalDataTablesFromDb(globalAdminContext);

			// Assert
			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({
				id: 'dt1',
				name: 'Test Table',
				ownedBy: {
					type: 'team',
					projectId: 'project1',
					projectName: 'Team Project 1',
				},
				columns: [{ id: 'col1', name: 'Column1', type: 'string', index: 0 }],
				filename: expect.stringContaining('dt1.json'),
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-02T00:00:00.000Z',
			});
			expect(dataTableRepository.findForSourceControlStatus).toHaveBeenCalledWith(undefined);
		});

		it('should scope database query to data tables in authorized projects', async () => {
			// Arrange
			const projectFilter = { id: 'project1' };
			sourceControlScopedService.getProjectsWithPushScopeByContextFilter.mockReturnValue(
				projectFilter as any,
			);
			dataTableRepository.findForSourceControlStatus.mockResolvedValue([]);

			// Act
			const result = await service.getLocalDataTablesFromDb(globalMemberContext);

			// Assert
			expect(result).toEqual([]);
			expect(
				sourceControlScopedService.getProjectsWithPushScopeByContextFilter,
			).toHaveBeenCalledWith(globalMemberContext);
			expect(dataTableRepository.findForSourceControlStatus).toHaveBeenCalledWith(projectFilter);
		});

		it('should return empty array when no data tables exist', async () => {
			// Arrange
			dataTableRepository.findForSourceControlStatus.mockResolvedValue([]);

			// Act
			const result = await service.getLocalDataTablesFromDb(globalAdminContext);

			// Assert
			expect(result).toEqual([]);
		});

		it('should return empty array when DataTable entity is not registered', async () => {
			// Arrange
			const error = new Error('No metadata for "DataTable" was found');
			dataTableRepository.findForSourceControlStatus.mockRejectedValue(error);

			// Act
			const result = await service.getLocalDataTablesFromDb(globalAdminContext);

			// Assert
			expect(result).toEqual([]);
		});

		it('should throw error for other database errors', async () => {
			// Arrange
			const error = new Error('Database connection failed');
			dataTableRepository.findForSourceControlStatus.mockRejectedValue(error);

			// Act & Assert
			await expect(service.getLocalDataTablesFromDb(globalAdminContext)).rejects.toThrow(
				'Database connection failed',
			);
		});
	});

	describe('resolveRemoteDataTableProjectId', () => {
		it('resolves a team owner to the team id', async () => {
			await expect(
				service.resolveRemoteDataTableProjectId(
					{ type: 'team', teamId: 'team1', teamName: 'Team 1' },
					'puller',
				),
			).resolves.toBe('team1');
		});

		it('resolves a known personal owner to their personal project', async () => {
			userRepository.findOne.mockResolvedValue({ id: 'user1' } as any);
			projectRepository.getPersonalProjectForUserOrFail.mockResolvedValue({ id: 'pp1' } as any);

			await expect(
				service.resolveRemoteDataTableProjectId(
					{ type: 'personal', personalEmail: 'owner@test.com' },
					'puller',
				),
			).resolves.toBe('pp1');
			expect(projectRepository.getPersonalProjectForUserOrFail).toHaveBeenCalledWith('user1');
		});

		it("falls back to the pulling user's personal project for an unknown personal owner", async () => {
			userRepository.findOne.mockResolvedValue(null);
			projectRepository.getPersonalProjectForUserOrFail.mockResolvedValue({
				id: 'pp-puller',
			} as any);

			await expect(
				service.resolveRemoteDataTableProjectId(
					{ type: 'personal', personalEmail: 'unknown@test.com' },
					'puller',
				),
			).resolves.toBe('pp-puller');
			expect(projectRepository.getPersonalProjectForUserOrFail).toHaveBeenCalledWith('puller');
		});

		it("falls back to the pulling user's personal project when there is no owner", async () => {
			projectRepository.getPersonalProjectForUserOrFail.mockResolvedValue({
				id: 'pp-puller',
			} as any);

			await expect(service.resolveRemoteDataTableProjectId(null, 'puller')).resolves.toBe(
				'pp-puller',
			);
		});
	});

	describe('importDataTablesFromWorkFolder', () => {
		const mockUser = Object.assign(new User(), {
			id: 'user1',
			role: GLOBAL_ADMIN_ROLE,
		});

		const mockPersonalProject = Object.assign(new Project(), {
			id: 'personal-project-1',
			type: 'personal',
		});

		const mockCandidate: SourceControlledFile = {
			id: 'dt1',
			name: 'Test Table',
			type: 'datatable',
			status: 'created',
			location: 'local',
			conflict: false,
			file: '/mock/n8n/git/datatables/dt1.json',
			updatedAt: '2024-01-01T00:00:00.000Z',
		};

		let mockTransaction: { save: Mock; delete: Mock; insert: Mock };

		beforeEach(() => {
			projectRepository.getPersonalProjectForUserOrFail.mockResolvedValue(
				mockPersonalProject as any,
			);
			projectRepository.find.mockResolvedValue([
				mockPersonalProject,
				{ id: 'project1', type: 'team' },
			] as any);
			dataTableDDLService.tableExists.mockResolvedValue(false);

			mockTransaction = {
				save: vi.fn(async (_entity: any, data: any) => data),
				delete: vi.fn(async () => {}),
				insert: vi.fn(async () => {}),
			};

			Object.defineProperty(dataTableRepository, 'manager', {
				value: {
					connection: {
						options: { type: 'sqlite' },
					},
					transaction: vi.fn(async (callback: any) => {
						return await callback(mockTransaction);
					}),
				},
				configurable: true,
			});
		});

		it('should import new data table', async () => {
			// Arrange
			const mockDataTable = {
				id: 'dt1',
				name: 'Test Table',
				ownedBy: {
					type: 'team',
					teamId: 'project1',
					teamName: 'Team Project 1',
				},
				columns: [{ id: 'col1', name: 'Column1', type: 'string', index: 0 }],
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-02T00:00:00.000Z',
			};

			fsReadFile.mockResolvedValue(JSON.stringify(mockDataTable) as any);
			dataTableRepository.findOne.mockResolvedValue(null);
			dataTableColumnRepository.find.mockResolvedValue([]);
			dataTableColumnRepository.save.mockResolvedValue({ id: 'col1' } as any);
			projectRepository.findOne.mockResolvedValue({ id: 'project1', type: 'team' } as any);

			// Act
			await service.importDataTablesFromWorkFolder([mockCandidate], mockUser.id);

			// Assert
			expect(dataTableRepository.upsert).toHaveBeenCalledWith(
				{
					id: 'dt1',
					name: 'Test Table',
					projectId: 'project1',
					createdAt: '2024-01-01T00:00:00.000Z',
					updatedAt: '2024-01-02T00:00:00.000Z',
				},
				['id'],
			);
			expect(dataTableDDLService.createTableWithColumns).toHaveBeenCalledWith(
				'dt1',
				expect.any(Array),
				expect.anything(),
			);
		});

		it('should import personal project data table', async () => {
			// Arrange
			const mockDataTable = {
				id: 'dt1',
				name: 'Test Table',
				ownedBy: {
					type: 'personal',
					projectId: 'personal-project-1',
					projectName: 'User Name',
					personalEmail: 'user@example.com',
				},
				columns: [{ id: 'col1', name: 'Column1', type: 'string', index: 0 }],
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-02T00:00:00.000Z',
			};

			fsReadFile.mockResolvedValue(JSON.stringify(mockDataTable) as any);
			dataTableRepository.findOne.mockResolvedValue(null);
			dataTableColumnRepository.find.mockResolvedValue([]);
			dataTableColumnRepository.save.mockResolvedValue({ id: 'col1' } as any);
			userRepository.findOne.mockResolvedValue({ id: 'user1', email: 'user@example.com' } as any);

			// Act
			await service.importDataTablesFromWorkFolder([mockCandidate], mockUser.id);

			// Assert
			expect(dataTableRepository.upsert).toHaveBeenCalledWith(
				{
					id: 'dt1',
					name: 'Test Table',
					projectId: 'personal-project-1',
					createdAt: '2024-01-01T00:00:00.000Z',
					updatedAt: '2024-01-02T00:00:00.000Z',
				},
				['id'],
			);
		});

		it('should update existing data table and add new columns', async () => {
			// Arrange
			const mockDataTable = {
				id: 'dt1',
				name: 'Updated Table',
				ownedBy: {
					type: 'team',
					teamId: 'project1',
					teamName: 'Team Project 1',
				},
				columns: [
					{ id: 'col1', name: 'Column1', type: 'string', index: 0 },
					{ id: 'col2', name: 'Column2', type: 'number', index: 1 },
				],
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-02T00:00:00.000Z',
			};

			const existingTable = {
				id: 'dt1',
				name: 'Old Name',
				projectId: 'project1',
				columns: [{ id: 'col1', name: 'Column1' }],
			};

			fsReadFile.mockResolvedValue(JSON.stringify(mockDataTable) as any);
			dataTableRepository.findOne.mockResolvedValue(existingTable as any);
			dataTableColumnRepository.find.mockResolvedValue([{ id: 'col1', name: 'Column1' }] as any);
			dataTableColumnRepository.save.mockImplementation(async (col: any) => col);
			projectRepository.findOne.mockResolvedValue({ id: 'project1', type: 'team' } as any);

			// Act
			await service.importDataTablesFromWorkFolder([mockCandidate], mockUser.id);

			// Assert
			expect(dataTableRepository.upsert).toHaveBeenCalled();
			expect(dataTableDDLService.addColumn).toHaveBeenCalledWith(
				'dt1',
				expect.objectContaining({ id: 'col2' }),
				'sqlite',
				expect.anything(),
			);
		});

		it('should rename columns when name changes but ID stays the same', async () => {
			// Arrange
			const mockDataTable = {
				id: 'dt1',
				name: 'Test Table',
				ownedBy: {
					type: 'team',
					teamId: 'project1',
					teamName: 'Team Project 1',
				},
				columns: [{ id: 'col1', name: 'newColumnName', type: 'string', index: 0 }],
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-02T00:00:00.000Z',
			};

			const existingTable = {
				id: 'dt1',
				name: 'Test Table',
				projectId: 'project1',
				columns: [{ id: 'col1', name: 'oldColumnName' }],
			};

			fsReadFile.mockResolvedValue(JSON.stringify(mockDataTable) as any);
			dataTableRepository.findOne.mockResolvedValue(existingTable as any);
			dataTableColumnRepository.find.mockResolvedValue([
				{ id: 'col1', name: 'oldColumnName' },
			] as any);
			projectRepository.findOne.mockResolvedValue({ id: 'project1', type: 'team' } as any);

			// Act
			await service.importDataTablesFromWorkFolder([mockCandidate], mockUser.id);

			// Assert
			expect(dataTableDDLService.renameColumn).toHaveBeenCalledWith(
				'dt1',
				'oldColumnName',
				'newColumnName',
				'sqlite',
				expect.anything(),
			);
		});

		it('should delete removed columns', async () => {
			// Arrange
			const mockDataTable = {
				id: 'dt1',
				name: 'Test Table',
				ownedBy: {
					type: 'team',
					teamId: 'project1',
					teamName: 'Team Project 1',
				},
				columns: [{ id: 'col1', name: 'Column1', type: 'string', index: 0 }],
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-02T00:00:00.000Z',
			};

			const existingTable = {
				id: 'dt1',
				name: 'Test Table',
				projectId: 'project1',
				columns: [
					{ id: 'col1', name: 'Column1' },
					{ id: 'col2', name: 'Column2' },
				],
			};

			fsReadFile.mockResolvedValue(JSON.stringify(mockDataTable) as any);
			dataTableRepository.findOne.mockResolvedValue(existingTable as any);
			dataTableColumnRepository.find.mockResolvedValue([
				{ id: 'col1', name: 'Column1' },
				{ id: 'col2', name: 'Column2' },
			] as any);
			dataTableColumnRepository.save.mockResolvedValue({ id: 'col1' } as any);
			projectRepository.findOne.mockResolvedValue({ id: 'project1', type: 'team' } as any);

			// Act
			await service.importDataTablesFromWorkFolder([mockCandidate], mockUser.id);

			// Assert
			expect(dataTableDDLService.dropColumnFromTable).toHaveBeenCalledWith(
				'dt1',
				'Column2',
				'sqlite',
				expect.anything(),
			);
		});

		it('should handle empty data tables file', async () => {
			// Arrange
			fsReadFile.mockResolvedValue('[]' as any);

			// Act
			await service.importDataTablesFromWorkFolder([mockCandidate], mockUser.id);

			// Assert
			expect(dataTableRepository.upsert).not.toHaveBeenCalled();
		});

		describe('name collisions (same name, different id)', () => {
			const incomingDataTable = {
				id: 'dt1',
				name: 'Test Table',
				ownedBy: {
					type: 'team',
					teamId: 'project1',
					teamName: 'Team Project 1',
				},
				columns: [{ id: 'col1', name: 'Column1', type: 'string', index: 0 }],
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-02T00:00:00.000Z',
			};

			const localColumns = [
				{ id: 'lc1', name: 'Column1', type: 'string', index: 0 },
				{ id: 'lc2', name: 'LocalOnly', type: 'number', index: 1 },
			];

			const localTable = {
				id: 'dt-old',
				name: 'Test Table',
				projectId: 'project1',
				columns: localColumns,
				createdAt: new Date('2023-01-01T00:00:00.000Z'),
				updatedAt: new Date('2023-01-02T00:00:00.000Z'),
			};

			beforeEach(() => {
				fsReadFile.mockResolvedValue(JSON.stringify(incomingDataTable) as any);
				projectRepository.findOne.mockResolvedValue({ id: 'project1', type: 'team' } as any);
				// Phase 2 looks the table up by (name, project); Phase 3 by the adopted id
				dataTableRepository.findOne.mockImplementation(async (opts: any) =>
					opts?.where?.id ? ({ id: 'dt1', columns: localColumns } as any) : (localTable as any),
				);
				dataTableColumnRepository.find.mockResolvedValue([] as any);
				dataTableColumnRepository.save.mockImplementation(async (col: any) => col);
			});

			it('should adopt the incoming id on a name collision, even for a lossy merge', async () => {
				// Act
				const result = await service.importDataTablesFromWorkFolder([mockCandidate], mockUser.id);

				// Assert
				expect(dataTableDDLService.renameTable).toHaveBeenCalledWith(
					'dt-old',
					'dt1',
					'sqlite',
					mockTransaction,
				);
				expect(mockTransaction.delete).toHaveBeenCalledWith(expect.anything(), {
					id: 'dt-old',
				});
				expect(mockTransaction.insert).toHaveBeenCalledWith(
					expect.anything(),
					expect.objectContaining({ id: 'dt1', name: 'Test Table', projectId: 'project1' }),
				);
				// Matching (name, type) column adopts the incoming column id
				expect(mockTransaction.insert).toHaveBeenCalledWith(
					expect.anything(),
					expect.objectContaining({ id: 'col1', name: 'Column1', dataTableId: 'dt1' }),
				);
				// Non-matching local column keeps its id (dropped later by schema alignment)
				expect(mockTransaction.insert).toHaveBeenCalledWith(
					expect.anything(),
					expect.objectContaining({ id: 'lc2', name: 'LocalOnly', dataTableId: 'dt1' }),
				);
				expect(dataTableSizeValidator.reset).toHaveBeenCalled();
				// The regular import path still runs
				expect(dataTableRepository.upsert).toHaveBeenCalledWith(
					expect.objectContaining({ id: 'dt1' }),
					['id'],
				);
				expect(result?.reconciliationFailures).toEqual([]);
			});

			it('should degrade a failed adoption to a per-table conflict and import the rest', async () => {
				// Arrange — a second, collision-free table in the same pull; the
				// colliding table's adoption fails at the physical rename
				const otherDataTable = {
					...incomingDataTable,
					id: 'dt2',
					name: 'Other Table',
					columns: [{ id: 'col9', name: 'Column9', type: 'string', index: 0 }],
				};
				const otherCandidate = {
					...mockCandidate,
					id: 'dt2',
					name: 'Other Table',
					file: '/mock/n8n/git/datatables/dt2.json',
				};
				fsReadFile.mockImplementation(async (file: any) =>
					String(file).includes('dt2')
						? (JSON.stringify(otherDataTable) as any)
						: (JSON.stringify(incomingDataTable) as any),
				);
				dataTableRepository.findOne.mockImplementation(async (opts: any) => {
					if (opts?.where?.id) return null;
					return opts?.where?.name === 'Test Table' ? (localTable as any) : null;
				});
				dataTableDDLService.renameTable.mockRejectedValue(new Error('rename failed'));

				// Act & Assert — resolves instead of rejecting; the colliding table is
				// recorded as a conflict, the other table imports
				await expect(
					service.importDataTablesFromWorkFolder([mockCandidate, otherCandidate], mockUser.id),
				).resolves.toMatchObject({
					reconciliationFailures: [{ id: 'dt1', name: 'Test Table' }],
				});
				expect(mockLogger.error).toHaveBeenCalledWith(
					expect.stringContaining('Test Table'),
					expect.anything(),
				);
				expect(dataTableRepository.upsert).toHaveBeenCalledTimes(1);
				expect(dataTableRepository.upsert).toHaveBeenCalledWith(
					expect.objectContaining({ id: 'dt2' }),
					['id'],
				);
			});

			it('should complete a half-finished adoption without renaming again (idempotency)', async () => {
				// Arrange — physical table already renamed, metadata still holds the old id
				dataTableDDLService.tableExists.mockResolvedValue(true);

				// Act
				await service.importDataTablesFromWorkFolder([mockCandidate], mockUser.id);

				// Assert — metadata swap still runs, rename is skipped
				expect(dataTableDDLService.renameTable).not.toHaveBeenCalled();
				expect(mockTransaction.delete).toHaveBeenCalledWith(expect.anything(), {
					id: 'dt-old',
				});
				expect(mockTransaction.insert).toHaveBeenCalledWith(
					expect.anything(),
					expect.objectContaining({ id: 'dt1' }),
				);
			});
		});

		it('should skip columns with invalid names', async () => {
			// Arrange
			const mockDataTable = {
				id: 'dt1',
				name: 'Test Table',
				ownedBy: {
					type: 'team',
					teamId: 'project1',
					teamName: 'Team Project 1',
				},
				columns: [
					{ id: 'col1', name: 'validName', type: 'string', index: 0 },
					{
						id: 'col2',
						name: 'invalid" text); create INVALID table; --',
						type: 'string',
						index: 1,
					},
				],
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-02T00:00:00.000Z',
			};

			fsReadFile.mockResolvedValue(JSON.stringify(mockDataTable) as any);
			dataTableRepository.findOne.mockResolvedValue(null);
			dataTableColumnRepository.find.mockResolvedValue([]);
			dataTableColumnRepository.save.mockImplementation(async (col: any) => col);
			projectRepository.findOne.mockResolvedValue({ id: 'project1', type: 'team' } as any);

			// Act
			await service.importDataTablesFromWorkFolder([mockCandidate], mockUser.id);

			// Assert
			expect(dataTableDDLService.createTableWithColumns).toHaveBeenCalledWith(
				'dt1',
				expect.arrayContaining([expect.objectContaining({ id: 'col1', name: 'validName' })]),
				expect.anything(),
			);
			const columns = (dataTableDDLService.createTableWithColumns as Mock).mock.calls[0][1];
			expect(columns).not.toEqual(
				expect.arrayContaining([expect.objectContaining({ id: 'col2' })]),
			);
		});

		it('should skip data tables with invalid IDs', async () => {
			// Arrange
			const mockDataTable = {
				id: 'invalid"; create INVALID table;--',
				name: 'Test Table',
				ownedBy: {
					type: 'team',
					teamId: 'project1',
					teamName: 'Team Project 1',
				},
				columns: [{ id: 'col1', name: 'validName', type: 'string', index: 0 }],
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-02T00:00:00.000Z',
			};

			fsReadFile.mockResolvedValue(JSON.stringify(mockDataTable) as any);

			// Act
			await service.importDataTablesFromWorkFolder([mockCandidate], mockUser.id);

			// Assert
			expect(dataTableRepository.upsert).not.toHaveBeenCalled();
		});
	});

	describe('deleteDataTablesNotInWorkFolder', () => {
		it('should delete each candidate data table', async () => {
			await service.deleteDataTablesNotInWorkFolder([
				{ id: 'dt1' } as SourceControlledFile,
				{ id: 'dt2' } as SourceControlledFile,
			]);

			expect(dataTableRepository.deleteDataTable).toHaveBeenCalledTimes(2);
			expect(dataTableRepository.deleteDataTable).toHaveBeenCalledWith('dt1');
			expect(dataTableRepository.deleteDataTable).toHaveBeenCalledWith('dt2');
		});

		it('should do nothing when there are no candidates', async () => {
			await service.deleteDataTablesNotInWorkFolder([]);

			expect(dataTableRepository.deleteDataTable).not.toHaveBeenCalled();
		});
	});
});
