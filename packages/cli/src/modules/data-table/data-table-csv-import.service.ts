import type { CreateDataTableDto } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { DataTableRow } from 'n8n-workflow';
import { DATA_TABLE_SYSTEM_COLUMNS } from 'n8n-workflow';

import type { CsvColumnMetadata } from './csv-parser.service';
import { CsvParserService } from './csv-parser.service';
import type { DataTableColumn } from './data-table-column.entity';
import { DataTableFileCleanupService } from './data-table-file-cleanup.service';
import { FileUploadError } from './errors/data-table-file-upload.error';
import { DataTableValidationError } from './errors/data-table-validation.error';

@Service()
export class DataTableCsvImportService {
	private readonly logger: Logger;

	constructor(
		private readonly csvParserService: CsvParserService,
		private readonly fileCleanupService: DataTableFileCleanupService,
		logger: Logger,
	) {
		this.logger = logger.scoped('data-table-csv-import');
	}

	/**
	 * Builds transformed rows for importing CSV data into a newly created table.
	 * Supports column renaming via dtoColumns.csvColumnName and falls back to
	 * index-based mapping when no csvColumnName is provided.
	 */
	async buildRowsForNewTable(
		fileId: string,
		hasHeaders: boolean,
		tableColumns: DataTableColumn[],
		dtoColumns?: CreateDataTableDto['columns'],
	): Promise<DataTableRow[]> {
		try {
			const columnMapping = await this.buildColumnMappingForNewTable(
				fileId,
				hasHeaders,
				tableColumns,
				dtoColumns,
			);

			const csvRows = await this.csvParserService.parseFileData(fileId, hasHeaders);

			return this.transformRows(csvRows, columnMapping);
		} catch (error) {
			this.logger.error('Failed to import data from CSV file', { error, fileId });
			throw new FileUploadError(error instanceof Error ? error.message : 'Failed to read CSV file');
		}
	}

	/**
	 * Validates CSV columns against an existing table and builds transformed rows.
	 * System columns are silently skipped. Unrecognized columns cause an error.
	 * Empty/missing values are converted to null.
	 */
	async validateAndBuildRowsForExistingTable(
		fileId: string,
		tableColumns: DataTableColumn[],
	): Promise<{ rows: DataTableRow[]; systemColumnsIgnored: string[] }> {
		try {
			const tableColumnNames = new Set(tableColumns.map((col) => col.name));

			const { metadata: csvMetadata, rows: csvRows } =
				await this.csvParserService.parseFileWithData(fileId);

			const { matchedColumns, systemColumnsIgnored } = this.matchColumns(
				csvMetadata.columns,
				tableColumnNames,
			);

			const mapping = new Map(matchedColumns.map((col) => [col, col]));
			return {
				rows: this.transformRows(csvRows, mapping),
				systemColumnsIgnored,
			};
		} catch (error) {
			if (error instanceof DataTableValidationError) throw error;
			this.logger.error('Failed to import CSV to existing table', { error, fileId });
			throw new FileUploadError(
				error instanceof Error ? error.message : 'Failed to import CSV file',
			);
		}
	}

	async cleanupFile(fileId: string) {
		await this.fileCleanupService.deleteFile(fileId);
	}

	private matchColumns(
		csvColumns: CsvColumnMetadata[],
		tableColumnNames: Set<string>,
	): { matchedColumns: string[]; systemColumnsIgnored: string[] } {
		const systemColumnsIgnored: string[] = [];
		const unrecognizedColumns: string[] = [];
		const matchedColumns: string[] = [];

		for (const csvCol of csvColumns) {
			if (DATA_TABLE_SYSTEM_COLUMNS.includes(csvCol.name)) {
				systemColumnsIgnored.push(csvCol.name);
			} else if (tableColumnNames.has(csvCol.name)) {
				matchedColumns.push(csvCol.name);
			} else {
				unrecognizedColumns.push(csvCol.name);
			}
		}

		if (unrecognizedColumns.length > 0) {
			throw new DataTableValidationError(
				`CSV contains columns not found in the data table: ${unrecognizedColumns.join(', ')}. Remove them and try again.`,
			);
		}

		if (matchedColumns.length === 0) {
			throw new DataTableValidationError(
				'No matching columns found between CSV and data table. CSV columns must match table column names exactly.',
			);
		}

		return { matchedColumns, systemColumnsIgnored };
	}

	private transformRows(
		csvRows: Array<Record<string, string>>,
		columnMapping: Map<string, string>,
	): DataTableRow[] {
		return csvRows.map((csvRow) => {
			const transformedRow: DataTableRow = {};
			for (const [csvColName, tableColName] of columnMapping) {
				const value = csvRow[csvColName];
				transformedRow[tableColName] = value === undefined || value === '' ? null : value;
			}
			return transformedRow;
		});
	}

	private async buildColumnMappingForNewTable(
		fileId: string,
		hasHeaders: boolean,
		tableColumns: DataTableColumn[],
		dtoColumns?: CreateDataTableDto['columns'],
	): Promise<Map<string, string>> {
		const columnMapping = new Map<string, string>();

		const hasCsvColumnNames = dtoColumns?.some((c) => c.csvColumnName);
		if (hasCsvColumnNames) {
			const tableColByName = new Map(tableColumns.map((tc) => [tc.name, tc.name]));
			for (const dtoCol of dtoColumns!) {
				if (dtoCol.csvColumnName) {
					const tableName = tableColByName.get(dtoCol.name);
					if (tableName) {
						columnMapping.set(dtoCol.csvColumnName, tableName);
					}
				}
			}
		} else {
			const csvMetadata = await this.csvParserService.parseFile(fileId, hasHeaders);
			csvMetadata.columns.forEach((csvColumn, index) => {
				if (tableColumns[index]) {
					columnMapping.set(csvColumn.name, tableColumns[index].name);
				}
			});
		}

		return columnMapping;
	}
}
