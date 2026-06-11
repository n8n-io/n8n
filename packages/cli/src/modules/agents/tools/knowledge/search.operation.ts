import type { AgentKnowledgeCommandService } from '../../agent-knowledge-command.service';
import type {
	InternalKnowledgeCommandRequest,
	InternalKnowledgeCommandResult,
	ParsedSearchKnowledgeInput,
	SearchKnowledgeOutput,
	SearchMatchMode,
	SearchMatchOutput,
	SearchOutputMode,
	SearchResultOutput,
} from './schemas';
import { mapFileReferences, type WorkspaceFiles } from './file-references';

type SearchInput = Extract<ParsedSearchKnowledgeInput, { operation: 'search' }>;
type InternalSearchMatch = SearchMatchOutput & { fullText: string };

const DEFAULT_READ_RANGE_CONTEXT = 6;
const MAX_SEARCH_MATCH_TEXT_LENGTH = 500;
const MULTI_QUERY_WINDOW_LINES = 3;

export async function runInternalCommand(
	commandService: AgentKnowledgeCommandService,
	workspaceRoot: string,
	request: InternalKnowledgeCommandRequest,
): Promise<InternalKnowledgeCommandResult> {
	const result = await commandService.run(workspaceRoot, request);
	return { ...result, command: request.command };
}

export async function runSearchOperation(
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
	let multiQueryMatches: InternalSearchMatch[] | undefined;
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
	const displayMatches = slicedMatches.items.map(toSearchMatchOutput);
	const search = buildSearchResult({
		mode: input.output_mode,
		query: primaryPattern,
		queries: input.queries,
		matchMode: input.queries ? input.match_mode : undefined,
		counts,
		matches: displayMatches,
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
			formatSearchMatches(displayMatches, slicedMatches, input.head_limit),
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

function parseSearchMatches(stdout: string, files: WorkspaceFiles): InternalSearchMatch[] {
	const byRelativePath = new Map(files.map((file) => [file.relativePath, file]));
	return stdout.split('\n').flatMap((line) => {
		const parsed = parseGrepLine(line);
		if (!parsed?.isMatch) return [];
		const file = byRelativePath.get(normaliseGrepPath(parsed.filePath));
		if (!file || parsed.lineNumber === undefined) return [];
		const fullText = line.slice(parsed.contentStartIndex);
		const { text, truncated } = truncateMatchText(fullText);
		return [
			{
				fileId: file.id,
				fileName: file.fileName,
				relativePath: file.relativePath,
				lineNumber: parsed.lineNumber,
				fullText,
				text,
				readRange: toReadRange(parsed.lineNumber),
				truncated,
			},
		];
	});
}

function toSearchMatchOutput({
	fullText: _fullText,
	...match
}: InternalSearchMatch): SearchMatchOutput {
	return match;
}

function truncateMatchText(text: string) {
	if (text.length <= MAX_SEARCH_MATCH_TEXT_LENGTH) return { text };
	return {
		text: `${text.slice(0, MAX_SEARCH_MATCH_TEXT_LENGTH)}... [line truncated; use read for full text]`,
		truncated: true,
	};
}

function filterMultiQueryMatches(
	matches: InternalSearchMatch[],
	queries: string[],
	matchMode: SearchMatchMode,
	caseInsensitive?: boolean,
) {
	const normalizedQueries = queries.map((query) => normalizeSearchText(query, caseInsensitive));
	if (matchMode === 'any') {
		return matches.filter((match) =>
			normalizedQueries.some((query) =>
				normalizeSearchText(match.fullText, caseInsensitive).includes(query),
			),
		);
	}
	if (matchMode === 'all_on_same_line') {
		return matches.filter((match) => {
			const text = normalizeSearchText(match.fullText, caseInsensitive);
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
	matches: InternalSearchMatch[],
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
			.map((match) => normalizeSearchText(match.fullText, caseInsensitive))
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
