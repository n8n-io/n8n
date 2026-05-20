import { jsonParse } from 'n8n-workflow';
import { z } from 'zod';

import { Z } from '../../zod-class';
import { paginationSchema } from '../pagination/pagination.dto';

const VALID_SORT_OPTIONS = [
	'name:asc',
	'name:desc',
	'createdAt:asc',
	'createdAt:desc',
	'updatedAt:asc',
	'updatedAt:desc',
] as const;

export type ListDashboardsQuerySortOptions = (typeof VALID_SORT_OPTIONS)[number];

const filterSchema = z
	.object({
		id: z.union([z.string(), z.array(z.string())]).optional(),
		name: z.union([z.string(), z.array(z.string())]).optional(),
		projectId: z.union([z.string(), z.array(z.string())]).optional(),
		tag: z.union([z.string(), z.array(z.string())]).optional(),
		archived: z.boolean().optional(),
	})
	.strict();

const filterValidator = z
	.string()
	.optional()
	.transform((val, ctx): z.infer<typeof filterSchema> | undefined => {
		if (!val) return undefined;
		try {
			const result = filterSchema.safeParse(jsonParse(val));
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

const sortByValidator = z
	.enum(VALID_SORT_OPTIONS, {
		message: `sortBy must be one of: ${VALID_SORT_OPTIONS.join(', ')}`,
	})
	.optional();

export class ListDashboardsQueryDto extends Z.class({
	...paginationSchema,
	filter: filterValidator,
	sortBy: sortByValidator,
}) {}

export type DashboardListFilter = z.infer<typeof filterSchema>;
export type DashboardListOptions = Partial<ListDashboardsQueryDto> & {
	filter: DashboardListFilter;
};
