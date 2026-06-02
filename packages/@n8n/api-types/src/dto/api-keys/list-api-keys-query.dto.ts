import { z } from 'zod';

import { Z } from '../../zod-class';
import { paginationSchema } from '../pagination/pagination.dto';

export const LIST_API_KEYS_SORT_OPTIONS = [
	'label:asc',
	'label:desc',
	'createdAt:asc',
	'createdAt:desc',
	'lastUsedAt:asc',
	'lastUsedAt:desc',
	'scopes:asc',
	'scopes:desc',
] as const;

export type ListApiKeysSortOption = (typeof LIST_API_KEYS_SORT_OPTIONS)[number];

const sortByValidator = z
	.union([z.enum(LIST_API_KEYS_SORT_OPTIONS), z.array(z.enum(LIST_API_KEYS_SORT_OPTIONS))])
	.transform((value) => (Array.isArray(value) ? value : [value]))
	.optional();

export class ListApiKeysQueryDto extends Z.class({
	...paginationSchema,
	ownership: z.enum(['mine', 'all']).optional(),
	/** Case-insensitive substring match against the key's label. */
	label: z.string().trim().min(1).max(100).optional(),
	sortBy: sortByValidator,
}) {}
