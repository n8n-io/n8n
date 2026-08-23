import { z } from 'zod';

import { Z } from '../../zod-class';
import { publicApiPaginationSchema } from '../pagination/pagination.dto';

export class ListWorkflowHistoryQueryDto extends Z.class({
	...publicApiPaginationSchema,
	cursor: z.string().optional(),
}) {}
