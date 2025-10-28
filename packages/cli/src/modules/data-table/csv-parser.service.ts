import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { parse } from 'csv-parse';
import { createReadStream } from 'fs';
import path from 'path';

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

	constructor(private readonly globalConfig: GlobalConfig) {
		this.uploadDir = this.globalConfig.dataTable.uploadDir;
	}

	/**
	 * Parses a CSV file and returns metadata including row count, column count, and inferred column types
	 * Assumes the first row always contains column names
	 */
	async parseFile(fileId: string): Promise<CsvMetadata> {
		const filePath = path.join(this.uploadDir, fileId);
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
					const columns = columnNames.map((columnName) => {
						const detectedType = this.inferColumnType(firstDataRow?.[columnName]);
						return {
							name: columnName,
							type: detectedType,
							compatibleTypes: this.getCompatibleTypes(detectedType),
						};
					});

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
	 * Parses a CSV file and returns all rows as an array of objects
	 * Assumes the first row always contains column names
	 */
	async parseFileData(fileId: string): Promise<Array<Record<string, string>>> {
		const filePath = path.join(this.uploadDir, fileId);

		const rows: Array<Record<string, string>> = [];

		return await new Promise((resolve, reject) => {
			const parser = parse({
				columns: true,
				skip_empty_lines: true,
			});

			createReadStream(filePath)
				.pipe(parser)
				.on('data', (row: Record<string, string>) => {
					rows.push(row);
				})
				.on('end', () => {
					resolve(rows);
				})
				.on('error', reject);
		});
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
				// Date can be kept as date or converted to string
				return ['date', 'string'];
			case 'number':
				// Number can be kept as number or converted to string
				return ['number', 'string'];
			case 'boolean':
				// Boolean can be kept as boolean or converted to string
				return ['boolean', 'string'];
			case 'string':
				// String can only be string (cannot reliably convert to other types)
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
