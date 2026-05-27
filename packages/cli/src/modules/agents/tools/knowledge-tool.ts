import { Tool } from '@n8n/agents/tool';
import { createReadStream } from 'node:fs';
import path from 'node:path';

import type { AgentKnowledgeCommandService } from '../agent-knowledge-command.service';
import type { AgentKnowledgeService } from '../agent-knowledge.service';
import {
	getSearchKnowledgeOperation,
	parseSearchKnowledgeInput,
	searchKnowledgeInputSchema,
	searchKnowledgeOutputSchema,
	type CsvAggregateInput,
	type CsvDistinctInput,
	type CsvFilter,
	type CsvProfileInput,
	type CsvQueryInput,
	type InternalKnowledgeCommandRequest,
	type InternalKnowledgeCommandResult,
	type ParsedSearchKnowledgeInput,
	type SearchMatchMode,
	type SearchMatchOutput,
	type SearchOutputMode,
	type SearchResultOutput,
	type SearchKnowledgeOutput,
} from './knowledge-tool.domain';

type WorkspaceFiles = Awaited<ReturnType<AgentKnowledgeService['materializeWorkspace']>>;
type SearchInput = Extract<ParsedSearchKnowledgeInput, { operation: 'search' }>;

const DEFAULT_READ_RANGE_CONTEXT = 6;
const MAX_SEARCH_MATCH_TEXT_LENGTH = 500;
const MULTI_QUERY_WINDOW_LINES = 3;
const CSV_SAMPLE_VALUE_LIMIT = 5;
const CSV_PROFILE_DISTINCT_LIMIT = 100;
const CSV_DISTINCT_TRACK_LIMIT = 10_000;

export function createSearchKnowledgeTool({
	agentId,
	projectId,
	knowledgeService,
	commandService,
}: {
	agentId: string;
	projectId: string;
	knowledgeService: AgentKnowledgeService;
	commandService: AgentKnowledgeCommandService;
}) {
	return new Tool('search_knowledge')
		.description(
			'List, read, search, and query files uploaded to this agent knowledge base. ' +
				'Use this when the user asks about uploaded documents or facts likely contained in them.',
		)
		.systemInstruction(
			'Use search_knowledge to inspect uploaded knowledge files. Do not claim a file says something ' +
				'unless you found it via list, search, read, or a CSV operation. Search defaults to output_mode=files_with_matches. ' +
				'Use output_mode=count for counts and output_mode=content only after narrowing to a file or exact phrase. ' +
				'For conceptual multi-term lookup, use queries with match_mode instead of writing regex by hand. ' +
				'Use read for grounded citations. Cite only file names and line ranges from read results. ' +
				'Never mention uploaded file ids, relative paths, binary ids, or storage ids to users. ' +
				'For unfamiliar CSVs, call csv_profile first. Use csv_query for rows, csv_distinct for possible values, and csv_aggregate for counts or numeric calculations. ' +
				'Do not answer from the first CSV row when rowCount is high or truncated; refine filters using ambiguity hints.',
		)
		.input(searchKnowledgeInputSchema)
		.output(searchKnowledgeOutputSchema)
		.handler(async (input: unknown): Promise<SearchKnowledgeOutput> => {
			let parsedInput: ParsedSearchKnowledgeInput;
			try {
				parsedInput = parseSearchKnowledgeInput(input);
			} catch (error) {
				return {
					operation: getSearchKnowledgeOperation(input),
					files: [],
					error: error instanceof Error ? error.message : String(error),
				};
			}

			if (parsedInput.operation === 'list') {
				return {
					operation: 'list',
					files: await knowledgeService.listWorkspaceFiles(agentId, projectId),
				};
			}

			return await commandService.withWorkspace(async (workspaceRoot) => {
				const files = await knowledgeService.materializeWorkspace(
					agentId,
					projectId,
					workspaceRoot,
					{ fileReferences: getRequiredFileReferences(parsedInput) },
				);

				try {
					return await handleKnowledgeOperation(parsedInput, workspaceRoot, files, commandService);
				} catch (error) {
					return {
						operation: parsedInput.operation,
						files,
						error: error instanceof Error ? error.message : String(error),
					};
				}
			});
		})
		.build();
}

async function handleKnowledgeOperation(
	input: ParsedSearchKnowledgeInput,
	workspaceRoot: string,
	files: WorkspaceFiles,
	commandService: AgentKnowledgeCommandService,
): Promise<SearchKnowledgeOutput> {
	switch (input.operation) {
		case 'list':
			return {
				operation: 'list',
				files,
			};
		case 'search':
			return await runSearchOperation(input, workspaceRoot, files, commandService);
		case 'read': {
			const resolvedFile = resolveFileReference(files, input.file);
			if (resolvedFile.status !== 'found') {
				return {
					operation: 'read',
					files,
					error: resolvedFile.error,
				};
			}
			const file = resolvedFile.file;
			// Exact-read dedupe needs per-run tool state; avoid a global cache that could leak across agent executions.
			if (file && !file.searchable) {
				return {
					operation: 'read',
					files,
					error: `File "${file.fileName}" is not readable as plain text in this version.`,
				};
			}
			const request: InternalKnowledgeCommandRequest = input.lineRange
				? {
						command: 'sed',
						file: file.relativePath,
						startLine: input.lineRange.start,
						endLine: input.lineRange.end,
					}
				: { command: 'cat', file: file.relativePath };
			const result = await runInternalCommand(commandService, workspaceRoot, request);
			return {
				operation: 'read',
				files,
				result: {
					...result,
					citation: {
						fileName: file.fileName,
						lineRange: input.lineRange,
						instruction:
							'Cite this source using only fileName and lineRange. Do not cite file ids, relative paths, binary ids, or storage ids.',
					},
				},
			};
		}
		case 'csv_query':
			return {
				operation: 'csv_query',
				files,
				csv: await queryCsv(workspaceRoot, files, input),
			};
		case 'csv_profile':
			return {
				operation: 'csv_profile',
				files,
				csvProfile: await profileCsv(workspaceRoot, files, input),
			};
		case 'csv_distinct':
			return {
				operation: 'csv_distinct',
				files,
				csvDistinct: await distinctCsv(workspaceRoot, files, input),
			};
		case 'csv_aggregate':
			return {
				operation: 'csv_aggregate',
				files,
				csvAggregate: await aggregateCsv(workspaceRoot, files, input),
			};
	}
}

async function runInternalCommand(
	commandService: AgentKnowledgeCommandService,
	workspaceRoot: string,
	request: InternalKnowledgeCommandRequest,
): Promise<InternalKnowledgeCommandResult> {
	const result = await commandService.run(workspaceRoot, request);
	return { ...result, command: request.command };
}

async function runSearchOperation(
	input: SearchInput,
	workspaceRoot: string,
	files: WorkspaceFiles,
	commandService: AgentKnowledgeCommandService,
): Promise<SearchKnowledgeOutput> {
	if (input.query === undefined && input.queries === undefined) {
		return {
			operation: 'search',
			files,
			error: 'Either query or queries must be provided for search.',
		};
	}
	const requestedFiles = mapFileReferences(files, input.files);
	const primaryPattern = getPrimarySearchPattern(input);
	const commandPattern = getSearchCommandPattern(input);
	const commandFixedStrings = getSearchCommandFixedStrings(input);
	let contentResult: InternalKnowledgeCommandResult | undefined;
	const countResult = await runInternalCommand(commandService, workspaceRoot, {
		command: 'git_grep',
		pattern: commandPattern,
		outputMode: 'count',
		caseInsensitive: input.caseInsensitive,
		fixedStrings: commandFixedStrings,
		files: requestedFiles,
	});
	let counts = parseCountOutput(countResult.stdout, files);
	let multiQueryMatches: SearchMatchOutput[] | undefined;
	if (input.queries) {
		contentResult = await runInternalCommand(commandService, workspaceRoot, {
			command: 'git_grep',
			pattern: commandPattern,
			caseInsensitive: input.caseInsensitive,
			fixedStrings: commandFixedStrings,
			context: input.context,
			files: requestedFiles,
		});
		multiQueryMatches = filterMultiQueryMatches(
			parseSearchMatches(contentResult.stdout, files),
			input.queries,
			input.match_mode,
			input.caseInsensitive,
		);
		counts = buildCountsFromMatches(multiQueryMatches, files);
	}

	if (input.output_mode === 'files_with_matches') {
		const slicedCounts = sliceResults(counts, input.offset, input.head_limit);
		return {
			operation: 'search',
			files,
			result: toDisplayResult(
				countResult,
				formatSearchFiles(counts, input.offset, input.head_limit),
				slicedCounts.truncated,
			),
			search: buildSearchResult({
				mode: input.output_mode,
				query: primaryPattern,
				queries: input.queries,
				matchMode: input.queries ? input.match_mode : undefined,
				counts,
				matches: [],
				offset: input.offset,
				headLimit: input.head_limit,
				hint: buildSearchHint('files_with_matches', slicedCounts, input.head_limit),
			}),
		};
	}

	if (input.output_mode === 'count') {
		const slicedCounts = sliceResults(counts, input.offset, input.head_limit);
		return {
			operation: 'search',
			files,
			result: toDisplayResult(
				countResult,
				formatSearchCounts(counts, input.offset, input.head_limit),
				slicedCounts.truncated,
			),
			search: buildSearchResult({
				mode: input.output_mode,
				query: primaryPattern,
				queries: input.queries,
				matchMode: input.queries ? input.match_mode : undefined,
				counts,
				matches: [],
				offset: input.offset,
				headLimit: input.head_limit,
				hint: buildSearchHint('count', slicedCounts, input.head_limit),
			}),
		};
	}

	contentResult ??= await runInternalCommand(commandService, workspaceRoot, {
		command: 'git_grep',
		pattern: commandPattern,
		caseInsensitive: input.caseInsensitive,
		fixedStrings: commandFixedStrings,
		context: input.context,
		files: requestedFiles,
	});
	const parsedMatches = parseSearchMatches(contentResult.stdout, files);
	const matches = multiQueryMatches ?? parsedMatches;
	const slicedMatches = sliceResults(matches, input.offset, input.head_limit);
	const search = buildSearchResult({
		mode: input.output_mode,
		query: primaryPattern,
		queries: input.queries,
		matchMode: input.queries ? input.match_mode : undefined,
		counts,
		matches: slicedMatches.items,
		offset: input.offset,
		headLimit: input.head_limit,
		nextOffset: slicedMatches.nextOffset,
		hint: buildSearchHint('content', slicedMatches, input.head_limit),
	});
	return {
		operation: 'search',
		files,
		result: toDisplayResult(
			contentResult,
			formatSearchMatches(slicedMatches.items, slicedMatches, input.head_limit),
			search.truncated || contentResult.truncated,
		),
		search,
	};
}

function toDisplayResult(
	result: InternalKnowledgeCommandResult,
	stdout: string,
	truncated = false,
): InternalKnowledgeCommandResult {
	return {
		...result,
		stdout,
		truncated: result.truncated || truncated,
	};
}

function parseCountOutput(stdout: string, files: WorkspaceFiles) {
	const byRelativePath = new Map(files.map((file) => [file.relativePath, file]));
	const counts = stdout
		.split('\n')
		.flatMap((line) => {
			if (line.trim() === '') return [];
			const separatorIndex = line.lastIndexOf(':');
			if (separatorIndex === -1) return [];
			const relativePath = normaliseGrepPath(line.slice(0, separatorIndex));
			const matchCount = Number(line.slice(separatorIndex + 1));
			const file = byRelativePath.get(relativePath);
			if (!file || !Number.isFinite(matchCount) || matchCount <= 0) return [];
			return [
				{
					id: file.id,
					fileName: file.fileName,
					relativePath: file.relativePath,
					matchCount,
				},
			];
		})
		.sort((left, right) => right.matchCount - left.matchCount);
	return counts;
}

function parseSearchMatches(stdout: string, files: WorkspaceFiles): SearchMatchOutput[] {
	const byRelativePath = new Map(files.map((file) => [file.relativePath, file]));
	return stdout.split('\n').flatMap((line) => {
		const parsed = parseGrepLine(line);
		if (!parsed?.isMatch) return [];
		const file = byRelativePath.get(normaliseGrepPath(parsed.filePath));
		if (!file || parsed.lineNumber === undefined) return [];
		const { text, truncated } = truncateMatchText(line.slice(parsed.contentStartIndex));
		return [
			{
				fileId: file.id,
				fileName: file.fileName,
				relativePath: file.relativePath,
				lineNumber: parsed.lineNumber,
				text,
				readRange: toReadRange(parsed.lineNumber),
				truncated,
			},
		];
	});
}

function truncateMatchText(text: string) {
	if (text.length <= MAX_SEARCH_MATCH_TEXT_LENGTH) return { text };
	return {
		text: `${text.slice(0, MAX_SEARCH_MATCH_TEXT_LENGTH)}... [line truncated; use read for full text]`,
		truncated: true,
	};
}

function filterMultiQueryMatches(
	matches: SearchMatchOutput[],
	queries: string[],
	matchMode: SearchMatchMode,
	caseInsensitive?: boolean,
) {
	const normalizedQueries = queries.map((query) => normalizeSearchText(query, caseInsensitive));
	if (matchMode === 'any') {
		return matches.filter((match) =>
			normalizedQueries.some((query) =>
				normalizeSearchText(match.text, caseInsensitive).includes(query),
			),
		);
	}
	if (matchMode === 'all_on_same_line') {
		return matches.filter((match) => {
			const text = normalizeSearchText(match.text, caseInsensitive);
			return normalizedQueries.every((query) => text.includes(query));
		});
	}
	return matches.filter((match) =>
		hasAllQueriesInNearbyWindow(
			matches,
			match.relativePath,
			match.lineNumber,
			normalizedQueries,
			caseInsensitive,
		),
	);
}

function buildCountsFromMatches(matches: SearchMatchOutput[], files: WorkspaceFiles) {
	const countByRelativePath = new Map<string, number>();
	for (const match of matches) {
		countByRelativePath.set(
			match.relativePath,
			(countByRelativePath.get(match.relativePath) ?? 0) + 1,
		);
	}
	return files
		.flatMap((file) => {
			const matchCount = countByRelativePath.get(file.relativePath) ?? 0;
			if (matchCount === 0) return [];
			return [
				{
					id: file.id,
					fileName: file.fileName,
					relativePath: file.relativePath,
					matchCount,
				},
			];
		})
		.sort((left, right) => right.matchCount - left.matchCount);
}

function hasAllQueriesInNearbyWindow(
	matches: SearchMatchOutput[],
	relativePath: string,
	lineNumber: number,
	queries: string[],
	caseInsensitive?: boolean,
) {
	const sameFileMatches = matches.filter((match) => match.relativePath === relativePath);
	return sameFileMatches.some((windowStart) => {
		const start = windowStart.lineNumber;
		const end = start + MULTI_QUERY_WINDOW_LINES - 1;
		if (lineNumber < start || lineNumber > end) return false;
		const windowText = sameFileMatches
			.filter((match) => match.lineNumber >= start && match.lineNumber <= end)
			.map((match) => normalizeSearchText(match.text, caseInsensitive))
			.join('\n');
		return queries.every((query) => windowText.includes(query));
	});
}

function normalizeSearchText(text: string, caseInsensitive?: boolean) {
	return caseInsensitive ? text.toLowerCase() : text;
}

function toReadRange(lineNumber: number) {
	return {
		start: Math.max(1, lineNumber - DEFAULT_READ_RANGE_CONTEXT),
		end: lineNumber + DEFAULT_READ_RANGE_CONTEXT,
	};
}

function getPrimarySearchPattern(input: SearchInput) {
	return input.query ?? input.queries?.[0] ?? '';
}

function getSearchCommandPattern(input: SearchInput) {
	if (!input.queries) return input.query ?? '';
	return input.queries.map(escapeExtendedRegex).join('|');
}

function getSearchCommandFixedStrings(input: SearchInput) {
	return input.queries ? false : (input.fixedStrings ?? true);
}

function escapeExtendedRegex(pattern: string) {
	return pattern.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&');
}

function buildSearchResult({
	mode,
	query,
	queries,
	matchMode,
	counts,
	matches,
	offset,
	headLimit,
	nextOffset,
	hint,
}: {
	mode: SearchOutputMode;
	query: string;
	queries?: string[];
	matchMode?: SearchMatchMode;
	counts: ReturnType<typeof parseCountOutput>;
	matches: SearchMatchOutput[];
	offset: number;
	headLimit: number;
	nextOffset?: number;
	hint?: string;
}): SearchResultOutput {
	const slicedCounts = sliceResults(counts, offset, headLimit);
	const totalMatchingLines = counts.reduce((total, count) => total + count.matchCount, 0);
	const effectiveNextOffset = mode === 'content' ? nextOffset : slicedCounts.nextOffset;
	return {
		mode,
		query,
		queries,
		matchMode,
		totalMatchingFiles: counts.length,
		totalMatchingLines,
		files: slicedCounts.items,
		matches,
		truncated: slicedCounts.truncated || effectiveNextOffset !== undefined,
		appliedLimit:
			(mode === 'content' && effectiveNextOffset !== undefined) || slicedCounts.truncated
				? headLimit
				: undefined,
		appliedOffset: offset > 0 ? offset : undefined,
		nextOffset: effectiveNextOffset,
		hint,
	};
}

function sliceResults<T>(items: T[], offset: number, headLimit: number) {
	const sliced = headLimit === 0 ? items.slice(offset) : items.slice(offset, offset + headLimit);
	return {
		items: sliced,
		truncated: offset + sliced.length < items.length,
		nextOffset: offset + sliced.length < items.length ? offset + sliced.length : undefined,
	};
}

function buildSearchHint(
	mode: SearchOutputMode,
	sliced: { nextOffset?: number; truncated: boolean },
	headLimit: number,
) {
	if (sliced.nextOffset !== undefined) {
		return `Additional ${mode === 'files_with_matches' ? 'files' : mode === 'count' ? 'counts' : 'matches'} omitted. Continue with offset=${sliced.nextOffset} and head_limit=${headLimit}, or ${mode === 'content' ? 'read one of the returned ranges' : 'switch to output_mode=content after choosing a file'}.`;
	}
	if (mode === 'content') return 'Use read with the suggested line ranges for grounded citations.';
	if (mode === 'count') return 'Use output_mode=content after choosing a file or exact phrase.';
	return 'Use read on a matching file or switch to output_mode=content for line anchors.';
}

function formatSearchFiles(
	counts: ReturnType<typeof parseCountOutput>,
	offset: number,
	headLimit: number,
) {
	const sliced = sliceResults(counts, offset, headLimit);
	const lines = sliced.items.map((file) => file.fileName);
	if (sliced.truncated) lines.push(buildSearchHint('files_with_matches', sliced, headLimit));
	return lines.length > 0 ? `${lines.join('\n')}\n` : '';
}

function formatSearchCounts(
	counts: ReturnType<typeof parseCountOutput>,
	offset: number,
	headLimit: number,
) {
	const sliced = sliceResults(counts, offset, headLimit);
	const lines = sliced.items.map((file) => `${file.fileName}: ${file.matchCount}`);
	if (sliced.truncated) lines.push(buildSearchHint('count', sliced, headLimit));
	return lines.length > 0 ? `${lines.join('\n')}\n` : '';
}

function formatSearchMatches(
	matches: SearchMatchOutput[],
	sliced: { nextOffset?: number; truncated: boolean },
	headLimit: number,
) {
	const lines = matches.map(
		(match) =>
			`${match.fileName}:${match.lineNumber}:${match.text} (read ${match.readRange.start}-${match.readRange.end})`,
	);
	if (sliced.truncated) lines.push(buildSearchHint('content', sliced, headLimit));
	return lines.length > 0 ? `${lines.join('\n')}\n` : '';
}

function parseGrepLine(line: string) {
	const match =
		/^(?<filePath>.*)(?<separator>[:-])(?<lineNumber>\d+)(?<contentSeparator>[:-])/.exec(line);
	if (!match?.groups) return undefined;
	return {
		filePath: normaliseGrepPath(match.groups.filePath),
		isMatch: match.groups.separator === ':' && match.groups.contentSeparator === ':',
		lineNumber: Number(match.groups.lineNumber),
		contentStartIndex: match[0].length,
	};
}

function normaliseGrepPath(filePath: string) {
	return filePath.startsWith('./') ? filePath.slice(2) : filePath;
}

type FileReferenceResolution =
	| { status: 'found'; file: WorkspaceFiles[number] }
	| { status: 'missing'; error: string }
	| { status: 'ambiguous'; error: string };

function resolveFileReference(files: WorkspaceFiles, reference: string): FileReferenceResolution {
	const matches = files.filter(
		(file) =>
			file.id === reference || file.relativePath === reference || file.fileName === reference,
	);
	if (matches.length === 1) return { status: 'found', file: matches[0] };
	if (matches.length === 0) return { status: 'missing', error: `File "${reference}" not found` };

	return {
		status: 'ambiguous',
		error: `File "${reference}" matches multiple uploaded files. Use the file id or relative path instead.`,
	};
}

function getRequiredFileReferences(input: ParsedSearchKnowledgeInput) {
	if (input.operation === 'search') return input.files;
	if (
		input.operation === 'read' ||
		input.operation === 'csv_query' ||
		input.operation === 'csv_profile' ||
		input.operation === 'csv_distinct' ||
		input.operation === 'csv_aggregate'
	) {
		return [input.file];
	}
	return undefined;
}

async function queryCsv(
	workspaceRoot: string,
	files: Awaited<ReturnType<AgentKnowledgeService['materializeWorkspace']>>,
	input: CsvQueryInput,
) {
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

async function profileCsv(
	workspaceRoot: string,
	files: Awaited<ReturnType<AgentKnowledgeService['materializeWorkspace']>>,
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

async function distinctCsv(
	workspaceRoot: string,
	files: Awaited<ReturnType<AgentKnowledgeService['materializeWorkspace']>>,
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

async function aggregateCsv(
	workspaceRoot: string,
	files: Awaited<ReturnType<AgentKnowledgeService['materializeWorkspace']>>,
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
			const group = groups.get(key) ?? createCsvAggregateGroup(groupValues, metrics);
			groups.set(key, group);
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
		truncated: results.length > limit,
		skippedNonNumeric,
	};
}

function isCsvFile(
	file: Awaited<ReturnType<AgentKnowledgeService['materializeWorkspace']>>[number],
) {
	return file.mimeType === 'text/csv' || file.relativePath.toLowerCase().endsWith('.csv');
}

function resolveCsvFile(files: WorkspaceFiles, reference: string) {
	const resolvedFile = resolveFileReference(files, reference);
	if (resolvedFile.status !== 'found') {
		throw new Error(resolvedFile.error);
	}
	const { file } = resolvedFile;
	if (!file.searchable || !isCsvFile(file)) {
		throw new Error(`File "${file.fileName}" is not queryable as CSV.`);
	}
	return file;
}

async function streamCsvRecords(
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

function validateCsvColumns(headers: string[], fileName: string, columns: string[]) {
	for (const column of columns) {
		if (!headers.includes(column)) {
			throw new Error(formatMissingCsvColumnError(fileName, column, headers));
		}
	}
}

function matchesFilters(record: Record<string, unknown>, filters: CsvFilter[]) {
	return filters.every((filter) => {
		const value = normaliseCsvValue(record[filter.column]);
		if (filter.op === 'eq') return value === filter.value;
		if (filter.op === 'contains') return value.includes(filter.value);
		return filter.value.includes(value);
	});
}

function normaliseCsvValue(value: unknown) {
	if (value === null || value === undefined) return '';
	return String(value);
}

function toCsvRecordValues(record: Record<string, unknown>, columns: string[]) {
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

type CsvDistinctTracker = ReturnType<typeof createCsvDistinctTracker>;

function createCsvDistinctTracker(columns: string[], limit: number) {
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

function buildCsvAmbiguity(
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

function getSuggestedDisambiguatingColumns(
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

function createCsvColumnProfileState(distinctLimit: number) {
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

type CsvColumnProfileState = ReturnType<typeof createCsvColumnProfileState>;

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

function getLikelyDisambiguatingColumns(
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

function createCsvAggregateGroup(groupValues: Record<string, string>, metrics: string[]) {
	return {
		groupValues,
		count: 0,
		metrics: Object.fromEntries(metrics.map((metric) => [metric, createNumericAggregateState()])),
	};
}

type CsvAggregateGroup = ReturnType<typeof createCsvAggregateGroup>;

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

function formatCsvAggregateGroup(
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

function sortCsvAggregateResults(
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

function mapFileReferences(
	files: Awaited<ReturnType<AgentKnowledgeService['materializeWorkspace']>>,
	requestedFiles?: string[],
) {
	return requestedFiles?.map((file) => {
		const resolvedFile = resolveFileReference(files, file);
		return resolvedFile.status === 'found' ? resolvedFile.file.relativePath : file;
	});
}
