import { z } from 'zod';
import { Z } from 'zod-class';

import { paginationSchema } from '../pagination/pagination.dto';
import { projectRelationSchema } from 'schemas/project.schema';
import { jsonParse } from 'n8n-workflow';
import { skip } from 'node:test';

const USERS_LIST_SORT_OPTIONS = [
	'name:asc',
	'name:desc',
	'role:asc', // ascending order by role is Owner, Admin, Member
	'role:desc',
	'lastActive:asc',
	'lastActive:desc',
] as const;

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
});

const userExpandSchema = z.object({
	projectRelations: z.boolean().optional(),
});

export class UsersListFilterDto extends Z.class({
	...paginationSchema,
	select: userSelectSchema.optional(),
	filter: userFilterSchema.optional(),
	expand: userExpandSchema.optional(),
	// Default sort order is role:asc, secondary sort criteria is name:asc
	sortBy: usersListSortByValidator,
}) {}

export const parseUsersListFilterDto = (query: Record<string, string>): UsersListFilterDto => {
	return UsersListFilterDto.parse({
		skip: query.skip,
		take: query.take,
		select: query.select ? jsonParse(query.select) : undefined,
		filter: query.filter ? jsonParse(query.filter) : undefined,
		expand: query.expand ? jsonParse(query.expand) : undefined,
		sortBy: query.sortBy ? jsonParse(query.sortBy) : undefined,
	});
};
