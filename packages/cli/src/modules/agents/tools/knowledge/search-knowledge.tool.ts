import { Tool } from '@n8n/agents/tool';

import type { AgentKnowledgeSandboxService } from '../../agent-knowledge-sandbox.service';
import {
	globKnowledgeFilesInputSchema,
	MAX_READ_RANGES,
	readKnowledgeInputSchema,
	searchKnowledgeInputSchema,
	type GlobKnowledgeFilesResult,
	type ReadKnowledgeResult,
	type SearchKnowledgeResult,
} from '../../agent-knowledge-retrieval';

interface KnowledgeToolErrorOutput {
	error: string;
	errorType: string;
}

const MODEL_OUTPUT_GLOB_FILE_LIMIT = 20;
const MODEL_OUTPUT_SEARCH_MATCH_LIMIT = 8;
const MODEL_OUTPUT_SEARCH_TEXT_CHARS = 240;
const MODEL_OUTPUT_READ_TEXT_BUDGET = 6_000;
const MODEL_OUTPUT_READ_RANGE_MIN_CHARS = 800;

function formatKnowledgeToolError(error: unknown): KnowledgeToolErrorOutput {
	if (error instanceof Error) {
		return {
			error: error.message,
			errorType: error.name,
		};
	}

	return {
		error: String(error),
		errorType: typeof error,
	};
}

async function runKnowledgeTool<T>(
	operation: () => Promise<T>,
): Promise<T | KnowledgeToolErrorOutput> {
	try {
		return await operation();
	} catch (error) {
		return formatKnowledgeToolError(error);
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function truncateForModel(text: string, maxChars: number): { text: string; truncated: boolean } {
	if (text.length <= maxChars) {
		return { text, truncated: false };
	}

	return { text: text.slice(0, maxChars), truncated: true };
}

function isKnowledgeToolErrorOutput(output: unknown): output is KnowledgeToolErrorOutput {
	return (
		isRecord(output) && typeof output.error === 'string' && typeof output.errorType === 'string'
	);
}

function isGlobKnowledgeFilesResult(output: unknown): output is GlobKnowledgeFilesResult {
	return isRecord(output) && Array.isArray(output.files) && typeof output.hasMore === 'boolean';
}

function isSearchKnowledgeResult(output: unknown): output is SearchKnowledgeResult {
	if (
		!isRecord(output) ||
		typeof output.outputMode !== 'string' ||
		typeof output.hasMore !== 'boolean'
	) {
		return false;
	}

	if (output.outputMode === 'content') return Array.isArray(output.matches);
	if (output.outputMode === 'files_with_matches') return Array.isArray(output.files);
	if (output.outputMode === 'count') return Array.isArray(output.counts);
	return false;
}

function isReadKnowledgeResult(output: unknown): output is ReadKnowledgeResult {
	return (
		isRecord(output) &&
		typeof output.file === 'string' &&
		typeof output.fileId === 'string' &&
		typeof output.displayName === 'string' &&
		Array.isArray(output.ranges)
	);
}

function toGlobKnowledgeModelOutput(output: unknown): unknown {
	if (isKnowledgeToolErrorOutput(output) || !isGlobKnowledgeFilesResult(output)) return output;

	const files = output.files.slice(0, MODEL_OUTPUT_GLOB_FILE_LIMIT).map((file) => ({
		file: file.file,
		fileId: file.fileId,
		displayName: file.displayName,
	}));

	return {
		files,
		returnedFiles: output.files.length,
		shownFiles: files.length,
		hasMore: output.hasMore || output.files.length > MODEL_OUTPUT_GLOB_FILE_LIMIT,
	};
}

function toSearchKnowledgeModelOutput(output: unknown): unknown {
	if (isKnowledgeToolErrorOutput(output) || !isSearchKnowledgeResult(output)) return output;

	if (output.outputMode === 'files_with_matches') {
		const files = output.files.slice(0, MODEL_OUTPUT_GLOB_FILE_LIMIT).map((file) => ({
			file: file.file,
			fileId: file.fileId,
			displayName: file.displayName,
		}));

		return {
			outputMode: output.outputMode,
			files,
			returnedFiles: output.files.length,
			shownFiles: files.length,
			limit: output.limit,
			hasMore: output.hasMore || output.files.length > MODEL_OUTPUT_GLOB_FILE_LIMIT,
			truncated: output.truncated || output.files.length > MODEL_OUTPUT_GLOB_FILE_LIMIT,
		};
	}

	if (output.outputMode === 'count') {
		const counts = output.counts.slice(0, MODEL_OUTPUT_GLOB_FILE_LIMIT);

		return {
			outputMode: output.outputMode,
			counts,
			returnedCounts: output.counts.length,
			shownCounts: counts.length,
			limit: output.limit,
			hasMore: output.hasMore || output.counts.length > MODEL_OUTPUT_GLOB_FILE_LIMIT,
			truncated: output.truncated || output.counts.length > MODEL_OUTPUT_GLOB_FILE_LIMIT,
		};
	}

	let anyLocalTruncation = output.matches.length > MODEL_OUTPUT_SEARCH_MATCH_LIMIT;
	const matches = output.matches.slice(0, MODEL_OUTPUT_SEARCH_MATCH_LIMIT).map((match) => {
		const truncated = truncateForModel(match.text, MODEL_OUTPUT_SEARCH_TEXT_CHARS);
		if (truncated.truncated) anyLocalTruncation = true;

		const modelMatch = {
			file: match.file,
			fileId: match.fileId,
			displayName: match.displayName,
			lineNumber: match.lineNumber,
			text: truncated.text,
			textTruncated: match.textTruncated || truncated.truncated,
		};

		if (!match.context?.length) return modelMatch;

		const context = match.context.map((line) => {
			const truncatedContext = truncateForModel(line.text, MODEL_OUTPUT_SEARCH_TEXT_CHARS);
			if (truncatedContext.truncated) anyLocalTruncation = true;
			return {
				lineNumber: line.lineNumber,
				text: truncatedContext.text,
				matched: line.matched,
			};
		});

		return {
			...modelMatch,
			context,
		};
	});

	return {
		outputMode: output.outputMode,
		matches,
		returnedMatches: output.matches.length,
		shownMatches: matches.length,
		limit: output.limit,
		hasMore: output.hasMore || output.matches.length > MODEL_OUTPUT_SEARCH_MATCH_LIMIT,
		truncated: output.truncated || anyLocalTruncation,
	};
}

function toReadKnowledgeModelOutput(output: unknown): unknown {
	if (isKnowledgeToolErrorOutput(output) || !isReadKnowledgeResult(output)) return output;

	const perRangeBudget = Math.max(
		MODEL_OUTPUT_READ_RANGE_MIN_CHARS,
		Math.floor(MODEL_OUTPUT_READ_TEXT_BUDGET / Math.max(output.ranges.length, 1)),
	);
	let remainingBudget = MODEL_OUTPUT_READ_TEXT_BUDGET;
	let anyLocalTruncation = false;
	const ranges = [];

	for (const range of output.ranges) {
		if (remainingBudget <= 0) {
			anyLocalTruncation = true;
			break;
		}

		const maxChars = Math.min(perRangeBudget, remainingBudget);
		const truncated = truncateForModel(range.text, maxChars);
		if (truncated.truncated) anyLocalTruncation = true;
		remainingBudget -= truncated.text.length;

		ranges.push({
			startLine: range.startLine,
			endLine: range.endLine,
			citation: range.citation,
			text: truncated.text,
			textTruncated: truncated.truncated,
		});
	}

	if (ranges.length < output.ranges.length) {
		anyLocalTruncation = true;
	}

	return {
		file: output.file,
		fileId: output.fileId,
		displayName: output.displayName,
		ranges,
		returnedRanges: output.ranges.length,
		shownRanges: ranges.length,
		truncated: output.truncated || anyLocalTruncation,
	};
}

export function createKnowledgeRetrievalTools({
	projectId,
	agentId,
	userId,
	sandboxService,
}: {
	projectId: string;
	agentId: string;
	userId: string;
	sandboxService: AgentKnowledgeSandboxService;
}) {
	const globTool = new Tool('find_file')
		.description(
			'Find uploaded knowledge files by filename pattern only, such as `*knowledge*`, `*agent*tool*`, or `*sandbox*`. Use first for knowledge lookup to discover plausible candidate files; call until enough candidates are found, then copy returned file values into search_text path or read_file. Use for explicit document, title, standard, paper, dataset, author, product, or file-like clues. Do not use catch-all or extension-only patterns. Returns file and fileId metadata; does not read file contents.',
		)
		.input(globKnowledgeFilesInputSchema)
		.handler(
			async (input) =>
				await runKnowledgeTool(
					async () => await sandboxService.globKnowledgeFiles(projectId, agentId, userId, input),
				),
		)
		.toModelOutput(toGlobKnowledgeModelOutput);

	const searchTool = new Tool('search_text')
		.description(
			'Search uploaded knowledge file contents with a ripgrep regex `pattern` inside exact candidate files. Requires `path`: pass one exact file value or an array of exact file values returned by find_file, search_text, or read_file. Does not perform global search and does not accept omitted path, empty path, `*`, fileId, absolute paths, guessed paths, arrays of non-strings, offsets, or semantic questions. `output_mode` defaults to content for snippets; use files_with_matches for matching files only or count for per-file match counts. Use `head_limit` to bound results and small `-C` values for nearby context. Answer from snippets when enough; use read_file only for quotes, citations, exact wording, source text, or larger missing context.',
		)
		.input(searchKnowledgeInputSchema)
		.handler(
			async (input) =>
				await runKnowledgeTool(
					async () => await sandboxService.searchKnowledge(projectId, agentId, userId, input),
				),
		)
		.toModelOutput(toSearchKnowledgeModelOutput);

	const readTool = new Tool('read_file')
		.description(
			`Read one uploaded knowledge file using an exact \`file\` or \`fileId\` returned by a knowledge tool. Use only for exact quotes, citations, source text, or extra surrounding context not covered by search_text snippets or small -C context. Prefer bounded line ranges; each call supports up to ${MAX_READ_RANGES} ranges and output is truncated when too large. Read all needed ranges from the same file in one call when practical, and do not use read_file for broad manual scanning. If using fileId without an exact matching file value, omit file.`,
		)
		.input(readKnowledgeInputSchema)
		.handler(
			async (input) =>
				await runKnowledgeTool(
					async () => await sandboxService.readKnowledge(projectId, agentId, userId, input),
				),
		)
		.toModelOutput(toReadKnowledgeModelOutput);

	return [globTool, searchTool, readTool];
}
