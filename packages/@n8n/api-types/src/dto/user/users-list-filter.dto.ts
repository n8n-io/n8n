import { jsonParse } from 'n8n-workflow';
import { z } from 'zod';
import { Z } from 'zod-class';

import { createTakeValidator, paginationSchema } from '../pagination/pagination.dto';

const USERS_LIST_SORT_OPTIONS = [
	'firstName:asc',
	'firstName:desc',
	'lastName:asc',
	'lastName:desc',
	'role:asc', // ascending order by role is Owner, Admin, Member
	'role:desc',
	// 'lastActive:asc',
	// 'lastActive:desc',
] as const;

const usersListSortByValidator = z
	.array(
		z.enum(USERS_LIST_SORT_OPTIONS, {
			message: `sortBy must be one of: ${USERS_LIST_SORT_OPTIONS.join(', ')}`,
		}),
	)
	.optional();

const userSelectSchema = z.array(
	z.enum(['id', 'firstName', 'lastName', 'email', 'disabled', 'mfaEnabled', 'role']),
);

const userFilterSchema = z.object({
	isOwner: z.boolean().optional(),
	firstName: z.string().optional(),
	lastName: z.string().optional(),
	email: z.string().optional(),
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
				return userFilterSchema.parse(parsed);
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

const userExpandSchema = z.array(z.enum(['projectRelations']));

export class UsersListFilterDto extends Z.class({
	...paginationSchema,
	take: createTakeValidator(50, true), // Limit to 50 items per page, and allow infinity for pagination
	select: userSelectSchema.optional(),
	filter: filterValidatorSchema.optional(),
	expand: userExpandSchema.optional(),
	// Default sort order is role:asc, secondary sort criteria is name:asc
	sortBy: usersListSortByValidator,
}) {}
