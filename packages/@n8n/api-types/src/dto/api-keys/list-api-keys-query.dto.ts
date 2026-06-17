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

export class ListApiKeysQueryDto extends Z.class({
	...paginationSchema,
	ownership: z.enum(['mine', 'all']).optional(),
	/** Case-insensitive substring match against the key's label. */
	label: z.string().trim().min(1).max(100).optional(),
	/**
	 * Comma-separated owner ids to narrow the `all` view to keys owned by these
	 * users. Ignored for callers without `apiKey:manage`. Empty/absent means no
	 * owner narrowing (all owners).
	 */
	ownerIds: z
		.string()
		.max(2000)
		.optional()
		.transform((val) =>
			val
				? val
						.split(',')
						.map((id) => id.trim())
						.filter(Boolean)
				: undefined,
		)
		// Bound the parsed list so a caller can't push an arbitrarily large
		// `IN (...)` clause into the owner query.
		.pipe(z.array(z.string().max(100)).max(100).optional()),
	sortBy: z.enum(LIST_API_KEYS_SORT_OPTIONS).optional(),
}) {}
