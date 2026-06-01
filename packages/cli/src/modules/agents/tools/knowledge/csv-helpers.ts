import { createReadStream } from 'node:fs';
import path from 'node:path';

import { distance } from 'fastest-levenshtein';

import { resolveFileReference, type WorkspaceFiles } from './file-references';
import type { CsvAggregateInput, CsvFilter } from './schemas';

export const CSV_SAMPLE_VALUE_LIMIT = 5;
export const CSV_PROFILE_DISTINCT_LIMIT = 100;
export const CSV_DISTINCT_TRACK_LIMIT = 10_000;
/** Cap distinct aggregate groups to bound memory on high-cardinality group-by. */
export const CSV_MAX_AGGREGATE_GROUPS = 50_000;
/** Wall-clock safety net for a single CSV operation (files are upload-size-capped). */
const CSV_OPERATION_TIMEOUT_MS = 15_000;

function isCsvFile(file: WorkspaceFiles[number]) {
	return file.mimeType === 'text/csv' || file.relativePath.toLowerCase().endsWith('.csv');
}

export function resolveCsvFile(files: WorkspaceFiles, reference: string) {
	const resolvedFile = resolveFileReference(files, reference);
	if (resolvedFile.status !== 'found') {
		throw new Error(resolvedFile.error);
	}
	const { file } = resolvedFile;
	if (!isCsvFile(file)) {
		throw new Error(`File "${file.fileName}" is not queryable as CSV.`);
	}
	return file;
}

export async function streamCsvRecords(
	workspaceRoot: string,
	file: WorkspaceFiles[number],
	handlers: {
		onHeaders?: (headers: string[]) => void;
		onRecord: (record: { record: Record<string, unknown>; fileLineNumber: number }) => void;
	},
) {
	const filePath = path.join(workspaceRoot, file.relativePath);
	const { parse } = await import('csv-parse');
	const readStream = createReadStream(filePath);
	const parser = readStream.pipe(
		parse({
			columns: (parsedHeaders: string[]) => {
				handlers.onHeaders?.(parsedHeaders);
				return parsedHeaders;
			},
			skip_empty_lines: true,
			bom: true,
			info: true,
			relax_column_count: true,
		}),
	);
	// Safety net: destroying the parser rejects the async iterator below so a
	// pathologically slow file can't tie up the event loop indefinitely.
	const timeout = setTimeout(() => {
		parser.destroy(new Error('CSV operation exceeded the time limit'));
		readStream.destroy();
	}, CSV_OPERATION_TIMEOUT_MS);
	try {
		for await (const { record, info } of parser as AsyncIterable<{
			record: Record<string, unknown>;
			info: { lines: number };
		}>) {
			handlers.onRecord({ record, fileLineNumber: info.lines });
		}
	} finally {
		clearTimeout(timeout);
		readStream.destroy();
		parser.destroy();
	}
}

export function validateCsvColumns(headers: string[], fileName: string, columns: string[]) {
	for (const column of columns) {
		if (!headers.includes(column)) {
			throw new Error(formatMissingCsvColumnError(fileName, column, headers));
		}
	}
}

export function matchesFilters(record: Record<string, unknown>, filters: CsvFilter[]) {
	return filters.every((filter) => {
		const value = normaliseCsvValue(record[filter.column]);
		if (filter.op === 'eq') return value === filter.value;
		if (filter.op === 'contains') return value.includes(filter.value);
		return filter.value.includes(value);
	});
}

export function normaliseCsvValue(value: unknown) {
	if (value === null || value === undefined) return '';
	return String(value);
}

export function toCsvRecordValues(record: Record<string, unknown>, columns: string[]) {
	return Object.fromEntries(columns.map((column) => [column, normaliseCsvValue(record[column])]));
}

function formatMissingCsvColumnError(fileName: string, requestedColumn: string, headers: string[]) {
	const suggestions = getClosestColumnMatches(requestedColumn, headers);
	const didYouMean =
		suggestions.length > 0
			? ` Did you mean ${suggestions.map((value) => `"${value}"`).join(', ')}?`
			: '';
	return `CSV column "${requestedColumn}" not found in "${fileName}". Available columns: ${headers.join(', ')}.${didYouMean} Run csv_profile if you are uncertain about the schema.`;
}

function getClosestColumnMatches(requestedColumn: string, headers: string[]) {
	const requested = requestedColumn.toLowerCase();
	return headers
		.map((header) => ({ header, distance: distance(requested, header.toLowerCase()) }))
		.filter(({ header, distance: editDistance }) => {
			return header.toLowerCase().includes(requested) || editDistance <= 3;
		})
		.sort(
			(left, right) => left.distance - right.distance || left.header.localeCompare(right.header),
		)
		.slice(0, 3)
		.map(({ header }) => header);
}

export type CsvDistinctTracker = ReturnType<typeof createCsvDistinctTracker>;

export function createCsvDistinctTracker(columns: string[], limit: number) {
	const values = new Map(columns.map((column) => [column, new Set<string>()]));
	return {
		add(record: Record<string, unknown>) {
			for (const [column, distinctValues] of values) {
				if (distinctValues.size < limit) distinctValues.add(normaliseCsvValue(record[column]));
			}
		},
		toOutput() {
			return Object.fromEntries(
				Array.from(values.entries()).flatMap(([column, distinctValues]) =>
					distinctValues.size > 0 ? [[column, Array.from(distinctValues)]] : [],
				),
			);
		},
		columns: Array.from(values.keys()),
	};
}

export function buildCsvAmbiguity(
	matchedRows: number,
	limit: number,
	tracker: CsvDistinctTracker | undefined,
) {
	return {
		matchedRows,
		message:
			matchedRows > limit
				? `Matched ${matchedRows} rows and returned only the first ${limit}. This is not a unique result. Refine filters before answering.`
				: `Matched ${matchedRows} rows. This is not a unique result. Refine filters before answering.`,
		suggestedColumns: tracker?.columns ?? [],
		sampleDistinctValues: tracker?.toOutput(),
	};
}

export function getSuggestedDisambiguatingColumns(
	headers: string[],
	filters: CsvFilter[],
	selectedColumns: string[],
) {
	const alreadyUsed = new Set([...filters.map((filter) => filter.column), ...selectedColumns]);
	return headers
		.filter((header) => !alreadyUsed.has(header))
		.sort((left, right) => preferenceScore(left) - preferenceScore(right))
		.slice(0, 5);
}

/**
 * Column-name heuristics used to rank likely disambiguating columns. Shared by
 * getSuggestedDisambiguatingColumns and getLikelyDisambiguatingColumns.
 */
const PREFERRED_DISAMBIGUATING_COLUMNS = [
	'Year',
	'Date',
	'Month',
	'Country',
	'Country Name',
	'Source',
	'Category',
	'Name',
];

function preferenceScore(column: string) {
	const exactIndex = PREFERRED_DISAMBIGUATING_COLUMNS.findIndex(
		(candidate) => candidate.toLowerCase() === column.toLowerCase(),
	);
	if (exactIndex !== -1) return exactIndex;
	const partialIndex = PREFERRED_DISAMBIGUATING_COLUMNS.findIndex((candidate) =>
		column.toLowerCase().includes(candidate.toLowerCase()),
	);
	return partialIndex === -1 ? PREFERRED_DISAMBIGUATING_COLUMNS.length + 1 : partialIndex + 0.5;
}

type CsvColumnType = 'empty' | 'integer' | 'number' | 'boolean' | 'date' | 'string';

// Bounded streaming accumulator for csv_profile; avoids loading full CSV columns into memory.
export function createCsvColumnProfileState(distinctLimit: number) {
	const distinctValues = new Set<string>();
	const sampleValues: string[] = [];
	let distinctCountTruncated = false;
	let emptyCount = 0;
	let nonEmptyCount = 0;
	let allInteger = true;
	let allNumber = true;
	let allBoolean = true;
	let allDate = true;
	return {
		add(value: string) {
			if (value === '') {
				emptyCount++;
				return;
			}
			nonEmptyCount++;
			if (distinctValues.size < distinctLimit) {
				distinctValues.add(value);
			} else if (!distinctValues.has(value)) {
				distinctCountTruncated = true;
			}
			if (!sampleValues.includes(value) && sampleValues.length < CSV_SAMPLE_VALUE_LIMIT) {
				sampleValues.push(value);
			}
			allInteger &&= /^-?\d+$/.test(value);
			allNumber &&= Number.isFinite(Number(value));
			allBoolean &&= /^(true|false|yes|no|0|1)$/i.test(value);
			allDate &&= isLikelyDate(value);
		},
		toOutput(name: string) {
			return {
				name,
				inferredType: inferCsvColumnType({
					nonEmptyCount,
					allInteger,
					allNumber,
					allBoolean,
					allDate,
				}),
				emptyCount,
				distinctCount: distinctValues.size,
				distinctCountTruncated,
				sampleValues,
			};
		},
	};
}

export type CsvColumnProfileState = ReturnType<typeof createCsvColumnProfileState>;

function inferCsvColumnType({
	nonEmptyCount,
	allInteger,
	allNumber,
	allBoolean,
	allDate,
}: {
	nonEmptyCount: number;
	allInteger: boolean;
	allNumber: boolean;
	allBoolean: boolean;
	allDate: boolean;
}): CsvColumnType {
	if (nonEmptyCount === 0) return 'empty';
	if (allBoolean) return 'boolean';
	if (allInteger) return 'integer';
	if (allNumber) return 'number';
	if (allDate) return 'date';
	return 'string';
}

function isLikelyDate(value: string) {
	if (!/^\d{4}[-/]\d{1,2}([-/]\d{1,2})?$/.test(value)) return false;
	return Number.isFinite(Date.parse(value));
}

export function getLikelyDisambiguatingColumns(
	columnProfiles: Array<{
		name: string;
		distinctCount?: number;
		distinctCountTruncated?: boolean;
	}>,
	rowCount: number,
) {
	return columnProfiles
		.filter((column) => {
			const distinctCount = column.distinctCount ?? 0;
			return distinctCount > 1 && distinctCount < rowCount && !column.distinctCountTruncated;
		})
		.sort((left, right) => preferenceScore(left.name) - preferenceScore(right.name))
		.slice(0, 5)
		.map((column) => column.name);
}

export function createCsvAggregateGroup(groupValues: Record<string, string>, metrics: string[]) {
	return {
		groupValues,
		count: 0,
		metrics: Object.fromEntries(metrics.map((metric) => [metric, createNumericAggregateState()])),
	};
}

export type CsvAggregateGroup = ReturnType<typeof createCsvAggregateGroup>;

function createNumericAggregateState() {
	return {
		count: 0,
		sum: 0,
		min: undefined as number | undefined,
		max: undefined as number | undefined,
		skipped: 0,
		add(value: string) {
			const trimmedValue = value.trim();
			const numericValue = Number(trimmedValue);
			if (trimmedValue === '' || !Number.isFinite(numericValue)) {
				this.skipped++;
				return;
			}
			this.count++;
			this.sum += numericValue;
			this.min = this.min === undefined ? numericValue : Math.min(this.min, numericValue);
			this.max = this.max === undefined ? numericValue : Math.max(this.max, numericValue);
		},
	};
}

export function formatCsvAggregateGroup(
	group: CsvAggregateGroup,
	functions: Array<'count' | 'min' | 'max' | 'sum' | 'avg'>,
	metrics: string[],
) {
	const output: Record<string, string | number | null> = { ...group.groupValues };
	for (const fn of functions) {
		if (fn === 'count') output.count = group.count;
	}
	for (const metric of metrics) {
		const state = group.metrics[metric];
		for (const fn of functions) {
			if (fn === 'min') output[`min_${metric}`] = state.min ?? null;
			if (fn === 'max') output[`max_${metric}`] = state.max ?? null;
			if (fn === 'sum') output[`sum_${metric}`] = state.count > 0 ? state.sum : null;
			if (fn === 'avg') output[`avg_${metric}`] = state.count > 0 ? state.sum / state.count : null;
		}
	}
	return output;
}

export function sortCsvAggregateResults(
	results: Array<Record<string, string | number | null>>,
	orderBy: CsvAggregateInput['orderBy'],
) {
	if (!orderBy) return;
	const direction = orderBy.direction === 'desc' ? -1 : 1;
	results.sort(
		(left, right) =>
			compareCsvAggregateValues(left[orderBy.column], right[orderBy.column]) * direction,
	);
}

function compareCsvAggregateValues(
	left: string | number | null | undefined,
	right: string | number | null | undefined,
) {
	if (left === right) return 0;
	if (left === null || left === undefined) return 1;
	if (right === null || right === undefined) return -1;
	if (typeof left === 'number' && typeof right === 'number') return left - right;
	return String(left).localeCompare(String(right));
}
