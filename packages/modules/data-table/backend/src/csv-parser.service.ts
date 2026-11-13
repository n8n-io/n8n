import { safeJoinPath } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { parse } from 'csv-parse';
import { createReadStream } from 'fs';
import { pipeline } from 'stream/promises';

import { CsvColumnLimit } from './csv-column-limit';

export const CSV_ROW_BATCH_SIZE = 1000;

export interface CsvColumnMetadata {
	name: string;
	type: 'string' | 'number' | 'boolean' | 'date';
}

export interface CsvMetadata {
	rowCount: number;
	columnCount: number;
	columns: CsvColumnMetadata[];
}

@Service()
export class CsvParserService {
	private readonly uploadDir: string;

	private readonly DEFAULT_COLUMN_PREFIX = 'Column_';

	constructor(private readonly globalConfig: GlobalConfig) {
		this.uploadDir = this.globalConfig.dataTable.uploadDir;
	}

	private generateColumnNames(columnCount: number): string[] {
		return Array.from({ length: columnCount }, (_, i) => `${this.DEFAULT_COLUMN_PREFIX}${i + 1}`);
	}

	private mapValuesToColumns(row: string[], columnNames: string[]): Record<string, string> {
		const rowObject: Record<string, string> = {};
		row.forEach((value, index) => {
			rowObject[columnNames[index]] = value;
		});
		return rowObject;
	}

	private readonly TYPE_INFERENCE_SAMPLE_SIZE = 100;

	private createParserOptions(hasHeaders: boolean) {
		return {
			columns: hasHeaders ? true : (false as const),
			skip_empty_lines: true,
			bom: true,
			// The same line endings that `CsvColumnLimit` counts. With auto-detection, a file that
			// starts with `\r\n` reads every later `\n` as data, so one record could span many lines.
			record_delimiter: ['\r\n', '\n', '\r'],
		};
	}

	private trimColumnNames(columns: string[]): string[] {
		return columns.map((h) => h.trim());
	}

	private normalizeRow(
		row: Record<string, string> | string[],
		hasHeaders: boolean,
		columnNames: string[],
	): Record<string, string> | null {
		if (!hasHeaders && Array.isArray(row)) {
			return this.mapValuesToColumns(row, columnNames);
		} else if (!Array.isArray(row)) {
			return row;
		}
		return null;
	}

	private collectTypeSamples(
		rowObject: Record<string, string>,
		columnNames: string[],
		firstNonEmptyValues: Map<string, string>,
	) {
		for (const colName of columnNames) {
			if (!firstNonEmptyValues.has(colName)) {
				const value = rowObject[colName];
				if (value?.trim()) {
					firstNonEmptyValues.set(colName, value);
				}
			}
		}
	}

	private buildColumnMetadata(columnNames: string[], firstNonEmptyValues: Map<string, string>) {
		return columnNames.map((columnName) => {
			const detectedType = this.inferColumnType(firstNonEmptyValues.get(columnName));
			return {
				name: columnName,
				type: detectedType,
				compatibleTypes: this.getCompatibleTypes(detectedType),
			};
		});
	}

	private async parseCsvFile<T>(
		fileId: string,
		hasHeaders: boolean,
		onRow: (rowObject: Record<string, string>, columnNames: string[], rowNumber: number) => void,
		onEnd: (columnNames: string[], totalRows: number) => T,
	): Promise<T> {
		const filePath = safeJoinPath(this.uploadDir, fileId);
		let columnNames: string[] = [];
		let rowCount = 0;

		const parser = parse({
			...this.createParserOptions(hasHeaders),
			...(hasHeaders && {
				columns: (header: string[]) => {
					columnNames = this.trimColumnNames(header);
					return columnNames;
				},
			}),
		}).on('data', (row: Record<string, string> | string[]) => {
			rowCount++;
			if (!hasHeaders && Array.isArray(row) && columnNames.length === 0) {
				columnNames = this.generateColumnNames(row.length);
			}
			const rowObject = this.normalizeRow(row, hasHeaders, columnNames);
			if (rowObject) {
				onRow(rowObject, columnNames, rowCount);
			}
		});

		await pipeline(createReadStream(filePath), new CsvColumnLimit(), parser);

		return onEnd(columnNames, rowCount);
	}

	/**
	 * Parses a CSV file and returns metadata including row count, column count, and inferred column types.
	 * Samples up to 100 rows to find the first non-empty value per column for type inference.
	 */
	async parseFile(fileId: string, hasHeaders: boolean = true): Promise<CsvMetadata> {
		const firstNonEmptyValues = new Map<string, string>();

		return await this.parseCsvFile(
			fileId,
			hasHeaders,
			(rowObject, colNames, rowNumber) => {
				if (rowNumber <= this.TYPE_INFERENCE_SAMPLE_SIZE) {
					this.collectTypeSamples(rowObject, colNames, firstNonEmptyValues);
				}
			},
			(colNames, totalRows) => {
				const columns = this.buildColumnMetadata(colNames, firstNonEmptyValues);
				return { rowCount: totalRows, columnCount: columns.length, columns };
			},
		);
	}

	/**
	 * Reads only the header line of a CSV file and returns its column names.
	 */
	async parseColumnNames(fileId: string): Promise<string[]> {
		let columnNames: string[] = [];
		await this.readRows(fileId, true, {
			toLine: 1,
			onColumnNames: (names) => {
				columnNames = names;
			},
		}).next();

		return columnNames;
	}

	/**
	 * Yields the rows of a CSV file in batches of at most `batchSize` rows.
	 * The file is read only as fast as the caller consumes the batches.
	 */
	async *parseFileInBatches(
		fileId: string,
		hasHeaders: boolean = true,
		batchSize: number = CSV_ROW_BATCH_SIZE,
	): AsyncGenerator<Array<Record<string, string>>> {
		let batch: Array<Record<string, string>> = [];

		for await (const rowObject of this.readRows(fileId, hasHeaders)) {
			batch.push(rowObject);
			if (batch.length >= batchSize) {
				yield batch;
				batch = [];
			}
		}

		if (batch.length > 0) {
			yield batch;
		}
	}

	private async *readRows(
		fileId: string,
		hasHeaders: boolean,
		{
			toLine,
			onColumnNames,
		}: { toLine?: number; onColumnNames?: (columnNames: string[]) => void } = {},
	): AsyncGenerator<Record<string, string>> {
		const filePath = safeJoinPath(this.uploadDir, fileId);
		let columnNames: string[] = [];

		const parser = parse({
			...this.createParserOptions(hasHeaders),
			to_line: toLine,
			...(hasHeaders && {
				columns: (header: string[]) => {
					columnNames = this.trimColumnNames(header);
					onColumnNames?.(columnNames);
					return columnNames;
				},
			}),
		});

		const input = createReadStream(filePath);
		// Errors reach the caller through the parser. A parser that stops early at `toLine`
		// ends the pipeline with a premature close, which is expected.
		pipeline(input, new CsvColumnLimit(), parser).catch(() => {});

		const records: AsyncIterable<Record<string, string> | string[]> = parser;

		try {
			for await (const row of records) {
				const needsGeneratedColumnNames = !hasHeaders && columnNames.length === 0;
				if (needsGeneratedColumnNames && Array.isArray(row)) {
					columnNames = this.generateColumnNames(row.length);
					onColumnNames?.(columnNames);
				}

				const rowObject = this.normalizeRow(row, hasHeaders, columnNames);
				if (rowObject) {
					yield rowObject;
				}
			}
		} finally {
			input.destroy();
			parser.destroy();
		}
	}

	/**
	 * Returns the list of compatible types for a detected type
	 * Logic: more specific types can be converted to string, but string cannot be converted to specific types
	 */
	private getCompatibleTypes(
		detectedType: 'string' | 'number' | 'boolean' | 'date',
	): Array<'string' | 'number' | 'boolean' | 'date'> {
		switch (detectedType) {
			case 'date':
				return ['date', 'string'];
			case 'number':
				return ['number', 'string'];
			case 'boolean':
				return ['boolean', 'string'];
			case 'string':
				return ['string'];
			default:
				return ['string'];
		}
	}

	/**
	 * Infers the column type from a sample value
	 * Priority: boolean > number > date > string
	 */
	private inferColumnType(value: string | undefined): 'string' | 'number' | 'boolean' | 'date' {
		if (!value?.trim()) {
			return 'string';
		}

		const trimmedValue = value.trim();
		const lowerValue = trimmedValue.toLowerCase();

		if (lowerValue === 'true' || lowerValue === 'false') {
			return 'boolean';
		}

		if (!Number.isNaN(Number(trimmedValue))) {
			return 'number';
		}

		if (this.isDate(trimmedValue)) {
			return 'date';
		}

		return 'string';
	}

	/**
	 * Checks if a string represents a valid date
	 */
	private isDate(value: string): boolean {
		// Try to parse as date
		const date = new Date(value);

		// Check if it's a valid date and the original value looks like a date
		if (!Number.isNaN(date.getTime())) {
			// Additional check: make sure it looks like a date format
			// This prevents strings like "123" from being interpreted as dates
			const datePatterns = [
				/^\d{4}-\d{2}-\d{2}/, // ISO date (YYYY-MM-DD)
				/^\d{4}\/\d{2}\/\d{2}/, // YYYY/MM/DD
				/^\d{2}\/\d{2}\/\d{4}/, // MM/DD/YYYY or DD/MM/YYYY
				/^\d{2}-\d{2}-\d{4}/, // MM-DD-YYYY or DD-MM-YYYY
				/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, // ISO datetime
			];

			return datePatterns.some((pattern) => pattern.test(value));
		}

		return false;
	}
}
