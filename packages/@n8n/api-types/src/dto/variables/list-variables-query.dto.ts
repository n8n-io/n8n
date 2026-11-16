import '../../openapi-extend';
import { z } from 'zod';

import { Z } from '../../zod-class';
import { publicApiPaginationSchema } from '../pagination/pagination.dto';

export const GLOBAL_PROJECT_ID_FILTER = 'null';

export class ListVariablesQueryDto extends Z.class({
	limit: publicApiPaginationSchema.limit,
	cursor: z.string().optional(),
	projectId: z.string().optional().openapi({ example: 'VmwOO9HeTEj20kxM' }),
	state: z.literal('empty').optional(),
}) {}
