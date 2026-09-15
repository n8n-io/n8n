import { z } from 'zod';

import { paginationSchema } from '../pagination/pagination.dto';
import { Z } from '../../zod-class';

export const APPS_LIST_SORT_OPTIONS = [
	'updatedAt:desc',
	'createdAt:desc',
	'name:asc',
	'name:desc',
] as const;

export type AppsListSortBy = (typeof APPS_LIST_SORT_OPTIONS)[number];

export class ListAppsQueryDto extends Z.class({
	...paginationSchema,
	name: z.string().max(128).optional(),
	sortBy: z.enum(APPS_LIST_SORT_OPTIONS).optional(),
}) {}
