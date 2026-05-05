import { testModules } from '@n8n/backend-test-utils';
import type { DataSource, EntityManager } from '@n8n/typeorm';
import { mock } from 'jest-mock-extended';

import { DataTableColumn } from '../data-table-column.entity';
import { DataTableColumnRepository } from '../data-table-column.repository';
import type { DataTableDDLService } from '../data-table-ddl.service';
import { DataTable } from '../data-table.entity';
import { DataTableColumnNameConflictError } from '../errors/data-table-column-name-conflict.error';
import { DataTableSystemColumnNameConflictError } from '../errors/data-table-system-column-name-conflict.error';

describe('DataTableColumnRepository', () => {
	let repository: DataTableColumnRepository;
	let mockDataSource: DataSource;
	let mockDDLService: jest.Mocked<DataTableDDLService>;
	let mockEntityManager: jest.Mocked<EntityManager>;

	beforeAll(async () => {
		await testModules.loadModules(['data-table']);
	});

	beforeEach(() => {
		mockDDLService = mock<DataTableDDLService>();
		mockEntityManager = mock<EntityManager>({
			connection: {
				options: { type: 'postgres' },
			} as any,
		});

		// Mock the transaction method to execute the callback immediately
		(mockEntityManager.transaction as jest.Mock) = jest.fn(
			async (callback: (em: EntityManager) => Promise<any>) => {
				return await callback(mockEntityManager);
			},
		);

		mockDataSource = mock<DataSource>({
			manager: mockEntityManager,
		});

		repository = new DataTableColumnRepository(mockDataSource, mockDDLService);
	});

	describe('renameColumn', () => {
		const dataTableId = 'test-table-id';
		const mockColumn: DataTableColumn = {
			id: 'column-id',
			name: 'old_name',
			type: 'string',
			index: 0,
			dataTableId,
		} as DataTableColumn;

		describe('validateUniqueColumnName', () => {
			it('should throw DataTableColumnNameConflictError when column name already exists', async () => {
				// Arrange
				const newName = 'duplicate_name';
				const dataTable = { id: dataTableId, name: 'Test Table' } as DataTable;

				mockEntityManager.existsBy.mockResolvedValue(true);
				mockEntityManager.findOneBy.mockResolvedValue(dataTable);

				// Act & Assert
				await expect(repository.renameColumn(dataTableId, mockColumn, newName)).rejects.toThrow(
					DataTableColumnNameConflictError,
				);

				await expect(repository.renameColumn(dataTableId, mockColumn, newName)).rejects.toThrow(
					`Data table column with name '${newName}' already exists in data table '${dataTable.name}'`,
				);

				expect(mockEntityManager.existsBy).toHaveBeenCalledWith(DataTableColumn, {
					name: newName,
					dataTableId,
				});
				expect(mockEntityManager.findOneBy).toHaveBeenCalledWith(DataTable, { id: dataTableId });
			});

			it('should not throw when column name is unique', async () => {
				// Arrange
				const newName = 'unique_name';

				mockEntityManager.existsBy.mockResolvedValue(false);
				mockEntityManager.update.mockResolvedValue({ affected: 1 } as any);
				Object.defineProperty(mockEntityManager, 'connection', {
					value: {
						options: { type: 'postgres' },
					},
					configurable: true,
				});
				mockDDLService.renameColumn.mockResolvedValue(undefined);

				// Act
				const result = await repository.renameColumn(dataTableId, mockColumn, newName);

				// Assert
				expect(mockEntityManager.existsBy).toHaveBeenCalledWith(DataTableColumn, {
					name: newName,
					dataTableId,
				});
				expect(result.name).toBe(newName);
			});
		});

		describe('validateNotSystemColumn', () => {
			it('should throw DataTableSystemColumnNameConflictError for system column names', async () => {
				// Arrange - system columns: id, createdAt, updatedAt
				const systemColumnNames = ['id', 'createdAt', 'updatedAt'];

				for (const systemColumnName of systemColumnNames) {
					mockEntityManager.existsBy.mockResolvedValue(false);

					// Act & Assert
					await expect(
						repository.renameColumn(dataTableId, mockColumn, systemColumnName),
					).rejects.toThrow(DataTableSystemColumnNameConflictError);

					await expect(
						repository.renameColumn(dataTableId, mockColumn, systemColumnName),
					).rejects.toThrow(
						`Column name "${systemColumnName}" is reserved as a system column name.`,
					);
				}
			});

			it('should throw DataTableSystemColumnNameConflictError for testing column name', async () => {
				// Arrange
				const testingColumnName = 'dryRunState';

				mockEntityManager.existsBy.mockResolvedValue(false);

				// Act & Assert
				await expect(
					repository.renameColumn(dataTableId, mockColumn, testingColumnName),
				).rejects.toThrow(DataTableSystemColumnNameConflictError);

				await expect(
					repository.renameColumn(dataTableId, mockColumn, testingColumnName),
				).rejects.toThrow(
					`Column name "${testingColumnName}" is reserved as a testing column name.`,
				);
			});
		});

		describe('successful rename', () => {
			it('should successfully rename column when all validations pass', async () => {
				// Arrange
				const newName = 'new_valid_name';

				mockEntityManager.existsBy.mockResolvedValue(false);
				mockEntityManager.update.mockResolvedValue({ affected: 1 } as any);
				Object.defineProperty(mockEntityManager, 'connection', {
					value: {
						options: { type: 'postgres' },
					},
					configurable: true,
				});
				mockDDLService.renameColumn.mockResolvedValue(undefined);

				// Act
				const result = await repository.renameColumn(dataTableId, mockColumn, newName);

				// Assert
				expect(result).toEqual({
					...mockColumn,
					name: newName,
				});
				expect(mockEntityManager.update).toHaveBeenCalledWith(
					DataTableColumn,
					{ id: mockColumn.id },
					{ name: newName },
				);
				expect(mockDDLService.renameColumn).toHaveBeenCalledWith(
					dataTableId,
					mockColumn.name,
					newName,
					'postgres',
					mockEntityManager,
				);
			});

			it('should call DDL service with correct database type', async () => {
				// Arrange
				const newName = 'new_valid_name';
				const dbTypes = ['postgres', 'sqlite'] as const;

				for (const dbType of dbTypes) {
					mockEntityManager.existsBy.mockResolvedValue(false);
					mockEntityManager.update.mockResolvedValue({ affected: 1 } as any);
					Object.defineProperty(mockEntityManager, 'connection', {
						value: {
							options: { type: dbType },
						},
						configurable: true,
					});
					mockDDLService.renameColumn.mockResolvedValue(undefined);

					// Act
					await repository.renameColumn(dataTableId, mockColumn, newName);

					// Assert
					expect(mockDDLService.renameColumn).toHaveBeenCalledWith(
						dataTableId,
						mockColumn.name,
						newName,
						dbType,
						mockEntityManager,
					);
				}
			});
		});

		describe('validation order', () => {
			it('should validate system column name before checking uniqueness', async () => {
				// Arrange
				const systemColumnName = 'id';

				mockEntityManager.existsBy.mockResolvedValue(false);

				// Act & Assert
				await expect(
					repository.renameColumn(dataTableId, mockColumn, systemColumnName),
				).rejects.toThrow(DataTableSystemColumnNameConflictError);

				// existsBy should not be called because system column validation happens first
				expect(mockEntityManager.existsBy).not.toHaveBeenCalled();
			});

			it('should check uniqueness after system column validation passes', async () => {
				// Arrange
				const newName = 'valid_name';
				const dataTable = { id: dataTableId, name: 'Test Table' } as DataTable;

				mockEntityManager.existsBy.mockResolvedValue(true);
				mockEntityManager.findOneBy.mockResolvedValue(dataTable);

				// Act & Assert
				await expect(repository.renameColumn(dataTableId, mockColumn, newName)).rejects.toThrow(
					DataTableColumnNameConflictError,
				);

				// Both validations should have been called in order
				expect(mockEntityManager.existsBy).toHaveBeenCalledWith(DataTableColumn, {
					name: newName,
					dataTableId,
				});
			});
		});
	});
});
