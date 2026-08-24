import { z } from 'zod';

import { Z } from '../../zod-class';
import { publicApiPaginationSchema } from '../pagination/pagination.dto';

export class SourceControlStatusQueryPublicDto extends Z.class({
	direction: z.enum(['push', 'pull']),
	limit: publicApiPaginationSchema.limit,
	cursor: z.string().optional(),
}) {}
