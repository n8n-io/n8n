import { jsonParse } from 'n8n-workflow';
import { z } from 'zod';
import { Z } from 'zod-class';

import { createTakeValidator, paginationSchema } from '../pagination/pagination.dto';

export const PROJECT_MEMBERS_SORT_OPTIONS = [
	'firstName:asc',
	'firstName:desc',
	'lastName:asc',
	'lastName:desc',
	'email:asc',
	'email:desc',
	'role:asc',
	'role:desc',
] as const;

export type ProjectMembersSortOptions = (typeof PROJECT_MEMBERS_SORT_OPTIONS)[number];

const projectMembersSortByValidator = z
	.array(
		z.enum(PROJECT_MEMBERS_SORT_OPTIONS, {
			message: `sortBy must be one of: ${PROJECT_MEMBERS_SORT_OPTIONS.join(', ')}`,
		}),
	)
	.optional();

const projectMemberSelectSchema = z.array(z.enum(['id', 'firstName', 'lastName', 'email', 'role']));

const projectMemberFilterSchema = z.object({
	firstName: z.string().optional(),
	lastName: z.string().optional(),
	email: z.string().optional(),
	role: z.string().optional(),
	fullText: z.string().optional(), // Full text search across firstName, lastName, and email
});

const filterValidatorSchema = z
	.string()
	.optional()
	.transform((val, ctx) => {
		if (!val) return undefined;
		try {
			const parsed: unknown = jsonParse(val);
			try {
				return projectMemberFilterSchema.parse(parsed);
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

export class ListProjectMembersQueryDto extends Z.class({
	...paginationSchema,
	take: createTakeValidator(50), // Limit to 50 items per page
	select: projectMemberSelectSchema.optional(),
	filter: filterValidatorSchema.optional(),
	sortBy: projectMembersSortByValidator,
}) {}
