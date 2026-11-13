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

	private processRowWithoutHeaders(
		row: string[],
		columnNames: string[],
	): { rowObject: Record<string, string>; columnNames: string[] } {
		let updatedColumnNames = columnNames;
		if (updatedColumnNames.length === 0) {
			updatedColumnNames = row.map((_, index) => `${this.DEFAULT_COLUMN_PREFIX}${index + 1}`);
		}
		const rowObject: Record<string, string> = {};
		row.forEach((value, index) => {
			rowObject[updatedColumnNames[index]] = value;
		});
		return { rowObject, columnNames: updatedColumnNames };
	}

	/**
	 * Parses a CSV file and returns metadata including row count, column count, and inferred column types
	 */
	async parseFile(fileId: string, hasHeaders: boolean = true): Promise<CsvMetadata> {
		const filePath = safeJoinPath(this.uploadDir, fileId);
		let rowCount = 0;
		let firstDataRow: Record<string, string> | null = null;
		let columnNames: string[] = [];

		const parser = parse({
			columns: hasHeaders
				? (header: string[]) => {
						columnNames = header;
						return header;
					}
				: false,
			skip_empty_lines: true,
			// The same line endings that `CsvColumnLimit` counts. With auto-detection, a file that
			// starts with `\r\n` reads every later `\n` as data, so one record could span many lines.
			record_delimiter: ['\r\n', '\n', '\r'],
		}).on('data', (row: Record<string, string> | string[]) => {
			rowCount++;

			if (!hasHeaders && Array.isArray(row)) {
				const processed = this.processRowWithoutHeaders(row, columnNames);
				columnNames = processed.columnNames;
				firstDataRow ??= processed.rowObject;
			} else if (!Array.isArray(row)) {
				firstDataRow ??= row;
			}
		});

		await pipeline(createReadStream(filePath), new CsvColumnLimit(), parser);

		const columns = columnNames.map((columnName) => {
			const detectedType = this.inferColumnType(firstDataRow?.[columnName]);
			return {
				name: columnName,
				type: detectedType,
				compatibleTypes: this.getCompatibleTypes(detectedType),
			};
		});

		return {
			rowCount,
			columnCount: columns.length,
			columns,
		};
	}

	/**
	 * Reads only the first line of a CSV file and returns its column names.
	 */
	async parseColumnNames(fileId: string, hasHeaders: boolean = true): Promise<string[]> {
		let columnNames: string[] = [];
		const rows = this.readRows(fileId, hasHeaders, {
			toLine: 1,
			onColumnNames: (names) => {
				columnNames = names;
			},
		});

		try {
			await rows.next();
		} finally {
			await rows.return(undefined);
		}

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
			columns: hasHeaders
				? (header: string[]) => {
						onColumnNames?.(header);
						return header;
					}
				: false,
			skip_empty_lines: true,
			// The same line endings that `CsvColumnLimit` counts. With auto-detection, a file that
			// starts with `\r\n` reads every later `\n` as data, so one record could span many lines.
			record_delimiter: ['\r\n', '\n', '\r'],
			to_line: toLine,
		});

		const input = createReadStream(filePath);
		// Errors reach the caller through the parser. A parser that stops early at `toLine`
		// ends the pipeline with a premature close, which is expected.
		pipeline(input, new CsvColumnLimit(), parser).catch(() => {});

		const records: AsyncIterable<Record<string, string> | string[]> = parser;

		try {
			for await (const row of records) {
				if (!Array.isArray(row)) {
					yield row;
					continue;
				}

				const processed = this.processRowWithoutHeaders(row, columnNames);
				if (columnNames.length === 0) {
					onColumnNames?.(processed.columnNames);
				}

				columnNames = processed.columnNames;
				yield processed.rowObject;
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
