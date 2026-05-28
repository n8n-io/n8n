import { mockInstance, testModules } from '@n8n/backend-test-utils';
import { Logger } from '@n8n/backend-common';

import type { DataTableColumn } from '../data-table-column.entity';
import { DataTableCsvImportService } from '../data-table-csv-import.service';
import { CsvParserService } from '../csv-parser.service';
import { DataTableFileCleanupService } from '../data-table-file-cleanup.service';
import { DataTableValidationError } from '../errors/data-table-validation.error';
import { FileUploadError } from '../errors/data-table-file-upload.error';

describe('DataTableCsvImportService', () => {
	let service: DataTableCsvImportService;
	let mockCsvParserService: jest.Mocked<CsvParserService>;
	let mockFileCleanupService: jest.Mocked<DataTableFileCleanupService>;
	let mockLogger: jest.Mocked<Logger>;

	beforeAll(async () => {
		await testModules.loadModules(['data-table']);
	});

	beforeEach(() => {
		mockCsvParserService = mockInstance(CsvParserService);
		mockFileCleanupService = mockInstance(DataTableFileCleanupService);
		mockLogger = mockInstance(Logger);
		mockLogger.scoped = jest.fn().mockReturnValue(mockLogger);

		service = new DataTableCsvImportService(
			mockCsvParserService,
			mockFileCleanupService,
			mockLogger,
		);

		jest.clearAllMocks();
	});

	describe('validateAndBuildRowsForExistingTable', () => {
		const fileId = 'test-file-id';
		const tableColumns: DataTableColumn[] = [
			{
				id: 'col-1',
				name: 'name',
				type: 'string',
				index: 0,
				dataTableId: 'dt-1',
			} as DataTableColumn,
			{
				id: 'col-2',
				name: 'age',
				type: 'number',
				index: 1,
				dataTableId: 'dt-1',
			} as DataTableColumn,
			{
				id: 'col-3',
				name: 'email',
				type: 'string',
				index: 2,
				dataTableId: 'dt-1',
			} as DataTableColumn,
		];

		it('should transform matching CSV columns into rows', async () => {
			mockCsvParserService.parseFileWithData.mockResolvedValue({
				metadata: {
					rowCount: 2,
					columnCount: 3,
					columns: [
						{ name: 'name', type: 'string' },
						{ name: 'age', type: 'number' },
						{ name: 'email', type: 'string' },
					],
				},
				rows: [
					{ name: 'Alice', age: '30', email: 'alice@test.com' },
					{ name: 'Bob', age: '25', email: 'bob@test.com' },
				],
			});

			const result = await service.validateAndBuildRowsForExistingTable(fileId, tableColumns);

			expect(result.rows).toHaveLength(2);
			expect(result.rows[0]).toEqual({ name: 'Alice', age: '30', email: 'alice@test.com' });
			expect(result.systemColumnsIgnored).toEqual([]);
		});

		it('should ignore system columns and return them in systemColumnsIgnored', async () => {
			mockCsvParserService.parseFileWithData.mockResolvedValue({
				metadata: {
					rowCount: 1,
					columnCount: 4,
					columns: [
						{ name: 'id', type: 'number' },
						{ name: 'name', type: 'string' },
						{ name: 'createdAt', type: 'date' },
						{ name: 'updatedAt', type: 'date' },
					],
				},
				rows: [{ id: '1', name: 'Alice', createdAt: '2024-01-01', updatedAt: '2024-01-01' }],
			});

			const result = await service.validateAndBuildRowsForExistingTable(fileId, tableColumns);

			expect(result.rows).toHaveLength(1);
			expect(result.rows[0]).toEqual({ name: 'Alice' });
			expect(result.systemColumnsIgnored).toEqual(['id', 'createdAt', 'updatedAt']);
		});

		it('should throw DataTableValidationError when CSV has unrecognized columns', async () => {
			mockCsvParserService.parseFileWithData.mockResolvedValue({
				metadata: {
					rowCount: 1,
					columnCount: 3,
					columns: [
						{ name: 'name', type: 'string' },
						{ name: 'unknown_col', type: 'string' },
						{ name: 'another_unknown', type: 'string' },
					],
				},
				rows: [{ name: 'Alice', unknown_col: 'x', another_unknown: 'y' }],
			});

			await expect(
				service.validateAndBuildRowsForExistingTable(fileId, tableColumns),
			).rejects.toThrow(DataTableValidationError);

			await expect(
				service.validateAndBuildRowsForExistingTable(fileId, tableColumns),
			).rejects.toThrow(
				'CSV contains columns not found in the data table: unknown_col, another_unknown',
			);
		});

		it('should throw DataTableValidationError when zero non-system columns match', async () => {
			mockCsvParserService.parseFileWithData.mockResolvedValue({
				metadata: {
					rowCount: 1,
					columnCount: 2,
					columns: [
						{ name: 'id', type: 'number' },
						{ name: 'createdAt', type: 'date' },
					],
				},
				rows: [{ id: '1', createdAt: '2024-01-01' }],
			});

			await expect(
				service.validateAndBuildRowsForExistingTable(fileId, tableColumns),
			).rejects.toThrow(DataTableValidationError);

			await expect(
				service.validateAndBuildRowsForExistingTable(fileId, tableColumns),
			).rejects.toThrow('No matching columns found');
		});

		it('should convert empty and missing CSV values to null', async () => {
			mockCsvParserService.parseFileWithData.mockResolvedValue({
				metadata: {
					rowCount: 2,
					columnCount: 2,
					columns: [
						{ name: 'name', type: 'string' },
						{ name: 'age', type: 'number' },
					],
				},
				rows: [{ name: 'Alice', age: '' }, { name: '' }],
			});

			const result = await service.validateAndBuildRowsForExistingTable(fileId, tableColumns);

			expect(result.rows[0]).toEqual({ name: 'Alice', age: null });
			expect(result.rows[1]).toEqual({ name: null, age: null });
		});

		it('should wrap unexpected errors in FileUploadError', async () => {
			mockCsvParserService.parseFileWithData.mockRejectedValue(new Error('disk read failed'));

			await expect(
				service.validateAndBuildRowsForExistingTable(fileId, tableColumns),
			).rejects.toThrow(FileUploadError);
		});
	});

	describe('buildRowsForNewTable', () => {
		const fileId = 'test-file-id';
		const tableColumns: DataTableColumn[] = [
			{
				id: 'col-1',
				name: 'First Name',
				type: 'string',
				index: 0,
				dataTableId: 'dt-1',
			} as DataTableColumn,
			{
				id: 'col-2',
				name: 'Age',
				type: 'number',
				index: 1,
				dataTableId: 'dt-1',
			} as DataTableColumn,
		];

		it('should map CSV columns by index when no csvColumnName provided', async () => {
			mockCsvParserService.parseFile.mockResolvedValue({
				rowCount: 1,
				columnCount: 2,
				columns: [
					{ name: 'name', type: 'string' },
					{ name: 'age', type: 'number' },
				],
			});
			mockCsvParserService.parseFileData.mockResolvedValue([{ name: 'Alice', age: '30' }]);

			const result = await service.buildRowsForNewTable(fileId, true, tableColumns);

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({ 'First Name': 'Alice', Age: '30' });
		});

		it('should map CSV columns by csvColumnName when provided', async () => {
			const dtoColumns = [
				{ name: 'First Name', type: 'string' as const, csvColumnName: 'csv_name' },
				{ name: 'Age', type: 'number' as const, csvColumnName: 'csv_age' },
			];

			mockCsvParserService.parseFileData.mockResolvedValue([{ csv_name: 'Alice', csv_age: '30' }]);

			const result = await service.buildRowsForNewTable(fileId, true, tableColumns, dtoColumns);

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({ 'First Name': 'Alice', Age: '30' });
		});

		it('should convert empty and missing CSV values to null', async () => {
			mockCsvParserService.parseFile.mockResolvedValue({
				rowCount: 1,
				columnCount: 2,
				columns: [
					{ name: 'name', type: 'string' },
					{ name: 'age', type: 'number' },
				],
			});
			mockCsvParserService.parseFileData.mockResolvedValue([
				{ name: 'Alice', age: '' },
				{ name: '' },
			]);

			const result = await service.buildRowsForNewTable(fileId, true, tableColumns);

			expect(result[0]).toEqual({ 'First Name': 'Alice', Age: null });
			expect(result[1]).toEqual({ 'First Name': null, Age: null });
		});

		it('should wrap unexpected errors in FileUploadError', async () => {
			mockCsvParserService.parseFile.mockRejectedValue(new Error('file not found'));

			await expect(service.buildRowsForNewTable(fileId, true, tableColumns)).rejects.toThrow(
				FileUploadError,
			);
		});
	});

	describe('cleanupFile', () => {
		it('should delegate to file cleanup service', async () => {
			mockFileCleanupService.deleteFile.mockResolvedValue(undefined);

			await service.cleanupFile('test-file-id');

			expect(mockFileCleanupService.deleteFile).toHaveBeenCalledWith('test-file-id');
		});
	});
});
