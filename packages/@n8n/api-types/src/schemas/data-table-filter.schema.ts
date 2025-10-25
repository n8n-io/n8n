import { z } from 'zod';

import { dataTableColumnNameSchema, dataTableColumnValueSchema } from './data-table.schema';

export const FilterConditionSchema = z.union([
	z.literal('eq'),
	z.literal('neq'),
	z.literal('like'),
	z.literal('ilike'),
	z.literal('gt'),
	z.literal('gte'),
	z.literal('lt'),
	z.literal('lte'),
]);

export type DataTableFilterConditionType = z.infer<typeof FilterConditionSchema>;

export const dataTableFilterRecordSchema = z.object({
	columnName: dataTableColumnNameSchema,
	condition: FilterConditionSchema.default('eq'),
	value: dataTableColumnValueSchema,
	path: z.string().optional(),
});

export const dataTableFilterTypeSchema = z.union([z.literal('and'), z.literal('or')]);

export const dataTableFilterSchema = z.object({
	type: dataTableFilterTypeSchema.default('and'),
	filters: z.array(dataTableFilterRecordSchema).default([]),
});

export type DataTableFilter = z.infer<typeof dataTableFilterSchema>;
