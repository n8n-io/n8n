import { parse } from 'csv-parse/sync';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import type { TestCase } from '../harness/harness-types.js';

type ParsedCsvRow = string[];

function isHeaderRow(row: ParsedCsvRow) {
	return row.some((cell) => cell.trim().toLowerCase() === 'prompt');
}

function detectColumnIndex(header: ParsedCsvRow, name: string) {
	const normalized = name.toLowerCase();
	const index = header.findIndex((cell) => cell.trim().toLowerCase() === normalized);
	return index >= 0 ? index : undefined;
}

function sanitizeValue(value: string | undefined) {
	return value?.trim() ?? '';
}

function parseCsv(content: string): ParsedCsvRow[] {
	try {
		const rows = parse(content.replace(/^\ufeff/, ''), {
			columns: false,
			skip_empty_lines: true,
			trim: true,
			relax_column_count: true,
		}) as ParsedCsvRow[];

		return rows.map((row) => row.map((cell) => cell ?? ''));
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown parsing error';
		throw new Error(`Failed to parse CSV file: ${message}`);
	}
}

export function loadTestCasesFromCsv(csvPath: string): TestCase[] {
	const resolvedPath = path.isAbsolute(csvPath) ? csvPath : path.resolve(process.cwd(), csvPath);

	if (!existsSync(resolvedPath)) {
		throw new Error(`CSV file not found at ${resolvedPath}`);
	}

	const fileContents = readFileSync(resolvedPath, 'utf8');
	const rows = parseCsv(fileContents);

	if (rows.length === 0) {
		throw new Error('The provided CSV file is empty');
	}

	let header: ParsedCsvRow | undefined;
	let dataRows = rows;

	if (isHeaderRow(rows[0])) {
		header = rows[0]!;
		dataRows = rows.slice(1);
	}

	if (dataRows.length === 0) {
		throw new Error('No prompt rows found in the provided CSV file');
	}

	const promptIndex = header ? (detectColumnIndex(header, 'prompt') ?? 0) : 0;
	const idIndex = header ? detectColumnIndex(header, 'id') : undefined;
	const dosIndex = header
		? (detectColumnIndex(header, 'dos') ?? detectColumnIndex(header, 'do'))
		: undefined;
	const dontsIndex = header
		? (detectColumnIndex(header, 'donts') ?? detectColumnIndex(header, 'dont'))
		: undefined;

	const testCases = dataRows
		.map<TestCase | undefined>((row, index) => {
			const prompt = sanitizeValue(row[promptIndex]);
			if (!prompt) {
				return undefined;
			}

			const idSource = sanitizeValue(idIndex !== undefined ? row[idIndex] : undefined);
			const dosSource = sanitizeValue(dosIndex !== undefined ? row[dosIndex] : undefined);
			const dontsSource = sanitizeValue(dontsIndex !== undefined ? row[dontsIndex] : undefined);

			return {
				...(idSource ? { id: idSource } : { id: `csv-case-${index + 1}` }),
				prompt,
				...((dosSource || dontsSource) && {
					context: {
						...(dosSource ? { dos: dosSource } : {}),
						...(dontsSource ? { donts: dontsSource } : {}),
					},
				}),
			};
		})
		.filter((testCase): testCase is TestCase => testCase !== undefined);

	if (testCases.length === 0) {
		throw new Error('No valid prompts found in the provided CSV file');
	}

	return testCases;
}
