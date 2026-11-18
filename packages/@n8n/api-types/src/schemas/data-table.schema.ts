import { z } from 'zod';

import type { ListDataTableQueryDto } from '../dto';

export const insertRowReturnType = z.union([z.literal('all'), z.literal('count'), z.literal('id')]);

export const dataTableNameSchema = z.string().trim().min(1).max(128);
export const dataTableIdSchema = z
	.string()
	.max(36)
	.regex(/^[a-zA-Z0-9]+$/);

// Postgres does not allow leading numbers or -
export const DATA_TABLE_COLUMN_REGEX = /^[a-zA-Z][a-zA-Z0-9_]*$/;
export const DATA_TABLE_COLUMN_MAX_LENGTH = 63; // Postgres has a maximum of 63 characters
export const DATA_TABLE_COLUMN_ERROR_MESSAGE =
	'Only alphabetical characters and non-leading numbers and underscores are allowed for column names, and the maximum length is 63 characters.';

export const dataTableColumnNameSchema = z
	.string()
	.trim()
	.min(1)
	.max(DATA_TABLE_COLUMN_MAX_LENGTH) // Postgres has a maximum of 63 characters
	.regex(DATA_TABLE_COLUMN_REGEX, DATA_TABLE_COLUMN_ERROR_MESSAGE);
export const dataTableColumnTypeSchema = z.enum(['string', 'number', 'boolean', 'date']);

export const dataTableCreateColumnSchema = z.object({
	name: dataTableColumnNameSchema,
	type: dataTableColumnTypeSchema,
	index: z.number().optional(),
});
export type DataTableCreateColumnSchema = z.infer<typeof dataTableCreateColumnSchema>;

export const dataTableColumnSchema = dataTableCreateColumnSchema.extend({
	dataTableId: dataTableIdSchema,
});

export const dataTableRowRuleConditionSchema = z.object({
	column: dataTableColumnNameSchema,
	/** `project`: the column holds a project id, and the row belongs to that project's members. */
	match: z.enum(['id', 'email', 'project']),
});
export type DataTableRowRuleCondition = z.infer<typeof dataTableRowRuleConditionSchema>;

export const dataTableRowRuleSchema = z.object({
	/** A row belongs to the actor when any condition matches. */
	conditions: z
		.array(dataTableRowRuleConditionSchema)
		.min(1)
		.max(3)
		.refine(
			(conditions) => new Set(conditions.map(({ column }) => column)).size === conditions.length,
			'Each condition needs its own column',
		),
	/** Members of the table's own project get every row. */
	projectMembersSeeAll: z.boolean(),
	runsWithoutUser: z.enum(['deny', 'allRows']),
});
export type DataTableRowRule = z.infer<typeof dataTableRowRuleSchema>;

/** A published workflow that uses a table and has a trigger without a verified n8n user. */
export type DataTableRowRuleImpact = {
	workflowsWithoutUser: Array<{ id: string; name: string }>;
};

export const dataTableSchema = z.object({
	id: dataTableIdSchema,
	name: dataTableNameSchema,
	columns: z.array(dataTableColumnSchema),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
});
export type DataTable = z.infer<typeof dataTableSchema>;
export type DataTableColumn = z.infer<typeof dataTableColumnSchema>;

export type DataTableListFilter = {
	id?: string | string[];
	projectId?: string | string[];
	name?: string | string[];
};

export type DataTableListOptions = Partial<ListDataTableQueryDto> & {
	filter: DataTableListFilter;
};

export type DataTableListSortBy = ListDataTableQueryDto['sortBy'];

export const dateTimeSchema = z
	.string()
	.datetime({ offset: true })
	.transform((s) => new Date(s))
	.pipe(z.date());

export const dataTableColumnValueSchema = z.union([
	z.string(),
	z.number(),
	z.boolean(),
	z.null(),
	z.date(),
]);
