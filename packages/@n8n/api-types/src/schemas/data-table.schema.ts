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
export const dataTableEnumOptionIdSchema = z
	.string()
	.trim()
	.min(1)
	.max(36)
	.regex(/^[a-zA-Z0-9_-]+$/);
export const dataTableEnumColorSchema = z.string().regex(/^#(?:[0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/);
export const dataTableEnumOptionSchema = z.object({
	id: dataTableEnumOptionIdSchema,
	text: z.string().trim().min(1).max(128),
	color: dataTableEnumColorSchema,
});
export type DataTableEnumOption = z.infer<typeof dataTableEnumOptionSchema>;

export const DEFAULT_DATA_TABLE_ENUM_COLORS = [
	'#6366F1',
	'#14B8A6',
	'#F59E0B',
	'#EC4899',
	'#8B5CF6',
	'#10B981',
] as const;

export const getDefaultDataTableEnumColor = (index: number): string =>
	DEFAULT_DATA_TABLE_ENUM_COLORS[index % DEFAULT_DATA_TABLE_ENUM_COLORS.length];

export const dataTableEnumOptionInputSchema = z.union([
	z.string().trim().min(1).max(128),
	dataTableEnumOptionSchema.partial({ id: true, color: true }),
]);
export type DataTableEnumOptionInput = z.infer<typeof dataTableEnumOptionInputSchema>;
export const dataTableEnumOptionsInputSchema = z
	.array(dataTableEnumOptionInputSchema)
	.min(1)
	.max(100)
	.superRefine((options, context) => {
		const normalizedTexts = new Set<string>();
		const ids = new Set<string>();
		for (const [index, option] of options.entries()) {
			const text = typeof option === 'string' ? option : option.text;
			if (typeof option !== 'string' && option.id) {
				if (ids.has(option.id)) {
					context.addIssue({
						code: z.ZodIssueCode.custom,
						message: 'Enum option IDs must be unique',
						path: [index, 'id'],
					});
				}
				ids.add(option.id);
			}

			const key = text.toLocaleLowerCase();
			if (normalizedTexts.has(key)) {
				context.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Enum option text must be unique, ignoring case',
					path: typeof option === 'string' ? [index] : [index, 'text'],
				});
			}
			normalizedTexts.add(key);
		}
	});
export const dataTableEnumOptionsSchema = z
	.array(dataTableEnumOptionSchema)
	.min(1)
	.max(100)
	.superRefine((options, context) => {
		const ids = new Set<string>();
		const texts = new Set<string>();
		for (const [index, option] of options.entries()) {
			if (ids.has(option.id)) {
				context.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Enum option IDs must be unique',
					path: [index, 'id'],
				});
			}
			const text = option.text.toLocaleLowerCase();
			if (texts.has(text)) {
				context.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Enum option text must be unique, ignoring case',
					path: [index, 'text'],
				});
			}
			ids.add(option.id);
			texts.add(text);
		}
	});

export const dataTableMetadataSchema = z
	.object({
		view: z.enum(['table', 'kanban']).optional(),
		kanban: z
			.object({
				groupByColumnId: z.string().min(1).max(36),
			})
			.optional(),
	});
export type DataTableMetadata = z.infer<typeof dataTableMetadataSchema>;

export const dataTableCreateColumnBaseSchema = z.object({
	name: dataTableColumnNameSchema,
	type: dataTableColumnTypeSchema,
	index: z.number().optional(),
	options: dataTableEnumOptionsInputSchema.optional(),
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
			!column.options?.some((option) =>
				typeof option === 'string'
					? option === column.defaultValue
					: option.id === column.defaultValue || option.text === column.defaultValue,
			)
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
