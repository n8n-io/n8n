import {
	DEFAULT_SEARCH_TEXT_LIMIT,
	MAX_CONTEXT_LINES,
	MAX_OPERATION_OUTPUT_CHARS,
	MAX_READ_LINE_CHARS,
	MAX_SEARCH_LINE_CHARS,
	truncateKnowledgeText,
	type AgentKnowledgeFileReference,
	type AgentKnowledgeLine,
	type ReadKnowledgeRangeResult,
	type ReadKnowledgeRequest,
	type SearchKnowledgeMatch,
	type SearchKnowledgeRequest,
} from './agent-knowledge-retrieval';
import { KNOWLEDGE_FILES_DIR } from './agent-knowledge-storage';

export const OUTPUT_TRUNCATED_MARKER = '__N8N_AGENT_KNOWLEDGE_OUTPUT_TRUNCATED__';
const SHELL_OUTPUT_LIMIT_CHARS = MAX_OPERATION_OUTPUT_CHARS - OUTPUT_TRUNCATED_MARKER.length - 2;

export function buildSearchKnowledgeCommand(
	request: SearchKnowledgeRequest,
	files: AgentKnowledgeFileReference[] | undefined,
): string {
	const matchLimit = (request.offset ?? 0) + (request.limit ?? DEFAULT_SEARCH_TEXT_LIMIT) + 1;
	const args = [
		'rg',
		'--json',
		'--fixed-strings',
		'--line-number',
		'--color=never',
		'--hidden',
		// Deterministic match order across runs; without it rg's parallel
		// traversal makes offset/limit pagination skip or repeat matches.
		'--sort',
		'path',
		'--max-count',
		String(matchLimit),
		'--max-columns',
		String(MAX_SEARCH_LINE_CHARS + 1),
		'--max-columns-preview',
		...(request.caseSensitive === true ? [] : ['--ignore-case']),
		...(request.contextLines && request.contextLines > 0
			? ['--context', String(request.contextLines)]
			: []),
		'--',
		quoteShellArg(request.query),
		...(files?.map((file) => quoteShellArg(`./${file.file}`)) ?? [quoteShellArg('.')]),
	];

	return args.join(' ');
}

export function knowledgeFileMatchesQuery(
	file: AgentKnowledgeFileReference,
	query: string,
	compactQuery: string,
): boolean {
	const storageName = file.file.toLocaleLowerCase();
	const displayName = file.displayName.toLocaleLowerCase();

	return (
		storageName.includes(query) ||
		displayName.includes(query) ||
		(compactQuery.length > 0 &&
			(compactKnowledgeFileLookupText(storageName).includes(compactQuery) ||
				compactKnowledgeFileLookupText(displayName).includes(compactQuery)))
	);
}

export function compactKnowledgeFileLookupText(value: string): string {
	return value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, '');
}

export function buildReadKnowledgeCommand(file: string, request: ReadKnowledgeRequest): string {
	const maxEndLine = Math.max(...request.ranges.map((range) => range.endLine));
	const script = [
		...request.ranges.map(
			(range, index) =>
				`NR >= ${range.startLine} && NR <= ${range.endLine} { printf "${index}\\t%d\\t%s\\n", NR, substr($0, 1, ${
					MAX_READ_LINE_CHARS + 1
				}) }`,
		),
		// Stop scanning once all requested ranges are behind us.
		`NR > ${maxEndLine} { exit }`,
	].join(' ');

	return `awk ${quoteShellArg(script)} ${quoteShellArg(`./${file}`)}`;
}

export function parseRipgrepJsonOutput(
	output: string,
	filesByPath: Map<string, AgentKnowledgeFileReference>,
): { matches: SearchKnowledgeMatch[]; incomplete: boolean } {
	const matches: SearchKnowledgeMatch[] = [];
	const contextBeforeByFile = new Map<string, AgentKnowledgeLine[]>();
	let incomplete = false;

	for (const line of output.split(/\r?\n/)) {
		if (!line) continue;

		let event: unknown;
		try {
			event = JSON.parse(line);
		} catch {
			incomplete = true;
			continue;
		}

		if (!isRecord(event) || !isRecord(event.data)) continue;

		if (event.type === 'match') {
			const file = resolveRipgrepFile(event.data, filesByPath);
			const lineNumber = readNumber(event.data.line_number);
			const text = readRipgrepText(event.data);
			if (!file || lineNumber === undefined || text === undefined) continue;

			const contextBefore = contextBeforeByFile.get(file.file) ?? [];
			const truncatedText = truncateKnowledgeText(
				stripTrailingNewline(text),
				MAX_SEARCH_LINE_CHARS,
			);
			const startLine =
				contextBefore.length > 0 ? Math.min(contextBefore[0].lineNumber, lineNumber) : lineNumber;
			const match: SearchKnowledgeMatch = {
				file: file.file,
				fileId: file.fileId,
				displayName: file.displayName,
				lineNumber,
				text: truncatedText.text,
				textTruncated: truncatedText.truncated,
				...(contextBefore.length > 0 ? { contextBefore: [...contextBefore] } : {}),
				citation: {
					file: file.file,
					fileId: file.fileId,
					displayName: file.displayName,
					startLine,
					endLine: lineNumber,
				},
			};
			matches.push(match);
			contextBeforeByFile.set(file.file, []);
			continue;
		}

		if (event.type === 'context') {
			const file = resolveRipgrepFile(event.data, filesByPath);
			const lineNumber = readNumber(event.data.line_number);
			const text = readRipgrepText(event.data);
			if (!file || lineNumber === undefined || text === undefined) continue;

			const lineEntry = makeKnowledgeLine(lineNumber, text, MAX_SEARCH_LINE_CHARS);
			const lastMatch = matches[matches.length - 1];
			if (lastMatch?.file === file.file && lineNumber > lastMatch.lineNumber) {
				lastMatch.contextAfter = [...(lastMatch.contextAfter ?? []), lineEntry];
				lastMatch.citation.endLine = Math.max(lastMatch.citation.endLine, lineNumber);
				continue;
			}

			const contextBefore = contextBeforeByFile.get(file.file) ?? [];
			contextBefore.push(lineEntry);
			contextBeforeByFile.set(file.file, contextBefore.slice(-MAX_CONTEXT_LINES));
		}
	}

	return { matches, incomplete };
}

export function parseReadKnowledgeOutput(
	output: string,
	file: AgentKnowledgeFileReference,
	request: ReadKnowledgeRequest,
): ReadKnowledgeRangeResult[] {
	const ranges = request.ranges.map<ReadKnowledgeRangeResult>((range) => ({
		startLine: range.startLine,
		endLine: range.endLine,
		lines: [],
		citation: {
			file: file.file,
			fileId: file.fileId,
			displayName: file.displayName,
			startLine: range.startLine,
			endLine: range.endLine,
		},
	}));

	for (const line of output.split(/\r?\n/)) {
		if (!line) continue;
		const [rangeIndexText, lineNumberText, ...textParts] = line.split('\t');
		const rangeIndex = Number(rangeIndexText);
		const lineNumber = Number(lineNumberText);
		if (!Number.isInteger(rangeIndex) || !Number.isInteger(lineNumber) || !ranges[rangeIndex]) {
			continue;
		}

		ranges[rangeIndex].lines.push(
			makeKnowledgeLine(lineNumber, textParts.join('\t'), MAX_READ_LINE_CHARS),
		);
	}

	return ranges;
}

function makeKnowledgeLine(
	lineNumber: number,
	text: string,
	maxLength: number,
): AgentKnowledgeLine {
	const truncated = truncateKnowledgeText(stripTrailingNewline(text), maxLength);
	return { lineNumber, text: truncated.text, truncated: truncated.truncated };
}

function resolveRipgrepFile(
	data: Record<string, unknown>,
	filesByPath: Map<string, AgentKnowledgeFileReference>,
): AgentKnowledgeFileReference | undefined {
	const path = readTextObject(data.path);
	if (!path) return undefined;
	return filesByPath.get(normalizeRipgrepPath(path));
}

function readRipgrepText(data: Record<string, unknown>): string | undefined {
	return readTextObject(data.lines);
}

function readTextObject(value: unknown): string | undefined {
	if (!isRecord(value) || typeof value.text !== 'string') return undefined;
	return value.text;
}

function readNumber(value: unknown): number | undefined {
	return typeof value === 'number' && Number.isInteger(value) ? value : undefined;
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

function quoteShellArg(value: string): string {
	return `'${value.replaceAll("'", "'\\''")}'`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

export function truncateOperationOutput(text: string): { text: string; truncated: boolean } {
	const markerIndex = text.indexOf(OUTPUT_TRUNCATED_MARKER);
	const markerTruncated = markerIndex !== -1;
	const textWithoutMarker = markerTruncated
		? text.replaceAll(OUTPUT_TRUNCATED_MARKER, '').trimEnd()
		: text;

	if (textWithoutMarker.length <= MAX_OPERATION_OUTPUT_CHARS) {
		return { text: textWithoutMarker, truncated: markerTruncated };
	}

	return { text: textWithoutMarker.slice(0, MAX_OPERATION_OUTPUT_CHARS), truncated: true };
}

function buildOutputLimitedShellCommand(command: string): string {
	const capOutputScript = [
		'BEGIN { used = 0 }',
		'{',
		'  line = $0 "\\n"',
		'  remaining = max - used',
		'  if (remaining <= 0) { print "1" > truncated_file; exit 0 }',
		'  if (length(line) > remaining) {',
		'    printf "%s", substr(line, 1, remaining)',
		'    print "1" > truncated_file',
		'    exit 0',
		'  }',
		'  printf "%s", line',
		'  used += length(line)',
		'}',
	].join(' ');

	return [
		'status_file=$(mktemp)',
		'truncated_file=$(mktemp)',
		`{ ${command}; printf '%s' "$?" > "$status_file"; } | awk -v max=${SHELL_OUTPUT_LIMIT_CHARS} -v truncated_file="$truncated_file" ${quoteShellArg(
			capOutputScript,
		)}`,
		'status=$(cat "$status_file" 2>/dev/null || printf 0)',
		// When awk stops reading at the output cap, the producing command dies
		// from SIGPIPE (exit 141). That is our own truncation, not a command
		// failure, so normalize it to success. Any other non-zero status is a
		// genuine failure and must propagate even when output was truncated.
		`if [ -s "$truncated_file" ]; then echo ${quoteShellArg(
			OUTPUT_TRUNCATED_MARKER,
		)} >&2; if [ "$status" = 141 ]; then status=0; fi; fi`,
		'rm -f "$status_file" "$truncated_file"',
		'exit "$status"',
	].join('; ');
}

export function buildScopedKnowledgeShellCommand(command: string): string {
	return `if [ ! -d ${KNOWLEDGE_FILES_DIR} ]; then echo 'Agent knowledge files directory is unavailable' >&2; exit 2; fi; cd ${KNOWLEDGE_FILES_DIR} && ${buildOutputLimitedShellCommand(
		command,
	)}`;
}

export function readCommandStderr(
	artifacts: { stdout?: string; stderr?: string } | undefined,
): string {
	if (!artifacts || !('stderr' in artifacts)) {
		return '';
	}

	const stderr = artifacts.stderr;
	return typeof stderr === 'string' ? stderr : '';
}
