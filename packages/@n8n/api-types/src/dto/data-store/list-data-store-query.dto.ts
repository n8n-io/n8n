import { jsonParse } from 'n8n-workflow';
import { z } from 'zod';
import { Z } from 'zod-class';

import { paginationSchema } from '../pagination/pagination.dto';

const VALID_SORT_OPTIONS = [
	'name:asc',
	'name:desc',
	'createdAt:asc',
	'createdAt:desc',
	'updatedAt:asc',
	'updatedAt:desc',
	'sizeBytes:asc',
	'sizeBytes:desc',
] as const;

export type ListDataStoreQuerySortOptions = (typeof VALID_SORT_OPTIONS)[number];

const FILTER_OPTIONS = {
	id: z.union([z.string(), z.array(z.string())]).optional(),
	name: z.union([z.string(), z.array(z.string())]).optional(),
	projectId: z.union([z.string(), z.array(z.string())]).optional(),
	// todo: can probably include others here as well?
};

// Filter schema - only allow specific properties
const filterSchema = z.object(FILTER_OPTIONS).strict();
// ---------------------
// Parameter Validators
// ---------------------

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
	.enum(VALID_SORT_OPTIONS, { message: `sortBy must be one of: ${VALID_SORT_OPTIONS.join(', ')}` })
	.optional();

export class ListDataStoreQueryDto extends Z.class({
	...paginationSchema,
	filter: filterValidator,
	sortBy: sortByValidator,
}) {}
