import { z } from 'zod';

import { paginationSchema } from '../pagination/pagination.dto';
import { Z } from '../../zod-class';

export class ListAppsQueryDto extends Z.class({
	...paginationSchema,
	name: z.string().trim().max(128).optional(),
	sortBy: z
		.enum([
			'updatedAt:asc',
			'updatedAt:desc',
			'createdAt:asc',
			'createdAt:desc',
			'name:asc',
			'name:desc',
		])
		.default('updatedAt:desc'),
}) {}
