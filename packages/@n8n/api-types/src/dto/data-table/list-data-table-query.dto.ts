import { jsonParse } from 'n8n-workflow';
import { z } from 'zod';

import { Z } from '../../zod-class';
import { paginationSchema, publicApiPaginationSchema } from '../pagination/pagination.dto';

const VALID_SORT_OPTIONS = [
	'name:asc',
	'name:desc',
	'createdAt:asc',
	'createdAt:desc',
	'updatedAt:asc',
	'updatedAt:desc',
	'size:asc',
	'size:desc',
] as const;

export type ListDataTableQuerySortOptions = (typeof VALID_SORT_OPTIONS)[number];

const filterSchema = z
	.object({
		id: z.union([z.string(), z.array(z.string())]).optional(),
		name: z.union([z.string(), z.array(z.string())]).optional(),
		projectId: z.union([z.string(), z.array(z.string())]).optional(),
		// todo: can probably include others here as well?
	})
	.strict();

// Public API restricts projectId to a single string
const publicApiFilterSchema = filterSchema.extend({ projectId: z.string().optional() }).strict();

const makeFilterValidator = <T extends z.ZodObject<z.ZodRawShape>>(schema: T) =>
	z
		.string()
		.optional()
		.transform((val, ctx): z.infer<T> | undefined => {
			if (!val) return undefined;
			try {
				const result = schema.safeParse(jsonParse(val));
				if (!result.success) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						message: 'Invalid filter fields',
						path: ['filter'],
					});
					return z.NEVER;
				}
				return result.data;
			} catch {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Invalid filter format',
					path: ['filter'],
				});
				return z.NEVER;
			}
		});

const filterValidator = makeFilterValidator(filterSchema);
const publicApiFilterValidator = makeFilterValidator(publicApiFilterSchema);

const sortByValidator = z
	.enum(VALID_SORT_OPTIONS, { message: `sortBy must be one of: ${VALID_SORT_OPTIONS.join(', ')}` })
	.optional();

export class ListDataTableQueryDto extends Z.class({
	...paginationSchema,
	filter: filterValidator,
	sortBy: sortByValidator,
}) {}

export class PublicApiListDataTableQueryDto extends Z.class({
	...publicApiPaginationSchema,
	filter: publicApiFilterValidator,
	sortBy: sortByValidator,
}) {}
