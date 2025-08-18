import { jsonParse } from 'n8n-workflow';
import { z } from 'zod';
import { Z } from 'zod-class';

import { dataStoreColumnNameSchema } from '../../schemas/data-store.schema';
import { paginationSchema } from '../pagination/pagination.dto';

const FilterConditionSchema = z.union([z.literal('eq'), z.literal('neq')]);
export type ListDataStoreContentFilterConditionType = z.infer<typeof FilterConditionSchema>;

const filterRecord = z.object({
	columnName: dataStoreColumnNameSchema,
	condition: FilterConditionSchema.default('eq'),
	value: z.union([z.string(), z.number(), z.boolean(), z.date()]),
});

const chainedFilterSchema = z.union([z.literal('and'), z.literal('or')]);

export type ListDataStoreContentFilter = z.infer<typeof filterSchema>;

// ---------------------
// Parameter Validators
// ---------------------

const filterSchema = z.object({
	type: chainedFilterSchema.default('and'),
	filters: z.array(filterRecord).default([]),
});

// Filter parameter validation
const filterValidator = z
	.string()
	.optional()
	.transform((val, ctx) => {
		if (!val) return undefined;
		try {
			const parsed: unknown = jsonParse(val);
			try {
				return filterSchema.parse(parsed);
			} catch (e) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Invalid filter fields',
					path: ['filter'],
				});
				return z.NEVER;
			}
		} catch (e) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'Invalid filter format',
				path: ['filter'],
			});
			return z.NEVER;
		}
	});

// SortBy parameter validation
const sortByValidator = z
	.string()
	.optional()
	.transform((val, ctx) => {
		if (val === undefined) return val;

		if (!val.includes(':')) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'Invalid sort format, expected <columnName>:<asc/desc>',
				path: ['sort'],
			});
			return z.NEVER;
		}

		let [column, direction] = val.split(':');

		try {
			column = dataStoreColumnNameSchema.parse(column);
		} catch {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'Invalid sort columnName',
				path: ['sort'],
			});
			return z.NEVER;
		}

		direction = direction?.toUpperCase();
		if (direction !== 'ASC' && direction !== 'DESC') {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'Invalid sort direction',
				path: ['sort'],
			});

			return z.NEVER;
		}
		return [column, direction] as const;
	});

export class ListDataStoreContentQueryDto extends Z.class({
	take: paginationSchema.take.optional(),
	skip: paginationSchema.skip.optional(),
	filter: filterValidator.optional(),
	sortBy: sortByValidator.optional(),
}) {}
