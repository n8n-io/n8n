import { z } from 'zod';
import { Z } from 'zod-class';

import { paginationSchema } from '../pagination/pagination.dto';

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

export class UsersListFilterDto extends Z.class({
	...paginationSchema,
	sortBy: usersListSortByValidator,
}) {}
