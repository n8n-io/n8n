import { mockInstance, testModules } from '@n8n/backend-test-utils';
import type { RenameDataTableColumnDto } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { ProjectRelationRepository } from '@n8n/db';

import { CsvParserService } from '../csv-parser.service';
import type { DataTableColumn } from '../data-table-column.entity';
import { DataTableColumnRepository } from '../data-table-column.repository';
import { DataTableFileCleanupService } from '../data-table-file-cleanup.service';
import { DataTableRowsRepository } from '../data-table-rows.repository';
import { DataTableSizeValidator } from '../data-table-size-validator.service';
import type { DataTable } from '../data-table.entity';
import { DataTableRepository } from '../data-table.repository';
import { DataTableService } from '../data-table.service';
import { DataTableColumnNotFoundError } from '../errors/data-table-column-not-found.error';
import { DataTableNotFoundError } from '../errors/data-table-not-found.error';
import { RoleService } from '@/services/role.service';

describe('DataTableService', () => {
	let dataTableService: DataTableService;
	let mockDataTableRepository: jest.Mocked<DataTableRepository>;
	let mockDataTableColumnRepository: jest.Mocked<DataTableColumnRepository>;
	let mockDataTableRowsRepository: jest.Mocked<DataTableRowsRepository>;
	let mockLogger: jest.Mocked<Logger>;
	let mockDataTableSizeValidator: jest.Mocked<DataTableSizeValidator>;
	let mockProjectRelationRepository: jest.Mocked<ProjectRelationRepository>;
	let mockRoleService: jest.Mocked<RoleService>;
	let mockCsvParserService: jest.Mocked<CsvParserService>;
	let mockFileCleanupService: jest.Mocked<DataTableFileCleanupService>;

	beforeAll(async () => {
		await testModules.loadModules(['data-table']);
	});

	beforeEach(() => {
		mockDataTableRepository = mockInstance(DataTableRepository);
		mockDataTableColumnRepository = mockInstance(DataTableColumnRepository);
		mockDataTableRowsRepository = mockInstance(DataTableRowsRepository);
		mockLogger = mockInstance(Logger);
		mockDataTableSizeValidator = mockInstance(DataTableSizeValidator);
		mockProjectRelationRepository = mockInstance(ProjectRelationRepository);
		mockRoleService = mockInstance(RoleService);
		mockCsvParserService = mockInstance(CsvParserService);
		mockFileCleanupService = mockInstance(DataTableFileCleanupService);

		// Mock the logger.scoped method to return the logger itself
		mockLogger.scoped = jest.fn().mockReturnValue(mockLogger);

		dataTableService = new DataTableService(
			mockDataTableRepository,
			mockDataTableColumnRepository,
			mockDataTableRowsRepository,
			mockLogger,
			mockDataTableSizeValidator,
			mockProjectRelationRepository,
			mockRoleService,
			mockCsvParserService,
			mockFileCleanupService,
		);

		jest.clearAllMocks();
	});

	describe('renameColumn', () => {
		const projectId = 'test-project-id';
		const dataTableId = 'test-data-table-id';
		const columnId = 'test-column-id';

		const mockDataTable: DataTable = {
			id: dataTableId,
			name: 'Test Table',
			projectId,
		} as DataTable;

		const mockColumn: DataTableColumn = {
			id: columnId,
			name: 'old_column_name',
			type: 'string',
			index: 0,
			dataTableId,
		} as DataTableColumn;

		const renameDto: RenameDataTableColumnDto = {
			name: 'new_column_name',
		};

		describe('successful rename', () => {
			it('should rename column when data table and column exist', async () => {
				// Arrange
				const renamedColumn = { ...mockColumn, name: renameDto.name };

				mockDataTableRepository.findOneBy.mockResolvedValue(mockDataTable);
				mockDataTableColumnRepository.findOneBy.mockResolvedValue(mockColumn);
				mockDataTableColumnRepository.renameColumn.mockResolvedValue(renamedColumn);

				// Act
				const result = await dataTableService.renameColumn(
					dataTableId,
					projectId,
					columnId,
					renameDto,
				);

				// Assert
				expect(result).toEqual(renamedColumn);
				expect(mockDataTableRepository.findOneBy).toHaveBeenCalledWith({
					id: dataTableId,
					project: {
						id: projectId,
					},
				});
				expect(mockDataTableColumnRepository.findOneBy).toHaveBeenCalledWith({
					id: columnId,
					dataTableId,
				});
				expect(mockDataTableColumnRepository.renameColumn).toHaveBeenCalledWith(
					dataTableId,
					mockColumn,
					renameDto.name,
				);
			});

			it('should call repository methods in correct order', async () => {
				// Arrange
				const renamedColumn = { ...mockColumn, name: renameDto.name };
				const callOrder: string[] = [];

				mockDataTableRepository.findOneBy.mockImplementation(async () => {
					callOrder.push('validateDataTableExists');
					return mockDataTable;
				});

				mockDataTableColumnRepository.findOneBy.mockImplementation(async () => {
					callOrder.push('validateColumnExists');
					return mockColumn;
				});

				mockDataTableColumnRepository.renameColumn.mockImplementation(async () => {
					callOrder.push('renameColumn');
					return renamedColumn;
				});

				// Act
				await dataTableService.renameColumn(dataTableId, projectId, columnId, renameDto);

				// Assert
				expect(callOrder).toEqual([
					'validateDataTableExists',
					'validateColumnExists',
					'renameColumn',
				]);
			});
		});

		describe('validation errors', () => {
			it('should throw DataTableNotFoundError when data table does not exist', async () => {
				// Arrange
				mockDataTableRepository.findOneBy.mockResolvedValue(null);

				// Act & Assert
				await expect(
					dataTableService.renameColumn(dataTableId, projectId, columnId, renameDto),
				).rejects.toThrow(DataTableNotFoundError);

				await expect(
					dataTableService.renameColumn(dataTableId, projectId, columnId, renameDto),
				).rejects.toThrow(`Could not find the data table: '${dataTableId}'`);

				// Verify that column validation and rename were not called
				expect(mockDataTableColumnRepository.findOneBy).not.toHaveBeenCalled();
				expect(mockDataTableColumnRepository.renameColumn).not.toHaveBeenCalled();
			});

			it('should throw DataTableNotFoundError when data table exists but belongs to different project', async () => {
				// Arrange
				const differentProjectId = 'different-project-id';
				mockDataTableRepository.findOneBy.mockResolvedValue(null);

				// Act & Assert
				await expect(
					dataTableService.renameColumn(dataTableId, differentProjectId, columnId, renameDto),
				).rejects.toThrow(DataTableNotFoundError);

				// Verify that the repository was called with the correct project filter
				expect(mockDataTableRepository.findOneBy).toHaveBeenCalledWith({
					id: dataTableId,
					project: {
						id: differentProjectId,
					},
				});
			});

			it('should throw DataTableColumnNotFoundError when column does not exist', async () => {
				// Arrange
				mockDataTableRepository.findOneBy.mockResolvedValue(mockDataTable);
				mockDataTableColumnRepository.findOneBy.mockResolvedValue(null);

				// Act & Assert
				await expect(
					dataTableService.renameColumn(dataTableId, projectId, columnId, renameDto),
				).rejects.toThrow(DataTableColumnNotFoundError);

				await expect(
					dataTableService.renameColumn(dataTableId, projectId, columnId, renameDto),
				).rejects.toThrow(
					`Could not find the column '${columnId}' in the data table: ${dataTableId}`,
				);

				// Verify that data table validation was called but rename was not
				expect(mockDataTableRepository.findOneBy).toHaveBeenCalled();
				expect(mockDataTableColumnRepository.renameColumn).not.toHaveBeenCalled();
			});

			it('should throw DataTableColumnNotFoundError when column exists but belongs to different data table', async () => {
				// Arrange
				const differentDataTableId = 'different-table-id';
				mockDataTableRepository.findOneBy.mockResolvedValue(mockDataTable);
				mockDataTableColumnRepository.findOneBy.mockResolvedValue(null);

				// Act & Assert
				await expect(
					dataTableService.renameColumn(differentDataTableId, projectId, columnId, renameDto),
				).rejects.toThrow(DataTableColumnNotFoundError);

				// Verify that the repository was called with the correct table filter
				expect(mockDataTableColumnRepository.findOneBy).toHaveBeenCalledWith({
					id: columnId,
					dataTableId: differentDataTableId,
				});
			});
		});

		describe('validation order', () => {
			it('should validate data table existence before validating column existence', async () => {
				// Arrange
				mockDataTableRepository.findOneBy.mockResolvedValue(null);
				mockDataTableColumnRepository.findOneBy.mockResolvedValue(mockColumn);

				// Act & Assert
				await expect(
					dataTableService.renameColumn(dataTableId, projectId, columnId, renameDto),
				).rejects.toThrow(DataTableNotFoundError);

				// Column validation should not be called if table validation fails
				expect(mockDataTableRepository.findOneBy).toHaveBeenCalled();
				expect(mockDataTableColumnRepository.findOneBy).not.toHaveBeenCalled();
			});

			it('should validate column existence before calling rename', async () => {
				// Arrange
				mockDataTableRepository.findOneBy.mockResolvedValue(mockDataTable);
				mockDataTableColumnRepository.findOneBy.mockResolvedValue(null);

				// Act & Assert
				await expect(
					dataTableService.renameColumn(dataTableId, projectId, columnId, renameDto),
				).rejects.toThrow(DataTableColumnNotFoundError);

				// Rename should not be called if column validation fails
				expect(mockDataTableColumnRepository.renameColumn).not.toHaveBeenCalled();
			});
		});

		describe('error propagation from repository', () => {
			it('should propagate errors from dataTableColumnRepository.renameColumn', async () => {
				// Arrange
				const repositoryError = new Error('Database constraint violation');

				mockDataTableRepository.findOneBy.mockResolvedValue(mockDataTable);
				mockDataTableColumnRepository.findOneBy.mockResolvedValue(mockColumn);
				mockDataTableColumnRepository.renameColumn.mockRejectedValue(repositoryError);

				// Act & Assert
				await expect(
					dataTableService.renameColumn(dataTableId, projectId, columnId, renameDto),
				).rejects.toThrow(repositoryError);

				// Verify that all validations were performed before the error
				expect(mockDataTableRepository.findOneBy).toHaveBeenCalled();
				expect(mockDataTableColumnRepository.findOneBy).toHaveBeenCalled();
				expect(mockDataTableColumnRepository.renameColumn).toHaveBeenCalled();
			});
		});

		describe('edge cases', () => {
			it('should handle empty column name in DTO', async () => {
				// Arrange
				const emptyNameDto: RenameDataTableColumnDto = { name: '' };
				const renamedColumn = { ...mockColumn, name: '' };

				mockDataTableRepository.findOneBy.mockResolvedValue(mockDataTable);
				mockDataTableColumnRepository.findOneBy.mockResolvedValue(mockColumn);
				mockDataTableColumnRepository.renameColumn.mockResolvedValue(renamedColumn);

				// Act
				const result = await dataTableService.renameColumn(
					dataTableId,
					projectId,
					columnId,
					emptyNameDto,
				);

				// Assert
				expect(mockDataTableColumnRepository.renameColumn).toHaveBeenCalledWith(
					dataTableId,
					mockColumn,
					'',
				);
				expect(result.name).toBe('');
			});

			it('should handle renaming to same name', async () => {
				// Arrange
				const sameNameDto: RenameDataTableColumnDto = { name: mockColumn.name };
				const renamedColumn = { ...mockColumn, name: mockColumn.name };

				mockDataTableRepository.findOneBy.mockResolvedValue(mockDataTable);
				mockDataTableColumnRepository.findOneBy.mockResolvedValue(mockColumn);
				mockDataTableColumnRepository.renameColumn.mockResolvedValue(renamedColumn);

				// Act
				const result = await dataTableService.renameColumn(
					dataTableId,
					projectId,
					columnId,
					sameNameDto,
				);

				// Assert
				expect(mockDataTableColumnRepository.renameColumn).toHaveBeenCalledWith(
					dataTableId,
					mockColumn,
					mockColumn.name,
				);
				expect(result.name).toBe(mockColumn.name);
			});

			it('should handle special characters in new column name', async () => {
				// Arrange
				const specialCharDto: RenameDataTableColumnDto = { name: 'column_with_special@chars!' };
				const renamedColumn = { ...mockColumn, name: specialCharDto.name };

				mockDataTableRepository.findOneBy.mockResolvedValue(mockDataTable);
				mockDataTableColumnRepository.findOneBy.mockResolvedValue(mockColumn);
				mockDataTableColumnRepository.renameColumn.mockResolvedValue(renamedColumn);

				// Act
				const result = await dataTableService.renameColumn(
					dataTableId,
					projectId,
					columnId,
					specialCharDto,
				);

				// Assert
				expect(mockDataTableColumnRepository.renameColumn).toHaveBeenCalledWith(
					dataTableId,
					mockColumn,
					specialCharDto.name,
				);
				expect(result.name).toBe(specialCharDto.name);
			});
		});
	});
});
