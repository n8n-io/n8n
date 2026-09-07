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
export const dataTableColumnTypeSchema = z.enum(['string', 'number', 'boolean', 'date', 'enum']);
export const dataTableEnumOptionsSchema = z
	.array(z.string().trim().min(1).max(128))
	.min(1)
	.max(100)
	.superRefine((options, context) => {
		const normalized = new Set<string>();
		for (const [index, option] of options.entries()) {
			if (option.includes(',')) {
				context.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Enum options cannot contain commas',
					path: [index],
				});
			}

			const key = option.toLocaleLowerCase();
			if (normalized.has(key)) {
				context.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Enum options must be unique, ignoring case',
					path: [index],
				});
			}
			normalized.add(key);
		}
	});

export const dataTableMetadataSchema = z.object({});
export type DataTableMetadata = z.infer<typeof dataTableMetadataSchema>;

export const dataTableCreateColumnBaseSchema = z.object({
	name: dataTableColumnNameSchema,
	type: dataTableColumnTypeSchema,
	index: z.number().optional(),
	options: dataTableEnumOptionsSchema.optional(),
	defaultValue: z.string().trim().min(1).max(128).optional(),
});

export const dataTableCreateColumnSchema = dataTableCreateColumnBaseSchema.superRefine(
	(column, context) => {
		if (column.type === 'enum' && column.options === undefined) {
			context.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'Enum columns require options',
				path: ['options'],
			});
		}
		if (
			column.type === 'enum' &&
			column.defaultValue !== undefined &&
			!column.options?.includes(column.defaultValue)
		) {
			context.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'The enum default value must be one of its options',
				path: ['defaultValue'],
			});
		}
		if (
			column.type !== 'enum' &&
			(column.options !== undefined || column.defaultValue !== undefined)
		) {
			context.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'Only enum columns can define options or a default value',
				path: [column.options !== undefined ? 'options' : 'defaultValue'],
			});
		}
	},
);
export type DataTableCreateColumnSchema = z.infer<typeof dataTableCreateColumnSchema>;

export const dataTableColumnSchema = z.object({
	name: dataTableColumnNameSchema,
	type: dataTableColumnTypeSchema,
	index: z.number(),
	options: dataTableEnumOptionsSchema.nullable(),
	defaultValue: z.string().nullable(),
	dataTableId: dataTableIdSchema,
});

export const dataTableSchema = z.object({
	id: dataTableIdSchema,
	name: dataTableNameSchema,
	columns: z.array(dataTableColumnSchema),
	metadata: dataTableMetadataSchema,
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
