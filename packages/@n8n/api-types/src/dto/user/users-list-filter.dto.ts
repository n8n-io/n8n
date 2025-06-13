import { jsonParse } from 'n8n-workflow';
import { z } from 'zod';

import { paginationSchema } from '../pagination/pagination.dto';

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

const createTakeValidator = (maxItems: number) =>
	z
		.string()
		.optional()
		.transform((val) => (val ? parseInt(val, 10) : 10))
		.refine((val) => !isNaN(val) && Number.isInteger(val), {
			message: 'Param `take` must be a valid integer',
		})
		.transform((val) => Math.min(val, maxItems));

const usersListSortByValidator = z
	.enum(USERS_LIST_SORT_OPTIONS, {
		message: `sortBy must be one of: ${USERS_LIST_SORT_OPTIONS.join(', ')}`,
	})
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

const userExpandSchema = z.object({
	projectRelations: z.boolean().optional(),
});

export const UsersListFilterDtoSchema = z.object({
	...paginationSchema,
	take: createTakeValidator(50), // Limit to 50 items per page
	select: userSelectSchema.optional(),
	filter: userFilterSchema.optional(),
	expand: userExpandSchema.optional(),
	// Default sort order is role:asc, secondary sort criteria is name:asc
	sortBy: usersListSortByValidator,
});

export type UsersListFilterDto = z.infer<typeof UsersListFilterDtoSchema>;

export const parseUsersListFilterDto = (query: Record<string, string>): UsersListFilterDto => {
	return UsersListFilterDtoSchema.parse({
		skip: query.skip,
		take: query.take,
		select: query.select ? jsonParse(query.select) : undefined,
		filter: query.filter ? jsonParse(query.filter) : undefined,
		expand: query.expand ? jsonParse(query.expand) : undefined,
		sortBy: query.sortBy,
	});
};
