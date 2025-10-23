import { Service } from '@n8n/di';
import { parse } from 'csv-parse';
import { createReadStream } from 'fs';

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
	/**
	 * Parses a CSV file and returns metadata including row count, column count, and inferred column types
	 * Assumes the first row always contains column names
	 */
	async parseFile(filePath: string): Promise<CsvMetadata> {
		let rowCount = 0;
		let firstDataRow: Record<string, string> | null = null;
		let columnNames: string[] = [];

		return await new Promise((resolve, reject) => {
			const parser = parse({
				columns: (header: string[]) => {
					columnNames = header;
					return header;
				},
				skip_empty_lines: true,
			});

			createReadStream(filePath)
				.pipe(parser)
				.on('data', (row: Record<string, string>) => {
					rowCount++;
					firstDataRow ??= row;
				})
				.on('end', () => {
					const columns = columnNames.map((columnName) => ({
						name: columnName,
						type: this.inferColumnType(firstDataRow?.[columnName]),
					}));

					resolve({
						rowCount,
						columnCount: columns.length,
						columns,
					});
				})
				.on('error', reject);
		});
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
