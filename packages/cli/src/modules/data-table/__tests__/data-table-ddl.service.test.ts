import { testModules } from '@n8n/backend-test-utils';
import type { DataSource, DataSourceOptions, EntityManager } from '@n8n/typeorm';
import { mock } from 'jest-mock-extended';

import { DataTableDDLService } from '../data-table-ddl.service';
import * as sqlUtils from '../utils/sql-utils';

// Mock the sql-utils module
jest.mock('../utils/sql-utils', () => ({
	...jest.requireActual('../utils/sql-utils'),
	renameColumnQuery: jest.fn(),
	toTableName: jest.fn(),
}));

describe('DataTableDDLService', () => {
	let ddlService: DataTableDDLService;
	let mockDataSource: DataSource;
	let mockEntityManager: jest.Mocked<EntityManager>;

	beforeAll(async () => {
		await testModules.loadModules(['data-table']);
	});

	beforeEach(() => {
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

		// Mock the query method
		mockEntityManager.query = jest.fn().mockResolvedValue(undefined);

		mockDataSource = mock<DataSource>({
			manager: mockEntityManager,
		});

		ddlService = new DataTableDDLService(mockDataSource);

		// Reset all mocks
		jest.clearAllMocks();
	});

	describe('renameColumn', () => {
		const dataTableId = 'test-table-id';
		const oldColumnName = 'old_column';
		const newColumnName = 'new_column';
		const tableName = 'n8n_data_table_user_test-table-id';

		beforeEach(() => {
			(sqlUtils.toTableName as jest.Mock).mockReturnValue(tableName);
		});

		describe('successful rename', () => {
			it('should execute rename column query for PostgreSQL', async () => {
				// Arrange
				const dbType: DataSourceOptions['type'] = 'postgres';
				const expectedQuery =
					'ALTER TABLE "n8n_data_table_user_test-table-id" RENAME COLUMN "old_column" TO "new_column"';

				(sqlUtils.renameColumnQuery as jest.Mock).mockReturnValue(expectedQuery);

				// Act
				await ddlService.renameColumn(dataTableId, oldColumnName, newColumnName, dbType);

				// Assert
				expect(sqlUtils.toTableName).toHaveBeenCalledWith(dataTableId);
				expect(sqlUtils.renameColumnQuery).toHaveBeenCalledWith(
					tableName,
					oldColumnName,
					newColumnName,
					dbType,
				);
				expect(mockEntityManager.query).toHaveBeenCalledWith(expectedQuery);
			});

			it('should execute rename column query for MySQL', async () => {
				// Arrange
				const dbType: DataSourceOptions['type'] = 'mysql';
				const expectedQuery =
					'ALTER TABLE `n8n_data_table_user_test-table-id` RENAME COLUMN `old_column` TO `new_column`';

				(sqlUtils.renameColumnQuery as jest.Mock).mockReturnValue(expectedQuery);

				// Act
				await ddlService.renameColumn(dataTableId, oldColumnName, newColumnName, dbType);

				// Assert
				expect(sqlUtils.renameColumnQuery).toHaveBeenCalledWith(
					tableName,
					oldColumnName,
					newColumnName,
					dbType,
				);
				expect(mockEntityManager.query).toHaveBeenCalledWith(expectedQuery);
			});

			it('should execute rename column query for SQLite', async () => {
				// Arrange
				const dbType: DataSourceOptions['type'] = 'sqlite';
				const expectedQuery =
					'ALTER TABLE "n8n_data_table_user_test-table-id" RENAME COLUMN "old_column" TO "new_column"';

				(sqlUtils.renameColumnQuery as jest.Mock).mockReturnValue(expectedQuery);

				// Act
				await ddlService.renameColumn(dataTableId, oldColumnName, newColumnName, dbType);

				// Assert
				expect(sqlUtils.renameColumnQuery).toHaveBeenCalledWith(
					tableName,
					oldColumnName,
					newColumnName,
					dbType,
				);
				expect(mockEntityManager.query).toHaveBeenCalledWith(expectedQuery);
			});

			it('should call methods in correct order', async () => {
				// Arrange
				const dbType: DataSourceOptions['type'] = 'postgres';
				const expectedQuery =
					'ALTER TABLE "n8n_data_table_user_test-table-id" RENAME COLUMN "old_column" TO "new_column"';
				const callOrder: string[] = [];

				(sqlUtils.toTableName as jest.Mock).mockImplementation(() => {
					callOrder.push('toTableName');
					return tableName;
				});

				(sqlUtils.renameColumnQuery as jest.Mock).mockImplementation(() => {
					callOrder.push('renameColumnQuery');
					return expectedQuery;
				});

				mockEntityManager.query = jest.fn().mockImplementation(async () => {
					callOrder.push('query');
					return undefined;
				});

				// Act
				await ddlService.renameColumn(dataTableId, oldColumnName, newColumnName, dbType);

				// Assert
				expect(callOrder).toEqual(['toTableName', 'renameColumnQuery', 'query']);
			});
		});

		describe('with transaction parameter', () => {
			it('should use provided transaction manager', async () => {
				// Arrange
				const dbType: DataSourceOptions['type'] = 'postgres';
				const expectedQuery =
					'ALTER TABLE "n8n_data_table_user_test-table-id" RENAME COLUMN "old_column" TO "new_column"';
				const customTrx = mock<EntityManager>();

				customTrx.query = jest.fn().mockResolvedValue(undefined) as any;

				(sqlUtils.renameColumnQuery as jest.Mock).mockReturnValue(expectedQuery);

				// Act
				await ddlService.renameColumn(dataTableId, oldColumnName, newColumnName, dbType, customTrx);

				// Assert
				expect(sqlUtils.renameColumnQuery).toHaveBeenCalledWith(
					tableName,
					oldColumnName,
					newColumnName,
					dbType,
				);
				expect(customTrx.query).toHaveBeenCalledWith(expectedQuery);
			});

			it('should execute within transaction when no transaction manager is provided', async () => {
				// Arrange
				const dbType: DataSourceOptions['type'] = 'postgres';
				const expectedQuery =
					'ALTER TABLE "n8n_data_table_user_test-table-id" RENAME COLUMN "old_column" TO "new_column"';

				(sqlUtils.renameColumnQuery as jest.Mock).mockReturnValue(expectedQuery);

				// Act
				await ddlService.renameColumn(dataTableId, oldColumnName, newColumnName, dbType);

				// Assert
				expect(mockEntityManager.transaction).toHaveBeenCalled();
				expect(mockEntityManager.query).toHaveBeenCalledWith(expectedQuery);
			});
		});

		describe('error handling', () => {
			it('should propagate errors from query execution', async () => {
				// Arrange
				const dbType: DataSourceOptions['type'] = 'postgres';
				const expectedQuery =
					'ALTER TABLE "n8n_data_table_user_test-table-id" RENAME COLUMN "old_column" TO "new_column"';
				const queryError = new Error('Database query failed');

				(sqlUtils.renameColumnQuery as jest.Mock).mockReturnValue(expectedQuery);
				mockEntityManager.query = jest.fn().mockRejectedValue(queryError);

				// Act & Assert
				await expect(
					ddlService.renameColumn(dataTableId, oldColumnName, newColumnName, dbType),
				).rejects.toThrow(queryError);

				expect(mockEntityManager.query).toHaveBeenCalledWith(expectedQuery);
			});

			it('should propagate errors from renameColumnQuery', async () => {
				// Arrange
				const dbType: DataSourceOptions['type'] = 'postgres';
				const queryError = new Error('Invalid column name');

				(sqlUtils.renameColumnQuery as jest.Mock).mockImplementation(() => {
					throw queryError;
				});

				// Act & Assert
				await expect(
					ddlService.renameColumn(dataTableId, oldColumnName, newColumnName, dbType),
				).rejects.toThrow(queryError);

				expect(sqlUtils.renameColumnQuery).toHaveBeenCalled();
				expect(mockEntityManager.query).not.toHaveBeenCalled();
			});
		});

		describe('parameter handling', () => {
			it('should handle special characters in column names', async () => {
				// Arrange
				const dbType: DataSourceOptions['type'] = 'postgres';
				const oldNameWithSpecialChars = 'old_column_2024';
				const newNameWithSpecialChars = 'new_column_v2';
				const expectedQuery =
					'ALTER TABLE "n8n_data_table_user_test-table-id" RENAME COLUMN "old_column_2024" TO "new_column_v2"';

				(sqlUtils.renameColumnQuery as jest.Mock).mockReturnValue(expectedQuery);

				// Act
				await ddlService.renameColumn(
					dataTableId,
					oldNameWithSpecialChars,
					newNameWithSpecialChars,
					dbType,
				);

				// Assert
				expect(sqlUtils.renameColumnQuery).toHaveBeenCalledWith(
					tableName,
					oldNameWithSpecialChars,
					newNameWithSpecialChars,
					dbType,
				);
				expect(mockEntityManager.query).toHaveBeenCalledWith(expectedQuery);
			});

			it('should handle different data table IDs', async () => {
				// Arrange
				const dbType: DataSourceOptions['type'] = 'postgres';
				const differentTableId = 'different-table-id';
				const differentTableName = 'n8n_data_table_user_different-table-id';
				const expectedQuery =
					'ALTER TABLE "n8n_data_table_user_different-table-id" RENAME COLUMN "old_column" TO "new_column"';

				(sqlUtils.toTableName as jest.Mock).mockReturnValue(differentTableName);
				(sqlUtils.renameColumnQuery as jest.Mock).mockReturnValue(expectedQuery);

				// Act
				await ddlService.renameColumn(differentTableId, oldColumnName, newColumnName, dbType);

				// Assert
				expect(sqlUtils.toTableName).toHaveBeenCalledWith(differentTableId);
				expect(sqlUtils.renameColumnQuery).toHaveBeenCalledWith(
					differentTableName,
					oldColumnName,
					newColumnName,
					dbType,
				);
			});
		});

		describe('database type specific behavior', () => {
			const testCases: Array<{
				dbType: DataSourceOptions['type'];
				expectedQuery: string;
			}> = [
				{
					dbType: 'postgres',
					expectedQuery:
						'ALTER TABLE "n8n_data_table_user_test-table-id" RENAME COLUMN "old_column" TO "new_column"',
				},
				{
					dbType: 'mysql',
					expectedQuery:
						'ALTER TABLE `n8n_data_table_user_test-table-id` RENAME COLUMN `old_column` TO `new_column`',
				},
				{
					dbType: 'mariadb',
					expectedQuery:
						'ALTER TABLE `n8n_data_table_user_test-table-id` RENAME COLUMN `old_column` TO `new_column`',
				},
				{
					dbType: 'sqlite',
					expectedQuery:
						'ALTER TABLE "n8n_data_table_user_test-table-id" RENAME COLUMN "old_column" TO "new_column"',
				},
			];

			testCases.forEach(({ dbType, expectedQuery }) => {
				it(`should generate correct query for ${dbType}`, async () => {
					// Arrange
					(sqlUtils.renameColumnQuery as jest.Mock).mockReturnValue(expectedQuery);

					// Act
					await ddlService.renameColumn(dataTableId, oldColumnName, newColumnName, dbType);

					// Assert
					expect(sqlUtils.renameColumnQuery).toHaveBeenCalledWith(
						tableName,
						oldColumnName,
						newColumnName,
						dbType,
					);
					expect(mockEntityManager.query).toHaveBeenCalledWith(expectedQuery);
				});
			});
		});

		describe('integration with utilities', () => {
			it('should properly convert dataTableId to table name', async () => {
				// Arrange
				const dbType: DataSourceOptions['type'] = 'postgres';
				const customTableId = 'custom-uuid-1234';
				const expectedTableName = 'n8n_data_table_user_custom-uuid-1234';
				const expectedQuery =
					'ALTER TABLE "n8n_data_table_user_custom-uuid-1234" RENAME COLUMN "old_column" TO "new_column"';

				(sqlUtils.toTableName as jest.Mock).mockReturnValue(expectedTableName);
				(sqlUtils.renameColumnQuery as jest.Mock).mockReturnValue(expectedQuery);

				// Act
				await ddlService.renameColumn(customTableId, oldColumnName, newColumnName, dbType);

				// Assert
				expect(sqlUtils.toTableName).toHaveBeenCalledTimes(1);
				expect(sqlUtils.toTableName).toHaveBeenCalledWith(customTableId);
				expect(sqlUtils.renameColumnQuery).toHaveBeenCalledWith(
					expectedTableName,
					oldColumnName,
					newColumnName,
					dbType,
				);
			});

			it('should pass all parameters to renameColumnQuery utility', async () => {
				// Arrange
				const dbType: DataSourceOptions['type'] = 'mysql';
				const expectedQuery = 'ALTER TABLE query';

				(sqlUtils.renameColumnQuery as jest.Mock).mockReturnValue(expectedQuery);

				// Act
				await ddlService.renameColumn(dataTableId, oldColumnName, newColumnName, dbType);

				// Assert
				expect(sqlUtils.renameColumnQuery).toHaveBeenCalledWith(
					tableName,
					oldColumnName,
					newColumnName,
					dbType,
				);
				expect(sqlUtils.renameColumnQuery).toHaveBeenCalledTimes(1);
			});
		});
	});
});
