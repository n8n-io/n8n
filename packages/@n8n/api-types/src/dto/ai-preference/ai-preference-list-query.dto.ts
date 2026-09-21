import { z } from 'zod';

import { Z } from '../../zod-class';
import { createTakeValidator, paginationSchema } from '../pagination/pagination.dto';

export const AI_PREFERENCES_MAX_PAGE_SIZE = 100;
export const AI_PREFERENCES_DEFAULT_PAGE_SIZE = 50;

/** One page of ids at most, so the filter never asks for more rows than a page returns. */
export const AI_PREFERENCES_MAX_IDS_FILTER = AI_PREFERENCES_MAX_PAGE_SIZE;
const UUID_LENGTH = 36;

export class AiPreferenceListQueryDto extends Z.class({
	skip: paginationSchema.skip,
	// TypeORM reads the whole table for a `take` of 0.
	take: createTakeValidator(
		AI_PREFERENCES_MAX_PAGE_SIZE,
		false,
		AI_PREFERENCES_DEFAULT_PAGE_SIZE,
	).refine((value) => value > 0, { message: 'Param `take` must be at least 1' }),
	/**
	 * Comma-separated row ids. Narrows the page to those rows, under the same visibility
	 * rules as an unfiltered read. The plus menu resolves the text of the preferences a
	 * turn applied with it. Each id must be a UUID: the column is a uuid, and PostgreSQL
	 * rejects any other text with a query error rather than an empty page.
	 */
	ids: z
		.string()
		.max(AI_PREFERENCES_MAX_IDS_FILTER * (UUID_LENGTH + 1))
		.optional()
		.transform((value) =>
			value
				? value
						.split(',')
						.map((id) => id.trim())
						.filter(Boolean)
				: undefined,
		)
		.pipe(
			z
				.array(z.string().uuid({ message: 'Param `ids` must contain UUIDs' }))
				.min(1, { message: 'Param `ids` must name at least one id' })
				.max(AI_PREFERENCES_MAX_IDS_FILTER)
				.optional(),
		),
}) {}
