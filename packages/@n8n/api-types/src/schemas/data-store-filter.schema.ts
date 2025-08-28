import { z } from 'zod';

import { dataStoreColumnNameSchema } from './data-store.schema';

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

export type DataStoreFilterConditionType = z.infer<typeof FilterConditionSchema>;

export const dataStoreFilterRecordSchema = z.object({
	columnName: dataStoreColumnNameSchema,
	condition: FilterConditionSchema.default('eq'),
	value: z.union([z.string(), z.number(), z.boolean(), z.date(), z.null()]),
});

export const dataStoreFilterTypeSchema = z.union([z.literal('and'), z.literal('or')]);

export const dataStoreFilterSchema = z.object({
	type: dataStoreFilterTypeSchema.default('and'),
	filters: z.array(dataStoreFilterRecordSchema).default([]),
});

export type DataStoreFilter = z.infer<typeof dataStoreFilterSchema>;
