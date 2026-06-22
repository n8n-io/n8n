import { Buffer } from 'node:buffer';
import { redactText } from '@n8n/agents';
import { z } from 'zod';

import {
	DEFAULT_SEARCH_TEXT_LIMIT,
	MAX_OPERATION_OUTPUT_CHARS,
	MAX_READ_LINE_CHARS,
	MAX_SEARCH_LINE_CHARS,
	truncateKnowledgeText,
	type SearchKnowledgeCount,
	type SearchKnowledgeContextLine,
	type AgentKnowledgeFileReference,
	type ReadKnowledgeRangeResult,
	type ReadKnowledgeRequest,
	type SearchKnowledgeMatch,
	type SearchKnowledgeRequest,
} from './agent-knowledge-retrieval';
import { KNOWLEDGE_FILES_DIR } from './agent-knowledge-storage';

const COMMAND_TIMEOUT_SECONDS = 20;
const SEARCH_OUTPUT_TRUNCATED_MARKER = '__N8N_SEARCH_OUTPUT_TRUNCATED__';
const READ_OUTPUT_TRUNCATED_MARKER = '__N8N_READ_OUTPUT_TRUNCATED__';
const SEARCH_JSON_EVENT_OVERHEAD_CHARS = 1_500;
const MAX_SEARCH_OPERATION_OUTPUT_CHARS = 500_000;
export const KNOWLEDGE_FILES_DIR_UNAVAILABLE_EXIT_CODE = 3;

interface ParsedRipgrepContentLine {
	filePath: string;
	lineNumber: number;
	text: string;
	matched: boolean;
}

interface SearchContextSourceLine {
	text: string;
}

export interface SearchContextWindow {
	before: number;
	after: number;
}

const ripgrepEncodedTextSchema = z
	.object({
		text: z.string().optional(),
		bytes: z.string().optional(),
	})
	.passthrough();

const ripgrepContentDataSchema = z
	.object({
		path: ripgrepEncodedTextSchema,
		lines: ripgrepEncodedTextSchema,
		line_number: z.number().int(),
	})
	.passthrough();

const ripgrepJsonEventSchema = z.discriminatedUnion('type', [
	z.object({ type: z.literal('match'), data: ripgrepContentDataSchema }).passthrough(),
	z.object({ type: z.literal('context'), data: ripgrepContentDataSchema }).passthrough(),
	z.object({ type: z.literal('begin') }).passthrough(),
	z.object({ type: z.literal('end') }).passthrough(),
	z.object({ type: z.literal('summary') }).passthrough(),
]);

type RipgrepJsonEvent = z.infer<typeof ripgrepJsonEventSchema>;
type RipgrepContentEvent = Extract<RipgrepJsonEvent, { type: 'match' | 'context' }>;
type RipgrepEncodedText = z.infer<typeof ripgrepEncodedTextSchema>;

export function buildSearchKnowledgeCommand(
	request: SearchKnowledgeRequest,
	scopedFiles: string[],
): string {
	const outputMode = request.output_mode ?? 'content';
	const resultLimit = (request.head_limit ?? DEFAULT_SEARCH_TEXT_LIMIT) + 1;
	const targets = scopedFiles.map((file) => quoteShellArg(`./${file}`));
	const baseCommand = [
		'timeout',
		String(COMMAND_TIMEOUT_SECONDS),
		'rg',
		...(request['-i'] === false ? [] : ['--ignore-case']),
		'--color=never',
		'--hidden',
	];

	if (outputMode === 'files_with_matches') {
		const rgCommand = [
			...baseCommand,
			'--files-with-matches',
			'-e',
			quoteShellArg(request.pattern),
			'--',
			...targets,
		];
		return buildLineLimitedPipeline(rgCommand.join(' '), resultLimit);
	}

	if (outputMode === 'count') {
		const rgCommand = [
			...baseCommand,
			'--count-matches',
			'--with-filename',
			'--field-match-separator',
			quoteShellArg('\t'),
			'-e',
			quoteShellArg(request.pattern),
			'--',
			...targets,
		];
		return buildLineLimitedPipeline(rgCommand.join(' '), resultLimit);
	}

	const outputLimit = estimateSearchOutputLimit(request, resultLimit);
	const contextArgs = buildSearchContextArgs(request);
	const rgCommand = [
		...baseCommand,
		'--json',
		'--line-number',
		'--with-filename',
		...contextArgs,
		'-e',
		quoteShellArg(request.pattern),
		'--',
		...targets,
	];

	return buildJsonMatchLimitedPipeline(rgCommand.join(' '), resultLimit, outputLimit);
}

export function estimateSearchOutputLimit(
	request: Pick<SearchKnowledgeRequest, '-C'>,
	matchLimit: number,
): number {
	const contextWindow = getSearchContextWindow(request);
	const linesPerMatch = 1 + contextWindow.before + contextWindow.after;
	const estimatedOutput =
		matchLimit * linesPerMatch * (MAX_SEARCH_LINE_CHARS + SEARCH_JSON_EVENT_OVERHEAD_CHARS);
	return Math.min(
		MAX_SEARCH_OPERATION_OUTPUT_CHARS,
		Math.max(MAX_OPERATION_OUTPUT_CHARS, estimatedOutput),
	);
}

export function getSearchContextWindow(
	request: Pick<SearchKnowledgeRequest, '-C'>,
): SearchContextWindow {
	const symmetricContext = request['-C'] ?? 0;
	return {
		before: symmetricContext,
		after: symmetricContext,
	};
}

export function buildReadKnowledgeCommand(file: string, request: ReadKnowledgeRequest): string {
	const emitLineScript = [
		'function emit(i) {',
		// Emit complete lines so TypeScript can redact secrets before applying
		// the public line-length limit. The total output cap still bounds stdout.
		'line = i "\\t" NR "\\t" $0 "\\n";',
		`if (total + length(line) > ${MAX_OPERATION_OUTPUT_CHARS}) { print "${READ_OUTPUT_TRUNCATED_MARKER}"; exit; }`,
		'printf "%s", line;',
		'total += length(line);',
		'}',
	].join(' ');

	if (!request.ranges) {
		const script = [emitLineScript, '{ emit(0) }'].join(' ');

		return `awk ${quoteShellArg(script)} ${quoteShellArg(`./${file}`)}`;
	}

	const maxEndLine = Math.max(...request.ranges.map((range) => range.endLine));
	const script = [
		emitLineScript,
		...request.ranges.map(
			(range, index) => `NR >= ${range.startLine} && NR <= ${range.endLine} { emit(${index}) }`,
		),
		// Stop scanning once all requested ranges are behind us.
		`NR > ${maxEndLine} { exit }`,
	].join(' ');

	return `awk ${quoteShellArg(script)} ${quoteShellArg(`./${file}`)}`;
}

export function parseRipgrepOutput(
	output: string,
	filesByPath: Map<string, AgentKnowledgeFileReference>,
	contextWindow: SearchContextWindow = { before: 0, after: 0 },
): { matches: SearchKnowledgeMatch[]; incomplete: boolean } {
	const matches: SearchKnowledgeMatch[] = [];
	const contextByFile = new Map<string, Map<number, SearchContextSourceLine>>();
	let incomplete = false;

	for (const line of output.split(/\r?\n/)) {
		if (!line) continue;
		if (line === SEARCH_OUTPUT_TRUNCATED_MARKER) {
			incomplete = true;
			break;
		}

		const parsedEvent = parseRipgrepJsonEvent(line);
		if (parsedEvent === undefined) {
			incomplete = true;
			continue;
		}
		if (isIgnoredRipgrepEvent(parsedEvent)) continue;

		const parsedLine =
			parsedEvent.type === 'match'
				? parseRipgrepMatchEvent(parsedEvent)
				: parseRipgrepContextEvent(parsedEvent);
		if (parsedLine === undefined) {
			incomplete = true;
			continue;
		}
		if (parsedLine === null) continue;

		const file = filesByPath.get(normalizeRipgrepPath(parsedLine.filePath));
		if (!file) {
			continue;
		}

		const truncatedText = sanitizeKnowledgeOutputText(parsedLine.text, MAX_SEARCH_LINE_CHARS);
		const fileContext = getContextLineMap(contextByFile, file.file);
		fileContext.set(parsedLine.lineNumber, { text: truncatedText.text });

		if (parsedLine.matched) {
			matches.push({
				file: file.file,
				fileId: file.fileId,
				displayName: file.displayName,
				lineNumber: parsedLine.lineNumber,
				text: truncatedText.text,
				textTruncated: truncatedText.truncated,
			});
		}
	}

	if (hasSearchContext(contextWindow)) {
		for (const match of matches) {
			const context = buildSearchMatchContext(
				contextByFile.get(match.file),
				match.lineNumber,
				contextWindow,
			);
			if (context.length > 0) {
				match.context = context;
			}
		}
	}

	return { matches, incomplete };
}

export function parseRipgrepFilesOutput(
	output: string,
	filesByPath: Map<string, AgentKnowledgeFileReference>,
): { files: AgentKnowledgeFileReference[]; incomplete: boolean } {
	const files: AgentKnowledgeFileReference[] = [];
	const seenFiles = new Set<string>();
	let incomplete = false;

	for (const line of output.split(/\r?\n/)) {
		if (!line) continue;
		if (line === SEARCH_OUTPUT_TRUNCATED_MARKER) {
			incomplete = true;
			break;
		}

		const file = filesByPath.get(normalizeRipgrepPath(line));
		if (!file || seenFiles.has(file.file)) continue;

		seenFiles.add(file.file);
		files.push(file);
	}

	return { files, incomplete };
}

export function parseRipgrepCountOutput(
	output: string,
	filesByPath: Map<string, AgentKnowledgeFileReference>,
): { counts: SearchKnowledgeCount[]; incomplete: boolean } {
	const counts: SearchKnowledgeCount[] = [];
	let incomplete = false;

	for (const line of output.split(/\r?\n/)) {
		if (!line) continue;
		if (line === SEARCH_OUTPUT_TRUNCATED_MARKER) {
			incomplete = true;
			break;
		}

		const separatorIndex = line.lastIndexOf('\t');
		if (separatorIndex === -1) {
			incomplete = true;
			continue;
		}

		const filePath = line.slice(0, separatorIndex);
		const count = Number(line.slice(separatorIndex + 1));
		if (!Number.isInteger(count) || count < 0) {
			incomplete = true;
			continue;
		}

		const file = filesByPath.get(normalizeRipgrepPath(filePath));
		if (!file) continue;

		counts.push({
			file: file.file,
			fileId: file.fileId,
			displayName: file.displayName,
			count,
		});
	}

	return { counts, incomplete };
}

export function parseReadKnowledgeOutput(
	output: string,
	file: AgentKnowledgeFileReference,
	request: ReadKnowledgeRequest,
): { ranges: ReadKnowledgeRangeResult[]; truncated: boolean } {
	const isWholeFileRead = !request.ranges;
	const requestedRanges = request.ranges ?? [{ startLine: 1, endLine: 0 }];
	const ranges = requestedRanges.map<ReadKnowledgeRangeResult>((range) => ({
		startLine: range.startLine,
		endLine: range.endLine,
		text: '',
		citation: {
			file: file.file,
			fileId: file.fileId,
			displayName: file.displayName,
			startLine: range.startLine,
			endLine: range.endLine,
		},
	}));
	let truncatedOutput = false;

	for (const line of output.split(/\r?\n/)) {
		if (!line) continue;
		if (line === READ_OUTPUT_TRUNCATED_MARKER) {
			truncatedOutput = true;
			break;
		}
		const [rangeIndexText, lineNumberText, ...textParts] = line.split('\t');
		const rangeIndex = Number(rangeIndexText);
		const lineNumber = Number(lineNumberText);
		if (!Number.isInteger(rangeIndex) || !Number.isInteger(lineNumber) || !ranges[rangeIndex]) {
			continue;
		}

		const truncated = sanitizeKnowledgeOutputText(textParts.join('\t'), MAX_READ_LINE_CHARS);
		const range = ranges[rangeIndex];
		if (isWholeFileRead) {
			range.endLine = lineNumber;
			range.citation.endLine = lineNumber;
		}
		const outputLine = `${lineNumber}|${truncated.text}`;
		range.text = range.text ? `${range.text}\n${outputLine}` : outputLine;
	}

	return { ranges, truncated: truncatedOutput };
}

function getContextLineMap(
	contextByFile: Map<string, Map<number, SearchContextSourceLine>>,
	file: string,
): Map<number, SearchContextSourceLine> {
	let context = contextByFile.get(file);
	if (!context) {
		context = new Map();
		contextByFile.set(file, context);
	}
	return context;
}

function buildSearchMatchContext(
	linesByNumber: Map<number, SearchContextSourceLine> | undefined,
	matchLineNumber: number,
	contextWindow: SearchContextWindow,
): SearchKnowledgeContextLine[] {
	if (!linesByNumber) return [];

	const context: SearchKnowledgeContextLine[] = [];
	const startLine = Math.max(1, matchLineNumber - contextWindow.before);
	const endLine = matchLineNumber + contextWindow.after;
	for (let lineNumber = startLine; lineNumber <= endLine; lineNumber++) {
		const line = linesByNumber.get(lineNumber);
		if (!line) continue;
		context.push({
			lineNumber,
			text: line.text,
			matched: lineNumber === matchLineNumber,
		});
	}
	return context;
}

function hasSearchContext(contextWindow: SearchContextWindow): boolean {
	return contextWindow.before > 0 || contextWindow.after > 0;
}

function buildSearchContextArgs(request: Pick<SearchKnowledgeRequest, '-C'>): string[] {
	const contextLines = request['-C'] ?? 0;
	return contextLines > 0 ? ['--context', String(contextLines)] : [];
}

function parseRipgrepJsonEvent(line: string): RipgrepJsonEvent | undefined {
	let parsed: unknown;
	try {
		parsed = JSON.parse(line);
	} catch {
		return undefined;
	}

	const event = ripgrepJsonEventSchema.safeParse(parsed);
	return event.success ? event.data : undefined;
}

function isIgnoredRipgrepEvent(event: RipgrepJsonEvent): boolean {
	return event.type === 'begin' || event.type === 'end' || event.type === 'summary';
}

function parseRipgrepMatchEvent(
	event: RipgrepJsonEvent,
): ParsedRipgrepContentLine | null | undefined {
	if (event.type !== 'match') return null;
	const parsed = parseRipgrepContentEvent(event);
	return parsed ? { ...parsed, matched: true } : parsed;
}

function parseRipgrepContextEvent(
	event: RipgrepJsonEvent,
): ParsedRipgrepContentLine | null | undefined {
	if (event.type !== 'context') return null;
	const parsed = parseRipgrepContentEvent(event);
	return parsed ? { ...parsed, matched: false } : parsed;
}

function parseRipgrepContentEvent(
	event: RipgrepContentEvent,
): Omit<ParsedRipgrepContentLine, 'matched'> | undefined {
	const filePath = decodeRipgrepJsonData(event.data.path);
	const text = decodeRipgrepJsonData(event.data.lines);
	const lineNumber = event.data.line_number;
	if (
		filePath === undefined ||
		text === undefined ||
		typeof lineNumber !== 'number' ||
		!Number.isInteger(lineNumber)
	) {
		return undefined;
	}

	return { filePath, lineNumber, text };
}

function decodeRipgrepJsonData(value: RipgrepEncodedText): string | undefined {
	if (typeof value.text === 'string') return value.text;
	if (typeof value.bytes === 'string') return Buffer.from(value.bytes, 'base64').toString('utf8');
	return undefined;
}

function normalizeRipgrepPath(filePath: string): string {
	if (filePath.startsWith(`${KNOWLEDGE_FILES_DIR}/`)) {
		return filePath.slice(KNOWLEDGE_FILES_DIR.length + 1);
	}
	if (filePath.startsWith('./')) {
		return filePath.slice(2);
	}
	return filePath;
}

function stripTrailingNewline(text: string): string {
	return text.replace(/\r?\n$/, '');
}

function sanitizeKnowledgeOutputText(
	text: string,
	maxLength: number,
): { text: string; truncated: boolean } {
	return truncateKnowledgeText(redactText(stripTrailingNewline(text)).text, maxLength);
}

function quoteShellArg(value: string): string {
	return `'${value.replaceAll("'", "'\\''")}'`;
}

function buildJsonMatchLimitedPipeline(
	command: string,
	matchLimit: number,
	outputLimit: number,
): string {
	const script = [
		'BEGIN { matches = 0; total = 0 }',
		...buildOutputLimitedEmitFunction(outputLimit),
		'{ emit($0) }',
		`/^\\{"type":"match"/ { matches += 1; if (matches >= ${matchLimit}) exit 0 }`,
	].join(' ');

	return buildAwkPipeline(command, script);
}

function buildLineLimitedPipeline(
	command: string,
	lineLimit: number,
	outputLimit = MAX_OPERATION_OUTPUT_CHARS,
): string {
	const script = [
		'BEGIN { lines = 0; total = 0 }',
		...buildOutputLimitedEmitFunction(outputLimit),
		'{ emit($0); lines += 1; if (lines >= ' + lineLimit + ') exit 0 }',
	].join(' ');

	return buildAwkPipeline(command, script);
}

function buildOutputLimitedEmitFunction(outputLimit: number): string[] {
	return [
		'function emit(line) {',
		`line_length = length(line) + 1; if (total + line_length > ${outputLimit}) { print "${SEARCH_OUTPUT_TRUNCATED_MARKER}"; exit 0; }`,
		'print line; total += line_length;',
		'}',
	];
}

function buildAwkPipeline(command: string, script: string): string {
	return [
		// The outer shell uses pipefail, but awk intentionally closes the pipe
		// once enough bounded output is captured. Preserve real rg errors while
		// treating that expected SIGPIPE as a successful bounded result.
		'set +o pipefail',
		`${command} | awk ${quoteShellArg(script)}`,
		'command_status="$' + '{PIPESTATUS[0]}"',
		'if [ "$command_status" = 141 ]; then command_status=0; fi',
		'exit "$command_status"',
	].join('; ');
}

export function buildScopedKnowledgeShellCommand(command: string): string {
	const scopedCommand = [
		`[ -d ${quoteShellArg(KNOWLEDGE_FILES_DIR)} ] || exit ${KNOWLEDGE_FILES_DIR_UNAVAILABLE_EXIT_CODE}`,
		`cd ${quoteShellArg(KNOWLEDGE_FILES_DIR)} || exit ${KNOWLEDGE_FILES_DIR_UNAVAILABLE_EXIT_CODE}`,
		`{ ${command}; }`,
	].join('; ');
	return `bash -o pipefail -c ${quoteShellArg(scopedCommand)}`;
}
