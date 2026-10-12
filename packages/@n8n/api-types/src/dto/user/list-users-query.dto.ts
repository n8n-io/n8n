import { z } from 'zod';

import { Z } from '../../zod-class';
import { booleanFromString } from '../../schemas/boolean-from-string';
import { publicApiPaginationSchema } from '../pagination/pagination.dto';

export class ListUsersQueryDto extends Z.class({
	limit: publicApiPaginationSchema.limit,
	cursor: z.string().optional(),
	includeRole: booleanFromString.optional().default('false'),
	projectId: z.string().optional(),
}) {}
