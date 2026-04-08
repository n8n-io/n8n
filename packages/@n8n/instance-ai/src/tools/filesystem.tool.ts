/**
 * Consolidated filesystem tool — list, read, search, tree.
 */
import { createTool } from '@mastra/core/tools';
import { instanceAiConfirmationSeveritySchema } from '@n8n/api-types';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import type { InstanceAiContext } from '../types';
import { wrapUntrustedData } from './web-research/sanitize-web-content';

// ── Action schemas ──────────────────────────────────────────────────────────

const listAction = z.object({
	action: z.literal('list').describe('List files and directories in a path'),
	dirPath: z
		.string()
		.describe(
			'Absolute directory path or ~/relative path (e.g. "/home/user/project" or "~/project"). Do NOT use bare relative paths.',
		),
	pattern: z
		.string()
		.optional()
		.describe('Glob pattern to filter files (e.g. "**/*.ts", "src/**/*.json")'),
	type: z
		.enum(['file', 'directory', 'all'])
		.default('all')
		.optional()
		.describe(
			'Filter by entry type: "file" for files only, "directory" for folders only, "all" for both (default "all")',
		),
	recursive: z
		.boolean()
		.default(true)
		.optional()
		.describe(
			'Whether to recurse into subdirectories (default true). Set to false for a shallow listing of immediate children only.',
		),
	maxResults: z
		.number()
		.int()
		.positive()
		.max(1000)
		.default(200)
		.optional()
		.describe('Maximum number of results to return (default 200, max 1000)'),
});

const readAction = z.object({
	action: z.literal('read').describe('Read contents of a file'),
	filePath: z
		.string()
		.describe(
			'Absolute file path or ~/relative path (e.g. "/home/user/project/file.ts" or "~/project/file.ts"). Do NOT use bare relative paths.',
		),
	startLine: z
		.number()
		.int()
		.positive()
		.optional()
		.describe('Start reading from this line (1-indexed, default: 1)'),
	maxLines: z
		.number()
		.int()
		.positive()
		.max(500)
		.default(200)
		.optional()
		.describe('Maximum number of lines to read (default 200, max 500)'),
});

const searchAction = z.object({
	action: z.literal('search').describe('Search file contents for a pattern'),
	dirPath: z
		.string()
		.describe(
			'Absolute directory path or ~/relative path (e.g. "/home/user/project" or "~/project"). Do NOT use bare relative paths.',
		),
	query: z.string().describe('Search query — supports regex patterns'),
	filePattern: z
		.string()
		.optional()
		.describe('File pattern to restrict search (e.g. "*.ts", "*.json")'),
	ignoreCase: z
		.boolean()
		.default(true)
		.optional()
		.describe('Case-insensitive search (default: true)'),
	maxResults: z
		.number()
		.int()
		.positive()
		.max(100)
		.default(50)
		.optional()
		.describe('Maximum number of matching lines to return (default 50, max 100)'),
});

const treeAction = z.object({
	action: z.literal('tree').describe('Get a shallow directory tree'),
	dirPath: z
		.string()
		.describe(
			'Absolute directory path or ~/relative path (e.g. "/home/user/project" or "~/project/src"). Call with subdirectory paths to explore deeper.',
		),
	maxDepth: z
		.number()
		.int()
		.positive()
		.max(5)
		.default(2)
		.optional()
		.describe(
			'Maximum directory depth to show (default 2, max 5). Start low and increase only if needed.',
		),
});

const inputSchema = z.discriminatedUnion('action', [
	listAction,
	readAction,
	searchAction,
	treeAction,
]);

type Input = z.infer<typeof inputSchema>;

const suspendSchema = z.object({
	requestId: z.string(),
	message: z.string(),
	severity: instanceAiConfirmationSeveritySchema,
});

const resumeSchema = z.object({
	approved: z.boolean(),
});

// ── Handlers ────────────────────────────────────────────────────────────────

async function handleList(context: InstanceAiContext, input: Extract<Input, { action: 'list' }>) {
	const limit = input.maxResults ?? 200;
	const typeFilter = input.type ?? 'all';
	const isRecursive = input.recursive ?? true;
	// Fetch one extra to detect truncation without false positives
	const fetched = await context.filesystemService!.listFiles(input.dirPath, {
		pattern: input.pattern ?? undefined,
		maxResults: limit + 1,
		type: typeFilter,
		recursive: isRecursive,
	});
	const truncated = fetched.length > limit;
	const files = truncated ? fetched.slice(0, limit) : fetched;

	return {
		files,
		truncated,
		totalCount: files.length,
	};
}

async function handleRead(context: InstanceAiContext, input: Extract<Input, { action: 'read' }>) {
	const result = await context.filesystemService!.readFile(input.filePath, {
		startLine: input.startLine ?? undefined,
		maxLines: input.maxLines ?? undefined,
	});
	return {
		...result,
		content: wrapUntrustedData(result.content, 'file', input.filePath),
	};
}

async function handleSearch(
	context: InstanceAiContext,
	input: Extract<Input, { action: 'search' }>,
) {
	const result = await context.filesystemService!.searchFiles(input.dirPath, {
		query: input.query,
		filePattern: input.filePattern ?? undefined,
		ignoreCase: input.ignoreCase ?? undefined,
		maxResults: input.maxResults ?? undefined,
	});
	return {
		...result,
		matches: result.matches.map((match: { path: string; lineNumber: number; line: string }) => ({
			...match,
			line: wrapUntrustedData(match.line, 'file', `${match.path}:${match.lineNumber}`),
		})),
	};
}

async function handleTree(context: InstanceAiContext, input: Extract<Input, { action: 'tree' }>) {
	const tree = await context.filesystemService!.getFileTree(input.dirPath, {
		maxDepth: input.maxDepth ?? 2,
	});
	const truncated =
		tree.includes('call get-file-tree on a subdirectory') || tree.includes('... (truncated at');

	return { tree, truncated };
}

// ── Permission gate (shared by all actions) ─────────────────────────────────

function blockedResult(action: Input['action']) {
	const base = { denied: true, reason: 'Action blocked by admin' } as const;
	switch (action) {
		case 'list':
			return { files: [], truncated: false, totalCount: 0, ...base };
		case 'read':
			return { path: '', content: '', truncated: false, totalLines: 0, ...base };
		case 'search':
			return { query: '', matches: [], truncated: false, totalMatches: 0, ...base };
		case 'tree':
			return { tree: '', truncated: false, ...base };
	}
}

function deniedResult(action: Input['action']) {
	const base = { denied: true, reason: 'User denied the action' } as const;
	switch (action) {
		case 'list':
			return { files: [], truncated: false, totalCount: 0, ...base };
		case 'read':
			return { path: '', content: '', truncated: false, totalLines: 0, ...base };
		case 'search':
			return { query: '', matches: [], truncated: false, totalMatches: 0, ...base };
		case 'tree':
			return { tree: '', truncated: false, ...base };
	}
}

function emptyResult(action: Input['action']) {
	switch (action) {
		case 'list':
			return { files: [], truncated: false, totalCount: 0 };
		case 'read':
			return { path: '', content: '', truncated: false, totalLines: 0 };
		case 'search':
			return { query: '', matches: [], truncated: false, totalMatches: 0 };
		case 'tree':
			return { tree: '', truncated: false };
	}
}

function suspendMessage(input: Input): string {
	switch (input.action) {
		case 'list':
			return `List files in "${input.dirPath}"?`;
		case 'read':
			return `Read file "${input.filePath}"?`;
		case 'search':
			return `Search files in "${input.dirPath}" for "${input.query}"?`;
		case 'tree':
			return `Read filesystem tree at "${input.dirPath}"?`;
	}
}

// ── Tool factory ────────────────────────────────────────────────────────────

export function createFilesystemTool(context: InstanceAiContext) {
	return createTool({
		id: 'filesystem',
		description:
			'Explore and read files on the local filesystem. Actions:\n' +
			'• list — list files and directories matching optional filters\n' +
			'• read — read the contents of a file with optional line range\n' +
			'• search — search file contents for a text pattern or regex\n' +
			'• tree — get a shallow directory tree overview',
		inputSchema,
		suspendSchema,
		resumeSchema,
		execute: async (input: Input, ctx) => {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unnecessary-type-assertion -- ctx types resolve to error in CI
			const resumeData = ctx?.agent?.resumeData as z.infer<typeof resumeSchema> | undefined;
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unnecessary-type-assertion -- ctx types resolve to error in CI
			const suspend = ctx?.agent?.suspend as
				| ((payload: z.infer<typeof suspendSchema>) => Promise<void>)
				| undefined;

			if (context.permissions?.readFilesystem === 'blocked') {
				return blockedResult(input.action);
			}

			const needsApproval = context.permissions?.readFilesystem !== 'always_allow';

			if (needsApproval && (resumeData === undefined || resumeData === null)) {
				await suspend?.({
					requestId: nanoid(),
					message: suspendMessage(input),
					severity: 'info' as const,
				});
				return emptyResult(input.action);
			}

			if (resumeData !== undefined && resumeData !== null && !resumeData.approved) {
				return deniedResult(input.action);
			}

			if (!context.filesystemService) {
				throw new Error('No filesystem access available.');
			}

			switch (input.action) {
				case 'list':
					return await handleList(context, input);
				case 'read':
					return await handleRead(context, input);
				case 'search':
					return await handleSearch(context, input);
				case 'tree':
					return await handleTree(context, input);
			}
		},
	});
}
