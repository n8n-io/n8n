import type { JSONSchema7 } from 'json-schema';
import { z } from 'zod';

import type {
	AgentKnowledgeCommandRequest,
	AgentKnowledgeCommandResult,
} from '../../agent-knowledge-command.service';

export const DEFAULT_SEARCH_HEAD_LIMIT = 250;

export const KNOWLEDGE_OPERATIONS = [
	'list',
	'search',
	'read',
	'csv_query',
	'csv_profile',
	'csv_distinct',
	'csv_aggregate',
] as const;

const lineRangeSchema = z.object({
	start: z.number().int().min(1),
	end: z.number().int().min(1),
});

const searchOutputModeSchema = z.enum(['files_with_matches', 'content', 'count']);
const searchMatchModeSchema = z.enum(['any', 'all_on_same_line', 'all_within_lines']);
const csvAggregateFunctionSchema = z.enum(['count', 'min', 'max', 'sum', 'avg']);

export const csvFilterSchema = z.discriminatedUnion('op', [
	z.object({
		column: z.string().min(1),
		op: z.literal('eq'),
		value: z.string(),
	}),
	z.object({
		column: z.string().min(1),
		op: z.literal('in'),
		value: z.array(z.string()).min(1).max(50),
	}),
	z.object({
		column: z.string().min(1),
		op: z.literal('contains'),
		value: z.string(),
	}),
]);

const listInputSchema = z.object({ operation: z.literal('list') }).strict();
const searchInputSchema = z
	.object({
		operation: z.literal('search'),
		query: z.string().min(1).optional(),
		queries: z.array(z.string().min(1)).min(1).max(5).optional(),
		match_mode: searchMatchModeSchema.default('any'),
		output_mode: searchOutputModeSchema.default('files_with_matches'),
		caseInsensitive: z.boolean().optional(),
		fixedStrings: z.boolean().optional(),
		context: z.number().int().min(0).max(5).optional(),
		file: z.string().min(1).optional(),
		files: z.array(z.string()).max(10).optional(),
		offset: z.number().int().min(0).default(0),
		head_limit: z.number().int().min(0).default(DEFAULT_SEARCH_HEAD_LIMIT),
	})
	.strict();
const readInputSchema = z
	.object({
		operation: z.literal('read'),
		file: z.string().min(1),
		lineRange: lineRangeSchema.optional(),
	})
	.strict();
export const csvQueryInputSchema = z
	.object({
		operation: z.literal('csv_query'),
		file: z.string().min(1),
		select: z.array(z.string().min(1)).min(1).max(50).optional(),
		where: z.array(csvFilterSchema).max(10).optional(),
		rowNumber: z.number().int().min(2).optional(),
		limit: z.number().int().min(1).max(100).default(20),
	})
	.strict();
const csvProfileInputSchema = z
	.object({
		operation: z.literal('csv_profile'),
		file: z.string().min(1),
		sampleSize: z.number().int().min(1).max(20).default(5),
		distinctLimit: z.number().int().min(10).max(500).default(100),
	})
	.strict();
const csvDistinctInputSchema = z
	.object({
		operation: z.literal('csv_distinct'),
		file: z.string().min(1),
		column: z.string().min(1),
		where: z.array(csvFilterSchema).max(10).optional(),
		limit: z.number().int().min(1).max(200).default(50),
	})
	.strict();
const csvAggregateInputSchema = z
	.object({
		operation: z.literal('csv_aggregate'),
		file: z.string().min(1),
		metric: z.string().min(1).optional(),
		metrics: z.array(z.string().min(1)).min(1).max(10).optional(),
		functions: z.array(csvAggregateFunctionSchema).min(1).max(5).default(['count']),
		where: z.array(csvFilterSchema).max(10).optional(),
		groupBy: z.array(z.string().min(1)).min(1).max(5).optional(),
		orderBy: z
			.object({
				column: z.string().min(1),
				direction: z.enum(['asc', 'desc']).default('asc'),
			})
			.strict()
			.optional(),
		limit: z.number().int().min(1).max(200).default(50),
	})
	.strict();

export const searchKnowledgeParsingSchema = z.discriminatedUnion('operation', [
	listInputSchema,
	searchInputSchema,
	readInputSchema,
	csvQueryInputSchema,
	csvProfileInputSchema,
	csvDistinctInputSchema,
	csvAggregateInputSchema,
]);

export const searchKnowledgeInputSchema: JSONSchema7 = {
	type: 'object',
	description:
		'Use exactly one operation shape. Do not include fields from other operations. ' +
		'Use csv_profile for unfamiliar CSVs, csv_query for rows, csv_distinct for values, and csv_aggregate for computed CSV answers.',
	additionalProperties: false,
	required: ['operation'],
	properties: {
		operation: {
			type: 'string',
			description:
				'Operation to perform. Allowed values: list, search, read, csv_query, csv_profile, csv_distinct, csv_aggregate.',
		},
		query: {
			type: 'string',
			minLength: 1,
			description:
				'For operation=search only: search pattern. For conceptual multi-term lookup, prefer queries with match_mode instead of writing regex by hand.',
		},
		queries: {
			type: 'array',
			minItems: 1,
			maxItems: 5,
			items: { type: 'string', minLength: 1 },
			description:
				'For operation=search only: multiple literal search terms for conceptual lookup without hand-written regex.',
		},
		match_mode: {
			type: 'string',
			default: 'any',
			description:
				'For operation=search with queries only: any, all_on_same_line, or all_within_lines. Use all_within_lines to find concepts near each other without regex.',
		},
		output_mode: {
			type: 'string',
			description:
				'For operation=search only: content shows matching lines, files_with_matches shows only matching files (default), count shows match counts. Use content only after narrowing to a file or exact phrase.',
			default: 'files_with_matches',
		},
		caseInsensitive: {
			type: 'boolean',
			description: 'For operation=search only: run case-insensitive search.',
		},
		fixedStrings: {
			type: 'boolean',
			description:
				'For operation=search only: treat query as a fixed string instead of a regex. Defaults to true.',
		},
		context: {
			type: 'integer',
			minimum: 0,
			maximum: 5,
			description:
				'For operation=search only: number of surrounding context lines. Requires output_mode=content.',
		},
		files: {
			type: 'array',
			maxItems: 10,
			items: { type: 'string' },
			description:
				'For operation=search only: optional file ids, relative paths, or exact file names to search. These are tool handles only; do not cite them to users.',
		},
		offset: {
			type: 'integer',
			minimum: 0,
			default: 0,
			description: 'For operation=search only: number of files, counts, or matches to skip.',
		},
		head_limit: {
			type: 'integer',
			minimum: 0,
			default: DEFAULT_SEARCH_HEAD_LIMIT,
			description:
				'For operation=search only: limit output to first N files/counts/lines. Defaults to 250. Pass 0 for unlimited.',
		},
		file: {
			type: 'string',
			minLength: 1,
			description:
				'For operation=read or CSV operations: file id, relative path, or exact file name. For operation=search: alias for a single files entry. This is a tool handle only; cite the returned fileName and lineRange instead.',
		},
		lineRange: {
			type: 'object',
			additionalProperties: false,
			description: 'For operation=read only: optional line range to read.',
			properties: {
				start: { type: 'integer', minimum: 1 },
				end: { type: 'integer', minimum: 1 },
			},
		},
		where: {
			type: 'array',
			maxItems: 10,
			description:
				'For CSV operations only: row filters ANDed together. Each filter has column, op, and value. Allowed op values: eq, in, contains. For op=in, value must be an array of strings.',
			items: {
				type: 'object',
				additionalProperties: true,
				required: ['column', 'op', 'value'],
				properties: {
					column: { type: 'string', minLength: 1 },
					op: {
						type: 'string',
						description: 'Allowed values: eq, in, contains.',
					},
					value: {
						description:
							'String value for eq/contains, or array of strings for in. Local validation enforces the exact shape.',
					},
				},
			},
		},
		select: {
			type: 'array',
			minItems: 1,
			maxItems: 50,
			items: { type: 'string', minLength: 1 },
			description:
				'For operation=csv_query only: columns to return. Omit with rowNumber to return all columns for that row.',
		},
		rowNumber: {
			type: 'integer',
			minimum: 2,
			description:
				'For operation=csv_query only: exact CSV file line number to fetch. Header is line 1, so data rows usually start at line 2.',
		},
		column: {
			type: 'string',
			minLength: 1,
			description: 'For operation=csv_distinct only: column whose values should be returned.',
		},
		metric: {
			type: 'string',
			minLength: 1,
			description:
				'For operation=csv_aggregate only: numeric metric column for min, max, sum, or avg.',
		},
		metrics: {
			type: 'array',
			minItems: 1,
			maxItems: 10,
			items: { type: 'string', minLength: 1 },
			description:
				'For operation=csv_aggregate only: numeric metric columns for min, max, sum, or avg.',
		},
		functions: {
			type: 'array',
			minItems: 1,
			maxItems: 5,
			items: { type: 'string', enum: ['count', 'min', 'max', 'sum', 'avg'] },
			default: ['count'],
			description:
				'For operation=csv_aggregate only: aggregate functions to compute. count does not require a metric.',
		},
		groupBy: {
			type: 'array',
			minItems: 1,
			maxItems: 5,
			items: { type: 'string', minLength: 1 },
			description: 'For operation=csv_aggregate only: columns to group aggregate results by.',
		},
		orderBy: {
			type: 'object',
			additionalProperties: false,
			description:
				'For operation=csv_aggregate only: sort grouped output by a group column or aggregate output column.',
			properties: {
				column: { type: 'string', minLength: 1 },
				direction: { type: 'string', enum: ['asc', 'desc'], default: 'asc' },
			},
		},
		sampleSize: {
			type: 'integer',
			minimum: 1,
			maximum: 20,
			default: 5,
			description: 'For operation=csv_profile only: number of sample rows to return.',
		},
		distinctLimit: {
			type: 'integer',
			minimum: 10,
			maximum: 500,
			default: 100,
			description:
				'For operation=csv_profile only: maximum distinct values tracked per column before marking that column as truncated.',
		},
		limit: {
			type: 'integer',
			minimum: 1,
			maximum: 200,
			default: 20,
			description:
				'For CSV operations only: maximum rows, groups, or distinct values to return. Defaults to 20 for csv_query, 50 for csv_distinct, and 50 for csv_aggregate.',
		},
	},
};

const knowledgeFileOutputSchema = z.object({
	id: z.string(),
	fileName: z.string(),
	mimeType: z.string(),
	fileSizeBytes: z.number(),
	relativePath: z.string(),
});

const commandResultOutputSchema = z.object({
	command: z.enum(['git_grep', 'cat', 'sed']),
	exitCode: z.number().nullable(),
	stdout: z.string(),
	stderr: z.string(),
	truncated: z.boolean(),
	citation: z
		.object({
			fileName: z.string(),
			lineRange: lineRangeSchema.optional(),
			instruction: z.string(),
		})
		.optional(),
});

const searchMatchOutputSchema = z.object({
	fileId: z.string(),
	fileName: z.string(),
	relativePath: z.string(),
	lineNumber: z.number(),
	text: z.string(),
	readRange: lineRangeSchema,
	truncated: z.boolean().optional(),
});

const searchFileOutputSchema = z.object({
	id: z.string(),
	fileName: z.string(),
	relativePath: z.string(),
	matchCount: z.number(),
});

const searchResultOutputSchema = z.object({
	mode: searchOutputModeSchema,
	query: z.string(),
	queries: z.array(z.string()).optional(),
	matchMode: searchMatchModeSchema.optional(),
	totalMatchingFiles: z.number(),
	totalMatchingLines: z.number(),
	files: z.array(searchFileOutputSchema),
	matches: z.array(searchMatchOutputSchema),
	truncated: z.boolean(),
	appliedLimit: z.number().optional(),
	appliedOffset: z.number().optional(),
	nextOffset: z.number().optional(),
	hint: z.string().optional(),
});

const csvQueryResultOutputSchema = z.object({
	fileName: z.string(),
	relativePath: z.string(),
	columns: z.array(z.string()),
	rowNumbers: z.array(z.number()),
	rows: z.array(z.array(z.string())),
	records: z
		.array(
			z.object({
				rowNumber: z.number(),
				fileLineNumber: z.number(),
				values: z.record(z.string(), z.string()),
			}),
		)
		.optional(),
	rowCount: z.number(),
	truncated: z.boolean(),
	rowNumberBase: z.string().optional(),
	ambiguity: z
		.object({
			matchedRows: z.number(),
			message: z.string(),
			suggestedColumns: z.array(z.string()),
			sampleDistinctValues: z.record(z.string(), z.array(z.string())).optional(),
		})
		.optional(),
});
const csvColumnProfileOutputSchema = z.object({
	name: z.string(),
	inferredType: z.enum(['empty', 'integer', 'number', 'boolean', 'date', 'string']),
	emptyCount: z.number(),
	distinctCount: z.number().optional(),
	distinctCountTruncated: z.boolean().optional(),
	sampleValues: z.array(z.string()).optional(),
});
const csvProfileOutputSchema = z.object({
	fileName: z.string(),
	relativePath: z.string(),
	columns: z.array(z.string()),
	rowCount: z.number(),
	sampleRows: z.array(z.record(z.string(), z.string())),
	columnProfiles: z.array(csvColumnProfileOutputSchema),
	likelyKeyColumns: z.array(z.string()),
	likelyDisambiguatingColumns: z.array(z.string()),
});
const csvDistinctOutputSchema = z.object({
	fileName: z.string(),
	relativePath: z.string(),
	column: z.string(),
	values: z.array(z.string()),
	distinctCount: z.number(),
	truncated: z.boolean(),
});
const csvAggregateOutputSchema = z.object({
	fileName: z.string(),
	relativePath: z.string(),
	rowCount: z.number(),
	functions: z.array(csvAggregateFunctionSchema),
	metrics: z.array(z.string()),
	groupBy: z.array(z.string()).optional(),
	results: z.array(z.record(z.string(), z.union([z.string(), z.number(), z.null()]))),
	truncated: z.boolean(),
	skippedNonNumeric: z.record(z.string(), z.number()).optional(),
});

export const searchKnowledgeOutputSchema = z.object({
	operation: z.enum(KNOWLEDGE_OPERATIONS),
	files: z.array(knowledgeFileOutputSchema),
	result: commandResultOutputSchema.optional(),
	search: searchResultOutputSchema.optional(),
	csv: csvQueryResultOutputSchema.optional(),
	csvProfile: csvProfileOutputSchema.optional(),
	csvDistinct: csvDistinctOutputSchema.optional(),
	csvAggregate: csvAggregateOutputSchema.optional(),
	error: z.string().optional(),
});

export type ParsedSearchKnowledgeInput = z.infer<typeof searchKnowledgeParsingSchema>;
export type SearchKnowledgeOutput = z.infer<typeof searchKnowledgeOutputSchema>;
export type CsvQueryInput = z.infer<typeof csvQueryInputSchema>;
export type CsvProfileInput = z.infer<typeof csvProfileInputSchema>;
export type CsvDistinctInput = z.infer<typeof csvDistinctInputSchema>;
export type CsvAggregateInput = z.infer<typeof csvAggregateInputSchema>;
export type CsvFilter = z.infer<typeof csvFilterSchema>;
export type SearchOutputMode = z.infer<typeof searchOutputModeSchema>;
export type SearchMatchMode = z.infer<typeof searchMatchModeSchema>;
export type SearchMatchOutput = z.infer<typeof searchMatchOutputSchema>;
export type SearchResultOutput = z.infer<typeof searchResultOutputSchema>;
export type InternalKnowledgeCommandRequest = Extract<
	AgentKnowledgeCommandRequest,
	{ command: 'git_grep' | 'cat' | 'sed' }
>;
export type InternalKnowledgeCommandResult = Omit<AgentKnowledgeCommandResult, 'command'> & {
	command: InternalKnowledgeCommandRequest['command'];
};

export function parseSearchKnowledgeInput(input: unknown): ParsedSearchKnowledgeInput {
	const parsed = searchKnowledgeParsingSchema.parse(input);
	if (parsed.operation !== 'search' || parsed.file === undefined) return parsed;

	const { file, ...searchInput } = parsed;
	const files = Array.from(new Set([file, ...(parsed.files ?? [])]));
	if (files.length > 10) {
		throw new Error('Search can target at most 10 files.');
	}

	return {
		...searchInput,
		files,
	};
}

export function getSearchKnowledgeOperation(input: unknown): SearchKnowledgeOutput['operation'] {
	const parsed = z
		.object({
			operation: z.enum(KNOWLEDGE_OPERATIONS),
		})
		.safeParse(input);
	return parsed.success ? parsed.data.operation : 'list';
}
