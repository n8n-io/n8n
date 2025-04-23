import { z } from 'zod';
import { Z } from 'zod-class';

export const MAX_ITEMS_PER_PAGE = 50;

const skipValidator = z
	.string()
	.optional()
	.transform((val) => (val ? parseInt(val, 10) : 0))
	.refine((val) => !isNaN(val) && Number.isInteger(val), {
		message: 'Param `skip` must be a valid integer',
	})
	.refine((val) => val >= 0, {
		message: 'Param `skip` must be a non-negative integer',
	});

const takeValidator = z
	.string()
	.optional()
	.transform((val) => (val ? parseInt(val, 10) : 10))
	.refine((val) => !isNaN(val) && Number.isInteger(val), {
		message: 'Param `take` must be a valid integer',
	})
	.refine((val) => val >= 0, {
		message: 'Param `take` must be a non-negative integer',
	})
	.transform((val) => Math.min(val, MAX_ITEMS_PER_PAGE));

export const paginationSchema = {
	skip: skipValidator,
	take: takeValidator,
};

export class PaginationDto extends Z.class(paginationSchema) {}
