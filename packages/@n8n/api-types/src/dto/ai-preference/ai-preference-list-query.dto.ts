import { Z } from '../../zod-class';
import { createTakeValidator, paginationSchema } from '../pagination/pagination.dto';

export const AI_PREFERENCES_MAX_PAGE_SIZE = 100;
export const AI_PREFERENCES_DEFAULT_PAGE_SIZE = 50;

export class AiPreferenceListQueryDto extends Z.class({
	skip: paginationSchema.skip,
	// A page of no rows is not a page: TypeORM drops a `take` of 0 and reads the whole
	// collection, so the request is refused rather than quietly widened.
	take: createTakeValidator(
		AI_PREFERENCES_MAX_PAGE_SIZE,
		false,
		AI_PREFERENCES_DEFAULT_PAGE_SIZE,
	).refine((value) => value > 0, { message: 'Param `take` must be at least 1' }),
}) {}
