import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { z } from 'zod';

import { hasControlCharacter } from './agent-knowledge-storage';

const MAX_QUERY_LENGTH = 500;
const MAX_GLOB_PATTERN_LENGTH = 255;
const MAX_FILE_PATH_LENGTH = 512;
const MAX_SEARCH_TEXT_LIMIT = 100;
const MAX_GLOB_FILES_LIMIT = 100;
const MAX_FILE_ID_LENGTH = 64;

export const DEFAULT_SEARCH_TEXT_LIMIT = 20;
export const DEFAULT_GLOB_FILES_LIMIT = 20;
export const MAX_SEARCH_LINE_CHARS = 500;
export const MAX_READ_LINE_CHARS = 2_000;
export const MAX_OPERATION_OUTPUT_CHARS = 20_000;

const filePathSchema = z.string().trim().min(1).max(MAX_FILE_PATH_LENGTH);
const fileIdSchema = z.string().trim().min(1).max(MAX_FILE_ID_LENGTH);
const queryTermSchema = z.string().trim().min(1).max(MAX_QUERY_LENGTH);
const globPatternSchema = z.string().trim().min(1).max(MAX_GLOB_PATTERN_LENGTH);
const searchModeSchema = z.enum(['literal', 'regex']);
const broadExtensionGlobPattern = /^(?:\*\*\/)?\*\.[A-Za-z0-9][A-Za-z0-9.-]*$/;

export const searchKnowledgeInputSchema = z
	.object({
		query: queryTermSchema,
		file: filePathSchema
			.optional()
			.describe(
				'Optional uploaded knowledge file path to search within. Use only a file value returned by a knowledge tool; do not guess paths.',
			),
		fileId: fileIdSchema
			.optional()
			.describe(
				'Optional uploaded knowledge file ID to search within. Use only a fileId returned by a knowledge tool; do not guess IDs.',
			),
		mode: searchModeSchema
			.optional()
			.describe(
				'Search mode. Defaults to literal fixed-string search; use regex for exact content patterns.',
			),
		limit: z.number().int().min(1).max(MAX_SEARCH_TEXT_LIMIT).optional(),
		caseSensitive: z.boolean().optional(),
	})
	.strict();

export const globKnowledgeFilesInputSchema = z
	.object({
		pattern: globPatternSchema.describe(
			'Glob pattern matched against uploaded knowledge file names on the sandbox filesystem, e.g. *knowledge*, *agent*tool*, or *sandbox*.',
		),
		limit: z.number().int().min(1).max(MAX_GLOB_FILES_LIMIT).optional(),
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
				message: 'Invalid knowledge file glob pattern',
			});
		}

		if (input.pattern === '*' || broadExtensionGlobPattern.test(input.pattern)) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ['pattern'],
				message: 'Use a narrower glob pattern than catch-all or extension-only globs',
			});
		}
	});

export const readKnowledgeInputSchema = z
	.object({
		file: filePathSchema
			.optional()
			.describe('Uploaded knowledge file path returned by a knowledge tool; do not guess paths.'),
		fileId: fileIdSchema
			.optional()
			.describe('Uploaded knowledge file ID returned by a knowledge tool; do not guess IDs.'),
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
			.optional(),
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
}

export interface SearchKnowledgeResult {
	matches: SearchKnowledgeMatch[];
	limit: number;
	hasMore: boolean;
	truncated: boolean;
}

export interface GlobKnowledgeFilesResult {
	files: AgentKnowledgeFileReference[];
	limit: number;
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
