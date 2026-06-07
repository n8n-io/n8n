import { Service } from '@n8n/di';
import { parse } from 'csv-parse';
import type { Readable } from 'node:stream';

import type { KnowledgeWorkspaceFile } from './agent-knowledge.service';
import { AgentKnowledgeService } from './agent-knowledge.service';
import {
	buildCsvAmbiguity,
	createCsvAggregateGroup,
	createCsvColumnProfileState,
	createCsvDistinctTracker,
	CSV_DISTINCT_TRACK_LIMIT,
	CSV_MAX_AGGREGATE_GROUPS,
	CSV_PROFILE_DISTINCT_LIMIT,
	CSV_SAMPLE_VALUE_LIMIT,
	formatCsvAggregateGroup,
	getLikelyDisambiguatingColumns,
	getSuggestedDisambiguatingColumns,
	matchesFilters,
	normaliseCsvValue,
	sortCsvAggregateResults,
	toCsvRecordValues,
	validateCsvColumns,
} from './tools/knowledge/csv-helpers';
import type {
	CsvAggregateInput,
	CsvAggregateResult,
	CsvDistinctInput,
	CsvDistinctResult,
	CsvProfileInput,
	CsvProfileResult,
	CsvQueryInput,
	CsvQueryResult,
} from './tools/knowledge/schemas';

interface CsvFileContent {
	file: KnowledgeWorkspaceFile;
	contentStream: Readable;
}

interface CsvRecordEvent {
	record: Record<string, unknown>;
	fileLineNumber: number;
}

interface CsvParseEntry {
	record: Record<string, unknown>;
	info: {
		lines: number;
	};
}

@Service()
export class AgentKnowledgeCsvService {
	constructor(private readonly knowledgeService: AgentKnowledgeService) {}

	async queryCsv(
		agentId: string,
		projectId: string,
		input: CsvQueryInput,
	): Promise<CsvQueryResult> {
		return await this.withCsvFile(agentId, projectId, input.file, async (csvFile) => {
			const headers: string[] = [];
			const limit = input.limit ?? 20;
			const select = input.select;
			const rows: string[][] = [];
			const rowNumbers: number[] = [];
			const records: CsvQueryResult['records'] = [];
			let ambiguityTracker: ReturnType<typeof createCsvDistinctTracker> | undefined;
			let matched = 0;

			if (input.rowNumber === undefined && select === undefined) {
				throw new Error('csv_query requires select unless rowNumber is provided.');
			}

			await streamCsvRecords(csvFile.contentStream, {
				onHeaders: (parsedHeaders) => {
					headers.push(...parsedHeaders);
					validateCsvColumns(headers, csvFile.file.fileName, [
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
			if (headers.length === 0) validateCsvColumns(headers, csvFile.file.fileName, select ?? []);

			const columns = select ?? headers;
			const truncated = matched > rows.length;
			return {
				fileName: csvFile.file.fileName,
				relativePath: csvFile.file.relativePath,
				columns,
				rowNumbers,
				rows,
				records,
				rowCount: matched,
				truncated,
				rowNumberBase: 'rowNumber is the CSV file line number; line 1 is the header row.',
				ambiguity:
					input.rowNumber === undefined && (matched > 1 || truncated)
						? buildCsvAmbiguity(matched, limit, ambiguityTracker)
						: undefined,
			};
		});
	}

	async profileCsv(
		agentId: string,
		projectId: string,
		input: CsvProfileInput,
	): Promise<CsvProfileResult> {
		return await this.withCsvFile(agentId, projectId, input.file, async (csvFile) => {
			const headers: string[] = [];
			const sampleRows: Array<Record<string, string>> = [];
			const rowCountByColumn = new Map<string, ReturnType<typeof createCsvColumnProfileState>>();
			let rowCount = 0;
			const distinctLimit = input.distinctLimit ?? CSV_PROFILE_DISTINCT_LIMIT;

			await streamCsvRecords(csvFile.contentStream, {
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
				fileName: csvFile.file.fileName,
				relativePath: csvFile.file.relativePath,
				columns: headers,
				rowCount,
				sampleRows,
				columnProfiles,
				likelyKeyColumns: columnProfiles
					.filter((column) => column.distinctCount === rowCount && rowCount > 0)
					.map((column) => column.name),
				likelyDisambiguatingColumns: getLikelyDisambiguatingColumns(columnProfiles, rowCount),
			};
		});
	}

	async distinctCsv(
		agentId: string,
		projectId: string,
		input: CsvDistinctInput,
	): Promise<CsvDistinctResult> {
		return await this.withCsvFile(agentId, projectId, input.file, async (csvFile) => {
			const values = new Set<string>();
			let distinctTruncated = false;
			const outputValues: string[] = [];

			await streamCsvRecords(csvFile.contentStream, {
				onHeaders: (parsedHeaders) => {
					validateCsvColumns(parsedHeaders, csvFile.file.fileName, [
						input.column,
						...(input.where ?? []).map((filter) => filter.column),
					]);
				},
				onRecord: ({ record }) => {
					if (!matchesFilters(record, input.where ?? [])) return;
					const value = normaliseCsvValue(record[input.column]);
					if (values.has(value)) return;

					if (values.size < CSV_DISTINCT_TRACK_LIMIT) {
						values.add(value);
					} else {
						distinctTruncated = true;
					}
					if (outputValues.length < (input.limit ?? 50)) outputValues.push(value);
				},
			});

			return {
				fileName: csvFile.file.fileName,
				relativePath: csvFile.file.relativePath,
				column: input.column,
				values: outputValues,
				distinctCount: values.size,
				truncated: distinctTruncated || values.size > outputValues.length,
			};
		});
	}

	async aggregateCsv(
		agentId: string,
		projectId: string,
		input: CsvAggregateInput,
	): Promise<CsvAggregateResult> {
		return await this.withCsvFile(agentId, projectId, input.file, async (csvFile) => {
			const functions = input.functions ?? ['count'];
			const metrics = Array.from(
				new Set([...(input.metric ? [input.metric] : []), ...(input.metrics ?? [])]),
			);
			const needsMetric = functions.some((fn) => fn !== 'count');
			if (needsMetric && metrics.length === 0) {
				throw new Error('csv_aggregate requires metric or metrics for min, max, sum, or avg.');
			}

			const groups = new Map<string, ReturnType<typeof createCsvAggregateGroup>>();
			let rowCount = 0;
			let groupLimitReached = false;

			await streamCsvRecords(csvFile.contentStream, {
				onHeaders: (parsedHeaders) => {
					validateCsvColumns(parsedHeaders, csvFile.file.fileName, [
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
			const skippedNonNumeric = Object.fromEntries(metrics.map((metric) => [metric, 0]));
			for (const group of groups.values()) {
				for (const metric of metrics) {
					skippedNonNumeric[metric] += group.metrics[metric].skipped;
				}
			}

			const limit = input.limit ?? 50;
			return {
				fileName: csvFile.file.fileName,
				relativePath: csvFile.file.relativePath,
				rowCount,
				functions,
				metrics,
				groupBy: input.groupBy,
				results: results.slice(0, limit),
				truncated: results.length > limit || groupLimitReached,
				skippedNonNumeric,
			};
		});
	}

	private async withCsvFile<T>(
		agentId: string,
		projectId: string,
		fileReference: string,
		operation: (csvFile: CsvFileContent) => Promise<T>,
	): Promise<T> {
		const csvFile = await this.knowledgeService.openWorkspaceFileStream(
			agentId,
			projectId,
			fileReference,
		);
		if (!isCsvFile(csvFile.file)) {
			throw new Error(`File "${csvFile.file.fileName}" is not queryable as CSV.`);
		}
		return await operation(csvFile);
	}
}

async function streamCsvRecords(
	contentStream: Readable,
	handlers: {
		onHeaders?: (headers: string[]) => void;
		onRecord: (event: CsvRecordEvent) => void;
	},
): Promise<void> {
	const parser = contentStream.pipe(
		parse({
			bom: true,
			columns: (parsedHeaders: string[]) => {
				const headers = parsedHeaders.map(normaliseCsvValue);
				handlers.onHeaders?.(headers);
				return headers;
			},
			info: true,
			relax_column_count: true,
			skip_empty_lines: true,
		}),
	);

	for await (const entry of parser as AsyncIterable<CsvParseEntry>) {
		handlers.onRecord({
			record: entry.record,
			fileLineNumber: entry.info.lines,
		});
	}
}

function isCsvFile(file: KnowledgeWorkspaceFile): boolean {
	return file.mimeType === 'text/csv' || file.relativePath.toLowerCase().endsWith('.csv');
}
