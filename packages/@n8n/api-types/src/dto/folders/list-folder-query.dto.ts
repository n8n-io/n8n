import { jsonParse } from 'n8n-workflow';
import { z } from 'zod';

import { Z } from '../../zod-class';

export const VALID_SELECT_FIELDS = [
	'id',
	'name',
	'createdAt',
	'updatedAt',
	'project',
	'tags',
	'parentFolder',
	'workflowCount',
	'subFolderCount',
	'path',
] as const;

export const VALID_SORT_OPTIONS = [
	'name:asc',
	'name:desc',
	'createdAt:asc',
	'createdAt:desc',
	'updatedAt:asc',
	'updatedAt:desc',
] as const;

// Filter schema - only allow specific properties
export const filterSchema = z
	.object({
		parentFolderId: z.string().optional(),
		name: z.string().optional(),
		tags: z.array(z.string()).optional(),
		excludeFolderIdAndDescendants: z.string().optional(),
	})
	.strict();

// ---------------------
// Parameter Validators
// ---------------------

// Filter parameter validation
export const filterValidator = z
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
				});
				return z.NEVER;
			}
		} catch (e) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'Invalid filter format',
			});
			return z.NEVER;
		}
	});

// Skip parameter validation
export const skipValidator = z
	.string()
	.optional()
	.transform((val) => (val ? parseInt(val, 10) : 0))
	.refine((val) => !isNaN(val), {
		message: 'Skip must be a valid number',
	});

// Take parameter validation
export const takeValidator = z
	.string()
	.optional()
	.transform((val) => (val ? parseInt(val, 10) : 10))
	.refine((val) => !isNaN(val), {
		message: 'Take must be a valid number',
	});

// Select parameter validation
const selectFieldsValidator = z.array(z.enum(VALID_SELECT_FIELDS));
export const selectValidator = z
	.string()
	.optional()
	.transform((val, ctx) => {
		if (!val) return undefined;
		try {
			const parsed: unknown = JSON.parse(val);
			try {
				const selectFields = selectFieldsValidator.parse(parsed);
				if (selectFields.length === 0) return undefined;
				type SelectField = (typeof VALID_SELECT_FIELDS)[number];
				return selectFields.reduce<Record<SelectField, true>>(
					(acc, field) => ({ ...acc, [field]: true }),
					{} as Record<SelectField, true>,
				);
			} catch (e) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: `Invalid select fields. Valid fields are: ${VALID_SELECT_FIELDS.join(', ')}`,
				});
				return z.NEVER;
			}
		} catch (e) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'Invalid select format',
			});
			return z.NEVER;
		}
	});

// SortBy parameter validation
const sortByValidator = z
	.enum(VALID_SORT_OPTIONS, { message: `sortBy must be one of: ${VALID_SORT_OPTIONS.join(', ')}` })
	.optional();

export class ListFolderQueryDto extends Z.class({
	filter: filterValidator,
	skip: skipValidator,
	take: takeValidator,
	select: selectValidator,
	sortBy: sortByValidator,
}) {}
