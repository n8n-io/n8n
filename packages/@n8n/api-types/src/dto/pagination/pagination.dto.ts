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

export const createTakeValidator = (maxItems: number, allowInfinity: boolean = false) =>
	z
		.string()
		.optional()
		.transform((val) => (val ? parseInt(val, 10) : 10))
		.refine((val) => !isNaN(val) && Number.isInteger(val), {
			message: 'Param `take` must be a valid integer',
		})
		.refine(
			(val) => {
				if (!allowInfinity) return val >= 0;
				return true;
			},
			{
				message: 'Param `take` must be a non-negative integer',
			},
		)
		.transform((val) => Math.min(val, maxItems));

export const paginationSchema = {
	skip: skipValidator,
	take: createTakeValidator(MAX_ITEMS_PER_PAGE),
};

export class PaginationDto extends Z.class(paginationSchema) {}
