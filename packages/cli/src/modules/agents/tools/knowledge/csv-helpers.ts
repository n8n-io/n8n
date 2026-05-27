import { createReadStream } from 'node:fs';
import path from 'node:path';

import { resolveFileReference, type WorkspaceFiles } from './file-references';
import type { CsvAggregateInput, CsvFilter } from './schemas';

export const CSV_SAMPLE_VALUE_LIMIT = 5;
export const CSV_PROFILE_DISTINCT_LIMIT = 100;
export const CSV_DISTINCT_TRACK_LIMIT = 10_000;

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
	try {
		for await (const { record, info } of parser as AsyncIterable<{
			record: Record<string, unknown>;
			info: { lines: number };
		}>) {
			handlers.onRecord({ record, fileLineNumber: info.lines });
		}
	} finally {
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
		.map((header) => ({ header, distance: levenshteinDistance(requested, header.toLowerCase()) }))
		.filter(({ header, distance }) => header.toLowerCase().includes(requested) || distance <= 3)
		.sort(
			(left, right) => left.distance - right.distance || left.header.localeCompare(right.header),
		)
		.slice(0, 3)
		.map(({ header }) => header);
}

function levenshteinDistance(left: string, right: string) {
	const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
	for (let leftIndex = 0; leftIndex < left.length; leftIndex++) {
		const current = [leftIndex + 1];
		for (let rightIndex = 0; rightIndex < right.length; rightIndex++) {
			current[rightIndex + 1] =
				left[leftIndex] === right[rightIndex]
					? previous[rightIndex]
					: Math.min(previous[rightIndex], previous[rightIndex + 1], current[rightIndex]) + 1;
		}
		previous.splice(0, previous.length, ...current);
	}
	return previous[right.length];
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
	const preferred = [
		'Year',
		'Date',
		'Month',
		'Country',
		'Country Name',
		'Source',
		'Category',
		'Name',
	];
	return headers
		.filter((header) => !alreadyUsed.has(header))
		.sort((left, right) => preferenceScore(left, preferred) - preferenceScore(right, preferred))
		.slice(0, 5);
}

function preferenceScore(column: string, preferred: string[]) {
	const exactIndex = preferred.findIndex(
		(candidate) => candidate.toLowerCase() === column.toLowerCase(),
	);
	if (exactIndex !== -1) return exactIndex;
	const partialIndex = preferred.findIndex((candidate) =>
		column.toLowerCase().includes(candidate.toLowerCase()),
	);
	return partialIndex === -1 ? preferred.length + 1 : partialIndex + 0.5;
}

type CsvColumnType = 'empty' | 'integer' | 'number' | 'boolean' | 'date' | 'string';

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
	const preferred = [
		'Year',
		'Date',
		'Month',
		'Country',
		'Country Name',
		'Source',
		'Category',
		'Name',
	];
	return columnProfiles
		.filter((column) => {
			const distinctCount = column.distinctCount ?? 0;
			return distinctCount > 1 && distinctCount < rowCount && !column.distinctCountTruncated;
		})
		.sort(
			(left, right) =>
				preferenceScore(left.name, preferred) - preferenceScore(right.name, preferred),
		)
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
			const numericValue = Number(value);
			if (value === '' || !Number.isFinite(numericValue)) {
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
