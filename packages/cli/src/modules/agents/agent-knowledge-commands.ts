import {
	DEFAULT_GLOB_FILES_LIMIT,
	DEFAULT_SEARCH_TEXT_LIMIT,
	MAX_OPERATION_OUTPUT_CHARS,
	MAX_READ_LINE_CHARS,
	MAX_SEARCH_LINE_CHARS,
	truncateKnowledgeText,
	type AgentKnowledgeFileReference,
	type GlobKnowledgeFilesRequest,
	type ReadKnowledgeRangeResult,
	type ReadKnowledgeRequest,
	type SearchKnowledgeMatch,
	type SearchKnowledgeRequest,
} from './agent-knowledge-retrieval';
import { KNOWLEDGE_FILES_DIR } from './agent-knowledge-storage';

const COMMAND_TIMEOUT_SECONDS = 20;
const READ_OUTPUT_TRUNCATED_MARKER = '__N8N_READ_OUTPUT_TRUNCATED__';

export function buildSearchKnowledgeCommand(request: SearchKnowledgeRequest): string {
	const matchLimit = (request.limit ?? DEFAULT_SEARCH_TEXT_LIMIT) + 1;
	const target = request.file ? `./${request.file}` : '.';
	const rgCommand = [
		'timeout',
		String(COMMAND_TIMEOUT_SECONDS),
		'rg',
		...(request.mode === 'regex' ? [] : ['--fixed-strings']),
		'--line-number',
		'--with-filename',
		'--color=never',
		'--hidden',
		'--max-columns',
		String(MAX_SEARCH_LINE_CHARS + 1),
		'--max-columns-preview',
		'--field-match-separator',
		quoteShellArg('\t'),
		...(request.caseSensitive === true ? [] : ['--ignore-case']),
		'-e',
		quoteShellArg(request.query),
		'--',
		quoteShellArg(target),
	];

	return buildHeadLimitedPipeline(rgCommand.join(' '), matchLimit);
}

export function buildGlobKnowledgeFilesCommand(request: GlobKnowledgeFilesRequest): string {
	const fileLimit = (request.limit ?? DEFAULT_GLOB_FILES_LIMIT) + 1;
	const rgCommand = `timeout ${COMMAND_TIMEOUT_SECONDS} rg --files --hidden --glob ${quoteShellArg(request.pattern)} -- ${quoteShellArg(
		'.',
	)}`;
	return buildHeadLimitedPipeline(rgCommand, fileLimit);
}

export function buildReadKnowledgeCommand(file: string, request: ReadKnowledgeRequest): string {
	const emitLineScript = [
		'function emit(i) {',
		`line = i "\\t" NR "\\t" substr($0, 1, ${MAX_READ_LINE_CHARS + 1}) "\\n";`,
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
): { matches: SearchKnowledgeMatch[]; incomplete: boolean } {
	const matches: SearchKnowledgeMatch[] = [];
	let incomplete = false;

	for (const line of output.split(/\r?\n/)) {
		if (!line) continue;

		const parsedLine = parseRipgrepMatchLine(line);
		if (!parsedLine) {
			incomplete = true;
			continue;
		}

		const file = filesByPath.get(normalizeRipgrepPath(parsedLine.filePath));
		if (!file) {
			continue;
		}

		const truncatedText = truncateKnowledgeText(
			stripTrailingNewline(parsedLine.text),
			MAX_SEARCH_LINE_CHARS,
		);
		matches.push({
			file: file.file,
			fileId: file.fileId,
			displayName: file.displayName,
			lineNumber: parsedLine.lineNumber,
			text: truncatedText.text,
			textTruncated: truncatedText.truncated,
		});
	}

	return { matches, incomplete };
}

export function parseGlobKnowledgeFilesOutput(
	output: string,
	filesByPath: Map<string, AgentKnowledgeFileReference>,
): AgentKnowledgeFileReference[] {
	const matches: AgentKnowledgeFileReference[] = [];
	const seen = new Set<string>();

	for (const line of output.split(/\r?\n/)) {
		const filePath = normalizeRipgrepPath(line.trim());
		if (!filePath || seen.has(filePath)) continue;

		const file = filesByPath.get(filePath);
		if (!file) continue;

		matches.push(file);
		seen.add(filePath);
	}

	return matches;
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

		const truncated = truncateKnowledgeText(
			stripTrailingNewline(textParts.join('\t')),
			MAX_READ_LINE_CHARS,
		);
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

function parseRipgrepMatchLine(
	line: string,
): { filePath: string; lineNumber: number; text: string } | undefined {
	const tabParts = line.split('\t');
	if (tabParts.length >= 3) {
		const [filePath, lineNumberText, ...textParts] = tabParts;
		const lineNumber = Number(lineNumberText);
		if (Number.isInteger(lineNumber)) {
			return { filePath, lineNumber, text: textParts.join('\t') };
		}
	}

	const firstMatchSeparator = line.indexOf('\t');
	if (firstMatchSeparator === -1) {
		return parseColonSeparatedRipgrepMatchLine(line);
	}

	const location = line.slice(0, firstMatchSeparator);
	const text = line.slice(firstMatchSeparator + 1);
	const lineSeparator = location.lastIndexOf(':');
	if (lineSeparator === -1) return undefined;

	const lineNumber = Number(location.slice(lineSeparator + 1));
	if (!Number.isInteger(lineNumber)) return undefined;

	return { filePath: location.slice(0, lineSeparator), lineNumber, text };
}

function parseColonSeparatedRipgrepMatchLine(
	line: string,
): { filePath: string; lineNumber: number; text: string } | undefined {
	const match = /^(.*):(\d+):(.*)$/.exec(line);
	if (!match) return undefined;

	const [, filePath, lineNumberText, text] = match;
	const lineNumber = Number(lineNumberText);
	if (!Number.isInteger(lineNumber)) return undefined;

	return { filePath, lineNumber, text };
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

function buildHeadLimitedPipeline(command: string, lineLimit: number): string {
	return [
		// The outer shell uses pipefail, but head intentionally closes the pipe
		// once the extra limit row is captured. Preserve real rg errors while
		// treating that expected SIGPIPE as a successful bounded result.
		'set +o pipefail',
		`${command} | head -n ${lineLimit}`,
		'command_status="${PIPESTATUS[0]}"',
		'if [ "$command_status" = 141 ]; then command_status=0; fi',
		'exit "$command_status"',
	].join('; ');
}

export function buildScopedKnowledgeShellCommand(command: string): string {
	return `bash -o pipefail -c ${quoteShellArg(`cd ${KNOWLEDGE_FILES_DIR} && { ${command}; }`)}`;
}
