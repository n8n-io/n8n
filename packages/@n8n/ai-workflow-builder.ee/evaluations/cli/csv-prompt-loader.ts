import { parse } from 'csv-parse/sync';
import { existsSync, readFileSync } from 'node:fs';
import { join, isAbsolute, resolve } from 'node:path';

import type { TestCase } from '../harness/harness-types';

/** Path to the default prompts CSV fixture */
const DEFAULT_PROMPTS_PATH = join(__dirname, '..', 'fixtures', 'default-prompts.csv');

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
	const resolvedPath = isAbsolute(csvPath) ? csvPath : resolve(process.cwd(), csvPath);

	if (!existsSync(resolvedPath)) {
		throw new Error(`CSV file not found at ${resolvedPath}`);
	}

	const rows = parseCsv(readFileSync(resolvedPath, 'utf8'));

	if (rows.length === 0) {
		throw new Error('The provided CSV file is empty');
	}

	const hasHeader = isHeaderRow(rows[0]);
	const header = hasHeader ? rows[0] : undefined;
	const dataRows = hasHeader ? rows.slice(1) : rows;

	if (dataRows.length === 0) {
		throw new Error('No prompt rows found in the provided CSV file');
	}

	// Find column index by name(s), returns undefined if no header
	const findColumn = (...names: string[]): number | undefined => {
		if (!header) return undefined;
		for (const name of names) {
			const idx = detectColumnIndex(header, name);
			if (idx !== undefined) return idx;
		}
		return undefined;
	};

	const promptIdx = findColumn('prompt') ?? 0;
	const idIdx = findColumn('id');
	const dosIdx = findColumn('dos', 'do');
	const dontsIdx = findColumn('donts', 'dont');

	const getCell = (row: ParsedCsvRow, idx: number | undefined): string =>
		idx !== undefined ? sanitizeValue(row[idx]) : '';

	const testCases: TestCase[] = [];

	for (let i = 0; i < dataRows.length; i++) {
		const row = dataRows[i];
		const prompt = getCell(row, promptIdx);

		if (!prompt) continue;

		const dos = getCell(row, dosIdx);
		const donts = getCell(row, dontsIdx);

		const testCase: TestCase = {
			id: getCell(row, idIdx) || `csv-case-${i + 1}`,
			prompt,
		};

		if (dos || donts) {
			testCase.context = {};
			if (dos) testCase.context.dos = dos;
			if (donts) testCase.context.donts = donts;
		}

		testCases.push(testCase);
	}

	if (testCases.length === 0) {
		throw new Error('No valid prompts found in the provided CSV file');
	}

	return testCases;
}

/** Cached default test cases */
let cachedDefaultTestCases: TestCase[] | null = null;

/**
 * Load the default test cases from the bundled CSV fixture.
 * Results are cached after first load.
 */
export function loadDefaultTestCases(): TestCase[] {
	cachedDefaultTestCases ??= loadTestCasesFromCsv(DEFAULT_PROMPTS_PATH);
	return cachedDefaultTestCases;
}

/**
 * Get available test case IDs from the default fixture.
 */
export function getDefaultTestCaseIds(): string[] {
	return loadDefaultTestCases()
		.map((tc) => tc.id)
		.filter((id): id is string => id !== undefined);
}
