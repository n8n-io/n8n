import type { CreateDataTableDto } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { DataTableRow } from 'n8n-workflow';
import { DATA_TABLE_SYSTEM_COLUMNS } from 'n8n-workflow';

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
	 * Builds batches of transformed rows for importing CSV data into a newly created table.
	 * Supports column renaming via dtoColumns.csvColumnName and falls back to
	 * index-based mapping when no csvColumnName is provided.
	 */
	async buildRowBatchesForNewTable(
		fileId: string,
		hasHeaders: boolean,
		tableColumns: DataTableColumn[],
		dtoColumns?: CreateDataTableDto['columns'],
	): Promise<AsyncGenerator<DataTableRow[]>> {
		const failure = {
			logMessage: 'Failed to import data from CSV file',
			fallbackMessage: 'Failed to read CSV file',
		};

		let columnMapping: Map<string, string>;
		try {
			columnMapping = await this.buildColumnMappingForNewTable(
				fileId,
				hasHeaders,
				tableColumns,
				dtoColumns,
			);
		} catch (error) {
			throw this.toFileUploadError(error, fileId, failure);
		}

		return this.transformRowBatches(fileId, hasHeaders, columnMapping, failure);
	}

	/**
	 * Validates CSV columns against an existing table and builds batches of transformed rows.
	 * System columns are silently skipped. Unrecognized columns cause an error.
	 * Empty/missing values are converted to null.
	 */
	async validateAndBuildRowBatchesForExistingTable(
		fileId: string,
		tableColumns: DataTableColumn[],
	): Promise<{ rowBatches: AsyncGenerator<DataTableRow[]>; systemColumnsIgnored: string[] }> {
		const failure = {
			logMessage: 'Failed to import CSV to existing table',
			fallbackMessage: 'Failed to import CSV file',
		};

		let csvColumnNames: string[];
		try {
			csvColumnNames = await this.csvParserService.parseColumnNames(fileId);
		} catch (error) {
			throw this.toFileUploadError(error, fileId, failure);
		}

		const tableColumnNames = new Set(tableColumns.map((col) => col.name));
		const { matchedColumns, systemColumnsIgnored } = this.matchColumns(
			csvColumnNames,
			tableColumnNames,
		);

		const mapping = new Map(matchedColumns.map((col) => [col, col]));
		return {
			rowBatches: this.transformRowBatches(fileId, true, mapping, failure),
			systemColumnsIgnored,
		};
	}

	async claimFile(fileId: string) {
		return await this.fileCleanupService.claimFile(fileId);
	}

	async cleanupFile(fileId: string) {
		await this.fileCleanupService.deleteFile(fileId);
	}

	private async *transformRowBatches(
		fileId: string,
		hasHeaders: boolean,
		columnMapping: Map<string, string>,
		failure: { logMessage: string; fallbackMessage: string },
	): AsyncGenerator<DataTableRow[]> {
		try {
			for await (const csvRows of this.csvParserService.parseFileInBatches(fileId, hasHeaders)) {
				yield this.transformRows(csvRows, columnMapping);
			}
		} catch (error) {
			throw this.toFileUploadError(error, fileId, failure);
		}
	}

	private toFileUploadError(
		error: unknown,
		fileId: string,
		failure: { logMessage: string; fallbackMessage: string },
	) {
		this.logger.error(failure.logMessage, { error, fileId });
		if (error instanceof FileUploadError) {
			return error;
		}

		return new FileUploadError(error instanceof Error ? error.message : failure.fallbackMessage);
	}

	private matchColumns(
		csvColumnNames: string[],
		tableColumnNames: Set<string>,
	): { matchedColumns: string[]; systemColumnsIgnored: string[] } {
		const systemColumnsIgnored: string[] = [];
		const unrecognizedColumns: string[] = [];
		const matchedColumns: string[] = [];

		for (const csvColName of csvColumnNames) {
			if (DATA_TABLE_SYSTEM_COLUMNS.includes(csvColName)) {
				systemColumnsIgnored.push(csvColName);
			} else if (tableColumnNames.has(csvColName)) {
				matchedColumns.push(csvColName);
			} else {
				unrecognizedColumns.push(csvColName);
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
