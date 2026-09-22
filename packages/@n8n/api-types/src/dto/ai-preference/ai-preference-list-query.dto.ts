import { Z } from '../../zod-class';
import { createTakeValidator, paginationSchema } from '../pagination/pagination.dto';

export const AI_PREFERENCES_MAX_PAGE_SIZE = 100;
export const AI_PREFERENCES_DEFAULT_PAGE_SIZE = 50;

export class AiPreferenceListQueryDto extends Z.class({
	skip: paginationSchema.skip,
	// TypeORM reads the whole table for a `take` of 0.
	take: createTakeValidator(
		AI_PREFERENCES_MAX_PAGE_SIZE,
		false,
		AI_PREFERENCES_DEFAULT_PAGE_SIZE,
	).refine((value) => value > 0, { message: 'Param `take` must be at least 1' }),
}) {}
