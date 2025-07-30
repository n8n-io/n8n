import { jsonParse } from 'n8n-workflow';
import { z } from 'zod';
import { Z } from 'zod-class';

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

// Skip parameter validation
const skipValidator = z
	.string()
	.optional()
	.transform((val) => (val ? parseInt(val, 10) : 0))
	.refine((val) => !isNaN(val), {
		message: 'Skip must be a valid number',
	});

// Take parameter validation
const takeValidator = z
	.string()
	.optional()
	.transform((val) => (val ? parseInt(val, 10) : 10))
	.refine((val) => !isNaN(val), {
		message: 'Take must be a valid number',
	});

// SortBy parameter validation
const sortByValidator = z
	.enum(VALID_SORT_OPTIONS, { message: `sortBy must be one of: ${VALID_SORT_OPTIONS.join(', ')}` })
	.optional();

export class ListDataStoreQueryDto extends Z.class({
	filter: filterValidator,
	skip: skipValidator,
	take: takeValidator,
	sortBy: sortByValidator,
}) {}
