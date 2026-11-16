import { Logger } from '@n8n/backend-common';
import { mockInstance, testModules } from '@n8n/backend-test-utils';
import type { Mocked } from 'vitest';

import { CsvParserService } from '../csv-parser.service';
import type { DataTableColumn } from '../data-table-column.entity';
import { DataTableCsvImportService } from '../data-table-csv-import.service';
import { DataTableFileCleanupService } from '../data-table-file-cleanup.service';
import { FileUploadError } from '../errors/data-table-file-upload.error';
import { DataTableValidationError } from '../errors/data-table-validation.error';

describe('DataTableCsvImportService', () => {
	let service: DataTableCsvImportService;
	let mockCsvParserService: Mocked<CsvParserService>;
	let mockFileCleanupService: Mocked<DataTableFileCleanupService>;
	let mockLogger: Mocked<Logger>;

	beforeAll(async () => {
		await testModules.loadModules(['data-table'], {
			'data-table': async () => await import('../data-table.module.js'),
		});
	});

	beforeEach(() => {
		mockCsvParserService = mockInstance(CsvParserService);
		mockFileCleanupService = mockInstance(DataTableFileCleanupService);
		mockLogger = mockInstance(Logger);
		mockLogger.scoped = vi.fn().mockReturnValue(mockLogger);

		service = new DataTableCsvImportService(
			mockCsvParserService,
			mockFileCleanupService,
			mockLogger,
		);

		vi.clearAllMocks();
	});

	async function* toBatches(...batches: Array<Array<Record<string, string>>>) {
		for (const batch of batches) {
			yield batch;
		}
	}

	async function collectRows<T>(rowBatches: AsyncIterable<T[]>): Promise<T[]> {
		const rows: T[] = [];
		for await (const batch of rowBatches) {
			rows.push(...batch);
		}

		return rows;
	}

	describe('validateAndBuildRowBatchesForExistingTable', () => {
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
			mockCsvParserService.parseColumnNames.mockResolvedValue(['name', 'age', 'email']);
			mockCsvParserService.parseFileInBatches.mockReturnValue(
				toBatches([
					{ name: 'Alice', age: '30', email: 'alice@test.com' },
					{ name: 'Bob', age: '25', email: 'bob@test.com' },
				]),
			);

			const result = await service.validateAndBuildRowBatchesForExistingTable(fileId, tableColumns);
			const rows = await collectRows(result.rowBatches);

			expect(rows).toHaveLength(2);
			expect(rows[0]).toEqual({ name: 'Alice', age: '30', email: 'alice@test.com' });
			expect(result.systemColumnsIgnored).toEqual([]);
		});

		it('should keep the batches of the parser', async () => {
			mockCsvParserService.parseColumnNames.mockResolvedValue(['name']);
			mockCsvParserService.parseFileInBatches.mockReturnValue(
				toBatches([{ name: 'Alice' }, { name: 'Bob' }], [{ name: 'Carol' }]),
			);

			const { rowBatches } = await service.validateAndBuildRowBatchesForExistingTable(
				fileId,
				tableColumns,
			);

			const batches: unknown[][] = [];
			for await (const batch of rowBatches) {
				batches.push(batch);
			}

			expect(batches).toEqual([[{ name: 'Alice' }, { name: 'Bob' }], [{ name: 'Carol' }]]);
		});

		it('should validate columns before it reads any rows', async () => {
			mockCsvParserService.parseColumnNames.mockResolvedValue(['unknown_col']);

			await expect(
				service.validateAndBuildRowBatchesForExistingTable(fileId, tableColumns),
			).rejects.toThrow(DataTableValidationError);

			expect(mockCsvParserService.parseFileInBatches).not.toHaveBeenCalled();
		});

		it('should ignore system columns and return them in systemColumnsIgnored', async () => {
			mockCsvParserService.parseColumnNames.mockResolvedValue([
				'id',
				'name',
				'createdAt',
				'updatedAt',
			]);
			mockCsvParserService.parseFileInBatches.mockReturnValue(
				toBatches([{ id: '1', name: 'Alice', createdAt: '2024-01-01', updatedAt: '2024-01-01' }]),
			);

			const result = await service.validateAndBuildRowBatchesForExistingTable(fileId, tableColumns);
			const rows = await collectRows(result.rowBatches);

			expect(rows).toHaveLength(1);
			expect(rows[0]).toEqual({ name: 'Alice' });
			expect(result.systemColumnsIgnored).toEqual(['id', 'createdAt', 'updatedAt']);
		});

		it('should throw DataTableValidationError when CSV has unrecognized columns', async () => {
			mockCsvParserService.parseColumnNames.mockResolvedValue([
				'name',
				'unknown_col',
				'another_unknown',
			]);

			await expect(
				service.validateAndBuildRowBatchesForExistingTable(fileId, tableColumns),
			).rejects.toThrow(DataTableValidationError);

			await expect(
				service.validateAndBuildRowBatchesForExistingTable(fileId, tableColumns),
			).rejects.toThrow(
				'CSV contains columns not found in the data table: unknown_col, another_unknown',
			);
		});

		it('should throw DataTableValidationError when zero non-system columns match', async () => {
			mockCsvParserService.parseColumnNames.mockResolvedValue(['id', 'createdAt']);

			await expect(
				service.validateAndBuildRowBatchesForExistingTable(fileId, tableColumns),
			).rejects.toThrow(DataTableValidationError);

			await expect(
				service.validateAndBuildRowBatchesForExistingTable(fileId, tableColumns),
			).rejects.toThrow('No matching columns found');
		});

		it('should convert empty and missing CSV values to null', async () => {
			mockCsvParserService.parseColumnNames.mockResolvedValue(['name', 'age']);
			mockCsvParserService.parseFileInBatches.mockReturnValue(
				toBatches([{ name: 'Alice', age: '' }, { name: '' }]),
			);

			const result = await service.validateAndBuildRowBatchesForExistingTable(fileId, tableColumns);
			const rows = await collectRows(result.rowBatches);

			expect(rows[0]).toEqual({ name: 'Alice', age: null });
			expect(rows[1]).toEqual({ name: null, age: null });
		});

		it('should wrap unexpected header errors in FileUploadError', async () => {
			mockCsvParserService.parseColumnNames.mockRejectedValue(new Error('disk read failed'));

			await expect(
				service.validateAndBuildRowBatchesForExistingTable(fileId, tableColumns),
			).rejects.toThrow(FileUploadError);
		});

		it('should wrap unexpected row errors in FileUploadError', async () => {
			mockCsvParserService.parseColumnNames.mockResolvedValue(['name']);
			mockCsvParserService.parseFileInBatches.mockImplementation(async function* () {
				yield [{ name: 'Alice' }];
				throw new Error('Invalid Closing Quote');
			});

			const { rowBatches } = await service.validateAndBuildRowBatchesForExistingTable(
				fileId,
				tableColumns,
			);

			await expect(collectRows(rowBatches)).rejects.toThrow(FileUploadError);
		});
	});

	describe('buildRowBatchesForNewTable', () => {
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
			mockCsvParserService.parseFileInBatches.mockReturnValue(
				toBatches([{ name: 'Alice', age: '30' }]),
			);

			const rows = await collectRows(
				await service.buildRowBatchesForNewTable(fileId, true, tableColumns),
			);

			expect(rows).toHaveLength(1);
			expect(rows[0]).toEqual({ 'First Name': 'Alice', Age: '30' });
			expect(mockCsvParserService.parseFileInBatches).toHaveBeenCalledWith(fileId, true);
		});

		it('should map CSV columns by csvColumnName when provided', async () => {
			const dtoColumns = [
				{ name: 'First Name', type: 'string' as const, csvColumnName: 'csv_name' },
				{ name: 'Age', type: 'number' as const, csvColumnName: 'csv_age' },
			];

			mockCsvParserService.parseFileInBatches.mockReturnValue(
				toBatches([{ csv_name: 'Alice', csv_age: '30' }]),
			);

			const rows = await collectRows(
				await service.buildRowBatchesForNewTable(fileId, true, tableColumns, dtoColumns),
			);

			expect(rows).toHaveLength(1);
			expect(rows[0]).toEqual({ 'First Name': 'Alice', Age: '30' });
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
			mockCsvParserService.parseFileInBatches.mockReturnValue(
				toBatches([{ name: 'Alice', age: '' }, { name: '' }]),
			);

			const rows = await collectRows(
				await service.buildRowBatchesForNewTable(fileId, true, tableColumns),
			);

			expect(rows[0]).toEqual({ 'First Name': 'Alice', Age: null });
			expect(rows[1]).toEqual({ 'First Name': null, Age: null });
		});

		it('should wrap unexpected errors in FileUploadError', async () => {
			mockCsvParserService.parseFile.mockRejectedValue(new Error('file not found'));

			await expect(service.buildRowBatchesForNewTable(fileId, true, tableColumns)).rejects.toThrow(
				FileUploadError,
			);
		});
	});

	describe('claimFile', () => {
		it('should delegate to file cleanup service', async () => {
			mockFileCleanupService.claimFile.mockResolvedValue('test-file-id.importing');

			await expect(service.claimFile('test-file-id')).resolves.toBe('test-file-id.importing');

			expect(mockFileCleanupService.claimFile).toHaveBeenCalledWith('test-file-id');
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
