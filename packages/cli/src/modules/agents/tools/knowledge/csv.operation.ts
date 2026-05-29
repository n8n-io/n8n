import type {
	CsvAggregateInput,
	CsvDistinctInput,
	CsvProfileInput,
	CsvQueryInput,
} from './schemas';
import type { WorkspaceFiles } from './file-references';
import {
	CSV_DISTINCT_TRACK_LIMIT,
	CSV_MAX_AGGREGATE_GROUPS,
	CSV_PROFILE_DISTINCT_LIMIT,
	CSV_SAMPLE_VALUE_LIMIT,
	buildCsvAmbiguity,
	createCsvAggregateGroup,
	createCsvColumnProfileState,
	createCsvDistinctTracker,
	formatCsvAggregateGroup,
	getLikelyDisambiguatingColumns,
	getSuggestedDisambiguatingColumns,
	matchesFilters,
	normaliseCsvValue,
	resolveCsvFile,
	sortCsvAggregateResults,
	streamCsvRecords,
	toCsvRecordValues,
	validateCsvColumns,
	type CsvAggregateGroup,
	type CsvColumnProfileState,
	type CsvDistinctTracker,
} from './csv-helpers';

export async function queryCsv(workspaceRoot: string, files: WorkspaceFiles, input: CsvQueryInput) {
	const file = resolveCsvFile(files, input.file);
	const headers: string[] = [];
	const limit = input.limit ?? 20;
	const select = input.select;
	const rows: string[][] = [];
	const rowNumbers: number[] = [];
	const records: Array<{
		rowNumber: number;
		fileLineNumber: number;
		values: Record<string, string>;
	}> = [];
	let ambiguityTracker: CsvDistinctTracker | undefined;
	let matched = 0;
	if (input.rowNumber === undefined && select === undefined) {
		throw new Error('csv_query requires select unless rowNumber is provided.');
	}

	await streamCsvRecords(workspaceRoot, file, {
		onHeaders: (parsedHeaders) => {
			headers.push(...parsedHeaders);
			validateCsvColumns(headers, file.fileName, [
				...(select ?? []),
				...(input.where ?? []).map((filter) => filter.column),
			]);
			ambiguityTracker = createCsvDistinctTracker(
				getSuggestedDisambiguatingColumns(headers, input.where ?? [], select ?? []),
				CSV_SAMPLE_VALUE_LIMIT,
			);
		},
		onRecord: ({ record, fileLineNumber }) => {
			if (input.rowNumber !== undefined && fileLineNumber !== input.rowNumber) return;
			if (input.rowNumber === undefined && !matchesFilters(record, input.where ?? [])) return;

			matched++;
			ambiguityTracker?.add(record);
			const columns = select ?? headers;
			if (rows.length < limit) {
				const values = toCsvRecordValues(record, columns);
				rows.push(columns.map((column) => values[column]));
				rowNumbers.push(fileLineNumber);
				records.push({ rowNumber: fileLineNumber, fileLineNumber, values });
			}
		},
	});
	if (headers.length === 0) validateCsvColumns(headers, file.fileName, select ?? []);

	const columns = select ?? headers;
	const truncated = matched > rows.length;

	return {
		fileName: file.fileName,
		relativePath: file.relativePath,
		columns,
		rowNumbers,
		rows,
		records,
		rowCount: matched,
		truncated,
		rowNumberBase: 'rowNumber is the CSV file line number; line 1 is the header row.',
		ambiguity:
			input.rowNumber === undefined && (matched > 1 || truncated)
				? buildCsvAmbiguity(matched, input.limit ?? 20, ambiguityTracker)
				: undefined,
	};
}

export async function profileCsv(
	workspaceRoot: string,
	files: WorkspaceFiles,
	input: CsvProfileInput,
) {
	const file = resolveCsvFile(files, input.file);
	const headers: string[] = [];
	const sampleRows: Array<Record<string, string>> = [];
	const rowCountByColumn = new Map<string, CsvColumnProfileState>();
	let rowCount = 0;
	const distinctLimit = input.distinctLimit ?? CSV_PROFILE_DISTINCT_LIMIT;

	await streamCsvRecords(workspaceRoot, file, {
		onHeaders: (parsedHeaders) => {
			headers.push(...parsedHeaders);
			for (const header of headers) {
				rowCountByColumn.set(header, createCsvColumnProfileState(distinctLimit));
			}
		},
		onRecord: ({ record }) => {
			rowCount++;
			if (sampleRows.length < (input.sampleSize ?? 5)) {
				sampleRows.push(toCsvRecordValues(record, headers));
			}
			for (const header of headers) {
				rowCountByColumn.get(header)?.add(normaliseCsvValue(record[header]));
			}
		},
	});

	const columnProfiles = headers.map((header) => {
		const profile = rowCountByColumn.get(header) ?? createCsvColumnProfileState(distinctLimit);
		return profile.toOutput(header);
	});

	return {
		fileName: file.fileName,
		relativePath: file.relativePath,
		columns: headers,
		rowCount,
		sampleRows,
		columnProfiles,
		likelyKeyColumns: columnProfiles
			.filter((column) => column.distinctCount === rowCount && rowCount > 0)
			.map((column) => column.name),
		likelyDisambiguatingColumns: getLikelyDisambiguatingColumns(columnProfiles, rowCount),
	};
}

export async function distinctCsv(
	workspaceRoot: string,
	files: WorkspaceFiles,
	input: CsvDistinctInput,
) {
	const file = resolveCsvFile(files, input.file);
	const values = new Set<string>();
	let distinctTruncated = false;
	const outputValues: string[] = [];

	await streamCsvRecords(workspaceRoot, file, {
		onHeaders: (headers) => {
			validateCsvColumns(headers, file.fileName, [
				input.column,
				...(input.where ?? []).map((filter) => filter.column),
			]);
		},
		onRecord: ({ record }) => {
			if (!matchesFilters(record, input.where ?? [])) return;
			const value = normaliseCsvValue(record[input.column]);
			if (!values.has(value)) {
				if (values.size < CSV_DISTINCT_TRACK_LIMIT) {
					values.add(value);
				} else {
					distinctTruncated = true;
				}
				if (outputValues.length < (input.limit ?? 50)) outputValues.push(value);
			}
		},
	});

	return {
		fileName: file.fileName,
		relativePath: file.relativePath,
		column: input.column,
		values: outputValues,
		distinctCount: values.size,
		truncated: distinctTruncated || values.size > outputValues.length,
	};
}

export async function aggregateCsv(
	workspaceRoot: string,
	files: WorkspaceFiles,
	input: CsvAggregateInput,
) {
	const file = resolveCsvFile(files, input.file);
	const functions = input.functions ?? ['count'];
	const metrics = Array.from(
		new Set([...(input.metric ? [input.metric] : []), ...(input.metrics ?? [])]),
	);
	const needsMetric = functions.some((fn) => fn !== 'count');
	if (needsMetric && metrics.length === 0) {
		throw new Error('csv_aggregate requires metric or metrics for min, max, sum, or avg.');
	}
	const groups = new Map<string, CsvAggregateGroup>();
	let rowCount = 0;
	let groupLimitReached = false;

	await streamCsvRecords(workspaceRoot, file, {
		onHeaders: (headers) => {
			validateCsvColumns(headers, file.fileName, [
				...metrics,
				...(input.groupBy ?? []),
				...(input.where ?? []).map((filter) => filter.column),
			]);
		},
		onRecord: ({ record }) => {
			if (!matchesFilters(record, input.where ?? [])) return;
			rowCount++;
			const groupValues = toCsvRecordValues(record, input.groupBy ?? []);
			const key = JSON.stringify(groupValues);
			let group = groups.get(key);
			if (!group) {
				// Bound memory: stop opening new groups past the cap, but keep
				// aggregating rows for groups we already track.
				if (groups.size >= CSV_MAX_AGGREGATE_GROUPS) {
					groupLimitReached = true;
					return;
				}
				group = createCsvAggregateGroup(groupValues, metrics);
				groups.set(key, group);
			}
			group.count++;
			for (const metric of metrics) {
				group.metrics[metric].add(normaliseCsvValue(record[metric]));
			}
		},
	});
	if (groups.size === 0 && input.groupBy === undefined) {
		groups.set(JSON.stringify({}), createCsvAggregateGroup({}, metrics));
	}

	const results = Array.from(groups.values()).map((group) =>
		formatCsvAggregateGroup(group, functions, metrics),
	);
	sortCsvAggregateResults(results, input.orderBy);
	const limit = input.limit ?? 50;
	const skippedNonNumeric: Record<string, number> = {};
	for (const group of groups.values()) {
		for (const metric of metrics) {
			skippedNonNumeric[metric] = (skippedNonNumeric[metric] ?? 0) + group.metrics[metric].skipped;
		}
	}

	return {
		fileName: file.fileName,
		relativePath: file.relativePath,
		rowCount,
		functions,
		metrics,
		groupBy: input.groupBy,
		results: results.slice(0, limit),
		truncated: results.length > limit || groupLimitReached,
		skippedNonNumeric,
	};
}
