import { z } from 'zod';

import { Z } from '../../zod-class';

const pageValidator = z
	.string()
	.optional()
	.transform((val) => (val ? parseInt(val, 10) : 1))
	.refine((val) => !isNaN(val) && Number.isInteger(val) && val >= 1, {
		message: 'Param `page` must be a positive integer',
	});

const limitValidator = z
	.string()
	.optional()
	.transform((val) => (val ? parseInt(val, 10) : 20))
	.refine((val) => !isNaN(val) && Number.isInteger(val) && val >= 1 && val <= 100, {
		message: 'Param `limit` must be an integer between 1 and 100',
	});

export class InstanceAiExamplesQueryDto extends Z.class({
	category: z.string().optional(),
	subcategory: z.string().optional(),
	page: pageValidator,
	limit: limitValidator,
}) {}
