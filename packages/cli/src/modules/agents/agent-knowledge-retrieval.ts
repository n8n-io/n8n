import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { z } from 'zod';

import { hasControlCharacter } from './agent-knowledge-storage';

const MAX_QUERY_LENGTH = 500;
const MAX_QUERY_TERMS = 5;
const MAX_FILE_PATH_LENGTH = 512;
const MAX_FIND_FILES_LIMIT = 100;
const MAX_SEARCH_TEXT_LIMIT = 100;
const MAX_RANGES = 5;
const MAX_RANGE_LINES = 80;
const MAX_FILTER_FILES = 10;
const MAX_FILE_ID_LENGTH = 64;
// Deep pagination re-runs the search with a growing per-file match budget, so
// an unbounded offset would let a single call force a full-corpus scan.
const MAX_PAGINATION_OFFSET = 1_000;

export const DEFAULT_FIND_FILES_LIMIT = 20;
export const DEFAULT_SEARCH_TEXT_LIMIT = 20;
export const MAX_CONTEXT_LINES = 5;
export const MAX_SEARCH_LINE_CHARS = 500;
export const MAX_READ_LINE_CHARS = 2_000;
export const MAX_OPERATION_OUTPUT_CHARS = 20_000;

const filePathSchema = z.string().trim().min(1).max(MAX_FILE_PATH_LENGTH);
const fileIdSchema = z.string().trim().min(1).max(MAX_FILE_ID_LENGTH);
const queryTermSchema = z.string().trim().min(1).max(MAX_QUERY_LENGTH);
const offsetSchema = z.number().int().min(0).max(MAX_PAGINATION_OFFSET);

export const findKnowledgeFilesInputSchema = z
	.object({
		query: queryTermSchema.optional(),
		limit: z.number().int().min(1).max(MAX_FIND_FILES_LIMIT).optional(),
		offset: offsetSchema.optional(),
	})
	.strict();

export const searchKnowledgeInputSchema = z
	.object({
		query: queryTermSchema,
		queries: z
			.array(queryTermSchema)
			.min(1)
			.max(MAX_QUERY_TERMS)
			.optional()
			.describe('Additional literal terms matched with OR semantics alongside query'),
		file: filePathSchema.optional(),
		fileId: fileIdSchema.optional(),
		files: z.array(filePathSchema).max(MAX_FILTER_FILES).optional(),
		fileIds: z.array(fileIdSchema).max(MAX_FILTER_FILES).optional(),
		limit: z.number().int().min(1).max(MAX_SEARCH_TEXT_LIMIT).optional(),
		offset: offsetSchema.optional(),
		caseSensitive: z.boolean().optional(),
		contextLines: z.number().int().min(0).max(MAX_CONTEXT_LINES).optional(),
	})
	.strict();

export const readKnowledgeInputSchema = z
	.object({
		file: filePathSchema.optional(),
		fileId: fileIdSchema.optional(),
		ranges: z
			.array(
				z
					.object({
						startLine: z.number().int().min(1),
						endLine: z.number().int().min(1),
					})
					.strict(),
			)
			.min(1)
			.max(MAX_RANGES),
	})
	.strict()
	.superRefine((input, ctx) => {
		if (!input.file && !input.fileId) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'Provide file or fileId',
			});
		}

		for (const [index, range] of input.ranges.entries()) {
			if (range.endLine < range.startLine) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ['ranges', index, 'endLine'],
					message: 'endLine must be greater than or equal to startLine',
				});
			}

			if (range.endLine - range.startLine + 1 > MAX_RANGE_LINES) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ['ranges', index],
					message: `Ranges can include at most ${MAX_RANGE_LINES} lines`,
				});
			}
		}
	});

export type FindKnowledgeFilesRequest = z.infer<typeof findKnowledgeFilesInputSchema>;
export type SearchKnowledgeRequest = z.infer<typeof searchKnowledgeInputSchema>;
export type ReadKnowledgeRequest = z.infer<typeof readKnowledgeInputSchema>;

export interface AgentKnowledgeFileReference {
	file: string;
	fileId: string;
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

export interface FindKnowledgeFilesResult {
	files: AgentKnowledgeFileReference[];
	limit: number;
	offset: number;
	hasMore: boolean;
}

export interface SearchKnowledgeMatch {
	file: string;
	fileId: string;
	displayName: string;
	lineNumber: number;
	text: string;
	textTruncated: boolean;
	contextBefore?: AgentKnowledgeLine[];
	contextAfter?: AgentKnowledgeLine[];
	citation: AgentKnowledgeCitation;
}

export interface SearchKnowledgeResult {
	matches: SearchKnowledgeMatch[];
	limit: number;
	offset: number;
	hasMore: boolean;
	truncated: boolean;
}

export interface ReadKnowledgeRangeResult {
	startLine: number;
	endLine: number;
	lines: AgentKnowledgeLine[];
	citation: AgentKnowledgeCitation;
}

export interface ReadKnowledgeResult {
	file: string;
	fileId: string;
	displayName: string;
	ranges: ReadKnowledgeRangeResult[];
	truncated: boolean;
}

export function parseFindKnowledgeFilesRequest(input: unknown): FindKnowledgeFilesRequest {
	return findKnowledgeFilesInputSchema.parse(input);
}

export function parseSearchKnowledgeRequest(input: unknown): SearchKnowledgeRequest {
	return searchKnowledgeInputSchema.parse(input);
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
