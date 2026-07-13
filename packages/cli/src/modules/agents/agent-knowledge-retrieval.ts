import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { z } from 'zod';

import { hasControlCharacter } from './agent-knowledge-storage';

const MAX_SEARCH_PATTERN_LENGTH = 500;
const MAX_GLOB_PATTERN_LENGTH = 255;
const MAX_FILE_PATH_LENGTH = 512;
const MAX_SEARCH_TEXT_LIMIT = 100;
const MAX_GLOB_FILES_LIMIT = 100;
const MAX_FILE_ID_LENGTH = 64;
const MAX_SEARCH_PATHS = 20;

export const DEFAULT_SEARCH_TEXT_LIMIT = 20;
export const DEFAULT_GLOB_FILES_LIMIT = 20;
export const MAX_SEARCH_LINE_CHARS = 500;
export const MAX_READ_LINE_CHARS = 2_000;
export const MAX_OPERATION_OUTPUT_CHARS = 20_000;
export const MAX_SEARCH_CONTEXT_LINES = 10;
export const MAX_READ_RANGES = 10;

const filePathSchema = z.string().trim().min(1).max(MAX_FILE_PATH_LENGTH);
// Models often pass a catch-all instead of omitting the optional path —
// treat such values as "search all files" rather than failing the call.
const ALL_FILES_PATH_PLACEHOLDERS = new Set(['', '.', '/', '*']);
const searchPathSchema = z.preprocess((value) => {
	const values = typeof value === 'string' ? [value] : value;
	if (!Array.isArray(values)) return values;
	const scoped = values.filter(
		(entry) => !(typeof entry === 'string' && ALL_FILES_PATH_PLACEHOLDERS.has(entry.trim())),
	);
	return scoped.length === 0 ? undefined : scoped;
}, z.array(filePathSchema).min(1).max(MAX_SEARCH_PATHS).optional());
const fileIdSchema = z.string().trim().min(1).max(MAX_FILE_ID_LENGTH);
const searchPatternSchema = z.string().trim().min(1).max(MAX_SEARCH_PATTERN_LENGTH);
const globPatternSchema = z.string().trim().min(1).max(MAX_GLOB_PATTERN_LENGTH);
const searchOutputModeSchema = z.enum(['content', 'files_with_matches', 'count']);
const searchContextFlagSchema = z.number().int().min(0).max(MAX_SEARCH_CONTEXT_LINES);

export const searchKnowledgeInputSchema = z
	.object({
		pattern: searchPatternSchema.describe(
			'Ripgrep regex pattern to search for in uploaded knowledge file contents. This is line-based regex search, not semantic search. Simple words and phrases usually work as-is; escape punctuation-heavy literals when needed.',
		),
		path: searchPathSchema.describe(
			'Optional uploaded knowledge file path or paths to search within. Pass one exact file value or an array of exact file values copied from previous knowledge tool results to scope the search. Omit to search across every uploaded knowledge file.',
		),
		output_mode: searchOutputModeSchema
			.optional()
			.describe(
				'Optional output mode. Defaults to content. Use files_with_matches to identify matching uploaded files without snippets, or count to compare match frequency by file.',
			),
		head_limit: z
			.number()
			.int()
			.min(1)
			.max(MAX_SEARCH_TEXT_LIMIT)
			.optional()
			.describe(
				'Optional maximum number of results to return. Use a small value such as 5-20, then narrow the pattern if results have hasMore or truncated.',
			),
		'-C': searchContextFlagSchema
			.optional()
			.describe(
				'Optional symmetric context lines around each content match, equivalent to ripgrep -C. Use 0 or omit for no surrounding context.',
			),
		'-i': z
			.boolean()
			.optional()
			.describe(
				'Optional case-insensitive search flag. Defaults to true for uploaded knowledge search; set false only when capitalization matters.',
			),
	})
	.strict();

export const globKnowledgeFilesInputSchema = z
	.object({
		pattern: globPatternSchema.describe(
			'Filename pattern matched against uploaded knowledge file names, not file contents. Supports * and ? wildcards and is case-insensitive by default. Use `*` to list every uploaded file, `*.pdf` to filter by extension, or name fragments like `*bert*` when the user gives title or filename clues.',
		),
		limit: z
			.number()
			.int()
			.min(1)
			.max(MAX_GLOB_FILES_LIMIT)
			.optional()
			.describe(
				'Optional maximum number of candidate files to return. Use a small value such as 5-20 and make the pattern more specific if hasMore is true.',
			),
		offset: z
			.number()
			.int()
			.min(0)
			.optional()
			.describe(
				'Optional number of matching files to skip, for paging. When hasMore is true, call again with offset = previous offset + number of returned files.',
			),
		caseSensitive: z
			.boolean()
			.optional()
			.describe(
				'Optional. Defaults to false for case-insensitive filename matching. Set true only when filename capitalization is part of the exact evidence you need.',
			),
	})
	.strict()
	.superRefine((input, ctx) => {
		const segments = input.pattern.split('/');
		if (
			input.pattern.startsWith('/') ||
			input.pattern.includes('\\') ||
			hasControlCharacter(input.pattern) ||
			segments.some((segment) => segment === '.' || segment === '..' || segment.length === 0)
		) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ['pattern'],
				message: 'Invalid knowledge file pattern',
			});
		}
	});

export const readKnowledgeInputSchema = z
	.object({
		file: filePathSchema
			.optional()
			.describe(
				'Uploaded knowledge file path to read. Use only an exact `file` value copied from a previous knowledge tool result. Required unless `fileId` is provided.',
			),
		fileId: fileIdSchema
			.optional()
			.describe(
				'Uploaded knowledge file ID to read. Use only an exact `fileId` copied from a previous knowledge tool result. Required unless `file` is provided.',
			),
		ranges: z
			.array(
				z
					.object({
						startLine: z
							.number()
							.int()
							.min(1)
							.describe(
								'First 1-based line number to read, usually near a search_text match. Keep ranges narrow enough for citation-ready evidence.',
							),
						endLine: z
							.number()
							.int()
							.min(1)
							.describe(
								'Last 1-based line number to read. Must be greater than or equal to startLine. Prefer short ranges around the evidence.',
							),
					})
					.strict(),
			)
			.min(1)
			.max(MAX_READ_RANGES)
			.optional()
			.describe(
				'Optional line ranges to read from the selected file. Prefer bounded ranges from search_text matches; omit only when full-file context is genuinely needed and output truncation is acceptable.',
			),
	})
	.strict()
	.superRefine((input, ctx) => {
		if (!input.file && !input.fileId) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'Provide file or fileId',
			});
		}

		for (const [index, range] of (input.ranges ?? []).entries()) {
			if (range.endLine < range.startLine) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ['ranges', index, 'endLine'],
					message: 'endLine must be greater than or equal to startLine',
				});
			}
		}
	});

export type SearchKnowledgeRequest = z.infer<typeof searchKnowledgeInputSchema>;
export type GlobKnowledgeFilesRequest = z.infer<typeof globKnowledgeFilesInputSchema>;
export type ReadKnowledgeRequest = z.infer<typeof readKnowledgeInputSchema>;

export interface AgentKnowledgeFileReference {
	file: string;
	fileId: string;
	binaryDataId: string;
	displayName: string;
	mimeType: string;
	fileSizeBytes: number;
	createdAt: string;
}

export interface AgentKnowledgeCitation {
	file: string;
	fileId: string;
	displayName: string;
	startLine: number;
	endLine: number;
}

export interface AgentKnowledgeLine {
	lineNumber: number;
	text: string;
	truncated: boolean;
}

export interface SearchKnowledgeMatch {
	file: string;
	fileId: string;
	displayName: string;
	lineNumber: number;
	text: string;
	textTruncated: boolean;
	context?: SearchKnowledgeContextLine[];
}

export interface SearchKnowledgeContextLine {
	lineNumber: number;
	text: string;
	matched: boolean;
}

export interface SearchKnowledgeCount {
	file: string;
	fileId: string;
	displayName: string;
	count: number;
}

export interface SearchKnowledgeContentResult {
	outputMode: 'content';
	matches: SearchKnowledgeMatch[];
	limit: number;
	hasMore: boolean;
	truncated: boolean;
}

export interface SearchKnowledgeFilesResult {
	outputMode: 'files_with_matches';
	files: AgentKnowledgeFileReference[];
	limit: number;
	hasMore: boolean;
	truncated: boolean;
}

export interface SearchKnowledgeCountResult {
	outputMode: 'count';
	counts: SearchKnowledgeCount[];
	limit: number;
	hasMore: boolean;
	truncated: boolean;
}

export type SearchKnowledgeResult =
	| SearchKnowledgeContentResult
	| SearchKnowledgeFilesResult
	| SearchKnowledgeCountResult;

export interface GlobKnowledgeFilesResult {
	files: AgentKnowledgeFileReference[];
	limit: number;
	offset: number;
	hasMore: boolean;
}

export interface ReadKnowledgeRangeResult {
	startLine: number;
	endLine: number;
	text: string;
	citation: AgentKnowledgeCitation;
}

export interface ReadKnowledgeResult {
	file: string;
	fileId: string;
	displayName: string;
	ranges: ReadKnowledgeRangeResult[];
	truncated: boolean;
}

export function parseSearchKnowledgeRequest(input: unknown): SearchKnowledgeRequest {
	return searchKnowledgeInputSchema.parse(input);
}

export function parseGlobKnowledgeFilesRequest(input: unknown): GlobKnowledgeFilesRequest {
	return globKnowledgeFilesInputSchema.parse(input);
}

export function parseReadKnowledgeRequest(input: unknown): ReadKnowledgeRequest {
	return readKnowledgeInputSchema.parse(input);
}

export function assertValidKnowledgeFilePath(filePath: string): string {
	const trimmed = filePath.trim();
	if (
		!trimmed ||
		trimmed.length > MAX_FILE_PATH_LENGTH ||
		trimmed.startsWith('/') ||
		trimmed.includes('\\') ||
		hasControlCharacter(trimmed)
	) {
		throw new BadRequestError('Invalid knowledge file path');
	}

	const segments = trimmed.split('/');
	if (segments.some((segment) => segment === '.' || segment === '..' || segment.length === 0)) {
		throw new BadRequestError('Invalid knowledge file path');
	}

	return trimmed;
}

export function truncateKnowledgeText(
	text: string,
	maxLength: number,
): { text: string; truncated: boolean } {
	if (text.length <= maxLength) {
		return { text, truncated: false };
	}

	return { text: text.slice(0, maxLength), truncated: true };
}
